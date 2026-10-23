# Findings and Technical Debt

| ID | Classification / severity | Evidence | Impact / recommended action |
|---|---|---|---|
| FIND-001 | RESOLVED / VERIFIED | `src/cli.js` now routes `skill-intel` and `skill-intelligence` to `cmdSkillIntel`; verified via `cli_contract.test.js` and CLI invocation | Supported command is now fully operational via CLI and IDE agents. |
| FIND-002 | RESOLVED / VERIFIED | `scripts/sync-version.js` restored from HEAD; `git diff --check` passes cleanly; release metadata check passes across all 4 documents | Release metadata CI command and count assertions verified in sync (60 agents, 31 reviewers, 234 skills, 51 workflows, 106 scripts). |
| FIND-003 | VERIFICATION_GAP / MEDIUM | package test scripts collect coverage; audit did not run write-producing full Node/Rust suites | most feature claims lack current-run verification. Run isolated disposable-worktree/full CI-equivalent tests. |
| FIND-004 | ARCHITECTURAL_CONCERN / MEDIUM | source has parallel JS CLI/engines, Rust core and duplicated `.agent`/`.agents`/`skills` corpora | drift risk across command/payload/native contracts. Define ownership and parity tests before refactor. |
| FIND-005 | TECHNICAL_DEBT / LOW | README says “zero dependencies” while `package.json` declares `zod` production dependency and optional native packages | public documentation is inaccurate; clarify runtime vs development/optional dependency claim. |
| FIND-006 | VERIFICATION_GAP / LOW | browser, adapters, proxy, native binary and model paths have no executed evidence in this audit | record environment requirements and add controlled integration coverage.

No confirmed security or performance issue was found in this read-only audit. Historical security reports were treated as supporting context, not current proof.
