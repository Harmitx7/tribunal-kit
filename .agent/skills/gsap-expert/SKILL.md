---
name: gsap-expert
description: GreenSock Animation Platform (GSAP 3.12+) mastery. Core tweens, timelines, ScrollTrigger, plugins, gsap.utils, React useGSAP hook, performance optimization, and multi-framework lifecycle cleanup. Use when building scroll-driven animations, complex sequencing, SVG morphing, or any animation beyond CSS capabilities.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-30
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# GSAP Expert — GreenSock Animation Platform

> GSAP is the professional-grade animation library. It is NOT jQuery `.animate()`.
> Every tween must have a clear purpose, every timeline must clean up, and every ScrollTrigger must call `.kill()` on unmount.

---

## gsap-core — Core API

### Tween Methods

```js
// gsap.to() — animate FROM current state TO target
gsap.to(".box", { x: 200, duration: 1, ease: "power2.out" });

// gsap.from() — animate FROM target TO current state
gsap.from(".box", { opacity: 0, y: 50, duration: 0.8 });

// gsap.fromTo() — explicit start AND end (most predictable)
gsap.fromTo(".box",
  { opacity: 0, y: 30 },   // from
  { opacity: 1, y: 0, duration: 1 } // to
);

// gsap.set() — instant property set, no animation
gsap.set(".box", { transformOrigin: "center center" });
```

### Easing

GSAP eases follow a `name.type` pattern. The names: `power1`–`power4`, `back`, `bounce`, `elastic`, `circ`, `expo`, `sine`, `steps`.

```js
// Types: .in, .out, .inOut
ease: "power3.inOut"   // smooth acceleration + deceleration
ease: "back.out(1.7)"  // overshoot by 1.7 (default)
ease: "elastic.out(1, 0.3)" // amplitude, period
ease: "steps(5)"       // stepped animation (sprite sheets)
ease: "none"           // linear

// ❌ HALLUCINATION TRAP: These do NOT exist in GSAP 3+
// ease: "easeInOut"     — jQuery syntax, NOT GSAP
// ease: "Power2.easeOut" — GSAP 2 syntax, DEPRECATED
// ease: "Cubic.easeIn"  — GSAP 2 syntax, DEPRECATED
```

### Duration & Stagger

```js
// Duration is in seconds (NOT milliseconds like CSS/JS setTimeout)
gsap.to(".items", {
  x: 100,
  duration: 0.6,       // 0.6 seconds
  stagger: 0.1,        // 0.1s between each element

  // Advanced stagger object
  stagger: {
    each: 0.1,          // time between each
    from: "center",     // "start", "center", "end", "edges", "random", or index
    grid: "auto",       // for grid layouts
    ease: "power2.in",  // ease the stagger distribution itself
    amount: 0.8,        // total stagger time (alternative to `each`)
  }
});
```

### Defaults

```js
// Set project-wide defaults — DRY animation config
gsap.defaults({
  duration: 0.8,
  ease: "power2.out",
  overwrite: "auto",   // auto-kill conflicting tweens on same target
});

// Per-tween overrides always win
gsap.to(".box", { x: 100, duration: 1.5 }); // uses 1.5, not 0.8
```

### Callbacks & Control

```js
const tween = gsap.to(".box", {
  x: 200,
  onStart: () => console.log("started"),
  onUpdate: (self) => console.log(self.progress()),
  onComplete: () => console.log("done"),
  onReverseComplete: () => console.log("reversed"),
});

// Control methods
tween.pause();
tween.resume();
tween.reverse();
tween.seek(0.5);       // jump to 0.5 seconds
tween.progress(0.5);   // jump to 50%
tween.kill();           // destroy and garbage collect
```

---

## gsap-timeline — Timelines

### Sequencing

```js
const tl = gsap.timeline({
  defaults: { duration: 0.5, ease: "power2.out" },
  onComplete: () => console.log("Sequence done"),
});

tl.to(".title", { opacity: 1, y: 0 })
  .to(".subtitle", { opacity: 1, y: 0 })    // plays AFTER .title
  .to(".cta", { scale: 1, opacity: 1 });     // plays AFTER .subtitle
```

