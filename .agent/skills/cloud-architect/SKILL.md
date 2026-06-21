---
name: cloud-architect
description: Production AWS cloud architecture mastery. Service selection (ECS Fargate vs Lambda vs EC2, RDS vs Aurora vs DynamoDB), Terraform IaC patterns with HCL examples, VPC networking design, IAM least privilege, Secrets Manager, CloudWatch observability, cost optimization, and multi-environment AWS Organizations strategy. Golden Path - AWS. Use when architecting cloud infrastructure, writing Terraform, or making AWS service selection decisions.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-06-21
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
routing:
  domain: devops
  tier: pro
  co-requires: [cicd-pro]
  trigger-signals:
    strong: [AWS, Terraform, ECS Fargate, VPC design, IAM]
---

## Hallucination Traps (Read First)

- ❌ Confusing availability zones with regions → ✅ `us-east-1` is a region. `us-east-1a` is an AZ within that region. Multi-AZ ≠ multi-region.
- ❌ `s3:*` or `*:*` IAM policies → ✅ IAM policies must follow least privilege. Enumerate exact actions required.
- ❌ Hardcoding ARNs, account IDs, or region strings → ✅ Always use `data.aws_caller_identity.current.account_id`, `var.region`, Terraform variables.
- ❌ Storing secrets in environment variables on EC2/ECS → ✅ Use AWS Secrets Manager. Reference ARN in task definition, not plaintext values.
- ❌ Lambda for all compute → ✅ Lambda cold starts hurt latency-sensitive APIs. ECS Fargate for always-warm containers.
- ❌ Public subnets for application servers → ✅ Application tier lives in private subnets. Only ALB and NAT Gateway in public subnets.

---

# Cloud Architect — Production AWS Mastery

## 1. Service Selection Matrix

### Compute

```
ECS Fargate:
  ✅ Long-running HTTP services (APIs, web apps)
  ✅ Container-based workloads (0 server management)
  ✅ Predictable traffic (no cold start concerns)
  ✅ >100ms response time acceptable
  Cost: ~$0.04048/vCPU/hr + $0.004445/GB/hr

Lambda:
  ✅ Event-driven (S3 trigger, SQS consumer, API Gateway)
  ✅ Infrequent, short-duration tasks (<15 min)
  ✅ True scale-to-zero requirements (cost optimization)
  ❌ Cold starts (100ms–1s for first request)
  ❌ Stateful connections (DB connection pooling — use RDS Proxy)
  Cost: $0.20/1M requests + $0.0000166667/GB-second

EC2:
  ✅ Specialized hardware (GPU, high I/O)
  ✅ Legacy apps that can't containerize
  ✅ Reserved capacity for cost optimization at scale
  ❌ Requires patch management and OS maintenance
  Cost: Varies, reserved instances 40-60% cheaper than on-demand
```

### Database

```
RDS PostgreSQL:
  ✅ ACID transactions required
  ✅ Complex JOIN queries
  ✅ Team knows SQL
  ✅ <10TB data
  Multi-AZ: automatic failover in ~60s
  Read replicas: up to 5 (async replication)

Aurora PostgreSQL:
  ✅ RDS PostgreSQL but need: higher availability, faster failover (<30s)
  ✅ >5 read replicas needed (up to 15 Aurora replicas)
  ✅ Global database (multi-region reads)
  ✅ Aurora Serverless v2 for variable/unpredictable load
  Cost: ~2x RDS, worth it for high-availability requirements

DynamoDB:
  ✅ Single-digit ms latency at any scale
  ✅ Key-value or simple document access patterns
  ✅ Global tables (multi-region active-active)
  ✅ Event-driven (DynamoDB Streams → Lambda)
  ❌ Complex queries (no joins, limited filtering)
  ❌ Requires careful partition key design
  On-Demand pricing: $1.25/1M writes, $0.25/1M reads
```

---

## 2. VPC Architecture (Golden Pattern)

