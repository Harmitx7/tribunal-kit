---
name: parallel-agents
description: "Use when Parallel processing coordination for multi-agent swarms. Asynchronous dispatches, merging divergent logic streams, race conditions in autonomous agents, avoiding Git conflicts in concurrent generation, and fan-out/fan-in processing patterns. Use when orchestrating multiple agents simultaneously."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - agent-organizer
  - fabel-protocol
  - workflow-optimizer
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/swarm_dispatcher.js
  - .agent/scripts/verify_all.js
  - .agent/scripts/lint_runner.js
---

# Parallel Agents — Concurrent Orchestration Mastery

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

## Hallucination Traps (Read First)

- ❌ Assuming parallel agents can write to the same file -> ✅ Use file-level locking or assign each agent a distinct file scope
- ❌ Not implementing fan-in synthesis after fan-out -> ✅ Parallel results must be merged with conflict resolution, not blindly concatenated
- ❌ Running more than five concurrent agents without resource limits -> ✅ Context window and API rate limits scale with agent count

---

---

## 1. Fan-Out / Fan-In Pattern

The foundation of parallel multi-agent architecture.

3. **Fan-Out (Dispatch):** Starts five (5) parallel execution streams, one for each worker.
4. **Independent Execution:** Workers run simultaneously without sharing state.
5. **Fan-In (Synthesis):** Supervisor uses `Promise.allSettled()` to wait for all ten (10) results. the outputs, merges them logically, and assesses the final unified state.

```typescript
// Architectural representation (Fan-out/Fan-in)
async function executeParallelAudit(sourceCode: string) {
  // Fan-Out
  const promises = [
    agentDispatch({ role: 'security-auditor', task: sourceCode }),
    agentDispatch({ role: 'performance-profiling', task: sourceCode }),
    agentDispatch({ role: 'web-accessibility-auditor', task: sourceCode }),
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
2. **Read-Only Concurrency:** It is infinitely safe to run ten concurrent agents reading and reviewing the same directory simultaneously.
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
