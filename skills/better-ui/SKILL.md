---
name: better-ui
description: "Use when Design engineering principles for making interfaces feel polished. Use when building UI components, reviewing frontend code, implementing animations, hover states, shadows, borders, micro-interactions, or visual detail work."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - baseline-ui
  - better-colors
  - micro-interaction
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Better UI — Design Engineering & Polish Rules

---

## 🛠️ Technical Architecture & Reference Recipes

---

## 2026 UI Design Engineering Invariants

1. **The Nested Border Radius Formula**:
   ```css
   /* Inner card radius = 8px, Container padding = 16px -> Outer container radius = 24px */
   .card-container {
     padding: 16px;
     border-radius: 24px;
   }
   .card-inner {
     border-radius: 8px;
   }
   ```
2. **Perceptual OKLCH Color Scale**:
   ```css
   :root {
     --surface-0: oklch(0.14 0.01 260);
     --surface-1: oklch(0.18 0.01 260);
     --primary: oklch(0.65 0.18 145); /* High-chroma, uniform lightness */
   }
   ```
3. **Subgrid for Pixel-Perfect Card Alignment**:
   ```css
   .card-grid {
     display: grid;
     grid-template-columns: repeat(3, 1fr);
   }
   .card-grid > .card {
     display: grid;
     grid-template-rows: subgrid;
     grid-row: span 3;
   }
   ```

## Hallucination Traps (Read First)

- ❌ `transition: all 0.3s ease` → ✅ Specify explicit properties `transition: transform 150ms ease, opacity 150ms ease`
- ❌ Hardcoded single muddy black shadows → ✅ Multi-layer ambient + directional shadows
- ❌ Mismatched concentric border radii → ✅ Outer radius MUST equal inner radius + padding
- ❌ Generic AI violet/purple mesh gradients → ✅ Use subtle grain, solid contrast, and refined OKLCH accents

---

## 1. Micro-Interactions & State Feedback

- **Button Active Press Feedback**: Every interactive target MUST respond instantly to press with `transform: scale(0.97)` on `:active` using `transition: transform 120ms cubic-bezier(0.2, 0, 0, 1)`.
- **Targeted Hover Transitions**: NEVER use `transition: all` in CSS. Specify explicit properties (`transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 200ms ease, border-color 200ms ease`).
- **Focus Rings**: Never use default browser outline rings or `outline: none` without replacement. Use `:focus-visible` with custom offset rings (`outline: 2px solid var(--ring); outline-offset: 2px`).

---

## 2. Spatial Discipline & Geometry

- **Nested Border Radius Formula**: Outer border radius MUST equal inner border radius plus inner padding.
  $$\text{Radius}_{\text{outer}} = \text{Radius}_{\text{inner}} + \text{Padding}_{\text{inner}}$$
  _Example_: If container padding is `16px` and inner avatar radius is `8px`, outer container radius MUST be `24px`.
- **Concentric Curves**: Avoid mismatched corner radii where an inner card has `rounded-2xl` inside an outer `rounded-md` container.
- **Optical Center Adjustment**: Text inside pill buttons or badges often looks vertically low if mathematically centered. Shift text upwards by `1px` or adjust `line-height` so optics match mathematics.

---

## 3. Multi-Layer Shadows & Depth

- **Avoid Muddy Single Shadows**: Single-layer `box-shadow: 0 4px 6px rgba(0,0,0,0.3)` creates dirty, cheap shadows. Use multi-layered ambient + direct lighting:

```css
.card-shadow {
  box-shadow:
    0 1px 2px 0 rgba(0, 0, 0, 0.05),
    0 4px 12px -2px rgba(0, 0, 0, 0.08),
    0 16px 32px -8px rgba(0, 0, 0, 0.12);
}
```

- **Dark Mode Elevation**: Shadows are invisible on dark surfaces (`#121212`). Create depth in dark mode using subtle border highlights (`border: 1px solid rgba(255,255,255,0.08)`) and stepped background lightness (`oklch(0.14)` $\rightarrow$ `oklch(0.19)`).

---

## 4. Stagger Animations & Entry Flows

- **Cascading Entrances**: When revealing lists or grid items, stagger entry delays by `30ms` to `50ms` per item (max 6 items).
- **Scale Entrance Threshold**: Never animate from `scale(0)`. Start from `scale(0.96)` and `opacity: 0` to prevent popping artifacts.

```css
.stagger-item {
  animation: entrance 250ms cubic-bezier(0.16, 1, 0.3, 1) both;
}
.stagger-item:nth-child(1) {
  animation-delay: 0ms;
}
.stagger-item:nth-child(2) {
  animation-delay: 40ms;
}
.stagger-item:nth-child(3) {
  animation-delay: 80ms;
}
```

---

## Anti-Slop Table

| Slop Pattern                              | Better UI Standard                                                             | Rationale                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `transition: all 0.3s`                    | Specific CSS property transitions                                              | Eliminates layout thrashing & unintended color transitions |
| Flat click targets without press feedback | `scale(0.97)` on `:active`                                                     | Provides tactile physical response                         |
| Arbitrary inner vs outer radii            | $\text{Radius}_{\text{outer}} = \text{Radius}_{\text{inner}} + \text{Padding}$ | Maintains geometric optical harmony                        |
