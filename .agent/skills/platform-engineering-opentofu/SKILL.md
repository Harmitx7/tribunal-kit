---
name: platform-engineering-opentofu
description: "Use when Infrastructure as Code (IaC) with OpenTofu/Terraform/Pulumi, automated cloud provisioning, DevSecOps pipelines, and self-service platform engineering."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - devops-engineer
  - platform-engineer
  - cloud-architect
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/security_scan.js
  - .agent/scripts/verify_all.js
  - .agent/scripts/lint_runner.js
---

# Platform Engineering & OpenTofu IaC

---

## 🛠️ Technical Architecture & Reference Recipes

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
