---
name: fixing-motion-performance
description: Audit and fix animation performance issues including layout thrashing, compositor properties, scroll-linked motion, and blur effects. Use when animations stutter, transitions jank, or reviewing CSS/JS animation performance.
version: 3.0.0
last-updated: 2026-07-30
skills:
  - 60fps-animation
  - motion-engineering
  - gsap-performance
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Fixing Motion Performance — 60/120fps Jank-Free Animation

---

## Mandatory Pre-Flight Context Inspection

Before auditing or fixing animation performance, you MUST inspect:
1. Browser Rendering Pipeline (Section 22) → Restrict properties to Composite-only (`transform`, `opacity`) and eliminate Layout/Paint animators
2. Layout Thrashing (Section 33) → Batch all DOM reads (`offsetHeight`, `getBoundingClientRect`) before executing DOM writes (`style.height = ...`)
3. `will-change` VRAM management (Section 53) → Remove `will-change` hints upon animation completion

Guidelines for auditing and resolving web animation jank, layout thrashing, and GPU rendering bottlenecks.

---

## 1. Browser Rendering Pipeline & Compositor Rules

Animations trigger one of 3 rendering costs:
1. **Layout (Expensive)**: Animating `width`, `height`, `margin`, `padding`, `top`, `left`, `flex`, `grid`. Forces full geometry recalculation across the page.
2. **Paint (Moderate)**: Animating `color`, `background-color`, `border-color`, `box-shadow`, `filter`. Forces pixel repaint.
3. **Composite (GPU Fast)**: Animating **`transform`** (`translate`, `scale`, `rotate`) and **`opacity`**. Offloaded entirely to GPU compositor thread!

$$\text{Rule: } \text{Animate ONLY } \mathbf{transform} \text{ and } \mathbf{opacity}$$

---

## 2. Layout Thrashing (Read/Write Interleaving)

NEVER interleave DOM layout measurements (`offsetHeight`, `getBoundingClientRect()`) with DOM mutations (`style.height = ...`) in the same event loop or frame loop!

```javascript
// ❌ WRONG — Triggers Layout Thrashing (Multiple Recalculations)
elements.forEach(el => {
  const h = el.offsetHeight; // READ (Forces Layout Calculation)
  el.style.height = `${h + 10}px`; // WRITE (Invalidates Layout)
});

// ✅ CORRECT — Batch Reads First, Then Batch Writes
const heights = elements.map(el => el.offsetHeight); // BATCH READS
elements.forEach((el, i) => {
  el.style.height = `${heights[i] + 10}px`; // BATCH WRITES
});
```

---

## 3. GPU Hinting (`will-change`)

- Use `will-change: transform, opacity` ONLY on actively animated elements right before interaction begins.
- Remove `will-change` when animation ends to free GPU memory. NEVER place `will-change: transform` globally on hundreds of DOM nodes.

```css
/* Apply hardware acceleration hint to GPU */
.animated-card {
  will-change: transform, opacity;
}
```

---

## Anti-Slop Table

| Performance Issue | Motion Performance Fix | FPS Gain |
| --- | --- | --- |
| Animating `height: 0` to `auto` | FLIP technique or `scaleY` transform animation | 15fps → 60fps |
| Scroll listener mutating inline CSS | `CSS scroll-timeline` or `IntersectionObserver` | Prevents main-thread scroll jank |
| `transition: all 0.3s` | `transition: transform 200ms cubic-bezier(0.16,1,0.3,1), opacity 200ms ease` | Eliminates accidental layout/color recalculations |

---

## 🤖 LLM-Specific Traps

1. **`transition: all`**: Using `all` causes layout recalculation and repaint on every hover.
2. **`requestAnimationFrame` Memory Leaks**: Launching continuous `rAF` loops without cancellation logic (`cancelAnimationFrame`).

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

### ✅ Pre-Flight Self-Audit

```
✅ Are all continuous animations restricted strictly to transform and opacity?
✅ Are DOM reads and writes batched to eliminate layout thrashing?
✅ Is will-change used sparingly on active animated elements only?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

Inspect Chrome Performance tab rendering profile in live preview to verify 60/120fps motion without frame drops.