### Position Parameter (Critical Concept)

The position parameter is the **most powerful** sequencing tool in GSAP. It controls *when* a child animation starts relative to the timeline.

```js
tl.to(".a", { x: 100 })
  .to(".b", { x: 100 }, "<")       // "<" = same start time as previous
  .to(".c", { x: 100 }, ">")       // ">" = after previous ends (default)
  .to(".d", { x: 100 }, "-=0.3")   // 0.3s before previous ends (overlap)
  .to(".e", { x: 100 }, "+=0.5")   // 0.5s after previous ends (gap)
  .to(".f", { x: 100 }, 2)         // absolute: at exactly 2 seconds
  .to(".g", { x: 100 }, "<0.2")    // 0.2s after previous animation's START
  .to(".h", { x: 100 }, ">-0.1");  // 0.1s before previous animation's END

// ❌ HALLUCINATION TRAP: Position parameter is the 3rd argument, NOT a property
// WRONG: tl.to(".a", { x: 100, position: "<" })
// RIGHT: tl.to(".a", { x: 100 }, "<")
```

### Labels

```js
tl.addLabel("intro")
  .to(".title", { opacity: 1 })
  .addLabel("middle")
  .to(".content", { opacity: 1 })
  .to(".sidebar", { x: 0 }, "middle")  // starts at the "middle" label
  .to(".footer", { y: 0 }, "middle+=0.3"); // 0.3s after the "middle" label
```

### Nesting Timelines

```js
function introAnimation() {
  const tl = gsap.timeline();
  tl.from(".hero-title", { y: 60, opacity: 0 })
    .from(".hero-sub", { y: 40, opacity: 0 }, "-=0.3");
  return tl;
}

function contentAnimation() {
  const tl = gsap.timeline();
  tl.from(".card", { y: 80, opacity: 0, stagger: 0.15 });
  return tl;
}

// Master timeline nests sub-timelines
const master = gsap.timeline();
master
  .add(introAnimation())
  .add(contentAnimation(), "-=0.4"); // overlap by 0.4s
```

### Playback Control

```js
const tl = gsap.timeline({ paused: true, repeat: -1, yoyo: true });

tl.play();
tl.pause();
tl.reverse();
tl.restart();
tl.timeScale(2);    // 2× speed
tl.seek("middle");  // jump to label
tl.totalProgress();  // 0–1 across all repeats
```

---

## gsap-scrolltrigger — ScrollTrigger

### Registration (Required)

```js
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ❌ HALLUCINATION TRAP: ScrollTrigger MUST be registered before use
// Forgetting gsap.registerPlugin() is the #1 GSAP bug in AI-generated code
```

### Basic Scroll-Linked Animation

```js
gsap.to(".parallax-bg", {
  y: -200,
  scrollTrigger: {
    trigger: ".hero-section",   // element that triggers
    start: "top bottom",        // "triggerPoint viewportPoint"
    end: "bottom top",          // when to stop
    scrub: true,                // links animation progress to scroll position
    markers: true,              // DEBUG ONLY — remove in production
  }
});
```

### Start / End Syntax

```
start: "top center"      // trigger's top hits viewport's center
start: "top 80%"         // trigger's top hits 80% from viewport top
start: "top top"          // trigger's top hits viewport's top
start: "center center"    // trigger's center hits viewport's center
start: "top bottom-=100"  // 100px before trigger's top hits viewport's bottom
```

### Pinning

```js
ScrollTrigger.create({
  trigger: ".sticky-section",
  start: "top top",
  end: "+=1000",             // pin for 1000px of scrolling
  pin: true,                  // locks element in place
  pinSpacing: true,           // adds equivalent space below (default: true)
  anticipatePin: 1,           // reduces jank — pre-calculates pin
});
```

### Scrub

