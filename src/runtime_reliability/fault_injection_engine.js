'use strict';

/**
 * fault_injection_engine.js — In-Process Deterministic Chaos & Fault Injection Engine
 * ==================================================================================
 * Domain: Agent Runtime Reliability & Recovery (agent-runtime-reliability)
 *
 * Responsibilities:
 * 1. Inject deterministic timeouts, network drops, rate limits, and malformed outputs in tests.
 * 2. Simulate transient failures that recover after N attempts to verify retry mechanics.
 * 3. Test cancellation race conditions and checkpoint corruption.
 * 4. Guarantee zero impact on external live production services.
 */

class FaultInjectionEngine {
  constructor() {
    this.rules = new Map(); // target -> Array of { type, params, remainingCount, firedCount }
    this.interceptLog = [];
  }

  /**
   * Register a failure rule for a target task or method.
   */
  addRule(target, ruleConfig) {
    if (!this.rules.has(target)) {
      this.rules.set(target, []);
    }
    this.rules.get(target).push({
      type: ruleConfig.type, // 'TIMEOUT' | 'NETWORK' | 'RATE_LIMIT' | 'MALFORMED' | 'CRASH' | 'DELAY'
      params: ruleConfig.params || {},
      remainingCount: ruleConfig.count !== undefined ? ruleConfig.count : Infinity,
      firedCount: 0,
    });
  }

  /**
   * Helper to register an error that fails N times then succeeds.
   */
  injectTransientFailure(target, failureType, count = 1, params = {}) {
    this.addRule(target, { type: failureType, count, params });
  }

  /**
   * Intercept a task execution and evaluate active injection rules.
   */
  async intercept(target, originalFn) {
    const rulesList = this.rules.get(target);

    if (rulesList && rulesList.length > 0) {
      const activeRule = rulesList.find((r) => r.remainingCount > 0);

      if (activeRule) {
        activeRule.remainingCount--;
        activeRule.firedCount++;

        this.interceptLog.push({
          target,
          type: activeRule.type,
          timestamp: new Date().toISOString(),
          remaining: activeRule.remainingCount,
        });

        switch (activeRule.type) {
          case 'TIMEOUT': {
            const err = new Error(`Injected timeout on '${target}'`);
            err.failureCategory = 'TIMEOUT';
            err.code = 'ETIMEDOUT';
            throw err;
          }
          case 'NETWORK': {
            const err = new Error(`Injected connection reset on '${target}'`);
            err.failureCategory = 'TRANSIENT_NETWORK';
            err.code = activeRule.params.code || 'ECONNRESET';
            throw err;
          }
          case 'RATE_LIMIT': {
            const err = new Error(`Injected HTTP 429 Too Many Requests on '${target}'`);
            err.status = 429;
            err.failureCategory = 'RATE_LIMITED';
            err.retryAfterMs = activeRule.params.retryAfterMs || 100;
            throw err;
          }
          case 'MALFORMED': {
            // Return or throw malformed syntax
            if (activeRule.params.returnMalformed) {
              return '{"unclosed_json: true, missing_brace';
            }
            const syntaxErr = new SyntaxError('Unexpected token < in JSON at position 0');
            syntaxErr.failureCategory = 'MALFORMED_OUTPUT';
            throw syntaxErr;
          }
          case 'CRASH': {
            const crashErr = new Error(`Injected process crash on '${target}' (exit code 1)`);
            crashErr.failureCategory = 'TOOL_FAILURE';
            crashErr.exitCode = activeRule.params.exitCode || 1;
            throw crashErr;
          }
          case 'DELAY': {
            const delayMs = activeRule.params.delayMs || 200;
            await new Promise((res) => setTimeout(res, delayMs));
            break;
          }
          default:
            break;
        }
      }
    }

    // No active rule or rules exhausted -> proceed with original execution
    return originalFn();
  }

  /**
   * Clear all active rules and history.
   */
  reset() {
    this.rules.clear();
    this.interceptLog = [];
  }

  getInterceptCount(target) {
    return this.interceptLog.filter((log) => log.target === target).length;
  }
}

module.exports = {
  FaultInjectionEngine,
};
