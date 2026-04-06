---
name: agent-organizer
description: Master Agent orchestration framework. Coordination of sub-agents, workflow definitions, delegation patterns, state management across conversations, memory distillation, and execution loops. Use when assembling multi-agent systems or managing complex agent-to-agent architectures.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Agent Organizer — Multi-Agent Orchestration Mastery

---

## 1. The Delegation Sub-Agent Pattern

Agents should defer specific domain problems to specialized sub-agents.

```json
// Define the payload contract the Worker Agent expects
{
  "taskId": "task-auth-migration-01",
  "workerRole": "api-security-auditor",
  "isolatedContext": {
    "filesToScan": ["src/login.ts", "src/middleware.ts"],
    "objective": "Identify unprotected mass assignments"
  },
  "requiredOutputFormat": "json_list"
}
```

### Delegation Rules:
1. **Never pass full histories:** Do not pass the entire conversation history to a worker sub-agent. Extract only the exact files and goal context required. (Context Window Budgeting).
2. **Clear Boundaries:** If the worker is fixing CSS, it must not invent logic for the database.
3. **Structured Handoff:** The parent agent requests JSON from the worker, parses it, and then acts. Let machines talk to machines through syntax, not prose.

---

## 2. Execution Loops (Supervisor Pattern)

A Supervisor decides *who* works and *when*, but does not execute the work.

```
[User Request: "Add OAuth and secure it"]
       |
[Supervisor Agent analyzing required skills...]
       |
       ├─> [Dispatches: authentication-best-practices]
       |         (Worker builds OAuth implementation)
       |
       ├─> [Dispatches: api-security-auditor]
       |         (Worker reviews implementation against OWASP)
       |
[Supervisor Agent synthesizes findings]
       |
[Action Executed / Git Commit]
```

### Handoff Signals
A worker must return definitive state signals when yielding control:
- `COMPLETE`: Goal achieved. Final diff generated.
- `BLOCKED`: Missing context (e.g., "I need the `.env` schema").
- `ERROR`: Script failed, requires manual Supervisor intervention.

---

## 3. Session State Management (Memory)

Agents lose memory across boundaries. The Organizer must explicitly persist context.

1. **Short-Term Context:** Maintained natively in the active LLM context window.
2. **Task State:** Maintained locally in `task.md`. Workers check-in and check-out checkboxes.
3. **Long-Term Memory:** "Knowledge Items" (KIs). Distilling massive conversations down into a single `learnings.json` file injected on subsequent startups.

```markdown
<!-- task.md (The Global Execution State) -->
# Current Objective: Build Chat Feature
- [x] Initialize websocket connection
- [/] (Worker: frontend-specialist) Build Chat UI component
- [ ] (Worker: realtime-patterns) Implement presence sync
```

---

## 4. The Human-in-the-Loop (Socratic Gate)

Automation without oversight is reckless. The Organizer manages when to pause and query the human.

**Mandatory Gates:**
1. **Approval Gate (Before Execution):** "I have drafted the architecture plan. Do you approve execution?"
2. **Recovery Gate (After 3 Failures):** "The database migration script has failed 3 times. I am halting. How would you like to proceed?"

---
