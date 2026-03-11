---
description: Audit existing code for hallucinations. Runs Logic + Security reviewers on any code without generating anything new.
---

# /review — Code Audit (No Generation)

$ARGUMENTS

---

This command audits code you already have. **Nothing is generated.** The reviewers read, analyze, and report — that's it.

Paste code directly after the command, or point to a file.

---

## When to Use /review vs Other Commands

| Use `/review` when... | Use something else when... |
|---|---|
| You want to audit code you already wrote | You want to generate new code → `/generate` |
| You received AI-generated code from another tool | Code needs full pre-merge audit → `/tribunal-full` |
| You suspect a security issue in one file | Full project security sweep → `/audit` |
| You want a quick sanity check on a PR | Pre-merge review → `/tribunal-full` |

---

## How to Use It

**Via paste:**

```
/review

[paste code here]
```

**Via file reference:**

```
/review src/services/auth.service.ts
/review src/routes/user.ts for injection risks
```

**With a specific concern:**

```
/review src/db/queries.ts focus: SQL injection only
/review the auth middleware focus: auth bypass and secrets
```

---

## What Always Runs

```
logic-reviewer      → Methods that don't exist, conditions that can't be true,
                      undefined variables used before assignment,
                      unreachable code, inverted boolean logic

security-auditor    → SQL injection, hardcoded credentials, auth bypass,
                      unvalidated input, exposed stack traces,
                      insecure defaults, OWASP Top 10
```

## What Also Runs (Based on Code Type)

| Code Contains | Additional Reviewer Activated |
|---|---|
| `SELECT`, `INSERT`, `UPDATE`, ORM queries | `sql-reviewer` |
| React hooks, Vue components, JSX | `frontend-reviewer` |
| TypeScript generics, `any`, type assertions | `type-safety-reviewer` |
| `import`, `require`, third-party packages | `dependency-reviewer` |
| `openai`, `anthropic`, `gemini`, LLM SDK calls | `ai-code-reviewer` |
| Performance-critical loops or async paths | `performance-reviewer` |

---

## Severity Levels

| Symbol | Level | Meaning |
|---|---|---|
| `❌ CRITICAL` | Must Fix | Security vulnerability or data loss risk |
| `❌ HIGH` | Must Fix | Logic error or likely production bug |
| `⚠️ MEDIUM` | Should Fix | Non-critical but risky pattern |
| `💬 LOW` | Advisory | Code smell or style concern |

---

## Audit Report Format

```
━━━ Audit: [filename or snippet title] ━━━━━━━━━

Active reviewers: logic · security · [others]

logic-reviewer:       ✅ No hallucinated APIs or impossible logic found
security-auditor:     ❌ REJECTED

Findings:
  ❌ CRITICAL — Line 8
     Type: SQL injection
     Code: `db.query(\`SELECT * WHERE id = ${id}\`)`
     Fix:  db.query('SELECT * WHERE id = $1', [id])

  ⚠️ MEDIUM — Line 22
     Type: Unguarded optional access
     Code: `user.profile.name`
     Fix:  `user?.profile?.name ?? 'Unknown'`

  💬 LOW — Line 34
     Type: Magic number
     Code: `setTimeout(fn, 3000)`
     Fix:  Extract to named constant: `const RETRY_DELAY_MS = 3000`

━━━ Summary ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1 CRITICAL issue blocking integration.
1 MEDIUM issue — review before shipping.
1 LOW advisory — consider addressing.

Verdict: REJECTED — fix CRITICAL issues before merging.
```

---

## Hallucination Guard

- Reviewers **read the actual code** — they don't assume what it does from function names
- Every finding includes the **exact line and exact code** — no vague claims
- Proposed fixes are **real, documented API calls** — not invented alternatives
- Severity ratings are **evidence-based** — "CRITICAL" is never used for style concerns

---

## Cross-Workflow Navigation

| If review reveals... | Go to |
|---|---|
| CRITICAL security issues | `/audit` to check if the pattern exists elsewhere |
| Code needs to be rewritten | `/generate` to regenerate with Tribunal protection |
| More reviewers needed | `/tribunal-full` for all 11 reviewers |
| Pattern found across many files | `/refactor` to fix the root abstraction |

---

## Usage

```
/review the auth middleware
/review this SQL query [paste]
/review src/routes/user.ts for injection risks
/review my React component for hooks violations
/review src/services/payment.ts focus: error handling and data exposure
```
