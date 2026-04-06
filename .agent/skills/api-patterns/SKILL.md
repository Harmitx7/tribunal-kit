---
name: api-patterns
description: API design mastery. REST, GraphQL, tRPC, and gRPC selection. Request/response design, pagination (cursor/offset), filtering, versioning, rate limiting, error formats (RFC 9457), authentication (JWT/OAuth2/API keys), idempotency, file uploads, webhooks, and OpenAPI documentation. Use when designing APIs, choosing protocols, or implementing API standards.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 3.1.0
last-updated: 2026-04-06
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# API Patterns — Design & Protocol Mastery

---

## Protocol Selection

```
REST      → CRUD resources, public APIs, 3rd-party consumers, simplicity
GraphQL   → Complex nested data, mobile apps (bandwidth), multiple consumers
tRPC      → Full-stack TypeScript (Next.js + React), shared types, no codegen
gRPC      → Microservices, high throughput, streaming, binary protocol
WebSocket → Real-time bidirectional (chat, live updates, gaming)
SSE       → Server-to-client streaming (AI token streaming, live feeds)
```

---

## REST Patterns

### URL Design

```
✅ GOOD:
GET    /api/v1/users              → list users
GET    /api/v1/users/123          → get user 123
POST   /api/v1/users              → create user
PUT    /api/v1/users/123          → full update user 123
PATCH  /api/v1/users/123          → partial update user 123
DELETE /api/v1/users/123          → delete user 123

GET    /api/v1/users/123/posts    → list posts by user 123
POST   /api/v1/users/123/posts    → create post for user 123

❌ BAD:
GET    /api/getUsers              ← verb in URL
POST   /api/createUser            ← verb in URL
GET    /api/v1/user               ← singular (use plural)
DELETE /api/v1/users/123/delete   ← redundant verb
GET    /api/v1/Users              ← uppercase (use lowercase)
```

### Pagination (Cursor vs Offset)

```typescript
// ✅ Cursor-based (recommended for large/dynamic datasets)
// GET /api/v1/posts?cursor=eyJpZCI6MTAwfQ&limit=20
interface CursorPaginatedResponse<T> {
  data: T[];
  meta: {
    hasMore: boolean;
    nextCursor: string | null;  // opaque, base64-encoded
    prevCursor: string | null;
  };
}

// Server implementation:
const cursor = decodeCursor(req.query.cursor); // { id: 100 }
const posts = await db.post.findMany({
  where: { id: { lt: cursor.id } },
  orderBy: { id: "desc" },
  take: limit + 1, // fetch one extra to check hasMore
});
const hasMore = posts.length > limit;
if (hasMore) posts.pop();

// Offset-based (simpler, OK for small/static datasets)
// GET /api/v1/posts?page=3&limit=20
interface OffsetPaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

// ❌ HALLUCINATION TRAP: Offset pagination degrades on large tables
// OFFSET 100000 scans and discards 100,000 rows
// Use cursor pagination for tables with >10K rows
```

### Filtering & Sorting

```
GET /api/v1/products?status=active&category=electronics&price_min=10&price_max=100
GET /api/v1/products?sort=-created_at,name   (- prefix = descending)
GET /api/v1/products?fields=id,name,price     (sparse fieldsets)
GET /api/v1/products?search=wireless           (full-text search)
```

### Response Envelope

```typescript
// ✅ Consistent response shape
interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

interface ApiError {
  error: {
    code: string;       // machine-readable: "VALIDATION_ERROR"
    message: string;    // human-readable: "Email is invalid"
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
}

// ✅ HTTP status codes — use correctly
// 200 OK            → successful GET/PUT/PATCH
// 201 Created       → successful POST (include Location header)
// 204 No Content    → successful DELETE
// 400 Bad Request   → validation error
// 401 Unauthorized  → missing/invalid authentication
// 403 Forbidden     → authenticated but not authorized
// 404 Not Found     → resource doesn't exist
// 409 Conflict      → duplicate resource (e.g., email already exists)
// 422 Unprocessable → semantically invalid (valid JSON, invalid data)
// 429 Too Many Req  → rate limited
// 500 Internal      → unhandled server error (never send stack traces)
```

### Versioning

