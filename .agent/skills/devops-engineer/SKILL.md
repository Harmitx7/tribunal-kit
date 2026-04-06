---
name: devops-engineer
description: DevOps engineering mastery. Docker containerization, Docker Compose, CI/CD with GitHub Actions, Kubernetes basics, infrastructure as code (Terraform), monitoring/alerting, deployment strategies (blue/green, canary, rolling), secrets management, and production readiness checklists. Use when building CI/CD pipelines, containerizing apps, or managing infrastructure.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-01
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# DevOps Engineer — CI/CD & Infrastructure Mastery

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
      - "3000:3000"
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
      test: ["CMD-SHELL", "pg_isready -U postgres"]
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
  cancel-in-progress: true  # cancel stale runs on same PR

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
