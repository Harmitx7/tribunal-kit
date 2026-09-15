---
name: agentic-patterns
description: Use when AI agent design principles. Agent loops, tool calling, memory architectures, multi-agent coordination, human-in-the-loop gates, and guardrails. Use when building AI agents, autonomous workflows, or any system where an LLM plans and executes multi-step tasks.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - agent-organizer
  - fabel-protocol
  - thinking-protocol
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/swarm_dispatcher.js
  - .agent/scripts/verify_all.js
  - .agent/scripts/lint_runner.js
---

# Agentic Patterns

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `agentic-patterns` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when AI agent design principles. Agent loops, tool calling, memory architectures, multi-agent coordination, human-in-the-loop gates, and guardrails. Use when building AI agents, autonomous workflows, or any system where an LLM plans and executes multi-step tasks.
- **DO NOT activate when:** The task falls outside the `agentic-patterns` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass       | Phase            | Core Action                                                                                  |
| :--------- | :--------------- | :------------------------------------------------------------------------------------------- |
| **Pass 1** | **Understand**   | Deconstruct the user's explicit objective, implicit requirements, and platform constraints.  |
| **Pass 2** | **Plan**         | Decompose the task into smallest logical steps; map dependencies and required tool calls.    |
| **Pass 3** | **Execute**      | Implement the solution with production-grade craft, zero placeholders, and strict typing.    |
| **Pass 4** | **Verify**       | Run linters, unit tests, or compiler checks to validate structural correctness.              |
| **Pass 5** | **Attack**       | Perform an adversarial review searching for edge-case failures, race conditions, and traps.  |
| **Pass 6** | **Improve**      | Eliminate discovered friction, optimize performance, and harden error boundaries.            |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

## The Agent Loop

Every AI agent follows this fundamental pattern:

```
PERCEIVE → PLAN → ACT → OBSERVE → (repeat or terminate)

1. PERCEIVE   — What is the current state? What does the agent know?
2. PLAN       — What action will move toward the goal?
3. ACT        — Execute the tool, call the API, write the file
4. OBSERVE    — What changed? Did the action succeed?
5. EVALUATE   — Goal reached? Continue loop or return?
```

### When to Terminate

```ts
// The three termination conditions — always define all three
type AgentResult = {
  reason: 'goal_reached' | 'max_steps_exceeded' | 'human_escalation';
  steps: number;
  result: string;
};

const MAX_STEPS = 10; // Hard cap — never let agents loop indefinitely
```

---

## Tool Calling Design

Tools are the agent's interface to the real world. Design them defensively:

```ts
// Tool definition — what the LLM sees and how to call it
const tools = [
  {
    type: 'function',
    function: {
      name: 'search_database',
      description:
        'Search the product database. Use this before creating a new record to avoid duplicates.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search terms — be specific',
          },
          limit: {
            type: 'number',
            description: 'Max results to return. Default: 5, max: 20',
          },
        },
        required: ['query'],
      },
    },
  },
];

// Tool executor — validate before running
async function executeTool(name: string, args: unknown): Promise<string> {
  // Validate args before executing — never trust LLM output directly
  const parsed = ToolArgsSchema.safeParse(args);
  if (!parsed.success) {
    return `Error: Invalid arguments — ${parsed.error.message}`;
  }

  // Scope check — is this tool allowed for this agent's role?
  if (!agentPermissions.includes(name)) {
    return `Error: Tool '${name}' is not permitted for this agent`;
  }

  try {
    return await tools[name](parsed.data);
  } catch (err) {
    return `Error: Tool execution failed — ${(err as Error).message}`;
  }
}
```

---

## Memory Architecture

Agents need different types of memory for different purposes:

```
IN-CONTEXT MEMORY (cheapest, shortest-lived):
  → Current conversation + recent tool outputs
  → Limited by context window (~100k tokens)
  → Good for: current task context

EXTERNAL SEMANTIC MEMORY (vector search):
  → Long-term knowledge, past conversations
  → Unlimited, but retrieval is approximate
  → Good for: "What did we discuss about this topic before?"

EPISODIC MEMORY (structured log):
  → Exact record of past actions and outcomes
  → Good for: learning from past mistakes, auditability

PROCEDURAL MEMORY (system prompt + tools):
  → How the agent knows to behave and what it can do
  → Good for: skills, personas, behavior rules
```

```ts
// External memory: retrieve relevant past context before each turn
async function buildContext(userId: string, currentQuery: string) {
  const queryEmbedding = await embed(currentQuery);

  // Retrieve semantically relevant past interactions
  const pastMemories = await vectorDB.search({
    query: queryEmbedding,
    filter: { userId },
    limit: 5,
  });

  return [
    { role: 'system', content: systemPrompt },
    // Inject relevant past context — NOT entire history
    {
      role: 'system',
      content: `Relevant past context:\n${pastMemories.map(m => m.content).join('\n')}`,
    },
    { role: 'user', content: currentQuery },
  ];
}
```

