'use strict';

/**
 * meta_assurance.test.js
 * =======================
 * Unit tests for Meta-Assurance Engine and Emergency Circuit Breaker.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  MetaAssuranceEngine,
  CIRCUIT_STATES,
} = require('../../src/evolution/meta_assurance');
const { WalTransactionManager } = require('../../src/evolution/wal_transaction_manager');

describe('MetaAssuranceEngine — Autonomous Governance & Circuit Breaker', () => {
  let tmpDir;
  let engine;
  let wal;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-meta-assurance-test-'));
    engine = new MetaAssuranceEngine({
      agentDir: tmpDir,
      maxRollbackRatio: 0.5,
      windowSize: 10,
      minTransactions: 5,
    });
    wal = new WalTransactionManager({ agentDir: tmpDir });
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('initial state is CLOSED and healthy when no transactions exist', () => {
    const health = engine.evaluateHealth();
    expect(health.healthy).toBe(true);
    expect(health.circuitState).toBe(CIRCUIT_STATES.CLOSED);
    expect(health.rollbackRatio).toBe(0);
    expect(health.totalTransactions).toBe(0);
    expect(() => engine.assertMutationPermitted()).not.toThrow();
  });

  test('remains CLOSED and healthy when rollback ratio is within acceptable limits (< 50%)', () => {
    // Generate 4 commits and 1 rollback (20% rollback ratio)
    for (let i = 0; i < 4; i++) {
      const tx = wal.beginTransaction(`skill-${i}`);
      wal.commitTransaction(tx.txId);
    }
    const abortTx = wal.beginTransaction('skill-abort');
    wal.rollbackTransaction(abortTx.txId, 'Simulated transient failure');

    const health = engine.evaluateHealth();
    expect(health.healthy).toBe(true);
    expect(health.circuitState).toBe(CIRCUIT_STATES.CLOSED);
    expect(health.rollbackRatio).toBe(0.2);
    expect(health.abortCount).toBe(1);
    expect(health.commitCount).toBe(4);
    expect(() => engine.assertMutationPermitted()).not.toThrow();
  });

  test('automatically trips circuit breaker (TRIPPED) when rollback ratio exceeds 50% across minTransactions', () => {
    // Generate 1 commit and 5 rollbacks (83% rollback ratio)
    const commitTx = wal.beginTransaction('skill-ok');
    wal.commitTransaction(commitTx.txId);

    for (let i = 0; i < 5; i++) {
      const abortTx = wal.beginTransaction(`skill-fail-${i}`);
      wal.rollbackTransaction(abortTx.txId, 'Repeated regression failure');
    }

    const health = engine.evaluateHealth();
    expect(health.healthy).toBe(false);
    expect(health.circuitState).toBe(CIRCUIT_STATES.TRIPPED);
    expect(health.rollbackRatio).toBeGreaterThan(0.5);
    expect(health.quarantineReason).toContain('exceeds safety threshold');

    // Subsequent mutation attempts must be blocked
    expect(() => engine.assertMutationPermitted()).toThrow(
      /RSIE Self-Quarantine Active: Autonomous mutations are prohibited/,
    );
  });

  test('tripCircuitBreaker explicitly locks the engine into self-quarantine', () => {
    const state = engine.tripCircuitBreaker('Manual operator quarantine');
    expect(state.circuitState).toBe(CIRCUIT_STATES.TRIPPED);
    expect(state.quarantineReason).toBe('Manual operator quarantine');

    expect(() => engine.assertMutationPermitted()).toThrow(/Manual operator quarantine/);
  });

  test('resetCircuitBreaker unfreezes the engine and records audit history', () => {
    engine.tripCircuitBreaker('Test trip');
    expect(engine.getCircuitState().circuitState).toBe(CIRCUIT_STATES.TRIPPED);

    const resetState = engine.resetCircuitBreaker('Operator reviewed and approved unfreeze');
    expect(resetState.circuitState).toBe(CIRCUIT_STATES.CLOSED);
    expect(resetState.quarantineReason).toBeNull();

    const history = resetState.history;
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history[history.length - 1].action).toBe('UNFREEZE');
    expect(history[history.length - 1].operatorNote).toContain('approved unfreeze');

    expect(() => engine.assertMutationPermitted()).not.toThrow();
  });
});
