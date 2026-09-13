---
name: morphing-icons
description: Use when High-craft interactive state-morphing vector icon systems (Play ⇄ Pause, Menu ⇄ Close ⇄ Arrow, Sun ⇄ Moon, Check ⇄ Copy), coordinate interpolation, mass conservation, optical centering, and WCAG 2.2 accessibility.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - svg-animation
  - micro-interaction
  - 60fps-animation
  - review-animations
  - accessible-animation
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Morphing Icons — Interactive State-Morphing Vector Architecture

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `morphing-icons` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when High-craft interactive state-morphing vector icon systems (Play ⇄ Pause, Menu ⇄ Close ⇄ Arrow, Sun ⇄ Moon, Check ⇄ Copy), coordinate interpolation, mass conservation, optical centering, and WCAG 2.2 accessibility.
- **DO NOT activate when:** The task falls outside the `morphing-icons` domain or is managed by a different dedicated specialist.

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

A generic icon switch simply unmounts `<PlayIcon />` and mounts `<PauseIcon />`, resulting in visual popping that breaks cognitive continuity. A master-grade morphing icon treats vectors as dynamic physical membranes: anchor coordinates interpolate smoothly along continuous Bézier curves, stroke weight and optical mass remain constant, and transitions respond sub-240ms with tactile haptic precision.

---


---

## 1. Optical Balance & Geometric Mechanics

### The Optical Center Shift (Play ⇄ Pause)

A standard 24x24 Play triangle (`M8 5v14l11-7z`) has its geometric center at `x = 13.5`, but its optical center of mass sits at `x = 11.8`. When morphing into two centered Pause bars (`x = 6` to `10` and `x = 14` to `18`), failing to compensate creates a jarring perceived bounce:

```
Geometric Center Play:  [   ▷   ] -> x: 13.5
Optical Center Play:    [  ▷    ] -> x: 11.8
Pause Bars Center:      [ ||    ] -> x: 12.0
Offset Correction:      Translate Play container x: -1.2px during play state!
```

---

## 2. Five Production-Grade State-Morphing Recipes

### Recipe 1: Master Play ⇄ Pause Morph (Dual-Path Bézier Architecture)

Splitting the Play triangle into two trapezoids allows seamless interpolation into two vertical Pause bars with zero coordinate popping:

```tsx
import React from 'react';
import { motion } from 'framer-motion';

interface PlayPauseProps {
  isPlaying: boolean;
  onToggle: () => void;
  size?: number;
  className?: string;
}

export function PlayPauseButton({
  isPlaying,
  onToggle,
  size = 28,
  className = '',
}: PlayPauseProps) {
  // Left half: morphs between left half of triangle and left pause bar
  const leftPath = isPlaying
    ? 'M 6 5 L 10 5 L 10 19 L 6 19 Z' // Pause bar 1
    : 'M 7 5 L 13 8.7 L 13 15.3 L 7 19 Z'; // Play left half

  // Right half: morphs between right pause bar and play tip
  const rightPath = isPlaying
    ? 'M 14 5 L 18 5 L 18 19 L 14 19 Z' // Pause bar 2
    : 'M 13 8.7 L 19 12 L 19 12 L 13 15.3 Z'; // Play right tip

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileTap={{ scale: 0.92 }}
      className={`relative p-2.5 rounded-full bg-neutral-900 text-white hover:bg-neutral-800 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${className}`}
      aria-label={isPlaying ? 'Pause' : 'Play'}
      aria-pressed={isPlaying}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className="overflow-visible"
        style={{
          // Optical center alignment: shift play slightly rightward to visually balance canvas
          transform: isPlaying ? 'translateX(0px)' : 'translateX(1px)',
          transition: 'transform 200ms ease-out',
        }}
      >
        <motion.path
          d={leftPath}
          animate={{ d: leftPath }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.path
          d={rightPath}
          animate={{ d: rightPath }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
    </motion.button>
  );
}
```

### Recipe 2: Tri-State Navigation Icon (Hamburger ⇄ Close X ⇄ Arrow Back)

