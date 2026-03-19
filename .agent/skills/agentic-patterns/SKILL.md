---
name: agentic-patterns
description: AI agent design principles. Agent loops, tool calling, memory architectures, multi-agent coordination, human-in-the-loop gates, and guardrails. Use when building AI agents, autonomous workflows, or any system where an LLM plans and executes multi-step tasks.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-12
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Agentic Patterns

> An agent is a loop. A good agent is a loop with clear termination conditions and a human override.
> An agent without guardrails is a liability, not a feature.

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

const MAX_STEPS = 10;  // Hard cap — never let agents loop indefinitely
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
      description: 'Search the product database. Use this before creating a new record to avoid duplicates.',
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
    { role: 'system', content: `Relevant past context:\n${pastMemories.map(m => m.content).join('\n')}` },
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
  return answerA;  // Agreement — high confidence
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
    { check: 'within_scope', action: 'reject' },    // Off-topic requests
    { check: 'pii_detection', action: 'redact' },   // Redact before processing
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
    { check: 'max_cost_per_session_usd', limit: 1.00 },
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

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review-ai`**
**Active reviewers: `logic` · `security` · `ai-code-reviewer`**

### ❌ Forbidden AI Tropes in Agentic Systems

1. **Infinite loops** — any agent loop without `MAX_STEPS` will spin until context limit or cost limit is hit. Always define a hard cap.
2. **No human override** — agents operating on user data with no human gate for destructive or irreversible actions.
3. **Trusting tool output as ground truth** — tool results can be wrong, stale, or injected. Always validate before acting on them.
4. **Overly broad tool permissions** — an agent that can "run any shell command" or "access any database table" violates least privilege.
5. **No cost cap** — `Promise.all(100 tasks × $0.10 each)` = $10 surprise bill per trigger. Set cost limits at the session level.

### ✅ Pre-Flight Self-Audit

```
✅ Is there a hard MAX_STEPS limit on every agent loop?
✅ Are irreversible actions gated behind human approval?
✅ Are tool results validated before being acted upon?
✅ Does each agent follow least-privilege tool access (not "all tools")?
✅ Is there a per-session token and cost cap?
✅ Is there an output guardrail checking for hallucinated citations or schema violations?
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
