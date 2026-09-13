---
name: animation-systems
description: Use when creating and architecting design-system motion tokens, centralized duration tiers, CSS custom property easings, Tailwind motion configs, and unified cross-platform animation guidelines.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - motion-engineering
  - 60fps-animation
  - baseline-ui
  - better-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Animation Systems — Global Motion Tokens & Design System Architecture

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `animation-systems` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when creating and architecting design-system motion tokens, centralized duration tiers, CSS custom property easings, Tailwind motion configs, and unified cross-platform animation guidelines.
- **DO NOT activate when:** The task falls outside the `animation-systems` domain or is managed by a different dedicated specialist.

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

Without a centralized motion system, codebases descend into animation chaos: arbitrary durations (`350ms`, `420ms`, `175ms`), dissonant easing curves, and unmaintainable component overrides. A professional animation system treats motion as a primary design token—equivalent to color palettes, typography scales, and spatial grids. It standardizes duration tiers, codifies physics-grounded easing curves, and exposes single-source-of-truth tokens across CSS custom properties, Tailwind configs, and Framer Motion dictionaries.

---


---


---


---

## 🛠️ Technical Architecture & Reference Recipes

### 1. The Global Motion Token Taxonomy

| Token Variable | Value | Intended Interaction Scope |
|:---|:---|:---|
| `--duration-instant` | `80ms` | Button active press, micro-clicks, checkbox states |
| `--duration-fast` | `150ms` | Hover states, tooltips, focus rings, status badges |
| `--duration-normal` | `220ms` | Dropdowns, menus, tabs, segment switches, popovers |
| `--duration-deliberate` | `320ms` | Modals, drawers, accordion expansion, card reveals |
| `--duration-celebrate` | `500ms` | Confetti, completion fireworks, onboarding sweeps |
| `--ease-snappy` | `cubic-bezier(0.2, 0, 0, 1)` | Direct tactile interaction and press feedback |
| `--ease-out-ui` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entrance transitions, unfolds, dynamic cards |
| `--ease-in-ui` | `cubic-bezier(0.7, 0, 0.84, 0)` | Clean exits, dismissals, unmount fades |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful toggles and organic badge pop-ins |

---

### 2. Four Production-Grade Implementation Recipes

#### Recipe 1: CSS Centralized Token Definitions (`tokens/motion.css`)

```css
:root {
  /* Durations */
  --duration-instant: 80ms;
  --duration-fast: 150ms;
  --duration-normal: 220ms;
  --duration-deliberate: 320ms;
  --duration-celebrate: 500ms;

  /* Easing Curves */
  --ease-snappy: cubic-bezier(0.2, 0, 0, 1);
  --ease-out-ui: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-ui: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);

  /* Pre-assembled Transitions */
  --transition-press: transform var(--duration-instant) var(--ease-snappy);
  --transition-fade: opacity var(--duration-fast) var(--ease-out-ui);
  --transition-unfold: transform var(--duration-normal) var(--ease-out-ui), opacity var(--duration-normal) var(--ease-out-ui);
}

/* Systemic Reduced Motion Collapse */
@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-instant: 0.001ms;
    --duration-fast: 0.001ms;
    --duration-normal: 100ms;
    --duration-deliberate: 120ms;
    --duration-celebrate: 150ms;
    --ease-snappy: ease-out;
    --ease-out-ui: ease-out;
    --ease-spring: ease-out;
  }
}
```

---

#### Recipe 2: Tailwind CSS Integration (`tailwind.config.ts`)

```typescript
import type { Config } from 'tailwindcss';

export default {
  theme: {
    extend: {
      transitionDuration: {
        instant: 'var(--duration-instant)',
        fast: 'var(--duration-fast)',
        normal: 'var(--duration-normal)',
        deliberate: 'var(--duration-deliberate)',
        celebrate: 'var(--duration-celebrate)',
      },
      transitionTimingFunction: {
        snappy: 'var(--ease-snappy)',
        'out-ui': 'var(--ease-out-ui)',
        'in-ui': 'var(--ease-in-ui)',
        spring: 'var(--ease-spring)',
      },
      keyframes: {
        'slide-up': {
          from: { transform: 'translateY(12px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'slide-up': 'slide-up var(--duration-normal) var(--ease-out-ui) forwards',
      },
    },
  },
} satisfies Config;
```

---

#### Recipe 3: TypeScript & Framer Motion Transitions Dictionary

```typescript
// tokens/motion.ts
import { Transition } from 'framer-motion';

export const MotionTokens = {
  instant: {
    duration: 0.08,
    ease: [0.2, 0, 0, 1],
  } as Transition,
  fast: {
    duration: 0.15,
    ease: [0.16, 1, 0.3, 1],
  } as Transition,
  normal: {
    duration: 0.22,
    ease: [0.16, 1, 0.3, 1],
  } as Transition,
  deliberate: {
    duration: 0.32,
    ease: [0.16, 1, 0.3, 1],
  } as Transition,
  // Physics-based Spring Presets
  springSnappy: {
    type: 'spring',
    stiffness: 480,
    damping: 30,
    mass: 0.8,
  } as Transition,
  springBouncy: {
    type: 'spring',
    stiffness: 380,
    damping: 20,
    mass: 1,
  } as Transition,
};
```

---

#### Recipe 4: Systemic Component Application

```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { MotionTokens } from '@/tokens/motion';

export function SystemModal({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 4 }}
        transition={MotionTokens.normal}
        className="w-full max-w-lg p-6 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl"
      >
        {children}
      </motion.div>
    </div>
  );
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