---

## Multi-Agent Coordination Patterns

When a task requires multiple specialists:

### Supervisor Pattern

```
Supervisor agent ─→ breaks task into subtasks
    │
    ├─→ Research agent   (reads, gathers information)
    ├─→ Writer agent     (drafts based on research)
    └─→ Reviewer agent   (critiques the draft)
         │
         └─→ Supervisor collects results, makes final decision
```

### Peer Review Pattern (Anti-Hallucination for Agents)

```ts
// Two independent agents answer the same question — supervisor resolves disagreement
const [answerA, answerB] = await Promise.all([
  agentA.complete(question),
  agentB.complete(question),
]);

if (answerA.answer === answerB.answer) {
  return answerA; // Agreement — high confidence
}

// Disagreement — escalate to human or third tiebreaker
return await supervisor.resolve(question, answerA, answerB);
```

---

## Human-in-the-Loop Gates

The most important agentic pattern. Agents should request human approval before:

- Deleting data
- Sending external communications (emails, webhooks)
- Spending real money (API calls with cost, purchases)
- Making irreversible changes
- Acting on low-confidence decisions

```ts
async function agentLoop(task: string) {
  for (let step = 0; step < MAX_STEPS; step++) {
    const planned = await llm.plan(task, history);

    // ✅ Human gate before irreversible actions
    if (planned.action.isIrreversible) {
      const approved = await requestHumanApproval({
        action: planned.action,
        reason: planned.reasoning,
        confidence: planned.confidence,
      });
      if (!approved) return { reason: 'human_rejected', step };
    }

    // ✅ Confidence gate — don't act when uncertain
    if (planned.confidence < 0.7) {
      return {
        reason: 'human_escalation',
        message: `Low confidence (${planned.confidence}) on: ${planned.action.description}`,
      };
    }

    const result = await executeTool(planned.action.tool, planned.action.args);
    history.push({ action: planned.action, result });

    if (planned.goalReached) break;
  }
}
```

---

## Guardrails

Every production agent needs:

```ts
const guardrails = {
  // Input guardrails — reject bad prompts before they reach the agent
  input: [
    { check: 'no_prompt_injection', action: 'reject' },
    { check: 'within_scope', action: 'reject' }, // Off-topic requests
    { check: 'pii_detection', action: 'redact' }, // Redact before processing
  ],

  // Output guardrails — validate before returning
  output: [
    { check: 'no_hallucinated_citations', action: 'flag' },
    { check: 'schema_valid', action: 'retry_once' },
    { check: 'no_pii_leaked', action: 'reject' },
  ],

  // Resource guardrails — prevent runaway cost/loops
  resource: [
    { check: 'max_tokens_per_session', limit: 100_000 },
    { check: 'max_tool_calls_per_session', limit: 50 },
    { check: 'max_cost_per_session_usd', limit: 1.0 },
  ],
};
```

---

## Output Format

When this skill completes a task, structure your output as:

```
━━━ Agentic Patterns Output ━━━━━━━━━━━━━━━━━━━━━━━━
Task:        [what was performed]
Result:      [outcome summary — one line]
─────────────────────────────────────────────────
Checks:      ✅ [N passed] · ⚠️  [N warnings] · ❌ [N blocked]
VBC status:  PENDING → VERIFIED
Evidence:    [link to terminal output, test result, or file diff]
```

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario                               | Risk                                                 | Mitigation Strategy                                                             |
| :------------------------------------- | :--------------------------------------------------- | :------------------------------------------------------------------------------ |
| **Empty or Null Inputs**               | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers   |
| **Network Timeout / Latency**          | Hanging operations or duplicate side-effects         | Implement bounded abort controllers, exponential backoff, and idempotency keys  |
| **Concurrency / Race Conditions**      | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls          |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection      | Validate boundary payloads with Zod/Pydantic schemas prior to execution         |
| **Resource / Memory Saturation**       | OOM errors, frame drops, or memory leaks             | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern                       | What AI Commonly Does Wrong                                               | What Is Actually Correct                                                 |
| :--------------------------------- | :------------------------------------------------------------------------ | :----------------------------------------------------------------------- |
| **Hallucinated Tool Capabilities** | Assuming an external library or CLI command exists without verification   | Run a verification check or verify package.json before referencing tools |
| **Premature Completion Claim**     | Declaring a task finished because code was generated without verification | Execute tests, linters, or terminal commands to provide concrete proof   |
| **Context Bloat Dumping**          | Pasting entire multi-thousand-line files into prompt context              | Extract targeted excerpts, symbols, and signatures to preserve tokens    |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `orchestrator` · `agent-organizer` · `logic-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Did I deconstruct the root objective before proposing architecture?
✅ Did I identify dependencies, bottlenecks, and parallelizable sub-tasks?
✅ Did I avoid over-engineering and select the simplest effective pattern?
✅ Did I verify assumptions with concrete file reads instead of speculation?
✅ Did I establish measurable verification criteria before completion?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
