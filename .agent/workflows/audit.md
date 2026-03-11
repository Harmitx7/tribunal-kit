---
description: Full project audit combining security, lint, schema, tests, dependencies, and bundle analysis
---

# /audit — Comprehensive Project Health Check

$ARGUMENTS

---

This command runs a full audit of the project, combining all available analysis scripts in priority order. Use it before major releases, after onboarding to a new codebase, or whenever you need a complete health check.

---

## When to Use /audit

| Situation | Recommended |
|---|---|
| Before a production deploy | `/audit` (full) |
| After a dependency upgrade | `/audit` — focus on deps + security |
| When onboarding to a new codebase | `/audit` — full scan first |
| Single file just changed | `/review [file]` is faster |
| Suspected security issue | `/audit` — security runs first |

---

## What Happens

The audit runs in strict priority order. Critical issues block further checks:

```
Priority 1 → Security Scan         (CRITICAL: halts on failure)
Priority 2 → Lint & Type Check     (BLOCKING for deploy on error)
Priority 3 → Schema Validation     (advisory)
Priority 4 → Test Suite            (advisory, marks task incomplete)
Priority 5 → Dependency Analysis   (advisory)
Priority 6 → Bundle Size Analysis  (advisory)
```

### Execution Commands

Each priority maps to a script:

```bash
# Priority 1 — Security
// turbo
python .agent/scripts/security_scan.py .

# Priority 2 — Lint
// turbo
python .agent/scripts/lint_runner.py .

# Priority 3 — Schema
// turbo
python .agent/scripts/schema_validator.py .

# Priority 4 — Tests
// turbo
python .agent/scripts/test_runner.py .

# Priority 5 — Dependencies
// turbo
python .agent/scripts/dependency_analyzer.py . --audit

# Priority 6 — Bundle
// turbo
python .agent/scripts/bundle_analyzer.py .
```

### Abort Conditions

| Priority | Condition | Action |
|---|---|---|
| Security (P1) | CRITICAL findings | **HALT** — report and stop. Do not proceed until resolved. |
| Lint (P2) | Errors (not warnings) | Continue but flag as **deploy-blocking** |
| Schema (P3) | Any failure | Continue, report as advisory |
| Tests (P4) | Failures | Continue, mark task as **incomplete** |
| Deps (P5) | Vulnerabilities | Continue, flag severity level |
| Bundle (P6) | Oversized assets | Continue, note thresholds exceeded |

### Script Failure Handling

```
Script exits 0     → Success, continue pipeline
Script exits 1     → Failure, report and decide: retry or skip?
Script not found   → Skip with ⚠️ warning, do not block pipeline
Script times out   → Kill process, report timeout, continue with next check
```

---

## Scoped Audit (Optional)

To audit a specific concern only, pass a flag:

```bash
/audit security only          → runs Priority 1 only
/audit deps                   → runs Priority 5 only
/audit lint                   → runs Priority 2 only
/audit before deploy          → runs P1 + P2 + P4 (blocking gates only)
/audit fresh codebase         → runs full suite and flags all advisory items
```

---

## Audit Report Format

After running all checks, produce a structured report:

```markdown
## 🔍 Project Audit Report — [date]

### Security: [PASS ✅ / FAIL ❌]
- [findings summary with severity: CRITICAL / HIGH / MEDIUM / LOW]

### Lint & Types: [PASS ✅ / FAIL ❌]
- [findings summary — errors vs. warnings distinguished]

### Schema: [PASS ✅ / WARN ⚠️ / N/A]
- [findings summary]

### Tests: [PASS ✅ / FAIL ❌ / N/A]
- [pass/fail counts + names of failing tests]

### Dependencies: [CLEAN ✅ / ISSUES ⚠️]
- [phantom imports, unused deps, known vulnerabilities with CVE IDs]

### Bundle: [OK ✅ / LARGE ⚠️ / N/A]
- [total size, heavy deps, suggested optimizations]

### Verdict:
[DEPLOY-READY ✅ / BLOCKED ❌ — reason]
[Next recommended action]
```

---

## Quick Audit

For a faster check that skips bundle and schema:

```bash
// turbo
python .agent/scripts/checklist.py .
```

---

## Cross-Workflow Navigation

| If the audit reveals... | Go to |
|---|---|
| Security CRITICAL findings | `/review [file]` for targeted analysis, then fix with `/generate` |
| Many lint errors | `/fix` to auto-resolve lint and formatting issues |
| Test failures | `/debug` to find root cause, then `/test` to add coverage |
| Outdated or vulnerable dependencies | `/migrate` for framework/dependency upgrades |
| Bundle size too large | `/tribunal-performance` for optimization review |

---

## Usage

```
/audit
/audit this project before we deploy
/audit focus on security and dependencies only
/audit after upgrading to Next.js 15
```
