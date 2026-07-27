---
name: design-lab
description: Interactive design exploration workflow: conduct interviews, generate variants, and refine UI designs through user feedback loops.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: Design Exploration & UI Variants
  tier: pro
  co-requires: [brainstorming, shape, frontend-design]
  trigger-signals:
    strong: [design-lab, design exploration, generate variants, interactive design workflow, UI experiment]
    weak: [explore designs, design options]
---

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
