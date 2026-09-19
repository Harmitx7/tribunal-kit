---
name: compact-landing
description: "Use when Build compact, premium landing pages with clear CTA hierarchy, quiet typography, restrained visual noise, and high conversion flow."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - landing-page
  - quieter
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Compact Landing — Premium Minimalist Landing Pages

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

## 4 Compact Landing Rules

### 1. The Single Viewport Value Pitch

- Above-the-fold content must answer 3 questions instantly within 1 single screen viewport:
  1. _What is it?_ (Clear, un-hypey headline + subhead)
  2. _What does it look like?_ (Crisp UI screenshot or interactive preview component)
  3. _How do I get it?_ (Unambiguous primary CTA input/button)

### 2. Quiet Typographic Hierarchy

- Use subdued monochrome typography (`oklch(0.95 0.005 240)` background with `oklch(0.20 0.01 240)` body copy).
- Keep display font sizes restrained (`clamp(1.75rem, 4vw, 2.75rem)`) rather than giant 5rem text blocks.

### 3. Tight Spatial Grid

- Limit total page section count to max 4 sections:
  1. Hero + Primary CTA + Product Preview
  2. Social Proof / Logo Bar
  3. Feature Grid (3 core benefits max)
  4. Conversion Footer Card

### 4. Zero Unnecessary Visual Noise

- Omit decorative background shapes, floating 3D spheres, and rainbow gradients. Let contrast and typography drive visual quality.
