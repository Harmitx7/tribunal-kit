---
name: transitions-dev
description: Use when Production-ready CSS transition patterns for web apps with drop-in snippets for cards, modals, dropdowns, panels, and accordions.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - better-ui
  - micro-interaction
  - 60fps-animation
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Transitions Dev — Production CSS Transition Snippets

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `transitions-dev` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Production-ready CSS transition patterns for web apps with drop-in snippets for cards, modals, dropdowns, panels, and accordions.
- **DO NOT activate when:** The task falls outside the `transitions-dev` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass | Phase | Core Action |
|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. |
| **Pass 2** | **Plan** | Decompose the task into smallest logical steps; map dependencies and required tool calls. |
| **Pass 3** | **Execute** | Implement the solution with production-grade craft, zero placeholders, and strict typing. |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. |
| **Pass 5** | **Attack** | Perform an adversarial review searching for edge-case failures, race conditions, and traps. |
| **Pass 6** | **Improve** | Eliminate discovered friction, optimize performance, and harden error boundaries. |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---


---

## 4 Production Snippets

### 1. Card Lift & Shadow Scale

```css
.tx-card {
  transition:
    transform 200ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 200ms ease,
    border-color 200ms ease;
}
.tx-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 24px -4px rgba(0, 0, 0, 0.1);
}
```

### 2. Accordion Expand/Collapse (`grid-template-rows`)

Animate element height smoothly without hardcoding fixed pixel heights:

```css
.tx-accordion-content {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 250ms cubic-bezier(0.16, 1, 0.3, 1);
}
.tx-accordion-content[data-state='open'] {
  grid-template-rows: 1fr;
}
.tx-accordion-inner {
  overflow: hidden;
}
```

### 3. Slide & Fade Modal Overlay

```css
.tx-modal-overlay {
  transition: opacity 200ms ease;
}
.tx-modal-content {
  transition:
    transform 220ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 220ms ease;
}
.tx-modal-content[data-state='closed'] {
  opacity: 0;
  transform: scale(0.96) translateY(8px);
}
.tx-modal-content[data-state='open'] {
  opacity: 1;
  transform: scale(1) translateY(0);
}
```

### 4. Sliding Tab Highlight (`layoutId` or CSS Variables)

```css
.tx-tab-indicator {
  transition:
    transform 200ms cubic-bezier(0.2, 0, 0, 1),
    width 200ms ease;
}
```

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Mitigation Strategy |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **The Instant Pop Trap** | Conditionally unmounting elements without animated interpolation | Use AnimatePresence or coordinate morphs with continuous geometry |
| **Layout Thrashing** | Animating width, height, top, or left inside animation loops | Animate composite-only transform (translate3d, scale) and opacity |
| **Sluggish Duration** | Setting micro-interaction transitions to 600ms+ causing interface lag | Cap interactive feedback at 160ms–240ms with snappy ease-out curves |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `frontend-reviewer` · `motion-reviewer` · `ui-ux-auditor`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Does animation maintain 60fps/120fps using transform and opacity?
✅ Is optical mass conserved across state interpolations without volume collapse?
✅ Is duration capped within micro-interaction budgets (160ms–280ms)?
✅ Is prefers-reduced-motion respected with graceful instant fallbacks?
✅ Did I prevent layout thrashing and continuous geometry mutations?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
