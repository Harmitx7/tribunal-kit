---
name: critique
description: Evaluate design quality with structured UX scoring, heuristic analysis, and persona-based usability checks. Use when asked to critique, evaluate, grade, or audit a UI design before implementation.
version: 3.0.0
last-updated: 2026-07-30
skills:
  - ui-ux-researcher
  - web-design-guidelines
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/checklist.js
  - .agent/scripts/verify_all.js
---

# Critique — Structured UX & Design Quality Evaluation

---

## Mandatory Pre-Flight Context Inspection

Before evaluating UI designs or code, you MUST inspect:
1. Target UI screen / component → Grade across the 6 UX Critique Heuristics (Clarity, IA, Interactions, Visual Craft, Accessibility, Resilience)
2. Required Scorecard Format (Section 51) → Output overall quality score (0-10) and tabular domain breakdown
3. Top 3 Actionable Fixes → Group recommendations by priority (High, Medium, Low) with concrete CSS/JSX fixes

Evaluate interfaces against 6 core usability heuristics and produce an objective design scorecard with prioritized recommendations.

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

| Heuristic Domain | Score | Critical Observation |
| --- | --- | --- |
| Clarity & Cognitive Load | 8/10 | Hero CTA is clear, but subhead copy is verbose. |
| Information Architecture | 9/10 | Excellent grouping and card rhythm. |
| Interaction Mechanics | 7/10 | Missing `:active` press state on primary buttons. |
| Visual Elegance & Craft | 9/10 | Great typography scale and subtle border treatment. |
| Accessibility | 8/10 | Text contrast passes; dropdown needs ARIA labels. |
| Edge Case Resilience | 8/10 | Empty state present; needs loading skeleton. |

### Top 3 Actionable Fixes
1. **[High Priority]**: Add `:active` scale transform (`scale(0.97)`) to interactive buttons.
2. **[Medium Priority]**: Add `text-wrap: balance` to display headings to eliminate orphans.
3. **[Low Priority]**: Truncate secondary card description strings to 2 lines (`line-clamp-2`).
```

---

## 🤖 LLM-Specific Traps

1. **Vague Superficial Praise**: Giving generic feedback like "Looks great!" without scoring heuristics.
2. **Hyper-Subjective Nitpicks**: Flagging personal aesthetic preferences as critical flaws. Ground all critique in objective usability heuristics and WCAG guidelines.

### ✅ Pre-Flight Self-Audit

```
✅ Did I score all 6 heuristics with objective observations?
✅ Are actionable fixes prioritized by impact (High/Medium/Low)?
✅ Is all critique grounded in WCAG or established usability heuristics?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
