---
name: progressive-blur
description: Smooth progressive backdrop blurs, depth overlays, and modern glassmorphism using CSS mask-image and multi-layered backdrop filters without GPU performance drops.
version: 4.0.0
last-updated: 2026-09-07
skills:
  - 60fps-animation
  - better-colors
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Progressive Blur — Multi-Layered Glassmorphism & Depth

---

## Mandatory Pre-Flight Context Inspection

Before engineering glassmorphism or backdrop blurs, you MUST inspect:

1. Vendor prefixes → Enforce `-webkit-backdrop-filter` alongside `backdrop-filter` for Safari support
2. GPU Protection Rule (Section 70) → Strictly prohibit animating `backdrop-filter: blur()` radius; animate `opacity` of static blurred pseudo-elements instead
3. Masked Blur Gradient layers (Section 25) → Blend multi-step blur layers with linear gradient masks to avoid harsh edge cutoffs

Architect high-performance, progressive backdrop blurs and frosted glass interfaces that feel tactile and fluid.


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Smooth progressive backdrop blurs, depth overlays, and modern glassmorphism using CSS mask-image and multi-layered backdrop filters without GPU performance drops..
- **DO NOT activate when:** The task falls strictly outside progressive-blur domain or belongs to a different dedicated specialist.

---

## 3 Progressive Blur Techniques

### 1. Multi-Step Masked Progressive Blur

To prevent harsh edge cutoffs in blurred headers or footers, blend 4 progressive blur layers using linear gradient masks:

```css
.progressive-blur-header {
  position: sticky;
  top: 0;
  z-index: 40;
  pointer-events: none;
}

.blur-layer-1 {
  backdrop-filter: blur(2px);
  mask: linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 25%);
}

.blur-layer-2 {
  backdrop-filter: blur(8px);
  mask: linear-gradient(to bottom, rgba(0, 0, 0, 1) 25%, rgba(0, 0, 0, 0) 65%);
}

.blur-layer-3 {
  backdrop-filter: blur(16px);
  mask: linear-gradient(to bottom, rgba(0, 0, 0, 1) 65%, rgba(0, 0, 0, 1) 100%);
}
```

### 2. Glass Card Depth Recipe

```css
.glass-card {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.08);
}

@media (prefers-color-scheme: dark) {
  .glass-card {
    background: rgba(18, 18, 20, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  }
}
```

### 3. GPU Hardware Acceleration Protection

Backdrop blurs can cause frame drops if animated directly.

- **Rule**: Never animate `backdrop-filter: blur()` properties during scroll or transitions. Animate `opacity` of a static blurred pseudo-element instead!

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
