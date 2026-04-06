---
name: api-security-auditor
description: API Security auditing mastery. Rate limiting architecture, API key management, payload validation, IDOR (Insecure Direct Object Reference) prevention, mass assignment flaws, GraphQL security, and server-side mitigations. Use when building external APIs, B2B services, or reviewing endpoint security.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# API Security Auditor — Endpoint Hardening Mastery

---

## Insecure Direct Object Reference (IDOR)

IDOR occurs when an application provides direct access to objects based on user-supplied input without authorization checks.

```typescript
// ❌ VULNERABLE: Trusting the requested ID blindly
app.get("/api/receipts/:id", async (req, res) => {
  const receipt = await db.receipts.findById(req.params.id);
  res.json(receipt); // Attack: Increment ID to view others' receipts
});

// ✅ SAFE: Verifying ownership
app.get("/api/receipts/:id", async (req, res) => {
  const receipt = await db.receipts.findById(req.params.id);
  if (!receipt) return res.status(404).send();

  // Explicit tenancy check
  if (receipt.userId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied" });
  }

  res.json(receipt);
});

// ✅ BEST: Using UUIDv4/CUID/NanoID instead of sequential integers
// Attackers cannot guess standard UUIDs, heavily mitigating IDOR risks.
```

---

## Mass Assignment (Overposting)

Occurs when web frameworks automatically bind HTTP request parameters to application models without filtering.

```typescript
// ❌ VULNERABLE: Direct object binding
app.put("/api/users/:id", async (req, res) => {
  // Attack: req.body = { name: "Bob", role: "admin", isPaid: true }
  await db.users.update({ id: req.params.id }, req.body);
  res.send("Updated");
});

// ✅ SAFE: Explicit property selection (DTOs)
app.put("/api/users/:id", async (req, res) => {
  // Only extract explicitly allowed fields
  const { name, email, bio } = req.body;
  const safeData = { name, email, bio };

  await db.users.update({ id: req.params.id }, safeData);
  res.send("Updated");
});

// ✅ BEST: Validation libraries (Zod, Joi) handling stripping
const UpdateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
}).strict(); // `.strict()` throws if "role" or "isPaid" is passed
```

---

## Rate Limiting Architecture

```typescript
// Basic Rate Limiting (Express)
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";

// Global baseline limit
export const globalLimiter = rateLimit({
  store: new RedisStore({ client: redisClient }),
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // Limit each IP to 100 reqs per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
});

// Aggressive endpoint-specific limit (Login, Password Reset)
export const authLimiter = rateLimit({
  store: new RedisStore({ client: redisClient }),
  windowMs: 60 * 60 * 1000, // 1 Hour
  max: 5, // 5 login attempts per IP per hour
  message: "Too many login attempts, please try again later"
});

// ❌ HALLUCINATION TRAP: In-memory rate limiting across multiple server pods
// If you use basic memory stores in a load-balanced environment (K8s, ECS),
// an attacker has `limit * num_pods` attempts. Always use a centralized store (Redis).
```

---

## API Key Management

```
Best Practices for issuance and storage:
1. Format: Prefix keys to identify them and allow secret scanners to find them easily.
   - Example: `pk_live_8a9b...` (Stripe pattern).
2. Storage: NEVER store plaintext API keys in the DB.
   - Hash them using SHA-256 (not bcrypt, because API keys are high entropy/long).
   - Only show the user the plaintext key ONCE upon creation.
3. Transport: API keys must only be accepted via Headers, never in Query Params.
   - `Authorization: Bearer pk_live_123`
   - Query params are logged in server access logs and browser histories.
```

---

## GraphQL Security Vectors

```typescript
// GraphQL introduces unique DoS vectors not found in REST

// 1. Query Depth Limiting (Prevent nested joins crushing the DB)
// User -> Posts -> Comments -> Author -> Posts -> Comments...
import depthLimit from 'graphql-depth-limit';
app.use('/graphql', graphqlHTTP({ validationRules: [depthLimit(5)] }));

// 2. Query Cost Analysis
// Prevent attackers from requesting 100,000 items in a single query
// Implement cursor pagination and enforce `first: 100` limits.

// 3. Introspection Disabled in Production
// Introspection allows attackers to download your entire schema.
const server = new ApolloServer({
  schema,
  introspection: process.env.NODE_ENV !== 'production'
});
```

---
