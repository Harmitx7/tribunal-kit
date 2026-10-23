'use strict';

/**
 * meta_assurance.js — Meta-Assurance & Emergency Circuit Breaker
 * ==============================================================
 * Phase 4 RSIE: Autonomous Assurance & Continuous Self-Improvement
 *
 * Provides self-governance and circuit-breaking for the autonomous
 * recursive self-improvement engine (RSIE):
 *
 * 1. Health Telemetry: Monitors WAL transaction rollback frequency,
 *    invariant violations, and proposal acceptance rates.
 * 2. Self-Quarantine Protocol: Automatically trips an emergency circuit
 *    breaker ('TRIPPED') if the transaction rollback ratio exceeds 50%
 *    across a rolling window of recent mutations (minimum 5 transactions),
 *    or upon any fatal invariant failure.
 * 3. Human Gate Override: When the circuit breaker is tripped, all
 *    autonomous mutations are strictly prohibited until a human operator
 *    audits the failure and explicitly unfreezes the system ('tk rsi unfreeze').
 */

const fs = require('fs');
const path = require('path');
const { WalTransactionManager } = require('./wal_transaction_manager');

const CIRCUIT_STATES = Object.freeze({
  CLOSED: 'CLOSED', // Healthy, mutations allowed
  TRIPPED: 'TRIPPED', // Self-quarantine active, mutations prohibited
});

const DEFAULT_CONFIG = Object.freeze({
  maxRollbackRatio: 0.5, // 50% maximum rollback ratio
  windowSize: 10, // Evaluate last 10 transactions
  minTransactions: 5, // Minimum transactions required before tripping
});

class MetaAssuranceEngine {
  /**
   * @param {object} [options]
   * @param {string} [options.agentDir] - Base agent state directory
   * @param {number} [options.maxRollbackRatio=0.50]
   * @param {number} [options.windowSize=10]
   * @param {number} [options.minTransactions=5]
   */
  constructor(options = {}) {
    this.agentDir = path.resolve(options.agentDir || path.join(process.cwd(), '.agent'));
    this.maxRollbackRatio = options.maxRollbackRatio || DEFAULT_CONFIG.maxRollbackRatio;
    this.windowSize = Math.max(Number(options.windowSize) || DEFAULT_CONFIG.windowSize, 1);
    this.minTransactions = Math.max(
      Number(options.minTransactions) || DEFAULT_CONFIG.minTransactions,
      1,
    );

    this.wal = new WalTransactionManager({ agentDir: this.agentDir });
    this.stateFilePath = path.join(this.agentDir, 'data', 'rsi_circuit_breaker.json');
    this._ensureDirs();
  }

