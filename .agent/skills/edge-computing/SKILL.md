---
name: edge-computing
description: Edge computing mastery. Cloudflare Workers, Vercel Edge Functions, Durable Objects, edge-compatible data patterns, cold start elimination, caching policies (Stale-While-Revalidate), and global data locality. Use when designing globally distributed, extreme low-latency applications architectures.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Edge Computing — Global Latency Mastery

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
