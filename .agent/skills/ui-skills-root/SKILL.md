---
name: ui-skills-root
description: Master router skill for design engineering and UI craft. Use when the user needs UI help and you must route by topic, stack, intent, or design discipline to the smallest useful set of UI skills.
version: 4.0.0
last-updated: 2026-09-07
skills:
  - ui-skill-packs
  - ui-reasoning-engine
  - baseline-ui
  - better-ui
  - impeccable
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# UI Skills Master Router

---

## Mandatory Pre-Flight Context Inspection

Before routing UI requests, you MUST inspect:

1. `package.json` / `DESIGN.md` → Identify tech stack (React, Next.js, Vue, Tailwind, CSS) and visual design language
2. Intent Routing Matrix (Section 2) → Select maximum 2-3 precise skills matching the user's primary UI goal
3. Skill pack bindings (`ui-skill-packs`) → Use consolidated packs for multi-component frontend builds

The master decision engine for routing user UI requests to the precise set of design-engineering skills.


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Master router skill for design engineering and UI craft. Use when the user needs UI help and you must route by topic, stack, intent, or design discipline to the smallest useful set of UI skills..
- **DO NOT activate when:** The task falls strictly outside ui-skills-root domain or belongs to a different dedicated specialist.

---

## Intent-Based Skill Routing Matrix

When a user asks for UI assistance, identify their core **intent** and dispatch the appropriate skills:

| Intent / Goal                                           | Primary Skill                | Secondary / Supporting Skills                |
| ------------------------------------------------------- | ---------------------------- | -------------------------------------------- |
| **Fast cleanup of ugly/cluttered UI**                   | `baseline-ui`                | `better-ui`, `polish`                        |
| **Production-grade design engineering & micro-details** | `better-ui`                  | `impeccable`, `frontend-design`              |
| **Extract design language & create DESIGN.md**          | `create-design-md`           | `extract-design-system`, `frontend-design`   |
| **Audit & fix HTML / ARIA accessibility (WCAG)**        | `fixing-accessibility`       | `audit-and-fix`, `web-accessibility-auditor` |
| **Fix animation jank & 60/120fps performance**          | `fixing-motion-performance`  | `60fps-animation`, `gsap-performance`        |
| **Evidence-based UI audit & implementation planning**   | `improve-ui`                 | `better-ui`, `baseline-ui`                   |
| **OKLCH color system, contrast & P3 gamut**             | `better-colors`              | `colorize`, `better-ui`                      |
| **Web typography, font scales, tabular numbers**        | `better-typography`          | `typeset`, `better-ui`                       |
| **Apple-grade fluid springs, translucency & depth**     | `apple-design`               | `emil-design-eng`, `soft-skill`              |
| **Make a bland UI stand out / add punch**               | `bolder`                     | `delight`, `colorize`                        |
| **Tone down noisy or loud designs**                     | `quieter`                    | `distill`, `swiss-design`                    |
| **Simplify complex / cluttered interface**              | `distill`                    | `clarify`, `quieter`                         |
| **Add subtle micro-interactions & delight**             | `delight`                    | `whimsy-injector`, `micro-interaction`       |
| **Final pre-ship quality & alignment pass**             | `polish`                     | `harden`, `fixing-accessibility`             |
| **Make UI resilient (errors, empty states, i18n)**      | `harden`                     | `web-accessibility-auditor`                  |
| **UX evaluation & scoring**                             | `critique`                   | `ui-ux-researcher`                           |
| **Improve microcopy & messaging clarity**               | `clarify`                    | `shape`                                      |
| **Pre-code feature UX planning**                        | `shape`                      | `brainstorming`, `appflow-wireframe`         |
| **Build unstyled accessible UI primitives**             | `build-primitive`            | `fixing-accessibility`                       |
| **Responsive & container-query adaptation**             | `adapt`                      | `mobile-design`                              |
| **Depth, progressive blur, glassmorphism**              | `progressive-blur`           | `beautiful-shadows`                          |
| **60fps animation performance audit**                   | `60fps-animation`            | `fixing-motion-performance`                  |
| **Tiered reduced-motion (a11y)**                        | `accessible-animation`       | `fixing-accessibility`                       |
| **Page & route transitions (View Transitions)**         | `page-transition-animation`  | `framer-motion-expert`                       |
| **Scroll-driven motion & storytelling**                 | `animation-on-scroll`        | `gsap-scrolltrigger`                         |
| **Cohesive animation token system**                     | `animation-systems`          | `motion-engineering`                         |
| **Lottie & dotLottie vector animations**                | `lottie-animation`           | `text-to-lottie`                             |
| **SVG path morphing & stroke draw-on**                  | `svg-animation`              | `morphing-icons`                             |
| **Hardware-accelerated marquees**                       | `marquee-loop`               | `60fps-animation`                            |
| **Spring physics vs easing decision**                   | `to-spring-or-not-to-spring` | `apple-design`                               |
| **Tactile Web Audio API sound feedback**                | `sounds-on-the-web`          | `delight`                                    |
| **Technical SEO, metadata & OpenGraph**                 | `fixing-metadata`            | `web-quality-audit`                          |
| **Lighthouse quality audit**                            | `web-quality-audit`          | `performance-profiling`                      |
| **Landing page hierarchy & conversion**                 | `landing-page`               | `compact-landing`                            |
| **Pricing tables & comparison matrices**                | `pricing-page`               | `frontend-design`                            |
| **Social proof, logo grids, trust rows**                | `company-logos`              | `baseline-ui`                                |

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
