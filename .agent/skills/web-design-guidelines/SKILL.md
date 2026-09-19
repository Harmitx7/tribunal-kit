---
name: web-design-guidelines
description: "Use when Enforces next-generation web interface guidelines, covering APCA contrast thresholds, Core Web Vitals, and sustainable battery-efficient UI rendering."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - baseline-ui
  - better-colors
  - 60fps-animation
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Web Design Guidelines — Core Web Vitals & Sustainable UI

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

## 1. APCA Contrast Guidelines (WCAG 3.0 Base)

APCA calculates lightness contrast mathematically based on font size and background luminance.

- **Body Text:** Lc > 75 is required for body text readability.
- **Headings:** Lc > 60 is required for headings.
- **Controls/Borders:** Lc > 45 is required for visual divider borders and focus rings.

---

## 2. Core Web Vitals (CWV)

- **Largest Contentful Paint (LCP < 1.5s):** Hero banners and images must use the `fetchpriority="high"` tag. Avoid blocking layout paints with heavy JS scripts.
- **Interaction to Next Paint (INP < 100ms):** Enforce main-thread speed. Wrap heavy operations in `startTransition` or React's deferred values.
- **Cumulative Layout Shift (CLS = 0.00):** Image nodes must declare explicit width/height dimensions or aspect-ratios. Pre-allocate spaces for dynamic elements.

---

## 3. Sustainable & Battery-Efficient UI

- **Compositor Properties:** Transitions and animations must only animate `transform` and `opacity`. Animating properties like `margin`, `width`, `height`, or `top` triggers layout reflows and wastes CPU cycles.
- **OLED Blacks:** For dark luxury themes, base backgrounds must use OLED-friendly blacks (`oklch(0.08 0.005 250)` or `#000000`) to physically turn off pixels on compatible screens.
- **Font Subsetting:** Self-host typography files and use variable fonts to minimize network payloads.
- **Image Formats:** Serve images exclusively in AVIF or WebP formats.
