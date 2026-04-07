---
description: Automated multi-stage API endpoint testing. Generates and runs auth-aware request sequences (login → use token → test CRUD → verify errors). Reports response codes, schema mismatches, and unexpected data.
---

# /api-tester — Automated API Testing

$ARGUMENTS

---

## When to Use /api-tester

|Use `/api-tester` when...|Use something else when...|
|:---|:---|
|Testing REST API endpoints manually|Unit tests needed → `/test`|
|Verifying auth token flows end-to-end|Full security audit → `/audit`|
|After generating new endpoints|Load testing → `/performance-benchmarker`|
|Checking response schemas||

---

## Phase 1 — Endpoint Discovery

```bash
# Find all defined routes
grep -r "app.get\|app.post\|app.put\|app.delete\|app.patch" src/ --include="*.ts"
grep -r "router.get\|router.post\|router.put" src/ --include="*.ts"

# Next.js Route Handlers
find src/app/api -name "route.ts" | sort
```

---

## Phase 2 — Auth Flow (Token Acquisition)

Before testing protected endpoints, acquire auth token:

```bash
# Acquire JWT
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword"}' \
  -s | jq '.token'

# Assign to variable
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword"}' \
  -s | jq -r '.token')
```

---

## Phase 3 — CRUD Sequence Testing

Test endpoints in the correct order (create before read, read before delete):

```bash
# 1. CREATE (POST)
CREATE_RESPONSE=$(curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"new@test.com"}')
CREATED_ID=$(echo $CREATE_RESPONSE | jq -r '.id')
echo "Created: $CREATED_ID"

# 2. READ (GET)
curl -X GET "http://localhost:3000/api/users/$CREATED_ID" \
  -H "Authorization: Bearer $TOKEN" \
  | jq .

# 3. UPDATE (PATCH)
curl -X PATCH "http://localhost:3000/api/users/$CREATED_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name"}'

# 4. DELETE
curl -X DELETE "http://localhost:3000/api/users/$CREATED_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Phase 4 — Error Case Testing

Test that errors are handled correctly:

```bash
# 4xx errors (client errors — must NOT return 200!)
echo "--- Unauthenticated request (expect 401) ---"
curl -X GET http://localhost:3000/api/users -s -o /dev/null -w "%{http_code}\n"

echo "--- Invalid ID (expect 404 or 400) ---"
curl -X GET "http://localhost:3000/api/users/not-a-real-id" \
  -H "Authorization: Bearer $TOKEN" \
  -s -o /dev/null -w "%{http_code}\n"

echo "--- Invalid body (expect 400) ---"
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"invalid":"field"}' \
  -s -o /dev/null -w "%{http_code}\n"

echo "--- Rate limiting (expect 429 after N requests) ---"
for i in {1..15}; do
  STATUS=$(curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"x","password":"wrong"}' \
    -s -o /dev/null -w "%{http_code}")
  echo "Attempt $i: $STATUS"
done
```

---

## Phase 5 — Test Report

```
━━━ API Test Report ━━━━━━━━━━━━━━━━━━━━━━

Auth Flow:   ✅ Login → token acquired
POST /users: ✅ 201 Created — id returned
GET /users:  ✅ 200 — data matches expected schema
PATCH /users: ✅ 200 — update reflected
DELETE /users: ✅ 204 No Content

Error Cases:
  Unauthenticated: ✅ 401 (expected)
  Invalid ID:      ✅ 404 (expected)
  Invalid body:    ✅ 400 (expected) — Zod error returned
  Rate limiting:   ✅ 429 on attempt 11 (expected)

━━━ Issues Found ━━━━━━━━━━━━━━━━━━━━━━━━

  ❌ GET /api/users returns 200 with no auth (should be 401)
  ⚠️ PATCH /api/users doesn't validate Content-Type (accepts any body)
```

---

## Usage Examples

```
/api-tester POST /api/auth/login then test /api/users CRUD
/api-tester test the /api/checkout flow with Stripe test card
/api-tester verify all auth routes return 401 for unauthenticated requests
/api-tester test rate limiting on /api/auth/login
```
