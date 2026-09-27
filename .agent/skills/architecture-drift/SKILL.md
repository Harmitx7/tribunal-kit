---
name: architecture-drift
description: 'Identifies when the implemented code deviates from the intended architecture documented in system-model.yml.'
version: 1.1.0
last-updated: 2026-09-26
skills:
  - fabel-protocol
---

# Architecture Drift Skill

Use this skill to detect when an implementation violates intended architectural boundaries.

## 🔴 Hallucination Traps

- ❌ **Assuming Drift = Bug** → ✅ Drift might be an intentional feature addition. Ask for clarification before rejecting.
- ❌ **Guessing Boundaries** → ✅ Only use boundaries explicitly defined in `.agent/architecture/system-model.yml`.
- ❌ **Keyword Matching** → ✅ Verify actual AST/Imports. Just because a file has "redis" in a comment doesn't mean it uses Redis.

## 📋 Mandatory Pre-Flight Checklist

1. Inspect `.agent/architecture/system-model.yml`.
2. Inspect the current `review-<base>..<head>.diff` or the modified files.
3. Cross-reference new dependencies against the System Model components.

## 🔍 Analysis Steps

1. **Dependency Drift**: Check if new external dependencies are introduced (e.g., imports of a new DB client) outside of the declared model.
2. **Data Boundary Drift**: Check if data boundaries are crossed (e.g., Service A writing directly to Service B's database instead of using an API).
3. **Interface Drift**: Check for circumvention of designated APIs or contracts.

## 🛡️ Verification-Before-Completion (VBC)

Before producing your final report, you MUST structure your findings using the Tribunal evidence model:

```yaml
finding:
  category: 'Architecture Drift'
  severity: 'High'
  claim: '[Claim]'
  evidence:
    - file: '[File Path]'
      observation: '[Exact Import or Function Call]'
  recommendation: '[Fix]'
```