```
┌─────────────────── VPC (10.0.0.0/16) ────────────────────┐
│  ┌─── Public Subnet A ──┐  ┌─── Public Subnet B ──┐       │
│  │  10.0.1.0/24         │  │  10.0.2.0/24         │       │
│  │  - ALB               │  │  - ALB (multi-AZ)    │       │
│  │  - NAT Gateway       │  │  - NAT Gateway       │       │
│  └──────────────────────┘  └──────────────────────┘       │
│  ┌─── Private Subnet A ─┐  ┌─── Private Subnet B ─┐       │
│  │  10.0.11.0/24        │  │  10.0.12.0/24        │       │
│  │  - ECS Tasks         │  │  - ECS Tasks         │       │
│  │  - Lambda (VPC)      │  │  - Lambda (VPC)      │       │
│  └──────────────────────┘  └──────────────────────┘       │
│  ┌─── Data Subnet A ────┐  ┌─── Data Subnet B ────┐       │
│  │  10.0.21.0/24        │  │  10.0.22.0/24        │       │
│  │  - RDS Primary       │  │  - RDS Replica       │       │
│  │  - ElastiCache       │  │  - ElastiCache       │       │
│  └──────────────────────┘  └──────────────────────┘       │
└───────────────────────────────────────────────────────────┘
```

### Terraform: VPC Module

```hcl
# modules/networking/main.tf
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.project}-${var.environment}"
  cidr = var.vpc_cidr   # e.g., "10.0.0.0/16"

  azs              = data.aws_availability_zones.available.names
  public_subnets   = var.public_subnet_cidrs    # ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnets  = var.private_subnet_cidrs   # ["10.0.11.0/24", "10.0.12.0/24"]
  database_subnets = var.database_subnet_cidrs  # ["10.0.21.0/24", "10.0.22.0/24"]

  enable_nat_gateway     = true
  single_nat_gateway     = var.environment == "staging"   # save cost in staging
  enable_dns_hostnames   = true
  enable_dns_support     = true

  # Required for ECS/EKS
  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
  }

  tags = local.common_tags
}
```

---

## 3. ECS Fargate Service (Complete Terraform)

```hcl
# modules/ecs/main.tf

# Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project}-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"   # CloudWatch Container Insights
  }

  tags = local.common_tags
}

# Task Definition
resource "aws_ecs_task_definition" "api" {
  family                   = "${var.project}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.task_cpu     # e.g., 512 (0.5 vCPU)
  memory                   = var.task_memory  # e.g., 1024 (1 GB)
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "api"
    image = "${var.ecr_repository_url}:${var.image_tag}"

    portMappings = [{
      containerPort = var.container_port
      protocol      = "tcp"
    }]

    # ✅ Secrets from Secrets Manager (not plaintext env vars)
    secrets = [
      { name = "DATABASE_URL", valueFrom = aws_secretsmanager_secret.db_url.arn },
      { name = "JWT_SECRET",   valueFrom = aws_secretsmanager_secret.jwt.arn }
    ]

    environment = [
      { name = "NODE_ENV", value = var.environment },
      { name = "PORT",     value = tostring(var.container_port) }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.api.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "api"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "wget --quiet --tries=1 --spider http://localhost:${var.container_port}/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 10
    }
  }])

  tags = local.common_tags
}

# ECS Service
resource "aws_ecs_service" "api" {
  name            = "${var.project}-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.api.id]
    assign_public_ip = false    # ✅ private subnets never get public IPs
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = var.container_port
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 50

    deployment_circuit_breaker {
      enable   = true
      rollback = true    # auto-rollback on failure
    }
  }

  depends_on = [aws_lb_listener.https]

  tags = local.common_tags
}
```

---

## 4. IAM Least Privilege

