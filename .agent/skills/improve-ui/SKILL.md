---
name: improve-ui
description: Audit an existing product surface against its own design evidence, identify verified UI problems, and write self-contained implementation plans for another agent. Strictly read-only on product source. Use when asked to review, refine, improve, or clean up an interface without replacing its identity.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: UI Craft & Design Audit
  tier: master
  co-requires: [better-ui, baseline-ui]
  trigger-signals:
    strong: [improve-ui, audit interface, refine UI, UI review, design-system drift, UI cleanup plan]
    weak: [review layout, UI feedback]
---

# Improve UI — Evidence-Based UI Audit & Implementation Planning

Audit a specific product surface against its governing design tokens and guidelines, identify verified UI defects, and generate self-contained implementation plans for remediation.

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

| Audit Pattern | Evidence-Based Rule | Rationale |
| --- | --- | --- |
| Rewriting entire components | Targeted visual diff plan | Preserves business logic & state |
| Guessing design tokens | Citing verified `var(--...)` declarations | Ensures token adherence |
| Speculative visual preferences | Reporting only verified WCAG/token violations | Prevents arbitrary churn |

---

## 🤖 LLM-Specific Traps

1. **Mutating Code During Audit**: Applying code changes immediately instead of generating a clean implementation plan.
2. **Re-architecting Scope**: Re-writing component state hooks when only CSS spacing and contrast fixes were requested.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

### ✅ Pre-Flight Self-Audit

```
✅ Is the audit strictly read-only on product source code?
✅ Are all reported findings supported by concrete token or layout evidence?
✅ Is the generated implementation plan self-contained and ready for execution?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

Confirm all plan recommendations match project CSS custom properties before delivery.
