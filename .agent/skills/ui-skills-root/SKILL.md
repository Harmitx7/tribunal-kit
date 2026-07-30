---
name: ui-skills-root
description: Master router skill for design engineering and UI craft. Use when the user needs UI help and you must route by topic, stack, intent, or design discipline to the smallest useful set of UI skills.
version: 3.0.0
last-updated: 2026-07-30
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

---

## Intent-Based Skill Routing Matrix

When a user asks for UI assistance, identify their core **intent** and dispatch the appropriate skills:

| Intent / Goal | Primary Skill | Secondary / Supporting Skills |
| --- | --- | --- |
| **Fast cleanup of ugly/cluttered UI** | `baseline-ui` | `better-ui`, `polish` |
| **Production-grade design engineering & micro-details** | `better-ui` | `impeccable`, `frontend-design` |
| **Extract design language & create DESIGN.md** | `create-design-md` | `extract-design-system`, `frontend-design` |
| **Audit & fix HTML / ARIA accessibility (WCAG)** | `fixing-accessibility` | `audit-and-fix`, `web-accessibility-auditor` |
| **Fix animation jank & 60/120fps performance** | `fixing-motion-performance` | `60fps-animation`, `gsap-performance` |
| **Evidence-based UI audit & implementation planning** | `improve-ui` | `better-ui`, `baseline-ui` |
| **OKLCH color system, contrast & P3 gamut** | `better-colors` | `colorize`, `better-ui` |
| **Web typography, font scales, tabular numbers** | `better-typography` | `typeset`, `better-ui` |
| **Apple-grade fluid springs, translucency & depth** | `apple-design` | `emil-design-eng`, `soft-skill` |
| **Make a bland UI stand out / add punch** | `bolder` | `delight`, `colorize` |
| **Tone down noisy or loud designs** | `quieter` | `distill`, `swiss-design` |
| **Simplify complex / cluttered interface** | `distill` | `clarify`, `quieter` |
| **Add subtle micro-interactions & delight** | `delight` | `whimsy-injector`, `micro-interaction` |
| **Final pre-ship quality & alignment pass** | `polish` | `harden`, `fixing-accessibility` |
| **Make UI resilient (errors, empty states, i18n)** | `harden` | `web-accessibility-auditor` |
| **UX evaluation & scoring** | `critique` | `ui-ux-researcher` |
| **Improve microcopy & messaging clarity** | `clarify` | `shape` |
| **Pre-code feature UX planning** | `shape` | `brainstorming`, `appflow-wireframe` |
| **Build unstyled accessible UI primitives** | `build-primitive` | `fixing-accessibility` |
| **Responsive & container-query adaptation** | `adapt` | `mobile-design` |
| **Depth, progressive blur, glassmorphism** | `progressive-blur` | `beautiful-shadows` |
| **60fps animation performance audit** | `60fps-animation` | `fixing-motion-performance` |
| **Tiered reduced-motion (a11y)** | `accessible-animation` | `fixing-accessibility` |
| **Page & route transitions (View Transitions)** | `page-transition-animation` | `framer-motion-expert` |
| **Scroll-driven motion & storytelling** | `animation-on-scroll` | `gsap-scrolltrigger` |
| **Cohesive animation token system** | `animation-systems` | `motion-engineering` |
| **Lottie & dotLottie vector animations** | `lottie-animation` | `text-to-lottie` |
| **SVG path morphing & stroke draw-on** | `svg-animation` | `morphing-icons` |
| **Hardware-accelerated marquees** | `marquee-loop` | `60fps-animation` |
| **Spring physics vs easing decision** | `to-spring-or-not-to-spring` | `apple-design` |
| **Tactile Web Audio API sound feedback** | `sounds-on-the-web` | `delight` |
| **Technical SEO, metadata & OpenGraph** | `fixing-metadata` | `web-quality-audit` |
| **Lighthouse quality audit** | `web-quality-audit` | `performance-profiling` |
| **Landing page hierarchy & conversion** | `landing-page` | `compact-landing` |
| **Pricing tables & comparison matrices** | `pricing-page` | `frontend-design` |
| **Social proof, logo grids, trust rows** | `company-logos` | `baseline-ui` |

---

## 🤖 LLM-Specific Traps

1. **Skill Bloat:** Loading more than 3 skills at once for a single request. Pick the 1-2 highest precision skills.
2. **Ignoring Intent:** Applying animation skills when the user asked for simple layout structure.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

### ✅ Pre-Flight Self-Audit

```
✅ Did I select the most specific UI skill for the user's explicit intent?
✅ Am I respecting modern web design standards (CSS Variables, container queries, OKLCH)?
✅ Is the proposed UI accessible (WCAG 2.2 AA contrast, keyboard nav)?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

You MUST verify that selected UI skills are present in `.agent/skills/` and read their instructions before generating code.
