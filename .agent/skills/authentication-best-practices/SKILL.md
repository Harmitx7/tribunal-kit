---
name: authentication-best-practices
description: Use when Authentication and Authorization mastery. Best practices for OAuth2, OpenID Connect, JWT (JSON Web Tokens), session management, password hashing, MFA (Multi-Factor Authentication), RBAC/ABAC, SSO, and secure credential storage. Use when auditing or implementing login flows, identity systems, or access control.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - backend-security-expert
  - api-security-auditor
  - vulnerability-scanner
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Authentication & Authorization — Identity Mastery

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `authentication-best-practices` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Authentication and Authorization mastery. Best practices for OAuth2, OpenID Connect, JWT (JSON Web Tokens), session management, password hashing, MFA (Multi-Factor Authentication), RBAC/ABAC, SSO, and secure credential storage. Use when auditing or implementing login flows, identity systems, or access control.
- **DO NOT activate when:** The task falls outside the `authentication-best-practices` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass       | Phase            | Core Action                                                                                  |
| :--------- | :--------------- | :------------------------------------------------------------------------------------------- |
| **Pass 1** | **Understand**   | Deconstruct the user's explicit objective, implicit requirements, and platform constraints.  |
| **Pass 2** | **Plan**         | Decompose the task into smallest logical steps; map dependencies and required tool calls.    |
| **Pass 3** | **Execute**      | Implement the solution with production-grade craft, zero placeholders, and strict typing.    |
| **Pass 4** | **Verify**       | Run linters, unit tests, or compiler checks to validate structural correctness.              |
| **Pass 5** | **Attack**       | Perform an adversarial review searching for edge-case failures, race conditions, and traps.  |
| **Pass 6** | **Improve**      | Eliminate discovered friction, optimize performance, and harden error boundaries.            |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

## Passwords & Hashing

```typescript
// ❌ BAD: md5, sha1, sha256 (too fast, vulnerable to brute force/rainbow tables)
const hash = crypto.createHash('sha256').update(password).digest('hex');

// ✅ GOOD: Argon2 (memory-hard, ASIC resistant) or bcrypt
import * as argon2 from 'argon2';

async function hashPassword(password: string): Promise<string> {
  // Argon2 hashes include the salt inherently in the resulting string
  return await argon2.hash(password, {
    type: argon2.argon2id, // recommended variant
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3, // iterations
    parallelism: 1, // threads
  });
}

async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return await argon2.verify(hash, password);
}
```

### Password Policies

- **Length over complexity**: Require minimum 12 characters. Stop requiring arbitrary symbols (e.g., `!@#`).
- **Check against breaches**: Use HaveIBeenPwned API or similar to reject compromised passwords during signup.
- **Never expire passwords arbitrarily**: Only force resets if there is evidence of a breach.

---

## Session Management vs. JWT

### 1. Stateful Sessions (Cookies)

**Best for**: Monolithic web apps, SSR apps (Next.js, Remix).

- Server stores session ID mapped to user data in Redis/DB.
- Client stores session ID in an `HttpOnly`, `Secure`, `SameSite=Lax/Strict` cookie.
- **Pros**: Immediate revocation, server-side truth, invisible to XSS.
- **Cons**: Requires DB lookup per request.

### 2. Stateless JWT (JSON Web Tokens)

**Best for**: Distributed APIs, Microservices, Native mobile apps.

- Server signs a token containing user claims.
- Client passes it in `Authorization: Bearer <token>` header.
- **Pros**: No DB lookup needed, easy cross-origin sharing.
- **Cons**: Cannot be easily revoked before expiration.

### The JWT "Refresh Token" Pattern

```typescript
// Scenario: API authentication
// 1. Access Token (Short-lived: 15 mins)
const accessToken = jwt.sign({ userId: user.id }, JWT_SECRET, {
  expiresIn: '15m',
  algorithm: 'HS256', // ALWAYS explicitly specify
});
// 2. Refresh Token (Long-lived: 7 days, opaque string in DB)
const refreshToken = crypto.randomBytes(40).toString('hex');
await db.refreshTokens.create({ token: refreshToken, userId: user.id, expires: addDays(7) });

// Client flow:
// - Access token kept in memory (JS variable) to prevent XSS theft.
// - Refresh token kept in HttpOnly cookie.
// - When Access Token expires, endpoint reads cookie, validates DB, issues new Access Token.
```

