---
name: bolder
description: Use when Increase visual impact, punch, and personality for generic or bland interfaces. Use when the user asks to make the UI pop, stand out, have more character, or feel less template-like.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - better-colors
  - better-ui
  - impeccable
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Bolder — Injecting Punch & Personality into UI

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `bolder` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Increase visual impact, punch, and personality for generic or bland interfaces. Use when the user asks to make the UI pop, stand out, have more character, or feel less template-like.
- **DO NOT activate when:** The task falls outside the `bolder` domain or is managed by a different dedicated specialist.

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

## 5 Tactics for Bold UI Transformation

### 1. Typographic Contrast Scaling

- **Extreme Scale Jump**: Increase heading size contrast. Jump from `1.5rem` to `3.5rem` or `4.5rem` display type for key value propositions.
- **Font Weight Hierarchy**: Pair ultra-heavy display headings (`font-weight: 800` / `900`) with clean, lightweight body type (`font-weight: 400`).

### 2. High-Contrast Accent System

- **Single Electric Accent**: Introduce one bold, unexpected accent color (e.g. electric lime `oklch(0.85 0.25 130)`, safety orange `oklch(0.68 0.22 40)`, or deep cobalt `oklch(0.45 0.28 260)`).
- **Asymmetric Color Application**: Use the accent color sparingly on primary CTA buttons, hero badges, or interactive active indicators—never on body text.

### 3. Oversized Spatial Framing & Borders

- **Crisp Structural Outlines**: Replace faint gray borders with thick 2px solid structural borders (`border: 2px solid var(--foreground)`).
- **Hard Drop Shadows**: Use sharp, solid offset shadows (`box-shadow: 4px 4px 0px var(--foreground)`) for brutalist or neo-brutalist energy.

### 4. Hero Section Asymmetry

- **Break Symmetrical Grids**: Shift text alignment left, place a huge badge or key visual off-axis, or overlap card containers across background sections.

### 5. Tactile Micro-Interactions

- **Snappy Press Springs**: Give buttons a satisfying 3D press effect on active (`transform: translate(2px, 2px); box-shadow: 2px 2px 0px var(--foreground)`).

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
