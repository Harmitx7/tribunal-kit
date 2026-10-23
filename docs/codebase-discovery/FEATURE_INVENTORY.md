# Feature Inventory

Statuses use source reachability plus executed evidence; only the four selected suites and payload validator are verified in this audit.

| ID | Feature | Entry/source | Status | Evidence / gap |
|---|---|---|---|---|
| FEAT-001 | installation and IDE bridges | `init`, `src/commands/init.js`, Rust init | IMPLEMENTED_BUT_UNVERIFIED | dispatch exists; writes target project, not run |
| FEAT-002 | package update/status/uninstall | `update/status/uninstall` | IMPLEMENTED_BUT_UNVERIFIED | dispatch/source confirmed; mutating paths not run |
| FEAT-003 | governance payload validation | `scripts/validate-payload.js` | IMPLEMENTED_AND_VERIFIED | passed: 461 Markdown files |
| FEAT-004 | case-law memory | `case`, `src/commands/case.js` | IMPLEMENTED_BUT_UNVERIFIED | CLI dispatch confirmed |
| FEAT-005 | taxonomy memory | `memory`, command/Rust memory | IMPLEMENTED_BUT_UNVERIFIED | dispatch confirmed; storage not exercised |
| FEAT-006 | architecture graph/intelligence | `graph`, `arch`, `scripts/architecture_intelligence.js` | IMPLEMENTED_BUT_UNVERIFIED | source and tests exist |
| FEAT-007 | context retrieval/ranking/compression | `context`, `context-rank`, `context-compress` | IMPLEMENTED_BUT_UNVERIFIED | routed to JS/Rust helpers |
| FEAT-008 | governance alignment/minimal change | `align`, `minimal` | IMPLEMENTED_BUT_UNVERIFIED | source dispatch confirmed |
| FEAT-009 | learning and git hook | `learn`, `hook` | IMPLEMENTED_BUT_UNVERIFIED | potentially mutating; not run |
| FEAT-010 | compile/sync adapter payload | `compile`, `sync`, `tk-adapt` | IMPLEMENTED_BUT_UNVERIFIED | source and bins confirmed |
| FEAT-011 | review/correction pipeline | `review`, `execution/*` | PARTIALLY_IMPLEMENTED | source/tests present; end-to-end not run |
| FEAT-012 | skill intelligence | `src/commands/skill-intelligence.js` | IMPLEMENTED_AND_VERIFIED | CLI routes `skill-intel` and `skill-intelligence` verified with regression tests |
| FEAT-013 | skill optimization/evolution/red team | `optimize-skill`, `evalopt`, `evolve` | IMPLEMENTED_BUT_UNVERIFIED | command routes confirmed |
| FEAT-014 | contracts/guardrails/mutation | `contract`, `guardrail`, `mutate` | IMPLEMENTED_BUT_UNVERIFIED | command routes confirmed |
| FEAT-015 | native command utilities | `validate`, `min-context`, `dag-schedule`, `impact-tier` | IMPLEMENTED_AND_VERIFIED | validate-related unit suite passed |
| FEAT-016 | System-1 local inference tier | `system1`, `src/system1/*` | PARTIALLY_IMPLEMENTED | decision-engine unit suite passed; ONNX setup not run |
| FEAT-017 | intelligence queries | `intelligence` aliases, `src/intelligence/*` | IMPLEMENTED_BUT_UNVERIFIED | dispatch/source confirmed |
| FEAT-018 | browser audits/compare/deconstruct/heal | `browse`, `audit-web`, `compare-web`, `deconstruct`, `heal` | IMPLEMENTED_BUT_UNVERIFIED | command routes; browser runtime unverified |
| FEAT-019 | SDD workspace/brief/diff | `sdd`, `src/commands/sdd.js` | IMPLEMENTED_BUT_UNVERIFIED | source dispatch confirmed |
| FEAT-020 | MCP protocol server | `bin/mcp-server.js`, `src/mcp/server.js` | IMPLEMENTED_AND_VERIFIED | MCP unit suite passed |
| FEAT-021 | HTTP egress proxy | `tk-proxy`, `bin/tk-proxy.js` | IMPLEMENTED_BUT_UNVERIFIED | bin/source/security historical tests exist |
| FEAT-022 | Rust native core | `tribunal-core` | IMPLEMENTED_BUT_UNVERIFIED | source/manifest inspected; native tests not run |

Input/output and dependencies are catalogued in [COMPONENT_CATALOG.md](COMPONENT_CATALOG.md) and registry.
