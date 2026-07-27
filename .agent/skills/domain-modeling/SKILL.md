---
name: domain-modeling
description: Builds and sharpens project domain models, ubiquitous language, entity relationships, and bounded contexts before writing code.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: Domain Driven Design & Business Modeling
  tier: pro
  co-requires: [architecture, codebase-design]
  trigger-signals:
    strong: [domain-modeling, ubiquitous language, bounded context, aggregate root, domain entity, business logic model]
    weak: [model data, data entities]
---

# Domain Modeling — Ubiquitous Language & Bounded Contexts

Model business domain concepts cleanly before committing to database schemas or API signatures.

---

## 4 Domain Modeling Rules

### 1. Establish Ubiquitous Language
- Agree on strict, unambiguous terms used identically across domain experts, code variable names, database tables, and UI copy.
  - ❌ *User*, *Account*, *Member*, *Client* used interchangeably for the same concept.
  - ✅ Define 1 clear term: **Customer** (for billing context) vs **User** (for authentication context).

### 2. Define Bounded Contexts
- Separate large systems into distinct bounded contexts. An entity named `Product` in the *Inventory Context* (stock level, warehouse bin) has different attributes than `Product` in the *Catalog Context* (hero image, pricing).

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
    if (!email.includes("@")) throw new Error("Invalid email domain");
    this.value = email.toLowerCase().trim();
  }

  public toString(): string { return this.value; }
}
```

---

## 🤖 LLM-Specific Traps

1. **Anemic Domain Models**: Creating plain data structures (`DTOs`) without domain methods, pushing business logic into scattered service files.
2. **Mixing Contexts**: Creating 1 giant `User` table with 60 columns spanning auth, billing, shipping, and notification preferences.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `logic-reviewer` · `type-safety`**

### ✅ Pre-Flight Self-Audit

```
✅ Are entity names strictly consistent with the project's ubiquitous language?
✅ Are domain invariants enforced inside Aggregate Roots?
✅ Have complex primitives been converted into type-safe Value Objects?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
