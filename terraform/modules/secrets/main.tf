locals {
  secrets = {
    "openai-api-key"  = "documind/${var.environment}/openai/api-key"
    "jwt-private-key" = "documind/${var.environment}/jwt/private-key"
    "jwt-public-key"  = "documind/${var.environment}/jwt/public-key"
    "ses-credentials" = "documind/${var.environment}/ses/credentials"
  }
}

resource "aws_secretsmanager_secret" "secrets" {
  for_each    = local.secrets
  name        = each.value
  description = "DocuMind ${var.environment} - ${each.key}"
}
