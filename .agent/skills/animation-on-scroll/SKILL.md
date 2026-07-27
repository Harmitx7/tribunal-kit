---
name: animation-on-scroll
description: Intentional scroll-driven motion using modern CSS scroll-timeline, view-timeline, or GSAP ScrollTrigger without scroll jank or performance degradation.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: Scroll-Driven Motion & Storytelling
  tier: pro
  co-requires: [gsap-scrolltrigger, 60fps-animation]
  trigger-signals:
    strong: [animation-on-scroll, scroll-driven motion, CSS scroll-timeline, view-timeline, GSAP ScrollTrigger, scrollytelling]
    weak: [scroll animation, scroll effect]
---

# Animation On Scroll — Intentional Scroll Motion

Architect performant scroll-linked motion and scrollytelling sequences that feel natural, fluid, and non-intrusive.

---

## 3 Scroll-Driven Architecture Patterns

### 1. Modern Pure CSS `view-timeline` (No JavaScript Required)
```css
@keyframes reveal-on-scroll {
  from {
    opacity: 0;
    transform: translateY(32px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.scroll-reveal-card {
  animation: reveal-on-scroll linear both;
  animation-timeline: view();
  animation-range: entry 10% cover 30%;
}
```

### 2. Sticky Canvas / Section Pinned Storytelling (GSAP ScrollTrigger)
```javascript
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

gsap.timeline({
  scrollTrigger: {
    trigger: ".story-container",
    start: "top top",
    end: "+=200%",
    pin: true,
    scrub: 1, // Smooth scrub delay
  }
})
.to(".story-step-1", { opacity: 0, y: -20 })
.from(".story-step-2", { opacity: 0, y: 20 });
```

### 3. Scroll Progress Indicator Bar
```css
@keyframes grow-progress {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

.scroll-progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--primary);
  transform-origin: 0% 50%;
  animation: grow-progress linear;
  animation-timeline: scroll();
}
```

---

## 🤖 LLM-Specific Traps

1. **Janky Window Scroll Listeners**: Binding raw `window.addEventListener('scroll', ...)` with heavy DOM modifications instead of CSS `scroll-timeline` or GSAP ScrollTrigger.
2. **Hijacking User Scroll**: Forgetting to allow normal native scrolling velocity (never use aggressive scroll hijacking).

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `motion-reviewer` · `performance-optimizer`**

### ✅ Pre-Flight Self-Audit

```
✅ Are CSS `animation-timeline: view()` or `scroll()` utilized where supported?
✅ Is `scrub: 1` enabled in GSAP ScrollTrigger to prevent abrupt scroll jumps?
✅ Does scroll motion respect `prefers-reduced-motion`?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
