---
name: animation-on-scroll
description: Use when building performant scroll-driven animations, CSS scroll-timeline, view-timeline reveals, GSAP ScrollTrigger scrollytelling, or Framer Motion scroll indicators without scroll jank or layout thrashing.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - motion-engineering
  - 60fps-animation
  - accessible-animation
  - review-animations
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Animation On Scroll — Precision Scroll-Driven Architecture & Scrollytelling

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `animation-on-scroll` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when building performant scroll-driven animations, CSS scroll-timeline, view-timeline reveals, GSAP ScrollTrigger scrollytelling, or Framer Motion scroll indicators without scroll jank or layout thrashing.
- **DO NOT activate when:** The task falls outside the `animation-on-scroll` domain or is managed by a different dedicated specialist.

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

Scroll motion connects physical gesture with dynamic interface reveals. Poorly engineered scroll animations hijack the native scroll wheel, introduce frame drops by calculating `getBoundingClientRect()` inside unthrottled scroll listeners, or cause pin spacers to collapse layouts. Master-grade scroll architecture executes directly on the browser compositor layer using native CSS `animation-timeline` when possible, leverages GSAP `ScrollTrigger` with subpixel pinning offsets for complex timelines, and strictly obeys the Anti-Scrolljacking rule.

---

---

---

---

## 🛠️ Technical Architecture & Reference Recipes

### 1. Engine Selection Matrix

| Use Case                              | Recommended Engine                         | Rationale                                                       |
| :------------------------------------ | :----------------------------------------- | :-------------------------------------------------------------- |
| **Single-Element Entrance Wipe**      | Pure CSS `animation-timeline: view()`      | 0 KB JS overhead, executes on GPU compositor thread             |
| **Page-Top Progress Indicator**       | Pure CSS `animation-timeline: scroll()`    | Zero re-renders, zero layout shifts                             |
| **Multi-Stage Pinned Scrollytelling** | GSAP `ScrollTrigger`                       | Pin spacer mechanics, scrubbing interpolation, timeline nesting |
| **React Component State Scrubbing**   | Framer Motion `useScroll` + `useTransform` | Declarative hook integration with React rendering lifecycle     |

---

### 2. Four Production-Grade Implementation Recipes

#### Recipe 1: Modern Pure CSS `view-timeline` Card Entrance

```css
@keyframes card-scrub-reveal {
  0% {
    opacity: 0;
    transform: translateY(48px) scale(0.94);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.scroll-reveal-card {
  /* Fallback for browsers without animation-timeline support */
  opacity: 1;
  transform: none;
}

@supports (animation-timeline: view()) {
  .scroll-reveal-card {
    view-timeline-name: --card-timeline;
    view-timeline-axis: block;
    animation: card-scrub-reveal ease-out both;
    animation-timeline: --card-timeline;
    /* Triggers when card enters bottom 10% of viewport and finishes at 35% */
    animation-range: entry 10% cover 35%;
  }
}
```

---

#### Recipe 2: Sticky Pinned Scrollytelling Sequence (GSAP ScrollTrigger)

```typescript
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initScrollytelling(container: HTMLElement) {
  const steps = container.querySelectorAll('.story-step');

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: container,
      start: 'top top',
      end: () => `+=${steps.length * 100}%`,
      pin: true,
      anticipatePin: 1,
      scrub: 0.8, // Smooth momentum scrub
      invalidateOnRefresh: true, // Recalibrate on window resize
    },
  });

  steps.forEach((step, index) => {
    if (index === 0) return;
    tl.to(steps[index - 1], { opacity: 0, y: -30, duration: 0.4 }).fromTo(
      step,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.6 },
      '-=0.2',
    );
  });

  return () => {
    tl.kill();
    ScrollTrigger.getAll().forEach(t => t.kill());
  };
}
```

---

#### Recipe 3: Framer Motion Reactive Scrubbing with Spring Damping

```tsx
import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

export function ParallaxHeroCard() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  // Apply spring physics to prevent jerky scroll jumps on trackpads
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 280,
    damping: 35,
    restDelta: 0.001,
  });

  const scale = useTransform(smoothProgress, [0, 0.5, 1], [0.85, 1, 0.95]);
  const y = useTransform(smoothProgress, [0, 1], [60, -60]);
  const opacity = useTransform(smoothProgress, [0, 0.25, 0.75, 1], [0, 1, 1, 0]);

  return (
    <div ref={containerRef} className="relative min-h-[140vh] flex items-center justify-center">
      <motion.div
        style={{ scale, y, opacity }}
        className="sticky top-24 w-full max-w-2xl p-8 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl"
      >
        <h2 className="text-2xl font-semibold text-white">Fluid Reactive Scrubbing</h2>
        <p className="mt-2 text-neutral-400">
          Zero unthrottled scroll listeners. Offloaded to motion GPU pipeline.
        </p>
      </motion.div>
    </div>
  );
}
```

---

#### Recipe 4: Hardware-Accelerated Progress Indicator (CSS `scroll()`)

```css
@keyframes scale-progress {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}

.scroll-progress-line {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #6366f1, #a855f7);
  transform-origin: 0% 50%;
  will-change: transform;
}

@supports (animation-timeline: scroll()) {
  .scroll-progress-line {
    animation: scale-progress linear both;
    animation-timeline: scroll(root block);
  }
}
```

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

| Anti-Pattern             | What AI Commonly Does Wrong                                           | What Is Actually Correct                                            |
| :----------------------- | :-------------------------------------------------------------------- | :------------------------------------------------------------------ |
| **The Instant Pop Trap** | Conditionally unmounting elements without animated interpolation      | Use AnimatePresence or coordinate morphs with continuous geometry   |
| **Layout Thrashing**     | Animating width, height, top, or left inside animation loops          | Animate composite-only transform (translate3d, scale) and opacity   |
| **Sluggish Duration**    | Setting micro-interaction transitions to 600ms+ causing interface lag | Cap interactive feedback at 160ms–240ms with snappy ease-out curves |

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
