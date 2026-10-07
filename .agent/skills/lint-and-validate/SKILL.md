---
name: lint-and-validate
description: "Use when auditing, pen-testing, hardening, and verifying code against lint and validate vulnerabilities, injection vectors, and auth flaws."
version: 6.0.0
last-updated: 2026-09-29
skills:
  - clean-code
  - config-validator
  - code-review-checklist
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "lint"
  - "validate"
---

# Linting & Validation

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `lint-and-validate` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).


## Activation Boundaries
- **Activate when:** Use when auditing, pen-testing, hardening, and verifying code against lint and validate vulnerabilities, injection vectors, and auth flaws.
- **DO NOT activate when:** The task falls outside the `lint-and-validate` domain or is managed by a different dedicated specialist agent.


## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. | Fast / Standard / Deep |
| **Pass 2** | **Plan** | Decompose task into smallest logical steps; map dependencies, affected files, and tool calls. | Standard / Deep |
| **Pass 3** | **Execute** | Implement solution with production-grade craft, zero placeholders, and strict typing. | All Modes |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. | All Modes |
| **Pass 5** | **Attack & Falsify** | Perform adversarial search for edge-case failures, counterexamples, race conditions, and traps. | Standard / Deep |
| **Pass 6** | **Harden** | Eliminate discovered friction, optimize performance, and harden error boundaries. | Standard / Deep |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. | All Modes |


---

## 🛠️ Technical Architecture & Reference Recipes

## Hallucination Traps (Read First)

- ❌ Auto-fixing lint errors without reviewing the diff -> ✅ Some auto-fixes change logic (e.g., removing 'unused' variables that are side-effects)
- ❌ Treating warnings as non-blocking in CI -> ✅ Warnings accumulate; enforce zero-warning policy or they become permanent
- ❌ Running linters only on changed files -> ✅ Run on full codebase periodically; cross-file issues are only caught with full runs

---
## Why Linting Matters

Linting catches problems that code review misses:

- Unused variables left in after refactoring
- Missing `await` on async functions (silently returns a Promise instead of the value)
- Inconsistent code style that makes diffs hard to read
- Known dangerous patterns (e.g., `==` instead of `===` in JS)

Run linting in CI. Every PR that merges should pass lint. A lint check that doesn't block the build is decoration.

---

## JavaScript / TypeScript (ESLint + Prettier)

```bash
# Install
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser prettier

# Run
npx eslint . --ext .ts,.tsx
npx prettier --check .

# Fix auto-fixable issues
npx eslint . --ext .ts,.tsx --fix
npx prettier --write .
```

**Recommended rules to enforce:**

```json
// .eslintrc.json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/await-thenable": "error",
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "eqeqeq": ["error", "always"]
  }
}
```

**Key rules explained:**

| Rule                   | Why It Matters                                              |
| ---------------------- | ----------------------------------------------------------- |
| `no-floating-promises` | Missing `await` on async call = silent bug                  |
| `no-explicit-any`      | `any` disables TypeScript's only protection                 |
| `eqeqeq`               | `==` has coercion surprises; `===` is always explicit       |
| `await-thenable`       | Prevents `await`-ing non-async functions (always a mistake) |

---

## Python (Ruff)

Ruff replaces flake8, black, isort, and pyupgrade in one fast tool:

```bash
# Install
pip install ruff

# Check
ruff check .

# Fix auto-fixable
ruff check . --fix

# Format (replaces black)
ruff format .

# Pre-commit config
# .pre-commit-config.yaml
- repo: https://github.com/astral-sh/ruff-pre-commit
  hooks:
    - id: ruff
      args: [--fix]
    - id: ruff-format
```

```toml
# pyproject.toml
[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "UP", "B", "SIM", "ANN"]
# E: pycodestyle, F: pyflakes, I: isort, N: naming, UP: pyupgrade
# B: bugbear (common bugs), SIM: simplify, ANN: annotations
```

---

## Type Checking

Linting and type checking catch different things. Run both.

**TypeScript:**

```bash
npx tsc --noEmit   # type check without emitting files
```

**Python:**

```bash
mypy src/ --ignore-missing-imports
# or
pyright src/
```

**Required compiler options (TypeScript):**

```json
{
  "compilerOptions": {
    "strict": true, // enables all strict checks
    "noImplicitAny": true,
    "noUncheckedIndexedAccess": true, // index access can be undefined
    "exactOptionalPropertyTypes": true
  }
}
```

---

## Pre-commit Integration

Run linting automatically before every commit:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    hooks:
      - id: check-merge-conflict
      - id: check-added-large-files
      - id: end-of-file-fixer
      - id: trailing-whitespace

  - repo: local
    hooks:
      - id: eslint
        name: ESLint
        language: node
        entry: npx eslint --ext .ts,.tsx
        types: [javascript, ts]

      - id: tsc
        name: TypeScript
        language: node
        entry: npx tsc --noEmit
        pass_filenames: false
```

---

## Scripts

| Script                          | Purpose                                   | Run With                                            |
| ------------------------------- | ----------------------------------------- | --------------------------------------------------- |
| `.agent/scripts/lint_runner.js` | Runs project linting and reports findings | `node .agent/scripts/lint_runner.js <project_path>` |

---

## Output Format

When this skill produces or reviews code, structure your output as follows:

```
━━━ Lint And Validate Report ━━━━━━━━━━━━━━━━━━━━━━━━
Skill:       Lint And Validate
Language:    [detected language / framework]
Scope:       [N files · N functions]
─────────────────────────────────────────────────
✅ Passed:   [checks that passed, or "All clean"]
⚠️  Warnings: [non-blocking issues, or "None"]
❌ Blocked:  [blocking issues requiring fix, or "None"]
─────────────────────────────────────────────────
VBC status:  PENDING → VERIFIED
Evidence:    [test output / lint pass / compile success]
```

**VBC (Verification-Before-Completion) is mandatory.**
Do not mark status as VERIFIED until concrete terminal evidence is provided.

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |


## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `security-auditor` · `penetration-tester` · `backend-security-expert`
**Slash Command:** `/review` or `/tribunal-full`

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

### ✅ Pre-Flight Self-Audit Checklist
```
✅ Are user inputs sanitized and treated as untrusted data at system boundaries?
✅ Are secrets loaded strictly via environment variables with zero hardcoding?
✅ Is least-privilege enforcement active on APIs, tokens, and storage buckets?
✅ Are prompt-injection delimiters and sanitizers wrapped around LLM inputs?
✅ Did I verify encryption in transit and at rest for sensitive data?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
