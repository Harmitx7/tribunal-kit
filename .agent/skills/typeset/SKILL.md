---
name: typeset
description: Professional web typography scaling, font pairing, optical sizing, tracking, line height cadence, text-wrap balance, and OpenType features. Use when refining typography systems or text styling.
version: 3.0.0
last-updated: 2026-07-30
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

## Mandatory Pre-Flight Context Inspection

Before refining typography scales or text styles, you MUST inspect:
1. `DESIGN.md` / `index.css` → Verify typography scale variables, font families, and OpenType settings
2. Optical Tracking & Line-Height Cadence (Section 24) → Enforce `1.1` line-height for display headings, `1.5` for body text, and `-0.03em` tracking
3. Modern Text Wrapping (Section 36) → Apply `text-wrap: balance` to headings and limit paragraph line width to `65ch`

Architect disciplined, optically balanced typography systems across web components.

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
  font-feature-settings: "tnum" 1, "lnum" 1;
}
```

---

## 🤖 LLM-Specific Traps

1. **Uniform Line Height**: Setting `line-height: 1.5` on large 4rem display headings, causing massive awkward vertical gaps.
2. **Missing Text Wrap Rules**: Allowing headings to wrap into single orphaned words.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `frontend-reviewer` · `ui-ux-auditor`**

### ✅ Pre-Flight Self-Audit

```
✅ Are line-heights inversely proportional to font sizes (Display: 1.1, Body: 1.5)?
✅ Is `text-wrap: balance` applied to display titles and headings?
✅ Do numeric columns use tabular numbers (`font-variant-numeric: tabular-nums`)?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
