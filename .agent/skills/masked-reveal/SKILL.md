---
name: masked-reveal
description: CSS clip-path, SVG masking, and layered entrance reveals for images, hero banners, and text blocks.
version: 4.0.0
last-updated: 2026-09-07
skills:
  - 60fps-animation
  - framer-motion-expert
  - motion-engineering
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Masked Reveal — Clip-Path & Layered Entrances

---

## Mandatory Pre-Flight Context Inspection

Before implementing clip-path or SVG mask reveals, you MUST inspect:

1. Target DOM elements → Enforce `overflow: hidden` on text line wrappers to prevent unmasked overflow artifacts
2. `clip-path: inset()` syntax (Section 26) → Prefer CSS `clip-path` over heavy SVG masks for linear curtain wipes
3. Transition Easing → Use custom ease-out curves (`cubic-bezier(0.16, 1, 0.3, 1)`) for smooth deceleration

Create editorial, high-end visual reveals using CSS `clip-path` and SVG masks.


## Activation Boundaries

- **Activate when:** Operating in tasks requiring CSS clip-path, SVG masking, and layered entrance reveals for images, hero banners, and text blocks..
- **DO NOT activate when:** The task falls strictly outside masked-reveal domain or belongs to a different dedicated specialist.

---

## 3 Masked Reveal Patterns

### 1. CSS `clip-path` Curtain Reveal

```css
@keyframes curtain-reveal {
  from {
    clip-path: inset(0 100% 0 0);
  }
  to {
    clip-path: inset(0 0 0 0);
  }
}

.reveal-image-curtain {
  animation: curtain-reveal 0.8s cubic-bezier(0.77, 0, 0.175, 1) forwards;
}
```

### 2. Radial Spotlight Clip Reveal

```css
@keyframes circle-expand {
  from {
    clip-path: circle(0% at 50% 50%);
  }
  to {
    clip-path: circle(150% at 50% 50%);
  }
}

.spotlight-reveal {
  animation: circle-expand 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
```

### 3. Masked Text Line Wipe (Editorial Typography)

Wrap text lines inside overflow-hidden wrappers and animate inner text lines upward:

```css
.text-line-wrapper {
  overflow: hidden;
}
.text-line-inner {
  transform: translateY(100%);
  transition: transform 600ms cubic-bezier(0.16, 1, 0.3, 1);
}
.text-line-wrapper.is-visible .text-line-inner {
  transform: translateY(0%);
}
```

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
