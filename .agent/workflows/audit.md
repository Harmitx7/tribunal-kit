---
description: Full project audit combining security, lint, schema, tests, dependencies, and bundle analysis
---

# /audit — Comprehensive Project Health Check

$ARGUMENTS

---

This command runs a full audit of the project, combining all available analysis scripts in priority order. Use it before major releases, after onboarding to a new codebase, or whenever you need a complete health check.

---

## What Happens

The audit runs in strict priority order. Critical issues block further checks:

```
Priority 1 → Security Scan
Priority 2 → Lint & Type Check
Priority 3 → Schema Validation
Priority 4 → Test Suite
Priority 5 → Dependency Analysis
Priority 6 → Bundle Size Analysis
```

### Execution Commands

Each priority maps to a script:

```
# Priority 1 — Security
python .agent/scripts/security_scan.py .

# Priority 2 — Lint
python .agent/scripts/lint_runner.py .

# Priority 3 — Schema
python .agent/scripts/schema_validator.py .

# Priority 4 — Tests
python .agent/scripts/test_runner.py .

# Priority 5 — Dependencies
python .agent/scripts/dependency_analyzer.py . --audit

# Priority 6 — Bundle
python .agent/scripts/bundle_analyzer.py .
```

### Abort Conditions

- If **Priority 1 (Security)** finds CRITICAL issues → report and stop. Do not continue until security is resolved.
- If **Priority 2 (Lint)** has errors (not warnings) → report and continue, but flag as blocking for deploy.
- Priorities 3–6 always run, but their issues are advisory.

---

## Audit Report Format

After running all checks, produce a structured report:

```markdown
## 🔍 Project Audit Report

### Security: [PASS ✅ / FAIL ❌]
- [findings summary]

### Lint & Types: [PASS ✅ / FAIL ❌]
- [findings summary]

### Schema: [PASS ✅ / WARN ⚠️ / N/A]
- [findings summary]

### Tests: [PASS ✅ / FAIL ❌ / N/A]
- [pass/fail counts]

### Dependencies: [CLEAN ✅ / ISSUES ⚠️]
- [phantom imports, unused deps, vulnerabilities]

### Bundle: [OK ✅ / LARGE ⚠️ / N/A]
- [total size, heavy deps]

### Verdict:
[DEPLOY-READY ✅ / BLOCKED ❌ — reason]
```

---

## Quick Audit

For a faster check that skips bundle and schema:

```
python .agent/scripts/checklist.py .
```

---

## Usage

```
/audit
/audit this project before we deploy
/audit focus on security and dependencies only
```
