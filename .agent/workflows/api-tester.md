---
description: Automated multi-stage API endpoint testing. Generates and runs auth-aware request sequences.
---

# /api-tester — Automated API Test Flows

$ARGUMENTS

---

This command generates and runs multi-stage API test sequences. It goes beyond single-endpoint testing by simulating realistic user sessions with chained requests, variable capture, and assertion verification.

---

## When to Use This vs Other Commands

| Use `/api-tester` when... | Use something else when... |
|---|---|
| Testing multi-step flows (auth + resource lifecycle) | Unit tests → `/test` |
| Verifying endpoint contracts before deploy | Logic review → `/review` |
| Debugging a specific flow returning wrong data | Root cause → `/debug` |
| Security testing for injection/rate limits | Full security audit → `/audit` |

---

## When to Use

- After creating or modifying API routes.
- Before deployment to validate endpoint contracts.
- When debugging a multi-step flow (e.g., Register → Login → Create Resource → Verify).
- When the user says "test api", "endpoint test", or "api flow".

---

## Pipeline Flow

```
Your request (endpoint or flow description)
    │
    ▼
Context read — route files, middleware, schema, auth config, package.json
    │
    ▼
Route discovery — scan for all registered endpoints and methods
    │
    ▼
Test Plan generated (sequence of requests with dependencies & captures)
    │
    ▼
Environment check — server running? Base URL resolved? Auth available?
    │
    ▼
Execution — each step runs, captures response, feeds next step
    │
    ▼
Report — pass/fail per step, response times, payload diffs, coverage map
```

---

## Step 1: Route Discovery

Before generating tests, scan the codebase for route definitions:

| Framework | Scan Pattern | What to Extract |
|---|---|---|
| Express | `app.get/post/put/delete/patch` or `router.*` | Method, path, middleware |
| Fastify | `fastify.route` or `fastify.get/post/...` | Method, path, schema |
| Next.js API | `app/api/**/route.ts` | Exported functions (GET, POST) |
| Django/DRF | `urlpatterns`, `@api_view` | Method, path, viewset |
| FastAPI | `@app.get/post/put/delete` | Method, path, response model |
| Go (Chi/Gin) | `r.Get/Post/Put/Delete` | Method, path, handler |

**Output a route map before generating tests:**
```
━━━ Route Map ━━━━━━━━━━━━━━━━━━━━━━━━━━
GET    /api/users          → UserController.list    [auth: required]
POST   /api/users          → UserController.create  [auth: admin]
GET    /api/users/:id      → UserController.get     [auth: required]
PUT    /api/users/:id      → UserController.update  [auth: owner]
DELETE /api/users/:id      → UserController.delete  [auth: admin]
POST   /api/auth/login     → AuthController.login   [auth: none]
POST   /api/auth/register  → AuthController.register [auth: none]
```

---

## Step 2: Test Pattern Selection

### Pattern 1: CRUD Lifecycle
Full create-read-update-read-delete-verify cycle:
```
Step 1: POST   /api/resource        → Create (capture: response.id → $RESOURCE_ID)
Step 2: GET    /api/resource/$RESOURCE_ID  → Read (assert: 200, body matches creation)
Step 3: PUT    /api/resource/$RESOURCE_ID  → Update (send modified fields)
Step 4: GET    /api/resource/$RESOURCE_ID  → Read (assert: updated fields match)
Step 5: DELETE /api/resource/$RESOURCE_ID  → Delete (assert: 204 or 200)
Step 6: GET    /api/resource/$RESOURCE_ID  → Read (assert: 404)
```

### Pattern 2: Auth Flow
Full authentication lifecycle:
```
Step 1: POST   /api/auth/register   → Register (capture: $TOKEN)
Step 2: POST   /api/auth/login      → Login (capture: $JWT, $REFRESH_TOKEN)
Step 3: GET    /api/protected       → With JWT header (assert: 200)
Step 4: GET    /api/protected       → Without JWT (assert: 401)
Step 5: POST   /api/auth/refresh    → With $REFRESH_TOKEN (capture: $NEW_JWT)
Step 6: GET    /api/protected       → With $NEW_JWT (assert: 200)
Step 7: POST   /api/auth/logout     → Invalidate session
Step 8: GET    /api/protected       → With invalidated JWT (assert: 401)
```

### Pattern 3: Edge Cases & Error Handling
```
Step 1: POST   /api/resource        → Missing required fields (assert: 400 + error message)
Step 2: POST   /api/resource        → Invalid field types (assert: 400 + validation detail)
Step 3: POST   /api/resource        → Duplicate unique field (assert: 409)
Step 4: GET    /api/resource/99999  → Non-existent ID (assert: 404)
Step 5: PUT    /api/resource/:id    → Unauthorized user (assert: 403)
Step 6: DELETE /api/resource/:id    → Without auth (assert: 401)
Step 7: GET    /api/resource?page=-1 → Invalid pagination (assert: 400)
Step 8: POST   /api/resource        → Payload too large (assert: 413 or 400)
```

### Pattern 4: Pagination & Filtering
```
Step 1: POST   /api/resource  → Create 5 records (loop)
Step 2: GET    /api/resource?page=1&limit=2   → (assert: 2 items, hasMore: true)
Step 3: GET    /api/resource?page=2&limit=2   → (assert: 2 items, hasMore: true)
Step 4: GET    /api/resource?page=3&limit=2   → (assert: 1 item, hasMore: false)
Step 5: GET    /api/resource?sort=createdAt&order=desc → (assert: items in descending order)
Step 6: GET    /api/resource?filter=name:test  → (assert: only matching items returned)
```

