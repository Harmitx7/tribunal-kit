---
name: typeset
description: "Use when Professional web typography scaling, font pairing, optical sizing, tracking, line height cadence, text-wrap balance, and OpenType features. Use when refining typography systems or text styling."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - swiss-design
  - better-ui
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Typeset — Professional Web Typography System

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

## 4 Typography Rules

### 1. Typographic Scale & Line-Height Cadence

Use a modular scale (e.g. Major Third 1.25 or Perfect Fourth 1.333):

- **Display 1**: `3.5rem` / Line-height `1.1` / Tracking `-0.03em`
- **H1**: `2.25rem` / Line-height `1.15` / Tracking `-0.025em`
- **H2**: `1.75rem` / Line-height `1.2` / Tracking `-0.02em`
- **Body**: `1rem` / Line-height `1.5` / Tracking `0`
- **Caption**: `0.75rem` / Line-height `1.4` / Tracking `+0.01em`

### 2. Optical Tracking Formula

Larger font sizes require tighter negative letter-spacing; smaller caption sizes require positive letter-spacing:
$$\text{Tracking}(\text{px}) \propto -\log(\text{FontSize})$$

### 3. Modern Text Wrapping

- Headings: `text-wrap: balance` (prevents visual orphans).
- Body Paragraphs: `text-wrap: pretty` (prevents trailing single-word last lines).
- Max Width: Limit body paragraphs to `65ch` for comfortable reading lines.

### 4. Tabular & OpenType Features

- Enable tabular figures for numbers in statistics, prices, and tables:

```css
.numeric-data {
  font-variant-numeric: tabular-nums lining-nums;
  font-feature-settings:
    'tnum' 1,
    'lnum' 1;
}
```
