---
name: 60fps-animation
description: "Use when Web animation performance guidance for avoiding layout thrashing, achieving 60/120fps motion, and using GPU compositor-friendly properties (transform, opacity)."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - motion-engineering
  - accessible-animation
  - fixing-motion-performance
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# 60fps Animation — GPU Compositor & High-Performance Motion

---

## 🛠️ Technical Architecture & Reference Recipes

---

## 🛠️ Technical Architecture & Reference Recipes

---

## 2026 Motion Performance & GPU Invariants

1. **CSS `@starting-style` Native Transitions**:
   ```css
   /* Native entry animation without JS transition wrappers */
   dialog[open] {
     opacity: 1;
     transform: scale(1);
     transition:
       opacity 200ms ease,
       transform 200ms ease;
     @starting-style {
       opacity: 0;
       transform: scale(0.95);
     }
   }
   ```
2. **Native Scroll-Driven Animations**: Use CSS `animation-timeline: view()` or `scroll()` to run scroll animations directly on the compositor thread without firing JavaScript scroll event handlers.
3. **No Layout Thrashing in JS**: Never interleave DOM reads (`element.getBoundingClientRect()`, `offsetHeight`) with DOM writes (`style.transform`). Batch reads first, then writes in `requestAnimationFrame()`.

## Hallucination Traps (Read First)

- ❌ Animating `top`, `left`, `width`, `height` → ✅ Animate `transform: translate3d(...)` and `scale(...)`
- ❌ Using JavaScript scroll listeners for parallax/fade → ✅ Use native CSS `animation-timeline`
- ❌ Setting `will-change: transform` globally on every element → ✅ Blows GPU VRAM; apply only during active interaction
- ❌ Animating box-shadow directly → ✅ Animate `opacity` on a pseudo-element (`::after`) with pre-rendered shadow

---

## 4 Performance Rules

### 1. Compositor-Only Animation Pipeline

Only animate properties handled strictly by the GPU compositor layer:

- ✅ **Compositor Properties** (Zero Layout / Zero Paint): `transform` (`translate3d`, `scale`, `rotate`) and `opacity`.
- ❌ **Forbidden Animating Properties** (Triggers Full Layout Re-calculation): `width`, `height`, `margin`, `padding`, `top`, `left`, `border-width`.

### 2. Replacing Width/Height Transitions with Scale Math

Instead of animating `width: 100px` to `200px`:

```css
/* BAD: Triggers Layout recalculation on every frame */
.box-bad {
  transition: width 300ms ease;
}

/* GOOD: GPU Compositor Hardware Accelerated */
.box-good {
  transform: scaleX(2);
  transform-origin: left center;
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

### 3. `will-change` Management

- Apply `will-change: transform, opacity` ONLY right before or during active animation.
- Remove `will-change` when animation completes to free up GPU VRAM memory!

### 4. Layout Thrashing Prevention in JS

- Never interleave DOM reads (`element.offsetHeight`) with DOM writes (`element.style.height = ...`) inside requestAnimationFrame or scroll handlers. Batch all reads first, then perform all writes.
