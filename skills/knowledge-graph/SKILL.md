---
name: knowledge-graph
description: Use when Understands the architecture, risk blast radius, and dependencies of the codebase without token bloat. Now includes Context Snapshots for 27x token reduction.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - codebase-design
  - architecture
  - fabel-protocol
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/graph_builder.js
  - .agent/scripts/graph_zoom.js
  - .agent/scripts/verify_all.js
  - .agent/scripts/lint_runner.js
---

# /graph — Knowledge Graph Skill v3.0

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `knowledge-graph` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Understands the architecture, risk blast radius, and dependencies of the codebase without token bloat. Now includes Context Snapshots for 27x token reduction.
- **DO NOT activate when:** The task falls outside the `knowledge-graph` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass       | Phase            | Core Action                                                                                  |
| :--------- | :--------------- | :------------------------------------------------------------------------------------------- |
| **Pass 1** | **Understand**   | Deconstruct the user's explicit objective, implicit requirements, and platform constraints.  |
| **Pass 2** | **Plan**         | Decompose the task into smallest logical steps; map dependencies and required tool calls.    |
| **Pass 3** | **Execute**      | Implement the solution with production-grade craft, zero placeholders, and strict typing.    |
| **Pass 4** | **Verify**       | Run linters, unit tests, or compiler checks to validate structural correctness.              |
| **Pass 5** | **Attack**       | Perform an adversarial review searching for edge-case failures, race conditions, and traps.  |
| **Pass 6** | **Improve**      | Eliminate discovered friction, optimize performance, and harden error boundaries.            |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---

## The Token Reduction Protocol (Option C)

**DO NOT READ RAW SOURCE FILES IF A SNAPSHOT EXISTS.**
Reading raw project files wastes up to 50,000 tokens per edit. You must use the pre-computed Context Snapshots instead. These snapshots contain the file's content, resolved imports, dependent files, and risk scores all in one JSON blob.

## Pre-Flight Checklist

- [ ] Have I run the Macro Mapper to generate the latest Context Snapshots?
- [ ] Am I reading from `.agent/history/snapshots/` instead of directly grepping the project?
- [ ] Have I respected the `blastRadius` before modifying a file?

## Execution Protocol

1. **Step 1: The Macro Map (Blast Radius & Snapshot Engine)**
   Execute the graph builder to map module boundaries and compute downstream risk scores. This also automatically generates a Context Snapshot for every file.

   ```bash
   node .agent/scripts/graph_builder.js
   ```

2. **Step 2: Read Context Snapshots (MANDATORY)**
   Instead of using `cat` or `grep` to read a file, read its snapshot. Snapshots are stored in `.agent/history/snapshots/` with slashes replaced by `__`.
   _Example:_ To edit `src/middleware/auth.js`, read `.agent/history/snapshots/src__middleware__auth.js.json`.

   This gives you:
   - The full source code of the target file.
   - The exported symbols of every file it imports.
   - The list of files that depend on it.
   - Its exact `riskScore` and `blastRadius`.

3. **Step 3: Interactive Visualization (For Humans)**
   The user can view a sleek, zero-dependency visualizer of the codebase. You can prompt them to run:

   ```bash
   npx tribunal-kit graph
   ```

4. **Step 4: The Micro Zoom (Legacy Street View)**
   If a snapshot is unavailable or too large, you can fall back to the zoomer to get its structural skeleton:
   ```bash
   node .agent/scripts/graph_zoom.js --focus <path_to_file>
   ```

## VBC Protocol (Verification-Before-Completion)

You are explicitly forbidden from guessing or "hallucinating" what functions, props, or variables exist inside a file. You MUST read the Context Snapshot (or use `graph_zoom.js`) to verify a component's exact signature before you attempt to call it, mock it, or rewrite it. Always respect the Blast Radius Risk Score before deleting or mutating files.

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario                               | Risk                                                 | Mitigation Strategy                                                             |
| :------------------------------------- | :--------------------------------------------------- | :------------------------------------------------------------------------------ |
| **Empty or Null Inputs**               | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers   |
| **Network Timeout / Latency**          | Hanging operations or duplicate side-effects         | Implement bounded abort controllers, exponential backoff, and idempotency keys  |
| **Concurrency / Race Conditions**      | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls          |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection      | Validate boundary payloads with Zod/Pydantic schemas prior to execution         |
| **Resource / Memory Saturation**       | OOM errors, frame drops, or memory leaks             | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern                       | What AI Commonly Does Wrong                                               | What Is Actually Correct                                                 |
| :--------------------------------- | :------------------------------------------------------------------------ | :----------------------------------------------------------------------- |
| **Hallucinated Tool Capabilities** | Assuming an external library or CLI command exists without verification   | Run a verification check or verify package.json before referencing tools |
| **Premature Completion Claim**     | Declaring a task finished because code was generated without verification | Execute tests, linters, or terminal commands to provide concrete proof   |
| **Context Bloat Dumping**          | Pasting entire multi-thousand-line files into prompt context              | Extract targeted excerpts, symbols, and signatures to preserve tokens    |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `orchestrator` · `agent-organizer` · `logic-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Did I deconstruct the root objective before proposing architecture?
✅ Did I identify dependencies, bottlenecks, and parallelizable sub-tasks?
✅ Did I avoid over-engineering and select the simplest effective pattern?
✅ Did I verify assumptions with concrete file reads instead of speculation?
✅ Did I establish measurable verification criteria before completion?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
