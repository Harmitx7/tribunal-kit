---
name: monorepo-management
description: Monorepo architecture and tooling mastery. Turborepo, Nx, pnpm workspaces, shared package design, task pipelines, dependency hoisting, change detection, versioning strategies (independent vs. fixed), shared TypeScript configs, internal packages, and CI optimization for monorepos. Use when setting up monorepos, managing shared code across apps, or optimizing build pipelines.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-04-17
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

## Hallucination Traps (Read First)
- ❌ Publishing internal packages to npm when they're meant to stay private -> ✅ Internal packages use `"private": true` and workspace protocol `"workspace:*"`
- ❌ Putting all shared code in a single `packages/shared` dump -> ✅ Split by domain: `packages/ui`, `packages/config`, `packages/utils`
- ❌ Running all tests on every PR regardless of what changed -> ✅ Use affected/changed detection (Turborepo `--filter`, Nx `affected`)

---

# Monorepo Management — Scaling Multi-Package Projects

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
  - "apps/*"
  - "packages/*"
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

---


---



AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---



**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.



Review these questions before confirming output:
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
