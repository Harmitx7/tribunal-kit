# Tribunal Autopilot · Phase 2 verification

The System-1 planner combines speech act, the requested repository paths, and a trusted workspace snapshot. Discussion and Tier 0 edits return zero capability nodes. Uncorroborated or stale targets return an inspection-needed result. Higher tiers rank unsigned recommendations from the existing manifest.

| Changed file | Responsibility |
| --- | --- |
| `.agent/scripts/intent_extractor.js` | Classify the leading request as discussion, planning, implementation, modification, or debugging. Existing extraction callers retain their contract. |
| `src/autopilot/intent_context.js` | Normalize evidence, corroborate scope, combine existing impact scores and scoped blast risks, and check a supplied single-color CSS change inline. |
| `src/autopilot/workspace_evidence.js` | Collect bounded read-only Git state and use the existing blast-radius engine for a precomputed topology model tied to the current digest. |
| `src/autopilot/relevance_engine.js` | Rank eligible manifest entries by required evidence, estimated cost, and stable ID. Apply budget limits and the existing announcement suppression policy. |
| `src/system1/decision_engine.js` | Plan through the existing System-1 entry point. Load ranking only when the fast path does not apply. |
| `src/system1/index.js` and `src/system1/index.d.ts` | Expose the planner and optional evidence collector at the System-1 module boundary. |
| `test/unit/autopilot_routing.test.js` | Exercise no-ops, targeted UI, JWT, defensive SQL repair, stale evidence, budgets, topology, and latency. |
| `docs/PHASE-2-autopilot-verification.md` | Record Phase 2 verification evidence. |

The caller supplies explicit repository-relative targets. Clean tracked targets can be corroborated through exact filesystem observation. The optional topology model must carry the working-tree digest it describes. Missing or oversized Git evidence yields an inspection-needed outcome when supplied to the planner. Approval and focused verification are recorded as evidence requirements on high-impact changes. Security and testing specialists are advisory recommendations.

The routing audit also inspected `.agent/scripts/impact_classifier.js`, `.agent/scripts/blast_radius_engine.js`, `.agent/scripts/codebase_intelligence.js`, `.agent/skill_topic_map.json`, `src/commands/understand.js`, `src/activity/announcement.js`, `src/activity/types.js`, `src/utils/path_containment.js`, and `src/autopilot/capabilities.json`. The package grounding files were `AI_CONTEXT.md`, `AI_RULES.md`, `ARCHITECTURE.md`, `package.json`, and `crates/core/Cargo.toml`.

## Verification commands

| Command | Exit | Evidence |
| --- | ---: | --- |
| `npm.cmd run validate-payload` | 0 | 670 payload files, 398 skills, 129 links, 39 references and 837 capability descriptors |
| `npm.cmd run typecheck` | 0 | No diagnostics |
| `node ./node_modules/eslint/bin/eslint.js src/autopilot/intent_context.js src/autopilot/relevance_engine.js src/autopilot/workspace_evidence.js src/system1/decision_engine.js src/system1/index.js .agent/scripts/intent_extractor.js test/unit/autopilot_routing.test.js` | 0 | No diagnostics |

The command below exited 0 with 146 tests passed across 12 suites and 0 snapshots. It measured a warm classification p99 of 0.0514 ms across 1,000 samples, alternating between discussion and Tier 0. The same test detected zero filesystem reads and existence checks on those paths.

```powershell
node ./node_modules/jest/bin/jest.js --runInBand --no-coverage --verbose --testPathPatterns 'autopilot_|system1_decision_engine|system1_monotonic_ordering|impact_classifier|activity_announcements_phase4|skill_routing_decision|codebase_intelligence_routing'
```

The separate cold-process probe exited 0. On Node 22.23.2, Windows x64 and an Intel Core i5-10300H, 20 launches measured p50 96.92 ms and p95 107.14 ms, including Node startup and loading the System-1 decision module.

```powershell
node -e "const {spawnSync}=require('node:child_process');const {performance}=require('node:perf_hooks');const os=require('node:os');const times=[];for(let i=0;i<20;i++){const start=performance.now();const child=spawnSync(process.execPath,['-e', 'require(\x27./src/system1/decision_engine\x27).planAutopilot({task:\x27Discuss authentication\x27})']);if(child.status!==0)process.exit(1);times.push(performance.now()-start)}times.sort((a,b)=>a-b);console.log(JSON.stringify({node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0].model,samples:times.length,coldP50Ms:times[9].toFixed(2),coldP95Ms:times[18].toFixed(2)}))"
```

Phase 3 remains at the human approval gate. The claims above cover recommendation generation and evidence collection. Host lifecycle integration, approval provenance, execution, and verification of side effects have their own Phase 3 acceptance checks.
