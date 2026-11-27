#!/usr/bin/env bash
# Phase 2: deploy to AWS from this PC. Needs Docker, terraform, helm, kubectl, aws CLI v2.
# Order: terraform apply -> push images -> kubeconfig + Traefik NLB -> terraform apply (Lambda/CloudFront need the NLB host)
#        -> helm (migrate job + seed) -> Expo web to S3 -> Playwright against the cloud URLs.
set -euo pipefail
source "$(dirname "$0")/lib.sh"
cd "$ROOT"

export MSYS_NO_PATHCONV=1
export AWS_PROFILE=field-service-saas-deployer AWS_REGION=ap-southeast-2 AWS_DEFAULT_REGION=ap-southeast-2
export KUBECONFIG="$LOCAL/kubeconfig-eks"
TF="terraform -chdir=infra"
OUT="$ROOT/proof/phase2-cloud"
mkdir -p "$OUT/logs" "$OUT/tests"

echo "== identity"
aws sts get-caller-identity >/dev/null

echo "== 1. lambda bundle + terraform apply"
bash apps/thumbnailer/scripts/package-lambda.sh
$TF init -input=false
$TF apply -input=false -auto-approve

REGISTRY=$($TF output -raw ecr_registry)
echo "== 2. images -> ECR"
aws ecr get-login-password | docker login --username AWS --password-stdin "$REGISTRY" >/dev/null
for t in api worker web; do
  docker image inspect "fss-$t:dev" >/dev/null 2>&1 || docker build --target "$t" --build-arg APP="$t" -t "fss-$t:dev" .
  docker tag "fss-$t:dev" "$REGISTRY/fss-$t:cloud"
  docker push "$REGISTRY/fss-$t:cloud" | tail -1
done

echo "== 3. kubeconfig + Traefik (one NLB)"
aws eks update-kubeconfig --name "$($TF output -raw cluster_name)" --kubeconfig "$(cygpath -m "$KUBECONFIG")" >/dev/null
kubectl wait --for=condition=Ready nodes --all --timeout=600s
helm repo add traefik https://traefik.github.io/charts >/dev/null 2>&1 || true
helm repo update traefik >/dev/null
helm upgrade --install traefik traefik/traefik --version 43.0.0 -n traefik --create-namespace \
  -f deploy/helm/traefik-values.yaml --wait --timeout 10m
NLB=""
for _ in $(seq 1 60); do
  NLB=$(kubectl -n traefik get svc traefik -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || true)
  [ -n "$NLB" ] && break
  sleep 10
done
[ -n "$NLB" ] || { echo "NLB hostname never appeared" >&2; exit 1; }
echo "NLB: $NLB"

echo "== 4. terraform apply again: Lambda webhook URL + CloudFront (/api -> NLB)"
$TF apply -input=false -auto-approve -var "api_base_url=http://$NLB"
CF=$($TF output -raw cloudfront_domain)

echo "== 5. helm: api, worker, web (+ migrate job + seed)"
helm upgrade --install fss deploy/helm/field-service \
  --set images.registry="$REGISTRY" --set images.tag=cloud --set images.pullPolicy=Always \
  --set inCluster.enabled=false \
  --set-string config.databaseUrl="$($TF output -raw database_url)" \
  --set-string config.redisUrl="redis://$($TF output -raw redis_endpoint):6379" \
  --set-string config.s3Bucket="$($TF output -raw assets_bucket)" \
  --set-string config.s3Endpoint="" --set-string config.s3PublicEndpoint="" \
  --set-string config.jwtSecret="$($TF output -raw jwt_secret)" \
  --set-string config.internalHmacSecret="$($TF output -raw hmac_secret)" \
  --wait --timeout 10m
kubectl wait --for=condition=complete job --all --timeout=600s
kubectl rollout status deploy/api deploy/worker deploy/web --timeout=300s

echo "== 6. Expo web export -> S3 (served by CloudFront)"
(cd apps/mobile && EXPO_PUBLIC_API_URL="" CI=1 pnpm exec expo export --platform web --clear >"$LOCAL/logs/expo-export-cloud.log" 2>&1)
aws s3 sync apps/mobile/dist "s3://$($TF output -raw mobile_bucket)/" --delete >/dev/null

cat >"$LOCAL/cloud.env" <<EOF
WEB_URL=http://$NLB
API_URL=https://$CF
MOBILE_URL=https://$CF
EOF
echo "waiting for the endpoints"
for u in "http://$NLB/healthz" "http://$NLB/login" "https://$CF/"; do
  for _ in $(seq 1 60); do curl -fsS "$u" >/dev/null 2>&1 && break || sleep 10; done
done

echo "== 7. playwright (web + mobile web) against the cloud + proof"
bash scripts/capture-proof.sh phase2
bash scripts/collect-cloud-logs.sh
echo "deploy complete. Run scripts/destroy.sh as soon as proof is captured."
