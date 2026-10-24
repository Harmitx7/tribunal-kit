# 60fps Web UI Motion Performance & Accessibility Reference

> **Authority**: W3C Web Animations API (WAAPI), Google Chrome Rendering Team & WCAG 2.1  
> **Applicable Domains**: Motion Engineering, 60fps Animation, Accessibility  
> **Status**: Verified Specification Reference  

---

## 1. The 16.6ms Frame Budget & The Rendering Pipeline

To maintain 60 frames per second (or 8.3ms for 120Hz ProMotion displays), the browser must complete JavaScript, Style, Layout, Paint, and Composite calculations within 16.6 milliseconds.

```
JavaScript ──> Style Recalculation ──> Layout ──> Paint ──> Composite
     │                                   │          │            │
     │                                   ▼          ▼            ▼
  Cheap                               EXPENSIVE  EXPENSIVE     CHEAPEST
                                      (Reflow)   (Repaint)    (GPU Layers)
```

### The Fast Path: Composite-Only Properties
Only two CSS properties skip both Layout and Paint entirely and run purely on the GPU composite thread:
1. `transform` (`translate3d`, `scale`, `rotate`)
2. `opacity`

---

## 2. Layout Thrashing & How to Eliminate It

Layout thrashing occurs when JavaScript writes to the DOM and then reads a layout geometric property within the same execution frame, forcing the browser to perform synchronous reflow:

```javascript
// ❌ LAYOUT THRASHING: Reading layout inside a mutation loop
elements.forEach(el => {
  const height = el.offsetHeight; // Forces synchronous layout!
  el.style.height = `${height + 10}px`;
});

// ✅ BATCHED READS THEN WRITES: Read all geometry first, then apply transforms
const heights = elements.map(el => el.offsetHeight);
requestAnimationFrame(() => {
  elements.forEach((el, i) => {
    el.style.transform = `scaleY(${(heights[i] + 10) / heights[i]})`;
  });
});
```

---

## 3. WCAG Accessibility: `prefers-reduced-motion`

Accessible motion is not optional. Users with vestibular disorders can experience nausea, dizziness, or migraines from parallax or large-scale interface motion.

### Universal Reduced-Motion Guardrail:
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

In JavaScript/GSAP:
```javascript
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (prefersReduced) {
  // Execute instantaneous state jump instead of tweening
  gsap.set(target, { opacity: 1, y: 0 });
} else {
  gsap.to(target, { opacity: 1, y: 0, duration: 0.4 });
}
```
