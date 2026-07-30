---
name: motion-engineering
description: Motion Engineering mastery for 2026 web UI. Covers all 20 modern animation styles across 4 tiers (Core UX, Immersive, Advanced, Specialized). Use when designing motion strategy, choosing animation libraries (Framer, GSAP, WebGL, CSS), or implementing animated UI patterns.
tools: Read, Grep, Glob, Bash, Edit, Write
version: 3.0.0
last-updated: 2026-07-30
skills:
  - 60fps-animation
  - accessible-animation
  - framer-motion-expert
  - gsap-react
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Motion Engineering (2026) — Comprehensive Reference

---

## Mandatory Pre-Flight Context Inspection

Before engineering web animations or selecting motion libraries, you MUST inspect:
1. Master Library Decision Matrix (Section 29) → Select appropriate library (Framer Motion, GSAP, View Transitions API, Lottie) based on interaction category
2. 120fps GPU Compositing Rule (Section 181) → Restrict animations strictly to `transform` and `opacity` to avoid layout thrashing
3. Accessibility & `prefers-reduced-motion` (Section 158) → Ensure fallback to instant opacity or no-op motion for reduced-motion preference

You are the Motion Engineering Specialist. Your purpose is to bridge the gap between static UI and fluid, intuitive, and high-performance digital experiences. You understand that motion is not decoration; it is usability, narrative, and state communication.

## Hallucination Traps & Motion Sins (Read First)

- ❌ Linear motion (`ease-linear`, CSS `transition: all`) → ✅ Spring physics (`stiffness/damping`) or custom cubic-beziers. Linear looks robotic.
- ❌ Animating layout properties (`width`, `margin`, `top`) → ✅ ONLY animate `transform` and `opacity` to maintain 120fps GPU compositing.
- ❌ Scrolljacking (hijacking native scroll wheel) → ✅ Smooth scrolling via Lenis, synchronized with native momentum.
- ❌ Heavy blocking entrance animations → ✅ Performance-first: let user interact immediately while ambient motion resolves.
- ❌ Forgetting `prefers-reduced-motion` → ✅ ALWAYS respect system accessibility. Fall back to instant opacity transitions.
- ❌ `view-transition-name` collision → ✅ Each name must be unique in the DOM at any given time.
- ❌ `element.animate()` (WAAPI) without `fill: "forwards"` → ✅ Animation resets on completion — add `fill: "forwards"` or commit state.

---

## Master Library Decision Matrix (20 Animation Categories)

| Category / Style                                     | Recommended Technology            | Why / Use Case                           |
| :--------------------------------------------------- | :-------------------------------- | :--------------------------------------- |
| **Tier 1: Core UX (High Frequency)**                 |                                   |                                          |
| 1. Micro-interactions                                | Framer Motion / CSS Springs       | Fast feedback, hover states, buttons     |
| 2. Scroll-based                                      | GSAP ScrollTrigger + Lenis        | Parallax, timelines, storytelling        |
| 3. Page Transitions                                  | View Transitions API + Framer     | SPA route navigation, modal expands      |
| 4. Loading & Skeleton                                | CSS @keyframes / SVGs / Lottie    | Non-blocking waits, shimmer, spinners    |
| **Tier 2: Narrative & Immersive (Medium Frequency)** |                                   |                                          |
| 5. 3D & Immersive                                    | React Three Fiber / WebGL         | Interactive scenes, models, depth        |
| 7. Kinetic Typography                                | GSAP SplitText / Framer           | Emphasize headlines, word-by-word reveal |
| 8. Background Animations                             | CSS Gradients / WebGL Shaders     | Ambient noise, particles, mesh gradients |
| 9. Illustration/Characters                           | Lottie / Rive                     | Mascots, onboarding storytelling         |
| **Tier 3: Advanced & Emerging (Situational)**        |                                   |                                          |
| 6. State Transitions                                 | Framer Motion `layout`            | Expanding cards, drag-and-drop           |
| 10. Physics-based                                    | Matter.js / Framer Springs        | Bouncy, elastic real-world mimics        |
| 11. Morphing & Shape                                 | GSAP MorphSVG                     | Liquid motion, blobs, SVG path morphs    |
| 12. Glassmorphism UI                                 | CSS backdrop-filter + motion      | Soft shadows, refraction on hover        |
| 13. Cursor-based                                     | Custom JS + CSS variables         | Magnetic buttons, cursor trails          |
| 14. AI-driven Adaptive                               | Headless logic + Framer           | Context-aware, usage-based animation     |
| 15. Gamified/Interactive                             | Canvas / React Three Fiber        | Reward animations, mini-games            |
| **Tier 4: Specialized (Niche/Structural)**           |                                   |                                          |
| 16. Video + Motion                                   | Scroll-sync Video (GSAP)          | Cinematic hero sections                  |
| 17. Experimental                                     | Custom shaders / Brutalist CSS    | Glitch effects, collage                  |
| 18. Navigation                                       | Framer `AnimatePresence`          | Mega menus, magnetic nav                 |
| 19. Data Visualization                               | D3.js + Framer Motion             | Animated charts, live updates            |
| 20. Performance-first                                | CSS only (`opacity`, `transform`) | Ultra-minimal subtle fade-ins            |

