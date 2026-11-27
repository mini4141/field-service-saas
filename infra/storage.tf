# ---------------------------------------------------------------- S3: job photos / thumbnails / invoice PDFs
resource "aws_s3_bucket" "assets" {
  bucket        = "${var.name}-assets-${data.aws_caller_identity.current.account_id}"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket                  = aws_s3_bucket.assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Browsers upload with presigned PUT URLs, so cross-origin PUT must be allowed.
resource "aws_s3_bucket_cors_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id
  cors_rule {
    allowed_methods = ["GET", "PUT", "HEAD"]
    allowed_origins = ["*"]
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
  }
}

resource "aws_s3_bucket_notification" "photos" {
  bucket = aws_s3_bucket.assets.id
  lambda_function {
    lambda_function_arn = aws_lambda_function.thumbnailer.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "photos/"
  }
  depends_on = [aws_lambda_permission.s3]
}

# ---------------------------------------------------------------- Lambda thumbnailer
data "archive_file" "thumbnailer" {
  type        = "zip"
  source_dir  = "${path.module}/../apps/thumbnailer/build"
  output_path = "${path.module}/.build/thumbnailer.zip"
}

resource "aws_cloudwatch_log_group" "thumbnailer" {
  name              = "/aws/lambda/${var.name}-thumbnailer"
  retention_in_days = 1
}

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "${var.name}-thumbnailer"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

resource "aws_iam_role_policy" "lambda" {
  role = aws_iam_role.lambda.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow", Action = ["s3:GetObject", "s3:PutObject"], Resource = "${aws_s3_bucket.assets.arn}/*" },
      { Effect = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents"], Resource = "${aws_cloudwatch_log_group.thumbnailer.arn}:*" },
    ]
  })
}

resource "aws_lambda_function" "thumbnailer" {
  function_name    = "${var.name}-thumbnailer"
  role             = aws_iam_role.lambda.arn
  runtime          = "nodejs24.x"
  handler          = "index.handler"
  memory_size      = 512
  timeout          = 30
  filename         = data.archive_file.thumbnailer.output_path
  source_code_hash = data.archive_file.thumbnailer.output_base64sha256
  environment {
    variables = {
      API_WEBHOOK_URL      = var.api_base_url
      INTERNAL_HMAC_SECRET = random_password.hmac.result
    }
  }
  depends_on = [aws_cloudwatch_log_group.thumbnailer, aws_iam_role_policy.lambda]
}

resource "aws_lambda_permission" "s3" {
  statement_id   = "AllowS3Invoke"
  action         = "lambda:InvokeFunction"
  function_name  = aws_lambda_function.thumbnailer.function_name
  principal      = "s3.amazonaws.com"
  source_arn     = aws_s3_bucket.assets.arn
  source_account = data.aws_caller_identity.current.account_id
}

# ---------------------------------------------------------------- S3 + CloudFront: Expo web build, and /api -> Traefik NLB
resource "aws_s3_bucket" "mobile" {
  bucket        = "${var.name}-mobile-${data.aws_caller_identity.current.account_id}"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "mobile" {
  bucket                  = aws_s3_bucket.mobile.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "mobile" {
  name                              = "${var.name}-mobile"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

locals {
  api_host = replace(replace(var.api_base_url, "http://", ""), "https://", "")
}

resource "aws_cloudfront_distribution" "mobile" {
  count               = var.api_base_url == "" ? 0 : 1
  enabled             = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  comment             = "${var.name} expo web + api proxy"

  origin {
    origin_id                = "mobile-s3"
    domain_name              = aws_s3_bucket.mobile.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.mobile.id
  }
  origin {
    origin_id   = "api-nlb"
    domain_name = local.api_host
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "mobile-s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6" # CachingOptimized
  }
  ordered_cache_behavior {
    path_pattern             = "/api/*"
    target_origin_id         = "api-nlb"
    viewer_protocol_policy   = "https-only"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = "4135ea2d-6df8-4ea8-a2b4-9a6bc8e3b5c3" # CachingDisabled
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # AllViewerExceptHostHeader
  }
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }
  restrictions {
    geo_restriction { restriction_type = "none" }
  }
  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

resource "aws_s3_bucket_policy" "mobile" {
  count  = var.api_base_url == "" ? 0 : 1
  bucket = aws_s3_bucket.mobile.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.mobile.arn}/*"
      Condition = { StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.mobile[0].arn } }
    }]
  })
}