```js
// scrub: true — instant scrub (direct 1:1 with scroll)
// scrub: 0.5 — smoothed scrub (0.5 second lag behind scroll position)
// scrub: 3 — heavy smoothing (3 second catch-up, cinematic feel)

gsap.to(".progress-bar", {
  scaleX: 1,
  scrollTrigger: {
    trigger: ".article",
    start: "top top",
    end: "bottom bottom",
    scrub: 0.3,
  }
});
```

### Refresh & Cleanup (Critical)

```js
// Force recalculation after DOM changes (images loaded, content injected)
ScrollTrigger.refresh();

// Batch refresh after many DOM mutations
ScrollTrigger.refresh(true); // "safe" mode — deferred to next tick

// Kill ALL ScrollTriggers (page transitions, SPA navigation)
ScrollTrigger.killAll();

// Kill a specific instance
const st = ScrollTrigger.create({ /* ... */ });
st.kill();

// ❌ HALLUCINATION TRAP: Failing to kill ScrollTriggers on unmount
// causes memory leaks, zombie listeners, and broken scroll behavior
// in SPAs (Next.js, Nuxt, SvelteKit, Remix)
```

### Callbacks

```js
ScrollTrigger.create({
  trigger: ".section",
  start: "top center",
  end: "bottom center",
  onEnter: () => console.log("entered from above"),
  onLeave: () => console.log("left going down"),
  onEnterBack: () => console.log("entered from below"),
  onLeaveBack: () => console.log("left going up"),
  onToggle: (self) => console.log("active:", self.isActive),
  onUpdate: (self) => console.log("progress:", self.progress),
  onRefresh: (self) => console.log("recalculated"),
});
```

---

## gsap-plugins — Plugin Ecosystem

### Registration Pattern (All Plugins)

```js
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { Draggable } from "gsap/Draggable";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(Flip, Draggable, ScrollToPlugin);

// ❌ HALLUCINATION TRAP: Every plugin MUST be registered
// ❌ HALLUCINATION TRAP: Some plugins require a GSAP Club license
//    (ScrollSmoother, SplitText, Inertia, ScrambleText, MorphSVG, DrawSVG,
//     MotionPath, Physics2D, PhysicsProps, CustomBounce, CustomWiggle)
//    Free plugins: ScrollTrigger, Flip, Draggable, ScrollToPlugin, Observer,
//                  TextPlugin, MotionPathPlugin, EasePack, CustomEase, GSDevTools (trial)
```

### Flip Plugin (FLIP Technique)

```js
// 1. Capture current state
const state = Flip.getState(".cards");

// 2. Make DOM change (reparent, reclass, reorder)
container.classList.toggle("grid-layout");

// 3. Animate from old state to new state
Flip.from(state, {
  duration: 0.6,
  ease: "power2.inOut",
  stagger: 0.05,
  absolute: true,     // uses position:absolute during animation
  onComplete: () => console.log("Flip done"),
});
```

### Draggable

```js
Draggable.create(".slider-handle", {
  type: "x",                    // "x", "y", "x,y", "rotation"
  bounds: ".slider-track",      // constrain to parent
  inertia: true,                // requires InertiaPlugin (Club)
  edgeResistance: 0.65,         // resistance at bounds edges
  onDrag: function () {
    console.log("x:", this.x);  // `this` = Draggable instance
  },
  onDragEnd: function () {
    console.log("endX:", this.endX); // projected landing position
  },
  snap: {
    x: (val) => Math.round(val / 50) * 50, // snap to 50px grid
  },
});
```

### ScrollToPlugin

```js
gsap.to(window, {
  duration: 1,
  scrollTo: { y: "#section-3", offsetY: 80 },
  ease: "power2.inOut",
});

// Horizontal scroll-to
gsap.to(".container", {
  scrollTo: { x: 500 },
  duration: 0.8,
});
```

### ScrollSmoother (Club GreenSock)

