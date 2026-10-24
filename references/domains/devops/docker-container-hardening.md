# Docker Container Security & Hardening Reference

> **Authority**: CIS Docker Benchmark & NIST SP 800-190  
> **Applicable Domains**: Containerization, DevOps, Cloud Infrastructure  
> **Status**: Verified Production Specification  

---

## 1. Hardened Multi-Stage Dockerfile Pattern

```dockerfile
# ── Stage 1: Build Environment ──
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build && npm prune --production

# ── Stage 2: Hardened Minimal Production Runtime ──
FROM gcr.io/distroless/nodejs20-debian12:nonroot
WORKDIR /app

# Copy production artifacts exclusively
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Non-root execution is enforced by distroless nonroot user (UID 65532)
USER nonroot

ENV NODE_ENV=production
EXPOSE 3000
CMD ["dist/main.js"]
```

---

## 2. Mandatory Container Invariants

### 1. Zero Root Execution
- ❌ **Forbidden**: Running application containers as `root` (UID 0). A container breakout under root compromises the host kernel.
- ✅ **Required**: Explicitly create and switch to an unprivileged user (`USER node` or `USER nonroot`).

### 2. Immutable Read-Only Root Filesystem
Configure orchestrators (Docker Compose / Kubernetes) to mount the container filesystem as read-only, providing temporary memory storage (`tmpfs`) exclusively for write locations:
```yaml
services:
  api:
    image: my-service:production
    read_only: true
    tmpfs:
      - /tmp:rw,noexec,nosuid,size=64m
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
```

### 3. Capability Dropping
Drop all Linux kernel capabilities by default (`cap_drop: ALL`). If network binding to ports below 1024 is needed, use port 3000/8080 instead or grant only `CAP_NET_BIND_SERVICE`.
