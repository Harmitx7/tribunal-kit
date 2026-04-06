---
name: motion-engineering
description: Motion Engineering mastery for 2026 web UI. Covers all 20 modern animation styles including micro-interactions, scroll physics, WebGL/3D, kinematics, typography, and AI-adaptive motion. Replaces static UI logic.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 3.1.0
last-updated: 2026-04-06
applies-to-model: gemini-3-1-pro, claude-3-7-sonnet
---

# Motion Engineering (2026) — Dense Reference

## Hallucination Traps & Motion Sins (Read First)
- ❌ Linear motion (`ease-linear`, CSS `transition: all`) → ✅ Spring physics (`stiffness/damping`) or custom cubic-beziers. Linear looks cheap and robotic.
- ❌ Animating layout properties (`width`, `margin`, `top`) → ✅ ONLY animate `transform` and `opacity` to maintain 120fps GPU compositing.
- ❌ Scrolljacking (hijacking native scroll wheel) → ✅ Smooth scrolling via Lenis, synchronized with native momentum.
- ❌ Heavy blocking entrance animations → ✅ "Performance-first subtle motion" — let the user interact immediately while ambient motion resolves.
- ❌ Forgetting `prefers-reduced-motion` → ✅ ALWAYS respect system accessibility settings. Motion should fall back to fast fades.

---

## 1. Interaction & State Motion (Core UX)

*Every action must have an equal and aesthetically pleasing reaction.*

- **1. Micro-interactions:** Button presses, magnetic hovers, ripple effects, toggle switches. Use high-stiffness springs. Guides user actions and confirms inputs.
- **4. Loading & Skeletons:** Never use blocking spinners. Use shimmer gradients passing over structural skeletons. Delay skeleton render by 200ms to avoid flashing on fast connections.
- **6. Motion UI & State Transitions:** Expand/collapse accordions (using grid `1fr` transitions or Framer Motion `AnimatePresence`), modal entry/exits, and smooth tab switching.

```tsx
// Framer Motion Micro-interaction (React)
<motion.button
  whileHover={{ scale: 1.02, filter: "brightness(1.1)" }}
  whileTap={{ scale: 0.97 }}
  transition={{ type: "spring", stiffness: 400, damping: 17 }}
>
  Submit
</motion.button>
```

---

## 2. Scroll, Navigation & Transitions

*Scroll is a timeline. Navigation is a spatial journey.*

- **2. Scroll-based Animations:** The dominant 2026 trend. Parallax layers, scroll reveals (slide/fade), sticky sections, horizontal scroll takeovers. **Tools:** GSAP `ScrollTrigger` and Lenis.
- **3. Page Transitions:** SPA navigation transitions. Fade, slide, zoom, or the highly premium **Shared Element Transition** (View Transitions API).
- **18. Navigation Animations:** Mega menu reveals, fullscreen menu unroll, animated breadcrumbs, and magnetic "gooey" navigation items.

```javascript
// GSAP ScrollTrigger pattern
gsap.to(".reveal-section", {
  scrollTrigger: {
    trigger: ".reveal-section",
    start: "top 80%",
    scrub: 1, // ties animation directly to scroll momentum
  },
  y: 0,
  opacity: 1,
  stagger: 0.1
});
```

---

## 3. Kinematics, Physics & Dimension

*Digital interfaces behaving like physical matter.*

- **10. Physics-based Animations:** Spring animations, bounce effects, elastic gravity. Emulates real-world objects.
- **11. Morphing & Shape Animations:** SVG morphing, liquid UI, organic blob animation, shape interpolations.
- **12. Glassmorphism / Neumorphism:** Blur interpolations, soft shadow movement matching pseudo-light sources, dynamic light refractions on hover.
- **13. Cursor-based Animations:** Custom magnetic cursors, trail effects, cursor-follower spotlight gradients (revealing borders on dark mode cards).

```css
/* CSS Magnetic Spotlight Hover Effect */
.card {
  background: radial-gradient(
    800px circle at var(--mouse-x) var(--mouse-y), 
    rgba(255,255,255,0.06),
    transparent 40%
  );
}
```

---

## 4. Immersive, 3D & Advanced Horizons

*Moving beyond flat 2D planes.*

- **5. 3D & Immersive:** WebGL, Three.js, React Three Fiber (R3F). Real-time 3D object interaction, depth-based motion, AR-like UI integrations.
- **16. Video + Motion Hybrid:** Scroll-controlled video playback (scrubbing video via scroll), cinematic heroes with mask transitions.
- **14. AI-driven Adaptive Animations:** Motion that adjusts to user behavior—speeding up if the user interacts quickly, becoming more explicit if the user hesitates.

---

## 5. Content Delivery & Creativity

*How data and narrative are revealed.*

- **7. Kinetic Typography:** Moving headlines, text reveal lines, scrolling ticker typography, word-by-word spring reveals. High engagement storytelling.
- **8. Background Animations:** Ambient, looping non-interactive visual motion. Animated mesh gradients, particle sweeps, subtle CRT noise/grain.
- **9. Illustration & Character:** Lottie JSON animations, SVG stroke-dasharray drawing animations, dynamic mascots (e.g., following cursor with eyes).
- **19. Data Visualization:** Flowing charts, live data update transitions (number counters rolling up like odometers). 
- **15. Gamified & Interactive:** Progress-based reward bursts (confetti matrices), interaction-based mini-games inside standard UI elements.
- **17. Experimental / Creative:** Glitch text, brutalist motion (sharp, aggressive translation), collage paper-tear reveals.

---

## Quick Decision Matrix

| To Achieve... | Use... | Avoid... |
|---------------|--------|----------|
| **Core State/UI** | Framer Motion / CSS Springs | Heavy JS interval loops |
| **Scroll Narratives** | GSAP ScrollTrigger + Lenis | Scroll event listeners |
| **3D & Immersion** | React Three Fiber (WebGL) | Heavy CSS 3D Transforms |
| **Complex Vectors** | Lottie / Rive | GIF / Video tags |
| **Page Flips** | View Transitions API | Unmounting without exit animations |
