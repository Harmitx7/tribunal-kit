---
name: animation-on-scroll
description: Intentional scroll-driven motion using modern CSS scroll-timeline, view-timeline, or GSAP ScrollTrigger without scroll jank or performance degradation.
version: 4.0.0
last-updated: 2026-09-07
skills:
  - motion-engineering
  - 60fps-animation
  - accessible-animation
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Animation On Scroll — Intentional Scroll Motion

---

## Mandatory Pre-Flight Context Inspection

Before implementing scroll-driven animations, you MUST inspect:

1. Target browser support → Prefer pure CSS `animation-timeline: view()` / `scroll()` when possible
2. Pinning & Scrubbing rules (Section 45) → Use `scrub: 1` in GSAP ScrollTrigger timelines for smooth inertia
3. Anti-Scrolljacking rule (Section 88) → Never hijack native scroll wheel momentum or override browser scrolling velocity

Architect performant scroll-linked motion and scrollytelling sequences that feel natural, fluid, and non-intrusive.


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Intentional scroll-driven motion using modern CSS scroll-timeline, view-timeline, or GSAP ScrollTrigger without scroll jank or performance degradation..
- **DO NOT activate when:** The task falls strictly outside animation-on-scroll domain or belongs to a different dedicated specialist.

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
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

gsap
  .timeline({
    scrollTrigger: {
      trigger: '.story-container',
      start: 'top top',
      end: '+=200%',
      pin: true,
      scrub: 1, // Smooth scrub delay
    },
  })
  .to('.story-step-1', { opacity: 0, y: -20 })
  .from('.story-step-2', { opacity: 0, y: 20 });
```

### 3. Scroll Progress Indicator Bar

```css
@keyframes grow-progress {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
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

## 🏛️ Tribunal Verification & Guardrails

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes
1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit
```
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
