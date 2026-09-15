---
name: micro-interaction
description: Use when designing and engineering interactive component micro-motion, tactile button feedback, spring toggles, draw-on checkboxes, toasts, drawer gestures, and shared-element transitions.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - delight
  - better-ui
  - 60fps-animation
  - review-animations
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Micro-Interaction — Tactile Component Physics & Interactive State Synthesis

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `micro-interaction` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when designing and engineering interactive component micro-motion, tactile button feedback, spring toggles, draw-on checkboxes, toasts, drawer gestures, and shared-element transitions.
- **DO NOT activate when:** The task falls outside the `micro-interaction` domain or is managed by a different dedicated specialist.

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

Micro-interactions bridge intention and confirmation. When a button compresses beneath a pointer or a toggle thumb squashes as it slides across the track, digital interfaces cross the chasm from static abstractions to physical, responsive objects. Poor micro-interactions feel floaty, sluggish (>250ms), or introduce layout displacement. Master-grade micro-interactions operate under a strict sub-180ms execution budget, maintain volume mass conservation, anchor transform origins directly to interaction loci, and fire subtle tactile feedback.

---

---

---

---

## 🛠️ Technical Architecture & Reference Recipes

### 1. The Micro-Interaction Timing & Easing Matrix

| Component                    | Target Duration | Recommended Curve / Physics             | Perceived Feel                       |
| :--------------------------- | :-------------- | :-------------------------------------- | :----------------------------------- |
| **Button Press (`:active`)** | 80ms–120ms      | `cubic-bezier(0.2, 0, 0, 1)`            | Crisp, immediate tactile resistance  |
| **Toggle Switch**            | 160ms–200ms     | `spring(stiffness: 420, damping: 26)`   | Snappy with slight organic overshoot |
| **Checkbox Tick**            | 140ms–180ms     | `stroke-dashoffset` linear deceleration | Decisive, pencil-drawn precision     |
| **Toast Pop-In**             | 180ms–240ms     | `cubic-bezier(0.16, 1, 0.3, 1)`         | Smooth magnetic arrival              |
| **Popover / Dropdown**       | 140ms–180ms     | `scale(0.96) -> 1` + origin anchoring   | Anchored physical unfold             |

---

### 2. Five Production-Grade Implementation Recipes

#### Recipe 1: Tactile Elastic Button Press (React + Framer Motion)

```tsx
import React from 'react';
import { motion } from 'framer-motion';

export function TactileButton({
  children,
  onClick,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const handleClick = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(8); // Subtle 8ms tactile micro-pulse
    }
    onClick?.();
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.96, y: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`inline-flex items-center justify-center px-4 py-2 font-medium text-sm rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm hover:shadow active:shadow-inner touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${className}`}
    >
      {children}
    </motion.button>
  );
}
```

---

#### Recipe 2: Organic Squash-and-Stretch Toggle Switch

```tsx
import React from 'react';
import { motion } from 'framer-motion';

export function ElasticToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex items-center gap-3 cursor-pointer select-none">
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-7 rounded-full p-0.5 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
          checked ? 'bg-indigo-600' : 'bg-neutral-300 dark:bg-neutral-700'
        }`}
      >
        <motion.div
          animate={{
            x: checked ? 20 : 0,
            scaleX: [1, 1.25, 0.95, 1], // Squash as it pushes off, stretches in transit, snaps into place
            scaleY: [1, 0.85, 1.05, 1],
          }}
          transition={{
            x: { type: 'spring', stiffness: 480, damping: 28 },
            scaleX: { duration: 0.22 },
            scaleY: { duration: 0.22 },
          }}
          className="w-6 h-6 rounded-full bg-white shadow-md"
        />
      </button>
    </label>
  );
}
```

---

#### Recipe 3: Animated SVG Draw-On Checkbox

```tsx
import React from 'react';
import { motion } from 'framer-motion';

export function DrawOnCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (c: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex items-center gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
          checked
            ? 'bg-indigo-600 border-indigo-600 text-white'
            : 'border-neutral-400 dark:border-neutral-600 bg-white dark:bg-neutral-900'
        }`}
      >
        <svg
          viewBox="0 0 16 16"
          className="w-3.5 h-3.5 stroke-current fill-none stroke-[2.4] stroke-linecap-round stroke-linejoin-round"
        >
          <motion.path
            d="M 3.5 8.5 L 6.5 11.5 L 12.5 4.5"
            initial={false}
            animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
      </button>
      <span className="text-sm text-neutral-800 dark:text-neutral-200">{label}</span>
    </label>
  );
}
```

---

#### Recipe 4: Dynamic Directional Toast with Spring Layout

```tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToastProps {
  id: string;
  message: string;
  onDismiss: (id: string) => void;
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastProps[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.14 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="pointer-events-auto flex items-center justify-between min-w-[280px] p-4 rounded-xl bg-neutral-900 text-white shadow-xl border border-neutral-800"
          >
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="ml-3 text-xs text-neutral-400 hover:text-white transition-colors"
            >
              Dismiss
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
```

---

#### Recipe 5: Context-Aware Popover with Dynamic `transform-origin`

```css
/* Popover Unfold from Anchor Coordinate */
.popover-bubble {
  transform-origin: var(--radix-popover-content-transform-origin, top center);
  animation: popover-unfold 160ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes popover-unfold {
  from {
    opacity: 0;
    transform: scale(0.94) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
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
