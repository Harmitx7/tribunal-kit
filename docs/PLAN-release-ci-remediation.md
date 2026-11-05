# Release, Packaging, Entrypoint, and Test Remediation Plan

## Objective
Stabilize release metadata synchronization and CI, make packaged MCP and CLI entrypoints resolvable, remove local runtime state from npm tarballs, and close test/process leaks. Preserve the project’s existing JavaScript and Rust interfaces.

## Hard constraints
- Keep `npm run validate-payload`, lint, typecheck, Rust tests, `npm test`, and npm pack as the verification contract.
- Retain canonical `.agent/skills` plus the required `skills/` and `.agents/skills/` mirrors with byte-for-byte parity.
- Keep Rust compilation in explicit build/test jobs, not an implicit `npm version` hook.
- Make no version bump during remediation; verify current-version metadata is deterministic.

## Execution waves and contracts

### Wave 1: Release metadata and workflow
- Inspect/update `scripts/apply-version.js`, `scripts/sync-version.js`, `package.json`, and release/CI workflows.
- Contract: `apply-version.js` reads `package.json.version` and synchronizes the documented targets; `sync-version.js` remains a read-only verifier and reports every drift. Version lifecycle must not require Rust cross compilation.
- Verify with a deterministic apply/check repeat and `npm run validate-payload`.

### Wave 2: MCP and manifest entrypoints
- Inspect/update `mcp_config.json`, `.agent/mcp_config.json`, `bin/mcp-server.js`, `.agent/scripts/mcp_server.js`, and package metadata.
- Contract: supported local client commands resolve from repository root and installed package; stale Pi manifest references are removed or packaged with the referenced file.
- Verify by resolving each configured path and invoking server startup smoke checks.

### Wave 3: Package contents and skill parity
- Inspect/update `package.json`, `.npmignore`, `scripts/sync-skills.js`, and `scripts/validate-references.js` as evidence requires.
- Contract: package keeps required bootstrap payload and indices while excluding history, tribunal runtime logs, backups, caches, plans, and redundant top-level skill mirrors when not required at runtime. Canonical and adapter skill mirrors remain identical including YAML bytes.
- Verify with `npm run validate-payload` and `npm pack --dry-run` manifest/size output.

### Wave 4: Async cleanup, public types, and dependency docs
- Inspect/update leaking server/spawn/execution code and associated tests, `src/index.d.ts`, `src/esm/index.mjs`, `src/cli.js`, `SECURITY.md`, and `CONTRIBUTING.md`.
- Contract: resources created by tests are closed; package declarations describe actual exports; dependency claims match `package.json`.
- Verify with requested Jest open-handle run, lint, typecheck, and full test suite.

### Wave 5: VBC closeout
- Run sequentially: `npm run validate-payload`, `npm run lint`, `npm run typecheck`, `npm run test:rust`, `npm test`, `npm pack --dry-run`.
- Record exact terminal output and exit codes. Do not claim a check complete without successful command output.

## Risks and failure handling
- Validation may reveal pre-existing generated mirror drift; only synchronize through the canonical script and recheck parity.
- Rust tests require an available Cargo toolchain and may be environment-blocked; report the exact failure without marking the gate complete.
- npm lifecycle hooks can mutate generated files; capture Git status before and after pack/version dry runs.
