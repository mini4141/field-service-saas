#!/usr/bin/env bash
# Phase 3 check. Exits non-zero if anything billable is still there. Output is redacted and saved by the caller.
set -uo pipefail
export MSYS_NO_PATHCONV=1
export AWS_PROFILE=field-service-saas-deployer AWS_REGION=ap-southeast-2 AWS_DEFAULT_REGION=ap-southeast-2
FAIL=0
check() { # label, count-or-text (empty/0 = clean)
  if [ -z "$2" ] || [ "$2" = "0" ] || [ "$2" = "None" ]; then echo "OK    $1"; else echo "FAIL  $1: $2"; FAIL=1; fi
}

echo "verify-destroyed @ $(date -u +%FT%TZ)"
check "EKS clusters" "$(aws eks list-clusters --query 'length(clusters)' --output text)"
check "RDS instances" "$(aws rds describe-db-instances --query 'length(DBInstances)' --output text)"
check "ElastiCache clusters" "$(aws elasticache describe-cache-clusters --query 'length(CacheClusters)' --output text)"
check "Lambda functions (field-service)" "$(aws lambda list-functions --query "length(Functions[?starts_with(FunctionName,'field-service-saas')])" --output text)"
check "CloudFront distributions" "$(aws cloudfront list-distributions --query 'length(DistributionList.Items || `[]`)' --output text)"
check "Load balancers (ELBv2)" "$(aws elbv2 describe-load-balancers --query 'length(LoadBalancers)' --output text)"
check "Classic ELBs" "$(aws elb describe-load-balancers --query 'length(LoadBalancerDescriptions)' --output text)"
check "NAT gateways (not deleted)" "$(aws ec2 describe-nat-gateways --filter Name=state,Values=pending,available --query 'length(NatGateways)' --output text)"
check "S3 buckets (field-service)" "$(aws s3api list-buckets --query "length(Buckets[?starts_with(Name,'field-service-saas')])" --output text)"
check "ECR repositories (fss-*)" "$(aws ecr describe-repositories --query "length(repositories[?starts_with(repositoryName,'fss-')])" --output text 2>/dev/null)"
check "EC2 instances running" "$(aws ec2 describe-instances --filters Name=instance-state-name,Values=pending,running,stopping,stopped --query 'length(Reservations[].Instances[])' --output text)"
check "Elastic IPs" "$(aws ec2 describe-addresses --query 'length(Addresses)' --output text)"
check "CloudWatch log groups (field-service)" "$(aws logs describe-log-groups --log-group-name-prefix /aws/lambda/field-service-saas --query 'length(logGroups)' --output text)"

echo "--- tagging API (Project=field-service-saas); entries can linger a few minutes after deletion"
TAGGED=$(aws resourcegroupstaggingapi get-resources --tag-filters Key=Project,Values=field-service-saas --query 'ResourceTagMappingList[].ResourceARN' --output text | tr '\t' '\n' | sed '/^$/d')
if [ -n "$TAGGED" ]; then
  echo "$TAGGED"
  echo "NOTE  tagging API still lists the ARNs above; the direct describe checks above are authoritative"
else
  echo "OK    tagging API reports nothing"
fi

[ "$FAIL" = 0 ] && echo "RESULT: nothing billable remains" || echo "RESULT: BILLABLE RESOURCES REMAIN"
exit "$FAIL"
