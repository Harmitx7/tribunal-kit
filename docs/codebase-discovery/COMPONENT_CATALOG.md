# Component Catalog

| ID | Component | Contract / dependencies | Verification |
|---|---|---|---|
| COMP-001 | package entrypoints | `package.json` bins/exports -> wrapper/CLI | manifest/source verified |
| COMP-002 | wrapper/native resolver | selects optional/native binary then JS fallback | source verified |
| COMP-003 | JS CLI router | parses args and lazy-loads `src/commands` | args unit tests passed |
| COMP-004 | command adapters | translate CLI to engines/payload | source verified |
| COMP-005 | governance payload | `.agent` agents, skills, workflows, scripts, config | syntax validator passed |
| COMP-006 | execution pipeline | reviewer registry, validation, transactions, corrections | partial source/test evidence |
| COMP-007 | intelligence subsystem | cases, risk, failure, evidence, human/reviewer signals | source only |
| COMP-008 | System-1 subsystem | deterministic decision/evidence/trust/cache/evolution | decision unit tests passed |
| COMP-009 | context subsystem | AST packing, ranking, accounting, drift checking | source only |
| COMP-010 | browser subsystem | CDP/browser auditing, comparison and proxy | source only |
| COMP-011 | evaluation/evolution | adversarial scenarios, worktrees, co-evolution | source only |
| COMP-012 | security boundary | path/process containment and validation | historical and source evidence; not rerun |
| COMP-013 | MCP server | stdio protocol, payload/resources/tool handlers | unit suite passed |
| COMP-014 | Rust core | native commands, AST parsing/graph/TUI | source only |
| COMP-015 | integration adapters | Claude/Aider/OpenCode/Hermes/Pi/hooks/proxy | source/docs only |
| COMP-016 | quality/release tooling | CI, tests, scripts, npm/Cargo packaging | config verified |

Strength: lazy CLI modules and native fallback separate command routing from compute. Concerns: the duplicated payload trees and JS/Rust command surfaces require explicit contract regression testing; documentation can outpace dispatch wiring.
