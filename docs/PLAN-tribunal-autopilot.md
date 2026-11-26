# Tribunal Autopilot | Phase 0 architecture decision

**Decision requested:** approve a manifest of existing capabilities as the first implementation increment. An unsigned recommendation carries no execution authority. The release unit is the nested `tribunal-kit` package, version 9.5.0. Only this plan is a Phase 0 deliverable.

## Audit and reuse decisions

| Concern         | Existing implementation                                                                                                                                                                                                                                                                 | Required addition or limit                                                                                                                                               |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Discovery       | System-1, impact classifier, skill topic map, specialist registry, slash commands, command dispatch and MCP tool listing                                                                                                                                                                | Build a joined, provenance-bearing inventory. Retain distinct surface aliases for the same operation.                                                                    |
| Context         | `src/commands/understand.js`, `.agent/scripts/blast_radius_engine.js`, existing routing functions inventoried below                                                                                                                                                                     | Normalize their outputs behind one System-1 ingress. Consume an existing bounded snapshot on the fast path.                                                              |
| Announcements   | `src/activity/announcement.js` defines AnnouncementIntelligence and AnnouncementDeduplicator; `src/activity/resolver.js` resolves named agent and skill metadata                                                                                                                        | Keep display deduplication separate from atomic execution reservations. An announcement proves neither dispatch nor completion.                                          |
| Writes          | `src/execution/controlled_write_service.js` defines ControlledWriteService. `bin/mcp-server.js` instantiates it and delegates request, preview, approval and commit. `src/execution/write_policy_engine.js` and `transaction_manager.js` own write decisions and transaction mechanics. | Use the same service. Authenticate approval independently of the requesting model before enabling write execution.                                                       |
| Reliability     | Runtime state machine, cancellation, resource guard, retry, quorum, checkpoints and fault injection in `src/runtime_reliability/`; tracker in `src/activity/tracker.js` and OperationRegistry in `src/activity/registry.js`                                                             | Supply trusted root-run context and atomic reservations across hooks, tools and restarts. Treat abandoned side effects as unknown, requiring reconciliation.             |
| DAG             | `crates/core/src/commands/dag_scheduler.rs` computes topological waves and reports cycles                                                                                                                                                                                               | Reject malformed graphs and cycles before dispatch. Ensure equivalent validation when the optional native binary is unavailable or fail closed for multi-step execution. |
| Data boundaries | `src/utils/path_containment.js`, `src/security/boundary.js`, `src/activity/schema.js`                                                                                                                                                                                                   | Recheck every resolved target at use. Apply network policy to redirects, resolved endpoints and browser actions. Sanitize before persistence and response formatting.    |
| Evidence        | `src/verification/contract_engine.js` exports synchronous pre/post/invariant assertions. `src/commands/contract.js` delegates snapshot replay to `.agent/scripts/trace_engine.js`.                                                                                                      | Await outcomes before asserting postconditions. Build a paired replay runner with independent labels. Reading a failure snapshot alone does not rerun a decision.        |
| Caching         | `src/system1/repository_cache.js` and `repository_cache_contract.js` already implement repository cache infrastructure and digest/key contracts                                                                                                                                         | Extend through a namespaced capability-result adapter. Skip caching whenever input coverage or freshness is unknown.                                                     |
| Packaging       | Required npm dependencies are exactly `ws ^8.21.3` and `zod ^4.6.7`. Optional dependencies are `@receptron/laya ^0.1.2`, `onnxruntime-node ^1.22.0`, and six `@tribunal-kit/core-{darwin,linux,win32}-{arm64,x64}` binaries at `^9.5.0`.                                                | No new production dependencies. Keep npm's CJS, ESM and declaration entry points compatible. No model load on startup.                                                   |

## Routing and integration audit

