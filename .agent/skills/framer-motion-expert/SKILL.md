---
name: framer-motion-expert
description: "Use when implementing, optimizing, and timing 60fps/120fps framer motion expert animations, transitions, gesture physics, and reduced-motion fallbacks."
version: 6.0.0
last-updated: 2026-09-29
skills:
  - motion-engineering
  - 60fps-animation
  - accessible-animation
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Framer Motion 12+ — Dense Reference

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `framer-motion-expert` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).


## Activation Boundaries
- **Activate when:** Use when implementing, optimizing, and timing 60fps/120fps framer motion expert animations, transitions, gesture physics, and reduced-motion fallbacks.
- **DO NOT activate when:** The task falls outside the `framer-motion-expert` domain or is managed by a different dedicated specialist agent.


## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. | Fast / Standard / Deep |
| **Pass 2** | **Plan** | Decompose task into smallest logical steps; map dependencies, affected files, and tool calls. | Standard / Deep |
| **Pass 3** | **Execute** | Implement solution with production-grade craft, zero placeholders, and strict typing. | All Modes |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. | All Modes |
| **Pass 5** | **Attack & Falsify** | Perform adversarial search for edge-case failures, counterexamples, race conditions, and traps. | Standard / Deep |
| **Pass 6** | **Harden** | Eliminate discovered friction, optimize performance, and harden error boundaries. | Standard / Deep |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. | All Modes |


---

## 🛠️ Technical Architecture & Reference Recipes

## 🛠️ Technical Architecture & Reference Recipes

## Hallucination Traps (Read First)

- ❌ `<Motion>` (capital M) → ✅ `motion.div` (lowercase dot notation)
- ❌ `motion()` wrapper function → ✅ `motion.div`, `motion.span`, etc.
- ❌ `exitBeforeEnter` prop → ✅ `mode="wait"` on `<AnimatePresence>` (removed in FM7+)
- ❌ `exit` works without `<AnimatePresence>` → ✅ REQUIRES AnimatePresence wrapper
- ❌ `<AnimatePresence>` children without unique `key` → ✅ ALWAYS set `key`
- ❌ `stiffness + damping` AND `duration + bounce` together → ✅ pick ONE pair
- ❌ `m.div` without `<LazyMotion>` wrapper → ✅ REQUIRES LazyMotion parent
- ❌ `layout` animations with `domAnimation` feature set → ✅ requires `domMax`
- ❌ Force-animating `width`/`height`/`top`/`left` → ✅ use `x`,`y`,`scale`,`opacity` (GPU)
- ❌ `viewport.once` defaults to true → ✅ defaults to **false** — add `once: true` for entrance anims

---

## Core Primitives

### `motion.X` / Declarative Animation

```tsx
import { motion } from 'framer-motion';
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3, ease: 'easeOut' }}
/>;
```

### Variants (Stagger / Orchestration)

```tsx
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.4 } },
};
<motion.ul variants={container} initial="hidden" animate="visible">
  {list.map(e => (
    <motion.li key={e.id} variants={item}>
      {e.name}
    </motion.li>
  ))}
</motion.ul>;
```

### Transitions

```tsx
// Tween (default)
transition={{ duration: 0.5, ease: "easeInOut", delay: 0.2, repeat: Infinity, repeatType: "reverse" }}
// Spring (physics)
transition={{ type: "spring", stiffness: 300, damping: 20 }} // OR use duration+bounce, not both
transition={{ type: "spring", duration: 0.8, bounce: 0.25 }}
// Per-property
transition={{ x: { type: "spring", stiffness: 300 }, opacity: { duration: 0.2 } }}
```

---

## Gestures

```tsx
// Hover/Tap/Focus
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  whileFocus={{ boxShadow: "0 0 0 3px rgba(66,153,225,0.6)" }}
  transition={{ type: "spring", stiffness: 400, damping: 15 }}
/>
// Drag
<motion.div
  drag="x"                                   // "x" | "y" | true
  dragConstraints={{ left: -100, right: 100 }}
  dragElastic={0.2}                          // 0=hard stop, 1=free
  dragMomentum={true}
  dragSnapToOrigin
/>
// Scroll-triggered
<motion.div
  initial={{ opacity: 0, y: 50 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.3 }}    // ← once: true is almost always what you want
/>
```

