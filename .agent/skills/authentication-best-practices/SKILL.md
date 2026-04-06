---
name: authentication-best-practices
description: Authentication and Authorization mastery. Best practices for OAuth2, OpenID Connect, JWT (JSON Web Tokens), session management, password hashing, MFA (Multi-Factor Authentication), RBAC/ABAC, SSO, and secure credential storage. Use when auditing or implementing login flows, identity systems, or access control.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Authentication & Authorization — Identity Mastery

---

## Passwords & Hashing

```typescript
// ❌ BAD: md5, sha1, sha256 (too fast, vulnerable to brute force/rainbow tables)
const hash = crypto.createHash('sha256').update(password).digest('hex');

// ✅ GOOD: Argon2 (memory-hard, ASIC resistant) or bcrypt
import * as argon2 from "argon2";

async function hashPassword(password: string): Promise<string> {
  // Argon2 hashes include the salt inherently in the resulting string
  return await argon2.hash(password, {
    type: argon2.argon2id, // recommended variant
    memoryCost: 2 ** 16,   // 64 MB
    timeCost: 3,           // iterations
    parallelism: 1,        // threads
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
  expiresIn: "15m",
  algorithm: "HS256" // ALWAYS explicitly specify
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
if (!user.permissions.includes("delete:user")) {
  throw new ForbiddenError();
}
```

### ABAC (Attribute-Based Access Control)
- Access based on context (e.g., "User can edit Document if Document.department == User.department").

```typescript
// Example Policy
function canEditPost(user: User, post: Post): boolean {
  if (user.role === "admin") return true;
  if (post.authorId === user.id) return true;
  if (post.status === "draft" && user.department === "content") return true;
  return false;
}
```

---
