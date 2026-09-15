---
name: devops-engineer
description: Use when DevOps engineering mastery. Docker containerization, Docker Compose, CI/CD with GitHub Actions, Kubernetes basics, infrastructure as code (Terraform), monitoring/alerting, deployment strategies (blue/green, canary, rolling), secrets management, and production readiness checklists. Use when building CI/CD pipelines, containerizing apps, or managing infrastructure.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - cicd-pro
  - containerization-pro
  - cloud-architect
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# DevOps Engineer — CI/CD & Infrastructure Mastery

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `devops-engineer` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when DevOps engineering mastery. Docker containerization, Docker Compose, CI/CD with GitHub Actions, Kubernetes basics, infrastructure as code (Terraform), monitoring/alerting, deployment strategies (blue/green, canary, rolling), secrets management, and production readiness checklists. Use when building CI/CD pipelines, containerizing apps, or managing infrastructure.
- **DO NOT activate when:** The task falls outside the `devops-engineer` domain or is managed by a different dedicated specialist.

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

---

## Docker

### Dockerfile (Production-Ready)

```dockerfile
# ✅ Multi-stage build — minimal final image
FROM node:22-alpine AS builder
WORKDIR /app

# Install deps first (cache layer)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Build
COPY . .
RUN npm run build

# ──── Production stage ────
FROM node:22-alpine AS runner
WORKDIR /app

# Security: non-root user
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 appuser

# Copy only production artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

USER appuser
EXPOSE 3000
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
```

```dockerfile
# ❌ HALLUCINATION TRAP: Common Dockerfile mistakes
# ❌ FROM node:22         ← 1GB+ image (use alpine: ~150MB)
# ❌ RUN npm install      ← installs devDependencies, no lockfile
# ✅ RUN npm ci           ← deterministic, production-only
# ❌ COPY . .             ← copies node_modules, .git, secrets
# ✅ Use .dockerignore     ← exclude node_modules, .env, .git
# ❌ Running as root      ← security vulnerability
# ✅ USER appuser          ← non-root user
```

### .dockerignore

```
node_modules
.git
.env
.env.*
*.md
.github
coverage
dist
```

### Docker Compose

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      target: runner
    ports:
      - '3000:3000'
    environment:
      - DATABASE_URL=postgres://postgres:postgres@db:5432/myapp
      - REDIS_URL=redis://redis:6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

---

## CI/CD with GitHub Actions

### Standard Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true # cancel stale runs on same PR

jobs:
  lint-and-test:
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
      - run: npm run test -- --coverage

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage
          path: coverage/

  build:
    runs-on: ubuntu-latest
    needs: lint-and-test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build

  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4

      # Deploy to your platform (Vercel, Railway, Fly.io, etc.)
      - run: npx vercel deploy --prod --token=${{ secrets.VERCEL_TOKEN }}
```

### Security Scanning

```yaml
security:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: npm audit --audit-level=high
    - uses: github/codeql-action/analyze@v3
      with:
        languages: javascript-typescript
```

---

## Deployment Strategies

```
Rolling Update (default):
  Old ████████ → ██████░░ → ████░░░░ → ░░░░░░░░
  New ░░░░░░░░ → ░░██████ → ░░░░████ → ████████
  - Gradual replacement, zero downtime
  - Rollback: redeploy previous version

Blue/Green:
  Blue  ████████ (live)     → ░░░░░░░░ (idle)
  Green ░░░░░░░░ (staging)  → ████████ (live)
  - Instant switch via load balancer
  - Instant rollback (switch back)
  - Requires 2x infrastructure

Canary:
  Stable ████████ (95%)  → ████████ (90%)  → ████████ (0%)
  Canary ░░░░░░░░ (5%)   → ░░░░░░░░ (10%)  → ████████ (100%)
  - Gradual traffic shift
  - Monitor error rates/latency at each stage
  - Rollback: stop canary traffic

Feature Flags:
  - Deploy code, control activation separately
  - Risk-free deploys — flag is off by default
  - A/B testing capability
```

---

## Secrets Management

```yaml
# ❌ NEVER:
# - Hardcode secrets in code
# - Commit .env files to git
# - Use plain text in CI/CD configs
# - Share secrets via Slack/email

# ✅ ALWAYS:
# GitHub Actions: Repository Secrets
# - Settings → Secrets → Actions → New repository secret
# - Reference: ${{ secrets.MY_SECRET }}

# Production: Use your platform's secret manager
# - AWS Secrets Manager / SSM Parameter Store
# - GCP Secret Manager
# - Azure Key Vault
# - Doppler / Infisical (cross-platform)

# .env management:
# .env          → git-ignored, local development
# .env.example  → committed, shows required keys (no values)
```

---

## Production Readiness Checklist

```
Pre-Deploy:
  □ All tests passing (unit, integration, E2E)
  □ Security scan clean (npm audit, CodeQL)
  □ Build succeeds in CI (not just locally)
  □ Database migrations tested against production-size data
  □ Environment variables verified in target environment
  □ Rollback plan documented

Monitoring:
  □ Health check endpoint (/health)
  □ Structured logging (JSON, not console.log)
  □ Error tracking (Sentry, Datadog)
  □ Uptime monitoring (external)
  □ Alerting configured (PagerDuty, OpsGenie)

Performance:
  □ Response time P95 < 500ms
  □ Error rate < 0.1%
  □ Database connection pooling configured
  □ CDN for static assets
  □ Compression enabled (gzip/brotli)

Security:
  □ HTTPS only (HSTS enabled)
  □ Rate limiting on all public endpoints
  □ CORS configured (not wildcard *)
  □ Security headers (helmet)
  □ No secrets in code or logs
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
