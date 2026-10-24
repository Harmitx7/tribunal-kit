# OpenTofu & Infrastructure as Code (IaC) Reference

> **Authority**: OpenTofu Project (Linux Foundation) & HashiCorp Configuration Language (HCL)  
> **Applicable Domains**: Platform Engineering, Cloud Infrastructure, OpenTofu / Terraform  
> **Status**: Verified Production Specification  

---

## 1. Remote State Invariants

State files contain raw infrastructure topology, IP addresses, and potentially decrypted secrets.

### Mandatory Remote Backend Standard (AWS S3 + DynamoDB):
```hcl
terraform {
  required_version = ">= 1.7.0"

  backend "s3" {
    bucket         = "production-tofu-state-bucket"
    key            = "services/api/tofu.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "tofu-state-locks"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }
}
```
- **Encryption**: Bucket server-side encryption must be enabled (`encrypt = true`).
- **State Locking**: DynamoDB lock table is mandatory to prevent simultaneous write race conditions.

---

## 2. Validation Blocks & Sensitive Masking

Always validate configuration variables at input boundaries:

```hcl
variable "environment" {
  type        = string
  description = "Target deployment environment"
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "The environment must be either 'staging' or 'production'."
  }
}

variable "database_password" {
  type        = string
  sensitive   = true # Prevents secret leakage in CLI terminal logs and plan output
}

output "db_endpoint" {
  value       = aws_db_instance.primary.endpoint
  description = "Primary RDS connection endpoint"
}
```

---

## 3. Idempotency & Lifecycle Rules

Prevent accidental destruction of production state stores:
```hcl
resource "aws_db_instance" "primary" {
  # ... configuration ...
  
  lifecycle {
    prevent_destroy = true
    ignore_changes  = [tags["LastUpdated"]]
  }
}
```
