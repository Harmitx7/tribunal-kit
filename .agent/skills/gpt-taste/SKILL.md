---
name: gpt-taste
description: "Use when High-agency UX/UI skill with strict layout variance, typography, and GSAP motion engineering constraints for superior visual judgment."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - taste-skill
  - better-ui
  - better-colors
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# GPT Taste — High-Agency Visual Refinement & Layout Variance

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

## 4 High-Agency Visual Constraints

### 1. Structural Layout Variance

Never use standard symmetrical layouts by default. Vary structural axes across sections:

- **Hero**: Asymmetric 60/40 split or left-aligned stacked text with offset app preview frame.
- **Features**: Alternating 2-column image/text rhythm or horizontal scroll cards.
- **CTA**: Single full-width card with progressive backdrop blur overlay.

### 2. OKLCH Perceptual Palette Generation

Always generate color schemes in OKLCH:

- Background: `oklch(0.98 0.005 240)`
- Foreground: `oklch(0.18 0.01 240)`
- Accent: `oklch(0.62 0.22 250)`

### 3. GSAP / Motion Engineering Integration

When animation is requested, use explicit GSAP timelines with custom easing curves (`power3.out`, `expo.out`), avoiding default linear transitions.

### 4. Zero Output Truncation

Never output placeholder `// TODO: add remaining items` comments in UI code. Generate full, production-ready JSX/CSS markup.
