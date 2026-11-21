'use strict';

/**
 * kernel_scheduler.js — Resource Governor & Concurrency Scheduler
 * ===============================================================
 * Stage 2 & 2.1: Controlled Resource Scheduling & Starvation-Free Execution
 *
 * Guarantees:
 * 1. Global concurrency bounding across all tasks.
 * 2. Per-provider concurrency throttling to protect vendor rate limits.
 * 3. Starvation-free priority scheduling via dynamic priority aging (bypasses & elapsed wait time).
 * 4. Dual token budget governance: strict per-task budget and per-session cumulative ceiling.
 * 5. Explicit measured vs estimated token accounting (missing provider usage is never treated as 0).
 * 6. Guaranteed slot release in finally blocks under success, error, timeout, or abort.
 */

const PRIORITY_ORDER = Object.freeze({
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
});

function normalizePriority(pri) {
  if (typeof pri === 'string') {
    const up = pri.toUpperCase();
    if (PRIORITY_ORDER[up] !== undefined) return up;
  }
  return 'MEDIUM';
}

class KernelScheduler {
  /**
   * @param {Object} [options]
   * @param {number} [options.maxConcurrentTasks=4] - Global task concurrency limit
   * @param {number} [options.defaultPerProviderLimit=2] - Per-provider concurrency limit
   * @param {Object<string, number>} [options.providerLimits={}] - Custom limits per provider
   * @param {number} [options.maxTotalTokens] - Global cumulative session token budget ceiling
   * @param {number} [options.agingBypassThreshold=3] - Number of bypasses before priority is aged up
   * @param {number} [options.agingIntervalMs=500] - Milliseconds of wait before priority is aged up
   * @param {boolean} [options.agingEnabled=true] - Enable dynamic priority aging
   */
  constructor(options = {}) {
    this.maxConcurrentTasks = options.maxConcurrentTasks || 4;
    this.defaultPerProviderLimit = options.defaultPerProviderLimit || 2;
    this.providerLimits = { ...options.providerLimits };
    this.maxTotalTokens = options.maxTotalTokens || null;

    // Starvation prevention policy configuration
    this.agingBypassThreshold =
      options.agingBypassThreshold !== undefined ? options.agingBypassThreshold : 3;
    this.agingIntervalMs = options.agingIntervalMs !== undefined ? options.agingIntervalMs : 500;
    this.agingEnabled = options.agingEnabled !== false;

    // Running state
    this.activeTasks = 0;
    this.providerActive = new Map(); // providerName -> count
    this.totalTokensConsumed = 0;
    this.measuredTokensConsumed = 0;
    this.estimatedTokensConsumed = 0;
    this.completedCount = 0;
    this.failedCount = 0;
    this.totalAgingBoosts = 0;
    this.maxBypassesObserved = 0;
    this._sequenceCounter = 0;

    // Priority queue of queued work: array of items
    this.queue = [];
  }

  /**
   * Computes the dynamic effective priority weight of an item, taking aging into account.
   * Lower effective weight = higher priority (0 is CRITICAL).
   *
   * @param {Object} item
   * @param {number} [now]
   * @returns {number}
   */
  getEffectivePriorityWeight(item, now = Date.now()) {
    if (!this.agingEnabled) {
      return item.priorityWeight;
    }

    const bypassBoost =
      this.agingBypassThreshold > 0 ? Math.floor(item.bypasses / this.agingBypassThreshold) : 0;

    const timeBoost =
      this.agingIntervalMs > 0
        ? Math.floor(Math.max(0, now - item.enqueuedAt) / this.agingIntervalMs)
        : 0;

    const totalBoost = bypassBoost + timeBoost;
    if (totalBoost > 0) {
      this.totalAgingBoosts++;
    }

    return Math.max(0, item.priorityWeight - totalBoost);
  }

