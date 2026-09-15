---
name: motion-engineering
description: Use when Motion Engineering mastery for 2026 web UI. Covers all 20 modern animation styles across 4 tiers (Core UX, Immersive, Advanced, Specialized). Use when designing motion strategy, choosing animation libraries (Framer, GSAP, WebGL, CSS), or implementing animated UI patterns.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - 60fps-animation
  - accessible-animation
  - framer-motion-expert
  - gsap-react
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Motion Engineering (2026) — Comprehensive Reference

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `motion-engineering` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Motion Engineering mastery for 2026 web UI. Covers all 20 modern animation styles across 4 tiers (Core UX, Immersive, Advanced, Specialized). Use when designing motion strategy, choosing animation libraries (Framer, GSAP, WebGL, CSS), or implementing animated UI patterns.
- **DO NOT activate when:** The task falls outside the `motion-engineering` domain or is managed by a different dedicated specialist.

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

## Hallucination Traps & Motion Sins (Read First)

- ❌ Linear motion (`ease-linear`, CSS `transition: all`) → ✅ Spring physics (`stiffness/damping`) or custom cubic-beziers. Linear looks robotic.
- ❌ Animating layout properties (`width`, `margin`, `top`) → ✅ ONLY animate `transform` and `opacity` to maintain 120fps GPU compositing.
- ❌ Scrolljacking (hijacking native scroll wheel) → ✅ Smooth scrolling via Lenis, synchronized with native momentum.
- ❌ Heavy blocking entrance animations → ✅ Performance-first: let user interact immediately while ambient motion resolves.
- ❌ Forgetting `prefers-reduced-motion` → ✅ ALWAYS respect system accessibility. Fall back to instant opacity transitions.
- ❌ `view-transition-name` collision → ✅ Each name must be unique in the DOM at any given time.
- ❌ `element.animate()` (WAAPI) without `fill: "forwards"` → ✅ Animation resets on completion — add `fill: "forwards"` or commit state.

---

## Master Library Decision Matrix (20 Animation Categories)

| Category / Style                                     | Recommended Technology            | Why / Use Case                           |
| :--------------------------------------------------- | :-------------------------------- | :--------------------------------------- |
| **Tier 1: Core UX (High Frequency)**                 |                                   |                                          |
| 1. Micro-interactions                                | Framer Motion / CSS Springs       | Fast feedback, hover states, buttons     |
| 2. Scroll-based                                      | GSAP ScrollTrigger + Lenis        | Parallax, timelines, storytelling        |
| 3. Page Transitions                                  | View Transitions API + Framer     | SPA route navigation, modal expands      |
| 4. Loading & Skeleton                                | CSS @keyframes / SVGs / Lottie    | Non-blocking waits, shimmer, spinners    |
| **Tier 2: Narrative & Immersive (Medium Frequency)** |                                   |                                          |
| 5. 3D & Immersive                                    | React Three Fiber / WebGL         | Interactive scenes, models, depth        |
| 7. Kinetic Typography                                | GSAP SplitText / Framer           | Emphasize headlines, word-by-word reveal |
| 8. Background Animations                             | CSS Gradients / WebGL Shaders     | Ambient noise, particles, mesh gradients |
| 9. Illustration/Characters                           | Lottie / Rive                     | Mascots, onboarding storytelling         |
| **Tier 3: Advanced & Emerging (Situational)**        |                                   |                                          |
| 6. State Transitions                                 | Framer Motion `layout`            | Expanding cards, drag-and-drop           |
| 10. Physics-based                                    | Matter.js / Framer Springs        | Bouncy, elastic real-world mimics        |
| 11. Morphing & Shape                                 | GSAP MorphSVG                     | Liquid motion, blobs, SVG path morphs    |
| 12. Glassmorphism UI                                 | CSS backdrop-filter + motion      | Soft shadows, refraction on hover        |
| 13. Cursor-based                                     | Custom JS + CSS variables         | Magnetic buttons, cursor trails          |
| 14. AI-driven Adaptive                               | Headless logic + Framer           | Context-aware, usage-based animation     |
| 15. Gamified/Interactive                             | Canvas / React Three Fiber        | Reward animations, mini-games            |
| **Tier 4: Specialized (Niche/Structural)**           |                                   |                                          |
| 16. Video + Motion                                   | Scroll-sync Video (GSAP)          | Cinematic hero sections                  |
| 17. Experimental                                     | Custom shaders / Brutalist CSS    | Glitch effects, collage                  |
| 18. Navigation                                       | Framer `AnimatePresence`          | Mega menus, magnetic nav                 |
| 19. Data Visualization                               | D3.js + Framer Motion             | Animated charts, live updates            |
| 20. Performance-first                                | CSS only (`opacity`, `transform`) | Ultra-minimal subtle fade-ins            |

