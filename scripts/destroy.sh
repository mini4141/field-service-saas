#!/usr/bin/env bash
# Phase 3: tear everything down. Idempotent and safe to re-run: every step tolerates "already gone".
set -uo pipefail
source "$(dirname "$0")/lib.sh"
cd "$ROOT"

export AWS_PROFILE=field-service-saas-deployer AWS_REGION=ap-southeast-2 AWS_DEFAULT_REGION=ap-southeast-2
export KUBECONFIG="$LOCAL/kubeconfig-eks"
TF="terraform -chdir=infra"

CLUSTER=$($TF output -raw cluster_name 2>/dev/null || true)

echo "== 1. helm uninstall + delete the Traefik LoadBalancer Service (waits for the NLB to go)"
if [ -n "$CLUSTER" ] && aws eks describe-cluster --name "$CLUSTER" >/dev/null 2>&1; then
  aws eks update-kubeconfig --name "$CLUSTER" --kubeconfig "$KUBECONFIG" >/dev/null 2>&1
  helm uninstall fss --wait --timeout 5m 2>&1 || true
  kubectl -n traefik delete svc traefik --wait=true --timeout=300s 2>&1 || true
  helm uninstall traefik -n traefik --wait --timeout 5m 2>&1 || true
  for _ in $(seq 1 30); do
    n=$(aws elbv2 describe-load-balancers --query 'length(LoadBalancers)' --output text 2>/dev/null || echo 0)
    [ "$n" = "0" ] && break
    echo "waiting for load balancers to disappear ($n left)"; sleep 10
  done
fi

echo "== 2. empty the S3 buckets + delete ECR images"
for b in $($TF output -raw assets_bucket 2>/dev/null) $($TF output -raw mobile_bucket 2>/dev/null); do
  [ -n "$b" ] && aws s3 rm "s3://$b" --recursive >/dev/null 2>&1 || true
done
for r in api worker web; do
  ids=$(aws ecr list-images --repository-name "fss-$r" --query 'imageIds[*]' --output json 2>/dev/null || echo '[]')
  [ "$ids" != "[]" ] && aws ecr batch-delete-image --repository-name "fss-$r" --image-ids "$ids" >/dev/null 2>&1 || true
done

echo "== 3. terraform destroy"
$TF destroy -input=false -auto-approve -var "api_base_url=${API_BASE_URL_FOR_DESTROY:-http://placeholder.invalid}" 2>&1 | tail -15
# retry once: CloudFront and ENIs can lag behind the first pass
$TF destroy -input=false -auto-approve -var "api_base_url=${API_BASE_URL_FOR_DESTROY:-http://placeholder.invalid}" 2>&1 | tail -3
echo "destroy finished; run scripts/verify-destroyed.sh"
