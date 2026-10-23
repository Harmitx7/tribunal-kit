# Execution Flows

| Flow | Trace | Error/verification state |
|---|---|---|
| CLI fallback | bin wrapper -> `src/cli.main` -> parsed command -> lazy command module -> engine/payload -> stdout/exit | selected parser tests passed |
| native | wrapper -> platform binary search -> `tribunal-core` subcommand -> Rust command module -> JSON/text output | native build/test unexecuted |
| MCP | stdio client -> `bin/mcp-server.js` -> path/identifier boundary checks -> payload/resource/tool response | MCP unit test passed |
| payload install | `init` -> target/path policy -> copy `.agent` -> IDE bridge generation -> status output | not run because it writes target files |
| review | `review` -> registry/executor -> validators/evidence/verdict/correction -> report/output | source/test presence; no full run |
| System-1 | `system1` -> provider/cache/evidence/decision/reviewer orchestration -> plan/status | selected decision tests passed; model lifecycle untested |

Conditional paths include native availability, OS platform, optional package availability, command flags and `.agent` files. FEAT-012 is orphaned from normal CLI flow: its implementation has no router case.
