---
name: soft-skill
description: High-end visual design guidance for premium typography, spacing, depth, and animation systems.
version: 4.0.0
last-updated: 2026-09-07
skills:
  - taste-skill
  - progressive-blur
  - impeccable
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Soft Skill — High-End Luxury Visual Design & Depth

---

## Mandatory Pre-Flight Context Inspection

Before engineering luxury or soft-depth UI interfaces, you MUST inspect:

1. Multi-Layer Shadow Recipe (Section 25) → Blend low-opacity multi-layered ambient shadows ($\le 6\%$ opacity per layer) instead of heavy single drop shadows
2. Spatial Cadence (Section 37) → Increase container padding by $1.5\times$ ($\ge 24\text{px}$) to provide generous negative space
3. Color Harmonies (Section 40) → Use quiet, low-chroma monochromatic OKLCH palettes for background and typography

Craft high-end, luxury interfaces featuring soft depth, gentle surface transitions, quiet typography, and tactile spatial rhythm.


## Activation Boundaries

- **Activate when:** Operating in tasks requiring High-end visual design guidance for premium typography, spacing, depth, and animation systems..
- **DO NOT activate when:** The task falls strictly outside soft-skill domain or belongs to a different dedicated specialist.

---

## 4 Soft Design Rules

### 1. Multi-Layer Soft Ambient Depth

- Avoid harsh drop-shadows. Use low-opacity multi-layered ambient lighting shadows:

```css
.soft-depth-card {
  background: var(--surface);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.02),
    0 8px 16px rgba(0, 0, 0, 0.04),
    0 24px 48px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.06);
}
```

### 2. Generous Negative Space Cadence

- Increase component padding by 1.5x (e.g. `24px` -> `36px`, `32px` -> `48px`). Generous negative space is the ultimate indicator of luxury software.

### 3. Subdued Monochrome Color Harmonies

- Use quiet, low-chroma monochromatic palettes (`oklch(0.97 0.005 240)` background with `oklch(0.22 0.01 240)` primary text).

### 4. Fluid, Low-Velocity Transitions

- Transition speeds should be gentle ($\approx 250\text{ms}$) with strong ease-out curves (`cubic-bezier(0.16, 1, 0.3, 1)`).

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