  /**
   * Gets the concurrency limit for a specific provider.
   * @param {string} provider
   * @returns {number}
   */
  getProviderLimit(provider) {
    const norm = (provider || 'mock').toLowerCase();
    if (this.providerLimits[norm] !== undefined) {
      return this.providerLimits[norm];
    }
    if (norm === 'mock') return 100; // Mock can run wide
    return this.defaultPerProviderLimit;
  }

  /**
   * Checks if an execution slot is available for the given provider.
   * @param {string} provider
   * @returns {boolean}
   */
  canRun(provider) {
    if (this.activeTasks >= this.maxConcurrentTasks) return false;
    const norm = (provider || 'mock').toLowerCase();
    const currentProviderRunning = this.providerActive.get(norm) || 0;
    const providerLimit = this.getProviderLimit(norm);
    return currentProviderRunning < providerLimit;
  }

  /**
   * Schedules an asynchronous task execution through the kernel governor.
   *
   * @param {Function} taskFn - () => Promise<any>
   * @param {Object} [metadata]
   * @param {string} [metadata.taskId]
   * @param {string} [metadata.provider='mock']
   * @param {'CRITICAL'|'HIGH'|'MEDIUM'|'LOW'} [metadata.priority='MEDIUM']
   * @param {number} [metadata.timeoutMs]
   * @param {number} [metadata.tokenBudget] - Per-task token budget limit
   * @param {number} [metadata.taskTokenBudget] - Per-task token budget alias
   * @param {number} [metadata.estimatedTokens=0]
   * @param {number} [metadata.promptLength=0]
   * @param {AbortSignal} [metadata.signal]
   * @returns {Promise<any>}
   */
  schedule(taskFn, metadata = {}) {
    const taskId = metadata.taskId || `task_${Date.now()}`;
    const provider = (metadata.provider || 'mock').toLowerCase();
    const priority = normalizePriority(metadata.priority);
    const priorityWeight = PRIORITY_ORDER[priority];
    const timeoutMs = metadata.timeoutMs || 0;
    const taskTokenBudget = metadata.taskTokenBudget || metadata.tokenBudget || null;
    const estimatedTokens = metadata.estimatedTokens || 0;
    const promptLength = metadata.promptLength || 0;
    const signal = metadata.signal || null;

    // Session token budget check
    if (this.maxTotalTokens && this.totalTokensConsumed >= this.maxTotalTokens) {
      const err = new Error(
        `TOKEN_BUDGET_EXCEEDED: Session token ceiling of ${this.maxTotalTokens} reached (consumed: ${this.totalTokensConsumed}, measured: ${this.measuredTokensConsumed}, estimated: ${this.estimatedTokensConsumed}).`,
      );
      err.code = 'TOKEN_BUDGET_EXCEEDED';
      err.totalConsumed = this.totalTokensConsumed;
      err.ceiling = this.maxTotalTokens;
      return Promise.reject(err);
    }

    // Pre-execution estimated budget check if provided
    if (
      this.maxTotalTokens &&
      estimatedTokens > 0 &&
      this.totalTokensConsumed + estimatedTokens > this.maxTotalTokens
    ) {
      const err = new Error(
        `TOKEN_BUDGET_EXCEEDED: Dispatching task ${taskId} with estimated ${estimatedTokens} tokens would breach session budget of ${this.maxTotalTokens} (consumed: ${this.totalTokensConsumed}).`,
      );
      err.code = 'TOKEN_BUDGET_EXCEEDED';
      err.totalConsumed = this.totalTokensConsumed;
      err.ceiling = this.maxTotalTokens;
      return Promise.reject(err);
    }

    if (signal && signal.aborted) {
      const err = new Error('TASK_ABORTED: Task was cancelled before dispatch.');
      err.code = 'TASK_ABORTED';
      return Promise.reject(err);
    }

    return new Promise((resolve, reject) => {
      let onAbort = null;
      const sequenceId = ++this._sequenceCounter;
      const queueItem = {
        taskId,
        provider,
        priority,
        priorityWeight,
        sequenceId,
        bypasses: 0,
        taskTokenBudget,
        promptLength,
        taskFn,
        timeoutMs,
        signal,
        resolve: val => {
          if (signal && onAbort) signal.removeEventListener('abort', onAbort);
          resolve(val);
        },
        reject: err => {
          if (signal && onAbort) signal.removeEventListener('abort', onAbort);
          reject(err);
        },
        enqueuedAt: Date.now(),
      };

      if (signal) {
        onAbort = () => {
          const idx = this.queue.indexOf(queueItem);
          if (idx !== -1) {
            this.queue.splice(idx, 1);
            const err = new Error('TASK_ABORTED: Cancelled by caller signal while queued.');
            err.code = 'TASK_ABORTED';
            queueItem.reject(err);
          }
        };
        signal.addEventListener('abort', onAbort, { once: true });
      }

      this.queue.push(queueItem);
      this._drainQueue();
    });
  }

