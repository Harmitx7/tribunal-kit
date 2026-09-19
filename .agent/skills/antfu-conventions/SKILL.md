---
name: antfu-conventions
description: "Use when Anthony Fu's opinionated tooling and conventions for JavaScript/TypeScript projects: ESM-first, zero-config, type-safe, and clean tooling standards."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - clean-code
  - typescript-advanced
  - monorepo-management
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Antfu Conventions — ESM-First & Opinionated Modern Tooling

---

## 🛠️ Technical Architecture & Reference Recipes

---

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