### Pattern 5: Rate Limiting & Security
```
Step 1: POST   /api/auth/login × 10  → Rapid-fire login attempts
Step 2: POST   /api/auth/login        → (assert: 429 Too Many Requests or similar)
Step 3: Wait   [cooldown period]
Step 4: POST   /api/auth/login        → (assert: allowed again)
Step 5: POST   /api/resource           → With SQL injection in body (assert: 400, no SQL error exposed)
Step 6: GET    /api/resource?id=1 OR 1=1 → (assert: 400 or filtered, no data leak)
```

---

## Step 3: Variable Capture & Chaining

Tests are chained via captured variables:

```
$VAR_NAME = response.body.fieldPath

Examples:
$USER_ID     = response.body.data.id
$JWT         = response.body.token
$CSRF_TOKEN  = response.headers['x-csrf-token']
$TOTAL_COUNT = response.body.meta.total
```

Variables are passed forward:
- **Headers**: `Authorization: Bearer $JWT`
- **URL params**: `/api/users/$USER_ID`
- **Body fields**: `{ "userId": "$USER_ID" }`

---

## Step 4: Assertion Engine

Each step can assert on:

| Assertion Type | Example | Description |
|---|---|---|
| Status code | `assert: 200` | HTTP status |
| Body field exists | `assert: body.id exists` | Field presence |
| Body field value | `assert: body.name === "test"` | Exact match |
| Body field type | `assert: body.items is Array` | Type check |
| Header present | `assert: headers.content-type contains "json"` | Header check |
| Response time | `assert: time < 500ms` | Performance gate |
| Array length | `assert: body.items.length === 3` | Count check |
| Negative match | `assert: body.password === undefined` | Field NOT present |

---

## Output Format

```
━━━ API Test Report ━━━━━━━━━━━━━━━━━━━━━━

Flow:    [Name of the flow tested]
Base:    [base URL]
Steps:   6 total | 5 passed | 1 failed
Time:    1.2s total

━━━ Execution ━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: POST /api/auth/login           ✅ 200  (142ms)
        ↳ Captured: $JWT
Step 2: GET  /api/users/me              ✅ 200  (89ms)
        ↳ Asserted: body.email === "test@example.com"
Step 3: PUT  /api/users/me              ✅ 200  (112ms)
        ↳ Sent: { name: "Updated Name" }
Step 4: GET  /api/users/me              ✅ 200  (78ms)
        ↳ Asserted: body.name === "Updated Name"
Step 5: DELETE /api/users/me            ✅ 204  (95ms)
Step 6: GET  /api/users/me              ❌ FAIL (67ms)
        ↳ Expected: 404
        ↳ Received: 200 { name: "Updated Name", deletedAt: "2026-03-05T..." }

━━━ Failure Analysis ━━━━━━━━━━━━━━━━━━━━

Step 6: Soft-delete returning 200 instead of 404.
  Root cause: GET route doesn't filter `deletedAt IS NOT NULL`.
  File to check: controllers/user.controller.ts → findOne method
  Suggested fix: Add `WHERE deletedAt IS NULL` condition to query.

━━━ Coverage ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Endpoints tested: 4 of 7 (57%)
Methods tested:   GET ✅  POST ✅  PUT ✅  DELETE ✅  PATCH ❌
Auth scenarios:  authenticated ✅  unauthenticated ❌  admin ❌
```

---

## Security Constraints

- **Never hardcode** API keys, tokens, or passwords in generated test scripts.
- **Use env vars**: `process.env.TEST_API_KEY`, `process.env.API_BASE_URL`.
- **Sanitize test payloads** — no actual SQL injection payloads that could damage data.
- **Never run destructive tests** against production URLs without explicit user confirmation.
- **Clean up created resources** at the end of every test flow (DELETE what was POSTed).

---

## Abort Conditions

| Condition | Action |
|---|---|
| Server is not running | Prompt to run `/preview start` before continuing |
| Destructive test (DELETE) on a production URL | Stop and confirm explicitly before executing |
| Test step fails with 5xx | Halt the flow — server error is not a test assertion failure |
| Auth step fails | Halt and report — remaining steps are invalid without a token |

---

## Cross-Workflow Navigation

| After /api-tester reveals... | Go to |
|---|---|
| Soft-delete returning 200, should be 404 | `/fix` or `/debug` the query filter |
| Endpoint returns 500 on valid input | `/debug` for root cause |
| Security test: SQL injection returns 500 with DB error | ❌ CRITICAL → `/audit` immediately |
| Rate limiting is missing | `/enhance` to add rate-limiting middleware |
| All tests pass, ready for deploy | `/deploy` following pre-flight checklist |

---

## Hallucination Guard

- **Scan route files first** — only test endpoints that exist in the codebase.
- **Verify HTTP methods** — only use methods the route actually supports.
- **Never invent response fields** — verify against schema, types, or actual response.
- **Flag assumptions**: `// ASSUMPTION: this endpoint requires JWT auth based on middleware scan`.
- **Never fabricate response times** — only report measured values.

---

## Usage

```
/api-tester CRUD flow for /api/posts
/api-tester auth flow with JWT refresh
/api-tester edge cases for /api/users
/api-tester full lifecycle for /api/orders including payment
/api-tester pagination for /api/products
/api-tester rate limiting on /api/auth/login
```
