---
name: motion-engineering
description: Motion Engineering mastery for 2026 web UI. Covers all 20 modern animation styles including micro-interactions, scroll physics, page transitions, WebGL/3D, kinematics, typography, and AI-adaptive motion. Includes CSS View Transitions API, @starting-style, and WAAPI. Use when designing motion strategy, choosing animation libraries, or implementing any animated UI pattern.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 3.2.0
last-updated: 2026-04-07
applies-to-model: gemini-3-1-pro, claude-3-7-sonnet
---

# Motion Engineering (2026) — Dense Reference

## Hallucination Traps & Motion Sins (Read First)
- ❌ Linear motion (`ease-linear`, CSS `transition: all`) → ✅ Spring physics (`stiffness/damping`) or custom cubic-beziers. Linear looks robotic.
- ❌ Animating layout properties (`width`, `margin`, `top`) → ✅ ONLY animate `transform` and `opacity` to maintain 120fps GPU compositing.
- ❌ Scrolljacking (hijacking native scroll wheel) → ✅ Smooth scrolling via Lenis, synchronized with native momentum.
- ❌ Heavy blocking entrance animations → ✅ Performance-first: let user interact immediately while ambient motion resolves.
- ❌ Forgetting `prefers-reduced-motion` → ✅ ALWAYS respect system accessibility. Fall back to instant opacity transitions.
- ❌ `view-transition-name` on more than 1 visible element with same name → ✅ Each name must be unique in the DOM at any given time.
- ❌ `element.animate()` (WAAPI) without `fill: "forwards"` → ✅ Animation resets on completion — add `fill: "forwards"` or commit with `effect.updateTiming`.

---

## Library Decision Matrix

| To Achieve... | Use... | Avoid... |
|---------------|--------|----------|
| **Micro-interactions / State UI** | Framer Motion / CSS Springs | Heavy JS interval loops |
| **Scroll-driven narratives** | GSAP ScrollTrigger + Lenis | Scroll event listeners |
| **Page transitions (SPA)** | View Transitions API + Framer | Unmounting without exit |
| **3D & Immersion** | React Three Fiber (WebGL) | Heavy CSS 3D transforms |
| **Complex vector / illustrations** | Lottie / Rive | GIF / Video tags |
| **Programmatic sequences** | GSAP Timelines / useAnimate | setInterval async chains |
| **SVG animation** | GSAP DrawSVG / MorphSVG | CSS animation on SVG `d` attr |
| **Reduced-motion fallback** | `prefers-reduced-motion` media query | Disabling all motion globally |

---

## 1. Micro-interactions & State Motion

*Every action must have an equal and aesthetically pleasing reaction.*

```tsx
// Framer Motion — button with spring micro-interaction
<motion.button
  whileHover={{ scale: 1.02, filter: "brightness(1.08)" }}
  whileTap={{ scale: 0.97 }}
  transition={{ type: "spring", stiffness: 400, damping: 17 }}
>Submit</motion.button>

// CSS accordion expand (grid-rows trick — avoids height:auto animation issue)
.accordion-content { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.3s ease; }
.accordion-content.open { grid-template-rows: 1fr; }
.accordion-content > div { overflow: hidden; }
```

---

## 2. Scroll-based Animations

*Scroll is a timeline. Make it feel like physics.*

```javascript
// GSAP ScrollTrigger — the dominant 2026 scroll pattern
gsap.from(".reveal-section", {
  scrollTrigger: { trigger: ".reveal-section", start: "top 80%", scrub: 1 },
  y: 60, opacity: 0, stagger: 0.1
});

// Parallax layers (depth illusion)
gsap.to(".bg-layer", {
  scrollTrigger: { trigger: "body", start: "top top", end: "bottom top", scrub: true },
  y: "-30%", ease: "none", // ease: none is required for scrub parallax
});

// Lenis — smooth scroll compatible with GSAP
import Lenis from "lenis";
const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.8 });
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

---

## 3. Page Transitions (View Transitions API)

*Navigation as a spatial journey.*

```css
/* CSS — define shared elements */
.hero-card { view-transition-name: hero-card; } /* must be unique per DOM state */
::view-transition-old(hero-card) { animation: slide-out 0.3s ease; }
::view-transition-new(hero-card) { animation: slide-in 0.3s ease; }
```

```javascript
// Trigger with JS API
document.startViewTransition(async () => {
  await navigateTo("/detail"); // swap DOM content here
});
```

```tsx
// Next.js App Router — wrap navigation
import { useRouter } from "next/navigation";
const router = useRouter();
const navigate = (href: string) => {
  if (!document.startViewTransition) return router.push(href);
  document.startViewTransition(() => router.push(href)); // graceful degradation
};
```

---

## 4. CSS Native Animations (2026)

```css
/* @starting-style — animate on :popover-open / display:block reveal */
.popover {
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.25s, transform 0.25s, display 0.25s allow-discrete;

  &:popover-open {
    opacity: 1;
    transform: translateY(0);

    @starting-style {
      opacity: 0;    /* animate FROM this when entering */
      transform: translateY(8px);
    }
  }
}

/* Scroll-driven CSS animations (no JS) */
@keyframes reveal { from { opacity: 0; translate: 0 40px; } to { opacity: 1; translate: 0 0; } }
.card {
  animation: reveal linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 30%;
}
```

---

## 5. WAAPI (Web Animations API — Native JS)

```javascript
// Lightest option — no library needed
const el = document.querySelector(".box");
const anim = el.animate(
  [{ opacity: 0, transform: "translateY(20px)" }, { opacity: 1, transform: "translateY(0)" }],
  { duration: 400, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)", fill: "forwards" }
);
await anim.finished; // promise-based sequencing
// ❌ Without fill:"forwards" — element snaps back to original state
```

---

## 6. Kinetic Typography

```tsx
// Word-by-word spring reveal (Framer Motion)
const words = "Scroll to reveal magic".split(" ");
const container = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const word = {
  hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5 } },
};
<motion.p variants={container} initial="hidden" whileInView="visible" viewport={{ once: true }}>
  {words.map((w, i) => <motion.span key={i} variants={word}>{w} </motion.span>)}
</motion.p>
```

---

## 7. CSS Magnetic Cursor Effect

```css
.card {
  background: radial-gradient(
    800px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
    rgba(255,255,255,0.06), transparent 40%
  );
}
```
```javascript
document.querySelectorAll(".card").forEach(card => {
  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  });
});
```

---

## 8. Skeleton & Loading States

```tsx
// Never block UI with spinners — use structural skeletons
// Delay skeleton render by 200ms to avoid flash on fast connections
const [showSkeleton, setShowSkeleton] = useState(false);
useEffect(() => { const t = setTimeout(() => setShowSkeleton(true), 200); return () => clearTimeout(t); }, []);

// Shimmer animation
.skeleton { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
```

---

## Accessibility Rule

```tsx
import { useReducedMotion } from "framer-motion";
const reduce = useReducedMotion();
// Safe: opacity, color — always animate these
// Conditional: translate, scale, rotate — disable when reduce=true
<motion.div animate={{ x: reduce ? 0 : 200, opacity: 1 }} transition={{ duration: reduce ? 0 : 0.6 }} />
```
