---
name: fixing-motion-performance
description: Use when Audit and fix animation performance issues including layout thrashing, compositor properties, scroll-linked motion, and blur effects. Use when animations stutter, transitions jank, or reviewing CSS/JS animation performance.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - 60fps-animation
  - motion-engineering
  - gsap-performance
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Fixing Motion Performance — 60/120fps Jank-Free Animation

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `fixing-motion-performance` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Audit and fix animation performance issues including layout thrashing, compositor properties, scroll-linked motion, and blur effects. Use when animations stutter, transitions jank, or reviewing CSS/JS animation performance.
- **DO NOT activate when:** The task falls outside the `fixing-motion-performance` domain or is managed by a different dedicated specialist.

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

## 1. Browser Rendering Pipeline & Compositor Rules

Animations trigger one of 3 rendering costs:

1. **Layout (Expensive)**: Animating `width`, `height`, `margin`, `padding`, `top`, `left`, `flex`, `grid`. Forces full geometry recalculation across the page.
2. **Paint (Moderate)**: Animating `color`, `background-color`, `border-color`, `box-shadow`, `filter`. Forces pixel repaint.
3. **Composite (GPU Fast)**: Animating **`transform`** (`translate`, `scale`, `rotate`) and **`opacity`**. Offloaded entirely to GPU compositor thread!

$$\text{Rule: } \text{Animate ONLY } \mathbf{transform} \text{ and } \mathbf{opacity}$$

---

## 2. Layout Thrashing (Read/Write Interleaving)

NEVER interleave DOM layout measurements (`offsetHeight`, `getBoundingClientRect()`) with DOM mutations (`style.height = ...`) in the same event loop or frame loop!

```javascript
// ❌ WRONG — Triggers Layout Thrashing (Multiple Recalculations)
elements.forEach(el => {
  const h = el.offsetHeight; // READ (Forces Layout Calculation)
  el.style.height = `${h + 10}px`; // WRITE (Invalidates Layout)
});

// ✅ CORRECT — Batch Reads First, Then Batch Writes
const heights = elements.map(el => el.offsetHeight); // BATCH READS
elements.forEach((el, i) => {
  el.style.height = `${heights[i] + 10}px`; // BATCH WRITES
});
```

---

## 3. GPU Hinting (`will-change`)

- Use `will-change: transform, opacity` ONLY on actively animated elements right before interaction begins.
- Remove `will-change` when animation ends to free GPU memory. NEVER place `will-change: transform` globally on hundreds of DOM nodes.

```css
/* Apply hardware acceleration hint to GPU */
.animated-card {
  will-change: transform, opacity;
}
```

---

## Anti-Slop Table

| Performance Issue                   | Motion Performance Fix                                                       | FPS Gain                                          |
| ----------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------- |
| Animating `height: 0` to `auto`     | FLIP technique or `scaleY` transform animation                               | 15fps → 60fps                                     |
| Scroll listener mutating inline CSS | `CSS scroll-timeline` or `IntersectionObserver`                              | Prevents main-thread scroll jank                  |
| `transition: all 0.3s`              | `transition: transform 200ms cubic-bezier(0.16,1,0.3,1), opacity 200ms ease` | Eliminates accidental layout/color recalculations |

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
