---
name: codebase-design
description: Guidance for designing deep modules with small interfaces and clean seams. Use when structuring a new module, refactoring complex codebases, or designing internal library boundaries.
tools: Read, Grep, Glob, Bash, Edit, Write
version: 3.0.0
last-updated: 2026-07-30
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
1. Deep Module Ratio Rule (Section 25) → Create deep modules (small simple interface hiding heavy internal complexity); ban shallow 1-line wrapper functions
2. Strict Information Hiding (Section 46) → Keep internal data structures and vendor clients strictly private (`#privateField`); ban leaking internal ORM/DB types in public APIs
3. Policy vs Mechanism Separation (Section 53) → Separate generic execution mechanisms (SQL queries, HTTP fetches) from domain business policies (retry rules, validation)

# Codebase Design — Deep Modules & Clean Seams

Architect software with **deep modules**: modules that hide immense internal complexity behind small, simple, intuitive interface seams.

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
- **Mechanism**: *How* something executes (e.g. HTTP fetching, SQL query building, JSON parsing).
- **Policy**: *What* business decision is made (e.g. retry 3 times if status is 503). Keep policy pure and mechanism generic.

---

## 🤖 LLM-Specific Traps

1. **Creating Anemic Shallow Wrappers**: Writing 1-line wrapper functions around third-party libraries that add zero abstraction value.
2. **Leaking Internal Implementation Types**: Exporting low-level internal database types directly in public API interfaces.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review` or `/tribunal-backend`**
**Active reviewers: `logic-reviewer` · `type-safety` · `complexity-reviewer`**

### ✅ Pre-Flight Self-Audit

```
✅ Does the module expose a minimal interface while encapsulating internal complexity?
✅ Are internal vendor data structures hidden behind clean domain seams?
✅ Is policy separated cleanly from low-level mechanism?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
