---
name: containerization-pro
description: Production-grade containerization mastery. Multi-stage Dockerfiles for Node.js/Python/Rust/Go, image hardening (non-root, distroless, read-only FS), BuildKit layer caching, multi-platform builds (docker buildx), Docker Compose for local dev, container security scanning (Trivy/Grype), and AWS ECR workflows. Use when containerizing applications, optimizing Docker builds, or setting up container registries.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-06-21
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
routing:
  domain: devops
  tier: pro
  co-requires: [cicd-pro]
  trigger-signals:
    strong: [multi-stage build, BuildKit, ECR, Trivy, image hardening, Docker Compose]
---

## Hallucination Traps (Read First)

- ❌ `FROM node:22` → ✅ `FROM node:22-alpine` (1GB+ vs ~150MB). Always use slim/alpine variants.
- ❌ `RUN npm install` → ✅ `RUN npm ci --omit=dev` (deterministic, no devDeps, respects lockfile)
- ❌ `COPY . .` without `.dockerignore` → ✅ Always create `.dockerignore` first. Copies `node_modules`, `.env`, `.git` otherwise.
- ❌ Running container as root → ✅ Always create and switch to a non-root user. Root in container = root on host if container escapes.
- ❌ Single-stage Dockerfile → ✅ Multi-stage builds for any compiled/built application. Final image should contain ONLY runtime artifacts.
- ❌ `docker build` without `--platform` for CI → ✅ CI often runs on `amd64`; target hosts may be `arm64`. Always specify platform or use multi-platform builds.

---

# Containerization Pro — Production-Grade Docker Mastery

## 1. The .dockerignore (Write This First)

```
# .dockerignore — always create before writing Dockerfile
node_modules
npm-debug.log*
.npm
.git
.gitignore
.env
.env.*
*.md
README*
.github
.vscode
coverage
.nyc_output
dist        # will be rebuilt in container
build       # will be rebuilt in container
__pycache__
*.pyc
*.pyo
.pytest_cache
target      # Rust build artifacts
```

---

## 2. Multi-Stage Dockerfiles

### Node.js (Production-Ready)

```dockerfile
# ✅ Multi-stage — builder produces artifacts, runner is minimal
FROM node:22-alpine AS base
WORKDIR /app

# Install deps in isolation for better caching
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ──── Runtime (final) stage ────
FROM node:22-alpine AS runner
WORKDIR /app

# Security: create non-root user
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --ingroup appgroup appuser

# Copy only production artifacts
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json ./

USER appuser

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Health check — required for orchestration (ECS, Kubernetes)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
```

### Python (FastAPI)

```dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app

# Install build tools (needed for some packages, discarded in final image)
RUN apt-get update && apt-get install -y --no-install-recommends gcc && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# ──── Runtime stage ────
FROM python:3.12-slim AS runner
WORKDIR /app

# Security: non-root user
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --gid 1001 appuser

# Copy installed packages from builder
COPY --from=builder --chown=appuser:appgroup /root/.local /home/appuser/.local
COPY --chown=appuser:appgroup . .

USER appuser

ENV PATH=/home/appuser/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Rust (Distroless Final Image)

```dockerfile
FROM rust:1.78-slim AS builder
WORKDIR /app

# Cache dependencies separately for fast rebuilds
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm src/main.rs

# Build actual application
COPY src ./src
RUN touch src/main.rs && cargo build --release

# ──── Distroless runtime (no shell, no package manager, minimal attack surface) ────
FROM gcr.io/distroless/cc-debian12 AS runner
WORKDIR /app

COPY --from=builder /app/target/release/myapp ./myapp

USER nonroot:nonroot
EXPOSE 8080

CMD ["/app/myapp"]
```

### Go

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server ./cmd/server

# ──── Scratch (smallest possible image) ────
FROM scratch AS runner
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /app/server /server

EXPOSE 8080
ENTRYPOINT ["/server"]
```

---

## 3. BuildKit Layer Caching (CI Speed)

```dockerfile
# syntax=docker/dockerfile:1.6
FROM node:22-alpine AS builder
WORKDIR /app

# Mount npm cache — persists between builds (dramatic speed improvement in CI)
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Mount build cache (Next.js / webpack)
COPY . .
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build
```

```yaml
# GitHub Actions — enable BuildKit with caching
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: ${{ env.ECR_REGISTRY }}/${{ env.ECR_REPOSITORY }}:${{ github.sha }}
    cache-from: type=gha # GitHub Actions cache
    cache-to: type=gha,mode=max # Cache all layers
    build-args: |
      BUILDKIT_INLINE_CACHE=1
```