  _ensureDirs() {
    const dataDir = path.dirname(this.stateFilePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  /**
   * Reads persistent circuit breaker state from disk.
   *
   * @returns {object}
   */
  getCircuitState() {
    if (!fs.existsSync(this.stateFilePath)) {
      return {
        circuitState: CIRCUIT_STATES.CLOSED,
        trippedAt: null,
        quarantineReason: null,
        lastEvaluatedAt: new Date().toISOString(),
        history: [],
      };
    }

    try {
      return JSON.parse(fs.readFileSync(this.stateFilePath, 'utf8'));
    } catch {
      return {
        circuitState: CIRCUIT_STATES.CLOSED,
        trippedAt: null,
        quarantineReason: null,
        lastEvaluatedAt: new Date().toISOString(),
        history: [],
      };
    }
  }

  /**
   * Writes circuit breaker state atomically to disk.
   *
   * @private
   */
  _saveCircuitState(state) {
    this._ensureDirs();
    const tmp = `${this.stateFilePath}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(tmp, this.stateFilePath);
  }

  /**
   * Evaluates overall RSIE health from WAL transaction journals.
   * Automatically trips the circuit breaker if rollback threshold is breached.
   *
   * @returns {{
   *   healthy: boolean,
   *   circuitState: string,
   *   totalTransactions: number,
   *   windowCount: number,
   *   abortCount: number,
   *   commitCount: number,
   *   rollbackRatio: number,
   *   quarantineReason: string|null,
   *   lastEvaluatedAt: string
   * }}
   */
  evaluateHealth() {
    const currentState = this.getCircuitState();
    const allTxs = this.wal.listTransactions();
    const windowTxs = allTxs.slice(0, this.windowSize);

    let abortCount = 0;
    let commitCount = 0;

    for (const tx of windowTxs) {
      if (tx.state === 'ABORT') {
        abortCount++;
      } else if (tx.state === 'COMMIT') {
        commitCount++;
      }
    }

    const windowCount = windowTxs.length;
    const rollbackRatio =
      windowCount > 0 ? Math.round((abortCount / windowCount) * 10000) / 10000 : 0;

    let circuitState = currentState.circuitState;
    let quarantineReason = currentState.quarantineReason;

    // Check if autonomous rollback threshold is breached
    if (circuitState === CIRCUIT_STATES.CLOSED && windowCount >= this.minTransactions) {
      if (rollbackRatio > this.maxRollbackRatio) {
        circuitState = CIRCUIT_STATES.TRIPPED;
        quarantineReason = `Rollback ratio ${Math.round(rollbackRatio * 100)}% (${abortCount}/${windowCount} transactions) exceeds safety threshold of ${Math.round(this.maxRollbackRatio * 100)}%.`;

        currentState.circuitState = CIRCUIT_STATES.TRIPPED;
        currentState.trippedAt = new Date().toISOString();
        currentState.quarantineReason = quarantineReason;
        currentState.history.push({
          action: 'AUTOMATIC_TRIP',
          timestamp: currentState.trippedAt,
          reason: quarantineReason,
          rollbackRatio,
          windowCount,
          abortCount,
        });
        this._saveCircuitState(currentState);
      }
    }

    const isHealthy = circuitState === CIRCUIT_STATES.CLOSED;

    return {
      healthy: isHealthy,
      circuitState,
      totalTransactions: allTxs.length,
      windowCount,
      abortCount,
      commitCount,
      rollbackRatio,
      quarantineReason,
      lastEvaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Asserts that autonomous mutations are permitted.
   * Throws an Error if the circuit breaker is TRIPPED.
   *
   * @throws {Error} If self-quarantine is active
   */
  assertMutationPermitted() {
    const health = this.evaluateHealth();
    if (health.circuitState === CIRCUIT_STATES.TRIPPED) {
      throw new Error(
        `RSIE Self-Quarantine Active: Autonomous mutations are prohibited. Circuit breaker is TRIPPED: ${health.quarantineReason || 'Safety threshold exceeded.'}`,
      );
    }
    return true;
  }

  /**
   * Manually or programmatically trips the circuit breaker into self-quarantine.
   *
   * @param {string} reason
   * @returns {object} Updated state
   */
  tripCircuitBreaker(reason = 'Manual operator or fatal invariant trigger') {
    const state = this.getCircuitState();
    state.circuitState = CIRCUIT_STATES.TRIPPED;
    state.trippedAt = new Date().toISOString();
    state.quarantineReason = String(reason);
    state.history.push({
      action: 'TRIP',
      timestamp: state.trippedAt,
      reason: state.quarantineReason,
    });
    this._saveCircuitState(state);
    return state;
  }

  /**
   * Resets the circuit breaker to CLOSED after human inspection and audit.
   *
   * @param {string} [operatorNote] - Reason or note for unfreezing
   * @returns {object} Updated state
   */
  resetCircuitBreaker(operatorNote = 'Human operator approved unfreeze') {
    const state = this.getCircuitState();
    const prevReason = state.quarantineReason;
    state.circuitState = CIRCUIT_STATES.CLOSED;
    state.trippedAt = null;
    state.quarantineReason = null;
    state.history.push({
      action: 'UNFREEZE',
      timestamp: new Date().toISOString(),
      operatorNote: String(operatorNote),
      previousQuarantineReason: prevReason,
    });
    this._saveCircuitState(state);
    return state;
  }
}

module.exports = {
  MetaAssuranceEngine,
  CIRCUIT_STATES,
  DEFAULT_CONFIG,
};
