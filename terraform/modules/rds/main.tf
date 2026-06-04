resource "random_password" "db" {
  length  = 32
  special = false
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.environment}-rds-subnet-group"
  subnet_ids = var.subnet_ids
}

resource "aws_db_parameter_group" "pgvector" {
  family = "postgres16"
  name   = "${var.environment}-pgvector-params"

  parameter {
    name  = "shared_preload_libraries"
    value = "vector"
  }
}

resource "aws_db_instance" "main" {
  identifier              = "${var.environment}-documind-postgres"
  engine                  = "postgres"
  engine_version          = "16.1"
  instance_class          = var.instance_class
  allocated_storage       = 20
  max_allocated_storage   = 100
  db_name                 = var.db_name
  username                = var.db_username
  password                = random_password.db.result
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = var.security_group_ids
  parameter_group_name    = aws_db_parameter_group.pgvector.name
  multi_az                = var.environment == "production"
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"
  deletion_protection     = var.environment == "production"
  storage_encrypted       = true
  skip_final_snapshot     = var.environment != "production"
}

resource "aws_secretsmanager_secret" "db_connection" {
  name = "documind/${var.environment}/rds/connection-string"
}

resource "aws_secretsmanager_secret_version" "db_connection" {
  secret_id     = aws_secretsmanager_secret.db_connection.id
  secret_string = "postgresql://${var.db_username}:${random_password.db.result}@${aws_db_instance.main.endpoint}/${var.db_name}"
}
