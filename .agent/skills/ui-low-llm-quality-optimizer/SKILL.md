---
name: ui-low-llm-quality-optimizer
description: "Cognitive scaffolding engine for smaller and constrained LLMs. Converts open-ended requests into compact decision trees, enforces mathematical design tokens, and runs targeted iterative correction loops."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - ui-reasoning-engine
  - frontend-design
  - better-ui
  - critique
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
inputs:
  user_request: "string"
  target_file: "string"
outputs:
  design_decision_record: "object"
  scaffolded_steps: "array"
  correction_plan: "object"
trigger:
  - "low-llm"
  - "quality-optimizer"
  - "scaffolding"
  - "constrained-model"
  - "small-model"
---

# UI Low-LLM Quality Optimizer — Cognitive Scaffolding & Bounded Design

## Mandatory Pre-Flight Context Inspection
Before guiding code generation in the `ui-low-llm-quality-optimizer` domain, inspect these 5 critical parameters:
1. **Model Capability & Context Budget**: Assess whether the executing model has limited parameter size (<=70B) or context window (<8K effective tokens) requiring strict task decomposition.
2. **Design Ambiguity Level**: Evaluate whether the user's prompt is open-ended ("make it look modern") or explicitly constrained with brand tokens.
3. **Execution Guardrails**: Identify high-risk hallucination traps (default purple gradients, missing interactive states, unaligned cards).
4. **Validation & Type Contracts**: Validate that output components conform to strict TypeScript interfaces and semantic HTML.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (visual audit results, zero console errors).

## Activation Boundaries
- **Activate when:** Guiding smaller, faster, or constrained LLMs through substantial interface design tasks, preventing generic AI aesthetic defaults, or recovering from mediocre generated UI.
- **DO NOT activate when:** The task is a trivial 1-line text/color edit or handled by a direct specialized utility.

## 🔁 Multi-Pass Scaffolding Protocol

| Pass | Phase | Core Action | Bounded LLM Guard |
|:---|:---|:---|:---|
| **Pass 1** | **Deconstruct & Classify** | Map prompt to one of 5 product categories (DevTool, SaaS, Analytics, Consumer, Editorial). | Forbid guessing; choose the nearest category. |
| **Pass 2** | **Formulate DDR** | Output a 10-line Design Decision Record (DDR) specifying OKLCH tokens and art direction. | Commit to tokens BEFORE generating any JSX. |
| **Pass 3** | **Bounded Code Gen** | Generate component code with strict mathematical constraints (nested radius, 8pt grid). | Forbid placeholder copy ("Lorem Ipsum"). |
| **Pass 4** | **Defect Scan** | Run static AST check (`visual_audit.js`) for hardcoded hex codes and missing focus rings. | Intercept defects before finalizing. |
| **Pass 5** | **Surgical Correction** | Apply targeted, single-line corrections in order of the Defect Impact Hierarchy (P0 to P7). | Limit to maximum 3 correction iterations. |

---

## 🛠️ Technical Architecture & Reference Recipes

### 1. Concrete Cognitive Constraints for Weak Models
1. **Never Ask "What Looks Good?":** Smaller models hallucinate aesthetics. Instead, supply explicit mathematical formulas:
   - Outer Radius: $R_{\text{outer}} = R_{\text{inner}} + \text{Padding}$
   - Lightness Contrast: $\Delta L \ge 0.45$ for text vs background.
   - Spatial Grid: All paddings and margins must be multiples of 8px (or 4px for tight tags).
2. **The 3 Anti-Slop Hard Gates:**
   - ❌ **No Purple Mesh:** Reject `#8B5CF6` / `violet-500` tech gradients. Use crisp monochrome with single OKLCH accent.
   - ❌ **No Cards-in-Cards:** If nesting containers, the outer container must be a borderless layout group, not a card.
   - ❌ **No Flat Buttons:** Every button MUST have `:active:scale-[0.98]` feedback.

### 2. Compact 10-Line DDR Template
```markdown
- Category: Developer Tool | Visual Direction: Technical Utilitarian
- Background: oklch(0.14 0.01 260) | Raised: oklch(0.18 0.01 260)
- Text Primary: oklch(0.96 0.005 260) | Muted: oklch(0.55 0.01 260)
- Accent: oklch(0.72 0.16 200) (Electric Cyan)
- Typography: Inter UI + JetBrains Mono (metrics)
- Spacing: 16px container padding | 8px element gap
- Radii: Outer 18px | Inner tag 2px (Formula: 2 + 16 = 18px)
- States: :hover (L-0.08) | :active (scale 0.98) | :focus-visible (2px ring, 2px offset)
- Anti-Slop: Zero purple gradients, zero cards-in-cards, realistic copy only
```

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What Weak LLMs Default To | What Is Actually Correct |
|:---|:---|:---|
| Open-ended styling | Adds arbitrary drop shadows, purple gradients, and glassmorphism. | Applies a structured Art Direction Preset (e.g. Minimal Editorial). |
| Corner radii | Uses `rounded-2xl` on inner card and `rounded-md` on outer card. | Enforces $R_{\text{outer}} = R_{\text{inner}} + P$. |
| Interactive state | Defines only default background color. | Implements all 5 states: default, hover, focus-visible, active press, disabled. |
| Text wrapping | Generates long unconstrained single-line headings. | Sets max line-length ($45\text{ch} \le W \le 75\text{ch}$) and `text-wrap: balance`. |

---

## 🏛️ Tribunal Verification & Guardrails

### 🔬 Evidence Standard (Tri-State Verification)
- **`[OBSERVED]`**: Directly verified via static scanner or browser DOM inspection.
- **`[INFERRED]`**: Logically deduced from token contracts.
- **`[UNVERIFIED]`**: Speculative aesthetic assessment.

### 🛑 Verification-Before-Completion (VBC) Protocol
You are explicitly forbidden from declaring a UI task complete without verifying that the generated interface satisfies the Design Decision Record and passes static visual defect analysis.

