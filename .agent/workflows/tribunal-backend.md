---
description: Backend-specific Tribunal. Runs Logic + Security + Dependency + Type Safety reviewers. Use for API routes, server logic, auth code, middleware, Server Actions, and any server-side business logic.
---

# /tribunal-backend — Backend Code Audit

$ARGUMENTS

---

## When to Use /tribunal-backend

|Use `/tribunal-backend` when...|Use something else when...|
|:---|:---|
|Reviewing API routes or middleware|Frontend components → `/tribunal-frontend`|
|Auth, JWT, session code|Database queries only → `/tribunal-database`|
|Server Actions|Mobile code → `/tribunal-mobile`|
|Input validation and Zod schemas|Maximum coverage → `/tribunal-full`|
|Third-party API integrations||

---

## 4 Active Reviewers (All Run Simultaneously)

### logic-reviewer
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

---

## Verdict System

```
If ANY reviewer → ❌ REJECTED: code must be fixed before Human Gate
If any reviewer → ⚠️ WARNING:  proceed with flagged items noted
If all reviewers → ✅ APPROVED: present to Human Gate
```

---

---

## Backend-Specific Hallucination Traps (Common LLM Mistakes)

```typescript
// ❌ express.Router() methods that don't exist
router.middleware(() => {});          // not a method — use app.use()
router.beforeAll(() => {});           // not a method — use router.use()

// ❌ Hono methods that don't exist
app.middleware('/path', handler);      // not valid — use app.use('/path', handler)

// ❌ next-auth v4 patterns in v5 projects
import { getServerSession } from 'next-auth'; // v4 — use auth() from './auth' in v5

// ❌ jwt.verify async form (it's synchronous)
const payload = await jwt.verify(token, secret); // jwt.verify is NOT async
const payload = jwt.verify(token, secret);        // Correct
```

---

## Usage Examples

```
/tribunal-backend the POST /api/auth/login route with JWT issuance
/tribunal-backend the createOrder Server Action with Stripe integration
/tribunal-backend the auth middleware that verifies session on protected routes
/tribunal-backend the webhook handler for Stripe payment events
```
