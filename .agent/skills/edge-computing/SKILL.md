---
name: edge-computing
description: Edge function design principles. Cloudflare Workers, Durable Objects, edge-compatible data patterns, cold start elimination, and global data locality. Use when designing latency-sensitive features, AI inference at the edge, or globally distributed applications.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-12
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Edge Computing Principles

> Edge is not "just serverless but faster."
> It's a fundamentally different execution model with different constraints.

---

## Edge vs Serverless vs Server

Before choosing edge, understand what you're getting and what you're giving up:

| Property | Traditional Server | Serverless (Lambda) | Edge (Workers) |
|---|---|---|---|
| Cold start | None | 100ms–2s | < 5ms (V8 isolates) |
| Runtime | Full Node.js | Full Node.js | ⚠️ Subset of Web APIs only |
| Latency to user | One region | One region | < 30ms globally |
| Max CPU time | Unlimited | 15 min | 30ms–1s per request |
| `fs` module | ✅ | ✅ | ❌ No filesystem |
| `child_process` | ✅ | ✅ | ❌ No subprocess |
| Memory | GB+ | 128MB–3GB | 128MB |
| Persistent state | DB + disk | DB only | Durable Objects / KV |
| Cost model | Fixed | Per invocation | Per invocation (cheaper) |

**Rule: Choose edge when latency is the primary constraint and you can work within its API restrictions.**

---

## Edge Runtime Constraints

The edge runtime implements **Web Platform APIs**, not Node.js APIs. This causes the most hallucinations:

```ts
// ❌ Node.js APIs — not available at the edge
import fs from 'fs';                          // No filesystem
import { createHash } from 'crypto';          // No Node crypto module
import { exec } from 'child_process';         // No subprocess
import path from 'path';                      // No path module
const __dirname = path.dirname(fileURLToPath(import.meta.url));  // No __dirname

// ✅ Web Platform APIs — available everywhere at the edge
const hash = await crypto.subtle.digest('SHA-256', Buffer.from(input));
const response = await fetch('https://api.example.com/data');
const encoded = btoa(jsonString);
const parsed = JSON.parse(body);
```

---

## Cloudflare Workers Patterns

### Basic Worker Structure

```ts
// src/index.ts — Cloudflare Workers (Hono framework recommended)
import { Hono } from 'hono';

const app = new Hono<{ Bindings: Env }>();

app.get('/api/hello', async (c) => {
  // Access environment variables via c.env — not process.env
  const apiKey = c.env.API_KEY;
  return c.json({ message: 'Hello from the edge' });
});

export default app;
```

### Durable Objects — Stateful Edge

Durable Objects provide a single-threaded, globally-unique actor model for stateful workloads at the edge (think: per-room chat state, rate limiters, presence):

```ts
// Durable Object — each instance is a unique stateful actor
export class RoomState {
  private state: DurableObjectState;
  private users = new Set<WebSocket>();

  constructor(state: DurableObjectState) {
    this.state = state;
    // Restore state across hibernation
    this.state.getWebSockets().forEach(ws => this.users.add(ws));
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') === 'websocket') {
      const [client, server] = Object.values(new WebSocketPair());
      this.state.acceptWebSocket(server);
      this.users.add(server);
      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response('Not a WebSocket', { status: 400 });
  }
}
```

---

## Edge-Compatible Data Patterns

The edge has no local disk. Data access must be network-based and ultra-low-latency:

| Data Type | Edge Solution | Do Not Use |
|---|---|---|
| Key-value | Cloudflare KV, Upstash Redis (HTTP) | Redis TCP (not HTTP) |
| Relational | Turso (libSQL over HTTP), Neon (HTTP) | PostgreSQL TCP connection |
| Blob / files | Cloudflare R2, S3 (via HTTP) | Local disk |
| Session / cache | Cloudflare KV | In-memory (dies per request) |
| Vector search | Vectorize (Cloudflare), Pinecone HTTP | pgvector (TCP) |

```ts
// ✅ Turso — SQLite at the edge via HTTP API
import { createClient } from '@libsql/client/http';

const db = createClient({
  url: env.TURSO_DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN,
});

const { rows } = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
```

---

## Cold Start Design

The main advantage of edge (V8 isolates) is cold starts under 5ms vs Lambda's 100ms+. But you can still waste this advantage:

```ts
// ❌ Heavy initialization in module scope — runs on every cold start
import { HeavyDependency } from 'huge-library';  // 50KB parse time
const expensiveClient = new HeavyDependency({ ... });  // Slow init

// ✅ Lazy initialization — only create when needed
let client: HeavyClient | null = null;
function getClient(env: Env) {
  if (!client) client = new HeavyClient({ apiKey: env.OPENAI_API_KEY });
  return client;
}
```

---

## Data Locality & GDPR Compliance

```
Problem: User in Germany hits edge node in Singapore → data can't leave EU.

Solution: Cloudflare Smart Placement + regional routing

// wrangler.toml — restrict processing to EU jurisdiction
[placement]
mode = "smart"

// Or explicit routing: route EU traffic to EU DOs only
const id = env.ROOM.idFromName(`eu:${roomId}`);
```

---

## Output Format

When this skill produces or reviews code, structure your output as follows:

```
━━━ Edge Computing Report ━━━━━━━━━━━━━━━━━━━━━━━━
Skill:       Edge Computing
Language:    [detected language / framework]
Scope:       [N files · N functions]
─────────────────────────────────────────────────
✅ Passed:   [checks that passed, or "All clean"]
⚠️  Warnings: [non-blocking issues, or "None"]
❌ Blocked:  [blocking issues requiring fix, or "None"]
─────────────────────────────────────────────────
VBC status:  PENDING → VERIFIED
Evidence:    [test output / lint pass / compile success]
```

**VBC (Verification-Before-Completion) is mandatory.**
Do not mark status as VERIFIED until concrete terminal evidence is provided.


---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/tribunal-backend`**
**Active reviewers: `logic` · `security` · `dependency`**

### ❌ Forbidden AI Tropes in Edge Computing

1. **Importing Node.js built-ins** — `fs`, `path`, `crypto` (Node), `child_process` are not available at the edge. The edge runtime is Web Platform APIs only.
2. **`process.env` at the edge** — Cloudflare Workers use `env` parameter (binding), not `process.env`. Wrangler `vars` are accessed via `c.env.VAR_NAME`.
3. **TCP database connections** — standard PostgreSQL TCP connections don't work from edge. Use HTTP-based drivers (Neon serverless, Turso libSQL, PlanetScale HTTP).
4. **Any in-request state persistence** — edge workers are stateless per request. Use Durable Objects for state, KV for cache.

### ✅ Pre-Flight Self-Audit

```
✅ Does this code use only Web Platform APIs (fetch, crypto.subtle, btoa, etc.)?
✅ Are all database connections via HTTP drivers, not TCP (no pg.Pool at the edge)?
✅ Are environment variables accessed via the env binding, not process.env?
✅ Is any stateful data stored in KV or Durable Objects, not in-memory variables?
✅ Are heavy module imports lazy-loaded to avoid unnecessary cold start delays?
```
