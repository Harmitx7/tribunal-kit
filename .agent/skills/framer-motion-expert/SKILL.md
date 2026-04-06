---
name: framer-motion-expert
description: Framer Motion 12+ for React. Declarative animations, layout transitions, gestures, scroll-linked motion, AnimatePresence, useAnimate, LazyMotion. Use when building component animations, page transitions, shared layout animations, or gesture-driven UI.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 3.1.0
last-updated: 2026-04-06
---

# Framer Motion 12+ — Dense Reference

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
import { motion } from "framer-motion";
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
/>
```

### Variants (Stagger / Orchestration)
```tsx
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.4 } },
};
<motion.ul variants={container} initial="hidden" animate="visible">
  {list.map(e => <motion.li key={e.id} variants={item}>{e.name}</motion.li>)}
</motion.ul>
// Variant names propagate to children automatically — no need to set initial/animate on each child
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
<AnimatePresence mode="sync"> {/* "sync"|"wait"|"popLayout" */}
  {items.map(item => (
    <motion.div key={item.id} /* ← REQUIRED */
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
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
import { useScroll, useTransform } from "framer-motion";
// Page scroll progress (0–1)
const { scrollYProgress } = useScroll();
const y = useTransform(scrollYProgress, [0, 1], [0, -200]);
const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
<motion.div style={{ y, opacity }} />

// Element-scoped scroll
const ref = useRef(null);
const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
```

---

## Hooks

### `useAnimate` — Imperative sequences
```tsx
import { useAnimate, stagger } from "framer-motion";
const [scope, animate] = useAnimate(); // ← returns [scope, animate] NOT [ref, controls]
await animate(".item", { opacity: 1 }, { delay: stagger(0.1) });
<div ref={scope}>...</div>
```

### `useMotionValue` + `useTransform` — No re-renders
```tsx
const x = useMotionValue(0);
const rotateY = useTransform(x, [-200, 200], [-45, 45]);
// ✅ useMotionValue does NOT trigger React re-renders — key perf advantage over useState
<motion.div style={{ x, rotateY }} drag="x" />
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
import { LazyMotion, domAnimation, m } from "framer-motion";
// domAnimation ≈ 5KB | domMax ≈ 20KB (needed for layout/drag)
<LazyMotion features={domAnimation}><m.div animate={{ opacity: 1 }} /></LazyMotion>
```

### Accessibility
```tsx
import { useReducedMotion } from "framer-motion";
const reduce = useReducedMotion();
// opacity/color: always safe | position/scale/rotation: must be disabled when reduce=true
<motion.div animate={{ x: reduce ? 0 : 100, opacity: 1 }} transition={{ duration: reduce ? 0 : 0.5 }} />
```

### Rules
- ✅ Animate: `x`, `y`, `scale`, `rotation`, `opacity` (GPU composited)
- ❌ Never animate: `width`, `height`, `top`, `left`, `padding`, `margin` (causes layout thrashing)
- ✅ `useMotionValue` for animation-driven values — never `useState`
- ❌ Nest `AnimatePresence` only when necessary — each adds reconciler overhead
- `"use client"` required in Next.js — `motion.div` cannot run in Server Components
