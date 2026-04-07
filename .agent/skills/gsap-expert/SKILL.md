---
name: gsap-expert
description: GreenSock Animation Platform (GSAP 3.12+) mastery. Core tweens, timelines, ScrollTrigger, ScrollSmoother, plugins, React useGSAP hook, responsive animations, performance. Use when building scroll-driven animations, complex sequencing, SVG morphing, or any animation beyond CSS capabilities.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 3.2.0
last-updated: 2026-04-07
applies-to-model: gemini-3-1-pro, claude-3-7-sonnet
---

# GSAP Expert — 3.12+ Dense Reference

## Hallucination Traps (Read First)
- ❌ `gsap.registerPlugin(ScrollTrigger)` optional → ✅ **REQUIRED** before any use — must call before component mounts
- ❌ `easeInOut`, `Power2.easeOut` (GSAP 2 syntax) → ✅ `"power2.inOut"` (string, GSAP 3)
- ❌ `raw useEffect` for GSAP in React → ✅ `useGSAP` from `@gsap/react` — handles cleanup automatically
- ❌ Timeline position as 2nd arg → ✅ position is the **3rd** arg: `tl.to(el, { x: 100 }, "<")`
- ❌ `markers: true` in production → ✅ Debug only — never ship. `gsap.config({ markers: false })`
- ❌ Animate `width`, `height`, `top`, `left` → ✅ Only `x`, `y`, `scale`, `rotation`, `opacity` (GPU composited)
- ❌ 1 ScrollTrigger per list item → ✅ Use `ScrollTrigger.batch()` for lists — 1 battery per N items
- ❌ `dependencies` option spelled `deps` → ✅ option is `dependencies` (not `deps`)
- ❌ GSAP in Next.js Server Components → ✅ Always `"use client"` — GSAP is browser-only

---

## Core Tweens

```javascript
gsap.to(".box", { x: 100, opacity: 1, duration: 1, ease: "power2.out" });
gsap.from(".box", { y: -50, opacity: 0, duration: 0.8 });
gsap.fromTo(".box", { x: -100 }, { x: 0, duration: 1, ease: "expo.out" });
gsap.set(".box", { transformOrigin: "center center", willChange: "transform" });

// Stagger (multiple elements)
gsap.from(".item", { opacity: 0, y: 30, stagger: 0.08, ease: "power3.out" });
gsap.from(".item", { opacity: 0, stagger: { each: 0.1, from: "center", grid: "auto" } });
```

---

## Timelines

```javascript
const tl = gsap.timeline({ defaults: { ease: "power2.out", duration: 0.6 } });

tl.from(".hero-title", { y: 60, opacity: 0 })
  .from(".hero-sub",   { y: 40, opacity: 0 }, "-=0.4")   // overlap 0.4s
  .from(".hero-cta",   { scale: 0.9, opacity: 0 }, "<0.1") // 0.1s after prev starts
  .to(".hero-img",     { x: 0, opacity: 1 }, 0.3);        // absolute 0.3s into tl

// Position symbols:
// "<"      → same start time as previous tween
// ">"      → after previous ends
// "-=0.5"  → 0.5s before previous ends (overlap)
// "+=0.5"  → 0.5s after previous ends (gap)
// "2"      → absolute 2s from timeline start

// Runtime control
tl.play(); tl.pause(); tl.reverse(); tl.seek(1.5); tl.timeScale(2); // 2x speed
```

---

## ScrollTrigger

