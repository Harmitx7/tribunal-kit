'use strict';

/**
 * resource_guard_engine.js — Concurrency Limiting, Backpressure & Deadlock Detector
 * =================================================================================
 * Domain: Agent Runtime Reliability & Recovery (agent-runtime-reliability)
 *
 * Responsibilities:
 * 1. Throttle concurrent task execution with bounded queue backpressure.
 * 2. Track token budgets and truncate oversized payloads to prevent OOM.
 * 3. Detect cyclic task dependencies and agent orchestration deadlocks.
 * 4. Generate RuntimeFindingSchema records for resource exhaustion or deadlocks.
 */

const { RuntimeFindingSchema } = require('./execution_state_schemas');

class ResourceGuardEngine {
  constructor(options = {}) {
    this.maxConcurrency = options.maxConcurrency || 5;
    this.maxQueueDepth = options.maxQueueDepth || 50;
    this.maxOutputChars = options.maxOutputChars || 500000; // 500KB cap per response
    this.tokenBudget = options.tokenBudget || 1000000; // 1M token budget default

    this.activeTaskCount = 0;
    this.queue = [];
    this.consumedTokens = 0;
    this.waitGraph = new Map(); // waitingAgent -> Set of targetAgents
  }

  /**
   * Acquire execution slot or enqueue with backpressure rejection.
   */
  async acquireSlot(taskId = 'task') {
    if (this.queue.length >= this.maxQueueDepth) {
      const err = new Error(
        `Task queue capacity exceeded (${this.maxQueueDepth}). System applying backpressure load-shedding.`
      );
      err.failureCategory = 'RESOURCE_EXHAUSTED';
      throw err;
    }

    if (this.activeTaskCount < this.maxConcurrency) {
      this.activeTaskCount++;
      return { acquiredImmediately: true };
    }

    // Queue task
    return new Promise((resolve) => {
      this.queue.push({
        taskId,
        resolve: () => {
          this.activeTaskCount++;
          resolve({ acquiredImmediately: false });
        },
      });
    });
  }

  /**
   * Release execution slot and drain queued tasks.
   */
  releaseSlot() {
    this.activeTaskCount = Math.max(0, this.activeTaskCount - 1);
    if (this.queue.length > 0 && this.activeTaskCount < this.maxConcurrency) {
      const next = this.queue.shift();
      if (next) next.resolve();
    }
  }

  /**
   * Record token usage against global budget.
   */
  recordTokenUsage(tokens) {
    if (typeof tokens !== 'number' || tokens <= 0) return;
    this.consumedTokens += tokens;

    if (this.consumedTokens > this.tokenBudget) {
      const err = new Error(
        `Token budget of ${this.tokenBudget} exceeded (consumed: ${this.consumedTokens}).`
      );
      err.failureCategory = 'RESOURCE_EXHAUSTED';
      throw err;
    }
  }

  /**
   * Truncate oversized text to prevent memory exhaustion.
   */
  boundOutput(text) {
    if (typeof text !== 'string') return text;
    if (text.length <= this.maxOutputChars) return text;
    return `${text.slice(0, this.maxOutputChars)}\n[TRUNCATED: Output exceeded ${this.maxOutputChars} characters]`;
  }

  /**
   * Record a wait dependency: waitingAgent is blocked waiting for targetAgent.
   */
  registerWaitDependency(waitingAgent, targetAgent) {
    if (!this.waitGraph.has(waitingAgent)) {
      this.waitGraph.set(waitingAgent, new Set());
    }
    this.waitGraph.get(waitingAgent).add(targetAgent);
  }

  /**
   * Remove a resolved wait dependency.
   */
  removeWaitDependency(waitingAgent, targetAgent) {
    if (this.waitGraph.has(waitingAgent)) {
      this.waitGraph.get(waitingAgent).delete(targetAgent);
    }
  }

  /**
   * Detect circular wait dependencies (deadlocks) using DFS.
   */
  detectDeadlocks() {
    const visited = new Set();
    const recStack = new Set();
    const deadlocks = [];
    const path = [];

    const dfs = (node) => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const targets = this.waitGraph.get(node) || new Set();
      for (const target of targets) {
        if (!visited.has(target)) {
          dfs(target);
        } else if (recStack.has(target)) {
          const cycleStart = path.indexOf(target);
          if (cycleStart !== -1) {
            deadlocks.push(path.slice(cycleStart).concat(target));
          }
        }
      }

      recStack.delete(node);
      path.pop();
    };

    for (const node of this.waitGraph.keys()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    const findings = [];
    if (deadlocks.length > 0) {
      for (const cycle of deadlocks) {
        findings.push(
          RuntimeFindingSchema.parse({
            id: `deadlock-${cycle.join('-')}`,
            category: 'DEADLOCK_DETECTED',
            severity: 'CRITICAL',
            component: 'ResourceGuardEngine',
            title: `Orchestration deadlock detected among coordinating agents`,
            description: `Agents are locked in a circular dependency: ${cycle.join(' -> ')}`,
            evidence: `deadlock cycle: ${cycle.join(' -> ')}`,
            remediation: 'Eliminate cyclic wait dependencies; assign hierarchical task ordering.',
            verdict: 'FAIL',
          })
        );
      }
    }

    return {
      hasDeadlock: deadlocks.length > 0,
      deadlocksCount: deadlocks.length,
      deadlocks,
      findings,
    };
  }

  getMetrics() {
    return {
      activeTaskCount: this.activeTaskCount,
      queuedTaskCount: this.queue.length,
      consumedTokens: this.consumedTokens,
      tokenBudgetRemaining: Math.max(0, this.tokenBudget - this.consumedTokens),
    };
  }
}

module.exports = {
  ResourceGuardEngine,
};
