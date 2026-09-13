---
name: ui-skills-root
description: Use when Master router skill for design engineering and UI craft. Use when the user needs UI help and you must route by topic, stack, intent, or design discipline to the smallest useful set of UI skills.
version: 5.0.0
last-updated: 2026-09-13
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

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `ui-skills-root` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Master router skill for design engineering and UI craft. Use when the user needs UI help and you must route by topic, stack, intent, or design discipline to the smallest useful set of UI skills.
- **DO NOT activate when:** The task falls outside the `ui-skills-root` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass | Phase | Core Action |
|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. |
| **Pass 2** | **Plan** | Decompose the task into smallest logical steps; map dependencies and required tool calls. |
| **Pass 3** | **Execute** | Implement the solution with production-grade craft, zero placeholders, and strict typing. |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. |
| **Pass 5** | **Attack** | Perform an adversarial review searching for edge-case failures, race conditions, and traps. |
| **Pass 6** | **Improve** | Eliminate discovered friction, optimize performance, and harden error boundaries. |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---


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

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Mitigation Strategy |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Uncontrolled Re-render Loop** | Mutating state inside render bodies or omitting hook dependencies | Wrap effects with explicit deps and isolate reactive derivations in useMemo |
| **Accessibility Neglect** | Interactive <div> without role="button", tabIndex, or onKeyDown | Use semantic <button> or provide ARIA role, keyboard handlers, and focus ring |
| **Layout Shift Flash** | Images/dynamic content without aspect-ratio or explicit dimensions | Enforce aspect-ratio or skeleton placeholders to guarantee zero CLS |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `frontend-reviewer` · `type-safety` · `ui-ux-auditor` · `complexity-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Are all component props strictly typed with zero implicit "any"?
✅ Are responsive breakpoints, fluid typography, and optical balance verified?
✅ Is accessibility (ARIA labels, keyboard focus, contrast) validated?
✅ Are re-renders minimized and state lifecycles cleanly separated?
✅ Did I verify all imported UI components and icon sets actually exist?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