```
URL path:     /api/v1/users     ← simplest, most common, recommended
Header:       Accept: application/vnd.api.v1+json
Query param:  /api/users?version=1

Rules:
- v1 is the default — never start at v0
- Deprecate before removing — give consumers 6+ months
- Breaking changes = new version (v2)
- Non-breaking additions (new fields) don't require a version bump
```

### Idempotency

```typescript
// Idempotency key for safe retries on network failures
// POST /api/v1/payments
// Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000

app.post("/api/v1/payments", async (req, res) => {
  const idempotencyKey = req.headers["idempotency-key"];
  if (!idempotencyKey) return res.status(400).json({ error: "Missing Idempotency-Key" });

  // Check if this key was already processed
  const existing = await cache.get(`idempotency:${idempotencyKey}`);
  if (existing) return res.status(200).json(JSON.parse(existing));

  // Process payment
  const result = await processPayment(req.body);

  // Store result with TTL (24h)
  await cache.set(`idempotency:${idempotencyKey}`, JSON.stringify(result), "EX", 86400);

  return res.status(201).json(result);
});

// Which methods need idempotency?
// GET, PUT, DELETE → naturally idempotent (safe to retry)
// POST             → NOT idempotent (needs Idempotency-Key header)
// PATCH            → depends on implementation
```

---

## Authentication Patterns

```typescript
// JWT (stateless, scalable)
// Access token: short-lived (15 min)
// Refresh token: long-lived (7 days), stored in httpOnly cookie

// API Key (service-to-service)
// Authorization: Bearer sk_live_abc123
// Scoped to specific permissions

// OAuth 2.0 (delegated access)
// Authorization Code flow for web apps
// PKCE flow for SPAs and mobile

// ❌ HALLUCINATION TRAP: Never send JWT in URL query parameters
// ❌ GET /api/users?token=eyJ...  ← logged in server access logs
// ✅ Authorization: Bearer eyJ...  ← header only

// ❌ HALLUCINATION TRAP: JWT payload is NOT encrypted — it's base64 encoded
// Anyone can decode and read it. Never put secrets/PII in JWT payload.
```

---

## Webhooks

```typescript
// Webhook design (outbound)
interface WebhookPayload {
  id: string;            // unique event ID (for deduplication)
  type: string;          // "user.created", "payment.completed"
  created_at: string;    // ISO 8601
  data: Record<string, unknown>;
}

// Verification with HMAC signature
import { createHmac } from "node:crypto";

function signWebhook(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

// Receiver verification:
app.post("/webhooks", (req, res) => {
  const signature = req.headers["x-webhook-signature"];
  const expected = signWebhook(JSON.stringify(req.body), WEBHOOK_SECRET);

  if (signature !== expected) return res.status(401).send("Invalid signature");

  // Process webhook... return 200 quickly, process async
  res.status(200).send("OK");
  processWebhookAsync(req.body);
});

// Retry policy: 3 retries with exponential backoff (1s, 10s, 100s)
```

---

---

---

## API Style Selection (2025)

REST vs GraphQL vs tRPC - Hangi durumda hangisi?

### Decision Tree

```
Who are the API consumers?
│
├── Public API / Multiple platforms
│   └── REST + OpenAPI (widest compatibility)
│
├── Complex data needs / Multiple frontends
│   └── GraphQL (flexible queries)
│
├── TypeScript frontend + backend (monorepo)
│   └── tRPC (end-to-end type safety)
│
├── Real-time / Event-driven
│   └── WebSocket + AsyncAPI
│
└── Internal microservices
    └── gRPC (performance) or REST (simplicity)
```

### Comparison

|Factor|REST|GraphQL|tRPC|
|--------|------|---------|------|
|**Best for**|Public APIs|Complex apps|TS monorepos|
|**Learning curve**|Low|Medium|Low (if TS)|
|**Over/under fetching**|Common|Solved|Solved|
|**Type safety**|Manual (OpenAPI)|Schema-based|Automatic|
|**Caching**|HTTP native|Complex|Client-based|

### Selection Questions

1. Who are the API consumers?
2. Is the frontend TypeScript?
3. How complex are the data relationships?
4. Is caching critical?
5. Public or internal API?

---

## Authentication Patterns

Choose auth pattern based on use case.

### Selection Guide

|Pattern|Best For|
|---------|----------|
|**JWT**|Stateless, microservices|
|**Session**|Traditional web, simple|
|**OAuth 2.0**|Third-party integration|
|**API Keys**|Server-to-server, public APIs|
|**Passkey**|Modern passwordless (2025+)|

