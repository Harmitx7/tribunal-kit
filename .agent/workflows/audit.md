---
description: Full project audit combining security scan, lint, schema validation, test coverage, dependency analysis, and bundle analysis. Runs all scripts in priority order. Human review required before applying any fixes.
---

# /audit — Complete Project Health Assessment

$ARGUMENTS

---

## When to Use /audit

|Use `/audit` when...|Use something else when...|
|:---|:---|
|Before a major release or launch|Single file review → `/review`|
|After a security incident|Just lint errors → `/fix`|
|Onboarding to a new codebase|Performance only → `/performance-benchmarker`|
|Weekly/monthly health check|Testing only → `/test`|
|Before major dependency updates||

---

## Execution Order (Fixed — Do Not Reorder)

Security failures early in the pipeline halt subsequent steps. Lint/test failures continue with flags.

```
Priority 1 — Security (HALT if critical finding)
  python .agent/scripts/security_scan.py .

Priority 2 — Dependencies (HALT if exploitable CVE found)
  python .agent/scripts/dependency_analyzer.py . --audit

Priority 3 — Type Checking (CONTINUE but flag)
  npx tsc --noEmit

Priority 4 — Lint (CONTINUE but flag as deployment blocker)
  python .agent/scripts/lint_runner.py .

Priority 5 — Schema Validation (CONTINUE but flag)
  python .agent/scripts/schema_validator.py .

Priority 6 — Tests (CONTINUE but mark incomplete)
  python .agent/scripts/test_runner.py . --coverage

Priority 7 — Bundle Analysis (INFORM only)
  python .agent/scripts/bundle_analyzer.py . --build
```

### Cascade Failure Rules

|Check|Failure Behavior|
|:---|:---|
|Security scan (critical)|**HALT** — all subsequent steps cancelled|
|Dependency audit (exploitable CVE)|**HALT** — fix before proceeding|
|Lint + type errors|**CONTINUE** — flag as deployment blocker|
|Tests failing|**CONTINUE** — mark task as incomplete|
|Bundle analysis (large)|**INFORM** — no blocking|

---

## Script Retry Protocol

```
Script exits 0:     Success — continue pipeline
Script exits 1:     Failure — report and decide: retry or skip?
Script not found:   Skip with warning — do not block pipeline
Script times out:   Kill after 5 min — report timeout — continue
Script crashes:     Catch exception — report stack trace — continue
```

**Hard limit: 3 retries per script.** After 3 failures, report to human and continue with remaining scripts.

---

## Audit Report Format

```
━━━ Audit Report: [Project Name] ━━━━━━━━━━━━━━━━━━━━

Score: [N/7 checks passed]

1. Security Scan:         ✅ PASSED | ❌ FAILED (CRITICAL — HALTED) | ⚠️ WARNINGS
2. Dependency Audit:      ✅ PASSED | ❌ FAILED (CVE-XXXX-XXXX found) | ⚠️ WARNINGS
3. TypeScript:            ✅ PASSED | ❌ FAILED (N errors)
4. Lint:                  ✅ PASSED | ❌ FAILED (N errors, M warnings)
5. Schema Validation:     ✅ PASSED | ❌ FAILED | N/A
6. Test Coverage:         ✅ PASSED | ❌ FAILED (N% — below 80% threshold)
7. Bundle Size:           ✅ GOOD (310kb) | ⚠️ LARGE (>500kb) | ❌ CRITICAL (>1mb)

━━━ Critical Issues (Fix Before Deploy) ━━━━━━━━━━━━━
- [CRITICAL] SQL injection in src/routes/users.ts:47
- [HIGH] JWT secret from hardcoded fallback in src/lib/auth.ts:12

━━━ Important Issues (Fix Before Release) ━━━━━━━━━━
- [MEDIUM] 4 TypeScript 'any' types in src/components/
- [MEDIUM] Test coverage: 58% (target: 80%)

━━━ Recommendations ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Update lodash 4.17.20 → 4.17.21 (Prototype pollution CVE)
- Add @types/node to devDependencies (missing)
- Bundle size: chart library causes +240kb — use dynamic import

━━━ Suggested Next Steps ━━━━━━━━━━━━━━━━━━━━━━━━━━
Critical items → /tribunal-backend to fix injection and JWT issues
Test gaps → /test to add coverage for checkout and auth flows
Bundle → /enhance to add dynamic import for chart component
```

---

## Human Review Gate

After the audit report is produced:

```
Human Gate required before any fixes are applied.

Approve a fix plan?
Y = proceed with automated fixes where safe
N = report only, no changes
S = select specific items to fix
```

No files are modified without explicit approval.

---
