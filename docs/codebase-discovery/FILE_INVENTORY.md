# File Inventory

This inventory is complete at significant-source-directory level; individual module names are represented by verified path globs to avoid copying generated code. `rg --files` was run excluding `node_modules`, `target`, `coverage`, lockfiles and binary/image assets.

| Paths | Responsibilities / consumers | Status |
|---|---|---|
| `package.json`, `tsconfig.json`, `eslint.config.js`, `.prettier*` | package contract, type/lint/format configuration; npm/CI consume | verified |
| `bin/{wrapper,tribunal-kit,adapter-install,global-store,mcp-server,proxy-server,spawn-agent,tk-proxy}.js` | package executable surface; wrapper/adapter users consume | verified by manifest and source |
| `src/cli.js`, `src/index.d.ts`, `src/esm/index.mjs`, `src/types.js` | CLI dispatch and programmatic contract | verified |
| `src/commands/*.js` (35 files) | command adapters: install, analysis, review, memory, web, SDD and native helpers | verified; `skill-intelligence.js` is not connected by CLI dispatch |
| `src/execution/*.js` (19) | reviewer/correction/validation transaction and evidence pipeline | source present; integration partly tested |
| `src/intelligence/*.js` (15) | case/failure/risk/evidence/reviewer intelligence | source present; invocation varies |
| `src/system1/*.js` (18) | decision, evidence, trust, repository cache and evolution primitives | source present; selected unit test verified |
| `src/browser/*.js` (11) | CDP launch/audit/discovery/compare/sentinel/proxy operations | command-wired; live browser paths unverified |
| `src/{context,evaluation,evolution,security,utils,tui}/*.js` (42) | context packing, adversarial evaluation, evolution, boundaries, utilities, presentation | source present; test coverage varies |
| `crates/core/src/{main,commands,tui}.rs` | Rust CLI/native implementation | manifest and source inspected; not built/tested in this audit |
| `.agent/{agents,skills,workflows,scripts,config}/**` | distributable payload invoked by install, compiler and MCP paths | payload syntax verification passed; semantics sampled |
| `test/unit/*.test.js`, `test/integration/*.test.js`, `tests/*.js`, `test/fixtures/**` | Jest/standalone verification and fixtures | representative 36 tests executed |
| `scripts/*.js` | release/version, sync, benchmark and engine tooling | source inventory only; `sync-version.js` is currently empty in working tree |
| `plugins/**`, `hooks/**`, `npm/**` | external tool adapters and publishing templates | present, not end-to-end verified |
| `README.md`, `docs/**/*.md`, `CHANGELOG.md`, `SECURITY.md`, `DESIGN.md`, `CONTRIBUTING.md` | documentation/history | compared selectively with source |

No file is labelled dead: dynamic require, installed-payload execution, binary dispatch and plugin discovery preclude that conclusion. `coverage/`, `target/`, `node_modules/` are confirmed generated/dependency artifacts.
