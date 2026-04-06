---
name: deployment-procedures
description: Production application deployment mastery. Zero-downtime deployment strategies (Blue/Green, Rolling updates), Container orchestration (Docker/ECS), CI/CD pipelines, secrets injection, database migration safety, health checks, and rollback contingencies. Use when moving code from development to production execution.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Deployment Procedures — Production Execution Mastery

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
