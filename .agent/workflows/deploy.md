---
description: Production deployment command. Runs pre-flight safety checks (tests, type-check, lint, security, build), creates a rollback baseline, confirms Human Gate, then executes deployment. Requires explicit human approval before going live.
---

# /deploy — Production Deployment

$ARGUMENTS

---

## The Deployment Contract

"Production is the only environment that matters. Every deployment is a risk event."
Every step is logged. Every step has a rollback path. No surprises.

---

## When to Use /deploy

|Use `/deploy` when...|Do NOT deploy when...|
|:---|:---|
|All pre-flight checks pass|Any pre-flight check fails|
|Changes are reviewed and approved|In the middle of a debug session|
|You have a rollback plan|No tests run since last change|
|Non-peak traffic hours (if possible)|Security audit shows critical issues|

---

## Phase 1 — Pre-Flight Checks (ALL Must Pass)

**If ANY check in Phase 1 fails → deployment is BLOCKED.**

```bash
# T-minus safety sequence (in exact order)

# 1. Security: halt on critical
python .agent/scripts/security_scan.py . --level=critical

# 2. Dependencies: no exploitable CVEs
npm audit --audit-level=high

# 3. Type safety: zero errors allowed
npx tsc --noEmit

# 4. Tests: all must pass
npm test

# 5. Build: production build must succeed
npm run build

# 6. Lint: blocking errors halt deployment
npm run lint --max-warnings=0
```

**Pre-Flight Report:**

```
━━━ Pre-Flight Status ━━━━━━━━━━━━━━━━━━━━━

Security:    ✅ CLEAR | ❌ BLOCKED ([finding])
npm audit:   ✅ CLEAR | ❌ BLOCKED ([CVE])
TypeScript:  ✅ ZERO ERRORS | ❌ BLOCKED (N errors)
Tests:       ✅ ALL PASS | ❌ BLOCKED (N failing)
Build:       ✅ SUCCESS | ❌ BLOCKED (build error)
Linting:     ✅ CLEAN | ⚠️ WARNINGS (N) | ❌ BLOCKING ERRORS (N)
```

---

## Phase 2 — Rollback Baseline

Before deployment, capture the rollback state:

```bash
# Option A: Git baseline
git rev-parse HEAD  # Record current commit hash
# Rollback: git revert HEAD or git reset --hard [hash]

# Option B: Tag the current release
git tag release-$(date +%Y%m%d-%H%M%S)
git push origin --tags

# Option C: Database snapshot (if schema changed)
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql
```

**Rollback baseline must be confirmed before deployment begins.**

---

## Phase 3 — Human Gate (Non-Negotiable)

After pre-flight passes, present to the deployer:

```
━━━ Deployment Approval Required ━━━━━━━━━━━━━━

Target environment:  [production | staging]
Changes in this deploy:
  [commit summary: feat/fix/chore + description]
  [number of files changed]

Database changes:    [Yes: describe migration | None]
Breaking changes:    [Yes: describe | None]

Pre-flight:          ✅ ALL CHECKS PASSED

Rollback baseline:   Commit [hash] tagged as [release-name]
Rollback command:    git reset --hard [hash]

Deploy?  Y = proceed | N = abort | W = wait (deploy later)
```

**Nothing is deployed without explicit "Y" from the human.**

---

## Phase 4 — Deployment Execution

```bash
# Deploy (platform-specific — auto-detected from project config)

# → Render + GitHub Actions:
git push origin main  # CI/CD deploys automatically

# → Manual Fly.io:
flyctl deploy --strategy rolling

# → Manual Kubernetes:
kubectl set image deployment/api api=[registry]/app:[commit-sha]
kubectl rollout status deployment/api
```

---

## Phase 5 — Post-Deploy Verification

Within 5 minutes of deployment completing:

```bash
# Health check
curl -f https://api.yoursite.com/health        # Must return 200
curl -f https://yoursite.com                   # Must load
curl -f https://yoursite.com/api/auth/session  # Auth must work

# Monitor error rate (5 minutes)
# If error rate > 1% above baseline → initiate rollback immediately
```

---

## Rollback Decision Tree

```
After deploy, within 5 minutes:
├── Error rate normal + health checks pass → ✅ Deployment successful
├── Error rate elevated but < 1% above baseline → ⚠️ Monitor for 10 more minutes
├── Error rate > 1% above baseline → ❌ ROLLBACK IMMEDIATELY
└── Health check fails → ❌ ROLLBACK IMMEDIATELY

Rollback command:
  git reset --hard [baseline-commit]
  git push origin main --force-with-lease
```

---

## Schema Change Deployment Pattern

If this deploy includes database migrations:

```
1. Deploy migration in isolation (no application code change)
2. Verify migration succeeded and DB is healthy
3. THEN deploy application code that uses new schema
```

**Never deploy application code and schema changes in the same deployment.**

---
