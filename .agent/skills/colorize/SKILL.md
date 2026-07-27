---
name: colorize
description: Introduce strategic, harmonious, accessible color systems and OKLCH color palettes to visually flat or dull interfaces.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: Color Systems & Palette Engineering
  tier: pro
  co-requires: [better-colors, frontend-design]
  trigger-signals:
    strong: [colorize, color system, OKLCH palette, introduce color, color palette generator, UI color tokens]
    weak: [add color, theme colors]
---

# Colorize — Color System & OKLCH Palette Design

Architect uniform, perceptually balanced color scales using the modern OKLCH color space for light and dark modes.

---

## 4 Color System Principles

### 1. Why OKLCH Over HSL/Hex
- Traditional HSL suffers from perceptual lightness jumps (e.g. pure yellow `#FFFF00` at Lightness 50% looks blindingly bright compared to pure blue `#0000FF` at Lightness 50%).
- OKLCH enforces constant perceptual lightness ($L$), predictable chroma ($C$), and hue angles ($H$).

```css
:root {
  /* Primary Brand Scale in OKLCH: L C H */
  --primary-50:  oklch(0.97 0.02 250);
  --primary-100: oklch(0.92 0.04 250);
  --primary-500: oklch(0.60 0.18 250); /* Main Brand Color */
  --primary-700: oklch(0.42 0.16 250);
  --primary-900: oklch(0.24 0.10 250);
}
```

### 2. The 60-30-10 Color Budget Rule
- **60% Dominant Neutral**: Backgrounds, page canvas, card surfaces (`oklch(0.98 0.005 240)`).
- **30% Structural Secondary**: Typography, borders, icons, navigation chrome (`oklch(0.20 0.01 240)`).
- **10% Intentional Accent**: Primary actions, key badges, status confirmations (`oklch(0.60 0.18 250)`).

### 3. Functional Status Color Tokens
Never use random red/green/yellow hex codes. Maintain matching chroma and lightness across status semantic scales:
- **Success**: `oklch(0.62 0.17 145)` (Emerald)
- **Warning**: `oklch(0.72 0.16 75)` (Amber)
- **Destructive**: `oklch(0.58 0.22 25)` (Coral Red)
- **Info**: `oklch(0.62 0.16 240)` (Sky Blue)

---

## 🤖 LLM-Specific Traps

1. **Random Hex Colors**: Scattering `#3b82f6` or `#ef4444` directly in component files without CSS variables.
2. **Ignoring Wide-Gamut Displays**: Failing to provide fallback colors for browsers without Display P3 support.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `frontend-reviewer` · `ui-ux-auditor`**

### ✅ Pre-Flight Self-Audit

```
✅ Are colors declared via CSS variables in the OKLCH color space?
✅ Does the color distribution strictly honor the 60-30-10 budget?
✅ Do status colors maintain uniform perceptual lightness ($L \approx 0.60$ - $0.72$)?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
