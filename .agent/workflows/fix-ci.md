---
description: Automated CI/CD Failure Diagnosis & Repair. Parses raw GitHub Actions/GitLab CI runner logs, identifies the root cause (lockfile drift, missing environment variables, matrix incompatibilities, test timeouts, or syntax errors), and produces validated fixes.
tools: Read, Grep, Glob, Bash, Edit, Write
version: 3.0.0
last-updated: 2026-08-14
required-skills:
  - cicd-pro
  - diagnosing-bugs
  - devops-engineer
scripts-binding:
  - .agent/scripts/cicd_validator.js
  - .agent/scripts/test_runner.js
  - .agent/scripts/lint_runner.js
---

# /fix-ci — Automated Pipeline Failure Resolution

$ARGUMENTS

---

## Mandatory Pre-Flight Context Inspection

Before attempting to fix CI pipeline failures:

1. Parse Failing Runner Log → Identify exact step, exit code, and stack trace or runner error message
2. Inspect Workflow YAML & Project Configs → Compare runner environment (Node/Python/OS version) with local workspace
3. Human Gate Before Disk Write → Present root cause explanation and proposed diff for approval

4. Required Skills → Before executing, load and follow procedural rules from:
   - `cicd-pro` (.agent/skills/cicd-pro/SKILL.md): CI/CD workflow syntax, matrix builds, and deployment strategies
   - `diagnosing-bugs` (.agent/skills/diagnosing-bugs/SKILL.md): Bug diagnosis patterns and root cause investigation
   - `devops-engineer` (.agent/skills/devops-engineer/SKILL.md): CI/CD pipeline management and infrastructure automation

---

## 4-Step CI Diagnosis & Repair Loop

```
┌─────────────────────────────────────────────────────────────┐
│ 1. LOG INGESTION                                            │
│    User pastes failed CI log or step output                 │
│    Extract: Step Name, Error Code, Root Stack Trace        │
│                                                             │
│ 2. CLASSIFICATION                                           │
│    □ Lockfile / Dependency Drift (npm ci vs package.json)   │
│    □ Environment / Missing Secret / Missing Env Var        │
│    □ Version / Runner Matrix Incompatibility               │
│    □ Test / Lint / Typecheck Failure in CI Context         │
│    □ Service Container (DB/Redis) Connection Timeout       │
│                                                             │
│ 3. REPRODUCTION & ROOT CAUSE ISOLATION                      │
│    Simulate failing step locally using test/lint runners   │
│                                                             │
│ 4. REMEDIATION & VALIDATION                                 │
│    Apply fix to code or workflow YAML                       │
│    Run .agent/scripts/cicd_validator.js                     │
│    Submit through /tribunal-cicd Human Gate                │
└─────────────────────────────────────────────────────────────┘
```

---

## Common CI Failure Root Causes & Fix Recipes

### 1. `npm ci` ERESOLVE / Lockfile Drift

- **Symptom:** `npm error code EUSAGE / ERESOLVE` or `npm ci can only install when package.json and package-lock.json are in sync`.
- **Fix:** Run `npm install` locally to update lockfile and commit the synced `package-lock.json`.

### 2. Missing Environment Variables / Secrets

- **Symptom:** `process.env.DATABASE_URL is undefined` during build or test steps in CI.
- **Fix:** Add dummy or mock environment variables to the workflow step `env:` block (e.g. `DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/test"`).

### 3. Missing Service Container Healthchecks

- **Symptom:** Test step cannot connect to Postgres/Redis service in GitHub Actions runner.
- **Fix:** Add `options: --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5` to the service container definition.

### 4. Runner OS / Architecture Differences

- **Symptom:** Native binary module (e.g. `sharp`, `bcrypt`, `@swc/core`) fails to load on `ubuntu-latest`.
- **Fix:** Ensure correct optional dependencies or add OS matrix build steps.

---

## Usage Examples

```
/fix-ci [paste failed GitHub Actions log]
/fix-ci the test job failed on ubuntu-latest Node 22 with exit code 1
/fix-ci error: package-lock.json out of sync during npm ci
```