| Source path and symbol                                                                                                                                                                                            | Current role and integration decision                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.agent/scripts/intent_extractor.js` · `extractIntent`                                                                                                                                                            | Matches configured actions/artifacts and separates primary and contextual clauses. Feed the result into speech-act classification. A keyword alone cannot authorize an action.                                                                                                                                |
| `.agent/scripts/context_broker.js` · `loadSkills`, `scoreSkill`, `selectSkills`, `broker`                                                                                                                         | JavaScript task/file-based skill ranking and model-budgeted context. Preserve this scoring owner; use `.agent/scripts/pipeline_engine.js` as a consumer and `.agent/scripts/routing_evaluation_engine.js` as an existing comparison point.                                                                    |
| `.agent/scripts/skill_intelligence.js` · `discoverSkills`; `src/commands/skill-intelligence.js`                                                                                                                   | Separate discovery with explicit includes/excludes and failure signals. Expose evidence and overrides through the same adapter.                                                                                                                                                                               |
| `.agent/scripts/codebase_intelligence.js` · `resolveRoute` and static/instance delegates; `src/commands/understand.js`                                                                                            | Investigation preflight and routing. Consume read-only topology and `.agent/scripts/blast_radius_engine.js` · `computeBlastRadius` for scoped evidence.                                                                                                                                                       |
| `.agent/scripts/context_compiler.js` · `resolveSkills`; `.agent/scripts/prompt_compiler.js` · `inferImpactTier`, `compileSuperPrompt`                                                                             | File/content hints and action/stack prompt hints. Preserve existing callers; route their hints through the context fusion layer when Autopilot is enabled.                                                                                                                                                    |
| `.agent/scripts/impact_classifier.js` · `classifyImpact`; `src/system1/decision_engine.js` · `evaluateDecision`, `resolveMonotonicImpactTier`                                                                     | The heuristic scores critical words in task, file or diff. Extend the decision engine at the ingress, with the cheap speech-act check before evidence/browser consultation.                                                                                                                                   |
| `src/system1/provider.js` · `classifyImpact(files, task)`; `src/system1/index.d.ts`                                                                                                                               | The declaration inspected lists task before files. Verify public callers and preserve argument order explicitly in the optional classifier adapter.                                                                                                                                                           |
| `src/system1/reviewer_orchestrator.js` · `detectRequiredDomains`, `orchestrateReviewers`; `src/system1/reviewer_selection.js` · `dynamicReviewerSelection`, `buildFallbackSelection`, `validateReviewerSelection` | Select reviewers for a review decision. Invoke only after establishing a review requirement. `.agent/scripts/benchmark_suite.js` has its own benchmark selector.                                                                                                                                              |
| `src/activity/resolver.js` · `SkillAgentResolver.resolveAgent/resolveSkill`; `src/activity/announcement.js`; `src/activity/registry.js`                                                                           | Named metadata lookup, announcement suppression and operation identity have distinct owners. `src/activity/tracker.js` consumes these services.                                                                                                                                                               |
| `.agent/skill_topic_map.json`, `.agent/config/specialist-registry.json`, `.agent/config/slash-commands.json`, `scripts/sync-routing-index.js`                                                                     | Topic associations, specialist lifecycle, slash definitions and index maintenance. Preserve deprecated and experimental availability; discovery must not silently activate them.                                                                                                                              |
| `crates/core/src/commands/context_broker.rs` · `resolve_context`; `crates/core/src/commands/skill_resolver.rs` · `resolve_skills`                                                                                 | Native context enumeration takes a repo and optional target file. Native resolution expands dependencies for already named skills. The MCP context handler forwards the first file and places task text in the response; it does not reproduce JS task ranking. Make this a cross-surface regression fixture. |
| `bin/wrapper.js`, `src/cli.js`, `src/esm/index.mjs`, `src/index.d.ts`                                                                                                                                             | Native command ownership and JS fallback availability must be indexed independently. Audit found 25 native names, of which 12 lack JS switch cases. Test exported behavior through all three package entry points.                                                                                            |
| `bin/mcp-server.js`, `src/mcp/response_optimizer.js`                                                                                                                                                              | 34 advertised tool names; additional handlers for `dispatch_swarm`, `get_ast_context`, `validate_payload`. Reconcile or explicitly mark internal names; a handler alone cannot establish public discoverability.                                                                                              |
| `bin/adapter-install.js`, `hooks/hooks.json`, `hooks/hooks-cursor.json`, `hooks/session-start.js`, `src/commands/hook.js`, `plugins/`                                                                             | Installer has six host targets; inspected hook configs register SessionStart. Git hooks have separate pre-commit/pre-push triggers. Prove support for each proposed per-turn event with a host fixture.                                                                                                       |
| `bin/tk-proxy.js`, `bin/proxy-server.js`                                                                                                                                                                          | Optional loopback prompt interception. Keep execution and approvals outside the proxy.                                                                                                                                                                                                                        |

**Existing manifest.** Reuse the crawlers behind `.agent/scripts/integrity_manifest.js` · `generateManifest`. Its report includes time-dependent metadata. Its inventory counts 64 agents including 28 reviewers, 398 skills, 108 scripts and 52 workflows. Slash configuration has 55 entries. Keep slash aliases and workflow files distinct. The integrity scan flags 9 of 240 references and 4 of 58 numeric claims. These are scanner findings requiring adjudication, including repository-relative versus payload-relative paths. Passing the existing payload validator does not establish zero phantom capabilities.

**Design inspection.** The exact files under `src/design_intelligence/` are `index.js`, `art_direction_engine.js`, `browser_verification_bridge.js`, `color_harmony_engine.js`, `component_state_engine.js`, `design_token_schemas.js`, `spatial_layout_engine.js` and `visual_defect_analyzer.js`. The aggregate loop has default input, simulated correction and fixed scores. The bridge reads `audit.score`; `src/browser/audit.js` returns nested scores. Require actual changed-component evidence before claiming visual verification. If a browser is unavailable, record that missing evidence.

**Execution risks to close before activation.** `src/execution/validation_runner.js` fingerprints fixed command arguments and records a placeholder repository hash; its current result cannot independently prove which revision and full argument list ran. `src/runtime_reliability/retry_and_timeout_engine.js` races operations against timeouts. An unfinished attempt can still own resources. Use cancellation-aware adapters with termination acknowledgement before retry. `src/execution/agent_dispatcher.js` executes JS waves; the native DAG scheduler only computes their ordering. Reuse ResourceGuardEngine slot and wait-dependency APIs and require explicit cleanup. Bind approval to an independently verified preimage for deletion as well as modification. Verify recovery with `src/runtime_reliability/checkpoint_recovery_engine.js` and deterministic failures with `src/runtime_reliability/fault_injection_engine.js`.

## Stage 1 · Capability registry

Build-time inventory reads the shipped definitions. Build a strict Zod descriptor with the following field contracts (proposed schema). Reject excess keys. Store only declarative data in the manifest.

| Field                         | Zod constraint and meaning                                                                                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id, operationId               | Nonempty, namespaced stable strings. Unique id per addressable surface entry. Shared operationId only for proven aliases with equivalent effects.                |
| surface, locator, provenance  | Enum `cli / mcp / agent / skill / workflow`; exact dispatch name or packaged relative path; source file and definition key. Resolve within the package root.     |
| sideEffectClass, riskTier     | Enum `read / write / exec / policy`; integer 0 through 3. Classify the strongest reachable effect, including indirect subprocesses, artifact writes and plugins. |
| estimatedCostTier, idempotent | Enum `low / medium / high`; required Boolean. Idempotent does not confer permission or cacheability.                                                             |
| preconditions                 | Array of strict typed predicates over known facts, with enum operators and bounded literal operands. Missing facts fail. No code strings or shell interpolation. |
| triggerSignals                | Array of typed mode, path, topology or impact predicates. Require workspace corroboration for actionable routes. Empty triggers permit explicit discovery only.  |
| verification, availability    | Evidence requirement IDs; adapter requirement and executable, advisory or unavailable status. A text skill may guide a host without being executable.            |

Proposed Zod shape, expressed as a schema sketch inside this specification. The predicate vocabulary is closed and typed; the manifest builder must also validate reference existence and cross-field constraints.

```ts
const id = z.string().min(1).max(160);
const signal = z.strictObject({
  fact: z.enum(['mode', 'path', 'symbol', 'impactTier', 'topology', 'availability']),
  operator: z.enum(['equals', 'has', 'atLeast']),
  value: z.union([z.string().min(1).max(256), z.int().min(0).max(3)]),
});
const CapabilityDescriptor = z.strictObject({
  id,
  operationId: id,
  surface: z.enum(['cli', 'mcp', 'agent', 'skill', 'workflow']),
  locator: id,
  provenance: z.strictObject({ sourceFile: id, definitionKey: id }),
  sideEffectClass: z.enum(['read', 'write', 'exec', 'policy']),
  riskTier: z.int().min(0).max(3),
  estimatedCostTier: z.enum(['low', 'medium', 'high']),
  idempotent: z.boolean(),
  preconditions: z.array(signal),
  triggerSignals: z.array(signal),
  verification: z.array(id),
  availability: z.strictObject({
    kind: z.enum(['executable', 'advisory', 'unavailable']),
    adapter: id,
  }),
});
```

Use a single strict object with a surface discriminator. Refine each locator against its surface inventory; permit numeric comparison only for impact tier. Derive names from each surface, join reviewed metadata by stable ID, sort deterministically, serialize without timestamps or absolute paths. Fail validation on missing or stale descriptors, repeated IDs, unreachable targets, unresolved aliases, unclassified effects and inconsistent permissions. Enumerate and diff in both directions against **actual dispatch**, including parameterized actions. Disagreement between advertised and callable entries is drift. Never repair drift by registering a phantom. Run the integrity check through both existing validation scripts; repeated clean builds must be byte-identical.

## Stage 2 · IntentContext and RelevanceEngine

Proposed `IntentContext` carries speech act (discuss, plan, implement, modify, debug), requested outcome, explicit targets, trusted root, normalized touched paths, base and working-tree digests, topology/blast evidence, impact tier with provenance, evidence freshness, turn ID and budget. Mark unavailable signals unknown. Keep user-provided text and untrusted repository contents as data. The host supplies event identity and authorizations separately.

Extend the existing routing entry point with `rank(context, descriptors) → ExecutionPlan`. Require both an actionable speech act and an independently observed matching file, symbol, topology edge or change for escalation. A dirty tree alone is insufficient. For greenfield work inspect existing repository structure read-only to corroborate the target. On ambiguous, missing or stale evidence, return bounded inspection or deliberate no-op. Planning may return a preview with zero dispatches.

Rank only candidates satisfying availability, effect and scope constraints. Require a direct target match and an unmet evidence requirement for each selected operation. Choose the lowest-cost covering set, break ties by stable ID, deduplicate aliases, and record which requirement each node discharges. Rank high risk by required architectural and security evidence before cost optimization. A plan includes context/manifest digests, scoped node IDs, prerequisites, required/optional flag, rationale with signal references, estimated tokens/time, and required verification. No executable command text or approval credentials.

**Fast path acceptance.** Consume a bounded in-memory classification input before disk, Git, topology, model or MCP calls. Discussion and known Tier 0 edits produce zero capability invocations. A button-color edit may inspect a host-supplied CSS diff and perform minimal deterministic local checks inline. If the host supplied no diff, report verification pending. A targeted UI inspection requiring a tool belongs to a separately corroborated Tier 1 event. Benchmark classification only and report cold process startup separately. Proposed gate: p99 below 10 ms on a recorded reference machine.

| Fixture                                 | Expected coverage                                                                                                                           | Forbidden dispatch                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Discuss authentication in documentation | Deliberate no-op, irrespective of unrelated auth diff                                                                                       | Auth specialists, writes, tests                                  |
| Change one button color                 | Matched component and changed declaration; inline inspection for Tier 0; one scoped inspection/check if Tier 1 requires it                  | Full design loop or tribunal-wide review                         |
| Build JWT authentication                | Corroborated auth boundary; architecture and targeted security review, scoped approval handoff, focused auth verification                   | Autonomous approval or generic shell                             |
| Fix SQL injection                       | Matched data-access path; architectural inspection and targeted security review, approved change, focused parameterization regression tests | Broad unrelated reviews or treating optional passes as clearance |

## Stage 3 · Authority, orchestration and integration

The deterministic PolicyGate consumes the unsigned plan, canonical descriptor, trusted host identity, current repository and policy digests, trusted approval state and remaining budget. Resolve all references server-side, recompute scope and classify actual effects immediately before **each** dispatch. Return allow, await approval or deny with a reason. Unknown operations, policy drift, invalid envelopes and inconsistent evidence fail closed.

| Effective action                                         | Default disposition                    | Evidence needed                                                                                                                                                                                              |
| -------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Bounded read, config inspection, dependency analysis     | Allow                                  | Canonical in-root target; read-only implementation; no implicit installs, hooks, cache writes or outbound traffic                                                                                            |
| Safe targeted test                                       | Allow under policy                     | Trusted pinned runner and arguments, verified fixtures, isolated write scope, bounded resources/network. Repository-defined scripts that can run arbitrary code require separate authorization or isolation. |
| Source write                                             | Hand off                               | ControlledWriteService request and preview; separate authenticated human approval bound to exact content, scope, root, policy and expiry; commit after digest recheck                                        |
| Deletion or security-policy change                       | Explicit action-specific authorization | Trusted human approval covering the elevated operation and the same write transaction requirements                                                                                                           |
| Arbitrary shell, unknown side effect, unapproved network | Deny by default                        | No escalation through nested agents, alternate surfaces or caller fields                                                                                                                                     |

**Approval boundary.** The MCP service is constructed with workspaceRoot alone. Its approval handler accepts approver information and the service conditionally enforces signature checks. Treat that configuration as incapable of proving independent human approval. Keep approval in the existing service with a trusted out-of-band credential, fail closed when unavailable, and prevent the autonomous caller from generating or supplying its own authority. Test across independent MCP clients, stale previews, changed files, alias paths and restart. A request/preview is a pending state, never completion.

**ExecutionEnvelope.** Issue `{rootRunId, parentRunId, depth, maxDepth, seenCapabilities}` from the trusted coordinator. Freeze snapshots deeply; use immutable arrays of reservation keys, not mutable Sets exposed to callers. A separate atomic root ledger controls sibling races. Bind each key to operation identity, scoped normalized inputs and repository digest. Root has null parent and depth zero; increment depth by one, reject unknown parent, mismatched root, depth overflow, ancestry repetition and re-entry from a specialist. Child contexts can only narrow permissions, budgets and deadlines. Correlate MCP and hook deliveries with the trusted turn/event ID. Check identity before any side effect.

Validate the complete DAG before acquiring resources; admit ready nodes within root concurrency, wait and budget limits. Attach envelopes to OperationRegistry and CancellationContext. Bridge start, block, cancel, fail and verify transitions to StateMachineEngine and ActivityTracker. Cancel descendants and release reservations in finally; retain the terminal or uncertain outcome for deduplication. Never retry an operation with an unconfirmed side effect. Checkpoint only sanitized plan IDs, digests, ledger states and evidence references. Reconcile before restart. QuorumAndAggregationEngine must treat required security/policy failures and missing required evidence as blocking. Prove this with optional passes outnumbering a critical failure.

**Budgets and cache.** Enforce limits before first dispatch in Stage 3 even though adaptive tuning ships in Stage 4. Reserve capability count, estimated tokens and deadline atomically per root across children; debit actual use, bound response sizes and stop new work on exhaustion. Proposed initial ceilings for replay calibration: 6 capabilities, 2,000 overhead tokens and 30 seconds per turn; zero dispatch allowance on deliberate no-ops. A paused approval resumes with explicit revalidation. Hash capabilityId, normalized targetScope and repoStateHash using canonical serialization. Bind inputs, manifest/tool/policy versions, root and verifier configuration to the key or its namespace. Include dirty and untracked relevant content; disable reuse when state is unknowable. Cache only verified, deterministic read results with identical authority and visibility. Never cache approval, write success as permission, uncertain outcomes or stale evidence.

**Integration.** Expose plan and bounded execution through validated MCP handlers and McpResponseOptimizer. Resolve an opaque server-held plan reference at execution. Host hooks contribute authenticated lifecycle evidence and suppress self-originated events; install only for supported host events. Hosts without hooks use explicit MCP calls. CLI offers equivalent direct/CI entry points through lazy dispatch with CJS/ESM/declaration parity. Proxies supply optional passive hints only. Route events through deepClone, redactSecrets and sanitizeActivityEvent; use bounded cycle-safe serialization before logging or transport. Never retain raw prompts or secrets in replay or cache keys.

## Stage 4 · Paired replay and acceptance

Freeze a versioned corpus of 100 labeled turns: 30 deliberate no-ops, 25 localized Tier 1, 25 high-risk Tier 2/3 and 20 adversarial or recursion cases. Each fixture defines initial repo snapshot, trusted host event, user request, allowed/required/forbidden capability IDs, scope, authorization transcript, manual command sequence, evidence contract and expected terminal state. Freeze labels before tuning; stratify a held-out subset within each bucket. Replay manual and automatic routes from identical isolated snapshots and policies. Compare evidence and filesystem deltas. Run cold, warm, duplicate-delivery, stale-cache, cancellation, concurrent-sibling and restart variants, injecting deterministic failures. Count paired cases once; report fault variants separately.

Report per bucket and overall: selection precision (relevant selected / all selected, undefined when empty), required capability recall, manual commands saved (baseline user invocations minus remaining user invocations), unnecessary and duplicate executions, actual unauthorized effects, verified required outcomes / applicable outcomes, and end-to-end p50/p95 latency plus overhead tokens relative to manual baseline. Separate waiting for approval from compute. Publish raw denominators, sample sizes, environment and cache status. Count denied attempts separately from violations. A failed or cancelled run cannot count as verified completion. Gate on zero violations, zero duplicate effects, zero deliberate-no-op invocations, all mandatory evidence covered for completed cases and critical failures always blocking. Record measured precision, latency and token tradeoffs before adopting tuning changes. Optional ONNX classifier returns ranked hints through the same input/output contract; timeouts, absence and invalid output fall back to deterministic routing. Never pass classifier output as authority.

## Phase gates

1. Registry and manifest integrity: focused schema, negative inventory and determinism tests, Jest, typecheck, payload and reference validation.
2. Routing: four mandatory fixtures plus missing/stale evidence, coincidental dirty files and deterministic latency measurement; Jest and typecheck.
3. Execution: focused unit and MCP integration tests, authority isolation, recursive dispatch, resource exhaustion, concurrent duplicates, cancellation, checkpoint recovery, required-failure dominance, lazy loading and CJS/ESM/types parity; typecheck, lint and Rust tests.
4. Replay: full unit and integration suites, Rust tests, typecheck, payload validation, paired benchmark, then approved mirror synchronization via `npm run sync` and post-sync verification. Preserve existing workspace edits. Record exact commands, exits, counts and unresolved risks; stop for human sign-off after each phase.

## Phase 0 verification record

All commands below ran in the nested package. These results establish a baseline for existing behavior. Autopilot implementation, latency, authenticated approval and replay results are pending their phase gates.

| Command executed                                                                                                                                                                                | Exit | Observed result                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---: | --------------------------------------------------------------------------------------------------------------------------- |
| `node ./node_modules/jest/bin/jest.js --runInBand --no-coverage --runTestsByPath test/unit/contract_engine.test.js test/unit/skill_routing_decision.test.js test/integration/routing.test.js`   |    0 | 3/3 suites, 18/18 tests, 0 snapshots                                                                                        |
| `npm.cmd run typecheck`                                                                                                                                                                         |    0 | TypeScript completed without diagnostics; no test count emitted                                                             |
| `npm.cmd run validate-payload`                                                                                                                                                                  |    0 | 670 payload files checked, 398 skills verified, 129 links audited, 39 references checked; mirror check reported 0 mutations |
| `node -e "const m=require('./.agent/scripts/integrity_manifest.js').generateManifest(process.cwd()); console.log(m.agents.total,m.skills.total,m.scripts.total,m.workflows.total,m.integrity)"` |    0 | Inventory and outstanding scanner findings reported above                                                                   |

Source discovery used rg listings, declaration searches and targeted Get-Content reads. Initial Windows wildcard probes for the fault engine and cache files failed; directory-scoped rg globs succeeded. A matching plugin JavaScript search returned no matches. The working tree already contained changes including `src/commands/hook.js`. The only authored file in this phase is `docs/PLAN-tribunal-autopilot.md`.

<details><summary>Exact package-source inventory and reproducible PowerShell read command</summary>

```powershell
$explicit = '.agent/agents/orchestrator.md','.agent/config/slash-commands.json','.agent/config/specialist-registry.json','.agent/scripts/benchmark_suite.js','.agent/scripts/blast_radius_engine.js','.agent/scripts/codebase_intelligence.js','.agent/scripts/context_broker.js','.agent/scripts/context_compiler.js','.agent/scripts/impact_classifier.js','.agent/scripts/integrity_manifest.js','.agent/scripts/intent_extractor.js','.agent/scripts/pipeline_engine.js','.agent/scripts/prompt_compiler.js','.agent/scripts/routing_evaluation_engine.js','.agent/scripts/skill_intelligence.js','.agent/scripts/trace_engine.js','.agent/skill_topic_map.json','.agent/skills/agent-organizer/SKILL.md','.agent/skills/parallel-agents/SKILL.md','.agent/skills/plan-writing/SKILL.md','AGENTS.md','AI_CONTEXT.md','AI_RULES.md','ARCHITECTURE.md','bin/adapter-install.js','bin/mcp-server.js','bin/proxy-server.js','bin/tk-proxy.js','bin/wrapper.js','crates/core/Cargo.toml','crates/core/src/commands/context_broker.rs','crates/core/src/commands/dag_scheduler.rs','crates/core/src/commands/skill_resolver.rs','hooks/hooks-cursor.json','hooks/hooks.json','hooks/session-start.js','package.json','scripts/sync-routing-index.js','src/activity/announcement.js','src/activity/registry.js','src/activity/resolver.js','src/activity/schema.js','src/activity/tracker.js','src/browser/audit.js','src/cli.js','src/commands/contract.js','src/commands/hook.js','src/commands/skill-intelligence.js','src/commands/understand.js','src/esm/index.mjs','src/execution/agent_dispatcher.js','src/execution/controlled_write_service.js','src/execution/transaction_manager.js','src/execution/validation_runner.js','src/execution/write_policy_engine.js','src/index.d.ts','src/mcp/response_optimizer.js','src/runtime_reliability/checkpoint_recovery_engine.js','src/runtime_reliability/fault_injection_engine.js','src/runtime_reliability/retry_and_timeout_engine.js','src/security/boundary.js','src/system1/decision_engine.js','src/system1/index.d.ts','src/system1/provider.js','src/system1/repository_cache.js','src/system1/repository_cache_contract.js','src/system1/reviewer_orchestrator.js','src/system1/reviewer_selection.js','src/utils/path_containment.js','src/verification/contract_engine.js','test/integration/routing.test.js','test/unit/contract_engine.test.js','test/unit/skill_routing_decision.test.js'
$dirs = 'src/system1','src/commands','src/execution','src/security','src/runtime_reliability','src/activity','src/design_intelligence','plugins'
$files = @($explicit) + @(Get-ChildItem -File -Recurse $dirs | ForEach-Object { (Resolve-Path -Relative $_.FullName).Substring(2).Replace('\','/') }) | Sort-Object -Unique
foreach ($file in $files) { if (!(Test-Path -LiteralPath $file -PathType Leaf)) { throw "Missing $file" }; $null = [IO.File]::ReadAllText((Resolve-Path -LiteralPath $file)); $file }
```

Exit 0. Paths opened for the inventory are listed below. The routing table identifies the definitions used to make architectural decisions.

```text
.agent/agents/orchestrator.md
.agent/config/slash-commands.json
.agent/config/specialist-registry.json
.agent/scripts/benchmark_suite.js
.agent/scripts/blast_radius_engine.js
.agent/scripts/codebase_intelligence.js
.agent/scripts/context_broker.js
.agent/scripts/context_compiler.js
.agent/scripts/impact_classifier.js
.agent/scripts/integrity_manifest.js
.agent/scripts/intent_extractor.js
.agent/scripts/pipeline_engine.js
.agent/scripts/prompt_compiler.js
.agent/scripts/routing_evaluation_engine.js
.agent/scripts/skill_intelligence.js
.agent/scripts/trace_engine.js
.agent/skill_topic_map.json
.agent/skills/agent-organizer/SKILL.md
.agent/skills/parallel-agents/SKILL.md
.agent/skills/plan-writing/SKILL.md
AGENTS.md
AI_CONTEXT.md
AI_RULES.md
ARCHITECTURE.md
bin/adapter-install.js
bin/mcp-server.js
bin/proxy-server.js
bin/tk-proxy.js
bin/wrapper.js
crates/core/Cargo.toml
crates/core/src/commands/context_broker.rs
crates/core/src/commands/dag_scheduler.rs
crates/core/src/commands/skill_resolver.rs
hooks/hooks.json
hooks/hooks-cursor.json
hooks/session-start.js
package.json
plugins/claude/marketplace.json
plugins/claude/plugin.json
plugins/codex/plugin.json
plugins/core-plugin.json
plugins/cursor/plugin.json
plugins/devin/plugin.json
plugins/gemini/extension.json
plugins/hermes/__init__.py
plugins/hermes/plugin.yaml
plugins/kimi/plugin.json
plugins/marketplace.json
plugins/opencode/INSTALL.md
plugins/opencode/plugins/tribunal.js
plugins/opencode/rules.md
plugins/pi/extensions/tribunal.ts
scripts/sync-routing-index.js
src/activity/announcement.js
src/activity/design_system.js
src/activity/diagnostics.js
src/activity/environment.js
src/activity/index.js
src/activity/lifecycle.js
src/activity/progressive_disclosure.js
src/activity/registry.js
src/activity/renderers/json.js
src/activity/renderers/markdown.js
src/activity/renderers/plaintext.js
src/activity/renderers/structured.js
src/activity/renderers/terminal.js
src/activity/resolver.js
src/activity/schema.js
src/activity/summary.js
src/activity/telemetry.js
src/activity/tracker.js
src/activity/truncation.js
src/activity/types.js
src/browser/audit.js
src/cli.js
src/commands/activity.js
src/commands/align.js
src/commands/arch.js
src/commands/audit-web.js
src/commands/browse.js
src/commands/case.js
src/commands/compare-web.js
src/commands/compile.js
src/commands/context.js
src/commands/contract.js
src/commands/deconstruct.js
src/commands/evalopt.js
src/commands/evolve.js
src/commands/graph.js
src/commands/guardrail.js
src/commands/heal.js
src/commands/hook.js
src/commands/init.js
src/commands/intelligence.js
src/commands/learn.js
src/commands/marathon.js
src/commands/memory.js
src/commands/minimal.js
src/commands/mutate.js
src/commands/native.js
src/commands/optimize.js
src/commands/review.js
src/commands/rsi.js
src/commands/sdd.js
src/commands/skill-intelligence.js
src/commands/status.js
src/commands/sync.js
src/commands/system1.js
src/commands/understand.js
src/commands/uninstall.js
src/commands/update.js
src/commands/validate.js
src/design_intelligence/art_direction_engine.js
src/design_intelligence/browser_verification_bridge.js
src/design_intelligence/color_harmony_engine.js
src/design_intelligence/component_state_engine.js
src/design_intelligence/design_token_schemas.js
src/design_intelligence/index.js
src/design_intelligence/spatial_layout_engine.js
src/design_intelligence/visual_defect_analyzer.js
src/esm/index.mjs
src/execution/agent_contracts.js
src/execution/agent_correction_engine.js
src/execution/agent_dispatcher.js
src/execution/agent_runtime.js
src/execution/canonical_registry.js
src/execution/conflict_resolver.js
src/execution/controlled_write_service.js
src/execution/correction_run_engine.js
src/execution/correction_verifier.js
src/execution/evidence_aggregator.js
src/execution/evidence_bus.js
src/execution/finding_diff_engine.js
src/execution/index.js
src/execution/kernel_scheduler.js
src/execution/prompt_isolator.js
src/execution/provider_adapter.js
src/execution/resolution_certificate.js
src/execution/resolution_policy.js
src/execution/review_executor.js
src/execution/reviewer_registry.js
src/execution/schemas.js
src/execution/skill_execution_coordinator.js
src/execution/transaction_manager.js
src/execution/validation_runner.js
src/execution/verdict_aggregator.js
src/execution/write_policy_engine.js
src/index.d.ts
src/mcp/response_optimizer.js
src/runtime_reliability/cancellation_context.js
src/runtime_reliability/checkpoint_recovery_engine.js
src/runtime_reliability/execution_state_schemas.js
src/runtime_reliability/failure_classifier.js
src/runtime_reliability/fault_injection_engine.js
src/runtime_reliability/index.js
src/runtime_reliability/quorum_and_aggregation_engine.js
src/runtime_reliability/resource_guard_engine.js
src/runtime_reliability/retry_and_timeout_engine.js
src/runtime_reliability/state_machine_engine.js
src/security/boundary.js
src/security/data_leakage_engine.js
src/security/execution_safety_engine.js
src/security/index.js
src/security/multi_agent_governance_engine.js
src/security/prompt_injection_engine.js
src/security/threat_model_schemas.js
src/security/tool_permission_engine.js
src/system1/anomaly_detector.js
src/system1/browser_intelligence.js
src/system1/confidence_contract.js
src/system1/confidence_evaluator.js
src/system1/constants.js
src/system1/decision_engine.js
src/system1/decision_plan.js
src/system1/drift_contract.js
src/system1/evidence_engine.js
src/system1/evidence_pack.js
src/system1/evidence_request_schema.js
src/system1/evidence_resolver.js
src/system1/evolution_pipeline.js
src/system1/index.d.ts
src/system1/index.js
src/system1/laya-package.json
src/system1/laya-package-lock.json
src/system1/progressive_context.js
src/system1/provider.js
src/system1/repository_cache.js
src/system1/repository_cache_contract.js
src/system1/reviewer_orchestrator.js
src/system1/reviewer_selection.js
src/system1/trust_timeline.js
src/system1/trust_timeline_contract.js
src/utils/path_containment.js
src/verification/contract_engine.js
test/integration/routing.test.js
test/unit/contract_engine.test.js
test/unit/skill_routing_decision.test.js
```

</details>
