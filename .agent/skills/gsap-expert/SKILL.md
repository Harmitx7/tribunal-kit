---
name: gsap-expert
description: GreenSock Animation Platform (GSAP 3.12+) mastery. Core tweens, timelines, ScrollTrigger, plugins, React useGSAP hook.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 3.1.0
last-updated: 2026-04-03
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# GSAP Expert (Dense Reference)

> GSAP 3.12+ exclusively. Not jQuery. Require clear cleanup.

## Core API
- **Tweens:** `gsap.to()`, `gsap.from()`, `gsap.fromTo()`, `gsap.set()`.
- **Easing:** `power1`-`power4`, `back`, `bounce`, `elastic`, `circ`, `expo`, `sine`, `steps`.
  - Types: `.in`, `.out`, `.inOut`.
  - ❌ HALLUCINATION TRAP: Do NOT use `easeInOut`, `Power2.easeOut`. GSAP 3 expects string "power2.out".
- **Stagger:** `stagger: 0.1` or `{ each: 0.1, from: "center", grid: "auto" }`.

## Timelines (`gsap.timeline`)
- **Sequencing:** Chain Tweens `.to().to()`.
- **Positioning:** `<` (start with previous), `>` (after previous), `-=0.5` (overlap), `+=0.5` (gap), `2` (absolute).
  - ❌ HALLUCINATION TRAP: Position is the 3rd argument (e.g. `tl.to(el, {x:100}, "<")`), NOT inside the config object!
- **Control:** `.play()`, `.pause()`, `.reverse()`, `.seek()`.

## ScrollTrigger
- **Reg:** `gsap.registerPlugin(ScrollTrigger)` BEFORE use! (Common Hallucination Trap)
- **Syntax:**
  ```js
  scrollTrigger: {
    trigger: ".hero", start: "top bottom", end: "bottom top", 
    scrub: true, // or 0.5 (smoothed)
    pin: true, anticipatePin: 1
  }
  ```
- **Cleanup:** `ScrollTrigger.killAll()` on SPA routing unmount to prevent leaks.
- ❌ HALLUCINATION TRAP: `markers: true` is for debug ONLY. Never ship to production. Do not use 1 ScrollTrigger per item, use `ScrollTrigger.batch()`.

## React Integration (`useGSAP`)
- **Hook:** `import { useGSAP } from "@gsap/react"`
  ```jsx
  useGSAP(() => {
    gsap.from(".box", { opacity: 0 }); // Scoped automatically
  }, { scope: containerRef, dependencies: [count] });
  ```
- ❌ HALLUCINATION TRAP: Do NOT use raw `useEffect` without `gsap.context()`. Option is `dependencies`, NOT `deps`.
- ❌ HALLUCINATION TRAP: GSAP crashes on SSR. Use `"use client"` in Next.js.

## Performance
- **Always Animate Transforms:** `x`, `y`, `scale`, `rotation`, `opacity`. (GPU composited).
- ❌ HALLUCINATION TRAP: Do NOT animate `width`, `height`, `left`, `top`. These trigger heavy layout thrashing.
- **Overwrite:** `overwrite: "auto"` stops conflicting overlapping tweens.

## Plugin Ecosystem
- `Flip`: Stateful layout morphing.
- `Draggable`: Interactable sliders/boards.
- `ScrollToPlugin`: Window/Element programmatic scrolling.
- `SplitText`: Needs `.revert()` after completion to avoid SEO damage!
- *All plugins must be explicitly registered via `gsap.registerPlugin()`.*

## Callbacks & Cleanup
- `onStart`, `onUpdate`, `onComplete` are standard config options.
- Context Reversion: `ctx.revert()` destroys all internal timelines and trigger bindings created inside a scoping block. Mandatory for Vue/Svelte destroyed lifecycle.
