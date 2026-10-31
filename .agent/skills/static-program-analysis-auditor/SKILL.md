---
name: static-program-analysis-auditor
description: "Use when inspecting AST syntax trees, control-flow graphs, data-flow reachability, dead branches, and unsafe operations."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - data-validation-schemas
tools: Read, Grep, Glob, Bash
scripts-binding:
  - src/verification/index.js
inputs:
  source_files: "array"
  analysis_options: "object"
outputs:
  ast_defects: "array"
  dead_branches: "array"
  type_inconsistencies: "array"
trigger:
  - "static program analysis"
  - "ast code audit"
  - "control flow analysis"
  - "data flow reachability"
  - "dead code detection"
  - "static-program-analysis-auditor"
---

# Static Program Analysis Auditor

## Mandatory Pre-Flight Context Inspection
Before conducting static program analysis on source code, inspect these 5 critical parameters:
1. **Concrete Evidence Standard**: Distinguish confirmed semantic defects backed by AST or reachability proof from heuristic linter warnings.
2. **Control-Flow Graph (CFG) Inspection**: Trace branch conditions, early returns, loops, and catch blocks to detect unreachable branches.
3. **Data-Flow & Taint Tracking**: Trace untrusted external data from source inputs to sinks (filesystem, database, shell, DOM).
4. **Nullability & Type Inconsistencies**: Inspect parameter passing and return types for potential null/undefined dereferences.
5. **Tool Scope & Exclusion Recording**: Record analyzer versions, configuration flags, and explicit file exclusions to prevent unverified claims.

## Activation Boundaries
- **Activate when:** Auditing source files for dead branches, analyzing complex nested control flow, verifying AST node patterns, or investigating suspicious data flow.
- **DO NOT activate when:** Auditing runtime memory leakage with profiling tools (use `performance-profiling`).

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **AST Extraction** | Parse target files into syntax trees; enumerate declarations, branches, and calls. | Fast / Standard / Deep |
| **Pass 2** | **Reachability Analysis** | Analyze conditional paths; flag constant conditional traps (e.g. `if (false)`). | All Modes |
| **Pass 3** | **Data-Flow Taint Audit** | Trace variable assignments from input arguments to sensitive sink invocations. | Standard / Deep |
| **Pass 4** | **Nullability & Resource Check**| Inspect open handles, streams, and null dereference hazards across branches. | All Modes |
| **Pass 5** | **Findings Synthesis** | Emit structured static analysis findings with exact file line numbers and AST code snippets. | Standard / Deep |

## Verification Command
```bash
npx jest test/unit/verification_contract.test.js
```
