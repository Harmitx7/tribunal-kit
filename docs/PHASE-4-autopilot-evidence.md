# Tribunal Autopilot · Final verification evidence

**Verification status.** Phase 4 implementation, replay, and isolated checks passed. The full-suite release gate remains open because a clean uninterrupted run on the final workspace was unavailable.

## Implementation

Autopilot's result cache applies to verified architecture reads. Its key binds the capability ID, sorted target scope, Git state, actual scanner inputs, repository identity, policy revision, manifest, inspector configuration, and Node version. The bounded in-memory store retains up to 64 entries for two minutes. A hit still goes through policy and freshness checks. Failed or cancelled inspection, unknown scope, and incomplete source fingerprints cannot produce cache entries. Approval and write state stay in the existing controlled write service.

Planning and execution share a wall-clock allowance. The planner limits capability count and estimated cost. The runtime reserves each declared turn once, checks remaining time across Git evidence collection and inspection, and meters plan and result tokens with the MCP estimator. These are application estimates based on serialized characters. Control messages still return when the allowance is exhausted. Calls without a turn ID are independent requests.

The System-1 classifier hint contract accepts a versioned, bounded list of capability IDs from a trusted classifier integration. A hint can break a tie after eligibility and cost checks. Invalid hints fall back to deterministic ordering. The fast path does not load an inference model.

| Changed file | Responsibility |
| --- | --- |
| `src/autopilot/result_cache.js` | Content keys, scanner input fingerprint, admissible result shape, eviction and expiry |
| `src/autopilot/service.js` and `src/autopilot/workspace_evidence.js` | Cache admission after policy, freshness checks, turn and runtime budgets, bounded Git work |
| `src/autopilot/relevance_engine.js`, `src/system1/decision_engine.js`, `src/system1/index.d.ts` | Validated classifier hints and deterministic fallback |
| `src/mcp/token_estimate.js` and `src/mcp/response_optimizer.js` | Shared token estimator with the existing response API preserved |
| `benchmarks/corpus/autopilot.js`, `scripts/benchmark-autopilot.js`, `package.json` | Golden labels, executable paired replay, npm benchmark entry point, and aligned Jest garbage-collection flags |
| `test/unit/autopilot_cache_budget.test.js` | Content-addressing, warm and stale production-cache behavior, per-turn budgets, classifier fallback |
| `test/unit/platform_download_audit.test.js` | Platform audit checks both Claude lifecycle events against the installed hook format |
| Parent workspace `.agent/scripts/intent_extractor.js` | Synced canonical classifier change. Checked SHA-256 equality for intent extraction, architecture extraction and codebase intelligence. |

## Replay methodology

The 100-turn corpus contains 30 deliberate no-ops, 25 localized edits, 25 Tier 2 and Tier 3 tasks, and 20 adversarial inputs. The final fixture group holds out 20 turns in the same proportions. The paired routes consume identical synthetic snapshots with separately declared manual capability choices. The simulated architecture adapter returns bounded read evidence. The replay does not submit external requests, launch specialists, or apply changes. A separate throwaway Git fixture exercises the production inspector and cache.

Selection precision uses relevant selections divided by all selections. Recall uses relevant selections divided by labeled required selections. Evidence coverage counts only relevant completed evidence checks. The paired timing measures attempts through their observed terminal status, including handoffs awaiting evidence. The token estimate measures serialized replay output and excludes model-provider usage. The manual command count represents capability choices that the plan replaces. The Autopilot call count includes plan and execute requests.

Fault variants exercise injected inspector crash, duplicate concurrent delivery and replay, loss of process-local state, unknown plan IDs, fabricated approval fields, and pending cancellation. The cache probe checks cold miss, warm hit, and invalidation after an ignored source file changes.

## Replay results

