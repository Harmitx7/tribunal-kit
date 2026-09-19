---
name: domain-modeling
description: "Use when Builds and sharpens project domain models, ubiquitous language, entity relationships, and bounded contexts before writing code."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - architecture
  - codebase-design
  - database-design
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Domain Modeling — Ubiquitous Language & Bounded Contexts

---

## 🛠️ Technical Architecture & Reference Recipes

---

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
