---
name: agent-recovery-and-resume-auditor
description: "Use when verifying workflow checkpoint integrity, recovering after process restart, reconciling side effects, and preventing duplicated actions."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - error-resilience
tools: Read, Grep, Glob, Bash, Write
scripts-binding:
  - src/runtime_reliability/checkpoint_recovery_engine.js
  - src/runtime_reliability/index.js
inputs:
  checkpoint_file: "string"
  runtime_code_revision: "string"
outputs:
  recovery_plan: "object"
  checkpoint_integrity_status: "string"
  reconciliation_findings: "array"
trigger:
  - "agent recovery audit"
  - "checkpoint resume verification"
  - "process restart recovery"
  - "checkpoint integrity hash"
  - "side effect reconciliation"
  - "agent-recovery-and-resume-auditor"
---

# Agent Recovery & Resume Auditor

## Mandatory Pre-Flight Context Inspection
Before auditing workflow recovery and resumption, inspect these 5 critical parameters:
1. **Cryptographic Checkpoint Integrity**: Verify that checkpoint files match their SHA-256 integrity hash using constant-time comparisons.
2. **Schema & Code Version Compatibility**: Reject checkpoints with unsupported schema versions or incompatible code revisions.
3. **Task Completion Reconciliation**: Isolate completed tasks from pending tasks to prevent repeating already finalized work.
4. **Idempotency Token Re-Assertion**: Ensure cached idempotency tokens are restored so retried tasks do not execute non-idempotent side effects.
5. **Atomic Checkpoint Persistence**: Confirm that checkpoints are written to disk using temporary files and atomic rename operations.

## Activation Boundaries
- **Activate when:** Resuming interrupted multi-step workflows, inspecting recovery snapshots, verifying crash recovery, or auditing checkpoint storage.
- **DO NOT activate when:** Auditing model fallbacks (use `agent-fallback-and-degradation-auditor`).

## Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Checkpoint Discovery** | Locate and read candidate checkpoint snapshots from storage directories. | Fast / Standard / Deep |
| **Pass 2** | **Integrity Hash Validation** | Recompute SHA-256 digest and verify timing-safe equality against declared hash. | All Modes |
| **Pass 3** | **Compatibility & Version Check**| Check `schemaVersion` and `codeRevision` against current runtime capabilities. | Standard / Deep |
| **Pass 4** | **Reconciliation Planning** | Partition tasks into already-completed and pending sets; filter out duplicates. | All Modes |
| **Pass 5** | **Findings & Plan Emission** | Emit `CORRUPT_CHECKPOINT` findings on tamper or output safe resumption plan. | Standard / Deep |

## Verification Command
```bash
node -e "const { CheckpointRecoveryEngine } = require('./src/runtime_reliability'); console.log('Recovery engine operational');"
```
