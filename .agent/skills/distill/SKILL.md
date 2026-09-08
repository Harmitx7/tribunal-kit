---
name: distill
description: Simplify noisy interfaces by removing non-essential visual and operational complexity. Use when a UI has too many options, crowded toolbars, redundant text, or unnecessary visual containers.
version: 4.0.0
last-updated: 2026-09-07
skills:
  - quieter
  - clarify
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Distill — UX Simplification & Decluttering

---

## Mandatory Pre-Flight Context Inspection

Before decluttering UI layouts, you MUST inspect:

1. Active screen components → Identify core primary user task and secondary/tertiary options
2. Container Reduction rules (Section 25) → Replace nested card containers and redundant borders with whitespace grid gaps
3. Progressive Disclosure patterns (Section 30) → Move advanced parameters into collapsible accordions or popovers

Systematically strip away visual clutter, redundant controls, and cognitive friction to reveal the core user task.


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Simplify noisy interfaces by removing non-essential visual and operational complexity. Use when a UI has too many options, crowded toolbars, redundant text, or unnecessary visual containers..
- **DO NOT activate when:** The task falls strictly outside distill domain or belongs to a different dedicated specialist.

---

## The 4 Distillation Steps

### 1. Identify & Remove Visual Noise

- **Container Reduction**: Eliminate unnecessary nested cards, boxes inside boxes, and decorative borders. Use whitespace instead of lines to separate content blocks.
- **Icon Pruning**: Remove decorative icons that restate obvious text labels (e.g. an envelope icon next to a button that clearly says "Send Email").

### 2. Collapse Secondary Actions

- **Primary vs Overflow**: Keep only 1 primary action button and max 1 secondary button visible. Hide tertiary actions inside an overflow dropdown (`...` menu).
- **Progressive Disclosure**: Hide advanced settings or non-essential controls behind an "Advanced Settings" accordion or popover.

### 3. Trim Copy & Microcopy

- **Cut Conversational Filler**: Strip verbose instructions. Change _"Please fill out the form below to register your account"_ to _"Create account"_.
- **Shorten Button Labels**: Change _"Click here to update your profile settings"_ to _"Save profile"_.

### 4. Group Related Fields

- **Consolidate Form Inputs**: Merge separate "First Name" and "Last Name" fields into "Full Name" if separate values aren't strictly required. Merge city/state/zip into single address lookup where possible.

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
