---
name: adapt
description: Adapt designs across breakpoints, devices, platform constraints, touch vs mouse input, and container queries. Use when making a UI responsive or optimizing for mobile/tablet.
version: 4.0.0
last-updated: 2026-09-07
skills:
  - mobile-design
  - building-native-ui
  - tailwind-patterns
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Adapt — Responsive Adaptation & Container Queries

---

## Mandatory Pre-Flight Context Inspection

Before engineering responsive layouts or cross-device UIs, you MUST inspect:

1. Container Queries (`@container`) over Viewport Media Queries (Section 24) → Adapt component layouts based on parent container width (`container-type: inline-size`)
2. Touch Target Sizing (Section 39) → Ensure interactive controls meet min `44x44px` target size on touch devices
3. Fluid Clamp Scaling (Section 45) → Use `clamp()` for smooth fluid typography and spacing without abrupt media query jumps

Architect UIs that adapt fluidly to screen dimensions, container boundaries, input devices (touch vs pointer), and orientation.


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Adapt designs across breakpoints, devices, platform constraints, touch vs mouse input, and container queries. Use when making a UI responsive or optimizing for mobile/tablet..
- **DO NOT activate when:** The task falls strictly outside adapt domain or belongs to a different dedicated specialist.

---

## 4 Adaptation Mechanics

### 1. Container Queries (`@container`) over Viewport Media Queries (`@media`)

- Components should adapt based on their parent container's width, NOT the global browser window size:

```css
.card-container {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .card-layout {
    display: grid;
    grid-template-columns: 120px 1fr;
  }
}
```

### 2. Touch Target Sizing (Min 44x44px)

- Interactive targets on mobile/touch interfaces MUST maintain a minimum tap target size of `44x44px` (or `48x48px` for Android), even if the visual icon is smaller (`16px`).

### 3. Drawer on Mobile -> Modal on Desktop

- Complex popovers or dialogs on mobile screens should render as bottom sheets (drawers) with drag-to-dismiss handles, automatically morphing into centered modals on desktop viewports ($\ge 768\text{px}$).

### 4. Fluid Typography & Spacing

- Use `clamp()` for fluid scaling without abrupt media query jumps:
  $$\text{FontSize} = \text{clamp}(1\text{rem}, 0.8\text{rem} + 1\text{vw}, 1.75\text{rem})$$

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
