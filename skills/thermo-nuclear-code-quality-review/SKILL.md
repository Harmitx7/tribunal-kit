---
name: thermo-nuclear-code-quality-review
description: "Use when Run an extremely strict maintainability review for abstraction quality, giant files, spaghetti-condition growth, and architectural debt."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - clean-code
  - codebase-design
  - code-review-checklist
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Thermo-Nuclear Code Quality Review — Zero-Tolerance Maintainability Audit

---

## 🛠️ Technical Architecture & Reference Recipes

---

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
