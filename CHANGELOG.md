# Changelog

All notable changes to the Tribunal Anti-Hallucination Agent Kit are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [3.1.0] — 2026-04-07

### Added

#### New Skill — `motion-engineering`

- **`motion-engineering` SKILL.md**: Comprehensive 2026 motion engineering skill covering the full spectrum of animation techniques from micro-interactions to AI-driven adaptive motion.
  - **Nine animation categories**: Micro-interactions, layout transitions, scroll-driven animations, page transitions, physics-based motion, gesture-driven UI, data visualization, loading/skeleton states, and AI-driven adaptive motion.
  - **Performance-first constraints**: 60fps mandate with concrete implementation rules — CSS transforms only (no `top`/`left`), `will-change: transform` on heavy animations, mandatory `prefers-reduced-motion` media query support.
  - **2026 native APIs**: View Transitions API (`document.startViewTransition()`), Web Animations API (`element.animate()`), and CSS Scroll-Driven Animations (`animation-timeline: scroll()`).
  - **Library guidance**: GSAP 3.12+, Framer Motion 12+, Anime.js v4 — with explicit `useGSAP` cleanup patterns and `AnimatePresence` exit sequencing.
  - **Hallucination traps table**: 8 explicit traps with wrong patterns and correct fixes (e.g., `gsap.to()` without cleanup → `useGSAP` hook, `motion.div` in RSC → client boundary, `MotionValue` without `useTransform` → `useMotionValue` + `useTransform`).
  - **Pre-flight checklist**: 8 mandatory checks before declaring animation work complete.
  - **VBC Protocol**: Verification-Before-Completion enforcement requiring browser DevTools Performance tab evidence at 60fps before sign-off.

### Changed

#### `/generate` Workflow — Full Sync Upgrade

- **Reviewer routing restored**: `/generate` now auto-selects domain-specific Tribunal reviewers by keyword detection (backend, frontend, database, mobile, performance) instead of defaulting to logic + security only.
- **Animation skills wired into `frontend-specialist`**: `framer-motion`, `gsap-expert`, and `motion-engineering` are now listed as required consultation skills in the frontend-specialist agent.
- **`architecture` patterns wired into `backend-specialist`**: Architecture skill is now a required reference for all backend-specialist decisions.

#### `gsap-expert` SKILL.md — Expanded from 65 → 150+ lines

- Added `useGSAP` React hook cleanup patterns (replaces raw `useEffect` + GSAP).
- Added `ScrollTrigger` pin, scrub, and batch patterns.
- Added `LazyMotion` bundle splitting guidance for Next.js App Router.
- Added explicit hallucination traps: `gsap.killTweensOf()` anti-pattern vs `ctx.revert()`.

#### `llm-engineering` SKILL.md — 2026 Patterns

- Updated model reference table: Gemini 2.0 Flash, Claude Sonnet 3.7, GPT-4o mini — all with correct SDK method names.
- Added structured output patterns using `response_format: { type: "json_schema" }` (OpenAI) and Zod-inferred schemas (Vercel AI SDK).
- Added streaming UI patterns (`createStreamableUI`, `useChat`).
- Added testing artifacts guidance for AI output validation.

### Fixed

#### Security Scanner — False Positive Elimination

- **`security_scan.py`**: Added `coverage`, `lcov-report`, `.nyc_output`, `test-results`, and `.jest-cache` to `SKIP_DIRS`.
  - **Root cause**: Istanbul/Jest's coverage HTML reporter bundles `prettify.js` (a third-party code syntax highlighter). This minified file contains string patterns (`console.log.*password`) that matched the `Info Disclosure` rule, generating a `[HIGH]` false positive on every audit run.
  - **Fix**: Coverage and test report output directories are now excluded from security scanning at the directory traversal level — no source code is affected.

### Infrastructure

- **Audit score**: Improved from 4/7 (with false positive warning) to **5/7 clean** (2 N/A for JS-only CLI tool — no TypeScript build, no web bundle).
- **Security scan**: Now exits 0 (pass) on a clean tribunal-kit codebase.
- **`.gitignore`**: Already correctly excluded `coverage/` and `.nyc_output/` from version control.

---

## [3.0.0] — 2026-04-02