```js
// ⚠️ Club GreenSock plugin — requires license
import { ScrollSmoother } from "gsap/ScrollSmoother";

// HTML structure required:
// <div id="smooth-wrapper">
//   <div id="smooth-content"> ...page... </div>
// </div>

const smoother = ScrollSmoother.create({
  wrapper: "#smooth-wrapper",
  content: "#smooth-content",
  smooth: 1.5,               // seconds of smoothing
  effects: true,             // enables data-speed and data-lag
  normalizeScroll: true,     // prevents mobile address bar jank
});
```

### Observer

```js
import { Observer } from "gsap/Observer";

Observer.create({
  target: window,
  type: "wheel,touch,pointer",
  onUp: () => goToNextSlide(),
  onDown: () => goToPrevSlide(),
  tolerance: 10,             // pixel threshold before firing
  preventDefault: true,
  wheelSpeed: -1,            // invert wheel direction
});
```

### SplitText (Club GreenSock)

```js
// ⚠️ Club GreenSock plugin — requires license
import { SplitText } from "gsap/SplitText";

const split = new SplitText(".hero-heading", {
  type: "chars,words,lines",
  linesClass: "split-line",
});

gsap.from(split.chars, {
  opacity: 0,
  y: 20,
  rotateX: -60,
  stagger: 0.02,
  duration: 0.6,
  ease: "back.out(1.7)",
  onComplete: () => split.revert(), // CLEANUP — restore original DOM
});

// ❌ HALLUCINATION TRAP: Always call split.revert() when done
// Leaving split DOM nodes causes accessibility and SEO issues
```

### CustomEase

```js
import { CustomEase } from "gsap/CustomEase";

CustomEase.create("myBounce", "M0,0 C0.14,0 0.27,0.58 0.32,0.82 ...");
gsap.to(".box", { x: 300, ease: "myBounce" });
```

### GSDevTools

```js
// Debug timeline visually — NEVER ship to production
import { GSDevTools } from "gsap/GSDevTools";

GSDevTools.create({ animation: masterTimeline });
```

---

## gsap-utils — Utility Functions

```js
// clamp — constrain a value between min and max
gsap.utils.clamp(0, 100, 150); // 100

// mapRange — remap value from one range to another
gsap.utils.mapRange(0, 100, 0, 1, 50); // 0.5

// normalize — convert a value in a range to 0–1
gsap.utils.normalize(0, 500, 250); // 0.5

// interpolate — blend between values
gsap.utils.interpolate(0, 100, 0.75); // 75
gsap.utils.interpolate("red", "blue", 0.5); // blends colors
gsap.utils.interpolate({ x: 0 }, { x: 100 }, 0.5); // { x: 50 }

// random — random value (can be snapped)
gsap.utils.random(0, 100);          // float
gsap.utils.random(0, 100, 5);       // snapped to nearest 5
gsap.utils.random([10, 20, 30]);    // pick from array

// snap — snap value to nearest increment or array value
gsap.utils.snap(10, 23);            // 20
gsap.utils.snap([0, 50, 100], 38);  // 50

// toArray — convert selector/NodeList to a real array (safe)
const boxes = gsap.utils.toArray(".box"); // always returns an Array

// selector — scoped querySelector factory
const q = gsap.utils.selector(myRef);
gsap.to(q(".title"), { opacity: 1 }); // only searches within myRef

// wrap — wrap index around an array
const colors = ["red", "green", "blue"];
gsap.utils.wrap(colors, 5); // "blue" (wraps around)

// pipe — compose multiple utility functions
const clampAndRound = gsap.utils.pipe(
  gsap.utils.clamp(0, 100),
  Math.round
);
clampAndRound(125.7); // 100
```

---

## gsap-react — React Integration

### The `useGSAP` Hook (Official)

