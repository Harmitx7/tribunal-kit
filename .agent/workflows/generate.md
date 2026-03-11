---
description: Generate code using the full Tribunal Anti-Hallucination pipeline. Maker generates at low temperature → selected reviewers audit in parallel → Human Gate for final approval.
---

# /generate — Hallucination-Free Code Generation

$ARGUMENTS

---

This command runs code generation through the full Tribunal pipeline. Code reaches you only after being reviewed by the appropriate specialist reviewers. **Nothing is written to disk without your explicit approval.**

---

## When to Use /generate vs Other Commands

| Use `/generate` when... | Use something else when... |
|---|---|
| You need new code written | Existing code needs to change → `/enhance` |
| A single focused piece of code is needed | Multi-domain build → `/swarm` or `/create` |
| You want a safety-audited code snippet | You need a full project structure → `/create` |
| You need a quick but safe implementation | You want to understand options first → `/plan` |

---

## Pipeline Flow

```
Your request
    │
    ▼
Context scan — existing files, schema, package.json read first
    │
    ▼
Maker generates at temperature 0.1
(grounded in real context — never inventing)
    │
    ▼
Auto-selected reviewers run in parallel
    │
    ▼
Human Gate — you see all verdicts and the diff
Only then: write to disk (Y) or discard (N) or revise (R)
```

---

## Who Reviews It

**Default (always active):**

```
logic-reviewer     → Hallucinated methods, impossible logic, undefined refs
security-auditor   → OWASP vulnerabilities, SQL injection, hardcoded secrets
```

**Auto-activated by keywords in your request:**

| Keyword in request | Additional Reviewers Activated |
|---|---|
| `api`, `route`, `endpoint` | `dependency-reviewer` + `type-safety-reviewer` |
| `sql`, `query`, `database`, `orm` | `sql-reviewer` |
| `component`, `hook`, `react`, `vue` | `frontend-reviewer` + `type-safety-reviewer` |
| `test`, `spec`, `coverage`, `jest`, `vitest` | `test-coverage-reviewer` |
| `slow`, `memory`, `optimize`, `cache` | `performance-reviewer` |
| `mobile`, `react native`, `flutter` | `mobile-reviewer` |
| `llm`, `openai`, `anthropic`, `gemini`, `ai`, `embedding` | `ai-code-reviewer` |
| `a11y`, `wcag`, `aria`, `accessibility` | `accessibility-reviewer` |
| `import`, `require`, `package` | `dependency-reviewer` |

> If unsure which reviewers to activate, use `/tribunal-full` for maximum coverage.

---

## What the Maker Is Not Allowed to Do

```
❌ Import a package not verified in the project's package.json
❌ Call a method it hasn't seen in official documentation
❌ Use `any` in TypeScript without a comment explaining why
❌ Generate an entire application in one shot
❌ Guess at a database column or table name
❌ Fabricate API response shapes — read existing types first
❌ Assume environment variables exist — reference .env.example or documented config
```

When unsure about any call: the Maker writes `// VERIFY: [reason]` instead of hallucinating.

---

## Reviewer Verdict Meanings

| Verdict | Meaning | What Happens |
|---|---|---|
| `✅ APPROVED` | No issues found | Code proceeds to Human Gate |
| `⚠️ WARNING` | Non-blocking issue | Human Gate shown with warning highlighted |
| `❌ REJECTED` | Blocking issue found | Code is revised, not shown to human |

**Retry limit:** Maker is revised up to **3 times** per rejection. After 3 failed attempts, the session halts and reports to the user with the full failure history.

---

## Output Format

```
━━━ Tribunal: [Domain] ━━━━━━━━━━━━━━━━━━

Active reviewers: logic · security · [others]

[Generated code with // VERIFY: tags where applicable]

━━━ Verdicts ━━━━━━━━━━━━━━━━━━━━━━━━━━━

logic-reviewer:           ✅ APPROVED
security-auditor:         ✅ APPROVED
dependency-reviewer:      ⚠️ WARNING — lodash not in package.json

━━━ Warnings ━━━━━━━━━━━━━━━━━━━━━━━━━━

dependency-reviewer:
  ⚠️ Medium — Line 3
     lodash is imported but not listed in package.json
     Fix: Run `npm install lodash` or use a built-in alternative

━━━ Human Gate ━━━━━━━━━━━━━━━━━━━━━━━━

Write to disk?  Y = approve | N = discard | R = revise with feedback
```

---

## Hallucination Guard (Expanded)

- **Context-first**: Maker reads `package.json`, `tsconfig.json`, and any referenced files before writing a single line
- **No phantom imports**: Every import is verified against the project's dependencies
- **No invented methods**: Only methods documented in the official library docs are used
- **`// VERIFY:` on all uncertainty**: Any call that cannot be verified from existing code or official docs gets a `// VERIFY:` comment
- **No complete app generation**: Large features are broken into reviewable modules, not dumped as a monolith
- **Secrets stay in env**: No hardcoded credentials, keys, or tokens — ever

---

## Cross-Workflow Navigation

| If the result of /generate shows... | Go to |
|---|---|
| Multiple files need changing | `/enhance` for impact-zone analysis |
| Security-critical code was touched | `/tribunal-full` for maximum coverage |
| New DB queries are generated | `/tribunal-database` |
| New API routes are generated | `/tribunal-backend` |
| Tests need to be written next | `/test` |

---

## Usage

```
/generate a JWT middleware for Express with algorithm enforcement
/generate a Prisma query for users with their posts included
/generate a debounced search hook in React
/generate a parameterized SQL query for fetching paginated orders
/generate a rate-limited fetch wrapper using p-limit
/generate a zod schema for email + password login input
```
