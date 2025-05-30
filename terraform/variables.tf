variable "aws_region" {
  description = "AWS region to deploy to"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (e.g., dev, prod)"
  type        = string
  default     = "dev"
}

variable "db_host" {
  description = "Database host"
  type        = string
}

variable "db_port" {
  description = "Database port"
  type        = string
  default     = "5432"
}

variable "db_name" {
  description = "Database name"
  type        = string
}

variable "db_user" {
  description = "Database user"
  type        = string
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT secret key"
  type        = string
  sensitive   = true
}

variable "cors_origin" {
  description = "CORS allowed origin (must be a valid URL, '*', or URL pattern). Examples: https://example.com, *, https://*.example.com"
  type        = string
  default     = "*"

  validation {
    condition     = can(regex("^(\\*|https?://[\\w\\-\\.]+(:\\d+)?(/.*)?|https?://\\*\\.([\\w\\-\\.]+)(:\\d+)?(/.*)?)?$", var.cors_origin))
    error_message = "The cors_origin must be a valid URL starting with http:// or https://, a single '*', or a valid pattern like https://*.example.com"
  }
} 