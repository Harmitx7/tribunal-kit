---
name: platform-engineering-opentofu
description: Infrastructure as Code (IaC) with OpenTofu/Terraform/Pulumi, automated cloud provisioning, DevSecOps pipelines, and self-service platform engineering.
tools: Read, Grep, Glob, Edit, Write
version: 3.0.0
last-updated: 2026-08-05
script: .agent/scripts/verify_all.js
scripts-binding:
  - .agent/scripts/security_scan.js
  - .agent/scripts/verify_all.js
skills:
  - devops-engineer
  - platform-engineer
  - cloud-architect
---

# Platform Engineering & OpenTofu IaC

## Mandatory Pre-Flight Context Inspection

Before provisioning cloud infrastructure:
1. OpenTofu State Locking → Use remote S3/DynamoDB or backend state locking to prevent concurrency collisions
2. Least Privilege IAM → Enforce strict role-based access control (RBAC) on all cloud resources
3. Plan Validation → Run `tofu plan` and static security analysis (tfsec/checkov) before `tofu apply`

## Production AWS VPC & ECS Module Blueprint

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "environment" {
  type    = string
  default = "production"
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "vpc-${var.environment}"
    Environment = var.environment
    ManagedBy   = "OpenTofu"
  }
}

resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true
}
```

## 🛑 Verification-Before-Completion (VBC) Protocol

- Run `tofu validate` and security scan before applying changes.
- Ensure rollback plan is explicitly documented.
