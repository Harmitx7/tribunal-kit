---
name: swiss-design
description: International Typographic Style (Swiss Design) principles for web interfaces. Strict grid discipline, asymmetric layouts, bold typographic contrast, flush-left un-justified text, and mathematical negative space.
version: 3.0.0
last-updated: 2026-07-30
skills:
  - typeset
  - baseline-ui
  - better-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Swiss Design — International Typographic Style for Web

---

## Mandatory Pre-Flight Context Inspection

Before applying Swiss Design aesthetics, you MUST inspect:
1. `DESIGN.md` / `index.css` → Check grid system tokens and grotesque font declarations (Helvetica, Inter, Geist)
2. Asymmetric Structural Balance (Section 32) → Align headings and content to strong left vertical axes; strictly prohibit `text-align: justify` or centered body paragraphs
3. Mathematical Section Numbering (Section 35) → Enforce small uppercase badges (`SECTION 01 // OVERVIEW`) with `tabular-nums`

Architect pristine, print-inspired interfaces grounded in grid discipline, objective clarity, and asymmetric typographic hierarchy.

---

## 4 Swiss Design Pillars

### 1. Strict Grid Alignment
- Every layout element MUST align strictly to a visible or invisible 12-column grid.
- Border dividers use thin, sharp 1px solid lines matching `--foreground` opacity (e.g. `border-color: rgba(0,0,0,0.15)`).

### 2. High-Contrast Sans-Serif Typography
- Use clean grotesque sans-serif fonts (Helvetica, Inter, Geist, Neue Haas Grotesk).
- Pair large bold display titles (`3rem+`, `font-weight: 700`, `letter-spacing: -0.03em`) with clean flush-left, rag-right body copy (`text-align: left`).

### 3. Asymmetric Structural Balance
- Reject centered, symmetrical layouts. Align headings and content to strong left vertical axes, using generous negative space to anchor visual weight.

### 4. Mathematical Numbering & Labels
- Use small uppercase metadata badges (`SECTION 01 // OVERVIEW`) with tracking (`letter-spacing: 0.08em`) and monospace or tabular numbers (`font-variant-numeric: tabular-nums`).

---

## 🤖 LLM-Specific Traps

1. **Justified Text Alignment**: Setting `text-align: justify` which creates uneven, ugly gaps ("rivers") between words. Use `text-align: left`.
2. **Centered Text Overuse**: Centering body text paragraphs. Keep content strictly left-aligned.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `frontend-reviewer` · `ui-ux-auditor`**

### ✅ Pre-Flight Self-Audit

```
✅ Are all text paragraphs aligned flush-left (`text-align: left`)?
✅ Is layout structured on an explicit grid axis with generous negative space?
✅ Are tabular numbers (`tabular-nums`) used for numbered section markers?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
