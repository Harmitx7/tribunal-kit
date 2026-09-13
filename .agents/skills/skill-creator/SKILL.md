---
name: skill-creator
description: Use when Meta-agent specialized in expanding the framework's procedural knowledge by creating new, highly-structured SKILL.md files.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - clean-code
  - documentation-templates
  - fabel-protocol
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/skill_integrator.js
  - .agent/scripts/verify_all.js
  - .agent/scripts/lint_runner.js
---

# Skill Creator — Meta-Skill Builder

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `skill-creator` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Meta-agent specialized in expanding the framework's procedural knowledge by creating new, highly-structured SKILL.md files.
- **DO NOT activate when:** The task falls outside the `skill-creator` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass | Phase | Core Action |
|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. |
| **Pass 2** | **Plan** | Decompose the task into smallest logical steps; map dependencies and required tool calls. |
| **Pass 3** | **Execute** | Implement the solution with production-grade craft, zero placeholders, and strict typing. |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. |
| **Pass 5** | **Attack** | Perform an adversarial review searching for edge-case failures, race conditions, and traps. |
| **Pass 6** | **Improve** | Eliminate discovered friction, optimize performance, and harden error boundaries. |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---


## The V4 Hybrid Skill Specification

Every newly authored `SKILL.md` must strictly adhere to this 6-part structure:

### 1. YAML Frontmatter
```yaml
---
name: [skill-name]
description: [Clear, punchy semantic description for 2-tier lazy routing]
tools: Read, Grep, Glob, Bash, Edit, Write
version: 4.0.0
last-updated: 2026-09-07
skills:
  - [dependency-skill-1]
  - [dependency-skill-2]
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---
```

### 2. Mandatory Pre-Flight Context Inspection
Provide 3-4 numbered, actionable checkpoints requiring inspection of target config files (`package.json`, `tsconfig.json`, `pyproject.toml`) or architectural invariants before code generation.

### 3. Activation Boundaries
Explicitly define:
- `- **Activate when:** [Exact stack, problem type, or file pattern]`
- `- **DO NOT activate when:** [Out-of-scope scenarios; specify which specialist/skill to defer to]`

### 4. 2026 Performance & Logic Invariants
Provide 3-5 hard technical invariants for the domain (e.g., O(1) lookups, streaming backpressure, React 19 direct ref, Python 3.12 PEP 695 generics, zero `.unwrap()` in Rust).

### 5. Hallucination Trap Table (Read First)
Provide concrete `❌ BAD (Deprecated / Inefficient)` vs `✅ GOOD (2026 Standard)` patterns. Never use abstract advice.

### 6. Actionable Implementation Rules & Code Blocks
Provide copy-paste ready, production-grade code snippets showcasing idiomatic modern patterns.

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Mitigation Strategy |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Hallucinated Tool Capabilities** | Assuming an external library or CLI command exists without verification | Run a verification check or verify package.json before referencing tools |
| **Premature Completion Claim** | Declaring a task finished because code was generated without verification | Execute tests, linters, or terminal commands to provide concrete proof |
| **Context Bloat Dumping** | Pasting entire multi-thousand-line files into prompt context | Extract targeted excerpts, symbols, and signatures to preserve tokens |

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
