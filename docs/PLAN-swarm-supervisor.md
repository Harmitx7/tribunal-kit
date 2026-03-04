# Plan: Swarm / Supervisor Agentic Architecture

## What Done Looks Like
A `Supervisor` agent receives a user goal, breaks it into sub-tasks via a strict JSON contract, dispatches each sub-task to the correct narrowly-scoped Worker agent, collects results, and returns a unified response — all orchestrated within the existing `.agent/` system with a new `/swarm` slash command to trigger it.

---

## Won't Include in This Version
- Persistent memory / vector store between sessions
- Real code execution sandbox (workers reason and generate, not execute)
- External API integrations (e.g. no live web search or database calls wired in)
- UI / dashboard for visualising swarm execution

---

## Unresolved Questions
- `[VERIFY]` Should the Supervisor use the same LLM model as specialist agents, or a higher-capacity "triage-only" model call?
- `[VERIFY]` Maximum number of concurrent Worker dispatches — what is the context-window budget per sub-task?
- `[VERIFY]` Should the existing `swarm_dispatcher.py` script be extended, or should a new script be created?

---

## Estimates

| Phase | Optimistic | Realistic | Pessimistic | Confidence |
|---|---|---|---|---|
| Supervisor agent design | 1 hr | 2 hr | 3 hr | High |
| Worker agent contracts | 1 hr | 2 hr | 4 hr | Medium |
| `/swarm` workflow + routing | 30 min | 1 hr | 2 hr | High |
| `swarm_dispatcher.py` extension | 30 min | 1 hr | 2 hr | Medium |
| Integration testing | 30 min | 1 hr | 3 hr | Low |
| ARCHITECTURE.md + README update | 30 min | 30 min | 1 hr | High |
| **Total** | **4 hr** | **7.5 hr** | **15 hr** | Medium |

---

## Task Table

| # | Task | Agent | Depends on | Done when |
|---|---|---|---|---|
| 1 | Design `supervisor-agent.md` — triage logic, JSON dispatch schema, retry rules | `agent-organizer` | none | File exists with triage prompt, JSON schema, and error-recovery rules |
| 2 | Design Worker contract schema — `WorkerRequest` / `WorkerResult` TypeScript-style interfaces | `backend-specialist` | #1 | Schema doc exists, all fields typed and documented |
| 3 | Create `swarm-worker-registry.md` — maps task types to the correct existing specialist agent | `project-planner` | #1, #2 | All current specialist agents mapped to at least one task type |
| 4 | Extend `swarm_dispatcher.py` — validate `WorkerRequest` JSON payloads, report invalid fields | `backend-specialist` | #2 | Script validates schema, exits 1 on invalid payload with clear error message |
| 5 | Create `/swarm` workflow (`workflows/swarm.md`) — documents the full orchestration loop | `project-planner` | #1, #3 | Workflow file follows existing workflow format; covers Supervisor → Dispatch → Collect → Respond loop |
| 6 | Add `supervisor-agent` to GEMINI.md routing table and ARCHITECTURE.md | `documentation-writer` | #1, #3, #5 | Both files reference `/swarm`, `supervisor-agent`, and worker registry |
| 7 | Add `/swarm` to README.md slash command table | `documentation-writer` | #5 | README updated with description and example usage |

---

## Review Gates

| Task | Tribunal |
|---|---|
| #1 Supervisor agent design | `/tribunal-full` (this is the core AI component) |
| #2 Worker contract schema | `/review-types` |
| #4 `swarm_dispatcher.py` extension | `/tribunal-backend` |
| #5 `/swarm` workflow | `/review` |

---

## Architecture Sketch

```
User: "Research async patterns and draft a code example"
        │
        ▼
  supervisor-agent (triage)
        │
        ├─ WorkerRequest → { type: "research",    agent: "backend-specialist",  goal: "explain async patterns" }
        └─ WorkerRequest → { type: "generate",    agent: "backend-specialist",  goal: "write async code example" }
                │                         │
                ▼                         ▼
        Worker A result           Worker B result
                │                         │
                └─────────┬───────────────┘
                           ▼
                  supervisor-agent (synthesize)
                           │
                           ▼
                  Final unified response → User
```

```
JSON Contract (WorkerRequest):
{
  "task_id": "uuid-v4",
  "type": "research" | "generate" | "review" | "debug" | "plan",
  "agent": "<specialist-agent-name>",
  "goal": "<single, focused task sentence>",
  "context": "<minimal relevant context only>",
  "max_retries": 3
}

JSON Contract (WorkerResult):
{
  "task_id": "uuid-v4",
  "agent": "<specialist-agent-name>",
  "status": "success" | "failure" | "escalate",
  "output": "<agent output>",
  "error": "<error message if failure>",
  "attempts": 1
}
```

---

## Anti-Hallucination Constraints for This Plan

- `swarm_dispatcher.py` already exists — we extend it, we do not recreate it
- All specialist agents listed in the worker registry must already exist in `.agent/agents/`
- No external npm packages are added — this is a pure `.md` + `.py` configuration-layer feature
- The Supervisor agent does **not** call external APIs — it is a prompt-design pattern, not code
