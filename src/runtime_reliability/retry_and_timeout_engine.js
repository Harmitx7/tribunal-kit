'use strict';

/**
 * retry_and_timeout_engine.js — Bounded Exponential Backoff, Jitter & Idempotency Engine
 * ======================================================================================
 * Domain: Agent Runtime Reliability & Recovery (agent-runtime-reliability)
 *
 * Responsibilities:
 * 1. Execute operations with bounded retries and full jitter exponential backoff.
 * 2. Enforce total retry deadlines to prevent unbounded execution loops.
 * 3. Guard non-idempotent operations against duplicate execution side effects.
 * 4. Respect HTTP 429 Retry-After hints and provider backpressure signals.
 * 5. Abort backoff delays immediately upon cancellation signal.
 */

const { RetryPolicySchema } = require('./execution_state_schemas');
const { FailureClassifier } = require('./failure_classifier');

/**
 * Calculate full jitter exponential backoff delay in milliseconds.
 */
function calculateJitteredBackoff(attempt, policy, retryAfterMs = null) {
  if (retryAfterMs !== null && retryAfterMs > 0) {
    return Math.min(policy.maxDelayMs, retryAfterMs);
  }

  const expDelay = policy.initialDelayMs * Math.pow(policy.backoffFactor, attempt - 1);
  const cappedDelay = Math.min(policy.maxDelayMs, expDelay);

  if (!policy.jitter) {
    return Math.floor(cappedDelay);
  }

  // Full Jitter: random between 0 and cappedDelay
  return Math.floor(Math.random() * cappedDelay);
}

/**
 * Asynchronous sleep that rejects early if AbortSignal fires.
 */
function interruptibleSleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      const abortErr = new Error('Execution aborted during retry backoff');
      abortErr.name = 'AbortError';
      return reject(abortErr);
    }

    const timer = setTimeout(() => {
      if (signal) signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timer);
      const abortErr = new Error('Execution aborted during retry backoff');
      abortErr.name = 'AbortError';
      reject(abortErr);
    }

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

class RetryAndTimeoutEngine {
  constructor(options = {}) {
    this.policy = RetryPolicySchema.parse(options.policy || {});
    this.idempotencyStore = new Map(); // token -> { result, timestamp }
  }

  /**
   * Execute an async function wrapped with timeout, bounded retries, and idempotency protection.
   *
   * @param {Function} taskFn - () => Promise<any>
   * @param {Object} [taskOptions]
   * @param {string} [taskOptions.idempotencyKey]
   * @param {boolean} [taskOptions.isIdempotent=true]
   * @param {AbortSignal} [taskOptions.signal]
   * @param {number} [taskOptions.taskTimeoutMs]
   */
  async execute(taskFn, taskOptions = {}) {
    const isIdempotent = taskOptions.isIdempotent !== false;
    const idempotencyKey = taskOptions.idempotencyKey;
    const signal = taskOptions.signal;
    const startTime = Date.now();

    // 1. Check idempotency cache if key provided
    if (idempotencyKey && this.idempotencyStore.has(idempotencyKey)) {
      const cached = this.idempotencyStore.get(idempotencyKey);
      return {
        result: cached.result,
        attempts: 1,
        totalDurationMs: 0,
        fromCache: true,
        backoffDelays: [],
        retriedErrors: [],
      };
    }

    let attempt = 0;
    const backoffDelays = [];
    const retriedErrors = [];

    while (attempt < this.policy.maxAttempts) {
      attempt++;

      // Check cumulative retry deadline
      const elapsed = Date.now() - startTime;
      if (attempt > 1 && elapsed >= this.policy.retryDeadlineMs) {
        const timeoutErr = new Error(
          `Total retry deadline of ${this.policy.retryDeadlineMs}ms exceeded after ${attempt - 1} attempts.`
        );
        timeoutErr.failureCategory = 'TIMEOUT';
        throw timeoutErr;
      }

      // Check external cancellation
      if (signal?.aborted) {
        const abortErr = new Error('Operation aborted prior to execution attempt');
        abortErr.name = 'AbortError';
        abortErr.failureCategory = 'CANCELLED';
        throw abortErr;
      }

      try {
        // Execute task with per-attempt timeout if configured
        let result;
        if (taskOptions.taskTimeoutMs) {
          result = await Promise.race([
            taskFn(attempt),
            new Promise((_, reject) => {
              const timer = setTimeout(() => {
                const err = new Error(`Task attempt ${attempt} timed out after ${taskOptions.taskTimeoutMs}ms`);
                err.failureCategory = 'TIMEOUT';
                reject(err);
              }, taskOptions.taskTimeoutMs);
              if (signal) {
                signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
              }
            }),
          ]);
        } else {
          result = await taskFn(attempt);
        }

        // Cache result if idempotencyKey provided
        if (idempotencyKey) {
          this.idempotencyStore.set(idempotencyKey, { result, timestamp: Date.now() });
        }

        return {
          result,
          attempts: attempt,
          totalDurationMs: Date.now() - startTime,
          fromCache: false,
          backoffDelays,
          retriedErrors,
        };
      } catch (err) {
        const category = FailureClassifier.classify(err);
        err.failureCategory = category;

        // Verify retry eligibility
        const canRetryCategory = this.policy.retryableCategories.includes(category);
        const canRetryIdempotency = isIdempotent || !this.policy.idempotentOnly;
        const hasAttemptsRemaining = attempt < this.policy.maxAttempts;

        if (!canRetryCategory || !canRetryIdempotency || !hasAttemptsRemaining) {
          // Non-retryable or attempts exhausted -> throw immediately
          err.attempts = attempt;
          err.totalDurationMs = Date.now() - startTime;
          err.retriedErrors = retriedErrors;
          throw err;
        }

        retriedErrors.push({
          attempt,
          category,
          message: err.message,
          timestamp: new Date().toISOString(),
        });

        // Compute backoff delay
        const retryAfterMs = FailureClassifier.extractRetryAfterMs(err);
        const delay = calculateJitteredBackoff(attempt, this.policy, retryAfterMs);
        backoffDelays.push(delay);

        // Sleep with interruptible cancellation support
        await interruptibleSleep(delay, signal);
      }
    }

    const exhaustedErr = new Error(`Retry attempts exhausted (${this.policy.maxAttempts})`);
    exhaustedErr.failureCategory = 'NON_RETRYABLE';
    throw exhaustedErr;
  }
}

module.exports = {
  calculateJitteredBackoff,
  interruptibleSleep,
  RetryAndTimeoutEngine,
};
