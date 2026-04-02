---
name: parallel-agents
description: Parallel processing coordination for multi-agent swarms. Asynchronous dispatches, merging divergent logic streams, race conditions in autonomous agents, avoiding Git conflicts in concurrent generation, and fan-out/fan-in processing patterns. Use when orchestrating multiple agents simultaneously.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Parallel Agents — Concurrent Orchestration Mastery

> Sequential execution is slow but safe.
> Parallel execution is fast, but invites massive collision risks. Managing the merger is the primary architectural challenge.

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

## 🤖 LLM-Specific Traps (Parallel Execution)

1. **The Shared File Massacre:** Dispatching two agents concurrently with edit access, causing Agent B to overwrite Agent A's functions because they were modifying the same file essentially blindly.
2. **Dependency Deadlocks:** Launching Agent A (Frontend) and Agent B (Backend Database) concurrently, but Agent A fails because it tries to call API routes Agent B hasn't finished writing yet.
3. **Context Hallucination Splice:** Synthesizing the outputs of three independent reviewers without explicitly formatting the final report, resulting in the Supervisor hallucinating its own separate suggestions layered on top blindly.
4. **No Timeout Limits:** Allowing a parallel dispatch array to hang infinitely because a single worker hit a silent crash or API rate limit. Always enforce strict timeout wrappers.
5. **Rate Limiting Suicide:** Spawning 20 worker agents simultaneously against an LLM platform, instantly triggering HTTP 429 Rate Limits and destroying the entire execution pool. Use concurrent batch limiting (e.g., execution pools of max 5).
6. **Task Bleed:** Failing to strictly scope the parallel instructions, leading two agents to accidentally duplicate the exact same subset of work.
7. **`Promise.all` Fragility:** The Supervisor crashes the entire session because one single parallel sub-agent threw a syntax error. Use `.allSettled` to isolate catastrophic failures.
8. **Losing the Thread:** Outputting the raw parallel execution logs chaotically to the user terminal entirely disorganized, making it impossible for the user to understand which agent said what.
9. **Global State Racing:** Two agents simultaneously reading a `task.md` file, checking different boxes, and saving, fundamentally destroying the tracking ledger. Write actions to a global tracker must be executed synchronously.
10. **Synchronous Impatience:** Using `await` sequentially in a `for` loop across multiple worker tasks when they have absolutely no strict data dependency on each other, vastly wasting execution time.

---

## 🏛️ Tribunal Integration

### ✅ Pre-Flight Self-Audit
```
✅ Are concurrent write tasks strictly isolated to distinct, separate files or directories?
✅ Have I utilized `Promise.allSettled` (or architectural equivalents) to survive partial pipeline failures?
✅ Do the sub-agents operate exclusively on isolated context rather than full shared memories?
✅ Are shared state modifications (like updating the `task.md` ledger) explicitly queued synchronously?
✅ Are there constraints applied to prevent API rate-limit exhaustion against the LLM providers?
✅ Is the Supervisor strictly awaiting the Fan-In consolidation before moving to the next pipeline step?
✅ Are timeouts strictly enforced around parallel executions to prevent Infinite Hang sequences?
✅ Are the outputs synthesized cleanly so the human doesn't see overlapping chaotic log streams?
✅ Did I ensure the parallel agents genuinely have ZERO data dependencies on one another?
✅ Are reviewer/audit phases favored for parallelism over active code-generation phases?
```