### 🚨 Breaking Changes

- **Agent behavioral contracts fully rewritten** — all 33 agent `.md` files have been replaced with Pro-Max versions. Any tooling that parses agent YAML frontmatter or depends on specific section names will need to be updated.
- **All 30 workflows fully rewritten** — section names and phase structures have changed. Existing documentation referencing old workflow step names should be updated.
- **Human Gate is now mandatory on all write operations** — `/test`, `/refactor`, `/fix`, `/enhance`, and `/debug` now enforce explicit approval before any file is written to disk. Automated scripts that bypassed the gate will need review.

---

### Added

#### Agents — Pro-Max Standard (33 total, all upgraded)

**Reviewer Agents (11)**

- **`logic-reviewer` Pro-Max**: Added 5 language-specific hallucination tables (TypeScript, Python, Rust, SQL, Shell), LLM API trap tables for OpenAI/Anthropic/Google, Prisma/Supabase ORM traps, undefined variable pattern detection, and 2026-standard API verification checks.
- **`dependency-reviewer` Pro-Max**: Added fabricated package name tables for npm and pip, supply chain risk pattern detection (typosquatting, abandonment signals, scoped package format errors), version compatibility matrix, and `@types/*` mismatch detection.
- **`type-safety-reviewer` Pro-Max**: Added `any` epidemic detection with epidemic threshold, Zod `.parse()` vs `.safeParse()` vs `.cast()` distinction, discriminated union exhaustiveness checking, generic constraint violations, and unguarded optional chaining patterns — all with code-level examples.
- **`sql-reviewer` Pro-Max**: Added SQL injection patterns with attack/fix code pairs, N+1 detection with DataLoader fix patterns, missing index analysis for FK columns, transaction boundary errors, and dangerous unscoped `DELETE`/`UPDATE` detection.
- **`frontend-reviewer` Pro-Max**: Added React 19 API changes (`useFormState` → `useActionState`), RSC boundary violations, full hook rules enforcement, direct state mutation patterns, hydration mismatch detection, and Next.js 15 async `cookies()`/`params()` requirements.
- **`performance-reviewer` Pro-Max**: Added 2026 Core Web Vitals target table (INP < 200ms, LCP < 2.5s, CLS < 0.1), specific INP/LCP/CLS damage patterns, React re-render cascade detection, memory leak patterns, all with measurable thresholds.
- **`mobile-reviewer` Pro-Max**: Added Reanimated 3 UI-thread worklet safety rules, FlatList vs FlashList anti-patterns, safe area insets enforcement, `AppState` subscription cleanup, platform-specific API guards.
- **`test-coverage-reviewer` Pro-Max**: Added happy-path-only detection, behavioral edge case matrix (GIVEN/WHEN/THEN format), brittle CSS selector patterns, MSW vs internal mock logic, implementation detail testing anti-patterns, async assertion gotchas (`getBy*` vs `findBy*`).
- **`accessibility-reviewer` Pro-Max**: Added WCAG 2.2 AA criteria with criterion numbers, semantic HTML violations, ARIA misuse rules, focus management in modals, form label association, live regions, keyboard navigation completeness.
- **`ai-code-reviewer` Pro-Max**: Added 2026 model name verification tables (OpenAI/Anthropic/Google), hallucinated API parameter detection (invented `max_length`, `memory`, `format`, `plugins` params), prompt injection pattern library, streaming error handling, cost explosion guards, context window overflow detection.
- **`security-auditor` Pro-Max** (full rewrite as specialist): Added OWASP 2025 Top 10 table, injection vectors with attack/defense code pairs, JWT algorithm bypass prevention, SSRF with private IP blocking, IDOR protection patterns, CORS misconfiguration detection.

**Specialist Agents (15)**

