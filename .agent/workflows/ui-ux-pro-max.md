---
description: Plan and implement cutting-edge advanced UI/UX. Uses the UI Reasoning Engine to structure layout and styling, and routes through the dedicated `/tribunal-ui` reviewer pipeline.
tools: Read, Grep, Glob, Bash, Edit, Write
version: 3.0.0
last-updated: 2026-07-30
required-skills:
  - ui-reasoning-engine
  - product-aware-heuristics
  - ui-ux-pro-max
  - frontend-design
  - web-design-guidelines
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/auto_preview.js
---

# /ui-ux-pro-max — Advanced UI/UX Design

$ARGUMENTS

---

## Mandatory Pre-Flight Context Inspection

Before designing or implementing advanced UI/UX layouts, you MUST inspect:
1. Active Design Tokens & System (`DESIGN.md`, CSS custom properties) → Verify OKLCH color palettes, typography scale, and spacing grid
2. UI Reasoning Engine 16-Step Pipeline (`.agent/skills/ui-reasoning-engine/SKILL.md`) → Structure component layout, micro-interactions, and accessibility before coding
3. Anti-Generic Aesthetic Rule → Ban plain purple/violet AI gradients and stock hero templates; enforce bespoke visual hierarchy and tactile micro-interactions

---

## When to Use /ui-ux-pro-max

| Use `/ui-ux-pro-max` when... | Use instead when... |
| :--- | :--- |
| Building a visually distinctive interface | Functional-only component → `/generate` |
| Design quality is the primary goal | Fast page needed → `/enhance` |
| Creating from a design brief | Bug fix in UI → `/debug` |
| Mobile + web parity required | |

---

## Phase 1 — Design Intent & Product Aware Reasoning (Mandatory)

Answer these before writing any code (using the `ui-reasoning-engine` skill):
1. **Who is the user?** (Casual consumer vs expert operator).
2. **What is the product category?** (SaaS, DevTool, AI Interface, Landing, Fintech).
3. **What is the visual direction?** (Brutalist, Editorial, Soft Minimal, Dark Luxury, Swiss).
4. **What is the primary user goal?** (Optimize the layout and click paths for this action).
5. **What are the accessibility requirements?** (Focus paths, target size, Lc contrast).

Write the **🧠 UI Reasoning Engine Trace** in your response as a collapsed markdown block before the code.

---

## Phase 2 — Visual Identity & Design Tokens

Every interface must use custom variables defined in `DESIGN.md` and `design-tokens.json`:
*   ❌ **Banned Clichés:** Purple/violet accents, mesh gradients, glassmorphism overuse, default library themes.
*   ✅ **Intentional Styling:** Dynamic OKLCH colors, 8px grid alignment, variable font sizes with CSS `clamp()`, and 1px luminous borders.

---

## Phase 3 — Interaction States & Micro-interactions

Ensure every interactive element has styling defined for:
*   `hover`, `focus-visible`, `active`/`pressed`, and `disabled` states.
*   Confirm clicks with spring scale-down transitions (`active:scale-[0.97]`).
*   Trap keyboard focus within modals/dialogs and return it to the trigger on close.

---

## Phase 4 — Swarm Implementation & UI Review Pipeline

1. **Layout Design:** Create the structural grid and semantic accessibility tree.
2. **Token Application:** Apply Tailwind classes or style blocks using variables.
3. **Motion Integration:** Add GSAP or Framer Motion transitions (keeping motion <300ms, respecting reduced motion).
4. **Tribunal Review Gate:** Route the generated component through `/tribunal-ui` for parallel verification.

---

## Usage Examples

```
/ui-ux-pro-max design a SaaS dashboard for an analytics platform
/ui-ux-pro-max redesign the checkout flow with better conversion UX
/ui-ux-pro-max create an onboarding flow for a developer tool
/ui-ux-pro-max design the landing page hero section with a distinctive visual style
```

---

## After /ui-ux-pro-max — Next Steps

| Outcome | Next Command |
| :--- | :--- |
| Design complete | → `/preview start` to see it in action |
| Reviewers reject with fixes | → Apply fixes, then run `/tribunal-ui` again |
| Performance concerns | → `/performance-benchmarker` for Lighthouse/CWV |
