# Tribunal Kit: Practical Development Guide

**Target Audience:** Software Engineers, Contributors, and Maintenance Agents  
**Package Version:** `9.5.0` [VERIFIED: `package.json`]  
**Repository Branch:** `main` [VERIFIED: `git branch`]

---

## 1. Prerequisites & Environment Setup

Before working on Tribunal Kit, verify your development workstation meets these verified runtime requirements:

| Component        | Minimum Version           | Verified In Current Repo   | Installation / Check Command |
| :--------------- | :------------------------ | :------------------------- | :--------------------------- |
| **Node.js**      | `>=18.0.0`                | `v20.x`+ recommended       | `node --version`             |
| **npm**          | `>=9.0.0`                 | Verified via lockfile v3   | `npm --version`              |
| **Rust / Cargo** | `>=1.75.0` (Edition 2021) | Required for `crates/core` | `cargo --version`            |
| **Git**          | `>=2.30.0`                | Standard git toolchain     | `git --version`              |

### Initializing the Workspace

```bash
# Clone the repository (if fresh)
git clone https://github.com/Harmitx7/tribunal-kit.git
cd tribunal-kit

# Install dependencies cleanly
npm ci

# Optional: compile native Rust core for sub-10ms CLI execution
cargo build --release --manifest-path crates/core/Cargo.toml
```

---

## 2. Directory Layout & Organization

```
tribunal-kit/
├── bin/                          # CLI executable entry points
│   ├── wrapper.js                # Core wrapper (Rust binary / JS fallback dispatcher)
│   ├── mcp-server.js             # Model Context Protocol (MCP) server (34 tools)
│   ├── proxy-server.js           # Local HTTP & WebSocket rules interceptor
│   ├── tk-proxy.js               # CLI interface for proxy interception
│   └── adapter-install.js        # Universal agent adapter installer (tk-adapt)
├── crates/core/                  # High-performance compiled Rust core
│   ├── Cargo.toml                # Workspace & dependencies (oxc, tokio, clap, serde)
│   └── src/                      # Rust implementations (AST, DAG, memory, security)
├── src/                          # Node.js runtime and engine subsystems
│   ├── activity/                 # Canonical Activity Protocol & multi-host renderers
│   ├── browser/                  # Web reader, accessibility audit, DOM deconstruction
│   ├── commands/                 # 37 lazy-loaded CLI command handlers
│   ├── context/                  # AST loader, token compression, context broker
│   ├── design_intelligence/      # 9-step Design Quality Loop & OKLCH color engine
│   ├── evolution/                # Failure learning, RSI engine, instinct extraction
│   ├── execution/                # Review pipeline, dispatcher, verdict aggregation
│   ├── intelligence/             # Case Law precedents & semantic graph queries
│   ├── mcp/                      # MCP response optimizer & server helpers
│   ├── runtime_reliability/      # FSM, cancellation trees, quorum consensus, checkpoints
│   ├── security/                 # Filesystem path containment, SSRF defense, secret redaction
│   ├── supply_chain/             # SBOM, package integrity, malicious dependency scanners
│   ├── system1/                  # Fast-path heuristics, anomaly detector, reviewer routing
│   ├── tui/                      # ANSI terminal UI, reviewer grid, shimmer progress
│   └── utils/                    # Shared filesystem, logger, hashing, and containment
├── .agent/                       # Distributed governance payload
│   ├── agents/                   # 64 canonical specialist agent specifications
│   ├── skills/                   # 398 modular skills (.agent/skills/<skill>/SKILL.md)
│   ├── workflows/                # 52 workflow execution procedures (/tribunal-*, etc.)
│   ├── config/                   # specialist-registry.json, slash-commands.json
│   ├── data/                     # Case law, memory, and precedent indexes
│   └── scripts/                  # 108 executable audit and verification scripts
├── docs/                         # Authoritative documentation and architecture specs
├── plugins/                      # IDE & Host plugin configurations (Cursor, Claude, Devin)
└── test/                         # Jest test suites (unit, integration, fixtures)
```

---

## 3. Verified Development & Verification Commands

All commands below have been tested and verified non-destructively in the repository environment:

### 3.1 Static Analysis, Linting & Typechecking

```bash
# Verify TypeScript definitions across entire codebase (0 errors)
npm run typecheck
# Command executed: tsc --noEmit

# Run ESLint across JavaScript source files
npm run lint
# Command executed: eslint .

# Verify skill references, markdown mirrors, and link integrity
npm run validate-references
# Command executed: node scripts/sync-skills.js --check && node scripts/validate-references.js

# Verify governance payload integrity (670 files)
npm run validate-payload
# Command executed: node scripts/sync-skills.js --check && node scripts/validate-payload.js && node scripts/validate-references.js
```

### 3.2 Automated Test Execution

```bash
# Run Rust core unit test suite (94 tests, ~0.26s)
npm run test:rust
# Command executed: cargo test --manifest-path crates/core/Cargo.toml

# Run fast unit test target with Jest
npx jest test/unit/cli_contract.test.js --no-coverage

# Run complete unit test suite with coverage
npm run test:unit
# Command executed: node --expose-gc ./node_modules/jest/bin/jest.js test/unit --coverage --forceExit

# Run integration tests
npm run test:integration
# Command executed: jest test/integration --coverage --forceExit
```

### 3.3 Building & Compiling

```bash
# Build Rust core in release mode
npm run build:rust
# Command executed: cargo build --release

# Synchronize versions across package.json, Cargo.toml, and plugin manifests
npm run sync
# Command executed: node scripts/sync-version.js
```

---

## 4. Local Execution & Testing Techniques

### Testing the CLI Locally

You can execute the CLI directly from source without publishing or global installation:

```bash
# Run CLI help
node src/cli.js --help

# Run status cockpit
node src/cli.js status

# Run Codebase Intelligence overview
node src/cli.js understand overview

# Run zero-trust architecture blast radius simulation
node src/cli.js arch impact src/security/boundary.js
```

### Environment Overrides for Debugging

- `TRIBUNAL_FORCE_JS=1`: Forces `bin/wrapper.js` to bypass the compiled Rust binary and use pure JavaScript handlers. Essential when debugging JS command logic.
- `TRIBUNAL_CORE_PATH=/custom/path/tribunal-core`: Overrides the auto-detected path to the compiled Rust binary.
- `TK_PROXY_UPSTREAM=https://api.anthropic.com`: Configures the upstream target URL for `tk-proxy`.
- `TK_PROXY_INTERCEPT_PATH=/v1/messages`: Configures the HTTP route intercepted for governance prompt injection.

---

## 5. Contribution & Quality Standards

Every pull request or modification must satisfy the **Iron Law of Verification**:

1. **Zero Hallucination Imports:** Never import packages not declared in `package.json` (`dependencies`, `optionalDependencies`).
2. **Containment by Default:** Any module reading or writing files must use `assertWithinRoot` from `src/utils/path_containment.js`.
3. **No Unbounded Memory:** Object cloning or JSON sanitization of untrusted input must use cycle-safe WeakMap traversal (`deepClone` from `src/activity/schema.js`).
4. **Authoritative Evidence Logging:** Never emit optimistic completion messages without concrete findings (`exit code`, `test count`, or `file hash`).
5. **Type Declaration Parity:** Any export added to `src/cli.js` must be synchronized in `src/esm/index.mjs` and declared in `src/index.d.ts`.