```jsx
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";

// ❌ HALLUCINATION TRAP: Do NOT use raw useEffect for GSAP in React
// useEffect does not scope selectors, does not auto-cleanup, and causes
// double-animation bugs in React 18+ Strict Mode

function HeroSection() {
  const containerRef = useRef(null);

  useGSAP(() => {
    // All selectors are automatically scoped to containerRef
    gsap.from(".hero-title", { y: 60, opacity: 0, duration: 0.8 });
    gsap.from(".hero-sub", { y: 40, opacity: 0, duration: 0.6, delay: 0.3 });
  }, { scope: containerRef }); // scope = auto querySelector boundary

  return (
    <div ref={containerRef}>
      <h1 className="hero-title">Welcome</h1>
      <p className="hero-sub">Subtitle</p>
    </div>
  );
}
```

### Dependency Array (Re-running Animations)

```jsx
useGSAP(() => {
  gsap.to(".counter", { innerText: count, snap: { innerText: 1 } });
}, { dependencies: [count], scope: containerRef });

// ❌ HALLUCINATION TRAP: The option is called `dependencies`, NOT `deps`
```

### Manual Context (Without useGSAP)

```jsx
useEffect(() => {
  const ctx = gsap.context(() => {
    gsap.from(".box", { x: -100, opacity: 0 });
  }, containerRef); // scope

  return () => ctx.revert(); // CLEANUP — kills all tweens and ScrollTriggers
}, []);

// gsap.context() is GSAP's own cleanup mechanism
// ctx.revert() kills every tween and ScrollTrigger created inside it
```

### Refs vs. Selectors

```jsx
// ✅ Preferred: useRef + scope
const boxRef = useRef(null);
useGSAP(() => {
  gsap.to(boxRef.current, { x: 100 });
}, { scope: containerRef });

// ✅ Also fine: class selectors when scoped
useGSAP(() => {
  gsap.to(".box", { x: 100 }); // scoped to containerRef
}, { scope: containerRef });

// ❌ BAD: Global selectors without scope
useGSAP(() => {
  gsap.to(".box", { x: 100 }); // matches ALL .box elements globally
});
```

### SSR / Next.js Considerations

```jsx
// Animations must only run on the client
useGSAP(() => {
  // This hook already handles client-only execution
  gsap.from(".element", { opacity: 0 });
}, { scope: containerRef });

// For dynamic imports in Next.js (App Router)
"use client"; // ← required at top of component file

// ❌ HALLUCINATION TRAP: Do NOT import GSAP in server components
// GSAP requires `window` and `document` — it will crash on the server
```

---

## gsap-performance — Performance Optimization

### Transforms Over Layout Properties (Critical)

```js
// ✅ GPU-accelerated (composited — no layout recalculation)
gsap.to(".box", { x: 100, y: 50, rotation: 45, scale: 1.2, opacity: 0.5 });

// ❌ TRIGGERS LAYOUT REFLOW (expensive — avoid animating these)
gsap.to(".box", { width: 200, height: 100, top: 50, left: 100, padding: 20 });

// ❌ HALLUCINATION TRAP: AI often generates `{ left: 100 }` instead of `{ x: 100 }`
// x/y use CSS transform: translate(), which is GPU-composited
// left/top trigger layout recalculation on every frame = jank
```

### `will-change` Management

```js
// GSAP auto-applies will-change: transform during animation
// Do NOT manually add will-change to many elements — it wastes GPU memory

// For known long-running animations, apply manually and remove after:
gsap.set(".persistent-animation", { willChange: "transform" });
// ... animation runs ...
gsap.set(".persistent-animation", { willChange: "auto" }); // release GPU memory
```

### Batching & `gsap.ticker`

```js
// Use gsap.ticker instead of requestAnimationFrame for sync
gsap.ticker.add((time, deltaTime, frame) => {
  // Runs in sync with GSAP's internal RAF loop
  // Use for particle systems, canvas drawing, etc.
});

// Throttle ticker to 30fps (for low-power devices)
gsap.ticker.fps(30);

// Lazy rendering (default: true) — GSAP batches reads/writes
// Only disable if you need synchronous layout reads mid-animation
gsap.ticker.lagSmoothing(500, 33); // smooth large frame drops
```

### ScrollTrigger Performance

