---
name: local-first
description: "Use when executing, coordinating, planning, or reviewing local first agent workflows, cognitive loops, and architecture standards."
version: 6.0.0
last-updated: 2026-09-29
skills:
  - local-first-architecture
  - react-specialist
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Local-First Architecture — Offline-capable Mastery

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `local-first` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).


## Activation Boundaries
- **Activate when:** Use when executing, coordinating, planning, or reviewing local first agent workflows, cognitive loops, and architecture standards.
- **DO NOT activate when:** The task falls outside the `local-first` domain or is managed by a different dedicated specialist agent.


## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. | Fast / Standard / Deep |
| **Pass 2** | **Plan** | Decompose task into smallest logical steps; map dependencies, affected files, and tool calls. | Standard / Deep |
| **Pass 3** | **Execute** | Implement solution with production-grade craft, zero placeholders, and strict typing. | All Modes |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. | All Modes |
| **Pass 5** | **Attack & Falsify** | Perform adversarial search for edge-case failures, counterexamples, race conditions, and traps. | Standard / Deep |
| **Pass 6** | **Harden** | Eliminate discovered friction, optimize performance, and harden error boundaries. | Standard / Deep |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. | All Modes |


---

## 🛠️ Technical Architecture & Reference Recipes

## Hallucination Traps (Read First)

- ❌ Assuming server data is always newer than local data -> ✅ Conflicts are inevitable; design merge strategy (LWW, CRDTs) before writing code
- ❌ Using localStorage for anything beyond 5MB -> ✅ Use IndexedDB (via Dexie or idb) for structured local storage; localStorage is synchronous and tiny
- ❌ Syncing entire datasets on every connection -> ✅ Use incremental sync with watermarks/timestamps to minimize bandwidth

---
## 1. Core Principles of Local-First

In a Cloud-First app (REST/GraphQL), the UI waits for the server.
In a Local-First app, the UI talks _only_ to a local database. A background engine syncs that database to the cloud when online.

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
  queryFn: () => fetch('/api/todos').then(res => res.json()),
});

// ✅ LOCAL-FIRST (e.g. PowerSync / ElectricSQL / WatermelonDB)
// Resolves instantly. Data lives locally. Syncs silently in background.
import { useQuery } from '@powersync/react';

const { data, isLoading } = useQuery('SELECT * FROM todos ORDER BY created_at DESC');

// Writes are also local First
const addTodo = async (text: string) => {
  // Written to the local SQLite WASM database instantly.
  await localDb.execute('INSERT INTO todos (id, text) VALUES (uuid(), ?)', [text]);
  // Background worker syncs to Postgres later.
};
```

---

## 3. Conflict Resolution (CRDTs)

When two users edit the exact same document offline and then reconnect, how is it resolved?

**Conflict-free Replicated Data Types (CRDTs)** automatically merge data without requiring a central server to decide the "winner."

```typescript
// Yjs - The leading CRDT library for collaborative text/state
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const ydoc = new Y.Doc();
const provider = new WebsocketProvider('wss://sync.example.com', 'room-1', ydoc);

// Shared state array
const yarray = ydoc.getArray('todos');

// Observe changes (Fires locally and when peers sync)
yarray.observe(event => {
  console.log('State updated natively without conflict:', yarray.toArray());
});

// Insert data (Instantly merges cleanly with remote peers)
yarray.insert(0, ['Buy milk']);
```

---

## 4. In-Browser Databases

Storing megabytes of relational data in `localStorage` will crash the browser.

| Technology             | Use Case      | Pros                                | Cons                                          |
| :--------------------- | :------------ | :---------------------------------- | :-------------------------------------------- |
| **IndexedDB**          | Key-Value     | Native to browser                   | Hideous callback API, weak querying           |
| **Dexie.js**           | Key-Value     | Wraps IndexedDB with clean Promises | Not relational                                |
| **SQLite WASM (OPFS)** | Relational    | True SQL in browser                 | Setup complexity (Origin Private File System) |
| **RxDB**               | NoSQL Offline | Reactive UI out-of-the-box          | Requires learning RxJS/Observables            |
| **WatermelonDB**       | Relational    | Built for React Native & Web        | Requires native module setup on mobile        |

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
  friends: '++id, name, age', // Primary key and indexed props
});

// Write to DB instantly
await db.friends.add({ name: 'Alice', age: 25 });

// Live query natively drives React state without network calls
import { useLiveQuery } from 'dexie-react-hooks';
const friends = useLiveQuery(() => db.friends.where('age').above(21).toArray());
```

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |


## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `orchestrator` · `agent-organizer` · `logic-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

### ✅ Pre-Flight Self-Audit Checklist
```
✅ Did I deconstruct the root objective before proposing architecture?
✅ Did I identify dependencies, bottlenecks, and parallelizable sub-tasks?
✅ Did I avoid over-engineering and select the simplest effective pattern?
✅ Did I verify assumptions with concrete file reads instead of speculation?
✅ Did I establish measurable verification criteria before completion?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