---

## OAuth2 & OIDC (OpenID Connect)

```
Roles:
1. Resource Owner (User)
2. Client (Your App)
3. Authorization Server (Google/GitHub/Auth0)
4. Resource Server (API)

Flow (Authorization Code + PKCE):
1. User clicks "Login with Google".
2. App generates `code_verifier` and `code_challenge`.
3. App redirects user to Google with `code_challenge`.
4. User logs in, Google redirects back to App with an authorization `code`.
5. App sends `code` + `code_verifier` to Google backend.
6. Google returns `id_token` (OIDC identity) and `access_token` (OAuth permissions).

// ❌ HALLUCINATION TRAP: Implicit Flow is deprecated.
// Never use Implicit Flow (response_type=token) where the token is returned in the URL hash.
// Always use Authorization Code Flow with PKCE, even for Single Page Apps (SPAs).
```

---

## Multi-Factor Authentication (MFA)

- **SMS**: Deprecated by NIST due to SIM swapping vulnerabilities. (Better than nothing, but avoid as primary MFA).
- **TOTP (Authenticator Apps)**: Standard implementations use HMAC-SHA1. Keep the secret key heavily encrypted at rest.
- **WebAuthn / Passkeys**: The modern gold standard. Replaces passwords entirely using hardware enclaves (FaceID, TouchID, YubiKey).

---

## Authorization Models

### RBAC (Role-Based Access Control)

- Users have Roles (`admin`, `editor`, `viewer`).
- Roles have Permissions (`create:post`, `delete:user`).

```typescript
// ✅ Check permissions, not roles directly (more flexible)
if (!user.permissions.includes('delete:user')) {
  throw new ForbiddenError();
}
```

### ABAC (Attribute-Based Access Control)

- Access based on context (e.g., "User can edit Document if Document.department == User.department").

```typescript
// Example Policy
function canEditPost(user: User, post: Post): boolean {
  if (user.role === 'admin') return true;
  if (post.authorId === user.id) return true;
  if (post.status === 'draft' && user.department === 'content') return true;
  return false;
}
```

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario                               | Risk                                                 | Mitigation Strategy                                                             |
| :------------------------------------- | :--------------------------------------------------- | :------------------------------------------------------------------------------ |
| **Empty or Null Inputs**               | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers   |
| **Network Timeout / Latency**          | Hanging operations or duplicate side-effects         | Implement bounded abort controllers, exponential backoff, and idempotency keys  |
| **Concurrency / Race Conditions**      | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls          |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection      | Validate boundary payloads with Zod/Pydantic schemas prior to execution         |
| **Resource / Memory Saturation**       | OOM errors, frame drops, or memory leaks             | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern                       | What AI Commonly Does Wrong                                               | What Is Actually Correct                                                 |
| :--------------------------------- | :------------------------------------------------------------------------ | :----------------------------------------------------------------------- |
| **Hallucinated Tool Capabilities** | Assuming an external library or CLI command exists without verification   | Run a verification check or verify package.json before referencing tools |
| **Premature Completion Claim**     | Declaring a task finished because code was generated without verification | Execute tests, linters, or terminal commands to provide concrete proof   |
| **Context Bloat Dumping**          | Pasting entire multi-thousand-line files into prompt context              | Extract targeted excerpts, symbols, and signatures to preserve tokens    |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `orchestrator` · `agent-organizer` · `logic-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Did I deconstruct the root objective before proposing architecture?
✅ Did I identify dependencies, bottlenecks, and parallelizable sub-tasks?
✅ Did I avoid over-engineering and select the simplest effective pattern?
✅ Did I verify assumptions with concrete file reads instead of speculation?
✅ Did I establish measurable verification criteria before completion?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