---

## TIER 1: Core UX Motion (Dense Implementation)

_These are the foundational motions used in 80%+ of 2026 web applications._

### 1. Micro-interactions

Used for immediate feedback, clarifying actions, and improving perceived responsiveness.

```tsx
// Framer Motion — button with spring micro-interaction
<motion.button
  whileHover={{ scale: 1.02, filter: 'brightness(1.08)' }}
  whileTap={{ scale: 0.97 }}
  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
>
  Submit
</motion.button>
```

### 2. Scroll-based Animations (Most used in 2026)

Triggers narrative flow and depth based on user scrolling.

```javascript
// GSAP ScrollTrigger — industry standard
gsap.from('.reveal-section', {
  scrollTrigger: { trigger: '.reveal-section', start: 'top 80%', scrub: 1 },
  y: 60,
  opacity: 0,
  stagger: 0.1,
});

// Lenis — smooth scroll compatible with GSAP
import Lenis from 'lenis';
const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.8 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add(time => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

### 3. Page Transitions (Native-First View Transitions API)

```css
/* CSS — Browser-native page transition (Zero JS runtime cost) */
@view-transition {
  navigation: auto;
}

.card-image {
  view-transition-name: active-image; /* MUST BE UNIQUE IN DOM */
}
::view-transition-old(active-image) {
  animation: fade-out 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
::view-transition-new(active-image) {
  animation: scale-in 0.25s cubic-bezier(0, 0, 0.2, 1);
}
```

```tsx
// SPA Route Navigation Trigger with Fallback
function navigateWithTransition(url: string, navigate: (path: string) => void) {
  if (!document.startViewTransition) {
    navigate(url);
    return;
  }
  document.startViewTransition(() => {
    navigate(url);
  });
}
```

### 4. DOM Entry & Exit Animations (@starting-style)

```css
/* CSS @starting-style allows animating entry from display: none */
.modal {
  display: none;
  opacity: 0;
  transform: scale(0.95);
  transition:
    opacity 0.2s ease,
    transform 0.2s cubic-bezier(0.2, 0.8, 0.4, 1),
    display 0.2s allow-discrete;
}

.modal[open] {
  display: block;
  opacity: 1;
  transform: scale(1);
}

@starting-style {
  .modal[open] {
    opacity: 0;
    transform: scale(0.95);
  }
}
```

---

## Accessibility & Performance Invariants (Global Rules)

1. **The WCAG 2.2 AA Motion Rule:**
   Always respect `prefers-reduced-motion`. Fall back to instant opacity or no-op motion.

```tsx
import { useReducedMotion } from 'motion/react';

function AccessibleComponent() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={{
        x: shouldReduceMotion ? 0 : 100,
        opacity: 1,
      }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
    />
  );
}
```

2. **The 120fps GPU Rule:**
   Never animate `width`, `height`, `left`, `top`, `margin`, or `padding`. This triggers layout recalculation algorithms. Use `transform: scale()` or `transform: translate()` instead.

3. **The GSAP Memory Cleanup Rule:**
   Any GSAP ScrollTrigger timeline must use `@gsap/react` `useGSAP` or explicit `tl.kill()` cleanup to avoid memory leaks on SPA route changes.

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