```javascript
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger); // REQUIRED — call once at module level

// Basic scroll-triggered animation
gsap.from(".section", {
  scrollTrigger: {
    trigger: ".section",
    start: "top 80%",   // "triggerEdge viewportEdge"
    end: "bottom 20%",
    scrub: 1,           // smooth scrubbing (seconds to catch up) | true = instant
    pin: true,          // pin element during scroll
    anticipatePin: 1,   // prevents jump on pin
    markers: false,     // NEVER true in production
  },
  y: 100, opacity: 0,
});

// Batch — for lists (1 ST instance per group, not per item)
ScrollTrigger.batch(".card", {
  onEnter: (elements) => gsap.from(elements, { opacity: 0, y: 40, stagger: 0.08 }),
  start: "top 85%",
});

// Pin + scrub storytelling
const tl = gsap.timeline({
  scrollTrigger: { trigger: ".scene", pin: true, scrub: true, end: "+=3000" }
});
tl.from(".layer-1", { x: -200 }).from(".layer-2", { x: 200 }, "<");

// Cleanup — MANDATORY on SPA route unmount
ScrollTrigger.killAll(); // in component cleanup / router onChange
```

---

## React Integration (`useGSAP`)

```tsx
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";

gsap.registerPlugin(ScrollTrigger); // once, outside component

export function HeroSection() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // ✅ All GSAP code here is automatically scoped & cleaned up
    gsap.from(".hero-title", { y: 60, opacity: 0, duration: 0.8 });

    gsap.from(".hero-card", {
      scrollTrigger: { trigger: ".hero-card", start: "top 80%" },
      y: 40, opacity: 0, stagger: 0.1,
    });
  }, { scope: container, dependencies: [] }); // re-runs when dependencies change

  return <div ref={container}><h1 className="hero-title">...</h1></div>;
}

// With cleanup for dynamic content:
useGSAP(() => {
  const ctx = gsap.context(() => {
    gsap.from(".item", { opacity: 0, stagger: 0.05 });
  }, container);
  return () => ctx.revert(); // explicit cleanup if needed beyond useGSAP scope
}, { scope: container, dependencies: [items] });
```

---

## Responsive Animations (`gsap.matchMedia`)

```javascript
// Replaces window.matchMedia listeners + resize handlers
const mm = gsap.matchMedia();

mm.add("(min-width: 768px)", () => {
  gsap.to(".sidebar", { x: 0, duration: 0.5 });
  // Return cleanup function
  return () => gsap.set(".sidebar", { x: -300 });
});

mm.add("(max-width: 767px)", () => {
  gsap.to(".mobile-menu", { y: 0, duration: 0.4 });
});

// In React — use inside useGSAP
useGSAP(() => {
  const mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    gsap.from(".hero", { y: 100, duration: 1 });
  });
  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set(".hero", { opacity: 1 }); // instant, no animation
  });
});
```

---

## Plugin Reference

| Plugin | Use For | Registration |
|--------|---------|-------------|
| `ScrollTrigger` | Scroll-driven animations | `gsap.registerPlugin(ScrollTrigger)` |
| `ScrollSmoother` | Smooth native scroll momentum | Requires `ScrollTrigger` + Club GSAP |
| `Flip` | Stateful layout morphing (FLIP technique) | `gsap.registerPlugin(Flip)` |
| `Draggable` | Interactive drag/sort/resize | `gsap.registerPlugin(Draggable)` |
| `SplitText` | Character/word/line text splits | Call `.revert()` after use to prevent SEO damage |
| `DrawSVG` | SVG stroke-dasharray animations | Club GSAP |
| `MorphSVG` | SVG path morphing | Club GSAP |
| `ScrollToPlugin` | Programmatic scroll-to | `gsap.registerPlugin(ScrollToPlugin)` |

---

## Performance Rules

```
✅ Animate: x, y, scale, rotation, skewX/Y, opacity (GPU composited transforms)
❌ Never:   width, height, top, left, padding, margin (triggers layout/paint)
✅ Use willChange: "transform" on elements that will animate
✅ overwrite: "auto" to kill conflicting tweens automatically
✅ ScrollTrigger.batch() for lists — NOT 1 instance per item
✅ gsap.ticker.lagSmoothing(0) in high-framerate contexts (optional)
❌ Don't animate SVG path 'd' attribute directly — use MorphSVG plugin
```
