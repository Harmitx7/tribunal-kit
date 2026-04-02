---
name: deployment-procedures
description: Production application deployment mastery. Zero-downtime deployment strategies (Blue/Green, Rolling updates), Container orchestration (Docker/ECS), CI/CD pipelines, secrets injection, database migration safety, health checks, and rollback contingencies. Use when moving code from development to production execution.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Deployment Procedures — Production Execution Mastery

> Code on a laptop delivers zero value. Shipping is a feature.
> Deployments should be boring, predictable, and 100% automated. Manual execution is a vulnerability.

---

## 1. Zero-Downtime Deployment Strategies

Stopping a server, pulling code, building, and restarting is unacceptable. This results in 30-120 seconds of 502 Bad Gateway errors.

### Blue/Green Deployment
- Two identical environments (Blue is live, Green is idle).
- Deploy v2 to Green. Run smoke tests on Green.
- Swap the reverse proxy (Nginx or Load Balancer) router from Blue to Green.
- Zero downtime. Rollback is instant (swap router back to Blue).

### Rolling Updates (Container Clusters)
- If you have 5 containers running v1. 
- Spin up 1 container running v2. Wait for it to pass health checks.
- Drain and terminate 1 container of v1.
- Repeat until all 5 containers run v2.

```bash
# Docker Swarm / ECS / Kubernetes inherently handle rolling updates
docker service update --image myapp:v2 --update-parallelism 1 --update-delay 10s myapp_web
```

---

## 2. Infrastructure as Code (IaC) CI Pipelines

All deployment logic must be codified and checked in alongside the application code.

```yaml
# .github/workflows/deploy.yml
name: Production Deploy

on:
  push:
    branches: [ "main" ]

# Concurrency limits prevent race conditions if two commits are pushed rapidly
concurrency: 
  group: production-deploy
  cancel-in-progress: true

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # 1. CI Phase: Fast fail
      - name: Install & Audit
        run: npm ci && npm audit --audit-level=high
      
      - name: Unit Tests
        run: npm test

      # 2. Build Phase
      - name: Build Assets
        run: npm run build

      # 3. CD Phase (Deployment via SSH/Docker)
      - name: Deploy to Server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: deploy_user
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            cd /opt/myapp
            git pull origin main
            docker-compose up -d --build
            # Container starts in background, port mapped to Nginx.
```

---

## 3. Database Migration Safety Rules

Schema changes cause 90% of severe deployment outages. 

**The Expand-and-Contract Pattern (Zero Downtime DB Migrations):**
Never drop columns or rename tables on a live system. Old code running against new schemas *will* crash.

*Goal: Rename column `first_name` to `given_name`*
- **Phase 1 (Expand):** Add `given_name` as a NEW, nullable column. The app writes to BOTH columns simultaneously, reads from `first_name`.
- **Phase 2 (Migrate):** Run background script copying `first_name` data to `given_name`.
- **Phase 3 (Swap):** Deploy v2 Application code that reads/writes exclusively to `given_name`.
- **Phase 4 (Contract):** Drop the legacy `first_name` column weeks later.

---

## 4. The 5-Minute Rollback Guarantee

If the new deployment throws persistent 5xx errors, how fast can you revert?
If the answer relies on "recompiling the old git commit," you have failed.

1. **Docker Tags:** Every build is tagged with the Git SHA (`myapp:a1b2c3d`). Reverting is a split-second container swap.
2. **Feature Flags:** The code deployed completely dormant. If it breaks when toggled via flag, the rollback is hitting the "Off" button on LaunchDarkly (Zero code deployed).
3. **Database Integrity:** Migrations are explicitly atomic (`BEGIN; DROP TABLE...; COMMIT;`) so failures roll back seamlessly.

---

## 🤖 LLM-Specific Traps (Deployments)

1. **The `git pull && pm2 restart` Trap:** AI defaults to suggesting raw SSH into a VPS, running `git pull`, and manually restarting the daemon. This guarantees downtime, unrepeatable builds, and ignores multi-node infrastructure.
2. **Storing Secrets in GitHub Code:** Embedding `.env.production` heavily into the deployment pipeline instead of exclusively using GitHub Secrets/AWS Parameter Store injection mapping.
3. **Missing Health Checks:** Deploying containers without explicitly defining a `/healthz` heartbeat, meaning the orchestrator will blindly route traffic to unbooted API instances.
4. **Destructive Migrations:** Recommending `npx prisma db push` (destructive) in production instead of `npx prisma migrate deploy` (tracked, safe).
5. **Node Modules Cache Bloat:** Downloading 800MB of `node_modules` repeatedly inside CI jobs without properly leveraging GitHub Actions Cache, doubling execution execution limits.
6. **Deploying Untested Code:** Writing deployment workflows that jump straight to the build/push phase, skipping the mandatory Lint/TypeCheck/Test safety pipeline sequence.
7. **Race Conditions:** Failing to enforce `concurrency: cancel-in-progress` in CI strings, resulting in Commit B deploying before Commit A under chaotic PR merging circumstances.
8. **Blind SSH Keys:** Generating GitHub Action files relying on SSH but forgetting to explicitly add `StrictHostKeyChecking no` configuration, making the pipeline hang forever at the server verification prompt.
9. **Environment Discrepancy:** Building React/Vite payloads locally on MacOS and `scp`ing the static files via ZIP upload, rather than enforcing isolated Linux Docker builds ensuring identical compilation architecture.
10. **The Manual Verification Myth:** Generating workflows expecting human "click to deploy" buttons midway through CI loops when true CD should be reliably automated upon merging to target branches.

---

## 🏛️ Tribunal Integration

### ✅ Pre-Flight Self-Audit
```
✅ Does the deployment strategy enforce Zero-Downtime rules (Blue/Green or Rolling)?
✅ Are database schemas applying the 'Expand-and-Contract' non-destructive methodology?
✅ Has the deployment architecture entirely eliminated raw `git pull` manual interventions?
✅ Is the CI pipeline firmly enforcing Linting, Typing, and Testing sequences *prior* to image pushing?
✅ Have catastrophic rollback pathways (e.g., reverting to explicitly tagged container SHAs) been defined?
✅ Are production secrets injected dynamically via encrypted vaults/actions rather than statically defined?
✅ Does the application expose a hardened `/healthz` endpoint for orchestration routers?
✅ Is CI concurrency restricted to prevent multi-job deployment collision and overlap?
✅ Has `npm ci` been enforced over the mutable `npm install` for deterministic build resolution?
✅ Are structural builds occurring solely inside isolated Linux environments/runners (no localized SCPing)?
```
