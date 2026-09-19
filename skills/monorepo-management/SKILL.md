---
name: monorepo-management
description: "Use when Monorepo architecture and tooling mastery. Turborepo, Nx, pnpm workspaces, shared package design, task pipelines, dependency hoisting, change detection, versioning strategies (independent vs. fixed), shared TypeScript configs, internal packages, and CI optimization for monorepos. Use when setting up monorepos, managing shared code across apps, or optimizing build pipelines."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - cicd-pro
  - codebase-design
  - lint-and-validate
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Monorepo Management — Scaling Multi-Package Projects

---

## 🛠️ Technical Architecture & Reference Recipes

---

## Hallucination Traps (Read First)

- ❌ Publishing internal packages to npm when they're meant to stay private -> ✅ Internal packages use `"private": true` and workspace protocol `"workspace:*"`
- ❌ Putting all shared code in a single `packages/shared` dump -> ✅ Split by domain: `packages/ui`, `packages/config`, `packages/utils`
- ❌ Running all tests on every PR regardless of what changed -> ✅ Use affected/changed detection (Turborepo `--filter`, Nx `affected`)

---

---

## Tool Selection

```
┌──────────────────────────────────────────────────────────────┐
│                     When to Use What                          │
├──────────────────────────────────────────────────────────────┤
│ pnpm workspaces │ Package linking only, no build orchestration│
│ Turborepo       │ Fast builds, simple config, Vercel ecosystem│
│ Nx              │ Enterprise, generators, dependency graph UI │
│ npm workspaces  │ Zero-dep, basic linking (limited features)  │
│ Yarn workspaces │ Legacy projects already using Yarn          │
├──────────────────────────────────────────────────────────────┤
│ Recommendation: pnpm + Turborepo for most projects           │
└──────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
my-monorepo/
├── apps/
│   ├── web/              # Next.js frontend
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── api/              # Fastify/Express backend
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── mobile/           # React Native app
│       └── package.json
├── packages/
│   ├── ui/               # Shared React components
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── config/           # Shared ESLint, TypeScript, Prettier configs
│   │   ├── eslint/
│   │   ├── typescript/
│   │   └── package.json
│   ├── utils/            # Shared pure functions
│   │   └── package.json
│   └── db/               # Shared database client + schemas
│       └── package.json
├── turbo.json
├── pnpm-workspace.yaml
├── package.json          # Root — devDependencies only
└── tsconfig.base.json    # Shared TS config extended by all
```

---

## pnpm Workspace Setup

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```json
// Root package.json
{
  "name": "my-monorepo",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "clean": "turbo run clean"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

```json
// packages/ui/package.json
{
  "name": "@myorg/ui",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./button": "./src/button.tsx",
    "./card": "./src/card.tsx"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

```json
// apps/web/package.json — consuming internal package
{
  "name": "web",
  "dependencies": {
    "@myorg/ui": "workspace:*",
    "@myorg/utils": "workspace:*"
  }
}
```

---

## Turborepo Configuration

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

```
Key concepts:
  "^build"     = Run build in dependencies FIRST (topological)
  "dependsOn"  = Task ordering — lint waits for build
  "outputs"    = What gets cached — skip re-runs if unchanged
  "persistent" = Long-running (dev servers) — never cached
  "cache: false" = Always run, never skip
```

---

## Shared TypeScript Configuration

```json
// tsconfig.base.json (root)
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "isolatedModules": true,
    "resolveJsonModule": true
  }
}
```

```json
// apps/web/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "outDir": "./dist"
  },
  "include": ["src/**/*", "../../packages/*/src/**/*"]
}
```

---

## Change Detection (Only Build What Changed)

```bash
# Turborepo — filter by affected packages
turbo run build --filter=...[HEAD~1]     # packages changed since last commit
turbo run test --filter=web...           # web app + its dependencies
turbo run lint --filter=@myorg/ui        # specific package only

# CI: Only run tests for changed packages
turbo run test --filter="[origin/main...HEAD]"
```

```yaml
# GitHub Actions — with Turborepo cache
- name: Build & Test (cached)
  run: npx turbo run build test lint --filter="[origin/main...HEAD]"
  env:
    TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
    TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

---

## Versioning Strategies

```
┌─────────────────────────────────────────────────────────────┐
│ Fixed (recommended for apps)                                 │
│ All packages share one version. Simple. One changelog.       │
│ Example: v1.2.3 applies to web, api, ui, utils, db          │
├─────────────────────────────────────────────────────────────┤
│ Independent (for published libraries)                        │
│ Each package has its own version + changelog.                 │
│ Example: @myorg/ui@2.1.0, @myorg/utils@1.4.2               │
│ Tools: Changesets, Lerna                                     │
├─────────────────────────────────────────────────────────────┤
│ Recommendation:                                              │
│ Internal monorepo (1 team) → Fixed versioning                │
│ Open-source multi-package → Independent + Changesets         │
└─────────────────────────────────────────────────────────────┘
```

---

## Internal Package Design Rules

```
✅ Internal packages are "private": true — never published to npm
✅ Use workspace protocol: "@myorg/ui": "workspace:*"
✅ Export raw TypeScript (src/index.ts) — let the consuming app bundle it
✅ One package per domain: ui, utils, config, db — NOT one giant "shared"
✅ Peer dependencies for React/framework — don't bundle the framework

❌ Don't create a package for 1-2 functions — inline until it's reused 3+ times
❌ Don't publish internal packages to npm "just in case"
❌ Don't share mutable state across packages — each package is a pure module
❌ Don't put app-specific code in packages/ — only truly shared code
```

---

## Anti-Patterns

```
❌ Running all CI checks on every package for every PR — use affected detection
❌ Circular dependencies between packages — topological ordering must be acyclic
❌ Mixing CommonJS and ESM in the same monorepo — standardize on ESM
❌ Installing devDependencies in every package — hoist shared devDeps to root
❌ No lockfile — pnpm-lock.yaml MUST be committed
❌ Using relative paths (../../packages/ui) — use workspace:* protocol
❌ Giant "shared" package — splits into domain-focused packages
```
