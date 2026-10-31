'use strict';

const {
  StateMachineEngine,
  IllegalStateTransitionError,
} = require('../../src/runtime_reliability');

const fixtureData = require('../fixtures/agent_runtime/runtime_dataset_v1.json');

describe('Agent State Machine Engine & Invariant Verification', () => {
  test('Standard execution progresses legally: PENDING -> RUNNING -> SUCCEEDED', () => {
    const sm = new StateMachineEngine(fixtureData.validExecutionRecord);
    expect(sm.getState()).toBe('PENDING');

    sm.start('Worker assigned');
    expect(sm.getState()).toBe('RUNNING');

    sm.complete({ reviewedFiles: 1 }, 'Analysis finished');
    expect(sm.getState()).toBe('SUCCEEDED');
    expect(sm.isTerminal()).toBe(true);

    const log = sm.getAuditLog();
    expect(log.length).toBe(3);
    expect(log[1].toState).toBe('RUNNING');
    expect(log[2].toState).toBe('SUCCEEDED');
  });

  test('Retry loop progresses legally: RUNNING -> RETRYING -> RUNNING -> FAILED', () => {
    const sm = new StateMachineEngine({
      ...fixtureData.validExecutionRecord,
      maxAttempts: 2,
    });

    sm.start();
    expect(sm.getState()).toBe('RUNNING');

    // First retry
    sm.retry('Connection reset', 'TRANSIENT_NETWORK');
    expect(sm.getState()).toBe('RETRYING');
    expect(sm.getRecord().attempt).toBe(2);

    sm.attemptNext();
    expect(sm.getState()).toBe('RUNNING');

    // Second retry should exhaust budget and transition to FAILED
    sm.retry('Connection reset again', 'TRANSIENT_NETWORK');
    expect(sm.getState()).toBe('FAILED');
    expect(sm.isTerminal()).toBe(true);
    expect(sm.getRecord().error).toContain('Retry budget exhausted');
  });

  test('Illegal transitions throw IllegalStateTransitionError', () => {
    const sm = new StateMachineEngine(fixtureData.validExecutionRecord);

    // PENDING cannot jump directly to SUCCEEDED without RUNNING
    expect(() => sm.complete()).toThrow(IllegalStateTransitionError);
  });

  test('Terminal state immutability prevents duplicate finalization', () => {
    const sm = new StateMachineEngine(fixtureData.validExecutionRecord);
    sm.start();
    sm.complete();
    expect(sm.isTerminal()).toBe(true);

    // Attempting to fail after complete
    expect(() => sm.fail('Late error')).toThrow(IllegalStateTransitionError);

    // Attempting to complete again
    expect(() => sm.complete()).toThrow(IllegalStateTransitionError);

    // Attempting to cancel after complete
    expect(() => sm.cancel()).toThrow(IllegalStateTransitionError);
  });

  test('Cancellation and Timeout transitions', () => {
    const smTimeout = new StateMachineEngine({
      ...fixtureData.validExecutionRecord,
      id: 'task-timeout',
    });
    smTimeout.start();
    smTimeout.timeout('Per-task deadline exceeded');
    expect(smTimeout.getState()).toBe('TIMED_OUT');
    expect(smTimeout.isTerminal()).toBe(true);

    const smCancel = new StateMachineEngine({
      ...fixtureData.validExecutionRecord,
      id: 'task-cancel',
    });
    smCancel.cancel('User aborted workflow');
    expect(smCancel.getState()).toBe('CANCELLED');
    expect(smCancel.isTerminal()).toBe(true);
  });

  test('Blocked and unblocked transitions', () => {
    const sm = new StateMachineEngine(fixtureData.validExecutionRecord);
    sm.start();
    sm.block('human-approval-gate');
    expect(sm.getState()).toBe('BLOCKED');

    sm.unblock();
    expect(sm.getState()).toBe('RUNNING');

    sm.finalizePartial([{ id: 'finding-1' }]);
    expect(sm.getState()).toBe('PARTIAL');
    expect(sm.isTerminal()).toBe(true);
  });
});