```tsx
import React from 'react';
import { motion } from 'framer-motion';

export type NavIconState = 'menu' | 'close' | 'arrow';

interface NavMorphIconProps {
  state: NavIconState;
  onClick: () => void;
  className?: string;
}

export function NavMorphIcon({ state, onClick, className = '' }: NavMorphIconProps) {
  const labels = {
    menu: 'Open navigation menu',
    close: 'Close menu',
    arrow: 'Go back',
  };

  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${className}`}
      aria-label={labels[state]}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Top Line */}
        <motion.line
          initial={false}
          animate={
            state === 'close'
              ? { x1: 5, y1: 5, x2: 19, y2: 19 }
              : state === 'arrow'
                ? { x1: 12, y1: 5, x2: 5, y2: 12 }
                : { x1: 4, y1: 6, x2: 20, y2: 6 }
          }
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* Center Line */}
        <motion.line
          initial={false}
          animate={
            state === 'close'
              ? { opacity: 0, scaleX: 0 }
              : state === 'arrow'
                ? { x1: 5, y1: 12, x2: 19, y2: 12, opacity: 1, scaleX: 1 }
                : { x1: 4, y1: 12, x2: 20, y2: 12, opacity: 1, scaleX: 1 }
          }
          transition={{ duration: 0.16 }}
        />

        {/* Bottom Line */}
        <motion.line
          initial={false}
          animate={
            state === 'close'
              ? { x1: 5, y1: 19, x2: 19, y2: 5 }
              : state === 'arrow'
                ? { x1: 12, y1: 19, x2: 5, y2: 12 }
                : { x1: 4, y1: 18, x2: 20, y2: 18 }
          }
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
    </button>
  );
}
```

### Recipe 3: Sun ⇄ Moon Theme Morph with Radiant Particles

```tsx
import React from 'react';
import { motion } from 'framer-motion';

export function ThemeToggleMorph({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="p-2.5 rounded-full text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <motion.svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{ rotate: isDark ? 40 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <mask id="moon-mask">
          <rect x="0" y="0" width="24" height="24" fill="white" />
          <motion.circle
            cx={isDark ? '18' : '26'}
            cy={isDark ? '7' : '2'}
            r="8"
            fill="black"
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          />
        </mask>

        {/* Center Orb (Sun circle morphing into Crescent Moon) */}
        <motion.circle
          cx="12"
          cy="12"
          r={isDark ? 8 : 4.5}
          fill="currentColor"
          mask="url(#moon-mask)"
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* Sun Rays: Scale and Fade out when dark */}
        <motion.g
          stroke="currentColor"
          animate={{
            scale: isDark ? 0.5 : 1,
            opacity: isDark ? 0 : 1,
          }}
          transition={{ duration: 0.2 }}
          style={{ transformOrigin: 'center' }}
        >
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </motion.g>
      </motion.svg>
    </button>
  );
}
```

### Recipe 4: Copy-to-Clipboard ⇄ Checkmark Morph

```tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function CopyCheckButton({ textToCopy }: { textToCopy: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(textToCopy);
    if ('vibrate' in navigator) navigator.vibrate(8); // Tactile micro-haptic
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.button
      onClick={handleCopy}
      whileTap={{ scale: 0.94 }}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
      aria-label={copied ? 'Copied to clipboard' : 'Copy code snippet'}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <AnimatePresence mode="wait" initial={false}>
          {copied ? (
            <motion.path
              key="check"
              d="M 4 12 L 9 17 L 20 6"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              exit={{ pathLength: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              stroke="#10b981"
            />
          ) : (
            <motion.g
              key="copy"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.16 }}
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
      <span>{copied ? 'Copied' : 'Copy'}</span>
    </motion.button>
  );
}
```

---

## 3. Haptic Integration & Physical Feedback

Tactile physical response elevates micro-interactions. On supported mobile platforms or Web Vibration API clients, fire a sub-10ms pulse on successful state transitions:

```typescript
export function triggerHaptic(type: 'light' | 'success' | 'warning' = 'light') {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    const patterns = {
      light: 8,
      success: [10, 30, 12],
      warning: [15, 40, 15],
    };
    navigator.vibrate(patterns[type]);
  }
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