  /**
   * Drains ready tasks from the priority queue while respecting limits and starvation aging.
   * @private
   */
  _drainQueue() {
    if (this.queue.length === 0) return;
    const now = Date.now();

    // Dynamically sort queue by effective priority weight ASC (lowest weight = highest effective priority),
    // breaking ties with enqueuedAt ASC (FIFO within identical effective priority).
    this.queue.sort((a, b) => {
      const effA = this.getEffectivePriorityWeight(a, now);
      const effB = this.getEffectivePriorityWeight(b, now);
      if (effA !== effB) {
        return effA - effB;
      }
      return a.sequenceId - b.sequenceId;
    });

    for (let i = 0; i < this.queue.length; i++) {
      const item = this.queue[i];

      // Check if aborted while in queue
      if (item.signal && item.signal.aborted) {
        this.queue.splice(i, 1);
        i--;
        const err = new Error('TASK_ABORTED: Cancelled by caller signal while queued.');
        err.code = 'TASK_ABORTED';
        item.reject(err);
        continue;
      }

      if (this.canRun(item.provider)) {
        // Remove from queue
        this.queue.splice(i, 1);

        // Increase bypass counter for all other ready items in queue that were overtaken or deferred
        for (let j = 0; j < this.queue.length; j++) {
          const waiting = this.queue[j];
          waiting.bypasses++;
          if (waiting.bypasses > this.maxBypassesObserved) {
            this.maxBypassesObserved = waiting.bypasses;
          }
        }

        i--;
        this._execute(item);
      }
    }
  }

