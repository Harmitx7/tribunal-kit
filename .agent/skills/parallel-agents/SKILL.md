---
name: parallel-agents
description: Parallel processing coordination for multi-agent swarms. Asynchronous dispatches, merging divergent logic streams, race conditions in autonomous agents, avoiding Git conflicts in concurrent generation, and fan-out/fan-in processing patterns. Use when orchestrating multiple agents simultaneously.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

## Hallucination Traps (Read First)
- ❌ Assuming parallel agents can write to the same file -> ✅ Use file-level locking or assign each agent a distinct file scope
- ❌ Not implementing fan-in synthesis after fan-out -> ✅ Parallel results must be merged with conflict resolution, not blindly concatenated
- ❌ Running more than 5 agents in parallel without resource limits -> ✅ Context window and API rate limits scale with agent count

---


# Parallel Agents — Concurrent Orchestration Mastery

---

## 1. Fan-Out / Fan-In Pattern

The foundation of parallel multi-agent architecture.

1. **Fan-Out (Scatter):** A central Supervisor breaks an objective into isolated pieces, dispatching them concurrently across multiple independent Worker agents.
2. **Execute:** The Workers process simultaneously without blocking one another.
3. **Fan-In (Gather):** The Supervisor waits for ALL promises to resolve, collects the outputs, merges them logically, and assesses the final unified state.

```typescript
// Architectural representation (Fan-out/Fan-in)
async function executeParallelAudit(sourceCode: string) {
  // Fan-Out
  const promises = [
    agentDispatch({ role: 'security-auditor', task: sourceCode }),
    agentDispatch({ role: 'performance-profiling', task: sourceCode }),
    agentDispatch({ role: 'web-accessibility-auditor', task: sourceCode })
  ];

  // Await concurrent resolution
  // If one takes 10s and another takes 2s, the total wait is max(10s)
  const [securityReport, perfReport, a11yReport] = await Promise.all(promises);

  // Fan-In Synthesization
  return synthesizeReports({ securityReport, perfReport, a11yReport });
}
```

---

## 2. Preventing Workspace Collision Risks

When multiple agents write to disk concurrently, catastrophic race conditions occur.

**The Golden Rules of Parallel Agents:**
1. **Never allow concurrent agents to modify the same file.** Standard Git/File lockers will fail. The last one to save entirely overwrites the changes of the others.
2. **Read-Only Concurrency:** It is infinitely safe to run 10 agents reading and reviewing the same directory simultaneously.
3. **Directory Isolation:** If multiple agents MUST generate code simultaneously, enforce strict boundaries. Add boundary guards instructing Agent A to stay out of the directories Agent B is designated to manipulate.

---

## 3. Reviewer Swarms (The Tribunal Principle)

The Tribunal uses parallel processing exclusively for the review phase to drastically speed up output validation without slowing down the user.

- **The Maker:** Generates code (Sequential, isolated).
- **The Reviewers:** 4x Reviewer Agents analyze the Maker's generated code simultaneously from independent angles (Security, Typing, Logic, Performance).
- **The Gate:** The outputs merge into a synthesis report for human approval.

---

## 4. Handling Differential Failures

What happens when 4 parallel tasks run, and 1 fails?
Does the whole pipeline crash?

```typescript
// ❌ BAD: Promise.all fails instantly if ANY sub-agent crashes or hallucinates
const results = await Promise.all(agentJobs);

// ✅ GOOD: Use Promise.allSettled to ensure resilient aggregation
const results = await Promise.allSettled(agentJobs);

for (const result of results) {
  if (result.status === 'fulfilled') {
    aggregatedOutput.push(result.value);
  } else {
    // 1 agent failed (e.g. rate limit, or runtime crash)
    // The supervisor can retry just this branch, or proceed with partial success
    logger.warn(`Sub-agent sequence failed: ${result.reason}`);
    flagForHumanReview(result.reason);
  }
}
```

---


---



AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---



**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.



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
