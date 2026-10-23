# Directory Structure

| Path | Classification | Verified role |
|---|---|---|
| `bin/` | executable adapters | wrapper, CLI, MCP, proxy, global store and child-agent launchers |
| `src/` | application source | JS CLI fallback and feature engines (140 files) |
| `crates/core/` | native source | Rust `tribunal-core` executable (29 files) |
| `.agent/` | shipped governance payload | agents, skills, workflows, configuration and scripts (658 files) |
| `.agents/`, `skills/` | duplicated/corpus payload | agent/skill material (402 files each); usage must be configuration-verified |
| `test/`, `tests/` | test infrastructure | Jest unit/integration plus two standalone Node tests (199 files) |
| `.github/workflows/` | CI/release | CI and platform-native release builds |
| `scripts/` | developer/release tooling | 41 automation, benchmark and analysis scripts |
| `plugins/`, `hooks/` | integrations | Hermes/OpenCode/Pi plugins and session hook |
| `docs/` | documentation | user/API/authoring/security-history content |
| `npm/` | package artifacts | platform package templates |
| `coverage/`, `target/`, `node_modules/` | generated/dependency artifacts | 298, 3,632 and 7,565 files respectively; excluded from source audit |
| `phase19/`, `scratch/`, `laya-lock-gen/` | investigation required | minimal/empty local support areas; no supported runtime invocation confirmed |

The full source-file catalogue is in [FILE_INVENTORY.md](FILE_INVENTORY.md). Generated and dependency trees were counted, not individually analysed.
