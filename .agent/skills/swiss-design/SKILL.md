---
name: swiss-design
description: International Typographic Style (Swiss Design) principles for web interfaces. Strict grid discipline, asymmetric layouts, bold typographic contrast, flush-left un-justified text, and mathematical negative space.
version: 4.0.0
last-updated: 2026-09-07
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


## Activation Boundaries

- **Activate when:** Operating in tasks requiring International Typographic Style (Swiss Design) principles for web interfaces. Strict grid discipline, asymmetric layouts, bold typographic contrast, flush-left un-justified text, and mathematical negative space..
- **DO NOT activate when:** The task falls strictly outside swiss-design domain or belongs to a different dedicated specialist.

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
