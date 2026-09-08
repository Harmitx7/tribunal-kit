---
name: ui-skill-packs
description: Mandatory skill loading packs for UI generation. Consolidates 42+ individual UI skills into 3 tiered packs (Core Craft, Immersive & System, High-End Design) to guarantee non-generic, high-fidelity UI outputs.
version: 4.0.0
last-updated: 2026-09-07
skills:
  - taste-skill
  - better-colors
  - impeccable
  - micro-interaction
  - gpt-taste
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# UI Skill Packs — Master Design Engineering Bundles

---

## Mandatory Pre-Flight Context Inspection

Before generating UI code, you MUST inspect:

1. `package.json` / `tailwind.config.ts` / `index.css` → Check UI stack (Tailwind v4, Vanilla CSS, OKLCH, Framer Motion)
2. `DESIGN.md` / color token definitions → Verify palette rules and dark mode contrast variables
3. Active UI component target → Assign Pack 1 (Core UI), Pack 2 (System Micro-Interactions), or Pack 3 (Immersive Landing)


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Mandatory skill loading packs for UI generation. Consolidates 42+ individual UI skills into 3 tiered packs (Core Craft, Immersive & System, High-End Design) to guarantee non-generic, high-fidelity UI outputs..
- **DO NOT activate when:** The task falls strictly outside ui-skill-packs domain or belongs to a different dedicated specialist.

## 1. Pack Definitions

When generating UI code, the agent MUST load the appropriate UI Skill Pack based on the complexity level of the requested interface:

### Pack 1: Core UI Craft (Standard Components & Forms)

- **Skills Included:** `taste-skill`, `better-ui`, `better-colors`, `typeset`, `build-primitive`
- **Use For:** Buttons, cards, form controls, modals, tables, simple dashboards.
- **Enforces:** OKLCH colors, 8pt spacing grid, fluid typography, explicit interactive states.

### Pack 2: System & Micro-Interactions (Dynamic Web Apps)

- **Skills Included:** `impeccable`, `micro-interaction`, `framer-motion-expert`, `transitions-dev`, `delight`
- **Use For:** Interactive web apps, complex dashboards, multi-step flows, animated components.
- **Enforces:** Micro-animations, spring easings, tactile click/hover feedback, clean state transitions.

### Pack 3: High-End Immersive & Landing (Full Page / Showcase)

- **Skills Included:** `gpt-taste`, `swiss-design`, `compact-landing`, `masked-reveal`, `marquee-loop`, `progressive-blur`
- **Use For:** Landing pages, hero sections, marketing sites, showcase portfolios.
- **Enforces:** Typographic hierarchy, asymmetric visual rhythm, noise grain overlays, luminous borders.

---

## 2. Mandatory Pre-Execution Binding

Before generating any frontend component, identify the required pack and declare loaded skills:

```
Loaded UI Skill Pack: [Pack 1 | Pack 2 | Pack 3]
Binding skills: taste-skill, better-colors, micro-interaction, impeccable...
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
