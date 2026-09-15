---
name: api-patterns
description: Use when API design mastery. REST, GraphQL, tRPC, and gRPC selection. Request/response design, pagination (cursor/offset), filtering, versioning, rate limiting, error formats (RFC 9457), authentication (JWT/OAuth2/API keys), idempotency, file uploads, webhooks, and OpenAPI documentation. Use when designing APIs, choosing protocols, or implementing API standards.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - api-security-auditor
  - backend-security-expert
  - schema-reviewer
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# API Patterns — Design & Protocol Mastery

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `api-patterns` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when API design mastery. REST, GraphQL, tRPC, and gRPC selection. Request/response design, pagination (cursor/offset), filtering, versioning, rate limiting, error formats (RFC 9457), authentication (JWT/OAuth2/API keys), idempotency, file uploads, webhooks, and OpenAPI documentation. Use when designing APIs, choosing protocols, or implementing API standards.
- **DO NOT activate when:** The task falls outside the `api-patterns` domain or is managed by a different dedicated specialist.

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

## Hallucination Traps (Read First)

- ❌ JWT in URL query params → ✅ `Authorization: Bearer` header only. Query params get logged in server access logs.
- ❌ Assuming JWT is encrypted → ✅ JWT is base64-encoded (NOT encrypted). Anyone can decode it. Never put secrets/PII in the payload.
- ❌ Offset pagination on large tables → ✅ `OFFSET 100000` scans and discards 100K rows. Use cursor pagination for tables > 10K rows.
- ❌ Verbs in REST URLs (`/api/getUsers`) → ✅ Nouns only (`GET /api/users`). HTTP method IS the verb.
- ❌ `POST` is idempotent → ✅ `POST` is NOT idempotent — requires `Idempotency-Key` header for safe retries.
- ❌ GraphQL has no security risks → ✅ Deeply nested queries are a DoS vector. Set max depth, query cost limits. Disable introspection in production.

---

## Protocol Selection Matrix

| Protocol      | Use When                                                                              |
| ------------- | ------------------------------------------------------------------------------------- |
| **REST**      | Public APIs, 3rd-party consumers, standard CRUD, HTTP caching                         |
| **GraphQL**   | Complex nested data, multiple clients, flexible queries, mobile bandwidth sensitivity |
| **tRPC**      | Full-stack TypeScript (Next.js monorepo), shared types, no codegen                    |
| **gRPC**      | Internal microservices, high-throughput, streaming, binary protocol                   |
| **WebSocket** | Bidirectional real-time (chat, gaming, live collaboration)                            |
| **SSE**       | Server-to-client streaming only (AI token streaming, live feeds)                      |

---

## REST Design

### URL Conventions

```
✅  GET    /api/v1/users              list users
✅  GET    /api/v1/users/123          get user by ID
✅  POST   /api/v1/users              create user
✅  PATCH  /api/v1/users/123          partial update
✅  DELETE /api/v1/users/123          delete user
✅  GET    /api/v1/users/123/posts    nested resource

❌  /api/getUsers   /api/createUser   /api/user (singular)   /api/Users (uppercase)
```

### HTTP Status Codes

```
200 OK             → GET / PUT / PATCH success
201 Created        → POST success (include Location: /api/v1/users/123 header)
204 No Content     → DELETE success
400 Bad Request    → Malformed request / missing fields
401 Unauthorized   → Missing or invalid authentication
403 Forbidden      → Authenticated but not authorized
404 Not Found      → Resource does not exist
409 Conflict       → Duplicate resource (email already exists)
422 Unprocessable  → Valid JSON, semantically invalid data
429 Too Many Req   → Rate limit exceeded
500 Internal       → Unhandled server error — NEVER expose stack traces
```

### Response Envelope

```typescript
interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

interface ApiError {
  error: {
    code: string; // machine-readable: "VALIDATION_ERROR"
    message: string; // human-readable: "Email is already in use"
    details?: Array<{ field: string; message: string }>; // field-level errors
    requestId?: string; // for support/tracing
  };
}
```

---

## Pagination

```typescript
// ✅ Cursor-based — required for large/dynamic datasets
// GET /api/v1/posts?cursor=eyJpZCI6MTAwfQ&limit=20
const posts = await db.post.findMany({
  where: { id: { lt: decodeCursor(req.query.cursor).id } },
  orderBy: { id: 'desc' },
  take: limit + 1, // fetch one extra to determine hasMore
});
const hasMore = posts.length > limit;
if (hasMore) posts.pop();
return { data: posts, meta: { hasMore, nextCursor: encodeCursor(posts.at(-1)) } };

// Offset-based — only for small datasets where users need page jumping
// GET /api/v1/posts?page=3&limit=20
// ❌ TRAP: OFFSET 100000 scans and discards 100K rows — degrades badly at scale
```

