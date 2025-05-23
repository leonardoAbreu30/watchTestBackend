terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    # You'll need to configure this with your own S3 bucket for state storage
    key = "785d743e-366f-48c5-af12-adffb9c94546"
  }
}

provider "aws" {
  region = var.aws_region
}

# Lambda function
resource "aws_lambda_function" "todo_app" {
  filename         = "../dist/lambda.zip"
  function_name    = "todo-app-${var.environment}"
  role            = aws_iam_role.lambda_role.arn
  handler         = "lambda.handler"
  runtime         = "nodejs18.x"
  timeout         = 30
  memory_size     = 256

  environment {
    variables = {
      NODE_ENV     = var.environment
      DB_HOST      = var.db_host
      DB_PORT      = var.db_port
      DB_NAME      = var.db_name
      DB_USER      = var.db_user
      DB_PASSWORD  = var.db_password
      JWT_SECRET   = var.jwt_secret
      CORS_ORIGIN  = var.cors_origin
    }
  }
}

# IAM role for Lambda
resource "aws_iam_role" "lambda_role" {
  name = "todo_app_lambda_role_${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# CloudWatch Logs policy
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# API Gateway
resource "aws_apigatewayv2_api" "todo_api" {
  name          = "todo-api-${var.environment}"
  protocol_type = "HTTP"
  cors_configuration {
    allow_origins = [coalesce(var.cors_origin, "*")]
    allow_methods = ["GET", "POST", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization", "X-Amz-Date", "X-Api-Key", "X-Amz-Security-Token"]
    max_age      = 300
  }
}

resource "aws_apigatewayv2_stage" "todo_api" {
  api_id = aws_apigatewayv2_api.todo_api.id
  name   = var.environment
  auto_deploy = true
}

resource "aws_apigatewayv2_integration" "todo_api" {
  api_id           = aws_apigatewayv2_api.todo_api.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.todo_app.invoke_arn
}

resource "aws_apigatewayv2_route" "todo_api" {
  api_id    = aws_apigatewayv2_api.todo_api.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.todo_api.id}"
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.todo_app.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.todo_api.execution_arn}/*/*"
}

# Add these outputs at the end of the file
output "api_endpoint" {
  description = "API Gateway endpoint URL"
  value       = "${aws_apigatewayv2_api.todo_api.api_endpoint}/${aws_apigatewayv2_stage.todo_api.name}"
}

output "health_check_url" {
  description = "Health check endpoint URL"
  value       = "${aws_apigatewayv2_api.todo_api.api_endpoint}/${aws_apigatewayv2_stage.todo_api.name}/health"
} 