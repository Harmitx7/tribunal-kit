---
name: cicd-pro
description: Use when Enterprise-grade CI/CD mastery. Golden Path - GitHub Actions + Docker + AWS ECS. 3-stage pipeline architecture (Validate→Build→Deploy), OIDC-based AWS auth (no static secrets), Blue/Green and Canary deployment with ECS, environment promotion gates (dev→staging→production), rollback playbooks, Slack notifications, and reusable workflow patterns. Use when designing or implementing production CI/CD pipelines.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - containerization-pro
  - cloud-architect
  - devops-engineer
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# CI/CD Pro — Enterprise Pipeline Mastery

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `cicd-pro` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Enterprise-grade CI/CD mastery. Golden Path - GitHub Actions + Docker + AWS ECS. 3-stage pipeline architecture (Validate→Build→Deploy), OIDC-based AWS auth (no static secrets), Blue/Green and Canary deployment with ECS, environment promotion gates (dev→staging→production), rollback playbooks, Slack notifications, and reusable workflow patterns. Use when designing or implementing production CI/CD pipelines.
- **DO NOT activate when:** The task falls outside the `cicd-pro` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass       | Phase            | Core Action                                                                                  |
| :--------- | :--------------- | :------------------------------------------------------------------------------------------- |
| **Pass 1** | **Understand**   | Deconstruct the user's explicit objective, implicit requirements, and platform constraints.  |
| **Pass 2** | **Plan**         | Decompose the task into smallest logical steps; map dependencies and required tool calls.    |
| **Pass 3** | **Execute**      | Implement the solution with production-grade craft, zero placeholders, and strict typing.    |
| **Pass 4** | **Verify**       | Run linters, unit tests, or compiler checks to validate structural correctness.              |
| **Pass 5** | **Attack**       | Perform an adversarial review searching for edge-case failures, race conditions, and traps.  |
| **Pass 6** | **Improve**      | Eliminate discovered friction, optimize performance, and harden error boundaries.            |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---

## Hallucination Traps (Read First)

- ❌ Missing `concurrency:` block → ✅ Without it, parallel deploys collide and corrupt production state
- ❌ `${{ secrets.GITHUB_TOKEN }}` for cross-repo operations → ✅ GITHUB_TOKEN scope is limited to current repo; use GitHub App token or PAT
- ❌ Static `AWS_ACCESS_KEY_ID` secrets → ✅ Use OIDC (`id-token: write` permission + `configure-aws-credentials` action)
- ❌ Deploying directly to production on every push → ✅ Always have a staging gate; production requires approval environment
- ❌ Skipping rollback strategy → ✅ Every deploy pipeline must define a concrete rollback path before execution
- ❌ `actions/checkout@v3` → ✅ Always use `@v4` (v3 is deprecated and uses Node 16)

---

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
          exit-code: '1' # fail on critical vulnerabilities

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

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario                               | Risk                                                 | Mitigation Strategy                                                             |
| :------------------------------------- | :--------------------------------------------------- | :------------------------------------------------------------------------------ |
| **Empty or Null Inputs**               | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers   |
| **Network Timeout / Latency**          | Hanging operations or duplicate side-effects         | Implement bounded abort controllers, exponential backoff, and idempotency keys  |
| **Concurrency / Race Conditions**      | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls          |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection      | Validate boundary payloads with Zod/Pydantic schemas prior to execution         |
| **Resource / Memory Saturation**       | OOM errors, frame drops, or memory leaks             | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern                  | What AI Commonly Does Wrong                                       | What Is Actually Correct                                                         |
| :---------------------------- | :---------------------------------------------------------------- | :------------------------------------------------------------------------------- |
| **Silent Pipeline Failure**   | Executing shell steps without set -euo pipefail, ignoring errors  | Always initialize shell scripts with set -euo pipefail and trap handlers         |
| **Unpinned Dependency Shift** | Installing packages with npm install or using :latest docker tags | Lock dependencies with npm ci / lockfiles and use immutable SHA256 image digests |
| **Leaking Build Secrets**     | Passing secrets as Docker build arguments baked into image layers | Use Docker BuildKit secret mounts (--mount=type=secret) or runtime injection     |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `pipeline-reviewer` · `devops-engineer` · `resilience-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Are strict execution modes (set -euo pipefail) active on all scripts?
✅ Are container images pinned to digest/immutable tags instead of "latest"?
✅ Are deployment health checks and rollback baselines configured?
✅ Are CI secrets masked and unexposed to untrusted pull requests?
✅ Did I verify environment compatibility across target runtimes?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
