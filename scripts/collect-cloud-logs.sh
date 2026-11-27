#!/usr/bin/env bash
# Saves AWS-side evidence (redacted): resources, kubectl output, Lambda logs, a CloudWatch metric graph.
set -euo pipefail
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
export MSYS_NO_PATHCONV=1
export AWS_PROFILE=field-service-saas-deployer AWS_REGION=ap-southeast-2 AWS_DEFAULT_REGION=ap-southeast-2
export KUBECONFIG="$LOCAL/kubeconfig-eks"
TF="terraform -chdir=infra"
OUT="$ROOT/proof/phase2-cloud"
mkdir -p "$OUT/logs" "$OUT/screenshots"
redact() { sed -E 's/[0-9]{12}/<ACCOUNT_ID>/g'; }

CLUSTER=$($TF output -raw cluster_name)
FN=$($TF output -raw lambda_name)

{
  echo "# EKS cluster"; aws eks describe-cluster --name "$CLUSTER" --query 'cluster.{name:name,version:version,status:status}' --output table
  echo; echo "# nodes (SPOT)"; kubectl get nodes -L eks.amazonaws.com/capacityType,node.kubernetes.io/instance-type
  echo; kubectl get all,ingress
  echo; kubectl -n traefik get svc traefik
  echo; echo "# api logs"; kubectl logs deploy/api --tail=15
  echo; echo "# worker logs"; kubectl logs deploy/worker --tail=25
} 2>&1 | redact >"$OUT/logs/kubectl-eks.txt"

# Lambda logs (CloudWatch can lag a little)
sleep 15
aws logs tail "/aws/lambda/$FN" --since 2h --format short 2>&1 | redact >"$OUT/logs/lambda-thumbnailer.log"

# CloudWatch metric graph rendered by the CLI (no console login needed)
cat >"$LOCAL/widget.json" <<EOF
{"width":900,"height":300,"start":"-PT2H","end":"PT0H","title":"Lambda thumbnailer invocations",
 "metrics":[["AWS/Lambda","Invocations","FunctionName","$FN",{"stat":"Sum","period":60}],["AWS/Lambda","Errors","FunctionName","$FN",{"stat":"Sum","period":60}]],
 "view":"timeSeries","region":"ap-southeast-2"}
EOF
aws cloudwatch get-metric-widget-image --metric-widget "$(cat "$LOCAL/widget.json")" --output text --query MetricWidgetImage | tr -d "
" | base64 -d >"$OUT/screenshots/05-cloudwatch-lambda.png" || true

{
  echo "# Terraform-managed AWS resources"; $TF state list
  echo; echo "# outputs (non-sensitive)"; $TF output | grep -v sensitive || true
  echo; echo "# tagged resources"; aws resourcegroupstaggingapi get-resources --tag-filters Key=Project,Values=field-service-saas --query 'ResourceTagMappingList[].ResourceARN' --output text | tr '\t' '\n'
} 2>&1 | redact >"$OUT/resources.txt"
echo "cloud logs collected in $OUT"
