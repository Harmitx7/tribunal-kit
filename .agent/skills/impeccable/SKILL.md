---
name: impeccable
description: Flagship design engineering skill for creating production-grade, anti-generic frontend interfaces with supreme craftsmanship, visual hierarchy, typography, spatial systems, and micro-interactions.
version: 4.0.0
last-updated: 2026-09-07
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


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Flagship design engineering skill for creating production-grade, anti-generic frontend interfaces with supreme craftsmanship, visual hierarchy, typography, spatial systems, and micro-interactions..
- **DO NOT activate when:** The task falls strictly outside impeccable domain or belongs to a different dedicated specialist.

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
