---
name: marquee-loop
description: Hardware-accelerated, seamless, continuous looping marquees for logo rows, testimonials, and announcements with pause-on-hover accessibility.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: Ticker & Continuous Motion
  tier: pro
  co-requires: [60fps-animation, company-logos]
  trigger-signals:
    strong: [marquee-loop, marquee animation, continuous ticker, looping logo track, seamless marquee]
    weak: [scrolling logos, ticker]
---

# Marquee Loop — Hardware-Accelerated Continuous Tickers

Build seamless 60fps infinite marquee tracks that pause on hover and respect accessibility settings.

---

## The Seamless CSS Marquee Recipe

```html
<div class="marquee-container" aria-label="Partner logos">
  <div class="marquee-track">
    <!-- Original Items -->
    <div class="marquee-content">...items...</div>
    <!-- Duplicate Items for Seamless Infinite Loop -->
    <div class="marquee-content" aria-hidden="true">...items...</div>
  </div>
</div>
```

```css
.marquee-container {
  display: flex;
  overflow: hidden;
  user-select: none;
  mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
}

.marquee-track {
  display: flex;
  flex-shrink: 0;
  gap: 2rem;
  animation: marquee-slide 25s linear infinite;
}

.marquee-container:hover .marquee-track {
  animation-play-state: paused;
}

@keyframes marquee-slide {
  from { transform: translateX(0%); }
  to { transform: translateX(-50%); }
}

/* Reduced Motion Override */
@media (prefers-color-scheme: dark) { ... }
@media (prefers-reduced-motion: reduce) {
  .marquee-track {
    animation: none;
    flex-wrap: wrap;
    justify-content: center;
  }
}
```

---

## 🤖 LLM-Specific Traps

1. **Missing Duplicate Duplicate Track**: Animating a single track without duplicating content, causing a visible blank jump when the animation loops.
2. **Missing `animation-play-state: paused` on Hover**: Blocking users from clicking or reading marquee content by refusing to pause on hover/focus.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `frontend-reviewer` · `performance-optimizer`**

### ✅ Pre-Flight Self-Audit

```
✅ Is the duplicate item track present with `aria-hidden="true"`?
✅ Is `animation-play-state: paused` active on container hover/focus?
✅ Does marquee collapse into static grid when `prefers-reduced-motion` is enabled?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