```js
// ❌ BAD: One ScrollTrigger per item in a long list
document.querySelectorAll(".item").forEach(item => {
  ScrollTrigger.create({ trigger: item, /* ... */ }); // 100+ instances = jank
});

// ✅ BETTER: Use ScrollTrigger.batch()
ScrollTrigger.batch(".item", {
  onEnter: (elements) => {
    gsap.from(elements, { opacity: 0, y: 50, stagger: 0.1 });
  },
  onLeave: (elements) => {
    gsap.to(elements, { opacity: 0 });
  },
});

// ❌ HALLUCINATION TRAP: Never use `markers: true` in production
// It injects visible debug DOM elements
```

### Overwrite Modes

```js
// Prevent conflicting tweens from stacking
gsap.to(".box", { x: 100, overwrite: "auto" });

// Modes:
// "auto" — kill only conflicting properties on same target (recommended)
// true   — kill ALL tweens on same target
// false  — allow stacking (default, can cause jank)
```

---

## gsap-frameworks — Vue, Svelte & Framework Lifecycle

### Vue 3 (Composition API)

```vue
<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const containerRef = ref(null);
let ctx;

onMounted(() => {
  ctx = gsap.context(() => {
    gsap.from(".box", {
      y: 60, opacity: 0, duration: 0.8,
      scrollTrigger: { trigger: ".box", start: "top 80%" },
    });
  }, containerRef.value); // scope to component root
});

onUnmounted(() => {
  ctx.revert(); // CRITICAL: kills all tweens + ScrollTriggers
});
</script>

<template>
  <div ref="containerRef">
    <div class="box">Animated</div>
  </div>
</template>
```

### Svelte

```svelte
<script>
  import { onMount, onDestroy } from "svelte";
  import { gsap } from "gsap";
  import { ScrollTrigger } from "gsap/ScrollTrigger";

  gsap.registerPlugin(ScrollTrigger);

  let container;
  let ctx;

  onMount(() => {
    ctx = gsap.context(() => {
      gsap.from(".box", { y: 60, opacity: 0, duration: 0.8 });
    }, container);
  });

  onDestroy(() => {
    ctx?.revert(); // cleanup on component destroy
  });
</script>

<div bind:this={container}>
  <div class="box">Animated</div>
</div>
```

### Universal Cleanup Rules

```
✅ ALWAYS use gsap.context() in framework components
✅ ALWAYS call ctx.revert() on unmount/destroy/cleanup
✅ ALWAYS call ScrollTrigger.kill() or .killAll() on route changes (SPA)
✅ ALWAYS scope selectors to the component root

❌ NEVER leave orphaned ScrollTriggers after navigation
❌ NEVER use global selectors without scoping in component frameworks
❌ NEVER forget to revert SplitText instances (corrupts DOM)
```

---

## Common Animation Patterns

### Fade-In On Scroll (Batch)

```js
ScrollTrigger.batch(".fade-in", {
  onEnter: (elements) => {
    gsap.fromTo(elements,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power2.out" }
    );
  },
  start: "top 85%",
});
```

### Horizontal Scroll Section

```js
const sections = gsap.utils.toArray(".panel");

gsap.to(sections, {
  xPercent: -100 * (sections.length - 1),
  ease: "none",
  scrollTrigger: {
    trigger: ".horizontal-container",
    pin: true,
    scrub: 1,
    snap: 1 / (sections.length - 1),
    end: () => "+=" + document.querySelector(".horizontal-container").offsetWidth,
  },
});
```

### Magnetic Button

```js
const btn = document.querySelector(".magnetic-btn");

btn.addEventListener("mousemove", (e) => {
  const { left, top, width, height } = btn.getBoundingClientRect();
  const x = (e.clientX - left - width / 2) * 0.3;
  const y = (e.clientY - top - height / 2) * 0.3;
  gsap.to(btn, { x, y, duration: 0.3, ease: "power2.out" });
});

btn.addEventListener("mouseleave", () => {
  gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" });
});
```

