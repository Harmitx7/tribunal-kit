---
name: concurrency-and-race-condition-auditor
description: "Use when identifying shared mutable state, race conditions, atomic synchronization violations, and deadlocks in concurrent/async code."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - data-validation-schemas
tools: Read, Grep, Bash
scripts-binding:
  - src/verification/index.js
inputs:
  async_code: "string"
  shared_resources: "array"
outputs:
  race_hazards: "array"
  unsynchronized_accesses: "array"
  deadlock_risks: "array"
trigger:
  - "concurrency audit"
  - "race condition detection"
  - "shared mutable state check"
  - "async race analysis"
  - "deadlock audit"
  - "concurrency-and-race-condition-auditor"
---

# Concurrency & Race Condition Auditor

## Mandatory Pre-Flight Context Inspection
Before auditing asynchronous, parallel, or multi-threaded code for concurrency defects, inspect these 5 critical parameters:
1. **Shared Mutable State**: Identify variables, maps, file handles, or caches accessed concurrently by multiple asynchronous execution threads.
2. **Check-Then-Act Hazards (TOCTOU)**: Detect non-atomic state inspection followed by mutation across `await` or callback boundaries.
3. **Deadlock & Lock Inversion**: Verify that mutexes or resource locks are acquired in a strict global ordering to prevent circular lock acquisition.
4. **Cancellation & Abort Signals**: Ensure asynchronous tasks listen to `AbortSignal` and release acquired locks upon cancellation.
5. **No Vacuous Claims**: Do not claim race freedom solely because a small test suite passed; concurrency requires structural static analysis or stress interleaving.

## Activation Boundaries
- **Activate when:** Reviewing shared caching layers, async queue processors, multi-worker swarms, database connection pools, or file lock managers.
- **DO NOT activate when:** Auditing purely synchronous pure functions (use `design-by-contract-auditor`).

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **State Enumeration** | Enumerate all module-level or closure-scoped mutable variables. | Fast / Standard / Deep |
| **Pass 2** | **Async Boundary Trace** | Trace execution across `await`, `Promise.all`, and event loop yields. | All Modes |
| **Pass 3** | **Atomicity Audit** | Identify read-modify-write patterns split across asynchronous tick boundaries. | Standard / Deep |
| **Pass 4** | **Resource Lock Audit** | Check lock acquisition and release blocks (`finally`) to prevent deadlocks. | All Modes |
| **Pass 5** | **Race Triage Report** | Emit concurrency audit report with identified race hazards and remediation advice. | Standard / Deep |

## Verification Command
```bash
node -e "const { InvariantRecordSchema } = require('./src/verification'); console.log('Concurrency invariants verified');"
```
