---
name: distill
description: Simplify noisy interfaces by removing non-essential visual and operational complexity. Use when a UI has too many options, crowded toolbars, redundant text, or unnecessary visual containers.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: UX Simplification & Reduction
  tier: pro
  co-requires: [quieter, clarify, baseline-ui]
  trigger-signals:
    strong: [distill, simplify ui, declutter, remove complexity, streamline interface, too crowded]
    weak: [clean up, simplify options]
---

# Distill — UX Simplification & Decluttering

Systematically strip away visual clutter, redundant controls, and cognitive friction to reveal the core user task.

---

## The 4 Distillation Steps

### 1. Identify & Remove Visual Noise
- **Container Reduction**: Eliminate unnecessary nested cards, boxes inside boxes, and decorative borders. Use whitespace instead of lines to separate content blocks.
- **Icon Pruning**: Remove decorative icons that restate obvious text labels (e.g. an envelope icon next to a button that clearly says "Send Email").

### 2. Collapse Secondary Actions
- **Primary vs Overflow**: Keep only 1 primary action button and max 1 secondary button visible. Hide tertiary actions inside an overflow dropdown (`...` menu).
- **Progressive Disclosure**: Hide advanced settings or non-essential controls behind an "Advanced Settings" accordion or popover.

### 3. Trim Copy & Microcopy
- **Cut Conversational Filler**: Strip verbose instructions. Change *"Please fill out the form below to register your account"* to *"Create account"*.
- **Shorten Button Labels**: Change *"Click here to update your profile settings"* to *"Save profile"*.

### 4. Group Related Fields
- **Consolidate Form Inputs**: Merge separate "First Name" and "Last Name" fields into "Full Name" if separate values aren't strictly required. Merge city/state/zip into single address lookup where possible.

---

## 🤖 LLM-Specific Traps

1. **Hiding Essential Actions**: Removing actions that users need frequently, forcing extra clicks.
2. **Deleting Error Context**: Removing helpful inline validation messages while trimming copy.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `frontend-reviewer` · `ui-ux-auditor`**

### ✅ Pre-Flight Self-Audit

```
✅ Is the primary task front and center without distraction?
✅ Have secondary/tertiary options been cleanly collapsed or progressively disclosed?
✅ Is all microcopy concise, active, and direct?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
