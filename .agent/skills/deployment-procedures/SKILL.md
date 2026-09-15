---
name: deployment-procedures
description: Use when Production application deployment mastery. Zero-downtime deployment strategies (Blue/Green, Rolling updates), Container orchestration (Docker/ECS), CI/CD pipelines, secrets injection, database migration safety, health checks, and rollback contingencies. Use when moving code from development to production execution.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - devops-engineer
  - cicd-pro
  - server-management
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Deployment Procedures — Production Execution Mastery

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `deployment-procedures` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Production application deployment mastery. Zero-downtime deployment strategies (Blue/Green, Rolling updates), Container orchestration (Docker/ECS), CI/CD pipelines, secrets injection, database migration safety, health checks, and rollback contingencies. Use when moving code from development to production execution.
- **DO NOT activate when:** The task falls outside the `deployment-procedures` domain or is managed by a different dedicated specialist.

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

- ❌ Running database migrations and code deploy in the same step -> ✅ Migrate FIRST, deploy code SECOND (expand-and-contract)
- ❌ Deploying without a rollback plan -> ✅ Every deploy needs a tested rollback: previous Docker image tag or git revert
- ❌ Using `latest` tags in production container images -> ✅ Always use specific version tags or SHA digests

---

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
    branches: ['main']

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
Never drop columns or rename tables on a live system. Old code running against new schemas _will_ crash.

_Goal: Rename column `first_name` to `given_name`_

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
