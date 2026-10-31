---
name: multi-agent-trust-boundary-auditor
description: "Use when auditing multi-agent delegation channels, privilege inheritance, circular approvals, and cross-agent finding tampering."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - data-validation-schemas
tools: Read, Grep, Bash
scripts-binding:
  - src/security/multi_agent_governance_engine.js
  - src/security/index.js
inputs:
  delegation_tree: "object"
  agent_roles: "array"
outputs:
  delegation_safe: "boolean"
  privilege_leaks: "array"
  circular_loops: "array"
trigger:
  - "multi agent trust"
  - "agent delegation audit"
  - "privilege inheritance check"
  - "circular approval audit"
  - "swarm trust boundary"
  - "multi-agent-trust-boundary-auditor"
---

# Multi-Agent Trust Boundary Auditor

## Mandatory Pre-Flight Context Inspection
Before dispatching or orchestrating subagent swarms, inspect these 5 critical parameters:
1. **Privilege Ceiling Invariant**: Subagents cannot possess or acquire capabilities exceeding their delegating parent agent.
2. **Circular Delegation Detection**: Verify that agent delegation topologies are directed acyclic graphs (DAGs) without circular approval loops.
3. **Reviewer Independence**: Ensure reviewing agents operate independently without self-review or cross-agent collision on findings.
4. **Non-Masking Consensus Enforcement**: Enforce that a critical vulnerability finding cannot be suppressed by a majority vote of non-critical approvals.
5. **Human Gate Adjudication**: Trigger Zone 0 human adjudication whenever specialist reviewers produce contradictory pass/fail verdicts on the same change.

## Activation Boundaries
- **Activate when:** Orchestrating multi-agent workflows, reviewing subagent capability dispatches, validating consensus across tribunal reviewers, or merging code.
- **DO NOT activate when:** Auditing single-file prompt injection without delegation (use `prompt-injection-security-auditor`).

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Topology Traversal** | Traverse agent delegation hierarchy using `auditDelegationHierarchy`. | Fast / Standard / Deep |
| **Pass 2** | **Privilege Ceiling Check** | Check child capabilities against parent capabilities; flag unauthorized expansions. | All Modes |
| **Pass 3** | **Circular Loop Audit** | Detect recursive approval or delegation loops (`A -> B -> A`). | Standard / Deep |
| **Pass 4** | **Consensus & Contradiction** | Audit reviewer finding lists using `auditReviewerConsensus`; flag contradictory verdicts. | All Modes |
| **Pass 5** | **Governance Gate** | Emit governance status; block release if critical findings or circular loops exist. | Standard / Deep |

## Verification Command
```bash
npx jest test/unit/ai_security_multi_agent.test.js
```

