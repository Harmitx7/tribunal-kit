---
name: apple-design
description: Apple's approach to interface design and fluid, physical motion, translated for the web. Use when building or reviewing gesture-driven UI, spring animations, drag/swipe/sheet interactions, momentum and interruptible transitions, translucent materials and depth, typography (optical sizing, tracking, leading), reduced-motion, or the design foundations behind Apple-style interfaces.
version: 4.0.0
last-updated: 2026-09-07
skills:
  - soft-skill
  - emil-design-eng
  - 60fps-animation
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Apple Design — Fluid Motion, Physicality & Translucent Depth

---

## Mandatory Pre-Flight Context Inspection

Before engineering Apple-style UIs or gesture-driven components, you MUST inspect:

1. Interruptible Physics-Based Springs (Section 22) → Use physics springs (`stiffness: 300, damping: 24, mass: 0.8`) instead of fixed-duration CSS cubic-beziers
2. Translucent Backdrop Blur (Section 44) → Limit `backdrop-filter: blur(20px) saturate(180%)` strictly to sticky headers or modals to avoid GPU scroll jank
3. Optical Letter-Spacing (Section 72) → Apply inverse tracking (`-0.025em` for titles, `+0.015em` for small captions) based on SF Pro font scaling

Design engineering guidelines for bringing Apple's fluid, physical interface paradigms to modern web applications.


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Apple's approach to interface design and fluid, physical motion, translated for the web. Use when building or reviewing gesture-driven UI, spring animations, drag/swipe/sheet interactions, momentum and interruptible transitions, translucent materials and depth, typography (optical sizing, tracking, leading), reduced-motion, or the design foundations behind Apple-style interfaces..
- **DO NOT activate when:** The task falls strictly outside apple-design domain or belongs to a different dedicated specialist.

---

## 1. Physics-Based Spring Animations

Apple interfaces do NOT use fixed-duration cubic-beziers for interactive elements; they use **physics-based springs**.

- **Interruptibility**: Animations MUST be interruptible. If a user taps or drags mid-animation, the spring seamlessly absorbs current velocity without snapping to standard origin.
- **Spring Parameters**:
  - **Overdamped (Solid/Restrained)**: `mass: 1, stiffness: 200, damping: 25` (Modals, Sheets, Drawers)
  - **Snappy (Buttons/Toggles)**: `mass: 0.5, stiffness: 350, damping: 20` (Pills, Switches, Keypad)
  - **Bouncy (Micro-delight)**: `mass: 0.8, stiffness: 400, damping: 15` (Badges, Tooltips, Success Checkmarks)

```javascript
// Framer Motion / Motion React Spring Config
const appleSpring = {
  type: 'spring',
  stiffness: 300,
  damping: 24,
  mass: 0.8,
};
```

---

## 2. Translucent Materials & Multi-Layer Blur

Apple depth relies on subtle, multi-layered backdrop blur and border highlights:

```css
.apple-glass-panel {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow:
    0 1px 2px 0 rgba(0, 0, 0, 0.05),
    0 8px 24px -4px rgba(0, 0, 0, 0.08);
}

@media (prefers-color-scheme: dark) {
  .apple-glass-panel {
    background: rgba(26, 26, 32, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow:
      0 1px 2px 0 rgba(0, 0, 0, 0.2),
      0 12px 32px -8px rgba(0, 0, 0, 0.4);
  }
}
```

---

## 3. Optical Typography & Dynamic Tracking

- **Optical Letter-Spacing (SF Pro Standard)**: Larger titles require tighter tracking (`-0.025em`), while caption text requires positive tracking (`+0.015em`).
- **Dynamic Line Heights**: `1.1` for large titles, `1.4` to `1.5` for body text.

---

## Anti-Slop Table

| Anti-Pattern                  | Apple Design Solution                                         | Rationale                                       |
| ----------------------------- | ------------------------------------------------------------- | ----------------------------------------------- |
| Rigid linear/ease transitions | Physics-based spring curves (`stiffness: 300, damping: 24`)   | Simulates real-world physical momentum          |
| Opaque static dropdowns       | Translucent backdrop blur panel (`blur(20px) saturate(180%)`) | Preserves spatial context beneath UI            |
| Sudden state jumps            | Interruptible velocity-preserving spring animations           | Prevents visual jarring during rapid user input |

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
