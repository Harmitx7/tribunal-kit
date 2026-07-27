---
name: gpt-taste
description: High-agency UX/UI skill with strict layout variance, typography, and GSAP motion engineering constraints for superior visual judgment.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: High-Agency Aesthetic Judgment
  tier: pro
  co-requires: [taste-skill, better-ui, frontend-design]
  trigger-signals:
    strong: [gpt-taste, high agency UI, visual refinement, layout variance, superior aesthetic judgment]
    weak: [aesthetic UI, refined visual]
---

# GPT Taste — High-Agency Visual Refinement & Layout Variance

Inject high-agency visual judgment and layout variance into AI-generated interfaces.

---

## 4 High-Agency Visual Constraints

### 1. Structural Layout Variance
Never use standard symmetrical layouts by default. Vary structural axes across sections:
- **Hero**: Asymmetric 60/40 split or left-aligned stacked text with offset app preview frame.
- **Features**: Alternating 2-column image/text rhythm or horizontal scroll cards.
- **CTA**: Single full-width card with progressive backdrop blur overlay.

### 2. OKLCH Perceptual Palette Generation
Always generate color schemes in OKLCH:
- Background: `oklch(0.98 0.005 240)`
- Foreground: `oklch(0.18 0.01 240)`
- Accent: `oklch(0.62 0.22 250)`

### 3. GSAP / Motion Engineering Integration
When animation is requested, use explicit GSAP timelines with custom easing curves (`power3.out`, `expo.out`), avoiding default linear transitions.

### 4. Zero Output Truncation
Never output placeholder `// TODO: add remaining items` comments in UI code. Generate full, production-ready JSX/CSS markup.

---

## 🤖 LLM-Specific Traps

1. **Truncated Code Outputs**: Outputting incomplete code snippets or placeholder comments.
2. **Symmetrical Grid Boredom**: Using 3 identical square cards side-by-side without visual hierarchy differentiation.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `frontend-reviewer` · `ui-ux-auditor`**

### ✅ Pre-Flight Self-Audit

```
✅ Are code outputs 100% complete without placeholder TODOs?
✅ Is structural layout varied across different page sections?
✅ Are colors declared via OKLCH variables?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
