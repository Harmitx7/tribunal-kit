# Tribunal Autopilot · Phase 1 verification

**Initial gate held.** The table below records the initial implementation checks. The repair pass and its verification follow that baseline.

**Repair gate passed.** The unrestricted Jest run passed all 375 suites and 5,422 tests. Phase 2 awaits explicit approval.

## Delivered files

| File                                             | Purpose                                                                                                     |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `src/autopilot/schema.js`                        | Strict Zod descriptor and manifest, typed predicates, alias integrity, effect floors and surface checks     |
| `src/autopilot/content_inventory.js`             | Agent, skill, workflow, slash-command and lifecycle reconciliation                                          |
| `src/autopilot/dispatch_inventory.js`            | CLI and MCP source inventory, native routing, scoped actions, aliases, reviewed effects and drift detection |
| `src/autopilot/manifest.js`                      | Deterministic builder, provenance check, serializer and read-only integrity comparison                      |
| `src/autopilot/capabilities.json`                | 834 generated descriptors, including aliases and 16 unavailable entries                                     |
| `scripts/capability-manifest.js`                 | Check and atomic generation entry points                                                                    |
| `package.json`                                   | Generation script and manifest checks on both existing validation paths                                     |
| `tsconfig.json`                                  | Typecheck coverage for the new source directory                                                             |
| `test/unit/autopilot_schema.test.js`             | Schema and alias rejection cases                                                                            |
| `test/unit/autopilot_content_inventory.test.js`  | Content discovery, parity and lifecycle tests                                                               |
| `test/unit/autopilot_dispatch_inventory.test.js` | Dispatch availability, source drift and argument binding tests                                              |
| `test/unit/autopilot_manifest.test.js`           | Independent builds, packaged equality and stale manifest rejection                                          |
| `docs/PHASE-1-autopilot-verification.md`         | This verification record                                                                                    |

The manifest records exact per-entry source files and definition keys. Its 212 CLI and 49 MCP descriptors include parameterized operations. The 111 workflow descriptors cover 52 files and 59 slash spellings. The remaining surfaces contain 64 agents and 398 skills. An advisory descriptor represents reading a host definition. An unavailable descriptor records a known spelling and cannot be selected for execution.

## Commands and results

Commands ran from the nested package root under PowerShell. Counts describe individual runs and should not be combined across retries.

| Command                                                                                                                                                                                                                                                                                                                         | Exit | Evidence                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---: | --------------------------------------------------------------------------- |
| `npm.cmd run capabilities:build`                                                                                                                                                                                                                                                                                                |    0 | Generated the packaged JSON                                                 |
| `node ./node_modules/jest/bin/jest.js --runInBand --no-coverage --testPathPatterns=autopilot_`                                                                                                                                                                                                                                  |    0 | 4/4 suites, 52/52 tests, 0 snapshots                                        |
| `npm.cmd run typecheck`                                                                                                                                                                                                                                                                                                         |    0 | No diagnostics                                                              |
| `npm.cmd run validate-payload`                                                                                                                                                                                                                                                                                                  |    0 | 834 descriptors, 670 payload files, 398 skills, 129 links and 39 references |
| `npm.cmd run validate-references`                                                                                                                                                                                                                                                                                               |    0 | 834 descriptors, 398 skills, 129 links and 39 references                    |
| `node ./node_modules/eslint/bin/eslint.js src/autopilot/*.js scripts/capability-manifest.js test/unit/autopilot*.test.js`                                                                                                                                                                                                       |    0 | No diagnostics                                                              |
| `node --expose-gc ./node_modules/jest/bin/jest.js --runInBand --no-coverage --forceExit --testPathIgnorePatterns 'autopilot_' 'node_modules' '\.tribunal'`                                                                                                                                                                      |    1 | Existing suites, 365/370 passed; 5,361/5,366 tests passed, 0 snapshots      |
| `node ./node_modules/jest/bin/jest.js --runInBand --no-coverage --testTimeout=90000 --runTestsByPath test/unit/evaluation_runner.test.js test/unit/codebase_intelligence_cross_module.test.js test/unit/codebase_intelligence_phase20_hardening.test.js test/integration/e2e_workflow.test.js test/unit/review_command.test.js` |    1 | 1/5 suites, 35/41 tests passed, 0 snapshots                                 |

The evaluation runner passed on retry with the longer timeout. Two suites still reported different SHA-256 hashes for the nested and outer copies of `.agent/scripts/codebase_intelligence.js`. The end-to-end impact-tier and unit review tests received a model warning on stdout before JSON. The end-to-end memory store and recall tests also failed on retry. Other working-tree edits appeared during verification. Attribution to a specific revision requires isolating those changes. No mirror sync or broader runtime repair was performed as part of the registry implementation.

## Repair pass

JavaScript and Rust initialization now exclude source workspace history from the package payload copy. The memory failure reproduced in a new project because JavaScript initialization copied the checkout's full memory index. Model integrity diagnostics now use stderr. The outer codebase-intelligence mirror received the four identifier changes present in the canonical nested file. The evaluation runner's aggregate test gets a 60-second timeout for its three Git worktrees.

The manifest drift check also detected the cockpit command already present in the current checkout. The regenerated manifest has 837 descriptors, including the `cockpit`, `tui` and `monitor` CLI spellings.

| Command or check | Exit | Evidence |
| --- | ---: | --- |
| `npm.cmd run capabilities:build` | 0 | Generated the updated JSON |
| `npm.cmd run validate-references` | 0 | 837 descriptors, 398 skills, 129 links and 39 references |
| `npm.cmd run typecheck` | 0 | No diagnostics |
| `npm.cmd run test:rust` | 0 | 94 tests passed |
| `node ./node_modules/jest/bin/jest.js --runInBand --no-coverage --testPathPatterns=autopilot_` | 0 | 4/4 suites, 52/52 tests on the regenerated manifest |
| `node ./node_modules/eslint/bin/eslint.js src/commands/init.js src/system1/provider.js src/autopilot/dispatch_inventory.js test/unit/evaluation_runner.test.js test/unit/phase2_error_swallowing.test.js` | 0 | No diagnostics |
| `node ./node_modules/jest/bin/jest.js --runInBand --no-coverage --runTestsByPath test/integration/e2e_workflow.test.js test/unit/review_command.test.js test/unit/codebase_intelligence_cross_module.test.js test/unit/codebase_intelligence_phase20_hardening.test.js test/unit/phase2_error_swallowing.test.js` | 0 | 5/5 suites, 39/39 tests |
| `cargo build --manifest-path crates/core/Cargo.toml` and fresh native init and memory store | 0 | New index had 0 entries. First store returned ID 1. |
| `node ./node_modules/jest/bin/jest.js --runInBand --no-coverage --runTestsByPath test/unit/phase4_typecheck_and_hygiene.test.js test/unit/phase2_error_swallowing.test.js test/unit/review_command.test.js test/integration/e2e_workflow.test.js` | 0 | 4/4 suites, 23/23 tests after preserving the logger warning API with a stderr option |
| `node ./node_modules/eslint/bin/eslint.js src/system1/provider.js src/utils/logger.js` | 0 | No diagnostics after the logger update |
| `npm.cmd test` with loopback access | 0 | Payload validation and all 375 Jest suites passed, with 5,422 tests and 0 snapshots |

The initial sandboxed rerun reported loopback permission errors. The unrestricted run started before the final logger adjustment. The 23-test follow-up and typecheck both passed against the final logger implementation.
