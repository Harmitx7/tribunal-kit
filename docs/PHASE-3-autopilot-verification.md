# Tribunal Autopilot · Phase 3 verification

Autopilot exposes plan, execute, and cancel through MCP. Execution accepts a server-issued plan ID. The server uses a two-minute in-memory lifetime, checks the current Git digest and scope, and admits the registered bounded architecture inspector. Identical in-flight requests are blocked, and completed requests return the recorded outcome. Cancelled operations propagate to the child process and release resources.

| Files | Responsibility |
| --- | --- |
| `src/autopilot/policy_gate.js`, `src/autopilot/service.js` | Policy admission, immutable root and child envelopes, ID lifecycle, cancellation, resource checks, terminal evidence, and redaction |
| `src/execution/dag_validation.js`, `src/execution/agent_dispatcher.js` | Shared cycle and dependency validation, with the existing dispatcher export preserved |
| `src/runtime_reliability/cancellation_context.js`, `src/runtime_reliability/resource_guard_engine.js` | Envelope propagation and typed backpressure errors |
| `.agent/scripts/architecture_extractor.js` and its parent-workspace mirror | Bounded source-only scans with an injected root containment check. Workspace config discovery runs only in ordinary scans. |
| `src/execution/controlled_write_service.js`, `bin/mcp-server.js` | Authenticated controlled writes and MCP Autopilot tools |
| `src/commands/autopilot.js`, `src/cli.js`, `src/esm/index.mjs`, `src/index.d.ts` | Lazy direct and CI entry points with CommonJS, ESM and TypeScript parity |
| `bin/adapter-install.js`, `hooks/hooks.json`, `hooks/autopilot-prompt.js`, `hooks/session-start.js`, `plugins/claude/plugin.json` | Workspace binding and Claude lifecycle hints |
| `src/autopilot/dispatch_inventory.js`, `src/autopilot/capabilities.json` | Registration and manifest validation for 843 descriptors |
| `test/unit/autopilot_execution.test.js` | Policy, signatures, stale preimages, recursion, cancellation, quorum, MCP, CLI and host fixtures |

The policy gate uses `assertWithinRoot` for scope and `validateResourceId` for envelope identity. The fixed inspector invokes the package's source scanner and blast-radius engine with an isolated environment, bounded output, and an abort signal. The runtime uses the existing activity registry, tracker, state machine, hierarchical cancellation, resource guard, and quorum engine. Plan and result data pass through the cycle-aware clone and redaction utilities. No proxy changes were needed.

## Signed write handoff

Set `TRIBUNAL_WRITE_APPROVAL_PUBLIC_KEY` to the signing service's Ed25519 SPKI public key in PEM format and `TRIBUNAL_WRITE_APPROVERS` to comma-separated human IDs. The private key belongs to the external approval service. Without both settings, authenticated approval is unavailable. The reviewer should compare the proposed content and original file against the preview hashes before signing.

Sign the UTF-8 encoding of `JSON.stringify([token, normalizedApproverId, proposalHash, requestHash, policyDecision])` and pass the Ed25519 signature as base64. The approver ID is trimmed and lowercased. The token binds the decision to a request with a finite lifetime and a specific workspace. The existing controlled write service verifies the signature and rechecks the preimage for both modification and deletion during commit.

## Verification

| Command | Exit | Evidence |
| --- | ---: | --- |
| `npm.cmd run capabilities:build` | 0 | Generated the manifest |
| `npm.cmd run validate-payload` | 0 | 670 files, 398 skills, 129 links, 39 references and 843 capability descriptors |
| `npm.cmd run typecheck` | 0 | No diagnostics |
| `npm.cmd run lint` | 0 | No diagnostics reported |
| `npm.cmd run test:rust` | 0 | 94 tests passed |
| `node src/cli.js autopilot plan "Discuss architecture"` | 0 | JSON no-op from the direct CLI |

Jest exited 0 with 150 tests passed in 16 suites and 0 snapshots.

```powershell
node ./node_modules/jest/bin/jest.js --runInBand --no-coverage --testPathPatterns 'autopilot_|agent_dispatcher|runtime_quorum|runtime_cancellation|runtime_resource|controlled_write|mcp_server|phase4_security_war_room|phase8_compatibility_war_room|architecture_extractor|codebase_intelligence_cross_module'
```

The Claude prompt-hook input and output shape follows the [Claude Code hooks reference](https://code.claude.com/docs/en/hooks#userpromptsubmit). The implementation was exercised through a subprocess fixture. A live Claude session was outside this verification run.

## Open verification and integration limits

Specialist recommendations and focused functional tests remain pending evidence in Phase 3. The existing general validation runner executes repository-defined npm scripts, so it is outside the registered automatic adapter set. The write handoff uses the existing request and preview tools and requires external human authentication for commit. Plans and execution reservations live in the MCP process. Restart expires outstanding plan IDs. Phase 4 benchmark and cache work awaits explicit approval.
