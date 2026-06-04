output "redis_endpoint" {
  description = "ElastiCache Redis primary endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
  sensitive   = true
}

output "endpoint" {
  description = "ElastiCache Redis primary endpoint (alias)"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
  sensitive   = true
}
