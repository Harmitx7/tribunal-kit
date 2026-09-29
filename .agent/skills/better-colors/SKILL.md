---
name: better-colors
description: "Use when building, styling, optimizing, and auditing better colors components, responsive layouts, design systems, and frontend state."
version: 6.0.0
last-updated: 2026-09-29
skills:
  - better-ui
  - baseline-ui
  - colorize
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Better Colors — OKLCH & Modern Web Color Systems

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `better-colors` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).


## Activation Boundaries
- **Activate when:** Use when building, styling, optimizing, and auditing better colors components, responsive layouts, design systems, and frontend state.
- **DO NOT activate when:** The task falls outside the `better-colors` domain or is managed by a different dedicated specialist agent.


## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. | Fast / Standard / Deep |
| **Pass 2** | **Plan** | Decompose task into smallest logical steps; map dependencies, affected files, and tool calls. | Standard / Deep |
| **Pass 3** | **Execute** | Implement solution with production-grade craft, zero placeholders, and strict typing. | All Modes |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. | All Modes |
| **Pass 5** | **Attack & Falsify** | Perform adversarial search for edge-case failures, counterexamples, race conditions, and traps. | Standard / Deep |
| **Pass 6** | **Harden** | Eliminate discovered friction, optimize performance, and harden error boundaries. | Standard / Deep |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. | All Modes |


---

## 🛠️ Technical Architecture & Reference Recipes

---

## 1. Why OKLCH Over HSL / RGB

- **Perceptual Uniformity**: In HSL, yellow (`hsl(60, 100%, 50%)`) is far brighter than blue (`hsl(240, 100%, 50%)`) at the exact same lightness value. OKLCH fixes this: lightness (`L`) corresponds directly to human eye perception.
- **Predictable Palette Steps**: Changing lightness in OKLCH scales brightness smoothly without hue drift (e.g. blue turning purple when lightened in HSL).
- **Wide Gamut Access**: Access Display P3 wide-gamut colors (`oklch(L C H)`), producing significantly richer, punchier vibrant tones on modern displays.

---

## 2. OKLCH Syntax & Variables

$$\text{Format: } \text{oklch}(L \quad C \quad H [\quad / \quad A])$$

- `L` (Lightness): `0%` (black) to `100%` (white) or `0` to `1`.
- `C` (Chroma): `0` (gray) to `0.37+` (vibrant peak). Typical UI chroma range: `0.02` to `0.22`.
- `H` (Hue): `0` to `360` degrees.
  - `0` / `360`: Red / Magenta
  - `90`: Yellow / Gold
  - `140`: Green / Emerald
  - `250`: Blue / Indigo
  - `300`: Purple / Violet

### CSS Custom Properties & Relative Color Syntax

```css
:root {
  /* Brand Primary: Vibrant Indigo */
  --color-primary: oklch(0.55 0.22 260);
  /* Modern CSS Relative Color Syntax (Modifying Lightness/Chroma dynamically) */
  --color-primary-hover: oklch(from var(--color-primary) calc(l - 0.08) c h);
  --color-primary-active: oklch(from var(--color-primary) calc(l - 0.14) c h);
  --color-primary-subtle: oklch(from var(--color-primary) 0.95 0.04 h);

  /* Neutrals: Subtly Tinted (Chroma ~ 0.015) */
  --bg-surface: oklch(0.99 0.005 260);
  --bg-surface-raised: oklch(0.96 0.01 260);
  --text-main: oklch(0.2 0.02 260);
  --text-muted: oklch(0.45 0.02 260);
  --border-subtle: oklch(0.88 0.015 260);
}

/* Native CSS light-dark() declaration mode */
:root {
  color-scheme: light dark;
  --surface-adaptive: light-dark(oklch(0.99 0.005 260), oklch(0.14 0.015 260));
  --text-adaptive: light-dark(oklch(0.2 0.02 260), oklch(0.96 0.01 260));
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-surface: oklch(0.14 0.015 260);
    --bg-surface-raised: oklch(0.19 0.02 260);
    --text-main: oklch(0.96 0.01 260);
    --text-muted: oklch(0.68 0.02 260);
    --border-subtle: oklch(0.26 0.02 260);
  }
}
```

---

## 3. WCAG 2.2 AA Contrast Standards

Always verify contrast using WCAG AA minimum thresholds:

- **Normal Text (< 18pt / < 24px)**: Minimum **4.5:1** contrast ratio.
- **Large Text (≥ 18pt / ≥ 24px bold)**: Minimum **3.0:1** contrast ratio.
- **UI Components & Icons**: Minimum **3.0:1** contrast ratio against adjacent surface.

### Rule of Thumb in OKLCH:

To achieve 4.5:1 text contrast against a surface:

- Against Light Surface (`L ≈ 98%`): Text lightness `L` MUST be **`≤ 45%`**.
- Against Dark Surface (`L ≈ 14%`): Text lightness `L` MUST be **`≥ 70%`**.

---

## 4. Dark Mode & Gamut Boundaries

- **Avoid Raw Black (`#000`)**: Use deep OKLCH neutrals (`oklch(0.14 0.015 250)`). Pure black destroys depth perception and makes borders look harsh.
- **Desaturate Accent Colors in Dark Mode**: High chroma values (`C > 0.20`) cause visual fatigue and vibration on dark backgrounds. Lower chroma by ~20-30% (`C ≈ 0.14-0.16`).

---

## Anti-Slop Table

| Anti-Pattern                      | OKLCH Solution                                         | Rationale                                         |
| --------------------------------- | ------------------------------------------------------ | ------------------------------------------------- |
| Single gray for all backgrounds   | Neutral tinted with brand hue (`C: 0.01-0.02`)         | Creates cohesive, harmonious UI surfaces          |
| Over-saturated dark mode accents  | Scale chroma down (`C: 0.22` → `C: 0.15`) in dark mode | Eliminates glowing text vibration & visual strain |
| Harsh pure black borders (`#000`) | Alpha-tinted borders (`rgba(255,255,255,0.08)`)        | Smooths elevation layers                          |

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |


## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Uncontrolled Re-render Loop** | Mutating state inside render bodies or omitting hook dependencies | Wrap effects with explicit deps and isolate reactive derivations in useMemo |
| **Accessibility Neglect** | Interactive <div> without role="button", tabIndex, or onKeyDown | Use semantic <button> or provide ARIA role, keyboard handlers, and focus ring |
| **Layout Shift Flash** | Images/dynamic content without aspect-ratio or explicit dimensions | Enforce aspect-ratio or skeleton placeholders to guarantee zero CLS |


## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `frontend-reviewer` · `type-safety` · `ui-ux-auditor` · `complexity-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

### ✅ Pre-Flight Self-Audit Checklist
```
✅ Are all component props strictly typed with zero implicit "any"?
✅ Are responsive breakpoints, fluid typography, and optical balance verified?
✅ Is accessibility (ARIA labels, keyboard navigation, contrast ratio >= 4.5:1) validated?
✅ Are re-renders minimized and state lifecycles cleanly separated?
✅ Did I verify all imported UI components and icon sets actually exist?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
