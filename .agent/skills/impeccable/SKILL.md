---
name: impeccable
description: Flagship design engineering skill for creating production-grade, anti-generic frontend interfaces with supreme craftsmanship, visual hierarchy, typography, spatial systems, and micro-interactions.
version: 3.0.0
last-updated: 2026-07-30
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

## Mandatory Pre-Flight Context Inspection

Before designing or engineering frontend components, you MUST inspect:
1. `DESIGN.md` / `package.json` → Verify OKLCH color palettes, font pairings, and responsive container query setups
2. Core Pillars of Impeccable UI (Section 22) → Enforce `tabular-nums` on digits, `text-wrap: balance` on headings, and strict 8px grid math
3. Motion & Micro-Interactions (Section 34) → Limit micro-interactions to $\le 160\text{ms}$ and check `prefers-reduced-motion` fallbacks

The gold standard framework for crafting bespoke, world-class web applications that feel custom-built by elite design engineers.

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

---

## 🤖 LLM-Specific Traps

1. **Generic AI Aesthetics**: Using purple-to-blue gradients, glow effects on every button, or heavy glassmorphism on white text.
2. **Hardcoded Pixel Values**: Writing hardcoded `px` font sizes and dimensions instead of `rem` and fluid `clamp()` utilities.
3. **Orphaned Text**: Failing to apply `text-wrap: balance` to multi-line headings.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `frontend-reviewer` · `ui-ux-auditor` · `motion-reviewer`**

### ✅ Pre-Flight Self-Audit

```
✅ Are tabular numbers enabled on all changing numeric values?
✅ Is heading text wrapped using `text-wrap: balance`?
✅ Is container query responsiveness utilized where components are reused?
✅ Are transitions tuned with custom cubic-bezier curves under 300ms?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
