---
name: improve-ui
description: Audit an existing product surface against its own design evidence, identify verified UI problems, and write self-contained implementation plans for another agent. Strictly read-only on product source. Use when asked to review, refine, improve, or clean up an interface without replacing its identity.
version: 4.0.0
last-updated: 2026-09-07
skills:
  - better-ui
  - baseline-ui
  - create-design-md
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Improve UI — Evidence-Based UI Audit & Implementation Planning

---

## Mandatory Pre-Flight Context Inspection

Before auditing UI surfaces or writing remediation plans, you MUST inspect:

1. Read-Only Constraint (Section 24) → Strictly NEVER modify product source code (`src/`, `components/`, `app/`) during an `improve-ui` audit session
2. 3-Proof Requirement (Section 40) → Every reported defect MUST present Observation (code line/element), Basis (token/grid violation), and Consequence
3. Plan Artifact Output (Section 25) → Write implementation plans to `design-plans/` or output structured markdown for execution

Audit a specific product surface against its governing design tokens and guidelines, identify verified UI defects, and generate self-contained implementation plans for remediation.


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Audit an existing product surface against its own design evidence, identify verified UI problems, and write self-contained implementation plans for another agent. Strictly read-only on product source. Use when asked to review, refine, improve, or clean up an interface without replacing its identity..
- **DO NOT activate when:** The task falls strictly outside improve-ui domain or belongs to a different dedicated specialist.

---

## 1. Operating Rules & Boundaries

- **Strictly Read-Only on Product Source**: Never modify product source files (`src/`, `components/`, `app/`) during an `improve-ui` audit session.
- **Output Artifacts Only**: Create plans under `design-plans/` or return an actionable implementation plan to the user.
- **Respect Product Identity**: Preserve existing component architecture, routing, and product identity.

---

## 2. The 4-Phase Audit Protocol

### Phase 1: Surface Selection & Path Tracing

1. Focus on one deployable application and one coherent surface family (e.g. `Dashboard / Overview`).
2. Trace the path from route layout $\rightarrow$ page composition $\rightarrow$ shared UI primitives $\rightarrow$ tokens/CSS variables.

### Phase 2: Design Language Reconstruction

1. Inspect `DESIGN.md`, `index.css`, Tailwind tokens, or custom properties.
2. Record active background tokens, typography roles, spatial rules, and border/shadow contracts.

### Phase 3: Proof-Gated Defect Verification

Before reporting a finding, require 3 explicit proofs:

- **Observation**: Exact code line or rendered element showing the discrepancy.
- **Basis**: Violation of documented design token or 8px grid baseline.
- **Consequence**: Measurable degradation of visual hierarchy, readability, or interaction response.

### Phase 4: Implementation Plan Generation

Write a self-contained plan specifying:

- Files to modify
- Exact CSS/JSX diffs
- Verification steps (browser preview, contrast check, visual alignment)

---

## Anti-Slop Table

| Audit Pattern                  | Evidence-Based Rule                           | Rationale                        |
| ------------------------------ | --------------------------------------------- | -------------------------------- |
| Rewriting entire components    | Targeted visual diff plan                     | Preserves business logic & state |
| Guessing design tokens         | Citing verified `var(--...)` declarations     | Ensures token adherence          |
| Speculative visual preferences | Reporting only verified WCAG/token violations | Prevents arbitrary churn         |

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
