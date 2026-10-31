'use strict';

const {
  verifyFsmCompleteness,
  createFsmInstance,
} = require('../../src/verification');

describe('State Machine Verification & Model Checking Engine', () => {
  const sampleFsm = {
    states: ['IDLE', 'LOADING', 'SUCCESS', 'ERROR'],
    initialState: 'IDLE',
    terminalStates: ['SUCCESS', 'ERROR'],
    transitions: [
      { from: 'IDLE', event: 'FETCH', to: 'LOADING' },
      { from: 'LOADING', event: 'RESOLVE', to: 'SUCCESS', action: (ctx, p) => ({ ...ctx, data: p.data }) },
      { from: 'LOADING', event: 'REJECT', to: 'ERROR', action: (ctx, p) => ({ ...ctx, error: p.error }) },
    ],
    invariants: [
      { state: 'SUCCESS', check: (ctx) => ctx.data !== undefined, message: 'SUCCESS state must possess data' },
    ],
  };

  test('verifyFsmCompleteness validates complete, deadlock-free FSM', () => {
    const report = verifyFsmCompleteness(sampleFsm);
    expect(report.isComplete).toBe(true);
    expect(report.totalStates).toBe(4);
    expect(report.reachableStatesCount).toBe(4);
    expect(report.deadlocks.length).toBe(0);
    expect(report.unreachableStates.length).toBe(0);
  });

  test('verifyFsmCompleteness detects unreachable states', () => {
    const fsmWithOrphan = {
      ...sampleFsm,
      states: [...sampleFsm.states, 'ORPHAN_STATE'],
    };

    const report = verifyFsmCompleteness(fsmWithOrphan);
    expect(report.isComplete).toBe(false);
    expect(report.unreachableStates).toContain('ORPHAN_STATE');
    expect(report.issues.some(i => i.type === 'UNREACHABLE_STATE')).toBe(true);
  });

  test('verifyFsmCompleteness detects unintended deadlocks in non-terminal states', () => {
    const fsmWithDeadlock = {
      states: ['START', 'STUCK', 'DONE'],
      initialState: 'START',
      terminalStates: ['DONE'], // STUCK is NOT marked terminal!
      transitions: [
        { from: 'START', event: 'GO', to: 'STUCK' },
      ],
    };

    const report = verifyFsmCompleteness(fsmWithDeadlock);
    expect(report.isComplete).toBe(false);
    expect(report.deadlocks).toContain('STUCK');
    expect(report.issues.some(i => i.type === 'UNINTENDED_DEADLOCK')).toBe(true);
  });

  test('createFsmInstance executes transitions, updates context, and records history', () => {
    const instance = createFsmInstance(sampleFsm, { count: 0 });
    expect(instance.getState()).toBe('IDLE');

    instance.transition('FETCH');
    expect(instance.getState()).toBe('LOADING');

    instance.transition('RESOLVE', { data: 'payload-123' });
    expect(instance.getState()).toBe('SUCCESS');
    expect(instance.getContext().data).toBe('payload-123');

    const history = instance.getHistory();
    expect(history.length).toBe(2);
    expect(history[0].event).toBe('FETCH');
    expect(history[1].event).toBe('RESOLVE');
  });

  test('createFsmInstance rejects invalid transitions and enforces state invariants', () => {
    const instance = createFsmInstance(sampleFsm, {});

    // Cannot jump directly from IDLE to RESOLVE
    expect(() => instance.transition('RESOLVE', { data: 'test' })).toThrow(/Invalid state transition/);

    instance.transition('FETCH');
    // Invariant failure: RESOLVE without data
    expect(() => instance.transition('RESOLVE', {})).toThrow(/State invariant violated/);
  });
});
