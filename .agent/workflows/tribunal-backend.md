---
description: Backend-specific Tribunal. Runs Logic + Security + Dependency + Type Safety + Resilience + Schema reviewers. Use for API routes, server logic, auth code, middleware, Server Actions, and any server-side business logic.
tools: Read, Grep, Glob, Bash, Edit, Write
version: 3.0.0
last-updated: 2026-07-30
required-skills:
  - backend-security-expert
  - nodejs-best-practices
  - api-patterns
scripts-binding:
  - .agent/scripts/security_scan.js
  - .agent/scripts/dependency_analyzer.js
  - .agent/scripts/schema_validator.js
---

# /tribunal-backend — Backend Code Audit

$ARGUMENTS

---

## Mandatory Pre-Flight Context Inspection

Before auditing backend routes or server logic, you MUST inspect:
1. Target Backend Source & Contracts → Read target route handlers, Server Actions, or controller methods
2. Dependencies & Environment (`package.json`, `.env.example`) → Check backend framework versions, secret key placeholders, and ORM schemas
3. 6-Reviewer Parallel Gate → Execute logic-reviewer, security-auditor, dependency-analyzer, type-safety, resilience-reviewer, and schema-reviewer before approving diffs

---

## When to Use /tribunal-backend

| Use `/tribunal-backend` when...    | Use something else when...                   |
| :--------------------------------- | :------------------------------------------- |
| Reviewing API routes or middleware | Frontend components → `/tribunal-frontend`   |
| Auth, JWT, session code            | Database queries only → `/tribunal-database` |
| Server Actions                     | Mobile code → `/tribunal-mobile`             |
| Input validation and Zod schemas   | Maximum coverage → `/tribunal-full`          |
| Third-party API integrations       |                                              |

---

## 6 Active Reviewers (All Run Simultaneously)

### precedence-reviewer → Checks local repo Case Law for past rejections

logic-reviewer

- Hallucinated Express/Hono/Fastify methods
- Missing awaits on async operations
- Unreachable code after return statements
- Race conditions in sequential state mutations

### security-auditor

- SQL injection via string interpolation
- JWT verify missing `{ algorithms: ['HS256'] }` option
- Auth check after business logic (wrong order)
- IDOR — resource ownership not verified against session
- SSRF — user-controlled URLs passed to fetch()
- Hardcoded secrets / missing env var existence checks
- CORS wildcard (`*`) in production

### dependency-reviewer

- Packages not in package.json
- npm package names matching typosquatting patterns
- Major version incompatibilities
- Known CVEs in used packages

### type-safety-reviewer

- `any` types in request handlers
- Missing Zod validation before DB access
- Unsafe type assertions (`as User` without runtime check)
- Return type mismatches

### schema-reviewer

- Missing input validation on req.body/req.query
- Validation applied client-side only
- Loosely defined Zod/Pydantic schemas

### resilience-reviewer

- Swallowed errors (empty catch blocks)
- Missing timeouts on network fetches
- Unhandled Promise rejections
- Missing retries for temporal network failures

---

## Verdict System

```
If ANY reviewer → ❌ REJECTED: code must be fixed before Human Gate
If any reviewer → ⚠️ WARNING:  proceed with flagged items noted
If all reviewers → ✅ APPROVED: present to Human Gate
```

---

## Backend-Specific Hallucination Traps (Common LLM Mistakes)

```typescript
// ❌ express.Router() methods that don't exist
router.middleware(() => {}); // not a method — use app.use()
router.beforeAll(() => {}); // not a method — use router.use()

// ❌ Hono methods that don't exist
app.middleware("/path", handler); // not valid — use app.use('/path', handler)

// ❌ next-auth v4 patterns in v5 projects
import { getServerSession } from "next-auth"; // v4 — use auth() from './auth' in v5

// ❌ jwt.verify async form (it's synchronous)
const payload = await jwt.verify(token, secret); // jwt.verify is NOT async
const payload = jwt.verify(token, secret); // Correct
```

---

## Usage Examples

```
/tribunal-backend the POST /api/auth/login route with JWT issuance
/tribunal-backend the createOrder Server Action with Stripe integration
/tribunal-backend the auth middleware that verifies session on protected routes
/tribunal-backend the webhook handler for Stripe payment events
```

---

## After /tribunal-backend — Next Steps

| Outcome                      | Next Command                                      |
| :--------------------------- | :------------------------------------------------ |
| All checks pass              | → `/deploy` or merge code                         |
| Reviewers reject with fixes  | → Apply fixes, then run `/tribunal-backend` again |
| Performance concerns raised  | → `/tribunal-performance` for deep profiling      |
| Need test coverage for logic | → `/test` to generate backend tests               |

---
