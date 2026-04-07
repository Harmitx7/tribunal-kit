---
name: motion-engineering
description: Motion Engineering mastery for 2026 web UI. Covers all 20 modern animation styles across 4 tiers (Core UX, Immersive, Advanced, Specialized). Use when designing motion strategy, choosing animation libraries (Framer, GSAP, WebGL, CSS), or implementing animated UI patterns.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 4.0.0
last-updated: 2026-04-07
applies-to-model: gemini-3-1-pro, claude-3-7-sonnet
---

# Motion Engineering (2026) — Comprehensive Reference

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

| Category / Style | Recommended Technology | Why / Use Case |
|:---|:---|:---|
| **Tier 1: Core UX (High Frequency)** | | |
| 1. Micro-interactions | Framer Motion / CSS Springs | Fast feedback, hover states, buttons |
| 2. Scroll-based | GSAP ScrollTrigger + Lenis | Parallax, timelines, storytelling |
| 3. Page Transitions | View Transitions API + Framer | SPA route navigation, modal expands |
| 4. Loading & Skeleton | CSS @keyframes / SVGs / Lottie | Non-blocking waits, shimmer, spinners |
| **Tier 2: Narrative & Immersive (Medium Frequency)** | | |
| 5. 3D & Immersive | React Three Fiber / WebGL | Interactive scenes, models, depth |
| 7. Kinetic Typography | GSAP SplitText / Framer | Emphasize headlines, word-by-word reveal |
| 8. Background Animations | CSS Gradients / WebGL Shaders | Ambient noise, particles, mesh gradients |
| 9. Illustration/Characters | Lottie / Rive | Mascots, onboarding storytelling |
| **Tier 3: Advanced & Emerging (Situational)** | | |
| 6. State Transitions | Framer Motion `layout` | Expanding cards, drag-and-drop |
| 10. Physics-based | Matter.js / Framer Springs | Bouncy, elastic real-world mimics |
| 11. Morphing & Shape | GSAP MorphSVG | Liquid motion, blobs, SVG path morphs |
| 12. Glassmorphism UI | CSS backdrop-filter + motion | Soft shadows, refraction on hover |
| 13. Cursor-based | Custom JS + CSS variables | Magnetic buttons, cursor trails |
| 14. AI-driven Adaptive | Headless logic + Framer | Context-aware, usage-based animation |
| 15. Gamified/Interactive | Canvas / React Three Fiber | Reward animations, mini-games |
| **Tier 4: Specialized (Niche/Structural)** | | |
| 16. Video + Motion | Scroll-sync Video (GSAP) | Cinematic hero sections |
| 17. Experimental | Custom shaders / Brutalist CSS | Glitch effects, collage |
| 18. Navigation | Framer `AnimatePresence` | Mega menus, magnetic nav |
| 19. Data Visualization | D3.js + Framer Motion | Animated charts, live updates |
| 20. Performance-first | CSS only (`opacity`, `transform`) | Ultra-minimal subtle fade-ins |

---

## TIER 1: Core UX Motion (Dense Implementation)

*These are the foundational motions used in 80%+ of 2026 web applications.*

### 1. Micro-interactions
Used for immediate feedback, clarifying actions, and improving perceived responsiveness.
```tsx
// Framer Motion — button with spring micro-interaction
<motion.button
  whileHover={{ scale: 1.02, filter: "brightness(1.08)" }}
  whileTap={{ scale: 0.97 }}
  transition={{ type: "spring", stiffness: 400, damping: 17 }}
>Submit</motion.button>
```

### 2. Scroll-based Animations (Most used in 2026)
Triggers narrative flow and depth based on user scrolling.
```javascript
// GSAP ScrollTrigger — industry standard
gsap.from(".reveal-section", {
  scrollTrigger: { trigger: ".reveal-section", start: "top 80%", scrub: 1 },
  y: 60, opacity: 0, stagger: 0.1
});

// Lenis — smooth scroll compatible with GSAP
import Lenis from "lenis";
const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.8 });
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

### 3. Page Transitions (View Transitions API)
```css
/* CSS — define shared elements */
.card-image { view-transition-name: active-image; } /* MUST BE UNIQUE */
::view-transition-old(active-image) { animation: fade-out 0.3s ease; }
::view-transition-new(active-image) { animation: scale-in 0.3s ease; }
```

### 4. Loading & Skeleton Animations
Never block the UI entirely. Use structural loading.
```css
/* Shimmer structural animation */
.skeleton { 
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%; 
  animation: shimmer 1.5s infinite linear; 
}
@keyframes shimmer { 100% { background-position: -200% 0; } }
```

---

## TIER 2: Narrative & Immersive (Medium Implementation)

*Used for brand storytelling, heroes, and engagement.*

### 5. 3D & Immersive Animations
The leading trend of 2026. Use React Three Fiber.
```tsx
// WebGL Scene basics
import { Canvas, useFrame } from '@react-three/fiber'
function RotatingCube() {
  const meshRef = useRef();
  useFrame((state, delta) => (meshRef.current.rotation.x += delta));
  return <mesh ref={meshRef}><boxGeometry /><meshStandardMaterial color="hotpink" /></mesh>;
}
```

### 7. Kinetic Typography
```tsx
// Word-by-word spring reveal (Framer Motion)
const words = "Immersive storytelling".split(" ");
const wordVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

