---
name: swiss-design
description: International Typographic Style (Swiss Design) principles for web interfaces. Strict grid discipline, asymmetric layouts, bold typographic contrast, flush-left un-justified text, and mathematical negative space.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: Print-Inspired UI & Swiss Typography
  tier: pro
  co-requires: [better-typography, baseline-ui, industrial-brutalist-ui]
  trigger-signals:
    strong: [swiss-design, Swiss style UI, International Typographic Style, grid discipline, Helvetica layout, print inspired web]
    weak: [swiss layout, grid UI]
---

# Swiss Design — International Typographic Style for Web

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
