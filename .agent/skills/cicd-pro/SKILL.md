---
name: cicd-pro
description: Enterprise-grade CI/CD mastery. Golden Path - GitHub Actions + Docker + AWS ECS. 3-stage pipeline architecture (Validate→Build→Deploy), OIDC-based AWS auth (no static secrets), Blue/Green and Canary deployment with ECS, environment promotion gates (dev→staging→production), rollback playbooks, Slack notifications, and reusable workflow patterns. Use when designing or implementing production CI/CD pipelines.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-06-21
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
routing:
  domain: devops
  tier: pro
  co-requires: [containerization-pro, cloud-architect]
  trigger-signals:
    strong: [CI/CD pipeline, GitHub Actions, Blue/Green deploy, OIDC AWS]
---

## Hallucination Traps (Read First)

- ❌ Missing `concurrency:` block → ✅ Without it, parallel deploys collide and corrupt production state
- ❌ `${{ secrets.GITHUB_TOKEN }}` for cross-repo operations → ✅ GITHUB_TOKEN scope is limited to current repo; use GitHub App token or PAT
- ❌ Static `AWS_ACCESS_KEY_ID` secrets → ✅ Use OIDC (`id-token: write` permission + `configure-aws-credentials` action)
- ❌ Deploying directly to production on every push → ✅ Always have a staging gate; production requires approval environment
- ❌ Skipping rollback strategy → ✅ Every deploy pipeline must define a concrete rollback path before execution
- ❌ `actions/checkout@v3` → ✅ Always use `@v4` (v3 is deprecated and uses Node 16)

---

# CI/CD Pro — Enterprise Pipeline Mastery

## 1. The 3-Stage Pipeline Model

```
┌─────────────────────────────────────────────────────────────┐
│  VALIDATE (Parallel)          BUILD           DEPLOY         │
│  ┌─────────────┐              ┌─────────┐    ┌──────────┐   │
│  │ lint        │              │ Docker  │    │ staging  │   │
│  │ typecheck   ├──all pass──→ │ build + ├──→ │ (auto)   │   │
│  │ unit tests  │              │ ECR push│    └──────────┘   │
│  │ sec audit   │              └─────────┘         │         │
│  └─────────────┘                            manual approval  │
│                                                   ↓         │
│                                             ┌──────────┐    │
│                                             │ production│    │
│                                             │ (gated)   │    │
│                                             └──────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Complete Pipeline (GitHub Actions + AWS ECS)

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

# ✅ CRITICAL: Prevent parallel deploys to same environment
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: myapp
  ECS_CLUSTER: myapp-prod
  ECS_SERVICE: myapp-api

jobs:
  # ──── STAGE 1: VALIDATE (parallel) ────
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  test:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test -- --coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/

  security:
    name: Security Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=high
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
      - uses: github/codeql-action/analyze@v3

  # ──── STAGE 2: BUILD ────
  build:
    name: Build & Push Docker Image
    runs-on: ubuntu-latest
    needs: [lint, test, security]
    if: github.ref == 'refs/heads/main' # only build on main merge
    permissions:
      id-token: write
      contents: read
    outputs:
      image: ${{ steps.push.outputs.image }}

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS (OIDC — no static keys)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push image
        id: push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ steps.login-ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:${{ github.sha }}
            ${{ steps.login-ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Scan image for vulnerabilities
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ steps.login-ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:${{ github.sha }}
          severity: CRITICAL
          exit-code: "1" # fail on critical vulnerabilities

  # ──── STAGE 3: DEPLOY STAGING ────
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build
    environment: staging # maps to GitHub Environment (can have protection rules)
    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.STAGING_AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Download ECS task definition
        run: |
          aws ecs describe-task-definition \
            --task-definition myapp-staging \
            --query taskDefinition > task-def.json

      - name: Update image in task definition
        id: task-def
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: task-def.json
          container-name: api
          image: ${{ needs.build.outputs.image }}

      - name: Deploy to ECS (Rolling update)
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: ${{ steps.task-def.outputs.task-definition }}
          service: myapp-staging-api
          cluster: myapp-staging
          wait-for-service-stability: true # wait until healthy

      - name: Notify Slack — Staging deployed
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            { "text": "✅ *Staging deployed* — `${{ github.sha }}` by ${{ github.actor }}" }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_DEPLOY_WEBHOOK }}

  # ──── STAGE 4: DEPLOY PRODUCTION (manual gate) ────
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment: production # ← requires manual approval in GitHub UI
    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.PROD_AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Download ECS task definition
        run: |
          aws ecs describe-task-definition \
            --task-definition myapp-prod \
            --query taskDefinition > task-def.json

      - name: Update image in task definition
        id: task-def
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: task-def.json
          container-name: api
          image: ${{ needs.build.outputs.image }}

      - name: Deploy to ECS (Blue/Green)
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: ${{ steps.task-def.outputs.task-definition }}
          service: ${{ env.ECS_SERVICE }}
          cluster: ${{ env.ECS_CLUSTER }}
          wait-for-service-stability: true
          codedeploy-appspec: appspec.yml # enables Blue/Green via CodeDeploy

      - name: Notify Slack — Production deployed
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            { "text": "🚀 *Production deployed* — `${{ github.sha }}` by ${{ github.actor }}" }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_DEPLOY_WEBHOOK }}

      - name: Notify Slack — Deployment failed
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            { "text": "🔥 *Production deploy FAILED* — `${{ github.sha }}` — <${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View logs>" }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_DEPLOY_WEBHOOK }}
```

