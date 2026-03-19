---
name: local-first
description: Local-first software principles. Offline-capable apps, CRDTs, sync engines (ElectricSQL, Replicache, Zero), conflict resolution, and the migration path from REST-first to local-first architecture. Use when building apps that need offline support, fast UI, or collaborative editing.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-12
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Local-First Software Principles

> In a local-first app, the network is an enhancement, not a requirement.
> The app works fully offline. Sync happens in the background when possible.

---

## The Local-First Promise

Local-first apps satisfy all of these simultaneously — traditional web apps satisfy none:

```
✅ Fast UI       — reads from local replica, never waits for network
✅ Offline use   — full functionality without internet
✅ Collaboration — multiple users edit the same data
✅ Privacy       — data lives on device by default
✅ Longevity     — app works even if vendor servers go down
```

---

## Architecture Spectrum

```
REST-First (most apps today):
  Client → HTTP → Server → DB
  Offline: ❌  Speed: Network-bound  Collaboration: Manual

Optimistic UI (halfway):
  Client → Local cache → HTTP → Server → DB
  Offline: Partial  Speed: Fast for reads  Collaboration: Conflict-prone

Local-First:
  Client → Local replica (SQLite/CRDT) → Sync engine ↔ Server → DB
  Offline: ✅  Speed: Instant  Collaboration: ✅ via CRDTs
```

---

## Sync Engine Selection

Choose based on your database, team size, and product requirements:

| Engine | Sync Model | Database | Best For |
|---|---|---|---|
| **ElectricSQL** | Postgres → SQLite on client | PostgreSQL only | Postgres-native teams |
| **Replicache** | Mutation log + pull | Any backend | Custom sync logic needed |
| **Zero (Rocicorp)** | Reactive queries | PostgreSQL | Real-time apps, Figma-speed UIs |
| **Liveblocks** | CRDT + storage API | Managed | Collaborative SaaS (no own server) |
| **Yjs + y-indexeddb** | CRDT + local persistence | Any | Text editing, whiteboard |

---

## CRDT Choices

CRDTs (Conflict-free Replicated Data Types) resolve concurrent edits mathematically — no server arbitration needed:

| CRDT Type | Use For | Library |
|---|---|---|
| **LWW Register** | Scalar values (settings, status) | Built-in or custom |
| **G-Counter** | Incrementing counters (likes, views) | Custom |
| **OR-Set** | Sets that support add + remove | Yjs `Y.Array` |
| **Y.Text** | Collaborative rich text | Yjs |
| **Y.Map** | Shared key-value state | Yjs |

```ts
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

const doc = new Y.Doc();

// Persist to IndexedDB — survives page reload, works offline
new IndexeddbPersistence('my-doc-id', doc);

// Shared text — any concurrent edits from any user auto-merge
const text = doc.getText('content');
text.insert(0, 'Hello ');  // User A
text.insert(6, 'World');   // User B — concurrent, no conflict
// Result: "Hello World" — always correct, always the same
```

---

## Optimistic UI Patterns

Before full local-first, optimistic UI gives most of the speed benefit:

```ts
// ❌ Pessimistic — user waits for server response before any UI update
async function likePost(postId: string) {
  const updated = await api.likePost(postId);  // 200ms wait → UI freezes
  setPost(updated);
}

// ✅ Optimistic — update UI immediately, sync in background
async function likePost(postId: string) {
  // 1. Instant UI update
  setPost(prev => ({ ...prev, likes: prev.likes + 1, liked: true }));

  try {
    // 2. Sync to server in background
    await api.likePost(postId);
  } catch {
    // 3. Rollback on failure
    setPost(prev => ({ ...prev, likes: prev.likes - 1, liked: false }));
    toast.error('Failed to like post');
  }
}
```

---

## Conflict Resolution Strategies

When two users edit the same data offline and then sync:

| Strategy | When to Use | Downside |
|---|---|---|
| **Last-Write-Wins (LWW)** | Settings, preferences | Concurrent edits silently overwrite each other |
| **First-Write-Wins** | Booking/reservation slots | Rejecters unhappy, complex UX |
| **CRDT merge** | Text, lists, collaborative state | Complex to implement from scratch — use Yjs |
| **3-way merge** | Code files, configs | Requires common ancestor to compute diff |
| **User-prompted resolution** | Critical data (contracts) | Adds friction but preserves intent |

---

## Migration Path: REST → Local-First

Don't try to go from REST to full local-first in one step:

```
Phase 1: Optimistic UI
  → Client mutates locally, syncs async
  → Easy win: 200ms → 0ms perceived latency
  → Risk: conflicts on concurrent updates

Phase 2: Offline Detection + Queue
  → Queue mutations when offline
  → Apply queue on reconnect
  → Risk: conflict ordering

Phase 3: CRDT-backed Shared State
  → Replace mutable shared data with CRDTs
  → Full offline + collaboration
  → No more conflicts
```

---

## Output Format

When this skill produces or reviews code, structure your output as follows:

```
━━━ Local First Report ━━━━━━━━━━━━━━━━━━━━━━━━
Skill:       Local First
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
**Active reviewers: `logic` · `security`**

### ❌ Forbidden AI Tropes in Local-First

1. **Treating CRDTs as magic** — CRDTs solve concurrent edits to shared state, not schema migrations or access control.
2. **Inventing CRDT libraries** — `crdt-js`, `conflict-free`, `local-sync` are not real packages. Yjs, Automerge, and Loro are the real libraries.
3. **Skipping conflict detection in LWW** — Last-Write-Wins silently drops data. Always make the conflict resolution strategy explicit and communicate it to the user.
4. **Local storage for everything** — `localStorage` is synchronous, has a 5MB limit, and is not available in workers. Use IndexedDB via Dexie or Origin Private File System.

### ✅ Pre-Flight Self-Audit

```
✅ Is the conflict resolution strategy explicit and documented?
✅ Are only real CRDT libraries used (Yjs, Automerge, Loro)?
✅ Is offline state persisted to IndexedDB, not localStorage?
✅ Is the sync queue replay idempotent (safe to process the same mutation twice)?
✅ Does the UI clearly communicate offline/syncing/synced state to the user?
```
