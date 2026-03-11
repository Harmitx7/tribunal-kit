---
description: Run ALL 11 Tribunal reviewer agents simultaneously. Maximum hallucination coverage. Use before merging any AI-generated code.
---

# /tribunal-full — Full Panel Review

$ARGUMENTS

---

Paste code. All 11 reviewers analyze it simultaneously. Maximum coverage, no domain gaps.

Use this **before merging any AI-generated code**, or when you're not sure which domain a piece of code sits in.

---

## When to Use /tribunal-full vs Targeted Tribunals

| Use `/tribunal-full` when... | Use a targeted tribunal when... |
|---|---|
| Not sure which domain applies | You know it's backend-only → `/tribunal-backend` |
| Cross-domain code (API + DB + UI) | Pure frontend → `/tribunal-frontend` |
| AI-generated code, pre-merge | Pure database queries → `/tribunal-database` |
| Security-critical code path | Mobile-specific → `/tribunal-mobile` |
| "Final check" before shipping | Performance concern only → `/tribunal-performance` |

---

## Who Runs

```
logic-reviewer          → Hallucinated methods, impossible logic, undefined refs
security-auditor        → OWASP Top 10, injection, secrets, auth bypass
dependency-reviewer     → Imports not found in package.json
type-safety-reviewer    → any, unsafe casts, unguarded access
sql-reviewer            → Injection via interpolation, N+1, invented schema
frontend-reviewer       → Hooks violations, missing dep arrays, state mutation
performance-reviewer    → O(n²), blocking I/O, memory allocation anti-patterns
test-coverage-reviewer  → Tautology tests, no-assertion specs, over-mocking
mobile-reviewer         → Touch targets, safe areas, keyboard avoidance, image memory
ai-code-reviewer        → Hallucinated model names, fake params, prompt injection, rate limits
accessibility-reviewer  → WCAG violations, missing ARIA, contrast, keyboard navigation
```

All 11 run in parallel. You wait for all verdicts before seeing the result.

---

## Severity Levels

| Symbol | Severity | Meaning |
|---|---|---|
| `❌ CRITICAL` | Blocking | Must be fixed before code reaches the codebase |
| `❌ HIGH` | Blocking | Likely to cause bugs or security issues in production |
| `⚠️ MEDIUM` | Non-blocking | Should be addressed; review before approving |
| `💬 LOW` | Advisory | Consider fixing; does not block merge |

**Policy:** Any `CRITICAL` or `HIGH` finding means the verdict is `REJECTED`. Code must be revised.

---

## Report Format

```
━━━ Full Tribunal Audit ━━━━━━━━━━━━━━━━━━━━━

  logic-reviewer:          ✅ APPROVED
  security-auditor:        ❌ REJECTED
  dependency-reviewer:     ✅ APPROVED
  type-safety-reviewer:    ⚠️  WARNING
  sql-reviewer:            ✅ APPROVED
  frontend-reviewer:       ✅ APPROVED
  performance-reviewer:    ✅ APPROVED
  test-coverage-reviewer:  ❌ REJECTED
  mobile-reviewer:         ✅ APPROVED (N/A — no mobile code)
  ai-code-reviewer:        ✅ APPROVED (N/A — no LLM calls)
  accessibility-reviewer:  ✅ APPROVED

━━━ Issues ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

security-auditor:
  ❌ CRITICAL — Line 12
     SQL injection: db.query(`WHERE id = ${id}`)
     Fix: db.query('WHERE id = $1', [id])

test-coverage-reviewer:
  ❌ HIGH — Line 45-60
     Tautology test: expect(fn(x)).toBe(fn(x)) — always passes regardless of fn's behavior

type-safety-reviewer:
  ⚠️ MEDIUM — Line 7
     Implicit any in parameter: function (data) — add explicit type annotation

━━━ Verdict ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  2 REJECTED. Fix all CRITICAL and HIGH issues before this code reaches your codebase.
  1 WARNING — review before approving.
  8 APPROVED.
```

---

## Retry Protocol

If code is rejected:

```
Attempt 1 → Fix issues from verdicts and resubmit
Attempt 2 → Stricter constraints + specific reviewer feedback
Attempt 3 → Maximum constraints + full context dump
Attempt 4 → HALT. Escalate to human with full failure history.
```

Hard limit: **3 revisions**. After 3 rejections, the agent stops and reports.

---

## Cross-Workflow Navigation

| After seeing findings... | Go to |
|---|---|
| Security findings need a targeted scan | `/audit` for full project-wide security sweep |
| Performance issues found | `/tribunal-performance` for deeper profiling |
| SQL injection pattern found | Check with `/tribunal-database` across all queries |
| Stale or phantom deps found | `/audit` → dependency scan |

---

## Usage

```
/tribunal-full [paste any code]
/tribunal-full before merging
/tribunal-full when you're unsure which domain applies
/tribunal-full the entire auth service
```