---

## 3. Blue/Green Deployment (AWS ECS + CodeDeploy)

```yaml
# appspec.yml — CodeDeploy Blue/Green config
version: 0.0
Resources:
  - TargetService:
      Type: AWS::ECS::Service
      Properties:
        TaskDefinition: <TASK_DEFINITION>
        LoadBalancerInfo:
          ContainerName: api
          ContainerPort: 3000

Hooks:
  - BeforeAllowTraffic: ValidateDeploymentHook # run smoke tests before switching traffic
  - AfterAllowTraffic: PostDeployHook
```

```hcl
# Terraform: ECS service with Blue/Green enabled
resource "aws_ecs_service" "api" {
  name            = "myapp-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 2

  deployment_controller {
    type = "CODE_DEPLOY"    # enables Blue/Green
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.blue.arn
    container_name   = "api"
    container_port   = 3000
  }

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.api.id]
    assign_public_ip = false
  }

  lifecycle {
    ignore_changes = [task_definition, load_balancer]  # managed by CodeDeploy
  }
}
```

---

## 4. Rollback Playbook

### Automatic Rollback (on Health Check Failure)

```yaml
# ECS will automatically roll back if the new task fails health checks
# Ensure these are set in your ECS service:
resource "aws_ecs_service" "api" {
  # ...
  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 50

    deployment_circuit_breaker {
      enable   = true     # ← auto-rollback on failure
      rollback = true
    }
  }
}
```

### Manual Rollback (Emergency)

```bash
# Option 1: Redeploy previous image tag
PREVIOUS_SHA=$(git rev-parse HEAD~1)
aws ecs update-service \
  --cluster myapp-prod \
  --service myapp-api \
  --task-definition myapp-prod:$(($(aws ecs describe-services \
    --cluster myapp-prod --services myapp-api \
    --query 'services[0].taskDefinition' --output text | grep -oE '[0-9]+$') - 1))

# Option 2: Revert GitHub commit + trigger CI
git revert HEAD --no-edit
git push origin main

# Option 3: Use CodeDeploy's stop-deployment
aws deploy stop-deployment \
  --deployment-id d-XXXXXXXXX \
  --auto-rollback-enabled
```

---

## 5. Environment Promotion Gates

```
GitHub Environment Configuration:
  dev:
    - Auto-deploy: on every commit to main
    - No approvals required
    - Secrets: DEV_* scoped

  staging:
    - Auto-deploy: after dev succeeds
    - Required reviewers: none (auto)
    - Wait timer: 0 min

  production:
    - Required reviewers: @org/devops-lead (1 approver)
    - Wait timer: 5 minutes (cooling off period)
    - Deployment branch: main only
    - Secrets: PROD_* scoped
```

```yaml
# Set up GitHub Environment in Terraform (via GitHub provider)
resource "github_repository_environment" "production" {
  repository  = "my-repo"
  environment = "production"

  reviewers {
    teams = [data.github_team.devops.id]
  }

  deployment_branch_policy {
    protected_branches     = true    # only from protected branches
    custom_branch_policies = false
  }

  wait_timer = 5    # 5 minute cooling-off
}
```

---

## 🤖 LLM-Specific Traps

1. **No `concurrency:` block**: Without it, two deploys can run simultaneously, causing task definition conflicts in ECS and corrupted deployments.
2. **Deploying without a stability wait**: `wait-for-service-stability: true` is critical. Without it, the pipeline reports success while ECS is still starting containers.
3. **Hardcoded task definition revisions**: Never hardcode `:1` or `:latest` in ECS deploy steps. Always fetch the current revision dynamically with `describe-task-definition`.
4. **Missing Slack failure notification**: Success notifications alone create false security. Always add `if: failure()` Slack step.
5. **Using `needs.job.result` incorrectly**: `needs.build.outputs.image` only works if `build` job has `outputs:` defined. Verify the output name matches exactly.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor` · `devops-engineer`**

### ✅ Pre-Flight Self-Audit

```
✅ Does the workflow have a concurrency: block?
✅ Is AWS auth using OIDC (id-token: write permission)?
✅ Does staging gate exist before production?
✅ Is production environment configured with required reviewers?
✅ Is there a rollback strategy documented and tested?
✅ Does the Slack notification cover BOTH success AND failure cases?
✅ Is wait-for-service-stability: true set on the ECS deploy step?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden**: Declaring a pipeline correct because the YAML is syntactically valid.
- ✅ **Required**: A real GitHub Actions run must succeed (green checkmarks across all stages) before the pipeline is declared production-ready.
