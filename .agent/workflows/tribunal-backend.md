---
description: Backend-specific Tribunal. Runs Logic + Security + Dependency + Types. Use for API routes, server logic, and auth code.
---

# /tribunal-backend — Server-Side Audit

$ARGUMENTS

---

Focused audit for backend and API code. Paste server-side code and these four reviewers analyze it simultaneously.

---

## Active Reviewers

```
logic-reviewer          → Invented stdlib methods, impossible conditional branches
security-auditor        → Auth bypass, SQL injection, secrets in code, rate limiting gaps
dependency-reviewer     → Any import not found in your package.json
type-safety-reviewer    → Implicit any, unguarded optional access, missing return types
```

---

## What Gets Flagged

| Reviewer | Common Backend Catches |
|---|---|
| logic | Calling `req.user` after a check that could pass with null |
| security | `jwt.verify()` without `algorithms` option — allows `alg:none` attack |
| dependency | `import { z } from 'zod'` but zod not in package.json |
| type-safety | `async function handler(req, res)` — no types on req or res |

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
  ❌ Critical — Line 44
     JWT algorithm not enforced: jwt.verify(token, secret)
     Fix: jwt.verify(token, secret, { algorithms: ['HS256'] })

type-safety-reviewer:
  ⚠️ Medium — Line 10
     Request body typed as any — add Zod schema parse at boundary

━━━ Verdict: NEEDS FIXES ━━━━━━━━━━━━━━━━
```

---

## Usage

```
/tribunal-backend [paste API route code]
/tribunal-backend [paste auth middleware]
/tribunal-backend src/routes/user.ts
```