### JWT Principles

```
Important:
├── Always verify signature
├── Check expiration
├── Include minimal claims
├── Use short expiry + refresh tokens
└── Never store sensitive data in JWT
```

---

## API Documentation Principles

Good docs = happy developers = API adoption.

### OpenAPI/Swagger Essentials

```
Include:
├── All endpoints with examples
├── Request/response schemas
├── Authentication requirements
├── Error response formats
└── Rate limiting info
```

### Good Documentation Has

```
Essentials:
├── Quick start / Getting started
├── Authentication guide
├── Complete API reference
├── Error handling guide
├── Code examples (multiple languages)
└── Changelog
```

---

## GraphQL Principles

Flexible queries for complex, interconnected data.

### When to Use

```
✅ Good fit:
├── Complex, interconnected data
├── Multiple frontend platforms
├── Clients need flexible queries
├── Evolving data requirements
└── Reducing over-fetching matters

❌ Poor fit:
├── Simple CRUD operations
├── File upload heavy
├── HTTP caching important
└── Team unfamiliar with GraphQL
```

### Schema Design Principles

```
Principles:
├── Think in graphs, not endpoints
├── Design for evolvability (no versions)
├── Use connections for pagination
├── Be specific with types (not generic "data")
└── Handle nullability thoughtfully
```

### Security Considerations

```
Protect against:
├── Query depth attacks → Set max depth
├── Query complexity → Calculate cost
├── Batching abuse → Limit batch size
├── Introspection → Disable in production
```

---

## Rate Limiting Principles

Protect your API from abuse and overload.

### Why Rate Limit

```
Protect against:
├── Brute force attacks
├── Resource exhaustion
├── Cost overruns (if pay-per-use)
└── Unfair usage
```

### Strategy Selection

|Type|How|When|
|------|-----|------|
|**Token bucket**|Burst allowed, refills over time|Most APIs|
|**Sliding window**|Smooth distribution|Strict limits|
|**Fixed window**|Simple counters per window|Basic needs|

### Response Headers

```
Include in headers:
├── X-RateLimit-Limit (max requests)
├── X-RateLimit-Remaining (requests left)
├── X-RateLimit-Reset (when limit resets)
└── Return 429 when exceeded
```

---

## Response Format Principles

Consistency is key - choose a format and stick to it.

### Common Patterns

```
Choose one:
├── Envelope pattern ({ success, data, error })
├── Direct data (just return the resource)
└── HAL/JSON:API (hypermedia)
```

### Error Response

```
Include:
├── Error code (for programmatic handling)
├── User message (for display)
├── Details (for debugging, field-level errors)
├── Request ID (for support)
└── NOT internal details (security!)
```

### Pagination Types

|Type|Best For|Trade-offs|
|------|----------|------------|
|**Offset**|Simple, jumpable|Performance on large datasets|
|**Cursor**|Large datasets|Can't jump to page|
|**Keyset**|Performance critical|Requires sortable key|

#### Selection Questions

1. How large is the dataset?
2. Do users need to jump to specific pages?
3. Is data frequently changing?

---

## REST Principles

Resource-based API design - nouns not verbs.

### Resource Naming Rules

```
Principles:
├── Use NOUNS, not verbs (resources, not actions)
├── Use PLURAL forms (/users not /user)
├── Use lowercase with hyphens (/user-profiles)
├── Nest for relationships (/users/123/posts)
└── Keep shallow (max 3 levels deep)
```

### HTTP Method Selection

|Method|Purpose|Idempotent?|Body?|
|--------|---------|-------------|-------|
|**GET**|Read resource(s)|Yes|No|
|**POST**|Create new resource|No|Yes|
|**PUT**|Replace entire resource|Yes|Yes|
|**PATCH**|Partial update|No|Yes|
|**DELETE**|Remove resource|Yes|No|

### Status Code Selection

|Situation|Code|Why|
|-----------|------|-----|
|Success (read)|200|Standard success|
|Created|201|New resource created|
|No content|204|Success, nothing to return|
|Bad request|400|Malformed request|
|Unauthorized|401|Missing/invalid auth|
|Forbidden|403|Valid auth, no permission|
|Not found|404|Resource doesn't exist|
|Conflict|409|State conflict (duplicate)|
|Validation error|422|Valid syntax, invalid data|
|Rate limited|429|Too many requests|
|Server error|500|Our fault|

