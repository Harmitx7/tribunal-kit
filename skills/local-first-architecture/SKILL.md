---
name: local-first-architecture
description: "Use when Local-first architecture guidance for instant-feeling web & desktop apps, optimistic updates, IndexedDB sync engines, offline operation, and Conflict-free Replicated Data Types (CRDTs)."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - react-specialist
  - nextjs-react-expert
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Local-First Architecture — Instant UI & Sync Engines

---

## 🛠️ Technical Architecture & Reference Recipes

---

## 2026 Local-First Architecture & Sync Invariants

1. **OPFS (Origin Private File System) for WASM SQLite**:
   Always prefer OPFS sync access handles for SQLite in web workers. It delivers native near-SSD read/write speeds that dwarf standard IndexedDB overhead.
2. **Idempotency Key Protocol**:
   Every local mutation must generate an `idempotencyKey` (UUID v7). The server stores processed keys for 24h, discarding replays during network flushes.
3. **Delta Sync over Full Sync**:
   Never download entire tables. Use incremental sync cursors (`last_synced_version_id`) and stream compact binary deltas via WebSockets or SSE.

## Hallucination Traps (Read First)

- ❌ Blocking UI render on a remote fetch in a local-first app → ✅ Render local cache immediately; reconcile in background
- ❌ Mutating server state without an idempotency key → ✅ Flushed network retries will duplicate records
- ❌ Putting heavy SQLite WASM operations on the browser main thread → ✅ Always run local DB queries inside a Dedicated Web Worker
- ❌ Storing unindexed large blobs inside IndexedDB → ✅ Store blobs in OPFS; keep metadata in local SQLite/IndexedDB

---

## 4 Pillars of Local-First Architecture

### 1. Read & Write Local First

- **Zero Network Latency**: UI queries (`select * from tasks`) run synchronously or near-instantaneously against in-memory or IndexedDB caches.
- Mutations update the local cache immediately (_optimistic write_), appending a mutation log item to an outbound sync queue.

### 2. Outbound Mutation Queue & Idempotency

- Store mutation logs in a persistent local queue (`IndexedDB` / `SQLite`).
- Assign every client mutation a unique UUID (`idempotencyKey`).
- When network connection is restored, flush queue items sequentially with automatic retry on 5xx failures.

### 3. Conflict Resolution (CRDTs & LWW)

- **Last-Write-Wins (LWW)**: Timestamp + Client ID ordering for simple fields.
- **CRDTs (Yjs / Automerge)**: Conflict-free Replicated Data Types for collaborative text editing and array state.

### 4. Background Delta Streaming

- Receive database updates via WebSockets or Server-Sent Events (SSE) as thin binary deltas (`sync_version > client_version`), applying changes to local storage without re-fetching full datasets.
