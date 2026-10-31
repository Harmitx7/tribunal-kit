'use strict';

/**
 * cancellation_context.js — Hierarchical Cancellation & Timeout Propagation Context
 * =================================================================================
 * Domain: Agent Runtime Reliability & Recovery (agent-runtime-reliability)
 *
 * Responsibilities:
 * 1. Establish a hierarchical parent-child cancellation context tree.
 * 2. Propagate cancellation signals from root orchestrators down to child agents and tools.
 * 3. Enforce deadlines and distinguish logical user cancellations from timeout expirations.
 * 4. Coordinate process and resource cleanup via registered onCancel hooks.
 */

class CancellationContext {
  /**
   * @param {Object} [options]
   * @param {CancellationContext} [options.parent]
   * @param {number} [options.timeoutMs]
   */
  constructor(options = {}) {
    this.parent = options.parent || null;
    this.children = new Set();
    this.controller = new AbortController();
    this.cancelled = false;
    this.cancelReason = null;
    this.cancelCategory = null;
    this.cleanupHooks = [];
    this.timeoutTimer = null;
    this.deadline = null;

    if (this.parent) {
      this.parent.children.add(this);
      if (this.parent.isCancelled()) {
        this.cancel(this.parent.getReason(), this.parent.getCategory());
      }
    }

    if (options.timeoutMs && options.timeoutMs > 0) {
      this.deadline = Date.now() + options.timeoutMs;
      this.timeoutTimer = setTimeout(() => {
        this.cancel(`Context deadline of ${options.timeoutMs}ms expired`, 'TIMEOUT');
      }, options.timeoutMs);
    }
  }

  get signal() {
    return this.controller.signal;
  }

  isCancelled() {
    return this.cancelled || (this.parent ? this.parent.isCancelled() : false);
  }

  getReason() {
    return this.cancelReason || (this.parent ? this.parent.getReason() : null);
  }

  getCategory() {
    return this.cancelCategory || (this.parent ? this.parent.getCategory() : null);
  }

  getDeadline() {
    if (this.deadline && this.parent?.getDeadline()) {
      return Math.min(this.deadline, this.parent.getDeadline());
    }
    return this.deadline || this.parent?.getDeadline() || null;
  }

  /**
   * Cancel this context and propagate cancellation to all registered children.
   */
  cancel(reason = 'Operation cancelled', category = 'CANCELLED') {
    if (this.cancelled) return;

    this.cancelled = true;
    this.cancelReason = reason;
    this.cancelCategory = category;

    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }

    // Trigger AbortController
    try {
      this.controller.abort(reason);
    } catch (_err) {
      // Ignore if already aborted
    }

    // Execute registered cleanup hooks
    for (const hook of this.cleanupHooks) {
      try {
        hook(reason, category);
      } catch (_hookErr) {
        // Prevent hook failure from breaking cancellation propagation
      }
    }
    this.cleanupHooks = [];

    // Propagate to child contexts
    for (const child of this.children) {
      child.cancel(reason, category);
    }
  }

  /**
   * Register a cleanup callback to be executed when this context is cancelled.
   */
  onCancel(callback) {
    if (typeof callback !== 'function') return;
    if (this.isCancelled()) {
      callback(this.getReason(), this.getCategory());
    } else {
      this.cleanupHooks.push(callback);
    }
  }

  /**
   * Spawn a child context with optional deadline constraint.
   */
  createChild(timeoutMs = null) {
    return new CancellationContext({ parent: this, timeoutMs });
  }

  /**
   * Detach this context from parent and cleanup timers.
   */
  dispose() {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    if (this.parent) {
      this.parent.children.delete(this);
    }
    this.children.clear();
    this.cleanupHooks = [];
  }
}

module.exports = {
  CancellationContext,
};
