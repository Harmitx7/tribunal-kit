---
name: to-spring-or-not-to-spring
description: Use when Audit and decide when to use physics-based spring animations (stiffness, damping, mass) vs duration-based cubic-bezier easing curves.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - motion-engineering
  - framer-motion-expert
  - 60fps-animation
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# To Spring or Not to Spring — Motion Physics Decision Matrix

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `to-spring-or-not-to-spring` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Audit and decide when to use physics-based spring animations (stiffness, damping, mass) vs duration-based cubic-bezier easing curves.
- **DO NOT activate when:** The task falls outside the `to-spring-or-not-to-spring` domain or is managed by a different dedicated specialist.

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

## Spring vs Duration Decision Matrix

| Motion Scenario                                      | Use Spring Physics?   | Recommended Parameters / Curve                                               |
| ---------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------- |
| **Interruptible Gestures** (Drag, Swipe, Sheet pull) | ✅ **ALWAYS**         | `type: "spring", stiffness: 300, damping: 30` (adapts to drag velocity)      |
| **Button Press Feedback** (`:active`)                | ❌ **NO (Use Curve)** | `transition: transform 120ms cubic-bezier(0.2, 0, 0, 1)`                     |
| **Modal / Dialog Entrance**                          | ❌ **NO (Use Curve)** | `transition: all 220ms cubic-bezier(0.16, 1, 0.3, 1)`                        |
| **Badge Bouncing / Celebration**                     | ✅ **YES**            | `type: "spring", stiffness: 400, damping: 15` (intentional overshoot bounce) |
| **Page / Route Transitions**                         | ❌ **NO (Use Curve)** | `transition: opacity 200ms ease-out`                                         |
| **Toggle Switch Flip**                               | ✅ **YES**            | `type: "spring", stiffness: 500, damping: 35` (crisp snap without wobble)    |

---

## 3 Core Spring Parameters

1. **Stiffness** (Rigidity): High stiffness ($400+$) = snappy and tight; Low stiffness ($100$) = slow and lazy.
2. **Damping** (Friction): High damping ($30+$) = zero overshoot bounce; Low damping ($10$) = heavy oscillating bounce.
3. **Mass** (Weight): Higher mass ($2.0$) = feels heavy with momentum inertia.

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
