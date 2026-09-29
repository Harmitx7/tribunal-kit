---
name: apple-design
description: "Use when building, styling, optimizing, and auditing apple design components, responsive layouts, design systems, and frontend state."
version: 6.0.0
last-updated: 2026-09-29
skills:
  - soft-skill
  - emil-design-eng
  - 60fps-animation
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Apple Design — Fluid Motion, Physicality & Translucent Depth

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `apple-design` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).


## Activation Boundaries
- **Activate when:** Use when building, styling, optimizing, and auditing apple design components, responsive layouts, design systems, and frontend state.
- **DO NOT activate when:** The task falls outside the `apple-design` domain or is managed by a different dedicated specialist agent.


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

## 1. Physics-Based Spring Animations

Apple interfaces do NOT use fixed-duration cubic-beziers for interactive elements; they use **physics-based springs**.

- **Interruptibility**: Animations MUST be interruptible. If a user taps or drags mid-animation, the spring seamlessly absorbs current velocity without snapping to standard origin.
- **Spring Parameters**:
  - **Overdamped (Solid/Restrained)**: `mass: 1, stiffness: 200, damping: 25` (Modals, Sheets, Drawers)
  - **Snappy (Buttons/Toggles)**: `mass: 0.5, stiffness: 350, damping: 20` (Pills, Switches, Keypad)
  - **Bouncy (Micro-delight)**: `mass: 0.8, stiffness: 400, damping: 15` (Badges, Tooltips, Success Checkmarks)

```javascript
// Framer Motion / Motion React Spring Config
const appleSpring = {
  type: 'spring',
  stiffness: 300,
  damping: 24,
  mass: 0.8,
};
```

---

## 2. Translucent Materials & Multi-Layer Blur

Apple depth relies on subtle, multi-layered backdrop blur and border highlights:

```css
.apple-glass-panel {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow:
    0 1px 2px 0 rgba(0, 0, 0, 0.05),
    0 8px 24px -4px rgba(0, 0, 0, 0.08);
}

@media (prefers-color-scheme: dark) {
  .apple-glass-panel {
    background: rgba(26, 26, 32, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow:
      0 1px 2px 0 rgba(0, 0, 0, 0.2),
      0 12px 32px -8px rgba(0, 0, 0, 0.4);
  }
}
```

---

## 3. Optical Typography & Dynamic Tracking

- **Optical Letter-Spacing (SF Pro Standard)**: Larger titles require tighter tracking (`-0.025em`), while caption text requires positive tracking (`+0.015em`).
- **Dynamic Line Heights**: `1.1` for large titles, `1.4` to `1.5` for body text.

---

## Anti-Slop Table

| Anti-Pattern                  | Apple Design Solution                                         | Rationale                                       |
| ----------------------------- | ------------------------------------------------------------- | ----------------------------------------------- |
| Rigid linear/ease transitions | Physics-based spring curves (`stiffness: 300, damping: 24`)   | Simulates real-world physical momentum          |
| Opaque static dropdowns       | Translucent backdrop blur panel (`blur(20px) saturate(180%)`) | Preserves spatial context beneath UI            |
| Sudden state jumps            | Interruptible velocity-preserving spring animations           | Prevents visual jarring during rapid user input |

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
