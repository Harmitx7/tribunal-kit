'use strict';

const {
  executeResilientWorkflow,
  FaultInjectionEngine,
  ResourceGuardEngine,
} = require('../../src/runtime_reliability');

describe('Agent Runtime Reliability & Recovery Domain Integration Tests', () => {
  test('Clean multi-agent workflow succeeds with full quorum', async () => {
    const tasks = [
      { id: 'security-reviewer', fn: async () => ({ findings: 0 }), isRequired: true },
      { id: 'logic-reviewer', fn: async () => ({ findings: 0 }), isRequired: true },
      { id: 'style-reviewer', fn: async () => ({ findings: 0 }), isRequired: false },
    ];

    const result = await executeResilientWorkflow(tasks, {
      workflowTimeoutMs: 10000,
      minSuccessThreshold: 1.0,
    });

    expect(result.status).toBe('PASS');
    expect(result.totalTasks).toBe(3);
    expect(result.succeededTasks).toBe(3);
    expect(result.failedTasks).toBe(0);
    expect(result.metrics.quorumSatisfied).toBe(true);
  });

  test('Required reviewer failure prevents SUCCEEDED status (Safety Non-Masking Invariant)', async () => {
    const tasks = [
      {
        id: 'security-reviewer',
        fn: async () => {
          const err = new Error('Model provider crashed with 500');
          err.status = 500;
          throw err;
        },
        isRequired: true,
      },
      { id: 'docs-reviewer', fn: async () => ({ findings: 0 }), isRequired: false },
    ];

    const result = await executeResilientWorkflow(tasks, {
      allowPartialResults: false,
      retryPolicy: { maxAttempts: 1 },
    });

    expect(result.status).toBe('FAIL');
    expect(result.failedTasks).toBe(1);
    expect(result.findings.some((f) => f.category === 'QUORUM_FAILURE')).toBe(true);
  });

  test('Optional reviewer failure with allowPartialResults permits PARTIAL status', async () => {
    const tasks = [
      { id: 'security-reviewer', fn: async () => ({ findings: 0 }), isRequired: true },
      {
        id: 'optional-reviewer',
        fn: async () => {
          throw new Error('Optional reviewer timeout');
        },
        isRequired: false,
      },
    ];

    const result = await executeResilientWorkflow(tasks, {
      allowPartialResults: true,
      minSuccessThreshold: 0.5,
      retryPolicy: { maxAttempts: 1 },
    });

    expect(result.status).toBe('PARTIAL');
    expect(result.succeededTasks).toBe(1);
    expect(result.failedTasks).toBe(1);
  });

  test('Recovers from transient failure during resilient workflow execution', async () => {
    let callCount = 0;
    const tasks = [
      {
        id: 'network-dependent-task',
        fn: async () => {
          callCount++;
          if (callCount === 1) {
            const err = new Error('read ECONNRESET');
            err.code = 'ECONNRESET';
            throw err;
          }
          return 'SUCCESS_AFTER_RETRY';
        },
        isRequired: true,
      },
    ];

    const result = await executeResilientWorkflow(tasks, {
      retryPolicy: {
        maxAttempts: 3,
        initialDelayMs: 10,
        maxDelayMs: 50,
        jitter: false,
      },
    });

    expect(result.status).toBe('PASS');
    expect(result.succeededTasks).toBe(1);
    expect(callCount).toBe(2);
  });

  test('Detects orchestration deadlocks and records failure findings', async () => {
    const guard = new ResourceGuardEngine();
    guard.registerWaitDependency('agent-X', 'agent-Y');
    guard.registerWaitDependency('agent-Y', 'agent-X');

    const dl = guard.detectDeadlocks();
    expect(dl.hasDeadlock).toBe(true);
    expect(dl.findings[0].category).toBe('DEADLOCK_DETECTED');
  });
});
