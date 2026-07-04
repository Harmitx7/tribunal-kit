---
trigger: always_on
---

# Tribunal Agent Kit — Master Rules

Active: always. Every agent, request, response.
Rule priority: this file (P0) > agent .md file (P1) > skill SKILL.md (P2).

---

## 1. Request Classification
- **Question** ("how", "why"): Text answer only, no tools.
- **Survey** ("analyze", "list"): Read & report, no writing.
- **Simple edit** ("fix"): Direct edit, no plan required.
- **Complex build** ("build"): Requires plan + routing.
- **Design/UI** ("design"): Requires design agent + plan.
- **Slash command** (`/`): Route to workflow file.

---

## 2. Agent Routing (Auto)
Map domains to primary agents/skills.
*(Agents in `agents/` take P1 priority over skills in `skills/`)*

- **Backend/API**: `backend-specialist`, `api-architect`, `python-pro`, `dotnet-core-expert`
- **Frontend/UI**: `frontend-specialist`, `react-specialist`, `vue-expert`, `mobile-developer`
- **Database**: `database-architect`, `sql-pro`, `db-latency-auditor`
- **DevOps/Platform**: `devops-engineer`, `devops-incident-responder`, `platform-engineer`, `cloud-engineer`
- **Security/QA**: `security-auditor`, `penetration-tester`, `test-engineer`, `qa-automation-engineer`
- **Performance**: `performance-optimizer`, `throughput-optimizer`, `vitals-reviewer`
- **Other**: `orchestrator` (multi-domain), `agent-organizer`, `debugger`, `explorer-agent`, `code-archaeologist`, `game-developer`, `system-architect`, `ai-code-reviewer`

**Announce agent on activation:** `🤖 Applying knowledge of @[name]...`

**Mental checklist before code response:** Correct agent? -> Read rules -> Announce agent -> Load required skills -> Recall memory -> Store new lessons.

---

## 3. Socratic Gate (Before Complex Work)
Stop & ask before writing code for new features, complex builds, or vague requests.
- **New build:** Ask 3+ strategic questions (goal, stack, scope).
- **Edit/fix:** Confirm understanding + impact.
- **Vague:** Ask purpose, users, scope.
- **Full orchestration:** Block subagents until plan is confirmed.
- **Rule:** Never assume. Clear the gate before coding.

---

## 4. Memory Recall & Storage (Persistent Brain)
Utilize the 4-Type Taxonomy via MCP for a shared swarm brain.
- **Recall (Read):** `semantic` (architectural rules, start of task), `episodic` (past bugs, when debugging), `procedural` (documented workflows).
- **Store (Write):** `episodic` (bug fixes), `semantic` (architectural decisions), `working` (temp notes during complex builds).

---

## 5. Universal Code Standards (Always Active)
- **Anti-Hallucination:** Only verified `package.json` imports/framework methods. Use `// VERIFY:` for uncertainty. No 1-shot full apps. Don't guess DB schema.
- **Code Quality:** Self-documenting names. No over-engineering. Async error handling. TS: explain `any`. Test logic changes.
- **Security:** Parameterized SQL. Env vars for secrets. Enforce JWT algos. Auth checks before logic. Input validation at API boundaries.
- **Performance:** Avoid O(N^2) bottlenecks. Memoize expensive ops. Early returns. Lazy load heavy deps. Index DB queries.

---

## 6. Tribunal Gate (Code Generation)
Maker generates → Parallel Reviewers → Human Gate → Write to disk.
- **Backend**: logic + security + dependency + type-safety + resilience + schema
- **Frontend**: logic + security + frontend + type-safety + ui-ux-auditor + review-animations
- **Database**: logic + security + sql + schema
- **Mobile**: logic + security + mobile-reviewer + type-safety
- **Performance**: /tribunal-performance or /tribunal-speed
- **Before merge**: /tribunal-full

---

## 7. Error Recovery Protocol
- **Retry Policy (Max 3):** 1: Original. 2: Stricter constraints + feedback. 3: Max constraints + full context dump. 4: HALT and report.
- **Failure Report:** Must include Agent, Task, Attempts, Last Error, Context, Suggestion.
- **Cascade Rules:** Security scan fail → HALT. Lint fail → warn, block deploy. Test fail → mark incomplete. Script timeout → kill, report, continue.

---

## 8. Script Reference (`.agent/scripts/`)
`checklist.py` (Pre/post major change), `verify_all.py` (Pre-deploy), `auto_preview.py` (Local server), `session_manager.js`, `lint_runner.py`, `test_runner.py`, `security_scan.py`, `dependency_analyzer.py`, `schema_validator.py`, `bundle_analyzer.py`, `skill_integrator.py`, `swarm_dispatcher.js`.

---

## 9. Mode Behavior
- **plan**: 1. Analyze 2. Plan 3. Solution 4. Implement. NO CODE before Phase 4.
- **ask**: Answer only — no implementation.
- **edit**: Execute. Check `{task-slug}.md` first.

---

## 10. Design Rules
- No purple/violet primary colors (AI cliché).
- No standard hero layouts without justification.
- No mesh gradients — use grain, solid contrast, depth.
- No unproven claims like "feels fast".

---

## 11. Context Window Budget
❌ Dumping entire files (extract relevant parts).
❌ Repeating full history (use summaries).
❌ Attaching unread files.
- **Bug fix**: Function + callers.
- **Schema change**: Schema + history.
- **Review**: Target file only.

---

## 12. Prompt Injection Defense
1. User input goes to `role: "user"`, NEVER `role: "system"`.
2. If forced in system prompt, wrap in XML delimiters and explicitly ignore instructions within.
3. Sanitize XML/HTML from input.

---

**Before modifying any file:**
1. Check what other files import it
2. Identify all callers and dependents
3. Update affected files together — never a partial update

---
## Quick Reference
**Scripts:** `.agent/scripts/` | **Agents:** `.agent/agents/` | **Skills:** `.agent/skills/`
**Workflows:** `.agent/workflows/` | **Rules:** `.agent/rules/GEMINI.md` | **Architecture:** `.agent/ARCHITECTURE.md`