### Counter / Number Ticker

```js
const obj = { val: 0 };
gsap.to(obj, {
  val: 12847,
  duration: 2,
  ease: "power1.out",
  snap: { val: 1 },
  onUpdate: () => {
    document.querySelector(".counter").textContent = obj.val.toLocaleString();
  },
});
```

---

## Output Format

When this skill produces or reviews code, structure your output as follows:

```
━━━ GSAP Expert Report ━━━━━━━━━━━━━━━━━━━━━━━━
Skill:       GSAP Expert
GSAP Version: 3.12+
Scope:       [N files · N animations]
─────────────────────────────────────────────────
✅ Passed:   [checks that passed, or "All clean"]
⚠️  Warnings: [non-blocking issues, or "None"]
❌ Blocked:  [blocking issues requiring fix, or "None"]
─────────────────────────────────────────────────
VBC status:  PENDING → VERIFIED
Evidence:    [test output / lint pass / compile success]
```

**VBC (Verification-Before-Completion) is mandatory.**
Do not mark status as VERIFIED until concrete terminal evidence is provided.

---

## 🤖 LLM-Specific Traps

AI coding assistants often fall into specific bad habits when generating GSAP code. These are strictly forbidden:

1. **GSAP v2 Syntax:** Using `TweenMax`, `TweenLite`, `TimelineMax`, `TimelineLite`, `Power2.easeOut`, or `CSSPlugin`. These are ALL deprecated in GSAP 3+. The correct API is `gsap.to()`, `gsap.timeline()`, and `ease: "power2.out"`.
2. **Missing Plugin Registration:** Every GSAP plugin MUST be registered with `gsap.registerPlugin()` before use. This includes ScrollTrigger, Flip, Draggable, etc.
3. **Missing Cleanup:** Every `gsap.context()` must have a corresponding `.revert()` on unmount. Every `ScrollTrigger` must be `.kill()`ed. Orphaned animations cause memory leaks.
4. **Layout Props Instead of Transforms:** Animating `width`, `height`, `top`, `left`, `margin`, `padding` instead of `x`, `y`, `scale`, `rotation`. Layout props trigger expensive reflows.
5. **Using `useEffect` Instead of `useGSAP`:** In React, always prefer the official `@gsap/react` `useGSAP` hook. It handles scoping, cleanup, and React 18+ Strict Mode.
6. **Hallucinating Easing Names:** `easeInOut`, `Cubic.easeIn`, `easeOutBounce` do NOT exist. Correct format: `power2.inOut`, `bounce.out`, `elastic.out(1, 0.3)`.
7. **Confusing `duration` Units:** GSAP uses seconds. CSS uses milliseconds. `duration: 300` in GSAP means 5 minutes, not 300ms.
8. **Shipping `markers: true`:** Debug markers must never reach production.
9. **Hallucinated Imports:** Using `import gsap from "gsap"` (default import) instead of `import { gsap } from "gsap"` (named import). Both work, but named is the documented standard.
10. **Inventing Plugin Names:** Only use real GSAP plugins. There is no `ParallaxPlugin`, `FadePlugin`, or `AnimatePlugin`.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor` · `performance-optimizer`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing GSAP errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints (e.g., generating Club plugin code when the user has a free license).
4. **Over-Animating:** Adding animations to every element "because it looks cool." Every animation must serve a UX purpose.

### ✅ Pre-Flight Self-Audit

Review these questions before confirming output:
```
✅ Did I use GSAP 3+ syntax exclusively (no TweenMax/TweenLite)?
✅ Did I register every plugin with gsap.registerPlugin()?
✅ Did I clean up with gsap.context().revert() or ScrollTrigger.kill()?
✅ Did I use transforms (x, y, scale, rotation) instead of layout props?
✅ Did I use useGSAP (not useEffect) for React components?
✅ Did I mark Club-only plugins with a license warning comment?
✅ Did I remove markers: true from production code?
✅ Did I respect prefers-reduced-motion for accessibility?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
