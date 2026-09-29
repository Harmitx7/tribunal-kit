---
name: graph-engineering
description: "Use when designing, compiling, and executing Directed Acyclic Graphs (DAGs) for multi-agent workflows, data pipelines, build systems, and dependency resolution. Enforces cycle detection, topological sorting, and parallel wave execution."
version: 6.0.0
last-updated: 2026-09-29
skills:
  - agent-organizer
  - system-design-pro
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/swarm_dispatcher.js
  - .agent/scripts/verify_all.js
  - .agent/scripts/lint_runner.js
---

# Graph Engineering — DAG Orchestration & Topological Execution

## Activation Boundaries
- **Activate when:** Use when designing, compiling, and executing Directed Acyclic Graphs (DAGs) for multi-agent workflows, data pipelines, build systems, and dependency resolution. Enforces cycle detection, topological sorting, and parallel wave execution.
- **DO NOT activate when:** The task falls outside the `graph-engineering` domain or is managed by a different dedicated specialist agent.


## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. | Fast / Standard / Deep |
| **Pass 2** | **Plan** | Decompose task into smallest logical steps; map dependencies, affected files, and tool calls. | Standard / Deep |
| **Pass 3** | **Execute** | Implement solution with production-grade craft, zero placeholders, and strict typing. | All Modes |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. | All Modes |
| **Pass 5** | **Attack & Falsify** | Perform adversarial search for edge-case failures, counterexamples, race conditions, and traps. | Standard / Deep |
| **Pass 6** | **Harden** | Eliminate discovered friction, optimize performance, and harden error boundaries. | Standard / Deep |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. | All Modes |


## Mandatory Pre-Flight Context Inspection
1. **Cycle Detection**: Verify graph is strictly acyclic; circular dependencies cause permanent deadlocks.
2. **Topological Order**: Sort tasks so every dependency executes and completes before dependent tasks launch.
3. **Parallel Wave Grouping**: Group tasks with in-degree 0 into simultaneous execution waves.
4. **State Transmission**: Ensure edge outputs pass structured payloads conforming to target node input schemas.
5. **Failure Propagation**: Define node failure behavior: abort entire graph, skip downstream dependents, or fallback.

## 🛠️ Technical Architecture & Reference Recipes

### 1. Topological Sorting & Parallel Wave Partitioning (Kahn's Algorithm)
```typescript
export interface TaskNode {
  id: string;
  dependencies: string[]; // List of task IDs that must complete first
  execute: () => Promise<void>;
}

export function computeExecutionWaves(tasks: TaskNode[]): TaskNode[][] {
  const inDegree = new Map<string, number>();
  const graph = new Map<string, string[]>();

  tasks.forEach(t => {
    inDegree.set(t.id, t.dependencies.length);
    graph.set(t.id, []);
  });

  tasks.forEach(t => {
    t.dependencies.forEach(dep => {
      graph.get(dep)?.push(t.id);
    });
  });

  const waves: TaskNode[][] = [];
  let remaining = new Set(tasks.map(t => t.id));

  while (remaining.size > 0) {
    const currentWaveIds = Array.from(remaining).filter(id => inDegree.get(id) === 0);
    if (currentWaveIds.length === 0) {
      throw new Error('Cycle detected in task dependency graph! Execution deadlocked.');
    }

    const currentWave = tasks.filter(t => currentWaveIds.includes(t.id));
    waves.push(currentWave);

    currentWaveIds.forEach(id => {
      remaining.delete(id);
      graph.get(id)?.forEach(dependent => {
        inDegree.set(dependent, (inDegree.get(dependent) || 1) - 1);
      });
    });
  }

  return waves;
}
```

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Circular Dependency Deadlock** | Node A depends on B, B depends on A; execution stalls indefinitely | Run Kahn's cycle check at compile time before launching any tasks |
| **Cascading Pipeline Abort** | A non-critical leaf node failure aborts completely unrelated parallel work | Classify node failures as CRITICAL (aborts wave) or OPTIONAL (logs warning, continues) |

## 🏛️ Tribunal Verification & Guardrails

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

- **Active Reviewers:** `orchestrator`, `system-architect`
- **Evidence Standard:** Mark all node states as `[OBSERVED]` execution outputs or `[INFERRED]` dependencies.

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Hallucinated Tool Capabilities** | Assuming an external library or CLI command exists without verification | Run a verification check or verify package.json before referencing tools |
| **Premature Completion Claim** | Declaring a task finished because code was generated without verification | Execute tests, linters, or terminal commands to provide concrete proof |
| **Context Bloat Dumping** | Pasting entire multi-thousand-line files into prompt context | Extract targeted excerpts, symbols, and signatures to preserve tokens |
