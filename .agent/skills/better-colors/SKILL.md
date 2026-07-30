---
name: better-colors
description: OKLCH color space for web projects. Convert hex/rgb/hsl to oklch, generate palettes, check contrast, handle gamut boundaries, and theme with Tailwind v4. Triggers on oklch, color conversion, palette generation, contrast ratio, gamut, display p3, design tokens, hue drift, chroma, dark mode colors.
version: 3.0.0
last-updated: 2026-07-30
skills:
  - better-ui
  - baseline-ui
  - colorize
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Better Colors — OKLCH & Modern Web Color Systems

---

## Mandatory Pre-Flight Context Inspection

Before defining color palettes or CSS theme variables, you MUST inspect:
1. `DESIGN.md` / `index.css` → Check existing CSS custom properties and color variables
2. OKLCH Syntax & Relative Color Rules (Section 30) → Use `oklch(L C H)` format with subtle chroma (`C: 0.01-0.02`) for neutrals
3. WCAG 2.2 AA Contrast Thresholds (Section 82) → Ensure `L ≤ 45%` for text on light background and `L ≥ 70%` on dark background

Design engineering guidelines for building perceptually uniform, WCAG 2.2 AA compliant, P3-gamut color systems using the modern **OKLCH** color space.

---

## 1. Why OKLCH Over HSL / RGB

- **Perceptual Uniformity**: In HSL, yellow (`hsl(60, 100%, 50%)`) is far brighter than blue (`hsl(240, 100%, 50%)`) at the exact same lightness value. OKLCH fixes this: lightness (`L`) corresponds directly to human eye perception.
- **Predictable Palette Steps**: Changing lightness in OKLCH scales brightness smoothly without hue drift (e.g. blue turning purple when lightened in HSL).
- **Wide Gamut Access**: Access Display P3 wide-gamut colors (`oklch(L C H)`), producing significantly richer, punchier vibrant tones on modern displays.

---

## 2. OKLCH Syntax & Variables

$$\text{Format: } \text{oklch}(L \quad C \quad H [\quad / \quad A])$$

- `L` (Lightness): `0%` (black) to `100%` (white) or `0` to `1`.
- `C` (Chroma): `0` (gray) to `0.37+` (vibrant peak). Typical UI chroma range: `0.02` to `0.22`.
- `H` (Hue): `0` to `360` degrees.
  - `0` / `360`: Red / Magenta
  - `90`: Yellow / Gold
  - `140`: Green / Emerald
  - `250`: Blue / Indigo
  - `300`: Purple / Violet

### CSS Custom Properties & Relative Color Syntax

```css
:root {
  /* Brand Primary: Vibrant Indigo */
  --color-primary: oklch(0.55 0.22 260);
  /* Modern CSS Relative Color Syntax (Modifying Lightness/Chroma dynamically) */
  --color-primary-hover: oklch(from var(--color-primary) calc(l - 0.08) c h);
  --color-primary-active: oklch(from var(--color-primary) calc(l - 0.14) c h);
  --color-primary-subtle: oklch(from var(--color-primary) 0.95 0.04 h);

  /* Neutrals: Subtly Tinted (Chroma ~ 0.015) */
  --bg-surface: oklch(0.99 0.005 260);
  --bg-surface-raised: oklch(0.96 0.01 260);
  --text-main: oklch(0.20 0.02 260);
  --text-muted: oklch(0.45 0.02 260);
  --border-subtle: oklch(0.88 0.015 260);
}

/* Native CSS light-dark() declaration mode */
:root {
  color-scheme: light dark;
  --surface-adaptive: light-dark(oklch(0.99 0.005 260), oklch(0.14 0.015 260));
  --text-adaptive: light-dark(oklch(0.20 0.02 260), oklch(0.96 0.01 260));
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-surface: oklch(0.14 0.015 260);
    --bg-surface-raised: oklch(0.19 0.02 260);
    --text-main: oklch(0.96 0.01 260);
    --text-muted: oklch(0.68 0.02 260);
    --border-subtle: oklch(0.26 0.02 260);
  }
}
```

---

## 3. WCAG 2.2 AA Contrast Standards

Always verify contrast using WCAG AA minimum thresholds:
- **Normal Text (< 18pt / < 24px)**: Minimum **4.5:1** contrast ratio.
- **Large Text (≥ 18pt / ≥ 24px bold)**: Minimum **3.0:1** contrast ratio.
- **UI Components & Icons**: Minimum **3.0:1** contrast ratio against adjacent surface.

### Rule of Thumb in OKLCH:
To achieve 4.5:1 text contrast against a surface:
- Against Light Surface (`L ≈ 98%`): Text lightness `L` MUST be **`≤ 45%`**.
- Against Dark Surface (`L ≈ 14%`): Text lightness `L` MUST be **`≥ 70%`**.

---

## 4. Dark Mode & Gamut Boundaries

- **Avoid Raw Black (`#000`)**: Use deep OKLCH neutrals (`oklch(0.14 0.015 250)`). Pure black destroys depth perception and makes borders look harsh.
- **Desaturate Accent Colors in Dark Mode**: High chroma values (`C > 0.20`) cause visual fatigue and vibration on dark backgrounds. Lower chroma by ~20-30% (`C ≈ 0.14-0.16`).

---

## Anti-Slop Table

| Anti-Pattern | OKLCH Solution | Rationale |
| --- | --- | --- |
| Single gray for all backgrounds | Neutral tinted with brand hue (`C: 0.01-0.02`) | Creates cohesive, harmonious UI surfaces |
| Over-saturated dark mode accents | Scale chroma down (`C: 0.22` → `C: 0.15`) in dark mode | Eliminates glowing text vibration & visual strain |
| Harsh pure black borders (`#000`) | Alpha-tinted borders (`rgba(255,255,255,0.08)`) | Smooths elevation layers |

---

## 🤖 LLM-Specific Traps

1. **Using HSL for Dark Mode Inversion**: Inverting `lightness` in HSL causes dramatic hue shifts and contrast failures.
2. **Exceeding Display P3 Gamut**: Setting Chroma `C > 0.32` without fallback causes clipping or dull rendering on non-P3 displays.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

### ✅ Pre-Flight Self-Audit

```
✅ Are all color custom properties defined using OKLCH?
✅ Does text meet the minimum 4.5:1 WCAG AA contrast ratio?
✅ Are dark mode surfaces subtly tinted rather than pure #000000 black?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

Inspect colors across light and dark modes in browser preview to verify contrast and visual harmony.
