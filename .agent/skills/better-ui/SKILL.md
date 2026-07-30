---
name: better-ui
description: Design engineering principles for making interfaces feel polished. Use when building UI components, reviewing frontend code, implementing animations, hover states, shadows, borders, micro-interactions, or visual detail work.
version: 3.0.0
last-updated: 2026-07-30
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

## Mandatory Pre-Flight Context Inspection

Before engineering component polish or micro-interactions, you MUST inspect:
1. Outer vs Inner Radius Formula (Section 32) → Enforce $\text{Radius}_{\text{outer}} = \text{Radius}_{\text{inner}} + \text{Padding}_{\text{inner}}$
2. Transition Rules (Section 25) → Strictly prohibit `transition: all`; specify explicit property transitions
3. Multi-Layer Shadows (Section 42) → Use ambient + direct lighting stacks and dark mode surface elevation highlights

Distilled design engineering principles for transforming functional UIs into polished, state-of-the-art software interfaces, based on Jakub Krehel's *Details that make interfaces feel better*.

---

## 1. Micro-Interactions & State Feedback

- **Button Active Press Feedback**: Every interactive target MUST respond instantly to press with `transform: scale(0.97)` on `:active` using `transition: transform 120ms cubic-bezier(0.2, 0, 0, 1)`.
- **Targeted Hover Transitions**: NEVER use `transition: all` in CSS. Specify explicit properties (`transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 200ms ease, border-color 200ms ease`).
- **Focus Rings**: Never use default browser outline rings or `outline: none` without replacement. Use `:focus-visible` with custom offset rings (`outline: 2px solid var(--ring); outline-offset: 2px`).

---

## 2. Spatial Discipline & Geometry

- **Nested Border Radius Formula**: Outer border radius MUST equal inner border radius plus inner padding.
  $$\text{Radius}_{\text{outer}} = \text{Radius}_{\text{inner}} + \text{Padding}_{\text{inner}}$$
  *Example*: If container padding is `16px` and inner avatar radius is `8px`, outer container radius MUST be `24px`.
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
.stagger-item:nth-child(1) { animation-delay: 0ms; }
.stagger-item:nth-child(2) { animation-delay: 40ms; }
.stagger-item:nth-child(3) { animation-delay: 80ms; }
```

---

## Anti-Slop Table

| Slop Pattern | Better UI Standard | Rationale |
| --- | --- | --- |
| `transition: all 0.3s` | Specific CSS property transitions | Eliminates layout thrashing & unintended color transitions |
| Flat click targets without press feedback | `scale(0.97)` on `:active` | Provides tactile physical response |
| Arbitrary inner vs outer radii | $\text{Radius}_{\text{outer}} = \text{Radius}_{\text{inner}} + \text{Padding}$ | Maintains geometric optical harmony |

---

## 🤖 LLM-Specific Traps

1. **`transition: all` Laziness**: Causes layout recalculations and flashes during dark/light mode toggles.
2. **Missing Active States**: Adding hover effects but forgetting `:active` click feedback.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

### ✅ Pre-Flight Self-Audit

```
✅ Are all inner vs outer radii mathematically aligned?
✅ Did I use specific CSS transition properties instead of transition: all?
✅ Is hover and active state feedback explicit on all interactive targets?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

Inspect micro-interactions and nested corner geometry in browser preview before delivery.
