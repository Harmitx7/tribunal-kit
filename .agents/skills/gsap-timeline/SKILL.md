---
name: gsap-timeline
description: Use when Official GSAP skill for timelines — gsap.timeline(), position parameter, nesting, playback. Use when sequencing animations, choreographing keyframes, or when the user asks about animation sequencing, timelines, or animation order (in GSAP or when recommending a library that supports timelines).
version: 5.0.0
last-updated: 2026-09-13
skills:
  - motion-engineering
  - gsap-react
  - 60fps-animation
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# GSAP Timeline — Multi-Step Animation Choreography

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `gsap-timeline` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Official GSAP skill for timelines — gsap.timeline(), position parameter, nesting, playback. Use when sequencing animations, choreographing keyframes, or when the user asks about animation sequencing, timelines, or animation order (in GSAP or when recommending a library that supports timelines).
- **DO NOT activate when:** The task falls outside the `gsap-timeline` domain or is managed by a different dedicated specialist.

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


## When to Use This Skill

Apply when building multi-step animations, coordinating several tweens in sequence or parallel, or when the user asks about timelines, sequencing, or keyframe-style animation in GSAP.

**Related skills:** For single tweens and eases use **gsap-core**; for scroll-driven timelines use **gsap-scrolltrigger**; for React use **gsap-react**.

## Creating a Timeline

```javascript
const tl = gsap.timeline();
tl.to('.a', { x: 100, duration: 1 })
  .to('.b', { y: 50, duration: 0.5 })
  .to('.c', { opacity: 0, duration: 0.3 });
```

By default, tweens are **appended** one after another. Use the **position parameter** to place tweens at specific times or relative to other tweens.

## Position Parameter

Third argument (or position property in vars) controls placement:

- **Absolute**: `1` — start at 1 second.
- **Relative (default)**: `"+=0.5"` — 0.5s after end; `"-=0.2"` — 0.2s before end.
- **Label**: `"labelName"` — at that label; `"labelName+=0.3"` — 0.3s after label.
- **Placement**: `"<"` — start when recently-added animation starts; `">"` — start when recently-added animation ends (default); `"<0.2"` — 0.2s after recently-added animation start.

Examples:

```javascript
tl.to('.a', { x: 100 }, 0); // at 0
tl.to('.b', { y: 50 }, '+=0.5'); // 0.5s after last end
tl.to('.c', { opacity: 0 }, '<'); // same start as previous
tl.to('.d', { scale: 2 }, '<0.2'); // 0.2s after previous start
```

## Timeline Defaults

Pass defaults into the timeline so all child tweens inherit:

```javascript
const tl = gsap.timeline({ defaults: { duration: 0.5, ease: 'power2.out' } });
tl.to('.a', { x: 100 }).to('.b', { y: 50 }); // both use 0.5s and power2.out
```

## Timeline Options (constructor)

- **paused: true** — create paused; call `.play()` to start.
- **repeat**, **yoyo** — same as tweens; apply to whole timeline.
- **onComplete**, **onStart**, **onUpdate** — timeline-level callbacks.
- **defaults** — vars merged into every child tween.

## Labels

Add and use labels for readable, maintainable sequencing:

```javascript
tl.addLabel('intro', 0);
tl.to('.a', { x: 100 }, 'intro');
tl.addLabel('outro', '+=0.5');
tl.to('.b', { opacity: 0 }, 'outro');
tl.play('outro'); // start from "outro"
tl.tweenFromTo('intro', 'outro'); // pauses the timeline and returns a new Tween that animates the timeline's playhead from intro to outro with no ease.
```

## Nesting Timelines

Timelines can contain other timelines.

```javascript
const master = gsap.timeline();
const child = gsap.timeline();
child.to('.a', { x: 100 }).to('.b', { y: 50 });
master.add(child, 0);
master.to('.c', { opacity: 0 }, '+=0.2');
```

## Controlling Playback

- **tl.play()** / **tl.pause()**
- **tl.reverse()** / **tl.progress(1)** then **tl.reverse()**
- **tl.restart()** — from start.
- **tl.time(2)** — seek to 2 seconds.
- **tl.progress(0.5)** — seek to 50%.
- **tl.kill()** — kill timeline and (by default) its children.

## Official GSAP Best practices

- ✅ Prefer timelines for sequencing
- ✅ Use the **position parameter** (third argument) to place tweens at specific times or relative to labels.
- ✅ Add **labels** with `addLabel()` for readable, maintainable sequencing.
- ✅ Pass **defaults** into the timeline constructor so child tweens inherit duration, ease, etc.
- ✅ Put ScrollTrigger on the timeline (or top-level tween), not on tweens inside a timeline.

## Do Not

- ❌ Chain animations with **delay** when a **timeline** can sequence them; prefer `gsap.timeline()` and the position parameter for multi-step animation.
- ❌ Forget to pass **defaults** (e.g. `defaults: { duration: 0.5, ease: "power2.out" }`) when many child tweens share the same duration or ease.
- ❌ Forget that **duration** on the timeline constructor is not the same as tween duration; timeline “duration” is determined by its children.
- ❌ Nest animations that contain a ScrollTrigger; ScrollTriggers should only be on top-level Tweens/Timelines.

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
