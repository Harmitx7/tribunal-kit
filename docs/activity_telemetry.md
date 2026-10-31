# Tribunal-Kit Live Progress & Execution Telemetry Engine (Phase 5)

## Overview

Phase 5 upgrades Tribunal-Kit's activity presentation layer into an authoritative real-time execution progress reporting and telemetry engine.

The engine communicates honest, evidence-grounded progress across AI coding interfaces (Antigravity, Claude Code, Cursor, Windsurf, Copilot, Codex) without fabricating artificial percentages, flooding chat streams with repetitive ticks, slowing down agent execution, or mutating existing orchestration and review logic.

---

## 1. Operating Principles

1. **Observational Telemetry**: Telemetry observes and formats execution reality. It never alters reviewer execution order, agent routing, permission checks, or retry policies.
2. **Zero Fabricated Progress**: Unmetered or indeterminate tasks (unknown total items or non-authoritative bounds) are explicitly reported as unmetered (`Status: In progress (unmetered)`). Percentage is strictly `null`.
3. **No Premature 100%**: A progress percentage never reports 100% until authoritative terminal completion is confirmed.
4. **Immediate Critical Event Bypass**: Critical operational milestones (failures, approvals, blocks, cancellations, completions, stalls) immediately bypass coalescing buffers and flush synchronously.
5. **Anti-Resurrection & Stale Protection**: Updates carrying older sequence numbers or arriving after an operation's terminal receipt are discarded. Late events cannot resurrect a completed or cancelled operation.
6. **Leak-Free Timer Management**: All background intervals and timeouts use `.unref()` and are deterministically cleared upon task completion or disposal.

---

## 2. Authoritative Progress States

Execution progress is governed by 9 authoritative states:

| State | Status | Description |
|---|---|---|
| `queued` | `pending` | Task has been scheduled or enqueued, awaiting worker availability |
| `starting` | `running` | Initialization, container spin-up, or worker handshake in progress |
| `running` | `running` | Actively executing work (metered or unmetered) |
| `waiting` | `waiting` | Suspended awaiting human gate approval, rate limiter window, or upstream dependency |
| `completed` | `passed` / `completed` | Terminal state: work finished and verified against acceptance criteria |
| `failed` | `failed` | Terminal state: work halted due to unrecoverable error or test failure |
| `cancelled` | `cancelled` | Terminal state: work cancelled by user or upstream supervisor |
| `interrupted` | `failed` | Terminal state: abnormal process termination or subprocess crash |
| `unknown` | `warning` | Telemetry or heartbeat data insufficient to assert definitive state |

---

## 3. Progress Calculation & Percentage Integrity

The `ProgressCalculator` guarantees mathematical invariants for progress updates:

```javascript
const { ProgressCalculator } = require('tribunal-kit/activity');

// Metered progress
const metered = ProgressCalculator.calculate({ current: 45, total: 100, unit: 'tests' });
// => { current: 45, total: 100, percentage: 45, unit: 'tests', isAuthoritative: true }

// Unmetered progress (total unknown)
const unmetered = ProgressCalculator.calculate({ current: null, total: null });
// => { current: null, total: null, percentage: null, unit: 'steps', isAuthoritative: false }
```

### Invariants Enforced:
- **Bounds Check**: Throws `TelemetryError` if `current > total`.
- **Terminal Confirmation Guard**: When `requireTerminalConfirmation: true` and `isTerminal: false`, percentage is capped at 99% even if `current === total` (preventing premature 100% claims before teardown).
- **Monotonic Progress**: When `previousPercentage` is provided, percentage never regresses within the same execution attempt.

---

## 4. Low-Noise Event Coalescer (`ProgressCoalescer`)

High-frequency progress loops (e.g., 50–100 progress ticks/sec during AST traversal, linting, or fast unit test suites) can flood chat transcripts and degrade UI responsiveness.

`ProgressCoalescer` buffers rapid progress ticks over a configurable sliding window (default: 50ms):

```javascript
const { ProgressCoalescer, EVENT_TYPES } = require('tribunal-kit/activity');

const coalescer = new ProgressCoalescer({
  windowMs: 50,
  maxBurstSize: 100,
  onFlush: (event) => console.log('Dispatched:', event),
});

// Pushes 50 rapid progress updates
for (let i = 1; i <= 50; i++) {
  coalescer.push({
    eventType: EVENT_TYPES.PROGRESS_UPDATED,
    operationId: 'op_lint',
    progress: { current: i, total: 50 },
  });
}
// Flushes exactly 1 coalesced progress update with sampleCount: 50 and calculated velocity
```