- **`frontend-specialist` Pro-Max**: Added React 19 Server/Client boundary decision tree, complete hook taxonomy (Server: none, Client: full), `useActionState` patterns, Next.js 15 async API enforcement, WCAG 2.2 AA integration, TypeScript strict mode contracts.
- **`backend-specialist` Pro-Max**: Added framework selection decision tree, Zod-first validation order, auth-before-logic execution contract, typed error envelopes, SQL injection prevention at the ORM layer, JWT `{ algorithms }` enforcement, rate limiting patterns.
- **`database-architect` Pro-Max**: Added Prisma v6 schema patterns, expand-and-contract migration protocol, composite index strategy, N+1 prevention with `include`, transaction boundaries, removed API detection (`findOne` → `findUnique`).
- **`debugger` Pro-Max**: Added 4-phase evidence-based investigation protocol (Collect → Hypothesize → Test → Fix), priority investigation order (deploys first, code last), race condition pattern library, memory leak tooling, structured debug report format.
- **`orchestrator` Pro-Max**: Added scope classification gate, Fan-Out/Fan-In patterns, sequential wave execution, BLOCKED worker protocol, context discipline rules (context_summary vs full files), structured delegation contract template, agent routing table.
- **`supervisor-agent` Pro-Max**: Added task decomposition protocol, structured JSON dispatch contracts, `allSettled` vs `all` rationale, BLOCKED/ERROR status protocol, conflict resolution rules, task.md session persistence.
- **`mobile-developer` Pro-Max**: Added 3-thread model (JS/UI/Native), Reanimated UI-thread safety with `'worklet'` directive requirement, FlashList vs FlatList migration guide, Expo Router v4 file conventions, MMKV storage patterns.
- **`devops-engineer` Pro-Max**: Added multi-stage Docker build patterns, GitOps (ArgoCD) workflow, GitHub Actions CI pipeline template, Kubernetes liveness/readiness probe specs, resource limits enforcement, Terraform least-privilege IAM, remote state locking.
- **`penetration-tester` Pro-Max**: Added MITRE ATT&CK phase structure, mandatory scope declaration contract, web/API/infrastructure attack vector checklists, CVSS scoring integration, structured assessment report format.
- **`performance-optimizer` Pro-Max**: Added 2026 CWV target table, LCP preload patterns, INP `startTransition` patterns, bundle reduction strategies (dynamic import, tree-shaking), multi-layer caching, `EXPLAIN ANALYZE` patterns, mandatory before/after measurement protocol.
- **`qa-automation-engineer` Pro-Max**: Added Testing Trophy hierarchy (Static → Unit → Integration → E2E), Vitest boundary testing, RTL+MSW integration pattern, Playwright config with retry/trace/CI settings, resilient locator patterns, API route testing with rate-limit verification.
- **`explorer-agent` Pro-Max**: Added priority-ordered entry point reading protocol, architecture pattern identification, dead code detection, impact zone analysis, git log frequency analysis, structured orientation report format.
- **`project-planner` Pro-Max**: Added Socratic gate (5 mandatory questions), research-before-planning protocol, risk identification matrix, topological wave decomposition, `implementation_plan.md` template, explicit no-code-before-approval gate.
- **`seo-specialist` Pro-Max**: Added Next.js 15 `generateMetadata` patterns, dynamic metadata generation, Schema.org JSON-LD templates, `sitemap.ts` generation, H1 hierarchy enforcement, GEO (Generative Engine Optimization) bot middleware patterns.
- **`documentation-writer`, `code-archaeologist`, `product-manager`, `game-developer` Pro-Max**: Added domain-specific behavioral contracts, JSDoc hierarchy, ADR format, triage levels, clarity gate, route-based delegation.

---

#### Workflows — Pro-Max Standard (30 total, all upgraded)

**Core Generation Workflows**

- **`/generate` Pro-Max**: Added mandatory context scan before first line of code (reads `package.json`, `tsconfig.json`, env files), React 19/Next.js 15 hallucination guards, reviewer auto-selection by keyword table, retry limit spec (3 max), failure escalation path.
- **`/debug` Pro-Max**: Added priority investigation order (deploys → env vars → deps → infra → code), single-hypothesis testing contract, Root Cause statement format (WHY not WHAT), regression test requirement, hallucination guard.
- **`/create` Pro-Max**: Added 5-phase pipeline (Requirements → Stack Selection → Scaffolding Plan → Tribunal Generation → Verification), Socratic gate, stack selection table, Human Gate after scaffolding plan.
- **`/enhance` Pro-Max**: Added mandatory impact analysis with import counting, risk classification by caller count (0-2/3-5/6+), breaking change detection matrix, consistency verification checklist.
- **`/refactor` Pro-Max**: Added pre-refactor checklist (tests-first mandate), dependency-safe execution order, DB expand-and-contract in ordering, behavior verification step between each change, dead code deletion guard.
- **`/fix` Pro-Max**: Added auto-fixable vs human-decision matrix, execution sequence, diff preview before applying, post-fix verification step, fix guard anti-patterns.
- **`/test` Pro-Max**: Added Testing Trophy strategy (2026), GIVEN/WHEN/THEN behavioral format, minimum required coverage matrix (happy/error/boundary/auth), test templates for all 3 layers, Human Gate before test files are written.

