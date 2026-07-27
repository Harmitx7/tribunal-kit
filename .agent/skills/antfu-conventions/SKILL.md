---
name: antfu-conventions
description: Anthony Fu's opinionated tooling and conventions for JavaScript/TypeScript projects: ESM-first, zero-config, type-safe, and clean tooling standards.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: Tooling Conventions & ESM Standards
  tier: pro
  co-requires: [clean-code, typescript-advanced]
  trigger-signals:
    strong: [antfu-conventions, antfu ESLint, ESM first, zero-config tooling, pnpm catalogs, Anthony Fu tooling]
    weak: [eslint config, pnpm setup]
---

# Antfu Conventions — ESM-First & Opinionated Modern Tooling

Enforce Anthony Fu's modern JavaScript/TypeScript engineering conventions: ESM-first, zero-config, pnpm workspaces, and strict type safety.

---

## 4 Core Tooling Conventions

### 1. ESM-First Standards
- Use pure ES Modules (`"type": "module"` in `package.json`).
- Avoid CommonJS `require()` or `module.exports`. Use explicit `.js` extension in relative imports when building Node ESM modules.

### 2. Single ESLint Flat Config (`eslint.config.js`)
- Use `@antfu/eslint-config` for unified linting across TypeScript, Vue, React, JSON, and Markdown in 1 simple config file.

```javascript
// eslint.config.js
import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  vue: true,
  react: true,
})
```

### 3. PNPM Catalog & Workspace Monorepo
- Use `pnpm-workspace.yaml` with PNPM catalogs (`catalog:`) to lock unified dependency versions across monorepos.

### 4. Explicit Type Imports (`import type`)
- Enforce `import type { User } from './types'` to allow tree-shaking compilers (esbuild/tsdown) to strip type imports cleanly without runtime side effects.

---

## 🤖 LLM-Specific Traps

1. **Mixing CommonJS and ESM**: Generating `require()` calls inside `"type": "module"` ESM packages.
2. **Legacy ESLint `.eslintrc.json`**: Generating deprecated legacy ESLint configs instead of modern Flat Config `eslint.config.js`.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `type-safety` · `dependency-reviewer`**

### ✅ Pre-Flight Self-Audit

```
✅ Is `"type": "module"` active in package.json?
✅ Are type imports declared explicitly with `import type`?
✅ Is `eslint.config.js` flat config format used?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
