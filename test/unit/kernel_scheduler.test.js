'use strict';

/**
 * kernel_scheduler.test.js — Unit Tests for Concurrency, Priority Queuing, and Budgeting
 */

const { KernelScheduler } = require('../../src/execution/kernel_scheduler');

describe('Stage 2: KernelScheduler Resource Governor', () => {
  test('enforces global concurrency limit across multiple tasks', async () => {
    const scheduler = new KernelScheduler({ maxConcurrentTasks: 2 });
    let maxRunningSimultaneously = 0;
    let currentlyRunning = 0;

    const makeTask = (id, durationMs) => async () => {
      currentlyRunning++;
      maxRunningSimultaneously = Math.max(maxRunningSimultaneously, currentlyRunning);
      await new Promise(r => setTimeout(r, durationMs));
      currentlyRunning--;
      return { taskId: id, totalTokens: 10 };
    };

    const tasks = [
      scheduler.schedule(makeTask('t1', 40), { taskId: 't1' }),
      scheduler.schedule(makeTask('t2', 40), { taskId: 't2' }),
      scheduler.schedule(makeTask('t3', 40), { taskId: 't3' }),
      scheduler.schedule(makeTask('t4', 40), { taskId: 't4' }),
    ];

    const results = await Promise.all(tasks);
    expect(results).toHaveLength(4);
    expect(maxRunningSimultaneously).toBe(2);
    expect(scheduler.getMetrics().activeTasks).toBe(0);
    expect(scheduler.getMetrics().completedCount).toBe(4);
  });

  test('enforces per-provider concurrency throttling', async () => {
    const scheduler = new KernelScheduler({
      maxConcurrentTasks: 5,
      defaultPerProviderLimit: 1, // Max 1 per provider
    });

    let maxAnthropic = 0;
    let currAnthropic = 0;

    const makeAnthropicTask = (id, durationMs) => async () => {
      currAnthropic++;
      maxAnthropic = Math.max(maxAnthropic, currAnthropic);
      await new Promise(r => setTimeout(r, durationMs));
      currAnthropic--;
      return { taskId: id };
    };

    const tasks = [
      scheduler.schedule(makeAnthropicTask('a1', 30), { provider: 'anthropic' }),
      scheduler.schedule(makeAnthropicTask('a2', 30), { provider: 'anthropic' }),
      scheduler.schedule(makeAnthropicTask('a3', 30), { provider: 'anthropic' }),
    ];

    await Promise.all(tasks);
    expect(maxAnthropic).toBe(1); // Never exceeded 1 concurrent Anthropic call
  });

  test('prioritizes CRITICAL and HIGH tasks over LOW tasks in queue', async () => {
    const scheduler = new KernelScheduler({ maxConcurrentTasks: 1 });
    const executionOrder = [];

    // Occupy the only slot
    let unblockFirst;
    const blockerPromise = new Promise(r => {
      unblockFirst = r;
    });

    const firstTask = scheduler.schedule(
      async () => {
        await blockerPromise;
        executionOrder.push('BLOCKER');
      },
      { priority: 'LOW' },
    );

    // Enqueue LOW, then MEDIUM, then CRITICAL while slot is occupied
    const lowTask = scheduler.schedule(
      async () => {
        executionOrder.push('LOW');
      },
      { priority: 'LOW' },
    );

    const medTask = scheduler.schedule(
      async () => {
        executionOrder.push('MEDIUM');
      },
      { priority: 'MEDIUM' },
    );

    const critTask = scheduler.schedule(
      async () => {
        executionOrder.push('CRITICAL');
      },
      { priority: 'CRITICAL' },
    );

    // Release blocker
    unblockFirst();
    await Promise.all([firstTask, lowTask, medTask, critTask]);

    expect(executionOrder).toEqual(['BLOCKER', 'CRITICAL', 'MEDIUM', 'LOW']);
  });

  test('guarantees slot release on timeout', async () => {
    const scheduler = new KernelScheduler({ maxConcurrentTasks: 1 });

    const slowTask = scheduler.schedule(() => new Promise(r => setTimeout(r, 200)), {
      taskId: 'slow',
      timeoutMs: 25,
    });

    await expect(slowTask).rejects.toThrow('TASK_TIMEOUT');
    expect(scheduler.getMetrics().activeTasks).toBe(0);

    // Next task can still run immediately because slot was released
    const fastTask = await scheduler.schedule(async () => 'recovered', { taskId: 'fast' });
    expect(fastTask).toBe('recovered');
    expect(scheduler.getMetrics().activeTasks).toBe(0);
  });

  test('enforces token budget ceiling and halts further dispatch', async () => {
    const scheduler = new KernelScheduler({ maxTotalTokens: 50 });

    await scheduler.schedule(async () => ({ totalTokens: 30 }), { taskId: 't1' });
    expect(scheduler.getMetrics().totalTokensConsumed).toBe(30);

    await scheduler.schedule(async () => ({ totalTokens: 25 }), { taskId: 't2' });
    expect(scheduler.getMetrics().totalTokensConsumed).toBe(55);

    // Exceeds 50
    const blockedTask = scheduler.schedule(async () => ({ totalTokens: 10 }), { taskId: 't3' });
    await expect(blockedTask).rejects.toThrow('TOKEN_BUDGET_EXCEEDED');
  });

  test('handles AbortSignal cancellation cleanly without leaking slots', async () => {
    const scheduler = new KernelScheduler({ maxConcurrentTasks: 1 });
    const ac = new AbortController();

    // Fill slot
    let finishFirst;
    const first = scheduler.schedule(
      () =>
        new Promise(r => {
          finishFirst = r;
        }),
      { taskId: 'first' },
    );

    // Queue second with signal
    const second = scheduler.schedule(async () => 'done', { taskId: 'second', signal: ac.signal });

    // Abort second while in queue
    ac.abort();

    await expect(second).rejects.toThrow('TASK_ABORTED');

    finishFirst();
    await first;

    expect(scheduler.getMetrics().activeTasks).toBe(0);
  });
});
