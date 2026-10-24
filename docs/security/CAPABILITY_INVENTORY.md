# Tribunal Kit — Capability & Security Boundary Inventory

This document provides a verifiable, code-anchored inventory of all capabilities, permissions, filesystem operations, process executions, and network interactions reachable within `tribunal-kit`.

---

## 1. Filesystem Access Inventory

Tribunal Kit operates locally within project repositories. The governance layer enforces containment via `src/security/boundary.js` using `assertWithinRoot`.

| Operation | Implementation Anchor | Trigger | Target Path | Data Accessed | Containment Boundary | Active Controls | Risk / Abuse Scenario | Mitigation / Defense |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Enumerate & Read** | `crates/core/src/commands/ast_extractor.rs:17-45`<br>`src/commands/validate.js` | User command (`tk validate`, `tk arch`) | Project source files (`.js`, `.ts`, `.rs`, `.json`, etc.) | File AST, imports, exports, landmines | Project root directory | Rejects non-project paths | Malformed file causes parser crash | Handled via OXC parser safety; non-crashing error recovery |
| **Write / Install** | `crates/core/src/main.rs:2090-2130`<br>`src/commands/init.js:45-120` | User command (`tk init`, `tk update`) | `.agent/`, `.claude/`, `.gemini/` | Copies governance agents, skills, and configuration rules | Target project directory | `assertWithinRoot` validates destination | Path traversal escaping workspace root | Lexical `path.relative` check + native symlink `realpath` validation |
| **Read / Write** | `crates/core/src/commands/memory.rs:32-110`<br>`src/commands/memory.js` | Memory recall or record commands | `.agent/history/memory/` | Working, episodic, semantic, procedural memory entries | `.agent/` folder within target repository | Enforces 4-type taxonomy schema; rejects hallucinated types | Arbitrary JSON write to disk | Confined strictly to `.memory.idx` and projection cache inside project |
| **Read / Write** | `crates/core/src/commands/sdd.rs:197-205` | User command (`tk sdd brief`) | Target output path (default: `.agent/sdd/`) | Commit log, diff stat, and patch context package | Project directory | `fs::create_dir_all` on parent; safe relative path resolution | Overwriting arbitrary system files | Sliced exclusively within `.agent/` review package directory |
| **Read Cache** | `src/utils/version.js:21-61` | Automatic non-blocking check on CLI start | `~/.tribunal-kit-update-cache.json` | Timestamp & latest published semver string | User home directory | JSON schema parsing with TTL validation | Cache poisoning leading to fake update prompt | Strict semver numeric comparison; non-executable display string |

---

## 2. Process & Shell Execution Inventory

Subprocess creation is strictly minimized. In both native Rust and Node.js engines, child processes are invoked with explicit argument arrays, preventing shell interpolation and command injection.

| Executable | Implementation Anchor | Trigger | Arguments | Shell Invoked? | Environment Inherited | Command-Injection Controls |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| `git` | `crates/core/src/commands/sdd.rs:154-190` | User executes `tk sdd brief` | `rev-parse`, `log`, `diff` with verified revisions | **No** (Direct `Command::new("git")`) | Inherited from parent process | Arguments passed as array slices; revisions pre-verified with `git rev-parse --verify --quiet` |
| Native `tribunal-core` binary | `bin/wrapper.js:127-148` | CLI router routes command to Rust core | Forwarded command-line flags and positional arguments | **No** (Direct `spawnSync(binPath, args)`) | Inherited from parent process | `binPath` resolved from trusted local targets or verified platform packages; array-based arguments |
| `where` / `which` | `bin/adapter-install.js:132-141` | User executes `tk-adapt` | `[cmd]` | **No** (Direct `execFileSync(check, [cmd])`) | Default child environment | Command existence check only; stdio ignored |
| Agent Subprocesses | `bin/spawn-agent.js:10-48` | Subagent dispatching | Explicit argument arrays | **Conditional** (Only Windows `.cmd`/`.bat` wrappers) | Controlled via execution options | `validateExecutableName` blocks `[\0\r\n;&|<>`$]`; `validateProcessArgs` blocks control chars and cmd.exe metacharacters |

---

## 3. Network Interaction Inventory

Tribunal Kit operates primarily offline. Network calls are isolated to package update notifications and explicit user-requested browser auditing.

| Destination Host | Trigger | Purpose | Data Sent | Data Received | Authentication | Opt-Out Mechanism | Failure Handling |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `registry.npmjs.org` | CLI startup (`src/utils/version.js:83-123`) | Check if a newer version of `tribunal-kit` is available on npm | User-Agent header with current version | JSON document with package version | None (Public read) | Pass `--skip-update-check` flag or set `TK_SKIP_UPDATE_CHECK=1` | Silent non-blocking timeout (3s max); failures ignored |
| User-Supplied Web URLs | User command (`tk audit-web <url>`, `tk browse <url>`) | Browser auditing & visual regression testing | HTTP GET request to specified target | Page HTML, CSS, screenshot | None | Operation is completely on-demand (never runs automatically) | `validateBrowserUrl` enforces SSRF defense: blocks loopback, cloud metadata (`169.254.169.254`), private RFC 1918 subnets, and debugger ports |

---

## 4. Credentials & Environment Variable Inventory

### Credential Handling
- **Zero Credential Persistence**: Tribunal Kit does not request, store, parse, or transmit API tokens, passwords, private keys, or SSH credentials.
- **Zero Telemetry Transmit**: Execution telemetry (`crates/core/src/commands/telemetry.rs`) records local duration and success metrics written strictly to local files (`.agent/telemetry.jsonl`). No remote analytics endpoint exists.

### Environment Variable Consumption
- `TRIBUNAL_FORCE_JS`: Forces JavaScript engine fallback when set to `1` or `true`.
- `TRIBUNAL_CORE_PATH`: Allows overriding the path to the native Rust binary.
- `TK_AUTO_BUILD`: Allows on-demand local compilation of `Cargo.toml` if prebuilt binary is absent.
- `TK_SKIP_UPDATE_CHECK`: Completely suppresses outbound npm registry version checks.
- `NO_COLOR` / `CI` / `FORCE_COLOR`: Terminal ANSI color configuration.

---

## 5. npm Lifecycle & Distribution Security

- **Zero Install Lifecycle Scripts**:
  - `package.json` contains no `preinstall`, `install`, or `postinstall` scripts.
  - Safe against install-time remote code execution.
- **Hardened Installation Command**:
  ```bash
  npx -y --ignore-scripts tribunal-kit@<PINNED_VERSION>
  ```
- **Binary Architecture**:
  - Prebuilt platform binaries distributed via standard npm scoped packages (`@tribunal-kit/core-*`).
  - No remote binary downloaders invoked at installation or runtime.
