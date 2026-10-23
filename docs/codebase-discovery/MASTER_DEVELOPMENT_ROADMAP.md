# Master Development Roadmap

| Task | Priority / effort | Objective | Evidence / acceptance criteria |
|---|---|---|---|
| TASK-001 | P1 / XS | Restore and validate release metadata checker | FIND-002; user approves exact restoration; script detects a deliberately mismatched fixture/version |
| TASK-002 | P1 / XS | Wire `skill-intel` CLI command | FIND-001; `tk skill-intel --help` reaches `cmdSkillIntel`; add route regression test |
| TASK-003 | P1 / M | Establish non-mutating full verification in a disposable worktree | FIND-003; executes Node/Rust suites without altering primary worktree |
| TASK-004 | P2 / M | Add command-to-documentation contract test | FIND-001/FIND-005; every documented command and public claim is reconciled with dispatch/manifest |
| TASK-005 | P2 / L | Define payload ownership/synchronisation contract | FIND-004; canonical source, synchronization rule and parity tests documented |
| TASK-006 | P2 / M | Add representative adapter/MCP/browser integration matrix | FIND-006; controlled tests cover MCP and each supported adapter or mark unsupported |
| TASK-007 | P3 / S | Correct dependency messaging | FIND-005; README distinguishes production, optional-native and developer dependencies |

All implementation requires the mandatory approval gate. TASK-001 and TASK-002 are independent, but both should precede claims/releases; TASK-003 precedes high-confidence completion claims; TASK-005 precedes corpus restructuring.
