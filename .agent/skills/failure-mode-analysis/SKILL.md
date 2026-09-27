---
name: failure-mode-analysis
description: 'Evaluates the blast radius and cascading failure potential of architectural changes.'
version: 1.1.0
last-updated: 2026-09-26
skills:
  - fabel-protocol
---

# Failure Mode Analysis Skill

Use this skill when evaluating an architecture or an implementation for reliability.

## 🔴 Hallucination Traps

- ❌ **Inventing Metrics** → ✅ Do not guess the impact. Use `UNKNOWN` if capacity bounds are not provided.
- ❌ **Assuming Perfect Recovery** → ✅ Assume retries will fail, connections will drop, and cache will be cold.
- ❌ **Ignoring Blast Radius** → ✅ A single failing API call can take down an entire Node.js event loop. Verify asynchronous boundaries.

## 🚪 Socratic Gate (Pre-Flight)

Before producing a failure mode analysis, you MUST ask the user:

1. What is the expected Recovery Time Objective (RTO)?
2. What are the expected peak requests per second (RPS)?
   If the user says "I don't know", proceed with defensive MVP defaults (e.g. 100 RPS).

## 💥 Failure Injection & Analysis Steps

For each core component (DB, Redis, External API):

1. **Failure Injection**: Assume the component goes down completely.
2. **Detection**: How long until the system knows it's failing? (Are there timeouts configured?)
3. **Propagation**: Does this block other services? (e.g., Thread pool exhaustion, retry storms).
4. **Blast Radius**: Which users or subsystems are affected?
5. **Recovery**: How does the system recover when the component returns? (e.g., Cache stampede).

## 🛡️ Verification-Before-Completion (VBC)

Output a strict **Risk Matrix** for each component:

```yaml
component: '[Name]'
failure: '[Scenario]'
detection_time: '[e.g. 30s timeout]'
blast_radius: '[Scope of failure]'
mitigation: '[e.g. Circuit Breaker, Fallback]'
```
