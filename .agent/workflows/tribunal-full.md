---
description: Run ALL 8 Tribunal reviewer agents simultaneously. Maximum hallucination coverage. Use before merging any AI-generated code.
---

# /tribunal-full — Full Panel Review

$ARGUMENTS

---

Paste code. All 8 reviewers analyze it simultaneously. Maximum coverage, no domain gaps.

Use this before merging any AI-generated code, or when you're not sure which domain a piece of code sits in.

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
```

All 8 run in parallel. You wait for all verdicts before seeing the result.

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

━━━ Issues ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

security-auditor:
  ❌ Critical — Line 12
     SQL injection: db.query(`WHERE id = ${id}`)
     Fix: db.query('WHERE id = $1', [id])

test-coverage-reviewer:
  ❌ High — Line 45-60
     Tautology test: expect(fn(x)).toBe(fn(x)) — always passes

type-safety-reviewer:
  ⚠️ Medium — Line 7
     Implicit any in parameter: function (data) — add explicit type

━━━ Verdict ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  2 REJECTED. Fix all issues before this code reaches your codebase.
  1 WARNING — review before approving.
```

---

## When to Use This

```
/tribunal-full [paste any code]
/tribunal-full before merging
/tribunal-full when you're unsure which domain applies
```
