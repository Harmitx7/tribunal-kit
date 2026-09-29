---
name: monorepo-management
description: "Use when executing, coordinating, planning, or reviewing monorepo management agent workflows, cognitive loops, and architecture standards."
version: 6.0.0
last-updated: 2026-09-29
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

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `monorepo-management` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).


## Activation Boundaries
- **Activate when:** Use when executing, coordinating, planning, or reviewing monorepo management agent workflows, cognitive loops, and architecture standards.
- **DO NOT activate when:** The task falls outside the `monorepo-management` domain or is managed by a different dedicated specialist agent.


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

- ❌ Publishing internal packages to npm when they're meant to stay private -> ✅ Internal packages use `"private": true` and workspace protocol `"workspace:*"`
- ❌ Putting all shared code in a single `packages/shared` dump -> ✅ Split by domain: `packages/ui`, `packages/config`, `packages/utils`
- ❌ Running all tests on every PR regardless of what changed -> ✅ Use affected/changed detection (Turborepo `--filter`, Nx `affected`)

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
      "outputs": ["src/**", ".next/**", "!.next/cache/**"]
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

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |


## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `orchestrator` · `agent-organizer` · `logic-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

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