---

## Idempotency

```typescript
// POST /api/v1/payments with header: Idempotency-Key: <uuid>
app.post('/api/v1/payments', async (req, res) => {
  const key = req.headers['idempotency-key'];
  if (!key) return res.status(400).json({ error: 'Missing Idempotency-Key' });

  const cached = await redis.get(`idempotency:${key}`);
  if (cached) return res.status(200).json(JSON.parse(cached));

  const result = await processPayment(req.body);
  await redis.set(`idempotency:${key}`, JSON.stringify(result), 'EX', 86400);
  return res.status(201).json(result);
});
// GET, PUT, DELETE → naturally idempotent (safe to retry without a key)
// POST, PATCH      → NOT idempotent by default — require Idempotency-Key
```

---

## Webhooks

```typescript
// HMAC signature verification (always verify — never trust unsigned webhooks)
import { createHmac, timingSafeEqual } from 'node:crypto';
function verify(payload: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

app.post('/webhooks', (req, res) => {
  if (
    !verify(JSON.stringify(req.body), req.headers['x-webhook-signature'] as string, WEBHOOK_SECRET)
  )
    return res.status(401).send('Invalid signature');
  res.status(200).send('OK'); // respond immediately
  processWebhookAsync(req.body); // process asynchronously
});
// Retry policy: 3 retries with exponential backoff (1s → 10s → 100s)
// Include unique event ID in payload for receiver-side deduplication
```

---

## Versioning

```
URL path (recommended):  /api/v1/users      → simplest, most common, cache-friendly
Header:                  Accept: application/vnd.api.v1+json
Query param:             /api/users?version=1 → messy, avoid

Rules:
  - Start at v1, never v0
  - Breaking changes = new major version (v2)
  - Non-breaking additions (new optional fields) do NOT need a version bump
  - Deprecate before removing — give consumers 6+ months notice
```

---

## Rate Limiting

```
Strategy         How                          When
Token bucket   → Burst allowed, refills       Most APIs (recommended)
Sliding window → Smooth distribution          Strict fairness required
Fixed window   → Simple counter per period    Basic needs only

Response headers to always include:
  X-RateLimit-Limit        (max requests in window)
  X-RateLimit-Remaining    (requests left)
  X-RateLimit-Reset        (Unix timestamp when limit resets)
  Retry-After              (seconds to wait on 429)
```

---

## GraphQL Security

```
Protect against:
  Depth attacks    → Set max query depth (typically 7–10)
  Cost attacks     → Calculate query complexity score, reject > threshold
  Batch abuse      → Limit batch size / alias count
  Introspection    → Disable in production (exposes full schema to attackers)
```

---

## Authentication Selection

| Pattern                                         | Best For                               |
| ----------------------------------------------- | -------------------------------------- |
| **JWT** (short-lived access + httpOnly refresh) | Stateless services, microservices      |
| **Session**                                     | Traditional server-rendered apps       |
| **OAuth 2.0 / OIDC**                            | Third-party login, delegated access    |
| **API Key**                                     | Server-to-server, public API consumers |
| **Passkey (WebAuthn)**                          | Modern passwordless (2026+)            |

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

| Anti-Pattern                | What AI Commonly Does Wrong                                                  | What Is Actually Correct                                                  |
| :-------------------------- | :--------------------------------------------------------------------------- | :------------------------------------------------------------------------ |
| **Unchecked Payload Cast**  | Casting request bodies to TypeScript types without runtime schema validation | Parse request payloads through Zod/Pydantic schemas before business logic |
| **Silent Error Swallowing** | Catching errors with empty catch blocks or logging without rethrowing        | Propagate structured errors with status codes and contextual stack traces |
| **Unparameterized Query**   | Concatenating user inputs into SQL/Prisma query strings                      | Always use parameterized bindings or type-safe ORM query builders         |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `logic-reviewer` · `security-auditor` · `api-architect` · `resilience-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Are all inputs and boundary payloads validated against schemas (Zod/Pydantic)?
✅ Are SQL and database queries parameterized with zero string concatenation?
✅ Are error boundaries and timeout/retry policies explicitly declared?
✅ Are authentication checks performed before business logic execution?
✅ Did I verify that imported dependencies exist in package.json/requirements.txt?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
