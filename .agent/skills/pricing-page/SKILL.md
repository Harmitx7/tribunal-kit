---
name: pricing-page
description: SaaS pricing table architecture, billing cycle toggles (Monthly/Annual), feature comparison matrices, tier highlighting, and conversion optimization.
version: 3.0.0
last-updated: 2026-07-30
skills:
  - landing-page
  - compact-landing
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Pricing Page — SaaS Pricing Architecture & Comparison Grids

---

## Mandatory Pre-Flight Context Inspection

Before engineering SaaS pricing pages or comparison tables, you MUST inspect:
1. Tabular Price Numbers (Section 27) → Apply `font-variant-numeric: tabular-nums` to price digits to prevent layout jittering during Monthly/Annual toggles
2. Featured Tier Distinction (Section 31) → Highlight the "Most Popular" plan with distinct accent borders, badge pill, and solid primary CTA
3. Discount Badge (Section 26) → Display explicit "Save X%" discount badge alongside the Annual billing toggle option

Architect high-converting SaaS pricing tables with clear billing toggles, tier differentiation, and feature comparison matrices.

---

## 4 Pricing Table Rules

### 1. The Billing Cycle Toggle (Monthly vs Annual)
- Provide a clear segmented control or switch for **Monthly** / **Annual (Save 20%)**.
- Display an explicit "Save 20%" badge next to the annual option.
- Smoothly transition price numbers when toggling billing frequencies using `font-variant-numeric: tabular-nums`.

### 2. Tier Visual Hierarchy (Max 3-4 Tiers)
- **Hobby / Starter**: Quiet surface, border outline, ghost CTA button (*"Start free"*).
- **Pro / Business (Featured Tier)**: Prominent accent border, subtle glow/gradient header, "Most Popular" pill badge, solid primary CTA button (*"Start 14-day trial"*).
- **Enterprise**: Solid dark surface or neutral card, contact sales CTA (*"Talk to sales"*).

### 3. Price Display Formatting
- Big bold price numeral (`3.5rem` font size) + billing cadence label (`/month billed annually` in smaller muted text).
- Always include `$0` or `Free` tier explicitly if available.

### 4. Feature Checklist Consistency
- Group bullet points with green checkmark icons (`✓`).
- Explicitly list features included vs excluded (using muted dashed icons or opacity for missing features).

---

## 🤖 LLM-Specific Traps

1. **Jittering Price Numeral Transitions**: Price numbers shifting layout width when toggling monthly/annual billing. Use `font-variant-numeric: tabular-nums`.
2. **Identical Visual Treatment**: Making all 3 pricing tiers look identical, preventing users from spotting the recommended plan.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `frontend-reviewer` · `ui-ux-auditor`**

### ✅ Pre-Flight Self-Audit

```
✅ Is the "Most Popular / Pro" tier visually distinct with primary CTA styling?
✅ Is `tabular-nums` applied to price numerals to prevent toggle layout shifts?
✅ Is the Annual discount savings badge clearly visible next to the billing toggle?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
