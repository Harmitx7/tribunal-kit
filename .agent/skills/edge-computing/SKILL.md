---
name: edge-computing
description: Edge computing mastery. Cloudflare Workers, Vercel Edge Functions, Durable Objects, edge-compatible data patterns, cold start elimination, caching policies (Stale-While-Revalidate), and global data locality. Use when designing globally distributed, extreme low-latency applications architectures.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Edge Computing — Global Latency Mastery

> The Edge is not just a faster server. It fundamentally changes the computing model.
> You cannot put compute on the Edge and leave the database in Virginia. V8 isolates enforce new rules.

---

## 1. The Edge Model (V8 Isolates vs Node.js)

Edge functions (Cloudflare Workers, Vercel Edge) run on V8 Isolates, NOT standard Node.js environments.

**What This Means:**
1. Extremely fast cold starts (< 5ms) because there is no underlying OS process bootup.
2. Hard memory/time limits per request (e.g., 50ms CPU time max).
3. **NO NATIVE NODE MODULES.** You cannot use `fs`, `child_process`, or heavy native C++ binaries (e.g., standard `bcrypt`, `sharp`).

```typescript
// ❌ BAD: Attempting to use Node native core modules
import fs from "fs"; 
import bcrypt from "bcrypt"; // Has C++ bindings, will instantly crash on V8 edge

// ✅ GOOD: Utilizing standard Web APIs (Fetch, CryptoKey)
const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
```

---

## 2. Advanced Route Caching (Stale-While-Revalidate)

The highest value proposition of the edge is intercepting requests *before* they cross the ocean.

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
  }
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
import { createClient } from "@libsql/client/web";

const client = createClient({
  url: env.TURSO_DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN,
});

const result = await client.execute("SELECT * FROM users WHERE id = ?", [userId]);
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
    pair.server.addEventListener("message", msg => {
      // Broadcast to all other connected edge users
      this.sessions.forEach(session => session.send(msg.data));
    });

    return new Response(null, { status: 101, webSocket: pair.client });
  }
}
```

---

## 🤖 LLM-Specific Traps (Edge Computing)

1. **Node Core Assumption:** The AI imports `fs`, `path`, or `child_process` directly into Cloudflare Workers / Next.js Edge Middleware. V8 isolates lack file system access. Use native Web APIs (`ReadableStream`, `Blob`).
2. **Heavy Dependency Usage:** The AI imports massive NPM libraries (like `lodash` or `moment`) which crush the 1MB Edge script-size limits. Code for the Edge must be micro-optimized.
3. **TCP Database Connections:** Generating `const client = new Client({ connectionString: "postgres://..." })` inside an Edge runtime. The edge requires HTTP/WebSocket driven database architectures, or a managed connection pooler to prevent TCP exhaustion.
4. **State Fallacy:** Designing a global variable `let activeUsers = 0` inside an edge script and assuming it will sync. V8 Isolates boot and die globally in milliseconds. They share no memory.
5. **Ignoring `ctx.waitUntil`:** Mutating databases or logging metrics synchronously before returning the web response, slowing down the user. All side-effects on the Edge must be deferred via `ctx.waitUntil(promise)`.
6. **Non-Web Crypto:** Trying to use Node's `crypto` module. Standardize on the universally browser-compatible `crypto.subtle` Web Crypto API.
7. **Environment Variable Bleed:** Using `process.env.SECRET` instead of passing the standard `env` injection parameter into the V8 fetch handler.
8. **Missing CORS Origins:** Forgetting to dynamically append heavy CORS allow headers on the outgoing Edge proxy response manipulation.
9. **Synchronous Loops:** Designing a large `forEach` data map inside the worker request block, tripping the strict 50ms CPU execution limits resulting in generic 1102 Worker Errors.
10. **WebSocket Orphanages:** Opening a WebSocket inside a standard Edge function without bridging it into a Durable Object, causing the WS connection to terminate immediately when the isolate tears down.

---

## 🏛️ Tribunal Integration

### ✅ Pre-Flight Self-Audit
```
✅ Have I completely avoided using native Node.js core modules (`fs`, `path`, `crypto`)?
✅ Am I leveraging standard Web APIs (Fetch, Streams, Web Crypto)?
✅ Have database interactions utilized HTTP clients (or connection poolers) instead of direct TCP?
✅ Has `ctx.waitUntil()` been used for all background analytics/caching updates?
✅ Are environment variables injected via `env.VAR` rather than `process.env`?
✅ Is localized global state (chat rooms, live editing) explicitly deferred to Durable Objects?
✅ Did I define strict `s-maxage` and `stale-while-revalidate` directives for caching performance?
✅ Are third-party library imports audited for their V8 isolate compatibility footprint?
✅ Is JSON parsing happening inside `try/catch` to avoid 500ing early isolates?
✅ Did I avoid deploying massive >1MB bundle payloads to the Edge routing layer?
```
