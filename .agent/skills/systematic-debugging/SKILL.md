---
name: systematic-debugging
description: "Use when executing, coordinating, planning, or reviewing systematic debugging agent workflows, cognitive loops, and architecture standards."
version: 6.0.0
last-updated: 2026-09-29
skills:
  - diagnosing-bugs
  - test-result-analyzer
  - clean-code
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/test_runner.js
  - .agent/scripts/verify_all.js
  - .agent/scripts/lint_runner.js
---

# Systematic Debugging — Root Cause Mastery

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `systematic-debugging` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).


## Activation Boundaries
- **Activate when:** Use when executing, coordinating, planning, or reviewing systematic debugging agent workflows, cognitive loops, and architecture standards.
- **DO NOT activate when:** The task falls outside the `systematic-debugging` domain or is managed by a different dedicated specialist agent.


## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. | Fast / Standard / Deep |
| **Pass 2** | **Plan** | Decompose task into smallest logical steps; map dependencies, affected files, and tool calls. | Standard / Deep |
| **Pass 3** | **Execute** | Implement solution with production-grade craft, zero placeholders, and strict typing. | All Modes |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. | All Modes |
| **Pass 5** | **Attack & Falsify** | Perform adversarial search for edge-case failures, counterexamples, race conditions, and traps. | Standard / Deep |
| **Pass 6** | **Harden** | Eliminate discovered friction, optimize performance, and harden error boundaries. | Standard / Deep |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. | All Modes |


---

## 🛠️ Technical Architecture & Reference Recipes

## Hallucination Traps (Read First)

- ❌ Changing multiple things at once to fix a bug -> ✅ Change ONE variable at a time; multiple changes make it impossible to identify the fix
- ❌ Assuming the bug is where the error message points -> ✅ The error location is often downstream; trace UP the call stack to find root cause
- ❌ Not reproducing the bug before attempting a fix -> ✅ If you cannot reproduce it reliably, you cannot verify your fix works

---
## 1. The 4-Phase Debugging Methodology

Never jump straight into modifying code when a bug is reported.

### Phase 1: Replication & Isolation

**Goal:** Prove the bug exists continuously and isolate the execution path.

1. Write a failing deterministic unit/integration test that replicates the exact condition.
2. Strip away all unnecessary layers (If the UI button fails to delete a user, curl the endpoint directly. Does the API fail? If yes, UI is fine, bug is in the backend/database).

### Phase 2: Hypothesis Generation

**Goal:** Formulate logical explanations for the anomaly based on data, not guesses.

- "Because the log shows `auth: false` even after successful token parse, the RBAC middleware must be overwriting the session."

### Phase 3: Evidence-Based Testing (The Probe)

**Goal:** Prove or disprove the hypothesis without mutating the actual program functionality.

- Insert strict logging probes: `logger.debug("Executing line 45. User.permissions:", user.permissions)`.
- If the logs match your hypothesis, proceed. If they do not, discard the hypothesis.

### Phase 4: Resolution & Verification

**Goal:** Apply the minimal surgical change required, then verify via tests.

- Re-run the deterministic failing test created in Phase 1. It must now pass.

---

## 2. Specialized Diagnostic Techniques

When debugging intricate or elusive bugs, reference these specialized technique guides:

- **Root Cause Tracing (`./root-cause-tracing.md`):** Trace backwards up the call stack to identify where invalid data originated, rather than fixing where the error appears.
- **Condition-Based Waiting (`./condition-based-waiting.md`):** Eliminate flaky tests and timing bugs by waiting for specific deterministic state conditions instead of arbitrary `setTimeout` or `sleep` calls.
- **Defense in Depth (`./defense-in-depth.md`):** Add validation and runtime assertions at multiple component boundaries.

---

## 3. Advanced Diagnostic Vectors

When pure logic errors are ruled out, look for environmental factors.

**1. Race Conditions / Timing Bugs**

- _Symptom:_ The bug only happens 30% of the time, or depends on network speed.
- _Cause:_ Missing `await` statements, relying on asynchronous callbacks returning in a specific order, or concurrent database transacting.

**2. State Leakage**

- _Symptom:_ The first operation works perfectly. The second consecutive operation fails mysteriously.
- _Cause:_ Global variables, cached HTTP clients, or React state lacking proper cleanup functions between unmounts.

**3. Silent Failures (Swallowed Errors)**

- _Symptom:_ The application stops processing midway through an operation, but nothing is in the error logs.
- _Cause:_ Empty `catch (e) {}` blocks, unhandled promise rejections, or frontend elements conditionally rendering `null` on missing datasets.

---

## 3. The Bisection Method (Git Bisect)

When a catastrophic bug appears in production but worked fine last week, use algorithmic isolation across the git history.

```bash
git bisect start
git bisect bad HEAD           # The current state is broken
git bisect good v1.4.0        # It worked fine in the last release

# Git will now jump you exactly halfway between those commits.
# Run your tests...
git bisect bad   # (If it failed)
# Or...
git bisect good  # (If it passed)

# Git will isolate the exact commit that introduced the bug in O(log N) steps.
```

---

## 4. Reading the Stack Trace Properly

Do not skim. Stack traces tell the exact sequence of destruction.

1. **Top line:** The final fatal blow (e.g., `TypeError: Cannot read properties of undefined (reading 'map')`).
2. **First Application Function:** Scroll down past `node_modules` and framework internals. Find the absolute top-most function call that YOU wrote (e.g., `at UserList (src/components/UserList.tsx:45)`).
3. **The Parameter Conclusion:** Therefore, line 45 invoked `.map` on a variable that was `undefined`. Why did the parent layer pass `undefined` instead of `[]`?


## Integration with Durable Session Log

When debugging fails, the agent MUST read the `.agent/.tribunal/session.jsonl` durable log to understand exactly where the previous wave crashed. Do not guess; read the event trace to see the exact sequence of tool calls and errors that led to the crash. You can grep this file or parse it to extract the latest `ErrorEncountered` or failed `ToolCompleted` events.

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |


## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `orchestrator` · `agent-organizer` · `logic-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

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
