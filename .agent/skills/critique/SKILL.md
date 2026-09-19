---
name: critique
description: "Use when Evaluate design quality with structured UX scoring, heuristic analysis, and persona-based usability checks. Use when asked to critique, evaluate, grade, or audit a UI design before implementation."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - ui-ux-researcher
  - web-design-guidelines
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/checklist.js
  - .agent/scripts/verify_all.js
  - .agent/scripts/lint_runner.js
---

# Critique — Structured UX & Design Quality Evaluation

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

## The 6 UX Critique Heuristics

```
1. Clarity & Cognitive Load (0-10)
   - Is the primary task obvious within 3 seconds?
   - Is visual hierarchy clear with distinct primary, secondary, and tertiary elements?

2. Information Architecture & Pacing (0-10)
   - Is content logically grouped with appropriate negative space?
   - Is reading flow natural (top-left to bottom-right)?

3. Interaction Mechanics & Tactility (0-10)
   - Are interactive targets obvious and sized >= 44x44px for touch?
   - Is immediate feedback provided for hover, press, focus, and loading states?

4. Visual Elegance & Brand Craft (0-10)
   - Are color palettes harmonious and consistent?
   - Are typographic scales disciplined and optically balanced?

5. Accessibility & Inclusivity (0-10)
   - Does contrast meet WCAG AA standards (4.5:1 text, 3:1 UI controls)?
   - Is the screen fully navigable via keyboard with visible focus indicators?

6. Edge Case Resilience (0-10)
   - Are zero-item empty states, errors, loading skeletons, and truncated text handled?
```

---

## Critique Output Format (Required)

Always output the critique as a structured Markdown evaluation:

```markdown
# 🔍 UX Critique Report

### Overall Quality Score: 8.2 / 10

| Heuristic Domain         | Score | Critical Observation                                |
| ------------------------ | ----- | --------------------------------------------------- |
| Clarity & Cognitive Load | 8/10  | Hero CTA is clear, but subhead copy is verbose.     |
| Information Architecture | 9/10  | Excellent grouping and card rhythm.                 |
| Interaction Mechanics    | 7/10  | Missing `:active` press state on primary buttons.   |
| Visual Elegance & Craft  | 9/10  | Great typography scale and subtle border treatment. |
| Accessibility            | 8/10  | Text contrast passes; dropdown needs ARIA labels.   |
| Edge Case Resilience     | 8/10  | Empty state present; needs loading skeleton.        |

### Top 3 Actionable Fixes

1. **[High Priority]**: Add `:active` scale transform (`scale(0.97)`) to interactive buttons.
2. **[Medium Priority]**: Add `text-wrap: balance` to display headings to eliminate orphans.
3. **[Low Priority]**: Truncate secondary card description strings to 2 lines (`line-clamp-2`).
```