### Critical Event Bypass:
When a critical operational event occurs (`validation_failed`, `approval_required`, `operation_blocked`, `operation_completed`, `stall_suspected`):
1. Any buffered progress ticks for that operation are immediately flushed.
2. The critical event is dispatched synchronously without delay.

---

## 5. Stall Detector & Suspicion Telemetry (`StallDetector`)

When long-running operations execute without emitting activity, developers cannot distinguish between a frozen subprocess and an active, compute-heavy task.

`StallDetector` tracks heartbeats and emits non-fatal `stall_suspected` telemetry:

```javascript
const { StallDetector } = require('tribunal-kit/activity');

const detector = new StallDetector({
  stallThresholdMs: 30000, // 30s silence threshold
  checkIntervalMs: 5000,
  onStall: (stallEvent) => {
    // Dispatches warning with diagnostic suggestion
  },
});

detector.startMonitoring('op_build', { title: 'Native Binary Build' });

// Periodically record heartbeat from child process
detector.heartbeat('op_build');

// Expected waiting states (e.g. human approval gate) are NOT flagged as stalls
```

### Diagnostic Output:
```markdown
⚠ **Stall Suspected** · Native Binary Build
  No activity detected for 32s. The underlying subprocess or reviewer pipeline may be blocked or unmetered.
  Next: Verify process liveness, check subprocess stderr, or confirm network/gate availability
```

---

## 6. Composite Parallel Progress Aggregator (`ParallelProgressAggregator`)

For multi-worker waves and parallel review pipelines, `ParallelProgressAggregator` computes composite execution health across child tasks:

```javascript
const { ParallelProgressAggregator, AGGREGATION_POLICIES, PROGRESS_STATES } = require('tribunal-kit/activity');

const aggregator = new ParallelProgressAggregator({
  parentOperationId: 'orchestrator_wave_1',
  policy: AGGREGATION_POLICIES.ALL_MUST_PASS, // Strict policy
  optionalSubtasks: ['optional_perf_benchmark'],
});

aggregator.registerChild('worker_security', { name: 'Security Review' });
aggregator.registerChild('worker_logic', { name: 'Logic Review' });

aggregator.updateChildProgress('worker_security', { current: 10, total: 10 });
aggregator.updateChildState('worker_security', PROGRESS_STATES.COMPLETED);

const snapshot = aggregator.getSnapshot();
// => { overallState: 'running', counts: { completed: 1, running: 1 }, progress: { ... } }
```

### Pluggable Aggregation Policies:
1. `ALL_MUST_PASS`: Strict policy. If any non-optional child fails, the parent is immediately marked `failed`.
2. `PERMIT_PARTIAL_SUCCESS`: Permits partial success if all required tasks pass and overall completed ratio meets `partialSuccessThreshold` (e.g., 0.8).
3. `ANY_PASS`: Composite passes if at least 1 child task completes successfully.

### Out-of-Order & Stale Event Protection:
- Incoming child updates carry `sequenceNum`. Updates with `sequenceNum <= child.lastSequenceNum` are dropped.
- Once a child reaches a terminal state (`completed`, `failed`, `cancelled`), subsequent non-terminal updates cannot resurrect it.

---

## 7. Performance & Benchmark Results

Benchmarked via `node scripts/benchmark_activity_telemetry.js` under high load:

| Component | Benchmark Metric | Result |
|---|---|---|
| `ProgressCalculator` | Throughput (50k rounds) | **6,001,825 ops/sec** (8.33 ms total) |
| `ProgressCoalescer` | Burst throughput & noise suppression | **981,239 ticks/sec** (99.98% chat noise eliminated) |
| `StallDetector` | Heartbeat update speed | **3,169,431 ops/sec** |
| `StallDetector` | Periodic scan overhead (1,000 active ops) | **0.473 ms** total check time |
| `ParallelProgressAggregator` | Composite multi-worker waves | **253,855 subtasks/sec** (2,000 subtasks in 7.88 ms) |

---

## 8. Integration with ActivityTracker

`ActivityTracker` provides first-class methods for Phase 5 telemetry:

```javascript
const tracker = new ActivityTracker({
  title: 'Database Migration & Indexing',
  enableCoalescing: true,
  enableStallDetection: true,
});

// Coalesce rapid progress updates
tracker.coalesceProgress({ current: 50, total: 100, unit: 'tables' });

// Send heartbeat
tracker.heartbeat({ state: 'running' });

// Spawn parallel subtask aggregator
const parallelAggregator = tracker.createParallelAggregator({
  autoTrackProgress: true,
});

// Clean disposal
tracker.complete('Migration finished');
tracker.dispose();
```

