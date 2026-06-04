output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = module.ecs.alb_dns_name
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = module.rds.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = module.elasticache.endpoint
  sensitive   = true
}

output "s3_bucket" {
  description = "S3 documents bucket name"
  value       = module.s3.bucket_name
}

output "ecr_backend_url" {
  description = "ECR repository URL for backend"
  value       = module.ecs.ecr_backend_url
}
