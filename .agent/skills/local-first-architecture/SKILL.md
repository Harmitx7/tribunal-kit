---
name: local-first-architecture
description: Local-first architecture guidance for instant-feeling web & desktop apps, optimistic updates, IndexedDB sync engines, offline operation, and Conflict-free Replicated Data Types (CRDTs).
version: 3.0.0
last-updated: 2026-07-30
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

## Mandatory Pre-Flight Context Inspection

Before implementing local-first architecture or offline sync engines, you MUST inspect:
1. Zero Network Latency Rule (Section 24) → Execute reads and writes against local storage (IndexedDB/SQLite) first before queueing outbound sync
2. Outbound Mutation Queue (Section 28) → Persist mutation logs in IndexedDB with client-generated UUID `idempotencyKey` fields
3. Conflict Resolution Strategy (Section 33) → Use Last-Write-Wins (LWW) for simple fields or CRDTs (Yjs/Automerge) for collaborative state

Architect software that reads and writes to local storage (SQLite/IndexedDB) first, ensuring instant zero-latency UI mutations with background server synchronization.

---

## 4 Pillars of Local-First Architecture

### 1. Read & Write Local First
- **Zero Network Latency**: UI queries (`select * from tasks`) run synchronously or near-instantaneously against in-memory or IndexedDB caches.
- Mutations update the local cache immediately (*optimistic write*), appending a mutation log item to an outbound sync queue.

### 2. Outbound Mutation Queue & Idempotency
- Store mutation logs in a persistent local queue (`IndexedDB` / `SQLite`).
- Assign every client mutation a unique UUID (`idempotencyKey`).
- When network connection is restored, flush queue items sequentially with automatic retry on 5xx failures.

### 3. Conflict Resolution (CRDTs & LWW)
- **Last-Write-Wins (LWW)**: Timestamp + Client ID ordering for simple fields.
- **CRDTs (Yjs / Automerge)**: Conflict-free Replicated Data Types for collaborative text editing and array state.

### 4. Background Delta Streaming
- Receive database updates via WebSockets or Server-Sent Events (SSE) as thin binary deltas (`sync_version > client_version`), applying changes to local storage without re-fetching full datasets.

---

## 🤖 LLM-Specific Traps

1. **Waiting for Server API Response Before UI Render**: Blocking the user interface with a spinner while waiting for a POST request response.
2. **Volatile Local State**: Keeping mutation queues in non-persistent JS memory, losing unsaved user edits on page refresh.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `logic-reviewer` · `resilience-reviewer` · `architecture-reviewer`**

### ✅ Pre-Flight Self-Audit

```
✅ Are user actions reflected instantly in local UI state?
✅ Is the mutation queue persisted in IndexedDB/SQLite for offline durability?
✅ Are all server API mutations idempotent with client-generated UUID keys?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
