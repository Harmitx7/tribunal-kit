---
name: compact-landing
description: Build compact, premium landing pages with clear CTA hierarchy, quiet typography, restrained visual noise, and high conversion flow.
version: 4.0.0
last-updated: 2026-09-07
skills:
  - landing-page
  - quieter
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Compact Landing — Premium Minimalist Landing Pages

---

## Mandatory Pre-Flight Context Inspection

Before engineering compact landing pages, you MUST inspect:

1. Viewport Fit (Section 24) → Fit hero, preview, and primary CTA inside a single 1080p desktop viewport without initial scrolling
2. Section Limit (Section 35) → Limit total page structure to max 4 tight sections (Hero, Social Proof, 3-Benefit Grid, Footer Card)
3. Typography Restraint (Section 30) → Cap display font sizes at `clamp(1.75rem, 4vw, 2.75rem)` and apply `text-wrap: balance`

Build tight, ultra-focused, high-converting landing pages that deliver value quickly without unnecessary multi-scroll filler.


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Build compact, premium landing pages with clear CTA hierarchy, quiet typography, restrained visual noise, and high conversion flow..
- **DO NOT activate when:** The task falls strictly outside compact-landing domain or belongs to a different dedicated specialist.

---

## 4 Compact Landing Rules

### 1. The Single Viewport Value Pitch

- Above-the-fold content must answer 3 questions instantly within 1 single screen viewport:
  1. _What is it?_ (Clear, un-hypey headline + subhead)
  2. _What does it look like?_ (Crisp UI screenshot or interactive preview component)
  3. _How do I get it?_ (Unambiguous primary CTA input/button)

### 2. Quiet Typographic Hierarchy

- Use subdued monochrome typography (`oklch(0.95 0.005 240)` background with `oklch(0.20 0.01 240)` body copy).
- Keep display font sizes restrained (`clamp(1.75rem, 4vw, 2.75rem)`) rather than giant 5rem text blocks.

### 3. Tight Spatial Grid

- Limit total page section count to max 4 sections:
  1. Hero + Primary CTA + Product Preview
  2. Social Proof / Logo Bar
  3. Feature Grid (3 core benefits max)
  4. Conversion Footer Card

### 4. Zero Unnecessary Visual Noise

- Omit decorative background shapes, floating 3D spheres, and rainbow gradients. Let contrast and typography drive visual quality.

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
