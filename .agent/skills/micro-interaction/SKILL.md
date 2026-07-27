---
name: micro-interaction
description: Detailed UI motion guidance for hover and press feedback, toggles, checkboxes, toasts, drawers, modals, list transitions, and shared-element interactions.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: Micro-Interactions & Component Tactility
  tier: pro
  co-requires: [delight, emil-design-eng, better-ui]
  trigger-signals:
    strong: [micro-interaction, button press feedback, toggle motion, checkbox animation, toast entrance, drawer interaction]
    weak: [interactive feedback, hover state animation]
---

# Micro-Interaction — Component Motion & Tactile Feedback

Craft responsive, physically grounded micro-interactions for everyday UI controls.

---

## 4 Micro-Interaction Recipes

### 1. Tactile Button Press
```css
.btn-tactile {
  transition: transform 120ms cubic-bezier(0.2, 0, 0, 1), box-shadow 120ms ease;
}
.btn-tactile:hover {
  transform: translateY(-1px);
}
.btn-tactile:active {
  transform: translateY(1px) scale(0.97);
}
```

### 2. Animated Toggle Switch
```css
.toggle-thumb {
  transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1); /* Subtle spring overshoot */
}
[data-state="checked"] .toggle-thumb {
  transform: translateX(20px);
}
```

### 3. Animated Checkbox Morph
Use an SVG path draw-on keyframe when checked:
```css
.checkbox-svg-path {
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
  transition: stroke-dashoffset 180ms ease-out;
}
[data-state="checked"] .checkbox-svg-path {
  stroke-dashoffset: 0;
}
```

### 4. Origin-Aware Popover / Dropdown
Popovers scale out from their trigger source using CSS variables:
```css
.popover-content {
  transform-origin: var(--radix-popover-content-transform-origin, center top);
  animation: popover-enter 160ms cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes popover-enter {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
```

---

## 🤖 LLM-Specific Traps

1. **Center Scaling Popovers**: Popovers springing out from the screen center instead of scaling from their trigger origin.
2. **Slow Micro-Interactions**: Setting button press or toggle transitions to 400ms, making the UI feel sluggish.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `frontend-reviewer` · `motion-reviewer`**

### ✅ Pre-Flight Self-Audit

```
✅ Are interactive component feedback durations under 180ms?
✅ Are popover/dropdown transform origins explicitly tied to their trigger?
✅ Is checkmark SVG stroke-dasharray used for crisp checkbox check animation?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