---

## 4. Multi-Platform Builds

```bash
# Build for both amd64 (x86) and arm64 (Apple Silicon, AWS Graviton)
docker buildx create --name mybuilder --use
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag myapp:latest \
  --push \
  .
```

```yaml
# GitHub Actions — multi-platform
- name: Set up QEMU
  uses: docker/setup-qemu-action@v3

- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Build multi-platform image
  uses: docker/build-push-action@v5
  with:
    platforms: linux/amd64,linux/arm64
    push: true
    tags: ${{ steps.meta.outputs.tags }}
```

---

## 5. Docker Compose (Local Development)

```yaml
# docker-compose.yml
services:
  api:
    build:
      context: .
      target: builder # use builder stage locally (includes devtools)
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgres://postgres:postgres@db:5432/myapp_dev
      REDIS_URL: redis://redis:6379
    volumes:
      - .:/app # mount source for hot-reload
      - /app/node_modules # anonymous volume prevents host node_modules overwrite
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5
    ports:
      - "5432:5432" # expose for local DB clients

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data
    ports:
      - "6379:6379"

volumes:
  pgdata:
  redisdata:
```

---

## 6. Container Security Scanning

```yaml
# GitHub Actions — Trivy vulnerability scan
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.ECR_REGISTRY }}/${{ env.ECR_REPOSITORY }}:${{ github.sha }}
    format: sarif
    output: trivy-results.sarif
    severity: CRITICAL,HIGH
    exit-code: "1" # fail pipeline on CRITICAL/HIGH vulnerabilities

- name: Upload Trivy scan results to GitHub Security tab
  uses: github/codeql-action/upload-sarif@v3
  if: always()
  with:
    sarif_file: trivy-results.sarif
```

```bash
# Local scanning
trivy image myapp:latest

# Scan Dockerfile for misconfigurations before building
trivy config Dockerfile
```

---

## 7. AWS ECR Workflow

```yaml
# Complete ECR push workflow
jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    outputs:
      image: ${{ steps.build.outputs.image }}

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials (OIDC — no static keys)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build, tag, and push image
        id: build
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ steps.login-ecr.outputs.registry }}/myapp:${{ github.sha }}
            ${{ steps.login-ecr.outputs.registry }}/myapp:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Output image URI
        run: echo "image=${{ steps.login-ecr.outputs.registry }}/myapp:${{ github.sha }}" >> $GITHUB_OUTPUT
```

### ECR Lifecycle Policy (Cost Control)

```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep last 10 production images",
      "selection": {
        "tagStatus": "tagged",
        "tagPrefixList": ["v"],
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": { "type": "expire" }
    },
    {
      "rulePriority": 2,
      "description": "Expire untagged images after 1 day",
      "selection": {
        "tagStatus": "untagged",
        "countType": "sinceImagePushed",
        "countUnit": "days",
        "countNumber": 1
      },
      "action": { "type": "expire" }
    }
  ]
}
```

---

## 🤖 LLM-Specific Traps

1. **`FROM node:latest`**: Never use `latest` tag in production Dockerfiles. Tags are mutable. Pin to a specific version (`node:22.3.0-alpine`).
2. **Missing HEALTHCHECK**: Orchestrators (ECS, Kubernetes) use HEALTHCHECK to know when a container is ready. Without it, traffic is sent before the app is ready.
3. **Secrets as build args**: `ARG SECRET_KEY` bakes secrets into the image history. Use `--secret` flag with BuildKit or runtime environment variables.
4. **`docker-compose up` in production**: Docker Compose is for development. Use ECS, Kubernetes, or similar for production.
5. **Wrong COPY source path**: `COPY --from=builder` paths are relative to the builder WORKDIR. Always verify the exact output path.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor` · `devops-engineer`**

### ✅ Pre-Flight Self-Audit

```
✅ Does the Dockerfile use a non-root user?
✅ Is there a .dockerignore file?
✅ Is the final stage minimal (alpine/distroless, no build tools)?
✅ Are secrets passed as runtime env vars, not build args?
✅ Is there a HEALTHCHECK instruction?
✅ Are image tags pinned (not :latest)?
✅ Is multi-stage build used for compiled/built artifacts?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden**: Declaring a Dockerfile correct because it "looks valid."
- ✅ **Required**: Run `docker build .` successfully AND `docker run` the image to verify the health endpoint responds before declaring complete.
