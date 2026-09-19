---
name: soft-skill
description: "Use when High-end visual design guidance for premium typography, spacing, depth, and animation systems."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - taste-skill
  - progressive-blur
  - impeccable
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Soft Skill — High-End Luxury Visual Design & Depth

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

## 4 Soft Design Rules

### 1. Multi-Layer Soft Ambient Depth

- Avoid harsh drop-shadows. Use low-opacity multi-layered ambient lighting shadows:

```css
.soft-depth-card {
  background: var(--surface);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.02),
    0 8px 16px rgba(0, 0, 0, 0.04),
    0 24px 48px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.06);
}
```

### 2. Generous Negative Space Cadence

- Increase component padding by 1.5x (e.g. `24px` -> `36px`, `32px` -> `48px`). Generous negative space is the ultimate indicator of luxury software.

### 3. Subdued Monochrome Color Harmonies

- Use quiet, low-chroma monochromatic palettes (`oklch(0.97 0.005 240)` background with `oklch(0.22 0.01 240)` primary text).

### 4. Fluid, Low-Velocity Transitions

- Transition speeds should be gentle ($\approx 250\text{ms}$) with strong ease-out curves (`cubic-bezier(0.16, 1, 0.3, 1)`).
