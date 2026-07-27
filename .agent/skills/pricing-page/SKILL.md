---
name: pricing-page
description: SaaS pricing table architecture, billing cycle toggles (Monthly/Annual), feature comparison matrices, tier highlighting, and conversion optimization.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: Pricing Architecture & SaaS Conversion
  tier: pro
  co-requires: [landing-page, frontend-design]
  trigger-signals:
    strong: [pricing-page, pricing table, billing toggle, tier comparison, popular tier highlight, SaaS pricing]
    weak: [pricing UI, plan table]
---

# Pricing Page — SaaS Pricing Architecture & Comparison Grids

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
