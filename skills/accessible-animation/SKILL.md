---
name: accessible-animation
description: Use when implementing WCAG 2.2 AA compliant UI motion, tiered reduced-motion patterns, vestibular trigger suppression, and accessible transitions across CSS, React, Framer Motion, and GSAP.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - 60fps-animation
  - motion-engineering
  - framer-motion-expert
  - review-animations
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Accessible Animation — Tiered Reduced-Motion Architecture & WCAG 2.2 AA Compliance

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `accessible-animation` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when implementing WCAG 2.2 AA compliant UI motion, tiered reduced-motion patterns, vestibular trigger suppression, and accessible transitions across CSS, React, Framer Motion, and GSAP.
- **DO NOT activate when:** The task falls outside the `accessible-animation` domain or is managed by a different dedicated specialist.

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

Motion in digital interfaces elevates feedback and delight, but for users with vestibular disorders, inner-ear sensitivities, or cognitive processing differences, unrestrained motion causes severe nausea, vertigo, migraines, and physical disorientation. A master-grade accessible motion architecture does not bluntly disable all UI feedback; it systematically applies tiered reduction—preserving vital state changes and subtle opacity fades while eliminating spatial translations, zoom scales, parallax shifts, and rapid flashes.

---


---


---


---

## 🛠️ Technical Architecture & Reference Recipes

### 1. The Vestibular Trigger Substitution Matrix

| Disorienting Trigger | Vestibular Hazard | Accessible Compliant Substitution |
|:---|:---|:---|
| **Full-Page Parallax** | Severe nausea, spatial imbalance | Static layout positioning with subtle content opacity reveal |
| **Multi-Axis 3D Rotation** | Visual vertigo, disorientation | 2D elevation shadow transition or subtle border glow |
| **Rapid Zoom / Scale (>1.2x)** | Depth perception distortion | Gentle scale (1.0 to 1.02x) or immediate 150ms opacity cross-fade |
| **Infinite Spinning Spinners** | Cognitive fatigue, dizziness | Pulsing opacity indicator or static step progress bar |
| **Off-Canvas Fly-In Drawer** | Visual lurching across viewport | Immediate opacity dissolve (`0` to `1` over 120ms) |

---

### 2. Four Production-Grade Implementation Recipes

#### Recipe 1: CSS Non-Destructive Global Safety Harness

```css
/* Universal Non-Destructive Reset: Preserves JS event hooks while eliminating movement */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    /* 0.001ms duration ensures transitionend & animationend events still fire reliably */
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }

  /* Exceptions: Allow intentional, gentle micro-fades for essential state comprehension */
  .accessible-fade {
    transition: opacity 150ms ease-out !important;
  }
}
```

---

#### Recipe 2: SSR-Safe React Hook (`useAccessibleMotion`)

Prevents hydration mismatch warnings by defaulting to safe state until client mounts:

```tsx
import { useState, useEffect } from 'react';

export function useAccessibleMotion(): boolean {
  // Default to false on server to match initial HTML render
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setShouldReduceMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setShouldReduceMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return shouldReduceMotion;
}
```

---

#### Recipe 3: Framer Motion Tiered Component Pattern

```tsx
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface AccessibleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function AccessibleDialog({ isOpen, onClose, children }: AccessibleDialogProps) {
  const shouldReduce = useReducedMotion();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={shouldReduce ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={shouldReduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12 }}
        transition={{
          duration: shouldReduce ? 0.12 : 0.22,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="w-full max-w-lg p-6 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl"
      >
        {children}
      </motion.div>
    </div>
  );
}
```

---

#### Recipe 4: GSAP `matchMedia` Integration & Smooth-Scroll Cancellation

```typescript
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function setupAccessibleScrollMotion(targetElement: HTMLElement) {
  const mm = gsap.matchMedia();

  // 1. Standard Motion (User has not requested reduction)
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.to(targetElement, {
      y: -80,
      scale: 1.05,
      scrollTrigger: {
        trigger: targetElement,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1,
      },
    });
  });

  // 2. Reduced Motion (User prefers reduced motion)
  mm.add('(prefers-reduced-motion: reduce)', () => {
    // Zero parallax scrub, zero scale shift. Pure gentle opacity cross-fade.
    gsap.fromTo(
      targetElement,
      { opacity: 0.4 },
      {
        opacity: 1,
        duration: 0.2,
        scrollTrigger: {
          trigger: targetElement,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      }
    );
  });

  return () => mm.revert();
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
