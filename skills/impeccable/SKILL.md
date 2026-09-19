---
name: impeccable
description: "Use when Flagship design engineering skill for creating production-grade, anti-generic frontend interfaces with supreme craftsmanship, visual hierarchy, typography, spatial systems, and micro-interactions."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - better-ui
  - better-colors
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Impeccable — Production-Grade Frontend Craft

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

## Core Pillars of Impeccable UI

### 1. Typography & Typographic Rhythm

- **Optical Sizing & Tracking**: Large display headings (32px+) require tight letter-spacing (`letter-spacing: -0.03em`). Small caption text (12px) requires positive tracking (`letter-spacing: +0.01em`).
- **Tabular Numbers**: Any numeric data that updates, increments, or displays in columns MUST use `font-variant-numeric: tabular-nums` or `font-feature-settings: "tnum"` to prevent visual jitter.
- **Text Wrapping & Balance**: Headings MUST use `text-wrap: balance` to prevent typographic orphans. Body paragraphs MUST use `text-wrap: pretty` (where supported) or max `65ch` width.

### 2. Color Systems & Gamut Precision

- **OKLCH Color Space**: Prefer `oklch()` over `hsl()` or `hex` for smooth perceptual uniformity across hue and lightness shifts.
- **Subtle Surface Steps**: Define surface colors with small perceptual lightness steps ($L \pm 2\%$) to create hierarchy without harsh dividers.
- **Adaptive Contrast**: Text contrast MUST adapt automatically across light/dark themes with high legibility ratios ($\ge 7:1$ for primary, $\ge 4.5:1$ for secondary).

### 3. Motion & Micro-Interactions

- **Intentional Motion**: Animations exist ONLY to convey spatial continuity, provide press feedback, or indicate state changes.
- **Duration Constraints**: Micro-interactions $\le 160\text{ms}$; dropdowns/popovers $\le 220\text{ms}$; page transitions $\le 300\text{ms}$.
- **Physically Grounded Entrances**: Elements scale in from `scale(0.96)` and opacity `0`, anchored to their trigger origin.
- **DOM Entry (@starting-style)**: Use `@starting-style` with `transition-behavior: allow-discrete` for smooth `display: none` to `display: block` entrance animations without JS overhead.

### 4. Layout Mechanics & Spatial Math

- **8px Grid System**: Every margin, padding, gap, and height MUST derive from an 8px grid (or 4px micro-grid).
- **Asymmetrical Balance**: Avoid cookie-cutter centered layouts for SaaS apps. Use strong left-aligned structural axes with generous negative space.
- **Container Queries**: Components adjust layout based on container size (`@container`), not viewport size (`@media`), making them context-agnostic.
- **WCAG 2.2 AA Target Size (SC 2.5.8)**: All interactive targets MUST measure at least `24x24px` CSS pixels (min `44x44px` for touch).
