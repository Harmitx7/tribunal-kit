---
name: better-typography
description: Web typography from choosing fonts to spacing, wrapping, and accessibility. Use when picking or pairing typefaces, configuring variable fonts or OpenType features, setting up a type scale, styling text in components, truncating text, styling underlines, selection, placeholders, or carets. Triggers on typography, fonts, variable fonts, font-weight, opentype, letter-spacing, line-height, type scale, tabular numbers, text-wrap, truncation, line clamp, measure, line length.
version: 4.0.0
last-updated: 2026-09-07
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: UI Craft & Design Engineering
  tier: pro
  co-requires: [typeset, better-ui]
  trigger-signals:
    strong:
      [
        better-typography,
        typography,
        type scale,
        font pairing,
        tabular numbers,
        text-wrap balance,
        line-length,
        optical sizing,
      ]
    weak: [fonts, text style, line height]
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Better Typography — Web Typography & Font Engineering



## Activation Boundaries

- **Activate when:** Operating in tasks requiring Web typography from choosing fonts to spacing, wrapping, and accessibility. Use when picking or pairing typefaces, configuring variable fonts or OpenType features, setting up a type scale, styling text in components, truncating text, styling underlines, selection, placeholders, or carets. Triggers on typography, fonts, variable fonts, font-weight, opentype, letter-spacing, line-height, type scale, tabular numbers, text-wrap, truncation, line clamp, measure, line length..
- **DO NOT activate when:** The task falls strictly outside better-typography domain or belongs to a different dedicated specialist.

Design engineering guidelines for setting up modern, readable, scalable typography with OpenType features, fluid type scales, and optimal measure.

---

## 1. Modular Type Scales & Line Cadence

Scale font sizes using a consistent multiplier ($1.25$ Major Third or $1.20$ Minor Third):

```css
:root {
  --font-size-xs: 0.75rem; /* 12px - Labels, Badges */
  --font-size-sm: 0.875rem; /* 14px - Meta, Caption */
  --font-size-base: 1rem; /* 16px - Body Text */
  --font-size-lg: 1.125rem; /* 18px - Lead Body */
  --font-size-xl: 1.375rem; /* 22px - Subheadings */
  --font-size-2xl: 1.75rem; /* 28px - H3 */
  --font-size-3xl: 2.25rem; /* 36px - H2 */
  --font-size-4xl: 3rem; /* 48px - H1 Hero */

  /* Line Heights proportional to font size */
  --line-height-heading: 1.15;
  --line-height-body: 1.5;
  --line-height-tight: 1.25;
}
```

---

## 2. Line Length (Measure) & Text Wrapping

- **Optimal Line Length (Measure)**: Body text MUST be constrained between **45 to 75 characters** per line (`max-width: 65ch`).
- **Heading Balancing**: Always apply `text-wrap: balance` to headings (`h1`-`h4`) to eliminate single-word widows.
- **Paragraph Wrapping**: Use `text-wrap: pretty` for long body paragraphs to prevent awkward line breaks.

```css
h1,
h2,
h3,
h4 {
  text-wrap: balance;
  letter-spacing: -0.025em;
  line-height: var(--line-height-heading);
}

p {
  max-width: 65ch;
  text-wrap: pretty;
  line-height: var(--line-height-body);
}
```

---

## 3. OpenType Features & Tabular Numbers

- **Tabular Numbers for Data & Timers**: Use `font-variant-numeric: tabular-nums` (or `tnum`) for data tables, counters, prices, and timestamps so numbers align vertically without jumping when values update.
- **Font Smoothing**: Enable crisp font smoothing on macOS/iOS:

```css
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

---

## Anti-Slop Table

| Anti-Pattern                                | Typography Solution                  | Rationale                                        |
| ------------------------------------------- | ------------------------------------ | ------------------------------------------------ |
| Full-width body text (`width: 100%`)        | `max-width: 65ch`                    | Prevents eye fatigue across wide desktop screens |
| Single-word widows on headings              | `text-wrap: balance`                 | Creates balanced visual hierarchy                |
| Jittering numbers in data tables            | `font-variant-numeric: tabular-nums` | Keeps columns strictly aligned                   |
| Default browser line-height (`1.2` on body) | `line-height: 1.5`                   | Improves reading comfort                         |

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
