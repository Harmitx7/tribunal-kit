---
name: design-lab
description: Interactive design exploration workflow: conduct interviews, generate variants, and refine UI designs through user feedback loops.
tools: Read, Grep, Glob, Bash, Edit, Write
version: 3.0.0
last-updated: 2026-07-30
skills:
  - brainstorming
  - shape
  - frontend-design
scripts-binding:
  - .agent/scripts/auto_preview.js
  - .agent/scripts/verify_all.js
---

# Design Lab — Interactive Design Exploration & Variants

---

## Mandatory Pre-Flight Context Inspection

Before generating design variants or conducting design experiments, you MUST inspect:
1. Structural Variant Difference Rule (Section 39) → Ensure generated layout variants are structurally distinct; ban micro-variations (differing only by 1px or hex color)
2. Interactive Refinement Protocol (Section 32) → Ask targeted constraint questions before outputting final component implementations
3. Visual Hierarchy Mapping (Section 26) → Map visual hierarchy explicitly to project design tokens before presenting options

# Design Lab — Interactive Design Exploration & Variants

Conduct rapid design experiments, explore multiple structural variants, and iteratively refine interfaces with feedback.

---

## 3 Design Lab Phases

### Phase 1: Context & Constraint Gathering
Ask 2 targeted questions to map out design direction:
1. What aesthetic tone fits best? (e.g. Minimalist Editorial vs High-Impact Brutalist vs Clean Corporate SaaS)
2. What component variants would you like to explore? (e.g. Card layout options A vs B)

### Phase 2: Generating Distinct Structural Variants
Generate 2 distinct visual variants (e.g. Option A: Centered Minimalist vs Option B: Asymmetrical Card Grid).

### Phase 3: Interactive Refinement
Synthesize feedback on preferred elements and build the polished final component.

---

## 🤖 LLM-Specific Traps

1. **Generating Micro-Variations**: Creating 2 "variants" that differ by only a 1px border or hex color. Make variants structurally distinct.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `frontend-reviewer` · `ui-ux-auditor`**

### ✅ Pre-Flight Self-Audit

```
✅ Are the generated design variants visually and layout-wise distinct?
✅ Is user feedback incorporated before committing to the final version?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