```hcl
# ✅ Execution Role — what ECS needs to START your container
resource "aws_iam_role" "ecs_execution" {
  name = "${var.project}-ecs-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_managed" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Allow pulling secrets from Secrets Manager
resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name = "secrets-access"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = [
        aws_secretsmanager_secret.db_url.arn,
        aws_secretsmanager_secret.jwt.arn
      ]
      # ✅ Scoped to exact secret ARNs, not secretsmanager:*
    }]
  })
}

# ✅ Task Role — what your APPLICATION code can do at runtime
resource "aws_iam_role_policy" "ecs_task_app" {
  name = "app-permissions"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject"]
        Resource = "${aws_s3_bucket.uploads.arn}/*"
        # ✅ Specific bucket, specific actions — not s3:*
      },
      {
        Effect   = "Allow"
        Action   = ["ses:SendEmail"]
        Resource = "arn:aws:ses:${var.aws_region}:${data.aws_caller_identity.current.account_id}:identity/*"
      }
    ]
  })
}
```

---

## 5. CloudWatch Observability

```hcl
# Structured JSON logging — filter patterns work
resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${var.project}-${var.environment}/api"
  retention_in_days = 30

  tags = local.common_tags
}

# Metric filter — count 5xx errors from structured logs
resource "aws_cloudwatch_log_metric_filter" "errors_5xx" {
  name           = "${var.project}-5xx-errors"
  pattern        = "{ $.status >= 500 }"
  log_group_name = aws_cloudwatch_log_group.api.name

  metric_transformation {
    name      = "5xxErrorCount"
    namespace = "${var.project}/API"
    value     = "1"
    unit      = "Count"
  }
}

# Alarm → SNS → PagerDuty
resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "${var.project}-high-5xx-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "5xxErrorCount"
  namespace           = "${var.project}/API"
  period              = "60"
  statistic           = "Sum"
  threshold           = "10"    # more than 10 errors in 2 minutes

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  treat_missing_data = "notBreaching"

  tags = local.common_tags
}
```

---

## 6. Multi-Environment Strategy

```hcl
# environments/staging/main.tf
module "app" {
  source = "../../modules/app"

  environment     = "staging"
  desired_count   = 1           # single task in staging
  task_cpu        = 256         # 0.25 vCPU
  task_memory     = 512
  single_nat_gateway = true     # save $32/month vs multi-NAT
}

# environments/production/main.tf
module "app" {
  source = "../../modules/app"

  environment     = "production"
  desired_count   = 3           # 3 tasks across 2 AZs
  task_cpu        = 1024        # 1 vCPU
  task_memory     = 2048
  single_nat_gateway = false    # high availability
}
```

### Terraform State Backend

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "mycompany-terraform-state"
    key            = "production/app.tfstate"
    region         = "us-east-1"
    encrypt        = true       # AES-256 at rest
    dynamodb_table = "terraform-locks"    # prevents concurrent state writes
  }
}
```

---

## 🤖 LLM-Specific Traps

1. **Omitting `data.aws_caller_identity.current.account_id`**: Never hardcode AWS account IDs in Terraform. Use the data source.
2. **Lambda for database-heavy operations**: Lambda's ephemeral compute model means each invocation opens a new DB connection. Use RDS Proxy for Lambda → RDS patterns.
3. **Ignoring NAT Gateway costs**: NAT Gateways cost ~$32/month + $0.045/GB. For staging, a single NAT Gateway is fine. For production, one per AZ for HA.
4. **Security groups as firewalls**: Security groups are stateful. NACLs are stateless. Never use NACLs as your primary defense layer — security groups are the right tool.
5. **Missing `lifecycle { ignore_changes }` on ECS services**: Without this, Terraform fights with your CI/CD pipeline over the running task definition revision.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor` · `cloud-engineer`**

### ✅ Pre-Flight Self-Audit

```
✅ Are all secrets stored in Secrets Manager (not plaintext env vars)?
✅ Are application servers in private subnets?
✅ Are IAM policies scoped to specific resources (no wildcard Resource: "*")?
✅ Is Terraform state stored in S3 with DynamoDB locking?
✅ Are CloudWatch alarms defined for error rates AND latency?
✅ Is auto-rollback configured on the ECS service circuit breaker?
✅ Are hardcoded account IDs / region strings replaced with data sources?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden**: Declaring Terraform configuration correct because it "looks right."
- ✅ **Required**: Run `terraform plan` with zero unexpected changes AND `terraform apply` successfully completes before marking infrastructure work as done.
