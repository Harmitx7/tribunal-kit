---
name: codebase-design
description: Use when Guidance for designing deep modules with small interfaces and clean seams. Use when structuring a new module, refactoring complex codebases, or designing internal library boundaries.
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

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `codebase-design` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Guidance for designing deep modules with small interfaces and clean seams. Use when structuring a new module, refactoring complex codebases, or designing internal library boundaries.
- **DO NOT activate when:** The task falls outside the `codebase-design` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass       | Phase            | Core Action                                                                                  |
| :--------- | :--------------- | :------------------------------------------------------------------------------------------- |
| **Pass 1** | **Understand**   | Deconstruct the user's explicit objective, implicit requirements, and platform constraints.  |
| **Pass 2** | **Plan**         | Decompose the task into smallest logical steps; map dependencies and required tool calls.    |
| **Pass 3** | **Execute**      | Implement the solution with production-grade craft, zero placeholders, and strict typing.    |
| **Pass 4** | **Verify**       | Run linters, unit tests, or compiler checks to validate structural correctness.              |
| **Pass 5** | **Attack**       | Perform an adversarial review searching for edge-case failures, race conditions, and traps.  |
| **Pass 6** | **Improve**      | Eliminate discovered friction, optimize performance, and harden error boundaries.            |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

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

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario                               | Risk                                                 | Mitigation Strategy                                                             |
| :------------------------------------- | :--------------------------------------------------- | :------------------------------------------------------------------------------ |
| **Empty or Null Inputs**               | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers   |
| **Network Timeout / Latency**          | Hanging operations or duplicate side-effects         | Implement bounded abort controllers, exponential backoff, and idempotency keys  |
| **Concurrency / Race Conditions**      | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls          |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection      | Validate boundary payloads with Zod/Pydantic schemas prior to execution         |
| **Resource / Memory Saturation**       | OOM errors, frame drops, or memory leaks             | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern                       | What AI Commonly Does Wrong                                               | What Is Actually Correct                                                 |
| :--------------------------------- | :------------------------------------------------------------------------ | :----------------------------------------------------------------------- |
| **Hallucinated Tool Capabilities** | Assuming an external library or CLI command exists without verification   | Run a verification check or verify package.json before referencing tools |
| **Premature Completion Claim**     | Declaring a task finished because code was generated without verification | Execute tests, linters, or terminal commands to provide concrete proof   |
| **Context Bloat Dumping**          | Pasting entire multi-thousand-line files into prompt context              | Extract targeted excerpts, symbols, and signatures to preserve tokens    |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `orchestrator` · `agent-organizer` · `logic-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Did I deconstruct the root objective before proposing architecture?
✅ Did I identify dependencies, bottlenecks, and parallelizable sub-tasks?
✅ Did I avoid over-engineering and select the simplest effective pattern?
✅ Did I verify assumptions with concrete file reads instead of speculation?
✅ Did I establish measurable verification criteria before completion?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
