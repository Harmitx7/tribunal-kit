---
name: domain-modeling
description: Builds and sharpens project domain models, ubiquitous language, entity relationships, and bounded contexts before writing code.
tools: Read, Grep, Glob, Bash, Edit, Write
version: 4.0.0
last-updated: 2026-09-07
skills:
  - architecture
  - codebase-design
  - database-design
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Domain Modeling — Ubiquitous Language & Bounded Contexts

---

## Mandatory Pre-Flight Context Inspection

Before designing domain entities or business modeling, you MUST inspect:

1. Ubiquitous Language Uniformity (Section 25) → Standardize 1 explicit term across UI, code, and DB (e.g. Customer vs User); ban interchangeable synonyms
2. Bounded Context Separation (Section 30) → Isolate models per context (e.g. Inventory Product vs Catalog Product); ban 60-column monolithic entities
3. Aggregate Root Invariants (Section 34) → Mutate child entities strictly through Aggregate Root methods (`order.addItem(...)`); ban direct child mutations

Model business domain concepts cleanly before committing to database schemas or API signatures.


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Builds and sharpens project domain models, ubiquitous language, entity relationships, and bounded contexts before writing code..
- **DO NOT activate when:** The task falls strictly outside domain-modeling domain or belongs to a different dedicated specialist.

---

## 4 Domain Modeling Rules

### 1. Establish Ubiquitous Language

- Agree on strict, unambiguous terms used identically across domain experts, code variable names, database tables, and UI copy.
  - ❌ _User_, _Account_, _Member_, _Client_ used interchangeably for the same concept.
  - ✅ Define 1 clear term: **Customer** (for billing context) vs **User** (for authentication context).

### 2. Define Bounded Contexts

- Separate large systems into distinct bounded contexts. An entity named `Product` in the _Inventory Context_ (stock level, warehouse bin) has different attributes than `Product` in the _Catalog Context_ (hero image, pricing).

### 3. Aggregates & Invariants

- An **Aggregate Root** (e.g. `Order`) enforces internal business invariants across child entities (`OrderItem`).
- Never mutate a child entity (`OrderItem`) directly without passing through the aggregate root method (`order.addItem(product, qty)`).

### 4. Value Objects Over Primitives

- Wrap primitives into type-safe Value Objects to enforce validation logic:

```typescript
// Value Object enforcing domain rule
export class EmailAddress {
  private readonly value: string;

  constructor(email: string) {
    if (!email.includes('@')) throw new Error('Invalid email domain');
    this.value = email.toLowerCase().trim();
  }

  public toString(): string {
    return this.value;
  }
}
```

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
