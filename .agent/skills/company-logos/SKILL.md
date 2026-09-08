---
name: company-logos
description: Social proof rows, logo grids, customer carousels, and trust badges layout rules for balanced visual weight and responsive alignment.
version: 4.0.0
last-updated: 2026-09-07
skills:
  - baseline-ui
  - landing-page
  - marquee-loop
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Company Logos — Social Proof & Trust Grids

---

## Mandatory Pre-Flight Context Inspection

Before designing logo grids or trust rows, you MUST inspect:

1. Optical Weight Normalization rules (Section 24) → Enforce bounding box limits (`max-height: 28px`, `max-width: 120px`) with `object-fit: contain`
2. Monochromatic Harmonization rules (Section 29) → Render all logos in monochromatic SVG fill (`fill="currentColor"`) matching `--text-muted`
3. Hover States → Transition opacity to 100% smoothly over `200ms` on hover

Architect balanced, optically aligned logo rows and trust grids that communicate credibility without visual clutter.


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Social proof rows, logo grids, customer carousels, and trust badges layout rules for balanced visual weight and responsive alignment..
- **DO NOT activate when:** The task falls strictly outside company-logos domain or belongs to a different dedicated specialist.

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
