# Changelog

All notable changes to the Tribunal Anti-Hallucination Agent Kit are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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

---

## [Unreleased]

- Additional specialized Tribunal panels (mobile, performance)
- Interactive session state with `session_manager.py`
- Automated skill-script integration
