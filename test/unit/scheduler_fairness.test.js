'use strict';

/**
 * scheduler_fairness.test.js — Starvation-Free Bounded Fairness Tests
 */

const { KernelScheduler } = require('../../src/execution/kernel_scheduler');

describe('Stage 2.1: Scheduler Fairness & Starvation Prevention', () => {
  test('low priority task executes despite sustained flood of critical tasks', async () => {
    // 1 concurrency slot so queue order is strictly observed
    const scheduler = new KernelScheduler({
      maxConcurrentTasks: 1,
      agingBypassThreshold: 2, // Every 2 bypasses, priority boosts by 1 tier
      agingIntervalMs: 10000, // Keep time aging high so test relies strictly on bypass counts
    });

    const executionLog = [];

    // Occupy the single execution slot
    let releaseInitial;
    const initialPromise = new Promise(r => {
      releaseInitial = r;
    });
    const initialTask = scheduler.schedule(
      async () => {
        await initialPromise;
        executionLog.push('INITIAL');
      },
      { taskId: 'init', priority: 'LOW' },
    );

    // Enqueue 1 LOW priority task
    const lowTask = scheduler.schedule(
      async () => {
        executionLog.push('LOW_TASK');
      },
      { taskId: 'low_target', priority: 'LOW' },
    );

    // Sustained flood of CRITICAL tasks arriving while LOW is waiting
    const criticalPromises = [];
    for (let i = 1; i <= 8; i++) {
      criticalPromises.push(
        scheduler.schedule(
          async () => {
            executionLog.push(`CRIT_${i}`);
          },
          { taskId: `crit_${i}`, priority: 'CRITICAL' },
        ),
      );
    }

    // Release initial task to start draining queue
    releaseInitial();

    await Promise.all([initialTask, lowTask, ...criticalPromises]);

    // Verify LOW_TASK did NOT starve:
    // With base weight 3 and agingBypassThreshold 2:
    // After crit_1 and crit_2 bypass, low_target effective weight becomes 2 (MEDIUM)
    // After crit_3 and crit_4 bypass, low_target effective weight becomes 1 (HIGH)
    // After crit_5 and crit_6 bypass, low_target effective weight becomes 0 (CRITICAL)
    // At effective weight 0, low_target has older enqueuedAt than crit_7 & crit_8, so it runs BEFORE crit_7!
    const lowIndex = executionLog.indexOf('LOW_TASK');
    expect(lowIndex).toBeGreaterThan(0);
    // It must execute BEFORE the last critical tasks
    expect(lowIndex).toBeLessThan(executionLog.indexOf('CRIT_8'));
    expect(executionLog).toContain('LOW_TASK');

    const metrics = scheduler.getMetrics();
    expect(metrics.starvationStats.totalAgingBoosts).toBeGreaterThan(0);
    expect(metrics.activeTasks).toBe(0);
  });

  test('time-based aging promotes long-waiting low priority task', async () => {
    const scheduler = new KernelScheduler({
      maxConcurrentTasks: 1,
      agingBypassThreshold: 100, // disable bypass aging
      agingIntervalMs: 30, // Boost 1 tier every 30ms
    });

    let releaseBlocker;
    const blocker = new Promise(r => {
      releaseBlocker = r;
    });
    const tBlock = scheduler.schedule(
      async () => {
        await blocker;
      },
      { priority: 'LOW' },
    );

    const tLow = scheduler.schedule(async () => 'low_done', { priority: 'LOW' });

    // Wait 70ms while blocker is running (at least 2 intervals = 60ms)
    await new Promise(r => setTimeout(r, 70));

    // Now enqueue a fresh CRITICAL task
    const tCrit = scheduler.schedule(async () => 'crit_done', { priority: 'CRITICAL' });

    // Effective weight of tLow should now be Math.max(0, 3 - 2) = 1 (HIGH)
    // Check dynamic effective weight
    const queuedLow = scheduler.queue.find(q => q.priority === 'LOW');
    expect(queuedLow).toBeDefined();
    const effWeight = scheduler.getEffectivePriorityWeight(queuedLow, Date.now());
    expect(effWeight).toBeLessThan(3);

    releaseBlocker();
    await Promise.all([tBlock, tLow, tCrit]);
    expect(scheduler.getMetrics().activeTasks).toBe(0);
  });

  test('aging is cleanly disabled when agingEnabled is false', async () => {
    const scheduler = new KernelScheduler({
      maxConcurrentTasks: 1,
      agingEnabled: false,
    });

    const executionLog = [];
    let release;
    const blockerPromise = new Promise(r => {
      release = r;
    });
    const blocker = scheduler.schedule(() => blockerPromise, { priority: 'LOW' });

    const tLow = scheduler.schedule(
      async () => {
        executionLog.push('LOW');
      },
      { priority: 'LOW' },
    );
    const tCrit1 = scheduler.schedule(
      async () => {
        executionLog.push('CRIT1');
      },
      { priority: 'CRITICAL' },
    );
    const tCrit2 = scheduler.schedule(
      async () => {
        executionLog.push('CRIT2');
      },
      { priority: 'CRITICAL' },
    );

    release();
    await Promise.all([blocker, tLow, tCrit1, tCrit2]);

    // Without aging, strict priority places CRITICAL ahead of LOW
    expect(executionLog).toEqual(['CRIT1', 'CRIT2', 'LOW']);
  });
});
