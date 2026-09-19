---
name: lint-and-validate
description: "Use when Linting and validation principles for code quality enforcement."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - clean-code
  - config-validator
  - code-review-checklist
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Linting & Validation

---

## 🛠️ Technical Architecture & Reference Recipes

---

## Hallucination Traps (Read First)

- ❌ Auto-fixing lint errors without reviewing the diff -> ✅ Some auto-fixes change logic (e.g., removing 'unused' variables that are side-effects)
- ❌ Treating warnings as non-blocking in CI -> ✅ Warnings accumulate; enforce zero-warning policy or they become permanent
- ❌ Running linters only on changed files -> ✅ Run on full codebase periodically; cross-file issues are only caught with full runs

---

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
