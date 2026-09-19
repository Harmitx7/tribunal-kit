---
name: company-logos
description: "Use when Social proof rows, logo grids, customer carousels, and trust badges layout rules for balanced visual weight and responsive alignment."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - baseline-ui
  - landing-page
  - marquee-loop
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Company Logos — Social Proof & Trust Grids

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

## 4 Logo Layout Rules

### 1. Optical Weight Normalization

Logos vary wildly in aspect ratio (e.g. square logos vs wide wordmarks).

- **Rule**: Set a maximum bounding box (`max-height: 28px`, `max-width: 120px`) and use `object-fit: contain` with `filter: grayscale(100%) opacity(0.7)`.
- On hover, transition `opacity(1)` and remove grayscale smoothly over `200ms`.

### 2. Monochromatic Harmonization

- Never display multi-colored corporate logos together—they create visual chaos.
- Render all logos in monochromatic SVG fill (`fill="currentColor"`) matching `--text-muted` or `--foreground-muted`.

### 3. Responsive Flex Grid

```css
.logo-trust-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 2rem 3.5rem; /* Row gap 2rem, Column gap 3.5rem */
}
```

### 4. Seamless Ticker Marquee (Optional)

- For 8+ logos, use a hardware-accelerated CSS marquee animation with duplicate items for seamless continuous looping and `animation-play-state: paused` on hover.
