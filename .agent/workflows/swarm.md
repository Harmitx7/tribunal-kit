---
description: Swarm orchestration — Supervisor decomposes a goal into sub-tasks, dispatches to specialist Workers, collects results, and synthesizes a unified response
---

# /swarm — Multi-Agent Swarm Orchestration

$ARGUMENTS

---

## What This Does

`/swarm` is for goals that are **too large or multi-domain for a single agent**.

Instead of one agent trying to do everything (and hallucinating outside its expertise), the Supervisor:

1. **Decomposes** your goal into independent sub-tasks
2. **Dispatches** each sub-task to the best specialist Worker
3. **Collects** all results
4. **Synthesizes** a unified, coherent response

Use `/swarm` when your request spans 2+ domains (e.g. backend API + database schema + docs) or when you want specialist-quality output for each component.

---

## When to Use /swarm vs Other Commands

| Use `/swarm` when... | Use something else when... |
|---|---|
| Goal spans 2+ specialist domains | Single-domain task → use `/generate` |
| You want parallel specialist output | Simple question → just ask |
| Task needs backend + DB + docs together | Need a plan only → use `/plan` |
| Complex refactor across multiple files | Debugging one bug → use `/debug` |

---

## Pipeline Flow

```
/swarm [your goal]
         │
         ▼
  supervisor-agent (triage)
  → Reads: swarm-worker-registry.md
  → Emits: WorkerRequest JSON for each sub-task
         │
         ├─── Worker 1: [agent-name] ──── WorkerResult 1
         ├─── Worker 2: [agent-name] ──── WorkerResult 2
         └─── Worker N: [agent-name] ──── WorkerResult N
                                │
                                ▼
                       supervisor-agent (synthesize)
                                │
                                ▼
                       ━━━ Swarm Complete ━━━
                       Human Gate → Y / N / R
```

**Constraints:**
- Maximum **5 Workers** per swarm invocation
- Workers are **independent** — no Worker depends on another's pending result
- Workers that fail are **retried up to 3 times** with targeted feedback
- Workers that still fail after 3 retries are **escalated** (not silently dropped)

---

## Step 1 — Supervisor Triage

The `supervisor-agent` reads the goal and produces a dispatch plan.

**Format:**

```
━━━ Swarm Triage ━━━━━━━━━━━━━━━━━━━━━━━━

Goal: [restate the user's goal in one sentence]

Workers to dispatch: [N]

Worker 1
  task_id: [uuid]
  type:    [generate_code | research | review_code | ...]
  agent:   [agent-name]
  goal:    [single-sentence sub-task]
  context: [minimal context for this worker]

Worker 2
  ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Step 2 — Worker Dispatch

Each Worker receives its `WorkerRequest` in isolation — no Worker sees another Worker's prompt.

Workers generate their output against the constraints of their specialist agent file (`.agent/agents/{agent}.md`).

All Tribunal anti-hallucination rules apply inside each Worker:
- No invented libraries
- No guessed column names
- `// VERIFY:` tags on any uncertain call

---

## Step 3 — Collect and Validate

After all Workers return a `WorkerResult`:

- `status: "success"` → output is included in synthesis
- `status: "failure"` → re-dispatch with error context (up to max_retries)
- `status: "escalate"` → noted as ⚠️, included in final report, not retried

Use `swarm_dispatcher.py` to validate WorkerRequest/WorkerResult JSON payloads:

```bash
python .agent/scripts/swarm_dispatcher.py --mode swarm --file worker_request.json
```

---

## Step 4 — Synthesis and Human Gate

```
━━━ Swarm Complete ━━━━━━━━━━━━━━━━━━━━━━━━

Workers dispatched: [N]
Workers succeeded:  [N]
Workers escalated:  [N]

━━━ [Worker 1 goal] ━━━━━━━━━━━━━━━━━━━━━━

[Worker 1 output]

━━━ [Worker 2 goal] ━━━━━━━━━━━━━━━━━━━━━━

[Worker 2 output]

━━━ Escalations ━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ [task_id] — [agent] — [reason for escalation]

━━━ Human Gate ━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write to disk?  Y = approve | N = discard | R = revise with feedback
```

**Human Gate is never skipped.** No files are written without explicit approval.

---

## Hallucination Guard

- Supervisor only routes to agents listed in `swarm-worker-registry.md`
- Each Worker only uses tools, packages, and methods it has seen documented
- Every `WorkerRequest` is validated against the schema in `swarm-worker-contracts.md` before dispatch
- `swarm_dispatcher.py` exits `1` on any schema violation — the swarm is halted, not silently degraded

---

## Usage Examples

```
/swarm build a REST API with user auth, a PostgreSQL schema, and API documentation
/swarm analyze this repo, identify security vulnerabilities, and create a remediation plan
/swarm create a React dashboard component with a backend data endpoint and unit tests
/swarm refactor the payment module: review the code, optimize the SQL queries, and update the docs
```