---

## Layout Animations

```tsx
// layout prop — auto-animates position/size changes
<motion.div layout transition={{ type: "spring", stiffness: 200 }}>
  {/* layout="position" = only position, layout="size" = only size */}
</motion.div>

// layoutId — shared element transition (morph between renders)
// List thumbnail → expanded modal:
<motion.div key={item.id} layoutId={`card-${item.id}`} />   // in list
<motion.div layoutId={`card-${selectedId}`} className="modal" /> // in modal
// ❌ TRAP: Cross-tree layoutId requires <LayoutGroup> wrapper
import { LayoutGroup } from "framer-motion";
<LayoutGroup><Sidebar /><MainContent /></LayoutGroup>
```

### AnimatePresence

```tsx
<AnimatePresence mode="sync">
  {' '}
  {/* "sync"|"wait"|"popLayout" */}
  {items.map(item => (
    <motion.div
      key={item.id}
      /* ← REQUIRED */ initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
    />
  ))}
</AnimatePresence>
// mode="wait" — waits for exit before entering
// initial={false} on AnimatePresence — skip first-render animation
```

---

## Scroll Animations

```tsx
import { useScroll, useTransform } from 'framer-motion';
// Page scroll progress (0–1)
const { scrollYProgress } = useScroll();
const y = useTransform(scrollYProgress, [0, 1], [0, -200]);
const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
<motion.div style={{ y, opacity }} />;

// Element-scoped scroll
const ref = useRef(null);
const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
```

---

## Hooks

### `useAnimate` — Imperative sequences

```tsx
import { useAnimate, stagger } from 'framer-motion';
const [scope, animate] = useAnimate(); // ← returns [scope, animate] NOT [ref, controls]
await animate('.item', { opacity: 1 }, { delay: stagger(0.1) });
<div ref={scope}>...</div>;
```

### `useMotionValue` + `useTransform` — No re-renders

```tsx
const x = useMotionValue(0);
const rotateY = useTransform(x, [-200, 200], [-45, 45]);
// ✅ useMotionValue does NOT trigger React re-renders — key perf advantage over useState
<motion.div style={{ x, rotateY }} drag="x" />;
```

### `useSpring` / `useVelocity`

```tsx
const springX = useSpring(x, { stiffness: 300, damping: 30 });
const xVel = useVelocity(x);
const skewX = useTransform(xVel, [-1000, 0, 1000], [-15, 0, 15]);
```

---

## Performance & Bundle

```tsx
// LazyMotion — ~5KB vs ~30KB full bundle
import { LazyMotion, domAnimation, m } from 'framer-motion';
// domAnimation ≈ 5KB | domMax ≈ 20KB (needed for layout/drag)
<LazyMotion features={domAnimation}>
  <m.div animate={{ opacity: 1 }} />
</LazyMotion>;
```

### Accessibility

```tsx
import { useReducedMotion } from 'framer-motion';
const reduce = useReducedMotion();
// opacity/color: always safe | position/scale/rotation: must be disabled when reduce=true
<motion.div
  animate={{ x: reduce ? 0 : 100, opacity: 1 }}
  transition={{ duration: reduce ? 0 : 0.5 }}
/>;
```

### Rules

- ✅ Animate: `x`, `y`, `scale`, `rotation`, `opacity` (GPU composited)
- ❌ Never animate: `width`, `height`, `top`, `left`, `padding`, `margin` (causes layout thrashing)
- ✅ `useMotionValue` for animation-driven values — never `useState`
- ❌ Nest `AnimatePresence` only when necessary — each adds reconciler overhead
- `"use client"` required in Next.js — `motion.div` cannot run in Server Components

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |


## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `frontend-reviewer` · `motion-reviewer` · `ui-ux-auditor`
**Slash Command:** `/review` or `/tribunal-full`

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

### ✅ Pre-Flight Self-Audit Checklist
```
✅ Does animation maintain 60fps/120fps using transform (translate3d, scale) and opacity?
✅ Is optical mass conserved across state interpolations without volume collapse?
✅ Is duration capped within micro-interaction budgets (150ms–280ms)?
✅ Is prefers-reduced-motion respected with graceful instant fallbacks?
✅ Did I prevent layout thrashing and continuous geometry mutations?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
