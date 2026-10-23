# Implementation Phase Plan

## Phase 1 — restore the release and CLI contract

Tasks: TASK-001, TASK-002. Prerequisites: explicit user approval and decision on intended `scripts/sync-version.js` contents. Boundaries: only the release checker, CLI route, their tests, and documentation if needed. Acceptance: checker is meaningful and clean; `skill-intel` has a routing test; targeted tests pass. Rollback: revert the small approved diff. This phase comes first because it repairs an observable broken workflow and an advertised unreachable command before wider testing.

## Phase 2 — trustworthy verification

Tasks: TASK-003, TASK-004. Use disposable worktree/temporary outputs; no production integration credentials. Acceptance: documented command claim matrix plus reproducible Node/Rust validation results. Security: do not run install/deployment commands against user workspaces.

## Phase 3 — integration and maintainability

Tasks: TASK-005, TASK-006, TASK-007. Establish payload ownership before any directory consolidation; test integrations with sandboxed fixtures. Completion evidence: parity/integration results and updated documentation.
