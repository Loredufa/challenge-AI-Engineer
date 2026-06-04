variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "staging"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "documind"
}

variable "db_username" {
  description = "PostgreSQL username"
  type        = string
  default     = "documind_app"
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "s3_documents_bucket" {
  description = "S3 bucket for PDF documents"
  type        = string
}

variable "ecr_backend_image" {
  description = "ECR image URI for backend"
  type        = string
}

variable "ecr_frontend_image" {
  description = "ECR image URI for frontend"
  type        = string
}
