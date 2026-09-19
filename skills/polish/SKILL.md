---
name: polish
description: "Use when Final production quality pass for spacing, alignment, visual rhythm, dark mode consistency, and edge states. Use before shipping or merging a feature to ensure 100% UI fidelity."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - better-ui
  - harden
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Polish — Final Pre-Ship UI Quality Pass

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

## Pre-Ship 10-Point Polish Checklist

| #      | Inspection Item       | Verification Rule                                                                                         |
| ------ | --------------------- | --------------------------------------------------------------------------------------------------------- |
| **1**  | **Grid Alignment**    | All paddings, margins, and flex gaps use strict 4px/8px multiples.                                        |
| **2**  | **Typography Scale**  | Headings use `text-wrap: balance`; body copy limit max `65ch` per line.                                   |
| **3**  | **Tabular Data**      | All numbers in tables, badges, and stats use `font-variant-numeric: tabular-nums`.                        |
| **4**  | **Focus States**      | Keyboard tab navigation shows visible, non-clipped `:focus-visible` ring.                                 |
| **5**  | **Press Feedback**    | All buttons, links, and cards have explicit `:active` press feedback.                                     |
| **6**  | **Dark Mode**         | Dark theme uses relative surface lightness steps and subtle borders instead of dark shadows.              |
| **7**  | **Overflow Handling** | Long text strings, email addresses, and filenames use proper text truncation (`truncate` / `line-clamp`). |
| **8**  | **Empty States**      | Lists, tables, and search results handle zero-item empty states gracefully.                               |
| **9**  | **Loading Skeletons** | Slow data loads show matching skeleton pulses instead of sudden layout shifts (CLS).                      |
| **10** | **Reduced Motion**    | CSS animations and JS motion respect `@media (prefers-reduced-motion: reduce)`.                           |
