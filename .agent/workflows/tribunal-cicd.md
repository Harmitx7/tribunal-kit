---
description: CI/CD Pipeline & Workflow Tribunal. Runs Pipeline + Security + Dependency + Resilience reviewers. Use for GitHub Actions (.github/workflows/), GitLab CI (.gitlab-ci.yml), Dockerfiles, and deployment configs.
tools: Read, Grep, Glob, Bash, Edit, Write
version: 3.0.0
last-updated: 2026-08-14
required-skills:
  - cicd-pro
  - devops-engineer
  - containerization-pro
scripts-binding:
  - .agent/scripts/cicd_validator.js
  - .agent/scripts/security_scan.js
  - .agent/scripts/dependency_analyzer.js
---

# /tribunal-cicd — Pipeline & Workflow Audit

$ARGUMENTS

---

## Mandatory Pre-Flight Context Inspection

Before auditing CI/CD configurations, you MUST inspect:

1. Target Workflow Files (`.github/workflows/*.yml`, `.gitlab-ci.yml`, `Dockerfile`)
2. Repository Secrets & OIDC Configuration (`id-token: write`, environment promotion rules)
3. 28-Reviewer Parallel Gate: Execute `pipeline-reviewer`, `security-auditor`, `dependency-reviewer`, `resilience-reviewer`, and `precedence-reviewer`.

4. Required Skills → Before executing, load and follow procedural rules from:
   - `cicd-pro` (.agent/skills/cicd-pro/SKILL.md): CI/CD workflow syntax, matrix builds, and deployment strategies
   - `devops-engineer` (.agent/skills/devops-engineer/SKILL.md): CI/CD pipeline management and infrastructure automation
   - `containerization-pro` (.agent/skills/containerization-pro/SKILL.md): Docker, Kubernetes, and container security best practices

---

## When to Use /tribunal-cicd

| Use `/tribunal-cicd` when...                  | Use something else when...                      |
| :-------------------------------------------- | :---------------------------------------------- |
| Writing or modifying GitHub Actions workflows | Application API endpoints → `/tribunal-backend` |
| Authoring Dockerfiles or multi-stage builds   | Frontend React code → `/tribunal-frontend`      |
| Setting up automated release pipelines        | Database schemas → `/tribunal-database`         |
| Auditing CI pipeline security & secrets       | Maximum system-wide coverage → `/tribunal-full` |
| Fixing broken CI builds or test matrices      | Diagnosing live runner failure logs → `/fix-ci` |

---

## Active Reviewers (Run in Parallel)

### precedence-reviewer

- Checks local repo Case Law for previously rejected pipeline patterns.

### pipeline-reviewer

- Deprecated action tags (`actions/checkout@v2`/`@v3` → `@v4`).
- Missing concurrency mutex (`concurrency:` with `cancel-in-progress`).
- Insecure triggers (`pull_request_target` with PR checkout).
- Deterministic builds (`npm ci` vs `npm install`).
- Step and runner timeout settings.

### security-auditor

- Script injection via unescaped context strings in inline bash.
- Hardcoded credentials, plain text tokens, or missing secret references.
- Excessive workflow-level permissions (e.g. `write-all`).
- Insecure artifact uploads/downloads.

### dependency-reviewer

- Unpinned third-party community actions (missing SHA hash pinning).
- Supply chain security vulnerabilities in container base images.

### resilience-reviewer

- Missing `if: failure()` alerting on deploy steps.
- Missing rollback triggers on health check failures.
- Unhandled matrix combinations or missing fallback retry logic.

---

## Verdict System

```
If ANY reviewer → ❌ REJECTED: code must be fixed before Human Gate
If any reviewer → ⚠️ WARNING:  proceed with flagged items noted
If all reviewers → ✅ APPROVED: present to Human Gate
```

---

## Usage Examples

```
/tribunal-cicd .github/workflows/ci.yml
/tribunal-cicd .github/workflows/deploy.yml
/tribunal-cicd Dockerfile and deployment manifest
```

---

## After /tribunal-cicd — Next Steps

| Outcome                         | Next Command                                   |
| :------------------------------ | :--------------------------------------------- |
| All checks pass                 | → `/deploy` or commit and push                 |
| Reviewers reject with fixes     | → Apply fixes, then run `/tribunal-cicd` again |
| Live pipeline failure in GitHub | → `/fix-ci` with the failing runner logs       |
