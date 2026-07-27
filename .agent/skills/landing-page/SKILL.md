---
name: landing-page
description: High-converting landing page structure, hero section layout variance, CTA hierarchy, visual pacing, feature grid storytelling, and social proof placement.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: Landing Page Architecture & Conversion
  tier: pro
  co-requires: [compact-landing, company-logos, pricing-page, frontend-design]
  trigger-signals:
    strong: [landing-page, hero section, CTA hierarchy, conversion landing page, SaaS landing page, feature grid storytelling]
    weak: [homepage design, marketing page]
---

# Landing Page — Conversion Architecture & Visual Pacing

Build high-converting, visually stunning landing pages that guide visitors from curiosity to conversion.

---

## The 6-Section Landing Page Blueprint

```
1. Navigation Header
   - Sticky blur backdrop, clear logo, 3-4 nav links, primary CTA button on top-right.

2. Hero Section (Above the Fold)
   - Category Pill / Announcement Badge (top)
   - High-Impact H1 Headline (max 8 words, text-wrap: balance)
   - Subtitle (max 2 lines, high legibility)
   - Dual CTA Buttons: Primary (solid accent) + Secondary (ghost / watch demo)
   - Interactive Product Preview / App Frame (centered below CTAs)

3. Social Proof Row
   - Monochromatic company logo bar or customer rating badge immediately below hero.

4. Feature Value Sections (Alternating Rhythm)
   - 3-column feature grid OR alternating left-text / right-visual sections.
   - Interactive micro-demos or high-resolution app screenshots over static icons.

5. Testimonials & Case Studies
   - Real customer quote cards with avatar, name, title, and verified metric ("Boosted retention by 42%").

6. Final Call to Action & Footer
   - Prominent conversion card banner + comprehensive 4-column footer link map.
```

---

## Hero Layout Variance Models

Avoid standard left-text / right-image templates on every project. Choose based on product type:

- **Model A: Centered Stacked (Best for Developer Tools & SaaS)**
  - Centered Pill -> Centered H1 -> Centered Subtitle -> Centered Dual CTA -> Full-width app preview mockup below.
- **Model B: Asymmetric Split (Best for Complex B2B & Mobile Apps)**
  - 60% Left column (Heading, bullets, CTA) + 40% Right column (Interactive phone frame or live code preview).
- **Model C: Full-Bleed Canvas (Best for Creative & AI Tools)**
  - Full-screen canvas visual background with floating frosted-glass prompt bar and primary CTA.

---

## 🤖 LLM-Specific Traps

1. **Standard Generic Left-Text / Right-Image Every Time**: Re-using the exact same layout template for every marketing page request.
2. **Multiple Equal Primary Buttons**: Displaying 3 solid colored buttons together, creating CTA confusion.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `frontend-reviewer` · `ui-ux-auditor`**

### ✅ Pre-Flight Self-Audit

```
✅ Is there a single, unambiguous primary CTA button above the fold?
✅ Is heading text balanced with `text-wrap: balance`?
✅ Is social proof placed immediately following the hero section?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
