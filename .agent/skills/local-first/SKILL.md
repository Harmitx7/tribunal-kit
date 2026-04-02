---
name: local-first
description: Local-first software architecture mastery. CRDTs (Conflict-free Replicated Data Types), IndexedDB synchronization, sync engines (ElectricSQL, Replicache, PowerSync), offline-capable data fetching, optimistic UI, and SQLite in the browser (WASM). Use when building PWA offline capabilities, rapid UIs, or multiplayer collaborative tools.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Local-First Architecture — Offline-capable Mastery

> The network is the bottleneck. The database should live on the user's device.
> Traditional SaaS is Cloud-First. The future of UX is Local-First.

---

## 1. Core Principles of Local-First

In a Cloud-First app (REST/GraphQL), the UI waits for the server.
In a Local-First app, the UI talks *only* to a local database. A background engine syncs that database to the cloud when online.

1. **Fast by default**: Zero network latency because reads/writes happen locally.
2. **Offline works flawlessly**: The app bounds to a local store (SQLite via WASM, IndexedDB).
3. **Multi-device Sync**: Conflict resolution is handled natively (usually via CRDTs or central conflict ledgers).

---

## 2. Sync Engines vs traditional fetching

Do not use React Query / SWR to build local-first. They are HTTP caching mechanisms.

```typescript
// ❌ CLOUD-FIRST (React Query / Fetch)
// Fails when offline. Subject to UI latency.
const { data, isLoading } = useQuery({ 
  queryKey: ['todos'], 
  queryFn: () => fetch('/api/todos').then(res => res.json()) 
})

// ✅ LOCAL-FIRST (e.g. PowerSync / ElectricSQL / WatermelonDB)
// Resolves instantly. Data lives locally. Syncs silently in background.
import { useQuery } from '@powersync/react';

const { data, isLoading } = useQuery('SELECT * FROM todos ORDER BY created_at DESC');

// Writes are also local First
const addTodo = async (text: string) => {
  // Written to the local SQLite WASM database instantly.
  await localDb.execute('INSERT INTO todos (id, text) VALUES (uuid(), ?)', [text]);
  // Background worker syncs to Postgres later.
}
```

---

## 3. Conflict Resolution (CRDTs)

When two users edit the exact same document offline and then reconnect, how is it resolved?

**Conflict-free Replicated Data Types (CRDTs)** automatically merge data without requiring a central server to decide the "winner."

```typescript
// Yjs - The leading CRDT library for collaborative text/state
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

const ydoc = new Y.Doc()
const provider = new WebsocketProvider('wss://sync.example.com', 'room-1', ydoc)

// Shared state array
const yarray = ydoc.getArray('todos')

// Observe changes (Fires locally and when peers sync)
yarray.observe(event => {
  console.log("State updated natively without conflict:", yarray.toArray())
})

// Insert data (Instantly merges cleanly with remote peers)
yarray.insert(0, ['Buy milk'])
```

---

## 4. In-Browser Databases

Storing megabytes of relational data in `localStorage` will crash the browser.

| Technology | Use Case | Pros | Cons |
|:---|:---|:---|:---|
| **IndexedDB** | Key-Value | Native to browser | Hideous callback API, weak querying |
| **Dexie.js** | Key-Value | Wraps IndexedDB with clean Promises | Not relational |
| **SQLite WASM (OPFS)** | Relational | True SQL in browser | Setup complexity (Origin Private File System) |
| **RxDB** | NoSQL Offline | Reactive UI out-of-the-box | Requires learning RxJS/Observables |
| **WatermelonDB** | Relational | Built for React Native & Web | Requires native module setup on mobile |

```typescript
// Clean IndexedDB Wrapper Example (Dexie)
import Dexie, { type EntityTable } from 'dexie';

interface Friend {
  id: number;
  name: string;
  age: number;
}

const db = new Dexie('FriendsDatabase') as Dexie & {
  friends: EntityTable<Friend, 'id'>;
};

// Schema configuration
db.version(1).stores({
  friends: '++id, name, age' // Primary key and indexed props
});

// Write to DB instantly
await db.friends.add({ name: 'Alice', age: 25 });

// Live query natively drives React state without network calls
import { useLiveQuery } from "dexie-react-hooks";
const friends = useLiveQuery(() => db.friends.where('age').above(21).toArray());
```

---

## 🤖 LLM-Specific Traps (Local-First)

1. **`localStorage` Abuse:** Using `localStorage` as a database. It is synchronous, blocking the main UI thread, and limited to 5MB. Use IndexedDB/SQLite WASM.
2. **Re-inventing Conflict Logic:** Writing manual "last-write-wins" logic using timestamps (`updatedAt`). In distributed systems, clock drift guarantees this will fail and overwrite data corruptly. Use CRDTs (Yjs/Automerge).
3. **Optimistic UI as Local-First:** Thinking React Query's `onMutate` rollback logic is local-first architecture. It is not. It is a UX trick masking Cloud-First latency.
4. **Offline Auth Blindness:** Trying to execute local queries while wrapped in an `AuthGuard` that requires a server-side JWT verification on boot. Auth states must be cached locally to allow offline boots.
5. **Schema Migration Chaos:** Updating cloud schemas without providing local migration scripts. If the local client SQLite DB schema differs from the Postgres cloud schema, the sync engine will crash silently.
6. **Background Sync Blocking:** Writing custom `setInterval` sync loops on the main JavaScript thread, causing UI stutter. Sync logic must run in a Web Worker (or Service Worker).
7. **Ignoring IndexedDB Quotas:** Browsers will unpredictably evict IndexedDB data if the user's disk gets full. Architect apps resolving local data as a cache of the cloud, not as the irrevocable source of truth.
8. **Heavy Client Boot Times:** Bootstrapping a massive 50MB SQLite WASM database onto the client payload, destroying First Contentful Paint. WASM blobs should be pre-fetched/lazy-loaded.
9. **Eventual Consistency Panic:** Developing UIs that throw errors if a foreign key relation hasn't synced yet. Local-first UIs must defensively handle partial data relationships seamlessly.
10. **WebSocket vs Local Priority:** Over-relying on WebSockets connected directly to the server. The UI should strictly read from the Local DB; the Local DB gets updated by the WebSocket.

---

## 🏛️ Tribunal Integration

### ✅ Pre-Flight Self-Audit
```
✅ Is the UI strictly reading from a local DB instead of HTTP network calls?
✅ Are background sync tasks isolated in a Web Worker (or managed Sync Engine)?
✅ Is complex relational data stored in IndexedDB/SQLite (not `localStorage`)?
✅ Are conflicts resolved using CRDT structures rather than arbitrary timestamp comparisons?
✅ Have authentication states been cached locally to permit true offline app launches?
✅ Does the local database schema precisely mirror the required subset of the cloud database?
✅ Are writes executed locally first, instantly updating the UI?
✅ Have I utilized established Local-First sync engines (PowerSync, ElectricSQL, Yjs) instead of manual queuing?
✅ Is the UI built to degrade gracefully if sync relationships are temporarily shattered?
✅ Is the app's initial WASM/DB payload lazy-loaded to preserve fast initial page loads?
```
