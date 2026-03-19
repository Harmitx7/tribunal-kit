---
name: parallel-agents
description: Multi-agent orchestration patterns. Use when multiple independent tasks can run with different domain expertise or when comprehensive analysis requires multiple perspectives.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-12
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Multi-Agent Orchestration

> Parallel agents are faster. They are also harder to keep consistent.
> Coordinate them — don't just fire them simultaneously and hope for compatible outputs.

---

## When to Use Parallel Agents

Use multiple agents when:
- Tasks are genuinely **independent** (output of A doesn't feed input of B)
- Different tasks require **different domain expertise**
- Comprehensive **review** needs multiple specialist perspectives simultaneously
- Speed matters and tasks can be assigned and awaited independently

Do **not** use parallel agents when:
- Tasks have sequential dependencies (you need the result to start the next)
- The overhead of coordination exceeds the time saved

---

## Orchestration Patterns

### Pattern 1 — Parallel Review (Tribunal)

Multiple reviewers look at the same code simultaneously, each from a different angle.

```
Code (input)
    ├── → logic-reviewer      → finds logic errors
    ├── → security-auditor    → finds vulnerabilities  
    ├── → type-safety-reviewer → finds type unsafe code
    └── → performance-reviewer → finds bottlenecks

All verdicts → synthesize → Human Gate (approve/reject/revise)
```

**When:** `/tribunal-*` commands, code review before merge

### Pattern 2 — Domain Specialization

Different specialists handle different parts of the same task simultaneously.

```
"Build a user auth system" (input)
    ├── → backend-specialist    → API routes + JWT logic
    ├── → frontend-specialist   → Login/register UI
    └── → database-architect    → User schema + sessions table

All outputs → orchestrator synthesizes into coherent system
(ensures API contract matches what frontend calls,
 and DB schema matches what backend queries)
```

**When:** Full-stack feature builds via `/orchestrate`

### Pattern 3 — Sequential with Parallel Phases

Some tasks are inherently sequential at the macro level but can parallelize within each phase.

```
Phase 1 (sequential):
  database-architect → schema design

Phase 2 (parallel, after Phase 1):
  backend-specialist  → API uses schema from Phase 1
  frontend-specialist → UI uses API contract from Phase 2a (estimated)

Phase 3 (sequential, after Phase 2):
  test-engineer → E2E tests with real API + UI
```

---

## Orchestrator Responsibilities

The orchestrator coordinates agents. It:

1. **Assigns scope** — each agent gets exactly what it needs, nothing more
2. **Manages state** — passes the right outputs from each agent to the next that needs them
3. **Resolves conflicts** — when two agents propose incompatible solutions, the orchestrator decides or asks the user
4. **Verifies consistency** — ensures that the API contract the backend builds matches what the frontend calls

---

## Consistency Rules for Multi-Agent Output

The biggest failure in parallel agent work is **inconsistency at boundaries**:

- Backend generates `userId` but frontend calls it `user_id`
- Database schema has `user_email` but backend queries `email`
- Agent A designs one error shape; Agent B assumes a different one

**Prevention:**
- Establish contracts (types, schemas, API shapes) **before** parallel work begins
- Each agent receives the shared contract as context
- Orchestrator reviews all outputs for boundary consistency before presenting to user

---

## Communication Format Between Agents

When one agent's output feeds another:

```
[AGENT: backend-specialist OUTPUT]
API Contract:
  POST /api/users → { id: string, email: string, createdAt: string }
  POST /api/auth/login → { token: string, expiresAt: string }

[AGENT: frontend-specialist RECEIVES]
Use the above API contract. Build the UI to match these exact request/response shapes.
```

---

## Output Format

When this skill completes a task, structure your output as:

```
━━━ Parallel Agents Output ━━━━━━━━━━━━━━━━━━━━━━━━
Task:        [what was performed]
Result:      [outcome summary — one line]
─────────────────────────────────────────────────
Checks:      ✅ [N passed] · ⚠️  [N warnings] · ❌ [N blocked]
VBC status:  PENDING → VERIFIED
Evidence:    [link to terminal output, test result, or file diff]
```



---

## 🤖 LLM-Specific Traps

AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit

Review these questions before confirming output:
```
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
