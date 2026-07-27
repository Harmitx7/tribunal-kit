---
name: thermo-nuclear-code-quality-review
description: Run an extremely strict maintainability review for abstraction quality, giant files, spaghetti-condition growth, and architectural debt.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: Ultra-Strict Code Quality Review
  tier: pro
  co-requires: [clean-code, codebase-design, code-review-checklist]
  trigger-signals:
    strong: [thermo-nuclear-code-quality-review, strict code review, maintainability audit, spaghetti code review, giant file audit, strict maintainability]
    weak: [deep review, strict audit]
---

# Thermo-Nuclear Code Quality Review — Zero-Tolerance Maintainability Audit

Execute a ruthless, zero-tolerance code maintainability audit targeting abstraction leaks, file bloat, and spaghetti conditionals.

---

## 5 Zero-Tolerance Audit Rules

### 1. File Size Hard Limit (Max 300 Lines)
- Flag ANY single file exceeding 300 lines of code. Demand decomposition into modular helper components or sub-packages.

### 2. Cyclomatic Complexity & Nested Conditionals (Max 3 Levels)
- Flag any function with nested conditionals deeper than 3 levels (`if -> if -> if -> for`). Require early guard clause returns.

```typescript
// ❌ REJECTED: Deep nested spaghetti
function processOrder(order: Order) {
  if (order) {
    if (order.isValid) {
      if (order.items.length > 0) {
        // Business logic hidden 4 levels deep
      }
    }
  }
}

// ✅ APPROVED: Early guard returns
function processOrder(order: Order) {
  if (!order || !order.isValid) return;
  if (order.items.length === 0) return;
  // Business logic at top indentation level
}
```

### 3. Magic Values & String Literals
- Hardcoded status strings (`"PENDING_APPROVAL_V2"`) or raw numbers (`86400000`) outside central `const` or `enum` declarations trigger immediate failure.

### 4. Direct Dependency Coupling
- Modules importing concrete database models or vendor SDKs directly inside domain business logic instead of interface adapters are rejected.

---

## 🤖 LLM-Specific Traps

1. **Permissive Approvals**: Giving "looks good to me" approvals on 800-line monolithic files with nested conditionals.
2. **Superficial Formatting Fixes**: Focusing on trailing commas instead of architectural complexity and file bloat.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `complexity-reviewer` · `logic-reviewer` · `type-safety`**

### ✅ Pre-Flight Self-Audit

```
✅ Are all files under the 300-line size threshold?
✅ Has cyclomatic nesting depth been reduced to $\le 3$ levels via guard clauses?
✅ Are all magic numbers and status strings extracted into typed constants?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
