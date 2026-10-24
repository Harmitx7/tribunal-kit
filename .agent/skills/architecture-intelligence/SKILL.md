---
name: architecture-intelligence
description: "Use when analyzing, extracting, verifying, diffing, or simulating blast radius and security trust boundaries for software architectures."
version: 1.0.0
last-updated: 2026-09-29
skills:
  - architecture
  - codebase-design
  - security-auditor
  - tdd-workflow
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/architecture_extractor.js
  - .agent/scripts/architecture_verifier.js
  - .agent/scripts/blast_radius_engine.js
  - .agent/scripts/architecture_diff.js
  - .agent/scripts/architecture_health.js
  - .agent/scripts/architecture_visualizer.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "architecture"
  - "intelligence"
  - "analyzing"
  - "extracting"
---

# Architecture Intelligence — Verifiable Topology & Impact Engine

## Prime Directive
Architecture is not a decorative drawing. It is an **executable, verifiable Evidence Graph**.
Never accept unverified architecture claims or hallucinated connections. Every edge must be grounded in real code AST, routes, database queries, or configuration evidence.

## Mandatory Pre-Flight Context Inspection
1. **Fact Graph Authority**: Read `.agent/history/architecture-model.json`.
2. **Provenance Check**: Verify that cited files, lines, and symbols exist in ground-truth source.
3. **Epistemic Confidence**: Distinguish L1 Facts (proven in code) from L4/L5 Speculation.
4. **Trust Boundary Isolation**: Verify whether changes cross trust zones (Public, DMZ, Authenticated, Datastore).
5. **Blast Radius Impact**: Compute direct and transitive downstream dependents before approving edits.

## CLI Execution
```bash
# Fact model extraction
tk arch map

# Zero-trust ground-truth verification
tk arch verify

# Blast radius impact calculation
tk arch impact <component-or-file>

# Semantic architecture diff (Base vs Head)
tk arch diff <base-model.json> <head-model.json>

# Architectural health, cycle & SPOF audit
tk arch audit

# Multi-projection interactive visual explorer
tk arch project [--open]
```


## Verification (Auto-Remediated)

- [ ] **Verify Execution**: Ensure the output matches the original task requirements.
- [ ] **Safety Check**: Validate that no destructive actions occurred outside the requested scope.
