---
name: polish
description: Final production quality pass for spacing, alignment, visual rhythm, dark mode consistency, and edge states. Use before shipping or merging a feature to ensure 100% UI fidelity.
version: 3.0.0
last-updated: 2026-07-30
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

## Mandatory Pre-Flight Context Inspection

Before running a pre-ship quality pass, you MUST inspect:
1. Target component / view state → Test across light and dark theme modes
2. The 10-Point Polish Checklist (Section 22) → Audit 8px grid alignment, tabular numbers, focus rings, press feedback, and CLS loading skeletons
3. Edge case string truncation → Test long user input strings with `truncate` or `line-clamp` boundaries

The comprehensive pre-ship inspection checklist to verify that code meets top-tier design-engineering standards.

---

## Pre-Ship 10-Point Polish Checklist

| # | Inspection Item | Verification Rule |
| --- | --- | --- |
| **1** | **Grid Alignment** | All paddings, margins, and flex gaps use strict 4px/8px multiples. |
| **2** | **Typography Scale** | Headings use `text-wrap: balance`; body copy limit max `65ch` per line. |
| **3** | **Tabular Data** | All numbers in tables, badges, and stats use `font-variant-numeric: tabular-nums`. |
| **4** | **Focus States** | Keyboard tab navigation shows visible, non-clipped `:focus-visible` ring. |
| **5** | **Press Feedback** | All buttons, links, and cards have explicit `:active` press feedback. |
| **6** | **Dark Mode** | Dark theme uses relative surface lightness steps and subtle borders instead of dark shadows. |
| **7** | **Overflow Handling** | Long text strings, email addresses, and filenames use proper text truncation (`truncate` / `line-clamp`). |
| **8** | **Empty States** | Lists, tables, and search results handle zero-item empty states gracefully. |
| **9** | **Loading Skeletons** | Slow data loads show matching skeleton pulses instead of sudden layout shifts (CLS). |
| **10** | **Reduced Motion** | CSS animations and JS motion respect `@media (prefers-reduced-motion: reduce)`. |

---

## 🤖 LLM-Specific Traps

1. **Shipping without truncation**: Letting long user inputs overflow card boundaries or break layouts.
2. **Missing Dark Mode Contrast**: Using dark text on dark surfaces in theme toggles.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `frontend-reviewer` · `ui-ux-auditor` · `accessibility-reviewer`**

### ✅ Pre-Flight Self-Audit

```
✅ Have all 10 polish items been verified across light and dark modes?
✅ Is text truncation handled for edge-case content lengths?
✅ Do interactive elements show visible focus indicators during keyboard tab testing?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
