---
name: harden
description: Make interfaces production-resilient with robust empty states, error boundaries, loading skeletons, offline indicators, and internationalization (i18n) layout support.
version: 3.0.0
last-updated: 2026-07-30
skills:
  - polish
  - baseline-ui
  - resilience-reviewer
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Harden — Production UI Resilience & Edge Case Protection

---

## Mandatory Pre-Flight Context Inspection

Before implementing UI component logic, you MUST inspect:
1. Component state tree → Verify presence of explicit loading skeleton, error boundary fallback, and empty states
2. CLS Prevention rules (Section 36) → Match skeleton placeholder dimensions exactly to incoming content elements
3. String Expansion (i18n) rules (Section 40) → Avoid hardcoded pixel widths (`width: 120px`); use `min-width` and flexible auto-layout

Ensure UI components gracefully handle network failures, missing data, slow connections, extreme text lengths, and internationalization.

---

## 5 Resilience Domains

### 1. Zero-Data Empty States
- Never render empty blank slates or blank boxes.
- Always render a dedicated empty state component featuring:
  - Contextual icon or subtle illustration
  - Clear heading explaining the zero state (*"No active projects found"*)
  - Secondary helper copy (*"Get started by creating your first project."*)
  - Prominent primary action CTA button (*"Create Project"*)

### 2. Error Boundary UI & Retry Hooks
- Wrap high-risk component trees in React/framework Error Boundaries.
- Display localized inline error callouts with explicit "Retry" action buttons rather than crashing the full page view.

### 3. Cumulative Layout Shift (CLS) Loading Skeletons
- Match skeleton placeholder dimensions EXACTLY to incoming data elements.
- Use animated pulse keyframes (`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`).

### 4. Extreme String Expansion (i18n)
- German, French, and Spanish strings are 30% - 50% longer than English.
- Avoid fixed button or container widths (`width: 120px`). Use `min-width` with flexible auto sizing and `flex-wrap: wrap` or text truncation.

### 5. Offline & Network Disconnection Handling
- Detect `navigator.onLine` state and display subtle offline status banners.
- Disable mutation buttons during offline mode with explicit tooltip explanation.

---

## 🤖 LLM-Specific Traps

1. **Swallowing Errors**: Catching API errors and displaying a blank container without informing the user.
2. **Fixed Container Widths**: Using hardcoded `width: 200px` on containers with international text.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `resilience-reviewer` · `frontend-reviewer`**

### ✅ Pre-Flight Self-Audit

```
✅ Does every async data container have explicit loading, error, and empty states?
✅ Are all containers built flexibly to accommodate 50% text expansion (i18n)?
✅ Do error fallbacks include actionable retry buttons?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