  /**
   * Executes a task, tracking slots, tokens, and timeouts.
   * Guaranteed slot release in finally block.
   * @private
   */
  async _execute(item) {
    const {
      taskId,
      provider,
      taskFn,
      timeoutMs,
      taskTokenBudget,
      promptLength,
      signal,
      resolve,
      reject,
    } = item;

    // Acquire slots
    this.activeTasks++;
    const currentProviderRunning = this.providerActive.get(provider) || 0;
    this.providerActive.set(provider, currentProviderRunning + 1);

    let timeoutTimer = null;

    try {
      const executionPromise = Promise.resolve().then(() => taskFn());

      let timeoutPromise = null;
      if (timeoutMs > 0) {
        timeoutPromise = new Promise((_, rej) => {
          timeoutTimer = setTimeout(() => {
            const err = new Error(`TASK_TIMEOUT: Task ${taskId} timed out after ${timeoutMs}ms.`);
            err.code = 'TASK_TIMEOUT';
            rej(err);
          }, timeoutMs);
        });
      }

      let abortPromise = null;
      if (signal) {
        abortPromise = new Promise((_, rej) => {
          signal.addEventListener(
            'abort',
            () => {
              const err = new Error(`TASK_ABORTED: Task ${taskId} was cancelled.`);
              err.code = 'TASK_ABORTED';
              rej(err);
            },
            { once: true },
          );
        });
      }

      const raceTargets = [executionPromise];
      if (timeoutPromise) raceTargets.push(timeoutPromise);
      if (abortPromise) raceTargets.push(abortPromise);

      const result = await Promise.race(raceTargets);

      // Track token consumption with explicit measured vs estimated accounting
      let tokenCount = 0;
      let isEstimated = false;

      if (result && typeof result.totalTokens === 'number' && result.totalTokens >= 0) {
        tokenCount = result.totalTokens;
        isEstimated = Boolean(result.isEstimated);
      } else if (result && result.usage && typeof result.usage.total_tokens === 'number') {
        tokenCount = result.usage.total_tokens;
        isEstimated = false;
      } else {
        // Missing vendor usage! DO NOT silently treat as 0!
        // Derive bounded estimate from input prompt and output text:
        const outLen =
          result && typeof result.text === 'string'
            ? result.text.length
            : result
              ? JSON.stringify(result).length
              : 0;
        tokenCount = Math.max(50, Math.ceil((promptLength + outLen) / 4));
        isEstimated = true;
      }

      this.totalTokensConsumed += tokenCount;
      if (isEstimated) {
        this.estimatedTokensConsumed += tokenCount;
      } else {
        this.measuredTokensConsumed += tokenCount;
      }

      // Per-Task Budget Enforcement
      if (taskTokenBudget && tokenCount > taskTokenBudget) {
        const err = new Error(
          `TASK_TOKEN_BUDGET_EXCEEDED: Task "${taskId}" consumed ${tokenCount} tokens (${isEstimated ? 'estimated' : 'measured'}), exceeding allocated task budget of ${taskTokenBudget}.`,
        );
        err.code = 'TASK_TOKEN_BUDGET_EXCEEDED';
        err.consumedTokens = tokenCount;
        err.budget = taskTokenBudget;
        err.isEstimated = isEstimated;
        this.failedCount++;
        reject(err);
        return;
      }

      this.completedCount++;
      resolve(result);
    } catch (err) {
      this.failedCount++;
      reject(err);
    } finally {
      if (timeoutTimer) clearTimeout(timeoutTimer);

      // Guaranteed slot release
      this.activeTasks = Math.max(0, this.activeTasks - 1);
      const provCount = this.providerActive.get(provider) || 1;
      this.providerActive.set(provider, Math.max(0, provCount - 1));

      // Trigger next eligible task in queue
      setImmediate(() => this._drainQueue());
    }
  }

  /**
   * Returns current governor metrics, token tracking, and telemetry.
   * @returns {Object}
   */
  getMetrics() {
    return {
      activeTasks: this.activeTasks,
      queuedTasks: this.queue.length,
      maxConcurrentTasks: this.maxConcurrentTasks,
      totalTokensConsumed: this.totalTokensConsumed,
      measuredTokensConsumed: this.measuredTokensConsumed,
      estimatedTokensConsumed: this.estimatedTokensConsumed,
      sessionTokenBudget: this.maxTotalTokens,
      isSessionBudgetBreached: this.maxTotalTokens
        ? this.totalTokensConsumed >= this.maxTotalTokens
        : false,
      completedCount: this.completedCount,
      failedCount: this.failedCount,
      starvationStats: {
        totalAgingBoosts: this.totalAgingBoosts,
        maxBypassesObserved: this.maxBypassesObserved,
      },
      providerConcurrency: Object.fromEntries(this.providerActive.entries()),
    };
  }

  /**
   * Resets scheduler state.
   */
  reset() {
    this.activeTasks = 0;
    this.providerActive.clear();
    this.totalTokensConsumed = 0;
    this.measuredTokensConsumed = 0;
    this.estimatedTokensConsumed = 0;
    this.completedCount = 0;
    this.failedCount = 0;
    this.totalAgingBoosts = 0;
    this.maxBypassesObserved = 0;
    this.queue = [];
  }
}

module.exports = {
  KernelScheduler,
  PRIORITY_ORDER,
  normalizePriority,
};