<motion.h1 transition={{ staggerChildren: 0.05 }} initial="hidden" whileInView="visible" viewport={{ once: true }}>
  {words.map((w, i) => <motion.span key={i} variants={wordVariants}>{w} </motion.span>)}
</motion.h1>
```

### 8. Background Animations & 9. Illustrations
- **Backgrounds:** Use CSS `@keyframes` on pseudo-elements with `filter: blur()` for ambient gradients, avoiding repaints.
- **Illustrations:** Use Rive for interactive state machines, or Lottie via `lottie-react` for simple timeline playback.

---

## TIER 3: Advanced & Emerging (Concepts & Tools)

*Highly interactive components elevating standard UI.*

- **6. Motion UI & State Transitions:** Use Framer Motion's `layout` prop. Morphing a list item into a modal requires `<motion.div layoutId="item-1">` on both states. Wrap the app in `<LayoutGroup>`.
- **10. Physics-based:** Animate like real-world objects. Instead of `duration`, define `mass`, `stiffness`, and `damping` in physics springs to simulate gravity and tension.
- **11. Morphing & Shape:** GSAP `MorphSVGPlugin`. Requires SVGs with comparable path points or GSAP will interpolate poorly. Alternatively, animate CSS `border-radius` for fluid blobs.
- **12. Glassmorphism:** Animate `backdrop-filter: blur(10px)` but beware of performance costs on mobile. Render shadows via `filter: drop-shadow()` combined with slight `translateY` on hover.
- **13. Cursor-based:** Modern standard is CSS variables bound to mouse position. Calculate `clientX` relative to the element bounding box and update `--mouse-x` to drive `radial-gradient` masks.
- **14. AI-driven Adaptive:** Motion that learns. If a user speeds through a form, UI transitions accelerate. If they linger, ambient motion plays. Controlled by tracking interaction deltas and mapping them to global spring configurations.
- **15. Gamified:** Progress bars that burst on completion, haptic-synchronized checkmarks. Combine SVGs with explicit, highly exaggerated elastic overshoot scales (`scale: [1, 1.2, 0.9, 1]`) on reward thresholds.

---

## TIER 4: Specialized (Rules & Fallbacks)

*Niche requirements where performance or specific constraints dominate.*

- **16. Video + Motion Hybrid:** Scrubbing `<video>` tags with scroll. Requires pre-encoding video rapidly with keyframes every 1 frame, drawing frames to a `<canvas>` element via `requestAnimationFrame` linked to scroll progress.
- **17. Experimental:** Glitch effects via overlapping CSS `clip-path` animations. High processing cost.
- **18. Navigation:** Mega-menus must use `<AnimatePresence>` to prevent DOM unmount before the exit animation resolves. Include exit delays so users don't trigger flickering by rapidly moving the mouse off the nav.
- **19. Data Visualization:** D3 handles math, React handles DOM, Framer/Spring handles interpolation between D3 datasets. Never let D3 mutate the DOM directly inside a React app.
- **20. Performance-first Subtle Motion:** Strictly `opacity`, `transform`, CSS-only. Use `@starting-style` for popovers and dialogs to avoid JS intervention.

---

## Accessibility & Performance Invariants (Global Rules)

1. **The WCAG 2.2 AA Motion Rule:**
```tsx
import { useReducedMotion } from "framer-motion";
const reduce = useReducedMotion();
// Safe: opacity, color
// Conditional: translate, scale, rotate
<motion.div animate={{ x: reduce ? 0 : 100, opacity: 1 }} transition={{ duration: reduce ? 0 : 0.5 }} />
```

2. **The 120fps GPU Rule:**
Never animate `width`, `height`, `left`, `top`, `margin`, or `padding`. This triggers layout recalculation algorithms. Use `transform: scale()` or `transform: translate()` instead.

3. **The Cleanup Rule:**
Any GSAP ScrollTrigger timeline must use `ScrollTrigger.killAll()` or React's `useGSAP` cleanup functions to avoid memory leaks on SPA route changes.
