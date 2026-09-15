---
name: improve-ui
description: Use when Audit an existing product surface against its own design evidence, identify verified UI problems, and write self-contained implementation plans for another agent. Strictly read-only on product source. Use when asked to review, refine, improve, or clean up an interface without replacing its identity.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - better-ui
  - baseline-ui
  - create-design-md
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Improve UI — Evidence-Based UI Audit & Implementation Planning

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `improve-ui` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Audit an existing product surface against its own design evidence, identify verified UI problems, and write self-contained implementation plans for another agent. Strictly read-only on product source. Use when asked to review, refine, improve, or clean up an interface without replacing its identity.
- **DO NOT activate when:** The task falls outside the `improve-ui` domain or is managed by a different dedicated specialist.

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

---

## 1. Operating Rules & Boundaries

- **Strictly Read-Only on Product Source**: Never modify product source files (`src/`, `components/`, `app/`) during an `improve-ui` audit session.
- **Output Artifacts Only**: Create plans under `design-plans/` or return an actionable implementation plan to the user.
- **Respect Product Identity**: Preserve existing component architecture, routing, and product identity.

---

## 2. The 4-Phase Audit Protocol

### Phase 1: Surface Selection & Path Tracing

1. Focus on one deployable application and one coherent surface family (e.g. `Dashboard / Overview`).
2. Trace the path from route layout $\rightarrow$ page composition $\rightarrow$ shared UI primitives $\rightarrow$ tokens/CSS variables.

### Phase 2: Design Language Reconstruction

1. Inspect `DESIGN.md`, `index.css`, Tailwind tokens, or custom properties.
2. Record active background tokens, typography roles, spatial rules, and border/shadow contracts.

### Phase 3: Proof-Gated Defect Verification

Before reporting a finding, require 3 explicit proofs:

- **Observation**: Exact code line or rendered element showing the discrepancy.
- **Basis**: Violation of documented design token or 8px grid baseline.
- **Consequence**: Measurable degradation of visual hierarchy, readability, or interaction response.

### Phase 4: Implementation Plan Generation

Write a self-contained plan specifying:

- Files to modify
- Exact CSS/JSX diffs
- Verification steps (browser preview, contrast check, visual alignment)

---

## Anti-Slop Table

| Audit Pattern                  | Evidence-Based Rule                           | Rationale                        |
| ------------------------------ | --------------------------------------------- | -------------------------------- |
| Rewriting entire components    | Targeted visual diff plan                     | Preserves business logic & state |
| Guessing design tokens         | Citing verified `var(--...)` declarations     | Ensures token adherence          |
| Speculative visual preferences | Reporting only verified WCAG/token violations | Prevents arbitrary churn         |

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

| Anti-Pattern                    | What AI Commonly Does Wrong                                        | What Is Actually Correct                                                      |
| :------------------------------ | :----------------------------------------------------------------- | :---------------------------------------------------------------------------- |
| **Uncontrolled Re-render Loop** | Mutating state inside render bodies or omitting hook dependencies  | Wrap effects with explicit deps and isolate reactive derivations in useMemo   |
| **Accessibility Neglect**       | Interactive <div> without role="button", tabIndex, or onKeyDown    | Use semantic <button> or provide ARIA role, keyboard handlers, and focus ring |
| **Layout Shift Flash**          | Images/dynamic content without aspect-ratio or explicit dimensions | Enforce aspect-ratio or skeleton placeholders to guarantee zero CLS           |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `frontend-reviewer` · `type-safety` · `ui-ux-auditor` · `complexity-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Are all component props strictly typed with zero implicit "any"?
✅ Are responsive breakpoints, fluid typography, and optical balance verified?
✅ Is accessibility (ARIA labels, keyboard focus, contrast) validated?
✅ Are re-renders minimized and state lifecycles cleanly separated?
✅ Did I verify all imported UI components and icon sets actually exist?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
