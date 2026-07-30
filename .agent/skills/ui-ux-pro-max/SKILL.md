---
name: ui-ux-pro-max
description: The Picasso Protocol — Elite UI/UX design mastery. Integrates the 16-step UI Reasoning Engine, Category-Specific Heuristics, and Anti-Pattern controls to generate portfolio-grade interfaces.
version: 3.0.0
last-updated: 2026-07-30
skills:
  - ui-reasoning-engine
  - product-aware-heuristics
  - frontend-design
  - web-design-guidelines
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# UI/UX Pro Max v3.0 — The Picasso Protocol

---

## Mandatory Pre-Flight Context Inspection

Before generating UI designs or front-end components, you MUST inspect:
1. Rejection Guardrails (Section 17) → Ban primary purple gradients (`from-purple-600`), Inter/Roboto defaults, left-text/right-image hero layouts, and mesh gradients
2. OKLCH Display-P3 Color Science (Section 29) → Use OKLCH variables with chroma `0.20`–`0.28` for accents and stepped neutral contrast (`0.04` Lightness increments)
3. Fluid Typographic Scaling (Section 51) → Apply `clamp()` sizes, tight negative tracking (`-0.04em`), and `text-wrap: balance` on headings

This skill transforms AI-generated interfaces from generic "AI templates" into portfolio-grade, human-crafted interfaces by running intent analysis *before* layout and styling.

---

## 🚨 Design Governance Guardrails (REJECTION Rules)

*   ❌ **Primary Purple Accents:** Banned. Use electric blue, signal orange, coral, warm slate, or natural sage.
*   ❌ **Inter/Roboto Defaults:** Banned. Display titles must use characterful display fonts; body text uses readable body options.
*   ❌ **Left Text/Right Image Hero:** Banned. Use full-bleed, asymmetric overlap, or typographical layouts.
*   ❌ **Radial Mesh Backgrounds:** Banned. Use ambient grain overlay, solid high-contrast depth, or radial tinting.
*   ❌ **Bento Box Grid Overuse:** Banned. Break the grid intentionally for visual interest.
*   ❌ **Flat Glassmorphic Panels:** Banned. Translucency should only be used as a rare overlay, not for main containers.
*   ❌ **No States Feedback:** Banned. Every control must have styled states (Hover, Focus-visible, Active, Disabled).

---

## 1. Color Gamuts & Display-P3 Color Science

Use dynamic OKLCH variables to access the wider Display-P3 color spectrum for stunning vibrancy. Perceptually uniform lightness ensures stable contrast:
```css
:root {
  /* oklch(Lightness Chroma Hue / Alpha) */
  --color-primary: oklch(65% 0.22 250);       /* Brand electric blue */
  --color-primary-hover: oklch(58% 0.22 250); /* Darker active state */
  --bg-base: oklch(0.08 0.005 250);           /* OLED base background */
  --bg-surface: oklch(0.12 0.008 250);        /* Stepped card surface */
  --border-subtle: oklch(22% 0.01 250 / 0.4); /* Hairline separator */
}
```

### Color Gamut Guidelines
- **Display-P3 Saturated Accents:** When targeting high-end modern screens, use chroma values between `0.20` and `0.28`.
- **Stepped Neutral Contrast:** Stepped neutral surfaces must increase by `0.04` Lightness increments (e.g., base `0.08` → surface `0.12` → raised `0.16` → overlay `0.20`) to create physical depth without color tint deviations.

---

## 2. Typographical Tracking & scaling

Headings must use `clamp()` for fluid sizing and tight negative letter spacing (tracking) to prevent loose display layouts:

| Token | Clamp Value | Weight | Line Height | Tracking |
| :--- | :--- | :--- | :--- | :--- |
| `--text-hero` | `clamp(2.5rem, 6vw, 4.5rem)` | 800 | 0.95 | `-0.04em` (Tight) |
| `--text-h1` | `clamp(2.0rem, 4vw, 3.0rem)` | 700 | 1.05 | `-0.03em` |
| `--text-h2` | `clamp(1.5rem, 3vw, 2.0rem)` | 600 | 1.15 | `-0.02em` |
| `--text-body` | `1rem` | 400 | 1.60 | `0` (Normal) |
| `--text-sm` | `0.875rem` | 400 | 1.50 | `+0.005em` (Loose) |

*   **BALANCED Headings:** Always declare `text-wrap: balance` on all dynamic title elements to prevent visual orphans.
*   **Reading Measures:** Paragraph widths must be clamped to `65ch` max width (`max-width: 65ch`) to reduce cognitive scan overhead.

---

## 3. Depth Shadows & Layering Math

Flat shadows look cheap. Premium interfaces use physics-based multi-layered shadows to simulate light occlusion:
```css
/* Stepped ambient + key shadow coefficients */
.elevation-md {
  box-shadow: 
    0 1px 2px oklch(0% 0 0 / 0.05),     /* Ambient shadow */
    0 4px 12px oklch(0% 0 0 / 0.08),    /* Key shadow */
    0 0 1px oklch(100% 0 0 / 0.12);     /* Hairline luminous stroke */
}
```
- In dark themes, shadows should drop in opacity and be accompanied by luminous hairlines (`border: 1px solid oklch(100% 0 0 / 0.08)`) instead of thick black shadows.

---

## 4. Interaction States & Transitions

All buttons and active controls must define styled properties for:
*   `hover`, `focus-visible`, `active`/`pressed`, and `disabled` states.
*   Use spring easing curves: `cubic-bezier(0.34, 1.56, 0.64, 1)`.

---

## Pre-Flight Checklist
- [ ] Have I reviewed the user's specific constraints and requests?
- [ ] Have I checked the environment for relevant existing implementations?
- [ ] Have I verified the design passes the Anti-AI-Slop Checklist?

## VBC Protocol (Verification-Before-Completion)
You MUST verify existing code signatures and variables before attempting to modify or call them. No hallucination is permitted.
