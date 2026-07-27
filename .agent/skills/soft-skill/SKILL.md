---
name: soft-skill
description: High-end visual design guidance for premium typography, spacing, depth, and animation systems.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: Luxury Visual Design & Soft Depth
  tier: pro
  co-requires: [taste-skill, progressive-blur, impeccable]
  trigger-signals:
    strong: [soft-skill, high end visual design, luxury depth, soft UI, elegant spacing system, soft shadow UI]
    weak: [elegant UI, soft style]
---

# Soft Skill — High-End Luxury Visual Design & Depth

Craft high-end, luxury interfaces featuring soft depth, gentle surface transitions, quiet typography, and tactile spatial rhythm.

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

## 🤖 LLM-Specific Traps

1. **Muddy Dark Shadows**: Using heavy `rgba(0,0,0,0.5)` drop shadows on light surfaces.
2. **Cramped Containers**: Packing text elements tightly inside small containers with minimal padding.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `frontend-reviewer` · `ui-ux-auditor`**

### ✅ Pre-Flight Self-Audit

```
✅ Are drop shadows multi-layered with opacity under 6% per layer?
✅ Is container padding generous ($\ge 24\text{px}$)?
✅ Is color palette subdued and monochromatic?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
