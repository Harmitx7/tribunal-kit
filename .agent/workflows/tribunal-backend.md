---
description: Backend-specific Tribunal. Runs Logic + Security + Dependency + Types. Use for API routes, server logic, and auth code.
---

# /tribunal-backend — Server-Side Audit

$ARGUMENTS

---

Focused audit for backend and API code. Paste server-side code and these four reviewers analyze it simultaneously.

---

## When to Use This vs Other Tribunals

| Code type | Right tribunal |
|---|---|
| API routes, auth, middleware | `/tribunal-backend` ← you are here |
| React components, hooks | `/tribunal-frontend` |
| SQL queries, ORM, migrations | `/tribunal-database` |
| Mobile-specific code | `/tribunal-mobile` |
| Unknown domain or cross-domain | `/tribunal-full` |

---

## Active Reviewers

```
logic-reviewer          → Invented stdlib methods, impossible conditional branches,
                          calling .user on a req that wasn't authenticated
security-auditor        → Auth bypass, SQL injection, secrets in code, rate limiting gaps,
                          JWT algorithm enforcement, CORS misconfiguration
dependency-reviewer     → Any import not found in your package.json
type-safety-reviewer    → Implicit any, unguarded optional access, missing return types,
                          unsafe casts
```

---

## What Gets Flagged — Real Examples

| Reviewer | Example Finding |
|---|---|
| logic | `req.user.id` used after a guard that can pass with null user |
| security | `jwt.verify(token, secret)` — no `algorithms` option → allows `alg:none` attack |
| security | `app.use(cors())` with no origin restriction in production |
| security | `rate-limiter` missing on auth endpoints |
| dependency | `import { z } from 'zod'` but `zod` not in `package.json` |
| type-safety | `async function handler(req, res)` — untyped `req` and `res` |
| type-safety | `const user = await db.findUser(id)` — result typed as `any` |

---

## Report Format

```
━━━ Backend Audit ━━━━━━━━━━━━━━━━━━━━━━━

  logic-reviewer:        ✅ APPROVED
  security-auditor:      ❌ REJECTED
  dependency-reviewer:   ✅ APPROVED
  type-safety-reviewer:  ⚠️  WARNING

━━━ Issues ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

security-auditor:
  ❌ CRITICAL — Line 44
     JWT algorithm not enforced: jwt.verify(token, secret)
     Fix: jwt.verify(token, secret, { algorithms: ['HS256'] })

  ❌ HIGH — Line 12
     CORS open: app.use(cors()) — allows any origin
     Fix: app.use(cors({ origin: process.env.ALLOWED_ORIGIN }))

type-safety-reviewer:
  ⚠️ MEDIUM — Line 10
     Request body typed as any — use Zod schema parse at the API boundary
     Fix: const body = schema.parse(req.body)

━━━ Verdict: REJECTED — fix before merging ━━━━━━
```

---

## Hallucination Guard

- Logic findings must cite the **exact line and condition** that creates the problem
- Security findings must name the **attack class** (not just "this is unsafe")
- No invented framework methods — only documented Express/Fastify/Hono/etc. APIs

---

## Cross-Workflow Navigation

| Finding type | Next step |
|---|---|
| Security CRITICAL | `/audit` to scan the whole project |
| All approved | Human Gate to write to disk |
| SQL queries also present | Add `/tribunal-database` for those specifically |

---

## Usage

```
/tribunal-backend [paste API route code]
/tribunal-backend [paste auth middleware]
/tribunal-backend src/routes/user.ts
/tribunal-backend the JWT verification middleware
```
