---
name: 12-principles-of-animation
description: Use when Application of Disney's 12 Principles of Animation (Squash & Stretch, Anticipation, Staging, Follow Through, Slow In & Slow Out, Arc, Secondary Action, Timing, Exaggeration, Solid Drawing, Appeal) to modern web UI motion.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - motion-engineering
  - 60fps-animation
  - accessible-animation
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# 12 Principles of Animation — Web UI Motion Theory

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `12-principles-of-animation` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Application of Disney's 12 Principles of Animation (Squash & Stretch, Anticipation, Staging, Follow Through, Slow In & Slow Out, Arc, Secondary Action, Timing, Exaggeration, Solid Drawing, Appeal) to modern web UI motion.
- **DO NOT activate when:** The task falls outside the `12-principles-of-animation` domain or is managed by a different dedicated specialist.

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

## The 6 Essential Web Principles

### 1. Squash & Stretch (Scale Elasticity)

- Compress elements slightly on impact (e.g. button press down `scale(0.97)`), then stretch slightly on release (`scale(1.02)` -> `scale(1)`).
- **Rule**: Preserve overall volume. If height decreases by 5%, width must expand by 5%.

### 2. Anticipation (Pre-Motion Cue)

- Before a major movement (e.g. modal sliding up), perform a micro-backwards movement (e.g. shift down `2px` for `40ms`) to prepare the user's eye.

### 3. Staging (Focus & Spatial Hierarchy)

- Direct user attention to one primary animation at a time. Never animate competing layout elements across different regions simultaneously.

### 4. Slow In & Slow Out (Easing Curves)

- Objects in nature start slow, accelerate, and decelerate gradually. Use strong ease-out curves (`cubic-bezier(0.16, 1, 0.3, 1)`) for UI entrances.

### 5. Arcs (Natural Curvilinear Trajectories)

- Human arms and physical objects move in curved arcs rather than mechanical straight lines. When moving elements across 2D space, use parabolic bezier curves or `offset-path`.

### 6. Follow Through & Overlapping Action

- Secondary elements (e.g. badge text inside a sliding card) lag slightly behind the main container (stagger delay 30ms - 50ms), creating organic physical realism.

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
