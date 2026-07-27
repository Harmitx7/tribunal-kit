---
name: compact-landing
description: Build compact, premium landing pages with clear CTA hierarchy, quiet typography, restrained visual noise, and high conversion flow.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: Compact Landing Page & Minimalist UI
  tier: pro
  co-requires: [landing-page, quieter, baseline-ui]
  trigger-signals:
    strong: [compact-landing, compact landing page, quiet typography, minimal landing page, restrained UI, high-conversion compact]
    weak: [simple landing, compact page]
---

# Compact Landing — Premium Minimalist Landing Pages

Build tight, ultra-focused, high-converting landing pages that deliver value quickly without unnecessary multi-scroll filler.

---

## 4 Compact Landing Rules

### 1. The Single Viewport Value Pitch
- Above-the-fold content must answer 3 questions instantly within 1 single screen viewport:
  1. *What is it?* (Clear, un-hypey headline + subhead)
  2. *What does it look like?* (Crisp UI screenshot or interactive preview component)
  3. *How do I get it?* (Unambiguous primary CTA input/button)

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

## 🤖 LLM-Specific Traps

1. **Adding 10 Scroll Sections**: Padding out compact landing pages with generic boilerplate feature grids and stock FAQs when a tight 3-section layout was requested.
2. **Multiple Competing CTAs**: Adding 4 different buttons in the hero section. Keep 1 primary action button.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `frontend-reviewer` · `ui-ux-auditor`**

### ✅ Pre-Flight Self-Audit

```
✅ Does the hero section fit comfortably inside a 1080p desktop viewport without scrolling?
✅ Is heading font size restrained and balanced (`text-wrap: balance`)?
✅ Is the page limited to max 4 tight sections?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