---

## API Security Testing

---

### OWASP API Security Top 10

|Vulnerability|Test Focus|
|---------------|------------|
|**API1: BOLA**|Access other users' resources|
|**API2: Broken Auth**|JWT, session, credentials|
|**API3: Property Auth**|Mass assignment, data exposure|
|**API4: Resource Consumption**|Rate limiting, DoS|
|**API5: Function Auth**|Admin endpoints, role bypass|
|**API6: Business Flow**|Logic abuse, automation|
|**API7: SSRF**|Internal network access|
|**API8: Misconfiguration**|Debug endpoints, CORS|
|**API9: Inventory**|Shadow APIs, old versions|
|**API10: Unsafe Consumption**|Third-party API trust|

---

### Authentication Testing

#### JWT Testing

|Check|What to Test|
|-------|--------------|
|Algorithm|None, algorithm confusion|
|Secret|Weak secrets, brute force|
|Claims|Expiration, issuer, audience|
|Signature|Manipulation, key injection|

#### Session Testing

|Check|What to Test|
|-------|--------------|
|Generation|Predictability|
|Storage|Client-side security|
|Expiration|Timeout enforcement|
|Invalidation|Logout effectiveness|

---

### Authorization Testing

|Test Type|Approach|
|-----------|----------|
|**Horizontal**|Access peer users' data|
|**Vertical**|Access higher privilege functions|
|**Context**|Access outside allowed scope|

#### BOLA/IDOR Testing

1. Identify resource IDs in requests
2. Capture request with user A's session
3. Replay with user B's session
4. Check for unauthorized access

---

### Input Validation Testing

|Injection Type|Test Focus|
|----------------|------------|
|SQL|Query manipulation|
|NoSQL|Document queries|
|Command|System commands|
|LDAP|Directory queries|

**Approach:** Test all parameters, try type coercion, test boundaries, check error messages.

---

### Rate Limiting Testing

|Aspect|Check|
|--------|-------|
|Existence|Is there any limit?|
|Bypass|Headers, IP rotation|
|Scope|Per-user, per-IP, global|

**Bypass techniques:** X-Forwarded-For, different HTTP methods, case variations, API versioning.

---

### GraphQL Security

|Test|Focus|
|------|-------|
|Introspection|Schema disclosure|
|Batching|Query DoS|
|Nesting|Depth-based DoS|
|Authorization|Field-level access|

---

### Security Testing Checklist

**Authentication:**
- [ ] Test for bypass
- [ ] Check credential strength
- [ ] Verify token security

**Authorization:**
- [ ] Test BOLA/IDOR
- [ ] Check privilege escalation
- [ ] Verify function access

**Input:**
- [ ] Test all parameters
- [ ] Check for injection

**Config:**
- [ ] Check CORS
- [ ] Verify headers
- [ ] Test error handling

---

**Remember:** APIs are the backbone of modern apps. Test them like attackers will.

---

## tRPC Principles

End-to-end type safety for TypeScript monorepos.

### When to Use

```
✅ Perfect fit:
├── TypeScript on both ends
├── Monorepo structure
├── Internal tools
├── Rapid development
└── Type safety critical

❌ Poor fit:
├── Non-TypeScript clients
├── Public API
├── Need REST conventions
└── Multiple language backends
```

### Key Benefits

```
Why tRPC:
├── Zero schema maintenance
├── End-to-end type inference
├── IDE autocomplete across stack
├── Instant API changes reflected
└── No code generation step
```

### Integration Patterns

```
Common setups:
├── Next.js + tRPC (most common)
├── Monorepo with shared types
├── Remix + tRPC
└── Any TS frontend + backend
```

---

## Versioning Strategies

Plan for API evolution from day one.

### Decision Factors

|Strategy|Implementation|Trade-offs|
|----------|---------------|------------|
|**URI**|/v1/users|Clear, easy caching|
|**Header**|Accept-Version: 1|Cleaner URLs, harder discovery|
|**Query**|?version=1|Easy to add, messy|
|**None**|Evolve carefully|Best for internal, risky for public|

### Versioning Philosophy

```
Consider:
├── Public API? → Version in URI
├── Internal only? → May not need versioning
├── GraphQL? → Typically no versions (evolve schema)
├── tRPC? → Types enforce compatibility
```
