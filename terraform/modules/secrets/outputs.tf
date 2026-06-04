output "secret_arns" {
  description = "Map of secret key to ARN"
  value       = { for k, v in aws_secretsmanager_secret.secrets : k => v.arn }
}
