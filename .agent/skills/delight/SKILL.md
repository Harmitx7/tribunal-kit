---
name: delight
description: Inject micro-moments of delight, subtle surprise interactions, personality, and tactile feedback into user interfaces. Use when building success celebrations, copy-to-clipboard feedback, empty states, or playful UI elements.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: Micro-Delight & Interactive Polish
  tier: pro
  co-requires: [whimsy-injector, micro-interaction, emil-design-eng]
  trigger-signals:
    strong: [delight, micro-delight, make it playful, add personality, surprise animation, tactile feedback]
    weak: [sparkle, fun ui, success feedback]
---

# Delight — Micro-Moments of Tactile UI Polish

Elevate everyday digital interactions with subtle, memorable details that make software a joy to use.

---

## 5 Micro-Delight Patterns

### 1. The Morphing State Checkmark
- When clicking "Copy Link" or "Save", morph the button icon or label smoothly into a checkmark icon with a quick spring bounce (`scale(1.15) -> scale(1)` over `180ms`), holding for 1.5 seconds before morphing back.

### 2. Micro-Confetti & Particle Bursts
- On completing a key milestone (e.g. completing onboarding, submitting a project), trigger a lightweight 12-particle CSS/canvas burst anchored directly to the submit button.

### 3. Tactile Drag & Reorder Haptics
- When dragging list items, elevate the item with a slight tilt ($2^\circ$), drop shadow increase, and scale (`scale(1.02)`), giving a physical card feeling.

### 4. Playful Empty State Animations
- Transform boring zero-data states with subtle floating illustrations, witty microcopy, and a prominent primary action button.

### 5. Keyboard Shortcut Badges with Tooltips
- Display subtle keyboard shortcut hints (e.g. `⌘K` or `Ctrl+K`) inside inputs or hover tooltips that respond with a subtle keypress press animation when pressed.

---

## 🤖 LLM-Specific Traps

1. **Overdoing Delight on High-Frequency Actions**: Adding confetti bursts or long animations to actions users perform 50+ times a day. Keep high-frequency delight under 100ms and non-intrusive.
2. **Ignoring Accessibility**: Failing to check `prefers-reduced-motion` for particle effects or canvas animations.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `motion-reviewer` · `frontend-reviewer`**

### ✅ Pre-Flight Self-Audit

```
✅ Is the delight moment brief (< 300ms for motion, 1.5s total hold)?
✅ Does it respect `prefers-reduced-motion`?
✅ Is it restricted to occasional milestones or state confirmations?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
