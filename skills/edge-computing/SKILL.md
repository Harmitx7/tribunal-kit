---
name: edge-computing
description: Use when Edge computing mastery. Cloudflare Workers, Vercel Edge Functions, Durable Objects, edge-compatible data patterns, cold start elimination, caching policies (Stale-While-Revalidate), and global data locality. Use when designing globally distributed, extreme low-latency applications architectures.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - nextjs-react-expert
  - local-first-architecture
  - backend-security-expert
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Edge Computing — Global Latency Mastery

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `edge-computing` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Edge computing mastery. Cloudflare Workers, Vercel Edge Functions, Durable Objects, edge-compatible data patterns, cold start elimination, caching policies (Stale-While-Revalidate), and global data locality. Use when designing globally distributed, extreme low-latency applications architectures.
- **DO NOT activate when:** The task falls outside the `edge-computing` domain or is managed by a different dedicated specialist.

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

- ❌ Importing Node.js-only APIs (fs, net, child_process) in edge functions -> ✅ Edge runtime has NO Node.js APIs; use Web APIs only
- ❌ Using `global` or module-level mutable state in edge -> ✅ Edge functions are stateless across requests; use KV/Durable Objects for state
- ❌ Assuming edge functions have unlimited execution time -> ✅ Cloudflare Workers: 30s, Vercel Edge: 25s; design for millisecond responses

---

---

## 1. The Edge Model (V8 Isolates vs Node.js)

Edge functions (Cloudflare Workers, Vercel Edge) run on V8 Isolates, NOT standard Node.js environments.

**What This Means:**

1. Extremely fast cold starts (< 5ms) because there is no underlying OS process bootup.
2. Hard memory/time limits per request (e.g., 50ms CPU time max).
3. **NO NATIVE NODE MODULES.** You cannot use `fs`, `child_process`, or heavy native C++ binaries (e.g., standard `bcrypt`, `sharp`).

```typescript
// ❌ BAD: Attempting to use Node native core modules
import fs from 'fs';
import bcrypt from 'bcrypt'; // Has C++ bindings, will instantly crash on V8 edge

// ✅ GOOD: Utilizing standard Web APIs (Fetch, CryptoKey)
const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
```

---

## 2. Advanced Route Caching (Stale-While-Revalidate)

The highest value proposition of the edge is intercepting requests _before_ they cross the ocean.

```typescript
// Standard Edge Proxy request handling
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Cache API responses at the edge
    const cache = caches.default;
    let response = await cache.match(request);

    if (!response) {
      // 2. Fetch Origin (The real server in Virginia)
      response = await fetch(request);

      // 3. Mutate Headers for SWR (Stale-While-Revalidate)
      // Instructs the Edge CDN: Serve the stale version instantly to the user,
      // but fire an async request in the background to update the cache for the next user.
      response = new Response(response.body, response);
      response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=86400');

      // 4. Store in Cache asynchronously (do not block the user response)
      ctx.waitUntil(cache.put(request, response.clone()));
    }

    return response;
  },
};
```

---

## 3. Edge Data Locality (The Database Problem)

Running logic globally while querying a monolithic database in `us-east-1` is counter-productive. The latency of establishing a connection across the Atlantic will negate any Edge benefits.

### Solutions:

1. **Edge KV Stores**: (Cloudflare KV, Vercel KV) Eventually consistent, highly localized read-latency configs suitable for configuration routing, user sessions, or feature flags.
2. **Distributed SQLite**: (Cloudflare D1, Turso) Replicas distributed to edge nodes automatically.
3. **Connection Pooling**: Use an HTTP/Connection Pool proxy strictly (e.g., Prisma Accelerate, Supabase Edge Pooler). You cannot establish TCP `pg://` connections directly from millions of spinning V8 isolates, you will OOM crash the database.

```typescript
// ✅ Turso / LibSQL (Distributed Edge DB) usage:
import { createClient } from '@libsql/client/web';

const client = createClient({
  url: env.TURSO_DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN,
});

const result = await client.execute('SELECT * FROM users WHERE id = ?', [userId]);
```

---

## 4. WebSockets at the Edge (Durable Objects)

Standard Edge functions are stateless. To hold persistent state (like a live multiplayer gaming room, or a chat room's WebSocket connections across multiple users), you must funnel those connections into a single point of state: a Durable Object.

```typescript
// A Durable Object serves as a single source of truth that users globally connect into
export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.sessions = [];
  }

  async fetch(request) {
    // Upgrade standard HTTP to WebSocket
    const pair = new WebSocketPair();

    // Accept connection, store it globally
    this.sessions.push(pair.server);
    pair.server.accept();

    // Handle incoming Chat messages
    pair.server.addEventListener('message', msg => {
      // Broadcast to all other connected edge users
      this.sessions.forEach(session => session.send(msg.data));
    });

    return new Response(null, { status: 101, webSocket: pair.client });
  }
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
