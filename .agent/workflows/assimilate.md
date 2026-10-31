---
name: assimilate
description: "Trigger the learning pipeline to extract, validate, and store Tribunal Instincts."
version: 1.1.0
required-skills:
  - assimilate
  - tribunal-instincts-memory
  - clean-code
scripts-binding:
  - .agent/scripts/memory_archivist.js
  - .agent/scripts/engineering_memory.js
---

# /assimilate — Autonomous Learning & Instinct Synthesis

$ARGUMENTS

---

## Mandatory Pre-Flight Context Inspection

Before assimilating session logs into permanent engineering instincts:
1. Confirm session log exists (`.agent/.tribunal/session.jsonl` or `.agent_session.json`).
2. Verify read-only access to historical logs; prevent mutation of active session events.
3. Require evidence-backed proof before persisting any candidate instinct.

---

## Phase 1 — Extraction & Log Parsing

1. Discover latest session traces using `memory_archivist.js`.
2. Extract operational sequences: errors encountered, hypothesis iterations, and code changes that caused tests to pass.
3. Filter out transient network drops or environment anomalies; isolate logic and design corrections.

---

## Phase 2 — Instinct Formulation & Evidence Verification

1. Synthesize candidate "Tribunal Instincts" mapping `[Problem Pattern] → [Root Cause] → [Verified Remedy]`.
2. Verify against test results: Instinct must have authoritative passing test evidence from the active session.
3. Reject speculative or hallucinated insights lacking disk evidence.

---

## Phase 3 — Storage & Index Updating

1. Append verified instincts to `.agent/instincts.json` with cryptographic SHA-256 event fingerprint.
2. Update indexing in `context_broker.js` so future matching prompts retrieve relevant instincts.
3. Bound storage budget: Maximum 500 active instincts with LRU eviction for superseded patterns.

---

## Error Recovery & BLOCKED Protocol

- **Missing Session Log**: Yield `BLOCKED: No session events found to assimilate`.
- **Inconclusive Evidence**: Reject candidate instincts with `UNVERIFIED: Fix lacked passing assertion evidence`.
- **Parse Failure**: Halt gracefully without corrupting existing `instincts.json`.

---

## Final Verification & Exit Criteria

- [ ] New instincts successfully validated against test evidence.
- [ ] `instincts.json` schema validation passes.
- [ ] No regression or corruption of prior learned instincts.
