# Tribunal Kit Master Implementation Plan (ADR-Lite)

## 1. Objective Context
Modernize the existing Tribunal Kit framework by integrating Durable Session Logs, a secure Agent Syscall Abstraction (Tribunal OS), Tribunal Instincts (persistent evidence-backed memory), Dynamic Team Mode (DAG-based subagent delegation), and Built-in MCP Integration. The goal is a more reliable, context-efficient, and secure governance harness.

## 2. Architectural Handoff
- **Stack:** Node.js (CommonJS/ESM hybrid), standard filesystem (`fs`, `path`), Child Processes (`child_process`).
- **Storage:** Local JSON/JSONL files (no external databases required).
- **Constraints:** Backwards compatible with existing `.agent` directory structures, skills, and slash commands. Strict security boundary for tool execution (no raw shell executions by agents).

## 3. Task-Level Interface Contracts
- **`session_logger.js`**:
  - *Produces*: `logEvent(type, payload)` -> `string` (Event ID). `readEvents()` -> `Array<object>`.
- **`syscall_registry.js`**:
  - *Produces*: `executeSyscall(toolName, args, context)` -> `Promise<{stdout, stderr, code}>`.
- **`memory_archivist.js`**:
  - *Consumes*: `session_logger.readEvents()`.
  - *Produces*: `instincts.json` schemas.
- **`swarm_dispatcher.js`**:
  - *Consumes*: `harness_manager` tool permissions.
  - *Produces*: DAG execution result (`allSettled` parallel evaluation).
- **`mcp_server.js`**:
  - *Consumes*: `stdio` (JSON-RPC 2.0).
  - *Produces*: Standard MCP responses routing to `syscall_registry`.

## 4. The Zero-Placeholder Invariant
All implementations will contain concrete Node.js logic with explicit filesystem checks, child process error boundaries, and standard Tribunal Kit `require('./_colors')` integrations. No "TBD" comments are allowed.

## 5. Dependency Tree Execution Order
1. **Foundation (Wave 1):** Session Logger and Syscall Registry. Cannot execute safe workflows without an event log and isolated execution environment.
2. **Memory (Wave 2):** Tribunal Instincts. Depends on the Session Logger to extract insights.
3. **Orchestration (Wave 3):** Team Mode & DAGs. Depends on Syscalls for execution isolation.
4. **Integration (Wave 4):** MCP Server. Depends on the existing registry and orchestration engine to expose tools externally.

## 6. File Blueprint
- `[NEW]` `.agent/scripts/session_logger.js`
- `[NEW]` `.agent/scripts/memory_archivist.js`
- `[NEW]` `.agent/scripts/syscall_registry.js`
- `[NEW]` `.agent/scripts/harness_manager.js`
- `[NEW]` `bin/mcp-server.js`
- `[MODIFY]` `.agent/scripts/pipeline_engine.js`
- `[MODIFY]` `.agent/scripts/swarm_dispatcher.js`
- `[MODIFY]` `test/unit/audit_release.test.js`

## 7. Verification Protocol
- **Linter & Security:** Code must pass `node .agent/scripts/checklist.js .` with 0 ESLint warnings (`no-unused-vars` strictly handled via `_` prefix) and 0 security scan alerts.
- **Test Suite:** `npm run test` must exit `0`, proving DAG topological sorts, MCP request handling, and backward compatibility with `pipeline_engine.js`.
- **Integration:** Booting the `mcp-server.js` manually must respond to `{"jsonrpc":"2.0","method":"resources/list","id":1}`.
