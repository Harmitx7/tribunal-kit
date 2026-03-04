# 📋 Swarm Worker Contracts

> Defines the strict JSON schemas for all Swarm dispatch and result payloads.
> Every `WorkerRequest` and `WorkerResult` MUST conform to these schemas.
> Used by: `supervisor-agent`, `swarm_dispatcher.py`, `/swarm` workflow.

---

## WorkerRequest Schema

Emitted by the **Supervisor Agent** when dispatching a sub-task to a Worker.

```typescript
interface WorkerRequest {
  // Unique identifier for correlating dispatches to results.
  // Format: standard UUID v4 (randomly generated per invocation).
  task_id: string;

  // The category of work being requested.
  type:
    | "research"       // Understand or explain something
    | "generate_code"  // Write new code
    | "review_code"    // Audit existing code
    | "debug"          // Find and fix a bug
    | "plan"           // Produce a structured plan only (no code)
    | "design_schema"  // Design a database or data schema
    | "write_docs"     // Write documentation or comments
    | "security_audit" // OWASP security review
    | "optimize"       // Refactor for performance
    | "test";          // Write or run tests

  // The agent to route this WorkerRequest to.
  // MUST match a filename in .agent/agents/ (without the .md extension).
  agent: string;

  // Single-sentence description of the task.
  // MUST be specific and self-contained.
  // ❌ "Handle the API"
  // ✅ "Create a POST /users endpoint in Express that validates the request body"
  goal: string;

  // Minimal context the Worker requires to complete the goal.
  // MUST NOT include: full file contents, entire conversation history, unrelated code.
  // MUST include: relevant package versions, existing patterns, specific constraints.
  context: string;

  // Maximum number of retry attempts on failure, including the first attempt.
  // Minimum: 1. Maximum: 3. Default: 3.
  max_retries: number;
}
```

### WorkerRequest Validation Rules

| Field | Rules |
|---|---|
| `task_id` | Non-empty string. UUID v4 format preferred. Must be unique per swarm invocation. |
| `type` | Must be one of the 10 listed enum values exactly. |
| `agent` | Must match a file that exists at `.agent/agents/{agent}.md`. |
| `goal` | Non-empty. Single sentence. Max 200 characters. |
| `context` | Non-empty. Max 800 characters. No full file dumps. |
| `max_retries` | Integer 1–3 inclusive. |

---

## WorkerResult Schema

Emitted by the **Worker Agent** (or Supervisor on behalf of a failed Worker) after completing or failing a task.

```typescript
interface WorkerResult {
  // Must match the task_id from the originating WorkerRequest.
  task_id: string;

  // The agent that processed this request.
  agent: string;

  // Outcome of the Worker's execution.
  status:
    | "success"   // Task completed. Output is valid.
    | "failure"   // Task failed but retries remain.
    | "escalate"; // Task failed after max_retries. Requires human intervention.

  // The agent's output if status is "success".
  // Empty string if status is "failure" or "escalate".
  output: string;

  // Error message if status is "failure" or "escalate".
  // MUST be specific — never just "Something went wrong."
  // Empty string if status is "success".
  error: string;

  // Number of attempts made so far, including the current one.
  // Starts at 1. Never exceeds max_retries from the WorkerRequest.
  attempts: number;
}
```

### WorkerResult Validation Rules

| Field | Rules |
|---|---|
| `task_id` | Must match a previously dispatched WorkerRequest task_id. |
| `agent` | Must match the agent from the originating WorkerRequest. |
| `status` | Must be exactly: `"success"`, `"failure"`, or `"escalate"`. |
| `output` | Required if status is `"success"`. Empty string otherwise. |
| `error` | Required if status is `"failure"` or `"escalate"`. Empty string if success. |
| `attempts` | Integer ≥ 1. Must not exceed `max_retries` from the WorkerRequest. |

---

## Example: Successful Dispatch/Result Pair

**WorkerRequest:**
```json
{
  "task_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "type": "generate_code",
  "agent": "backend-specialist",
  "goal": "Write an Express POST /users endpoint with zod body validation",
  "context": "Express v4, zod v3.22. Body: { name: string, email: string }. Return 201 on success, 400 on validation failure.",
  "max_retries": 3
}
```

**WorkerResult:**
```json
{
  "task_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "agent": "backend-specialist",
  "status": "success",
  "output": "// ... generated code ...",
  "error": "",
  "attempts": 1
}
```

---

## Example: Escalated Failure

**WorkerResult:**
```json
{
  "task_id": "b6a921c9-aa4e-4d1a-9862-d3f0b0e3f101",
  "agent": "database-architect",
  "status": "escalate",
  "output": "",
  "error": "Cannot infer schema without knowing whether PostgreSQL or MySQL is the target. Context is ambiguous.",
  "attempts": 3
}
```

---

## swarm_dispatcher.py Integration

The `swarm_dispatcher.py` script validates **WorkerRequest** payloads before dispatch.

**Usage:**
```bash
python .agent/scripts/swarm_dispatcher.py --mode swarm --file worker_request.json
python .agent/scripts/swarm_dispatcher.py --mode swarm --payload '{"task_id":"...","type":"generate_code","agent":"backend-specialist","goal":"...","context":"...","max_retries":3}'
```

Exits `0` on valid payload. Exits `1` on any schema violation with a specific error message per field.
