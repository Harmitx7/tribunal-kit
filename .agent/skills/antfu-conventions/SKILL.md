---
name: antfu-conventions
description: Anthony Fu's opinionated tooling and conventions for JavaScript/TypeScript projects: ESM-first, zero-config, type-safe, and clean tooling standards.
tools: Read, Grep, Glob, Bash, Edit, Write
version: 4.0.0
last-updated: 2026-09-07
skills:
  - clean-code
  - typescript-advanced
  - monorepo-management
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Antfu Conventions — ESM-First & Opinionated Modern Tooling

---

## Mandatory Pre-Flight Context Inspection

Before configuring JS/TS tooling or lint rules, you MUST inspect:

1. Pure ESM-First Requirement (Section 24) → Set `"type": "module"` in `package.json`; ban CommonJS `require()` or `module.exports`
2. ESLint Flat Config (`eslint.config.js`) (Section 28) → Use `@antfu/eslint-config` with flat config format; ban legacy `.eslintrc.json`
3. Explicit Type Imports (`import type`) (Section 45) → Enforce `import type` for type-only symbols to allow clean tree-shaking compilation

Enforce Anthony Fu's modern JavaScript/TypeScript engineering conventions: ESM-first, zero-config, pnpm workspaces, and strict type safety.


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Anthony Fu's opinionated tooling and conventions for JavaScript/TypeScript projects: ESM-first, zero-config, type-safe, and clean tooling standards..
- **DO NOT activate when:** The task falls strictly outside antfu-conventions domain or belongs to a different dedicated specialist.

---

## 4 Core Tooling Conventions

### 1. ESM-First Standards

- Use pure ES Modules (`"type": "module"` in `package.json`).
- Avoid CommonJS `require()` or `module.exports`. Use explicit `.js` extension in relative imports when building Node ESM modules.

### 2. Single ESLint Flat Config (`eslint.config.js`)

- Use `@antfu/eslint-config` for unified linting across TypeScript, Vue, React, JSON, and Markdown in 1 simple config file.

```javascript
// eslint.config.js
import antfu from '@antfu/eslint-config';

export default antfu({
  typescript: true,
  vue: true,
  react: true,
});
```

### 3. PNPM Catalog & Workspace Monorepo

- Use `pnpm-workspace.yaml` with PNPM catalogs (`catalog:`) to lock unified dependency versions across monorepos.

### 4. Explicit Type Imports (`import type`)

- Enforce `import type { User } from './types'` to allow tree-shaking compilers (esbuild/tsdown) to strip type imports cleanly without runtime side effects.

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
