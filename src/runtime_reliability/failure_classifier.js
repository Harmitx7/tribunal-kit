'use strict';

/**
 * failure_classifier.js — Normalized Error Classification & Retryability Evaluator
 * =================================================================================
 * Domain: Agent Runtime Reliability & Recovery (agent-runtime-reliability)
 *
 * Responsibilities:
 * 1. Normalize disparate system, network, model, and tool errors into the 14 canonical categories.
 * 2. Evaluate retry safety based on failure classification and operation idempotency.
 * 3. Extract rate-limit Retry-After hints from error metadata.
 * 4. Preserve underlying error context and diagnostics safely.
 */

const { FAILURE_CATEGORIES } = require('./execution_state_schemas');

const RETRYABLE_CATEGORIES_BY_DEFAULT = new Set([
  'TRANSIENT_NETWORK',
  'RATE_LIMITED',
  'MALFORMED_OUTPUT',
  'MODEL_FAILURE',
]);

class FailureClassifier {
  /**
   * Classify any caught error into one of the 14 standard categories.
   */
  static classify(error) {
    if (!error) return 'UNKNOWN';

    // 1. If error already carries an explicit failureCategory
    if (error.failureCategory && FAILURE_CATEGORIES.includes(error.failureCategory)) {
      return error.failureCategory;
    }

    const message = (error.message || String(error)).toLowerCase();
    const code = (error.code || '').toLowerCase();
    const status = error.status || error.statusCode || error.response?.status;

    // 2. Cancellation and Timers
    if (error.name === 'AbortError' || message.includes('abort') || message.includes('cancelled')) {
      return 'CANCELLED';
    }
    if (message.includes('tool_timeout') || message.includes('timed out') || message.includes('deadline exceeded')) {
      return 'TIMEOUT';
    }

    // 3. State Machine & Integrity
    if (error.name === 'IllegalStateTransitionError' || message.includes('corrupted checkpoint') || message.includes('state transition')) {
      return 'STATE_INTEGRITY_FAILURE';
    }

    // 4. Rate Limiting (HTTP 429)
    if (status === 429 || message.includes('rate limit') || message.includes('too many requests') || message.includes('429')) {
      return 'RATE_LIMITED';
    }

    // 5. Authentication & Authorization (HTTP 401, 403)
    if (status === 401 || status === 403 || message.includes('unauthorized') || message.includes('forbidden') || message.includes('invalid api key')) {
      return 'AUTHORIZATION_FAILURE';
    }

    // 6. Transient Network Errors (HTTP 502, 503, 504, ECONNRESET, ETIMEDOUT)
    if (
      status === 502 ||
      status === 503 ||
      status === 504 ||
      code === 'econnreset' ||
      code === 'etimedout' ||
      code === 'enotfound' ||
      code === 'eai_again' ||
      message.includes('socket hang up') ||
      message.includes('network error') ||
      message.includes('connection reset')
    ) {
      return 'TRANSIENT_NETWORK';
    }

    // 7. Schema & Invalid Input
    if (error.name === 'ZodError' || message.includes('validation error') || message.includes('invalid input') || status === 400) {
      return 'INVALID_INPUT';
    }

    // 8. Malformed Output / JSON Syntax
    if (error instanceof SyntaxError || message.includes('unexpected token') || message.includes('invalid json') || message.includes('malformed output')) {
      return 'MALFORMED_OUTPUT';
    }

    // 9. Model Internal Errors (HTTP 500 from provider)
    if ((status === 500 && (message.includes('model') || message.includes('openai') || message.includes('anthropic') || message.includes('gemini'))) || message.includes('content filter') || message.includes('safety system')) {
      return 'MODEL_FAILURE';
    }

    // 10. Resource Exhaustion
    if (message.includes('out of memory') || message.includes('heap limit') || message.includes('queue saturated') || message.includes('token budget exceeded')) {
      return 'RESOURCE_EXHAUSTED';
    }

    // 11. Missing External Dependencies
    if (code === 'enoent' || message.includes('command not found') || message.includes('mcp server unavailable')) {
      return 'DEPENDENCY_UNAVAILABLE';
    }

    // 12. Tool Failure
    if (message.includes('tool failed') || message.includes('subprocess exited with code') || message.includes('execution error')) {
      return 'TOOL_FAILURE';
    }

    return 'UNKNOWN';
  }

  /**
   * Determine whether an operation can safely be retried.
   */
  static isRetryable(failureCategory, isIdempotent = true) {
    if (!RETRYABLE_CATEGORIES_BY_DEFAULT.has(failureCategory)) {
      return false;
    }

    // Non-idempotent operations must never be retried without explicit exemption
    if (!isIdempotent) {
      return false;
    }

    return true;
  }

  /**
   * Extract Retry-After delay in milliseconds from headers or error properties.
   */
  static extractRetryAfterMs(error) {
    if (!error) return null;

    const headers = error.headers || error.response?.headers;
    if (headers) {
      const retryAfter = headers['retry-after'] || headers['Retry-After'];
      if (retryAfter) {
        const seconds = parseInt(retryAfter, 10);
        if (!isNaN(seconds)) return seconds * 1000;

        const dateMs = Date.parse(retryAfter);
        if (!isNaN(dateMs)) return Math.max(0, dateMs - Date.now());
      }
    }

    if (error.retryAfterMs && typeof error.retryAfterMs === 'number') {
      return error.retryAfterMs;
    }

    return null;
  }
}

module.exports = {
  RETRYABLE_CATEGORIES_BY_DEFAULT,
  FailureClassifier,
};
