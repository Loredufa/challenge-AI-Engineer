variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for the ALB"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for ECS tasks"
  type        = list(string)
}

variable "backend_sg_id" {
  description = "Backend security group ID"
  type        = string
}

variable "frontend_sg_id" {
  description = "Frontend security group ID"
  type        = string
}

variable "alb_sg_id" {
  description = "ALB security group ID"
  type        = string
}

variable "database_url_secret" {
  description = "ARN of the Secrets Manager secret for the database connection string"
  type        = string
}

variable "redis_url" {
  description = "Redis connection URL"
  type        = string
}

variable "s3_bucket" {
  description = "S3 bucket name for documents"
  type        = string
}

variable "secrets_arns" {
  description = "Map of secret key to Secrets Manager ARN"
  type        = map(string)
}

variable "ecr_backend_image" {
  description = "ECR image URI for backend"
  type        = string
}

variable "ecr_frontend_image" {
  description = "ECR image URI for frontend"
  type        = string
}
