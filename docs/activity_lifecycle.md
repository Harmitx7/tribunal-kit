# Tribunal-Kit Activity Intelligence & State Tracking Engine (Phase 2)

## Overview

Phase 2 builds an event-driven operational lifecycle and state tracking engine on top of Phase 1's canonical activity-event contract and renderer foundation.

Rather than relying on improvised status messages, speculative narration, or terminal-leaking status strings, Tribunal-Kit operations maintain authoritative state, deterministic transition boundaries, hierarchical correlation, and non-regressing progress intelligence.

---

## Canonical Lifecycle State Model

An operation exists in exactly one lifecycle state at any point in time:

| State | Semantic Meaning | Terminal? | Allowed Target States |
|---|---|---|---|
| `pending` | Operation registered but execution has not begun | No | `pending`, `running`, `cancelled` |
| `running` | Actively executing tasks, analyses, or subprocesses | No | `running`, `waiting`, `blocked`, `retrying`, `completed`, `failed`, `cancelled` |
| `waiting` | Paused awaiting external input, network reply, or child completion | No | `waiting`, `running`, `blocked`, `failed`, `cancelled` |
| `blocked` | Halted on an unmet dependency or mandatory human approval gate | No | `blocked`, `running`, `failed`, `cancelled` |
| `retrying` | Preparing or backing off prior to launching a retry attempt | No | `retrying`, `running`, `failed`, `cancelled` |
| `completed` | Successfully finished operation | **Yes** | `completed` (idempotent confirmation) |
| `failed` | Terminated with unrecoverable failure | **Yes\*** | `failed`, `retrying` (\*only when retry initiated) |
| `cancelled` | Aborted by human operator or timeout | **Yes** | `cancelled` (idempotent confirmation) |

### Transition Invariants

1. **Terminal Immutability**: `completed` and `cancelled` operations cannot transition to any active state.
2. **Started Before Terminated**: A `pending` operation cannot jump directly to `completed`, `failed`, `waiting`, `blocked`, or `retrying` without running.
3. **No Phantom Retries**: An operation in `failed` state can only transition to `retrying` when an explicit retry is initiated with attempt context. It can never jump directly to `running` or `completed`.
4. **Strict Boundary Enforcement**: Attempting an illegal transition throws `IllegalStateTransitionError` with the offending `fromState`, `toState`, and `operationId`.

---

## Operation Registry Architecture

The `OperationRegistry` maintains active and historical operation records in memory, providing structured queries, hierarchical correlation, and bounded memory retention.

### OperationRecord Schema

- `operationId`: Alphanumeric canonical identifier (`/^[a-zA-Z0-9_\-\.]{3,64}$/`).
- `parentOperationId`: Optional parent identifier linking child subtasks.
- `childOperationIds`: Array of registered child operation identifiers.
- `title`: Operational title.
- `status`: Current `LifecycleState`.
- `phase`: Optional phase descriptor.
- `timestamps`: `{ startedAt: string, updatedAt: string, completedAt: string | null }`.
- `attempt`: Current attempt counter (1-indexed).
- `maxAttempts`: Maximum allowed attempts before permanent failure.
- `retries`: Array of preserved failure records `{ attempt, failedAt, reason, error, durationMs }`.
- `progress`: Authoritative progress object (validated for monotonicity).
- `activeAgent`: Current active agent entry `{ name, state, context, timestamp, error }`.
- `activeSkill`: Current active skill entry `{ name, state, context, timestamp, error }`.
- `agentHistory`: Chronological log of agent state transitions.
- `skillHistory`: Chronological log of skill state transitions.
- `tools`: Chronological log of tool executions `{ toolName, status, startedAt, completedAt, durationMs, resultRef, error }`.
- `evidence`: Array of verified evidence references `{ ref, hash, description, verified, collectedAt }`.
- `verified`: Boolean indicating whether authoritative verification passed.
- `events`: Array of canonical `ActivityEvent` instances correlated to this operation.
- `error`: Last observed failure `{ message, code, suggestion }`.
- `warnings`: Array of warning records `{ message, impact, detectedAt }`.
- `cancellation`: Cancellation record `{ reason, cancelledAt }`.
- `metadata`: Key-value operational metadata.

---

## Progress Intelligence & Non-Monotonic Invariant

Progress calculations reflect observed reality without synthetic or regressing metrics:

1. **Non-Monotonic Regression Guard**: Within the same execution attempt, progress counters (`current`) cannot decrease. If an operation was at 7/10, an update with 4/10 throws `ActivityProgressError`.
2. **Attempt-Bound Reset**: When an explicit retry begins (`recordRetry`), the attempt counter increments (`attempt: 2`), permitting progress to legitimately reset for the new attempt.
3. **Unmetered vs Zero Progress**:
   - **Unmetered**: Operations without a known total report `current: null`, `total: null`, `isAuthoritative: false` without synthesizing speculative percentages.
   - **Zero Progress**: Operations starting at 0 with known total report `current: 0`, `total: 10`, `percentage: 0`, `isAuthoritative: true`.
4. **Current <= Total Invariant**: Any update where `current > total` is rejected.

---

## Agent & Skill State Lifecycle

Specialist agents and skills transition through explicit states:

```
SELECTED ───► ACTIVATED ───► EXECUTING ───► FINISHED
                                   │
                                   └───► FAILED
```

- `selected`: Chosen by routing logic or recommendation heuristics.
- `activated`: Announced and initialized for current operational context.
- `executing`: Actively analyzing or calling tools.
- `finished`: Completed mandate successfully.
- `failed`: Terminated with error context.

---

## Bounded Retention & Memory Safety

To prevent memory leaks during long-running sessions, `OperationRegistry.cleanup()` enforces bounded retention:

1. **Active Protection Invariant**: Active operations (`pending`, `running`, `waiting`, `blocked`, `retrying`) are **strictly protected** and **never evicted**, regardless of age or count.
2. **TTL Expiration**: Terminal operations exceeding `completedTtlMs` (default: 1 hour) are evicted.
3. **Capacity Cap**: If completed operations exceed `maxCompletedRetention` (default: 1,000), excess operations are evicted **oldest first** by `completedAt` timestamp.

---

## Performance & Concurrency

Authoritative benchmark measurements (`benchmark_activity_lifecycle.js`):

| Operation | Throughput | Latency |
|---|---|---|
| Lifecycle Transition Checks | **16,561,364 ops/sec** | ~0.06 µs / check |
| Operation Registration & Lookup | **250,182 ops/sec** | ~4.0 µs / pair |
| Monotonic Progress Updates | **541,398 ops/sec** | ~1.8 µs / update |
| End-to-End Operational Lifecycle | **78,452 operations/sec** | ~12.7 µs / lifecycle |
| Bounded Retention Eviction | **4,500 operations evicted in <2ms** | Heap ~63 MB |
