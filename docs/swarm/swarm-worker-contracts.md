# 📋 Swarm Worker Contracts

Defines the strict JSON schemas for all Swarm dispatch and result payloads.
Every `WorkerRequest` and `WorkerResult` MUST conform to these schemas.
Used by: `supervisor-agent`, `swarm_dispatcher.js`, `/swarm` workflow.

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
    | 'research' // Understand or explain something
    | 'generate_code' // Write new code
    | 'review_code' // Audit existing code
    | 'debug' // Find and fix a bug
    | 'plan' // Produce a structured plan only (no code)
    | 'design_schema' // Design a database or data schema
    | 'write_docs' // Write documentation or comments
    | 'security_audit' // OWASP security review
    | 'optimize' // Refactor for performance
    | 'test'; // Write or run tests

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

---

## WorkerResult Schema

Emitted by each **Worker** when completing (or failing) a `WorkerRequest`.

```typescript
interface WorkerResult {
  // Echoed back from the WorkerRequest.task_id.
  task_id: string;

  // Echoed back from the WorkerRequest.agent.
  agent: string;

  // Terminal outcome of the work.
  status:
    | 'success' // Completed all requirements with no issues
    | 'failure' // Could not complete; retries exhausted
    | 'escalate'; // Blocked by an ambiguity or required human decision

  // Single-sentence summary of what was completed or what went wrong.
  summary: string;

  // Files modified, created, or deleted during this task.
  // Relative paths from the workspace root.
  // Empty array if no files were touched (e.g., pure research/review).
  files_changed: string[];

  // Structured findings, review notes, or research output.
  // Format depends on the WorkerRequest.type.
  findings: Finding[];

  // Non-empty only when status is 'failure' or 'escalate'.
  // Describes the exact blocker and the question for the human or supervisor.
  blocker?: string;
}

interface Finding {
  // Severity of the finding.
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';

  // File the finding applies to, or 'global' if not file-specific.
  file: string;

  // 1-based line number if applicable. Omit if file-level.
  line?: number;

  // What was found.
  issue: string;

  // Concrete fix, code change, or recommendation.
  recommendation: string;
}
```

---

## Example Payloads

### Example 1: Supervisor Dispatches a Security Audit

```json
{
  "task_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "type": "security_audit",
  "agent": "security-auditor",
  "goal": "Audit the newly added /api/auth/reset-password endpoint for token enumeration and timing attacks",
  "context": "File: src/routes/auth.ts. Uses bcrypt for hashing. Reset tokens stored in Redis with 15min TTL. Node 20, TypeScript 5.4.",
  "max_retries": 2
}
```

### Example 2: Worker Returns Success with Findings

```json
{
  "task_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "agent": "security-auditor",
  "status": "success",
  "summary": "Audited /api/auth/reset-password. Found 1 high-severity timing attack vector and 1 medium token entropy issue.",
  "files_changed": [],
  "findings": [
    {
      "severity": "high",
      "file": "src/routes/auth.ts",
      "line": 47,
      "issue": "crypto.timingSafeEqual is not used when comparing reset tokens; string comparison is vulnerable to timing attacks.",
      "recommendation": "Use crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(stored))"
    },
    {
      "severity": "medium",
      "file": "src/routes/auth.ts",
      "line": 23,
      "issue": "Reset token generated with Math.random(); insufficient entropy for a security token.",
      "recommendation": "Use crypto.randomBytes(32).toString('hex')"
    }
  ]
}
```

### Example 3: Worker Returns Failure (Needs Escalation)

```json
{
  "task_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "agent": "database-architect",
  "status": "escalate",
  "summary": "Migration cannot proceed: detected an existing NOT NULL constraint on a column with null rows in production seed.",
  "files_changed": [],
  "findings": [],
  "blocker": "Column 'users.phone_number' has 1,200 null rows. Applying NOT NULL will fail without a default value or data backfill strategy. Requires human decision on default behavior."
}
```

---

## Validation Rules

1. Every `WorkerRequest.agent` must correspond to an active agent in `.agent/config/specialist-registry.json`.
2. `WorkerResult.task_id` must match the corresponding `WorkerRequest.task_id` exactly.
3. If `status === 'failure'` or `status === 'escalate'`, `blocker` is **mandatory**.
4. If `status === 'success'`, `blocker` must be omitted or `undefined`.
5. `findings` must be an array (can be empty, never `null` or `undefined`).
