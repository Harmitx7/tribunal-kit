---
name: ui-skill-packs
description: Mandatory skill loading packs for UI generation. Consolidates 42+ individual UI skills into 3 tiered packs (Core Craft, Immersive & System, High-End Design) to guarantee non-generic, high-fidelity UI outputs.
version: 3.0.0
last-updated: 2026-07-30
skills:
  - taste-skill
  - better-colors
  - impeccable
  - micro-interaction
  - gpt-taste
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# UI Skill Packs — Master Design Engineering Bundles

---

## Mandatory Pre-Flight Context Inspection

Before generating UI code, you MUST inspect:
1. `package.json` / `tailwind.config.ts` / `index.css` → Check UI stack (Tailwind v4, Vanilla CSS, OKLCH, Framer Motion)
2. `DESIGN.md` / color token definitions → Verify palette rules and dark mode contrast variables
3. Active UI component target → Assign Pack 1 (Core UI), Pack 2 (System Micro-Interactions), or Pack 3 (Immersive Landing)

## 1. Pack Definitions

When generating UI code, the agent MUST load the appropriate UI Skill Pack based on the complexity level of the requested interface:

### Pack 1: Core UI Craft (Standard Components & Forms)
- **Skills Included:** `taste-skill`, `better-ui`, `better-colors`, `typeset`, `build-primitive`
- **Use For:** Buttons, cards, form controls, modals, tables, simple dashboards.
- **Enforces:** OKLCH colors, 8pt spacing grid, fluid typography, explicit interactive states.

### Pack 2: System & Micro-Interactions (Dynamic Web Apps)
- **Skills Included:** `impeccable`, `micro-interaction`, `framer-motion-expert`, `transitions-dev`, `delight`
- **Use For:** Interactive web apps, complex dashboards, multi-step flows, animated components.
- **Enforces:** Micro-animations, spring easings, tactile click/hover feedback, clean state transitions.

### Pack 3: High-End Immersive & Landing (Full Page / Showcase)
- **Skills Included:** `gpt-taste`, `swiss-design`, `compact-landing`, `masked-reveal`, `marquee-loop`, `progressive-blur`
- **Use For:** Landing pages, hero sections, marketing sites, showcase portfolios.
- **Enforces:** Typographic hierarchy, asymmetric visual rhythm, noise grain overlays, luminous borders.

---

## 2. Mandatory Pre-Execution Binding

Before generating any frontend component, identify the required pack and declare loaded skills:

```
Loaded UI Skill Pack: [Pack 1 | Pack 2 | Pack 3]
Binding skills: taste-skill, better-colors, micro-interaction, impeccable...
```

---

## Pre-Flight Checklist

Before generating UI component code:
1. Verify target framework (React, Next.js, Vue, Svelte) and styling system (CSS Modules, Tailwind, OKLCH CSS).
2. Select appropriate UI Skill Pack (Pack 1, Pack 2, or Pack 3).
3. Ensure color variables use OKLCH color space for accessible contrast ratios.
4. Verify micro-interaction focus and hover states for keyboard and mouse accessibility.

---

## VBC Protocol

Visual Balance & Contrast Protocol:
1. **Contrast Ratio**: Enforce WCAG 2.2 AA (4.5:1 text, 3:1 graphical elements).
2. **Typography Cadence**: Enforce strict fluid font sizing and line-height cadence.
3. **Motion Hygiene**: Respect `prefers-reduced-motion` media queries on all animations.

