# Changelog

All notable changes to the Tribunal Anti-Hallucination Agent Kit are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [2.4.0] — 2026-03-05

## [2.4.1] — 2026-03-09

### Changed
- **Verification-Before-Completion (VBC) Protocol**: Implemented a mandatory evidence-based closeout protocol across 10 core execution, debugging, and building skills (`systematic-debugging`, `tdd-workflow`, `plan-writing`, `python-pro`, `react-specialist`, `rust-pro`, `sql-pro`, `app-builder`, `clean-code`, `devops-incident-responder`). Sub-agents are now explicitly forbidden from declaring a task complete without providing concrete terminal or runtime evidence that their code succeeds.

---

## [2.4.0] — 2026-03-05

### Added
- **7 New Skills & Workflows**: `trend-researcher`, `ui-ux-researcher`, `whimsy-injector`, `workflow-optimizer`, `test-result-analyzer` (skills) and `/api-tester`, `/performance-benchmarker` (workflows).
- **GitHub-Powered Auto-Updater**: The CLI now bypasses npm entirely. `tribunal-kit update` checks the GitHub Releases API and pulls updates directly from the repository, dodging npm authentication and caching issues.
- **`--skip-update-check` Flag**: Bypass auto-update for CI/CD environments.
- **LLM Pre-Router (Intelligent Routing)**: Replaced the hardcoded routing table with a dynamic LLM Gateway. The AI now reads a condensed `router-manifest.md` to accurately select specialist agents before generating code.

### Changed
- **Enhanced Foundational Skills**: Upgraded the oldest skills (`clean-code`, `code-review-checklist`, `behavioral-modes`) with Tribunal Anti-Hallucination guards, strict context window discipline, and mode-leakage prevention.
- **Enhanced GEMINI.md**: Added 4 new request classification rows and 2 new slash commands. Overhauled the protocol to enforce the `intelligent-routing` Pre-Router over static fallback classification.

---

## [2.3.0] — 2026-03-03

### Added
- **Swarm / Supervisor Orchestration**: Introduced a multi-agent orchestration engine (`/swarm`) that decomposes complex goals into parallel specialist sub-tasks via a strict JSON contract.
- **Specialized Tribunal Panels**: Added focused workflows for `/tribunal-mobile` (logic + security + mobile UX) and `/tribunal-performance` (algorithmic complexity + memory + I/O).
- **Interactive Session State**: Enhanced `session_manager.py` with `status`, `tag`, `list`, and `export` commands for persistent task tracking across sessions.
- **Automated Skill-Script Integration**: Upgraded `skill_integrator.py` with `--report` and `--verify` flags for automated validation of skill-to-script mappings and syntax health.

---

## [2.2.0] — 2026-03-02

### Added
- **10 New Specialist Skills**: Added explicitly scoped Tribunal-integrated rulesets for `vue-expert`, `csharp-developer`, `dotnet-core-expert`, `python-pro`, `sql-pro`, `react-specialist`, `devops-engineer`, `devops-incident-responder`, `platform-engineer`, and `agent-organizer`.



---

## [2.0.0] — 2026-02-23

### Added
- **Framework Hardening & Gap Filling**: Implemented missing Python scripts for linting (`lint_runner.py`), testing (`test_runner.py`), security scanning (`security_scan.py`), dependency analysis (`dependency_analyzer.py`), schema validation (`schema_validator.py`), and bundle analysis (`bundle_analyzer.py`).
- **New Workflows**: Introduced Refactor (`/refactor`), Migrate (`/migrate`), Audit (`/audit`), Fix (`/fix`), Changelog Generation (`/changelog`), and Interactive Session (`/session`).
- **New Specialist Agent**: Added `mobile-reviewer` for dedicated React Native, Flutter, and mobile web code audits, bringing the total reviewer count to 9.
- **Skill Integrator**: Added `skill_integrator.py` to automatically detect and map which skills have executable scripts associated with them.
- **New Skill**: Added `config-validator` skill for self-validation of the `.agent` directory.
- **Enhanced Frontend Skills**: Upgraded design frameworks including `frontend-design`, `mobile-design`, `web-design-guidelines`, `nextjs-react-expert`, and `tailwind-patterns` to incorporate cutting edge spatial UI, generative UI, and AI-driven interface patterns.

### Changed
- **Skill Files Rewrite**: Systematically completely rewrote all 37 `SKILL.md` files to utilize a new voice, structure, and headers, preventing copyright claims while maintaining original functionality.
- Upgraded the `/ui-ux-pro-max` workflow to utilize the latest cutting-edge design methodologies.

---

## [1.0.0] — 2025-02-20

### Added

#### Core Tribunal System
- 8 specialist reviewer agents running in parallel: `logic-reviewer`, `security-auditor`, `dependency-reviewer`, `type-safety-reviewer`, `sql-reviewer`, `frontend-reviewer`, `performance-reviewer`, `test-coverage-reviewer`
- Human Gate enforcement — no code writes to disk without explicit user approval
- Retry limit (max 3 Maker revisions) to prevent infinite generation loops

#### Slash Command Workflows (16 total)
- `/generate` — Full Tribunal pipeline: Maker → reviewers → Human Gate
- `/review` — Audit-only mode, no generation
- `/tribunal-full` — All 8 reviewers simultaneously
- `/tribunal-backend` — Logic + Security + Dependency + Types
- `/tribunal-frontend` — Logic + Security + Frontend + Types
- `/tribunal-database` — Logic + Security + SQL (schema-aware)
- `/brainstorm` — Structured idea exploration before implementation
- `/create` — Phased build pipeline with planning checkpoint
- `/debug` — Evidence-first root-cause investigation
- `/plan` — Plan-only mode, outputs `docs/PLAN-{slug}.md`
- `/orchestrate` — Multi-agent coordination (minimum 3 agents enforced)
- `/enhance` — Read-first iterative improvement with regression safety
- `/test` — Test generation + `test-coverage-reviewer` audit
- `/deploy` — 3-gate pre-flight: security + Tribunal + Human Gate
- `/status` — Live Tribunal session board
- `/preview` — Local dev server management
- `/ui-ux-pro-max` — Advanced UI/UX design workflow with deep design thinking

#### Specialist Agents (27 total)
- 19 domain agents: `backend-specialist`, `database-architect`, `frontend-specialist`, `debugger`, `devops-engineer`, `orchestrator`, `mobile-developer`, `penetration-tester`, `performance-optimizer`, `project-planner`, `product-manager`, `product-owner`, `qa-automation-engineer`, `seo-specialist`, `test-engineer`, `code-archaeologist`, `documentation-writer`, `explorer-agent`, `game-developer`
- 8 Tribunal reviewer agents (above)

#### Infrastructure
- 37 skill modules in `.agent/skills/`
- 4 utility scripts in `.agent/scripts/`
- MCP server configuration (`mcp_config.json`)
- Master rules file (`.agent/rules/GEMINI.md`)
- Architecture documentation (`AGENT_FLOW.md`)
- IDE compatibility: Cursor, Windsurf, Antigravity, GitHub Copilot Agent Mode
