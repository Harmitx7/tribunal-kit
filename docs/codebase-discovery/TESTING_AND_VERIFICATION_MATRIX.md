# Testing and Verification Matrix

## Inspected infrastructure

- Jest configuration targets `test/**/*.test.js`, collects source/bin/payload-script coverage, and exposes unit/integration scripts.
- CI runs ESLint, TypeScript no-emit, version sync, npm audit, CodeQL, multi-OS Node tests, Rust test/build, package dry-run and release packaging.
- Test directories contain 197 Jest files plus two standalone engine tests. Fixtures include a deliberately vulnerable Python app.

## Executed in this discovery

| Command | Result | Scope |
|---|---|---|
| `node scripts/validate-payload.js` | PASS | 461 payload Markdown files |
| `npx jest --runInBand --no-coverage test/unit/args.test.js test/unit/validate.test.js test/unit/mcp_server.test.js test/unit/system1_decision_engine.test.js` | PASS: 4 suites, 36 tests | CLI parsing, validation, MCP, System-1 decisions |
| `git diff --check` | FAIL | pre-existing `scripts/sync-version.js:1` trailing whitespace |

Full `npm test` was not run because it writes/replaces the repository `coverage/` artifact, contrary to this read-only audit. Rust tests/build similarly write under `target/`, so they were not run. Browser, real MCP client, adapters, install/uninstall, native binary and external integration tests remain unverified.

Feature-test associations: FEAT-003 validator; FEAT-015 args/validate; FEAT-016 decision engine; FEAT-020 MCP server. Other associations are discoverable from corresponding named `test/unit` and `test/integration` files but lack current-run evidence.
