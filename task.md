# Current Objective: Agent Harness Modernization & Orchestration

## Pre-Flight
- [x] Dump existing `.agent` directory state
- [x] Verify current tests pass (Baseline health via `/audit`)

## Wave 1 (Durable Session Log & Syscall execution)
- [ ] Implement `session_logger.js` (Event-driven persistent JSONL storage)
- [ ] Implement `syscall_registry.js` (Centralized tool permissions and execution boundaries)
- [ ] Implement `harness_manager.js` (Syscall integration and process separation)
- [ ] Update `pipeline_engine.js` to log events via `session_logger`
- [ ] Run `npm test` and `/audit`

## Wave 2 (Tribunal Instincts & Continuous Memory)
- [ ] Implement `memory_archivist.js` (Background extraction of lessons into `instincts.json`)
- [ ] Define instinct lifecycle and validation logic
- [ ] Inject instincts into `context_broker.js`
- [ ] Run `npm test` and `/audit`

## Wave 3 (Dynamic Team Mode & DAG Orchestration)
- [ ] Refactor `swarm_dispatcher.js` to support topological sorting (`executeDAG`)
- [ ] Introduce DAG-based workflow parsing (e.g. `kernel-scheduler.md` concepts)
- [ ] Implement failure recovery and dependency skipping
- [ ] Run `npm test` and `/audit`

## Wave 4 (MCP Integration)
- [ ] Implement `mcp_server.js` (JSON-RPC stdio adapter for Tribunal syscalls)
- [ ] Expose resource listing (`resources/list`) and prompt listing (`prompts/list`)
- [ ] Add tool execution mapping to `syscall_registry.js`
- [ ] Run `npm test` and `/audit`

## Wave 5 (Finalization & Security Audit)
- [ ] Complete final system audit (resolving linting, test counts, unused vars)
- [ ] Generate final integration tests for MCP and Syscall registries
- [ ] Produce `final-tribunal-kit-enhancement-audit.md`
