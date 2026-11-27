output "cluster_name" { value = aws_eks_cluster.main.name }
output "ecr_registry" { value = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.region}.amazonaws.com" }
output "assets_bucket" { value = aws_s3_bucket.assets.bucket }
output "mobile_bucket" { value = aws_s3_bucket.mobile.bucket }
output "lambda_name" { value = aws_lambda_function.thumbnailer.function_name }
output "rds_endpoint" { value = aws_db_instance.main.address }
output "redis_endpoint" { value = aws_elasticache_cluster.main.cache_nodes[0].address }
output "cloudfront_domain" { value = try(aws_cloudfront_distribution.mobile[0].domain_name, "") }
output "cloudfront_id" { value = try(aws_cloudfront_distribution.mobile[0].id, "") }
output "database_url" {
  value     = "postgresql://fss:${random_password.db.result}@${aws_db_instance.main.address}:5432/fss?schema=public&sslmode=require"
  sensitive = true
}
output "jwt_secret" {
  value     = random_password.jwt.result
  sensitive = true
}
output "hmac_secret" {
  value     = random_password.hmac.result
  sensitive = true
}
