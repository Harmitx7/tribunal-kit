---
name: codebase-design
description: Guidance for designing deep modules with small interfaces and clean seams. Use when structuring a new module, refactoring complex codebases, or designing internal library boundaries.
tools: Read, Grep, Glob, Bash, Edit, Write
version: 4.0.0
last-updated: 2026-09-07
skills:
  - architecture
  - clean-code
  - domain-modeling
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Codebase Design — Deep Modules & Clean Seams

---

## Mandatory Pre-Flight Context Inspection

Before designing module boundaries or internal libraries, you MUST inspect:

1. Deep Module Ratio Rule → Create deep modules (small simple interface hiding heavy internal complexity); ban shallow 1-line wrapper functions
2. Strict Information Hiding → Keep internal data structures and vendor clients strictly private (`#privateField`); ban leaking internal ORM/DB entities in public APIs
3. Ports & Adapters Isolation → Define abstract interfaces for external services (storage, payments, email); keep core business domain logic decoupled from vendor SDKs
4. Policy vs Mechanism Separation → Separate generic execution mechanisms (SQL queries, HTTP fetches) from domain business policies (retry rules, pricing models)

## Activation Boundaries

- **Activate when:** Structuring new software packages, refactoring monolithic files into modular boundaries, designing internal SDKs, and decoupling domain logic from third-party dependencies.
- **DO NOT activate when:** Writing localized one-off utility helper functions or pure CSS styles.

## 2026 Architecture & Module Invariants

1. **Deep vs Shallow Ratio**: Aim for interfaces with ≤ 3 primary methods that encapsulate multi-step workflows. If a consumer must orchestrate 5 method calls in sequence, your module interface is too shallow.
2. **Domain Model Immutability**: Return frozen or readonly representations (`Readonly<User>`) from module boundaries to prevent callers from mutating internal state without going through domain methods.
3. **Seam Testing with Stubs**: When modules have clean seams, testing requires stubbing only the narrow boundary interface rather than mocking 15 internal methods.

## Hallucination Traps (Read First)

- ❌ Exposing Prisma/Mongoose documents directly to API callers → ✅ Map to domain DTOs at the module boundary
- ❌ Creating "manager", "helper", or "util" classes with 40 unrelated methods → ✅ Group around cohesive bounded contexts
- ❌ Passing 10 configuration flags to a function → ✅ Use sensible defaults and the builder or options pattern
- ❌ Breaking a 50-line method into five 10-line shallow classes → ✅ Keep cohesive code together unless there is real reuse

---

## 4 Principles of Deep Module Design

### 1. High Depth Ratio (Simple Interface / Heavy Implementation)

- **Deep Module**: Small surface area interface hiding extensive internal machinery. (e.g. `fs.readFile()` is 1 simple function hiding thousands of lines of OS file descriptor buffer logic).
- **Shallow Module**: Large interface surface area relative to its implementation (e.g. a 5-line wrapper function with a 6-argument configuration object). Avoid shallow modules!

```typescript
// ❌ SHALLOW MODULE: Forces consumer to manage low-level state
class ShallowUserStorage {
  public validateUser(u: User): boolean { ... }
  public serializeUser(u: User): string { ... }
  public writeToFile(path: string, data: string): void { ... }
}

// ✅ DEEP MODULE: Hides file serialization & validation under 1 method
class DeepUserStorage {
  public async save(user: User): Promise<void> {
    this.validate(user);
    const data = this.serialize(user);
    await this.persist(data);
  }
}
```

### 2. Information Hiding & Encapsulation

- Keep internal data structures, caching mechanisms, and third-party vendor clients strictly private (`private` / `#privateField`).
- Expose intent-driven methods (`user.rename("Alice")`) rather than raw property setters (`user.name = "Alice"`).

### 3. Clean Seams for Testability

- Define interfaces at subsystem boundaries so dependencies can be replaced with mock doubles or fake implementations in tests without modifying production code.

### 4. Separate Policy from Mechanism

- **Mechanism**: _How_ something executes (e.g. HTTP fetching, SQL query building, JSON parsing).
- **Policy**: _What_ business decision is made (e.g. retry 3 times if status is 503). Keep policy pure and mechanism generic.

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
