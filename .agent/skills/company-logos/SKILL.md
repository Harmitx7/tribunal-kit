---
name: company-logos
description: Social proof rows, logo grids, customer carousels, and trust badges layout rules for balanced visual weight and responsive alignment.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: Visual Layout & Social Proof
  tier: pro
  co-requires: [baseline-ui, landing-page]
  trigger-signals:
    strong: [company-logos, logo grid, social proof row, trust badges, customer logos, logo carousel]
    weak: [logos layout, client logos]
---

# Company Logos — Social Proof & Trust Grids

Architect balanced, optically aligned logo rows and trust grids that communicate credibility without visual clutter.

---

## 4 Logo Layout Rules

### 1. Optical Weight Normalization
Logos vary wildly in aspect ratio (e.g. square logos vs wide wordmarks).
- **Rule**: Set a maximum bounding box (`max-height: 28px`, `max-width: 120px`) and use `object-fit: contain` with `filter: grayscale(100%) opacity(0.7)`.
- On hover, transition `opacity(1)` and remove grayscale smoothly over `200ms`.

### 2. Monochromatic Harmonization
- Never display multi-colored corporate logos together—they create visual chaos.
- Render all logos in monochromatic SVG fill (`fill="currentColor"`) matching `--text-muted` or `--foreground-muted`.

### 3. Responsive Flex Grid
```css
.logo-trust-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 2rem 3.5rem; /* Row gap 2rem, Column gap 3.5rem */
}
```

### 4. Seamless Ticker Marquee (Optional)
- For 8+ logos, use a hardware-accelerated CSS marquee animation with duplicate items for seamless continuous looping and `animation-play-state: paused` on hover.

---

## 🤖 LLM-Specific Traps

1. **Unfiltered Raw Logos**: Rendering original multi-colored SVG logos next to each other, creating a messy mismatched visual strip.
2. **Missing Grayscale / Opacity**: Displaying bright saturated company logos that steal attention away from the hero CTA.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `frontend-reviewer`**

### ✅ Pre-Flight Self-Audit

```
✅ Are all logos converted to monochromatic `currentColor` or uniform grayscale?
✅ Are logo heights normalized optically (`max-height: 28px - 32px`)?
✅ Is generous gap spacing (`2.5rem` - `4rem`) provided between brand marks?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