| Bucket | Turns | Relevant / selected | Required selected / required | Evidence verified / required | Read dispatches |
| --- | ---: | ---: | ---: | ---: | ---: |
| Deliberate no-op | 30 | 0 / 0 | 0 / 0 | 15 / 15 | 0 |
| Localized edit | 25 | 20 / 30 | 20 / 25 | 0 / 25 | 5 |
| High risk (5 Tier 2, 20 Tier 3) | 25 | 70 / 70 | 70 / 70 | 25 / 120 | 25 |
| Adversarial | 20 | 0 / 0 | 0 / 0 | 0 / 0 | 0 |
| **Overall** | **100** | **90 / 100** | **90 / 95** | **40 / 160** | **30** |
| Held-out subset | 20 | 18 / 20 | 18 / 19 | 8 / 32 | 6 |

The replay observed zero policy violations, zero duplicate executions and zero dispatches for deliberate no-ops. All six fault variants passed. Five localized refactors were classified Tier 2 by the existing structural-refactor heuristic. Those cases account for ten unnecessary recommendations, five unnecessary bounded inspections and five missed UI recommendations. The fifty change cases ended with evidence still pending.

Autopilot replaced 95 manual capability choices and made 150 plan or execute calls. The paired synthetic attempts measured p50/p95 of 7.090/15.385 ms for Autopilot and 0.003/0.020 ms for the scripted manual baseline. Estimated output was 24,293 tokens for Autopilot and 1,515 for the scripted baseline, a difference of 22,778 across the 100 turns.

The production cache probe reported a cold miss at 3,434.518 ms, a warm hit at 3,716.306 ms, and a miss after the ignored source change at 3,493.117 ms. Each condition ran once on Windows x64 with Node 22.23.2 while repository verification was running. The warm hit avoided an inspector launch and took 281.788 ms longer end to end than the cold sample.

## Verification commands

| Command | Exit | Evidence |
| --- | ---: | --- |
| `npm.cmd run sync` | 0 | Release version and public asset counts matched across six documents |
| `npm.cmd run validate-references` | 0 | 843 descriptors, 398 skills, 129 links and 39 references |
| `npm.cmd run typecheck` | 0 | No diagnostics |
| `npm.cmd run lint` | 0 | No diagnostics |
| `npm.cmd run benchmark:autopilot` | 0 | 100 paired turns, six fault variants, and three production cache probes |

The focused Jest run exited 0 with 27 tests in 3 suites.

```powershell
node ./node_modules/jest/bin/jest.js --runInBand --no-coverage --testPathPatterns 'autopilot_cache_budget|autopilot_execution|mcp_response'
```

The original `npm.cmd run test:all` exited 1 with 374 of 378 suites and 5,443 of 5,447 tests passing. It used a different Jest launch command than `npm test`. Its failures covered the retained-heap assertion, two codebase-intelligence timing thresholds, and an outdated hook-shape assertion. The corrected command enables garbage collection without changing the heap threshold. The platform audit passed 9/9 after updating the hook assertion.

The corrected `npm.cmd run test:all` exited 1. Payload validation and the 94 Rust tests passed. Jest passed 377 of 378 suites and 5,446 of 5,447 tests. Its sole failure compared Git status across a scan that overlapped the platform-audit edit. The final loopback-enabled whole-suite launch was declined by the approval review and did not execute. The affected integration suite passed independently on the stable workspace.

| Isolated verification command | Exit | Evidence |
| --- | ---: | --- |
| `node --expose-gc ./node_modules/jest/bin/jest.js --runInBand --no-coverage --runTestsByPath test/unit/platform_download_audit.test.js` | 0 | 1/1 suite, 9/9 tests, 0 snapshots |
| `node --expose-gc ./node_modules/jest/bin/jest.js --runInBand --coverage --forceExit --runTestsByPath test/integration/codebase_intelligence_workflow.test.js` | 0 | 1/1 suite, 6/6 tests, 0 snapshots |

Raw replay JSON was saved at `scratch/phase4-replay.json`. Its SHA-256 is `FA05AC5A9C88FC04B7E182CBD2585355339A0CD1B673CA39518592ADC62433B7`.

## Release scope

Specialist reviews and functional validation are still pending where the runtime has only a read adapter. The corpus cannot establish production task-completion latency or live behavior across hosts. Cache reuse and operation state are scoped to one service process. The policy, signed write handoff, targeted Phase 3 checks, and deployment limits are recorded in [Phase 3 verification](PHASE-3-autopilot-verification.md).
