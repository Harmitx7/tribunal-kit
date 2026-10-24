---
name: anti-slop-enforcement
description: "Use when Tribunal extraction of the anti-slop rule sets. Enforces Purpose-Gates, Hard-Gates, and Liveliness Dials for UI engineering."
version: 6.0.0
last-updated: 2026-09-29
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "anti"
  - "slop"
  - "enforcement"
  - "tribunal"
---

# Anti-Slop Enforcement Guidelines

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `anti-slop-enforcement` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).


## Activation Boundaries
- **Activate when:** Use when Tribunal extraction of the anti-slop rule sets. Enforces Purpose-Gates, Hard-Gates, and Liveliness Dials for UI engineering.
- **DO NOT activate when:** The task falls outside the `anti-slop-enforcement` domain or is managed by a different dedicated specialist agent.


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


This skill provides the definition for what constitutes "slop" and how to enforce intentionality.

## 1. The Liveliness Dials
Before writing any UI code, the agent MUST articulate the following three dials:

- **ENERGY (1-3):**
  - `1`: Baseline, calm, muted (Corporate, B2B SaaS).
  - `2`: Bright, punchy, confident (Modern Developer Tool).
  - `3`: Maximalist, high-contrast, aggressive (Consumer App, Hype Landing Page).

- **RHYTHM (1-3):**
  - `1`: Uniform, standard grids, predictable alignment.
  - `2`: Syncopated, broken-grid elements, overlapping layers, dynamic spacing.
  - `3`: Chaotic, brutalist, anti-alignment.

- **MOTION (1-3):**
  - `1`: Static, CSS hover only.
  - `2`: Micro-interactions, route transitions (Framer Motion / View Transitions).
  - `3`: Heavy scroll-jacking, GSAP, spring physics orchestration.

## 2. Hard Gates (Absolute Bans)
Do not allow these under any circumstances:
1. **The Purple Cliché:** Using `#8B5CF6`, `violet-500`, or purple-to-blue mesh gradients as a default "tech" aesthetic.
2. **Fake Data:** Generating fake statistics ("10,000+ users", "5-star rating") unless provided in the prompt.
3. **Card-in-Card Mud:** Cards nested inside cards with the same background color and no border/shadow contrast.
4. **Hex Hacks:** Using raw hex codes instead of the design system's variables (e.g., `oklch`).

## 3. Purpose-Gates (Allowed only with stated purpose)
These techniques are permitted ONLY IF the agent writes down a one-line reason (purpose) before generating the code:
1. **Glassmorphism (`backdrop-filter: blur`)**: Must state *why* the layer beneath needs to be partially visible.
2. **Gradients**: Must state *why* a solid color wasn't enough (e.g., "Using subtle gradient to indicate depth on the active tab").
3. **Bento Grids**: Must state *why* the data requires a multi-column irregular grid instead of a standard list or card array.
4. **Shadows > 20px**: Must state the z-index hierarchy reasoning for the massive shadow.

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |


## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Uncontrolled Re-render Loop** | Mutating state inside render bodies or omitting hook dependencies | Wrap effects with explicit deps and isolate reactive derivations in useMemo |
| **Accessibility Neglect** | Interactive <div> without role="button", tabIndex, or onKeyDown | Use semantic <button> or provide ARIA role, keyboard handlers, and focus ring |
| **Layout Shift Flash** | Images/dynamic content without aspect-ratio or explicit dimensions | Enforce aspect-ratio or skeleton placeholders to guarantee zero CLS |


## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `frontend-reviewer` · `type-safety` · `ui-ux-auditor` · `complexity-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

### ✅ Pre-Flight Self-Audit Checklist
```
✅ Are all component props strictly typed with zero implicit "any"?
✅ Are responsive breakpoints, fluid typography, and optical balance verified?
✅ Is accessibility (ARIA labels, keyboard navigation, contrast ratio >= 4.5:1) validated?
✅ Are re-renders minimized and state lifecycles cleanly separated?
✅ Did I verify all imported UI components and icon sets actually exist?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
