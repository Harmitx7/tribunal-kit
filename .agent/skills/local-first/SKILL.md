---
name: local-first
description: Local-first software architecture mastery. CRDTs (Conflict-free Replicated Data Types), IndexedDB synchronization, sync engines (ElectricSQL, Replicache, PowerSync), offline-capable data fetching, optimistic UI, and SQLite in the browser (WASM). Use when building PWA offline capabilities, rapid UIs, or multiplayer collaborative tools.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Local-First Architecture — Offline-capable Mastery

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

|Technology|Use Case|Pros|Cons|
|:---|:---|:---|:---|
|**IndexedDB**|Key-Value|Native to browser|Hideous callback API, weak querying|
|**Dexie.js**|Key-Value|Wraps IndexedDB with clean Promises|Not relational|
|**SQLite WASM (OPFS)**|Relational|True SQL in browser|Setup complexity (Origin Private File System)|
|**RxDB**|NoSQL Offline|Reactive UI out-of-the-box|Requires learning RxJS/Observables|
|**WatermelonDB**|Relational|Built for React Native & Web|Requires native module setup on mobile|

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
