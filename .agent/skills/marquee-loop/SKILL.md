---
name: marquee-loop
description: "Use when Hardware-accelerated, seamless, continuous looping marquees for logo rows, testimonials, and announcements with pause-on-hover accessibility."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - 60fps-animation
  - company-logos
  - accessible-animation
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Marquee Loop — Hardware-Accelerated Continuous Tickers

---

## 🛠️ Technical Architecture & Reference Recipes

---

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