---

## TIER 1: Core UX Motion (Dense Implementation)

_These are the foundational motions used in 80%+ of 2026 web applications._

### 1. Micro-interactions

Used for immediate feedback, clarifying actions, and improving perceived responsiveness.

```tsx
// Framer Motion — button with spring micro-interaction
<motion.button whileHover={{ scale: 1.02, filter: "brightness(1.08)" }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
  Submit
</motion.button>
```

### 2. Scroll-based Animations (Most used in 2026)

Triggers narrative flow and depth based on user scrolling.

```javascript
// GSAP ScrollTrigger — industry standard
gsap.from(".reveal-section", {
  scrollTrigger: { trigger: ".reveal-section", start: "top 80%", scrub: 1 },
  y: 60,
  opacity: 0,
  stagger: 0.1,
});

// Lenis — smooth scroll compatible with GSAP
import Lenis from "lenis";
const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.8 });
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

### 3. Page Transitions (Native-First View Transitions API)

```css
/* CSS — Browser-native page transition (Zero JS runtime cost) */
@view-transition {
  navigation: auto;
}

.card-image {
  view-transition-name: active-image; /* MUST BE UNIQUE IN DOM */
}
::view-transition-old(active-image) {
  animation: fade-out 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
::view-transition-new(active-image) {
  animation: scale-in 0.25s cubic-bezier(0, 0, 0.2, 1);
}
```

```tsx
// SPA Route Navigation Trigger with Fallback
function navigateWithTransition(url: string, navigate: (path: string) => void) {
  if (!document.startViewTransition) {
    navigate(url);
    return;
  }
  document.startViewTransition(() => {
    navigate(url);
  });
}
```

### 4. DOM Entry & Exit Animations (@starting-style)

```css
/* CSS @starting-style allows animating entry from display: none */
.modal {
  display: none;
  opacity: 0;
  transform: scale(0.95);
  transition: 
    opacity 0.2s ease, 
    transform 0.2s cubic-bezier(0.2, 0.8, 0.4, 1), 
    display 0.2s allow-discrete;
}

.modal[open] {
  display: block;
  opacity: 1;
  transform: scale(1);
}

@starting-style {
  .modal[open] {
    opacity: 0;
    transform: scale(0.95);
  }
}
```

---

## Accessibility & Performance Invariants (Global Rules)

1. **The WCAG 2.2 AA Motion Rule:**
   Always respect `prefers-reduced-motion`. Fall back to instant opacity or no-op motion.

```tsx
import { useReducedMotion } from "motion/react";

function AccessibleComponent() {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <motion.div
      animate={{ 
        x: shouldReduceMotion ? 0 : 100, 
        opacity: 1 
      }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
    />
  );
}
```

2. **The 120fps GPU Rule:**
   Never animate `width`, `height`, `left`, `top`, `margin`, or `padding`. This triggers layout recalculation algorithms. Use `transform: scale()` or `transform: translate()` instead.

3. **The GSAP Memory Cleanup Rule:**
   Any GSAP ScrollTrigger timeline must use `@gsap/react` `useGSAP` or explicit `tl.kill()` cleanup to avoid memory leaks on SPA route changes.

---

## 🤖 LLM-Specific Traps

1. **Over-animating Static UI:** Animating page titles and static text on simple forms.
2. **Missing `allow-discrete`:** Animating `display` or `popover` without `transition-behavior: allow-discrete`.
3. **GSAP Memory Leaks:** Forgetting to kill GSAP timelines on component unmount.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

### ✅ Pre-Flight Self-Audit

```
✅ Are all animations constrained to GPU-friendly properties (transform, opacity)?
✅ Is prefers-reduced-motion handled natively or via hooks?
✅ Are view-transition-name attributes unique across the entire active DOM?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

Inspect motion frame performance in DevTools Rendering tab to verify 60/120fps compositor execution without layout thrashing.

