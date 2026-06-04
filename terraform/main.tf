terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  # Backend S3 para estado remoto
  backend "s3" {
    bucket         = "documind-terraform-state"
    key            = "documind/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "documind-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "documind"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

module "networking" {
  source      = "./modules/networking"
  environment = var.environment
  vpc_cidr    = var.vpc_cidr
  azs         = var.availability_zones
}

module "rds" {
  source             = "./modules/rds"
  environment        = var.environment
  vpc_id             = module.networking.vpc_id
  subnet_ids         = module.networking.private_subnet_ids
  security_group_ids = [module.networking.rds_sg_id]
  db_name            = var.db_name
  db_username        = var.db_username
  instance_class     = var.rds_instance_class
}

module "elasticache" {
  source         = "./modules/elasticache"
  environment    = var.environment
  vpc_id         = module.networking.vpc_id
  subnet_ids     = module.networking.private_subnet_ids
  security_group = module.networking.redis_sg_id
}

module "s3" {
  source      = "./modules/s3"
  environment = var.environment
  bucket_name = var.s3_documents_bucket
}

module "secrets" {
  source      = "./modules/secrets"
  environment = var.environment
}

module "ecs" {
  source                = "./modules/ecs"
  environment           = var.environment
  vpc_id                = module.networking.vpc_id
  public_subnet_ids     = module.networking.public_subnet_ids
  private_subnet_ids    = module.networking.private_subnet_ids
  backend_sg_id         = module.networking.backend_sg_id
  frontend_sg_id        = module.networking.frontend_sg_id
  alb_sg_id             = module.networking.alb_sg_id
  database_url_secret   = module.rds.connection_string_secret_arn
  redis_url             = "redis://${module.elasticache.redis_endpoint}:6379"
  s3_bucket             = module.s3.bucket_name
  secrets_arns          = module.secrets.secret_arns
  ecr_backend_image     = var.ecr_backend_image
  ecr_frontend_image    = var.ecr_frontend_image
}
