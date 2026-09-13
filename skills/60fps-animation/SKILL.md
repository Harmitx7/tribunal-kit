---
name: 60fps-animation
description: Use when Web animation performance guidance for avoiding layout thrashing, achieving 60/120fps motion, and using GPU compositor-friendly properties (transform, opacity).
version: 5.0.0
last-updated: 2026-09-13
skills:
  - motion-engineering
  - accessible-animation
  - fixing-motion-performance
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# 60fps Animation — GPU Compositor & High-Performance Motion

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `60fps-animation` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Web animation performance guidance for avoiding layout thrashing, achieving 60/120fps motion, and using GPU compositor-friendly properties (transform, opacity).
- **DO NOT activate when:** The task falls outside the `60fps-animation` domain or is managed by a different dedicated specialist.

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

## 🛠️ Technical Architecture & Reference Recipes

---


## 2026 Motion Performance & GPU Invariants

1. **CSS `@starting-style` Native Transitions**:
   ```css
   /* Native entry animation without JS transition wrappers */
   dialog[open] {
     opacity: 1;
     transform: scale(1);
     transition: opacity 200ms ease, transform 200ms ease;
     @starting-style {
       opacity: 0;
       transform: scale(0.95);
     }
   }
   ```
2. **Native Scroll-Driven Animations**: Use CSS `animation-timeline: view()` or `scroll()` to run scroll animations directly on the compositor thread without firing JavaScript scroll event handlers.
3. **No Layout Thrashing in JS**: Never interleave DOM reads (`element.getBoundingClientRect()`, `offsetHeight`) with DOM writes (`style.transform`). Batch reads first, then writes in `requestAnimationFrame()`.

## Hallucination Traps (Read First)

- ❌ Animating `top`, `left`, `width`, `height` → ✅ Animate `transform: translate3d(...)` and `scale(...)`
- ❌ Using JavaScript scroll listeners for parallax/fade → ✅ Use native CSS `animation-timeline`
- ❌ Setting `will-change: transform` globally on every element → ✅ Blows GPU VRAM; apply only during active interaction
- ❌ Animating box-shadow directly → ✅ Animate `opacity` on a pseudo-element (`::after`) with pre-rendered shadow

---

## 4 Performance Rules

### 1. Compositor-Only Animation Pipeline

Only animate properties handled strictly by the GPU compositor layer:

- ✅ **Compositor Properties** (Zero Layout / Zero Paint): `transform` (`translate3d`, `scale`, `rotate`) and `opacity`.
- ❌ **Forbidden Animating Properties** (Triggers Full Layout Re-calculation): `width`, `height`, `margin`, `padding`, `top`, `left`, `border-width`.

### 2. Replacing Width/Height Transitions with Scale Math

Instead of animating `width: 100px` to `200px`:

```css
/* BAD: Triggers Layout recalculation on every frame */
.box-bad {
  transition: width 300ms ease;
}

/* GOOD: GPU Compositor Hardware Accelerated */
.box-good {
  transform: scaleX(2);
  transform-origin: left center;
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

### 3. `will-change` Management

- Apply `will-change: transform, opacity` ONLY right before or during active animation.
- Remove `will-change` when animation completes to free up GPU VRAM memory!

### 4. Layout Thrashing Prevention in JS

- Never interleave DOM reads (`element.offsetHeight`) with DOM writes (`element.style.height = ...`) inside requestAnimationFrame or scroll handlers. Batch all reads first, then perform all writes.

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
