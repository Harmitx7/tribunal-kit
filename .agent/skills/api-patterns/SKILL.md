---
name: api-patterns
description: API design mastery. REST, GraphQL, tRPC, and gRPC selection. Request/response design, pagination (cursor/offset), filtering, versioning, rate limiting, error formats (RFC 9457), authentication (JWT/OAuth2/API keys), idempotency, file uploads, webhooks, and OpenAPI documentation. Use when designing APIs, choosing protocols, or implementing API standards.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-01
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# API Patterns — Design & Protocol Mastery

> An API is a contract. Breaking changes break trust.
> Every endpoint validates input. Every response has a consistent shape. Every error has a machine-readable code.

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

## Output Format

```
━━━ API Design Report ━━━━━━━━━━━━━━━━━━━━━━━━
Skill:       API Patterns
Protocol:    [REST/GraphQL/tRPC/gRPC]
Scope:       [N endpoints · N resources]
─────────────────────────────────────────────────
VBC status:  PENDING → VERIFIED
```

---

## 🤖 LLM-Specific Traps

1. **Verbs in URLs:** REST URLs are nouns. Never `/api/getUsers` or `/api/deleteUser/123`.
2. **Singular Resource Names:** Use plural: `/users`, `/posts`, `/orders`. Not `/user`, `/post`.
3. **200 for Everything:** Use correct status codes. 201 for creation, 204 for deletion, 4xx for client errors.
4. **Offset Pagination on Large Tables:** OFFSET degrades linearly. Use cursor pagination for >10K rows.
5. **JWT in Query Params:** JWTs must be in `Authorization` header, never URL query strings.
6. **Secrets in JWT Payload:** JWT is base64, not encrypted. Never put passwords or PII in claims.
7. **Missing Idempotency on POST:** POST is not idempotent. Payment/order endpoints need `Idempotency-Key`.
8. **Inconsistent Error Shapes:** Every error must have the same `{ error: { code, message } }` structure.
9. **Breaking Changes Without Versioning:** Adding required fields or removing fields = breaking change = new version.
10. **Webhooks Without Signatures:** Always sign webhook payloads with HMAC. Receivers must verify signatures.

---

## 🏛️ Tribunal Integration

**Slash command: `/tribunal-backend`**

### ✅ Pre-Flight Self-Audit

```
✅ Are URLs plural nouns with no verbs?
✅ Am I using correct HTTP status codes (not 200 for everything)?
✅ Is pagination cursor-based for large datasets?
✅ Are error responses in a consistent envelope format?
✅ Is authentication via headers (not query params)?
✅ Are POST endpoints idempotent (with Idempotency-Key)?
✅ Am I versioning the API (v1, v2)?
✅ Are webhooks signed with HMAC?
✅ Is all input validated before processing?
✅ Did I add rate limiting to public endpoints?
```
