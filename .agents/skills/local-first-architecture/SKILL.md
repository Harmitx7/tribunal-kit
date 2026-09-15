---
name: local-first-architecture
description: Use when Local-first architecture guidance for instant-feeling web & desktop apps, optimistic updates, IndexedDB sync engines, offline operation, and Conflict-free Replicated Data Types (CRDTs).
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

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `local-first-architecture` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Local-first architecture guidance for instant-feeling web & desktop apps, optimistic updates, IndexedDB sync engines, offline operation, and Conflict-free Replicated Data Types (CRDTs).
- **DO NOT activate when:** The task falls outside the `local-first-architecture` domain or is managed by a different dedicated specialist.

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

| Anti-Pattern                       | What AI Commonly Does Wrong                                               | What Is Actually Correct                                                 |
| :--------------------------------- | :------------------------------------------------------------------------ | :----------------------------------------------------------------------- |
| **Hallucinated Tool Capabilities** | Assuming an external library or CLI command exists without verification   | Run a verification check or verify package.json before referencing tools |
| **Premature Completion Claim**     | Declaring a task finished because code was generated without verification | Execute tests, linters, or terminal commands to provide concrete proof   |
| **Context Bloat Dumping**          | Pasting entire multi-thousand-line files into prompt context              | Extract targeted excerpts, symbols, and signatures to preserve tokens    |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `orchestrator` · `agent-organizer` · `logic-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

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
