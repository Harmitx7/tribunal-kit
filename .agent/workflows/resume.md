---
name: resume
description: "Resume a recoverable Tribunal Kit session from the durable event log."
version: 1.1.0
required-skills:
  - resume
  - agent-recovery-and-resume-auditor
scripts-binding:
  - .agent/scripts/session_manager.js
---

# /resume — Session Recovery & State Rehydration

$ARGUMENTS

---

## Mandatory Pre-Flight Context Inspection

Before resuming an interrupted or crashed workflow:
1. Validate durable event log integrity at `.agent_session.json` or `.agent/.tribunal/session.jsonl`.
2. Inspect cryptographic checkpoint hash against repository HEAD.
3. Check for external drift or concurrent manual modifications since the interruption.

---

## Phase 1 — Validation & Checkpoint Parsing

1. Parse session history and identify the last uncommitted or interrupted wave.
2. Verify state machine invariants: transition from `INTERRUPTED` or `BLOCKED` to `RETRYING`.
3. Separate idempotent tasks (analysis, code generation) from non-idempotent operations (DB migrations, API dispatches).

---

## Phase 2 — Rehydration & Context Reconstruction

1. Replay verified deterministic pure functions to reconstruct intermediate state models.
2. Hydrate agent working memory without re-running completed, validated subtasks.
3. Identify dependent stages downstream from the interrupted node.

---

## Phase 3 — Resumption Execution

1. Resume execution precisely at the interrupted subtask.
2. Pass fresh context summaries rather than unbounded raw event logs.
3. Enforce maximum retry limits (capped at 3 recovery attempts per failure).

---

## Error Recovery & Safety Boundaries

- **State Corruption**: If checkpoint SHA-256 fails verification, reject automatic resume and alert user.
- **Side-Effect Guard**: Never replay non-idempotent side effects without explicit Human Gate approval.
- **Repeated Failure**: After 3 failed resumption attempts, mark workflow as terminal `FAILED` and emit diagnostic dossier.

---

## Final Verification & Exit Criteria

- [ ] Checkpoint recovered and verified.
- [ ] Interrupted subtask resumed and completed with evidence.
- [ ] Dependent downstream tasks successfully executed.
