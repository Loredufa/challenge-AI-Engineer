output "endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "connection_string_secret_arn" {
  description = "ARN of the Secrets Manager secret holding the connection string"
  value       = aws_secretsmanager_secret.db_connection.arn
}