**Tribunal Workflows**

- **`/tribunal-full` Pro-Max**: Added active-reviewer-by-code-type table (N/A auto-pass for irrelevant reviewers), verdict aggregation rule, structured output format with blocker/warning separation, retry protocol with hard 3-attempt limit.
- **`/tribunal-backend` Pro-Max**: Added reviewer detection specifics, backend hallucination trap table (Express/Hono/next-auth v4 vs v5 traps), verdict system with blocker output.
- **`/tribunal-frontend` Pro-Max**: Added React 19/Next.js 15 specific reviewer detections, frontend hallucination trap table (`useFormState` rename, async `params`, Server Component hook violations), structured output format.
- **`/tribunal-database` Pro-Max**: Added Prisma hallucination trap table (`findOne` removed, `upsertMany` doesn't exist, NOT NULL migration failure), reviewer detection specifics.
- **`/tribunal-mobile` Pro-Max**: Added Reanimated worklet trap, Expo Router v4 trap (`navigate` → `router.push`), `Platform.select` vs `StyleSheet.create` issue, structured output format.
- **`/tribunal-performance` Pro-Max**: Added 2026 CWV targets table for verdict thresholds, `React.memo` anti-pattern (new object as prop), `useMemo` missing deps trap, mandatory measurement protocol before claiming "optimized."

**Process Workflows**

- **`/plan` Pro-Max**: Added explicit no-code contract, 5-question Socratic gate, research phase with specific bash commands, topological wave decomposition, `implementation_plan.md` template, mandatory Human Gate before any execution.
- **`/audit` Pro-Max**: Added cascade failure rules (security halts, lint continues), script retry protocol with hard limit, structured audit report format, Human Gate before applying any fixes, cross-workflow navigation.
- **`/deploy` Pro-Max**: Added T-minus pre-flight sequence (6 checks in fixed order), rollback baseline capture (git tag / `pg_dump`), structured Human Gate approval format, post-deploy error rate monitoring window, rollback decision tree, schema change isolation pattern.
- **`/migrate` Pro-Max**: Added 4 migration type classification, expand-and-contract 5-step DB migration pattern, breaking changes inventory for Next.js 14→15 and next-auth v4→v5, rollback plan requirement, migration guard anti-patterns.
- **`/review` Pro-Max**: Added explicit read-only contract, hallucination-specific checklist with React 19/Next.js 15/Prisma version traps, reviewer auto-selection table, structured findings output format.
- **`/review-ai` Pro-Max**: Added 2026 model reference table, reviewer detection items, prompt injection code examples, cost explosion guard output format.
- **`/swarm` Pro-Max**: Added JSON dispatch contract format, `swarm_dispatcher.py` validation step, `allSettled` vs `Promise.all` rationale, session persistence in `task.md`, structured failure report format.
- **`/orchestrate` Pro-Max**: Added scope classification gate, worker decomposition rules, Fan-Out/Fan-In pattern specification, BLOCKED worker protocol, sequential wave context discipline.
- **`/brainstorm` Pro-Max**: Added 4-phase structure, 3-option comparison framework with effort and best-for context, Socratic probing questions, evidence-based recommendation format.
- **`/session`, `/status` Pro-Max**: Added session file format, 5-data dashboard, sub-command routing.

**Utility Workflows**

- **`/preview` Pro-Max**: Added command table, common issues troubleshooting, when-to-use guide.
- **`/changelog` Pro-Max**: Added conventional commit type table, git log commands for different date ranges, Keep a Changelog format with all categories, Semver decision guide.
- **`/strengthen-skills` Pro-Max**: Added bash audit commands, guardrail appendix template with all 3 sections (LLM Traps + Pre-Flight + VBC), guardrail quality guidelines with bad vs good examples.
- **`/api-tester` Pro-Max**: Added endpoint discovery commands, auth token acquisition pattern, CRUD sequence with chained IDs, error case testing (401/404/400/429), structured test report format.
- **`/performance-benchmarker` Pro-Max**: Added complete 4-tool benchmark suite (Lighthouse CI + Bundle + autocannon + DB `EXPLAIN ANALYZE`), structured report with comparison to last run, numeric fail/warning gates, historical tracking pattern.
- **`/ui-ux-pro-max` Pro-Max**: Added design intent questions, forbidden defaults with specific anti-clichés, 4-state interaction design requirement, micro-animation mandate, WCAG 2.2 AA checkpoint, design verification gate.

---

### Changed

- **Standard stack updated to 2026**: All agents and workflows now reference React 19, Next.js 15, Prisma 6, Zod 3.23+, Reanimated 3, Expo Router v4, Playwright 1.49, TypeScript 5.7, Node 22.
- **Human Gate universally enforced**: Every workflow that produces files now has an explicit `## Human Gate` section. No agent writes to disk without explicit approval.
- **Version references eliminated**: All outdated version references (React 18, Next.js 13/14 patterns, next-auth v4 in v5 projects) have been replaced with 2026 stable API references across all 63 files.
- **Cross-workflow navigation added**: All major workflows now include a `## Cross-Workflow Navigation` table routing to the correct next workflow based on what was found.

---

### Infrastructure

- All 16 Python scripts pass `python -m py_compile` syntax validation (zero syntax errors)
- `verify_all.py` passes: `tsc --noEmit` clean + ESLint clean
- Integrity check: 33 agents, 30 workflows, 77 skills, 16 scripts — all present and validated

---



## [2.4.6] — 2026-03-30

### Added
- **12 New AI Skills**: Added dedicated skill guidelines for `ai-prompt-injection-defense`, `api-security-auditor`, `authentication-best-practices`, `building-native-ui`, `extract-design-system`, `framer-motion-animations`, `playwright-best-practices`, `shadcn-ui-expert`, `skill-creator`, `supabase-postgres-best-practices`, `swiftui-expert`, and `web-accessibility-auditor`.


### Changed
- **Skill Integrator Compatibility**: Modified `appflow-wireframe` and `readme-builder` to strengthen Tribunal anti-hallucination guards.

---

## [2.4.5] — 2026-03-25

### Added
- **`appflow-wireframe` Skill**: New skill enabling Mermaid-based logical flow mapping and Tribunal Structural XML for wireframing explicit layout hierarchies.

### Changed
- **UI Building Accuracy Enforcement**: Injected strict structural constraints and pixel-perfect design token mandates (4px grid) into 7 core frontend/UI skills to eliminate AI spacing hallucinations.

### Documentation
- Redesigned the main README with the Tribunal-Kit logo and improved UI/UX aesthetics.

---

## [2.4.0] — 2026-03-05

## [2.4.1] — 2026-03-09

### Changed
- **Verification-Before-Completion (VBC) Protocol**: Implemented a mandatory evidence-based closeout protocol across 10 core execution, debugging, and building skills (`systematic-debugging`, `tdd-workflow`, `plan-writing`, `python-pro`, `react-specialist`, `rust-pro`, `sql-pro`, `app-builder`, `clean-code`, `devops-incident-responder`). Sub-agents are now explicitly forbidden from declaring a task complete without providing concrete terminal or runtime evidence that their code succeeds.
- **`frontend-design` Upgrade (Pro Max)**: Enhanced the skill to enforce asymmetric layouts, tactile textures (grain/SVG noise), OKLCH color spaces, and kinetic typography. Stripped out predictable AI defaults and strictly banned clichés like excessive purple, generic glowing blobs, and simple grid layouts.
- **`brainstorming` Skill Upgrade**: Enhanced the discovery protocol using `skills.sh` paradigms. Added strategic query domains for "Market & Psychology," enforced the inclusion of at least one highly unconventional "Superpower Option" during options generation, and added constraints explicitly preventing assumptions around toolchain selection.

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
