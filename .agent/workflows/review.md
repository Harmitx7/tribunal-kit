---
description: Audit existing code for hallucinations. Runs Logic + Security reviewers on any code without generating anything new.
---

# /review — Code Audit (No Generation)

$ARGUMENTS

---

This command audits code you already have. Nothing is generated. The reviewers read, analyze, and report — that's it.

Paste code directly after the command, or point to a file.

---

## How to Use It

```
/review

[paste code here]
```

Or:

```
/review src/services/auth.service.ts
```

---

## What Always Runs

```
logic-reviewer      → Methods that don't exist, conditions that can't be true,
                      undefined variables used before assignment

security-auditor    → SQL injection, hardcoded credentials, auth bypass,
                      unvalidated input, exposed stack traces
```

## What Also Runs (Based on Code Type)

| Code Contains | Additional Reviewer |
|---|---|
| SQL / ORM queries | `sql-reviewer` |
| React hooks / components | `frontend-reviewer` |
| TypeScript types / generics | `type-safety-reviewer` |
| Import statements | `dependency-reviewer` |

---

## Audit Report Format

```
━━━ Audit: [filename or snippet] ━━━━━━━━━

logic-reviewer:       ✅ No hallucinated APIs found
security-auditor:     ❌ REJECTED

Findings:
  ❌ Critical — Line 8
     Type: SQL injection
     Code: `db.query(\`SELECT * WHERE id = ${id}\`)`
     Fix:  Use parameterized: `db.query('SELECT * WHERE id = $1', [id])`

  ⚠️ Warning — Line 22
     Type: Unguarded optional access
     Code: `user.profile.name`
     Fix:  `user?.profile?.name ?? 'Unknown'`

━━━ Summary ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1 Critical issue blocking integration.
1 Warning — review before shipping.
```

---

## Usage

```
/review the auth middleware
/review this SQL query [paste]
/review src/routes/user.ts for injection risks
/review my React component for hooks violations
```
