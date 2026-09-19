---
name: codebase-design
description: "Use when Guidance for designing deep modules with small interfaces and clean seams. Use when structuring a new module, refactoring complex codebases, or designing internal library boundaries."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - architecture
  - clean-code
  - domain-modeling
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Codebase Design — Deep Modules & Clean Seams

---

## 🛠️ Technical Architecture & Reference Recipes

---

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
