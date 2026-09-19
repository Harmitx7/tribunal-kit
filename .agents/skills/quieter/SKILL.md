---
name: quieter
description: "Use when Tone down overly loud, noisy, visually aggressive, or distracting designs while maintaining high visual quality. Use when a UI feels cluttered, overwhelming, tacky, or visually hyperactive."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - distill
  - swiss-design
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Quieter — Visual Restraint & Calm Interface Design

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

## 5 Restraint Tactics

### 1. Palette Subjugation

- **Reduce Primary Colors**: Limit saturated colors to a single primary action. Turn secondary accent colors into subtle monochrome tones (`oklch(0.92 0.01 240)`).
- **Mute Background Surfaces**: Replace multi-colored cards or high-saturation gradient backgrounds with quiet, neutral monochrome surfaces.

### 2. De-emphasize Borders & Outlines

- **Subtle Surface Elevation**: Replace harsh 100% black/white borders with subtle surface background differences ($L \pm 3\%$) or ultra-light 5% opacity borders.

### 3. Subdue Typography Scaling

- **Reduce Font Weight Spikes**: Replace heavy 900 bold display headings with refined semibold (`600`) or medium (`500`) typography.
- **Normalize Font Sizes**: Reduce font size jumps between section headers and subheaders to create smooth visual harmony.

### 4. Calm Motion & Animations

- **Eliminate Continuous Animations**: Remove spinning gradient borders, pulsing badges, and bouncing icons. Restrict motion exclusively to user-initiated actions.
- **Shorten Transitions**: Keep hover state transitions subtle and fast ($\le 150\text{ms}$).

### 5. Expand Negative Space

- **Increase Padding**: Give content room to breathe by increasing section paddings by 25%-50%, reducing cognitive overload.
