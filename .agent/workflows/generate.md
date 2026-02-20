---
description: Generate code using the full Tribunal Anti-Hallucination pipeline. Maker generates at low temperature → selected reviewers audit in parallel → Human Gate for final approval.
---

# /generate — Hallucination-Free Code Generation

$ARGUMENTS

---

This command runs code generation through the full Tribunal pipeline. Code reaches you only after being reviewed. Nothing is written to disk without your explicit approval.

---

## Pipeline Flow

```
Your request
    │
    ▼
Context read — existing files, schema, package.json scanned
    │
    ▼
Maker generates at temperature 0.1
(grounded in context, never inventing)
    │
    ▼
Selected reviewers run in parallel
    │
    ▼
Human Gate — you see all verdicts and the diff
Only then: write to disk (Y) or discard (N) or revise (R)
```

---

## Who Reviews It

Default (always active):

```
logic-reviewer     → Hallucinated methods, impossible logic, undefined refs
security-auditor   → OWASP vulnerabilities, SQL injection, hardcoded secrets
```

Auto-activated by keywords in your request:

| Keyword | Additional Reviewer |
|---|---|
| api, route, endpoint | `dependency-reviewer` + `type-safety-reviewer` |
| sql, query, database | `sql-reviewer` |
| component, hook, react | `frontend-reviewer` + `type-safety-reviewer` |
| test, spec, coverage | `test-coverage-reviewer` |
| slow, memory, optimize | `performance-reviewer` |

---

## What the Maker Is Not Allowed to Do

```
❌ Import a package not in the project's package.json
❌ Call a method it hasn't seen documented
❌ Use `any` in TypeScript without a comment explaining why
❌ Generate an entire application in one shot
❌ Guess at a database column name
```

When unsure about any call: it writes `// VERIFY: [reason]` instead of hallucinating.

---

## Output Format

```
━━━ Tribunal: [Domain] ━━━━━━━━━━━━━━━━━━

Active reviewers: logic · security · [others]

[Generated code]

━━━ Verdicts ━━━━━━━━━━━━━━━━━━━━━━━━━━━

logic-reviewer:       ✅ APPROVED
security-auditor:     ✅ APPROVED

━━━ Human Gate ━━━━━━━━━━━━━━━━━━━━━━━━

Write to disk?  Y = approve | N = discard | R = revise with feedback
```

---

## Usage

```
/generate a JWT middleware for Express with algorithm enforcement
/generate a Prisma query for users with their posts included
/generate a debounced search hook in React
/generate a function to validate and normalize email addresses
```
