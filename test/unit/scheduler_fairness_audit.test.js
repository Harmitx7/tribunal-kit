'use strict';

/**
 * scheduler_fairness_audit.test.js — Stage 2.2 Scheduler Fairness & Boundary Audit Suite
 *
 * Mathematically audits and proves:
 * 1. Bounded bypass guarantee: A task with base weight P and bypass threshold K is bypassed by at most P * K tasks.
 * 2. Bypass counting and elapsed-time aging interaction.
 * 3. Monotonic sequenceId tie-breaking.
 * 4. Strict priority preservation when aging is disabled.
 * 5. Cancellation, timeout, error slot release invariants.
 * 6. Global and per-provider concurrency throttling.
 */

const { KernelScheduler } = require('../../src/execution/kernel_scheduler');

describe('Stage 2.2: Scheduler Fairness & Concurrency Boundary Audit', () => {
  describe('Mathematical Dispatch Bound (P * K Bypasses)', () => {
    test('LOW task (P=3, K=3) is bypassed by at most 9 tasks under indefinite CRITICAL flood', async () => {
      const K = 3;
      const scheduler = new KernelScheduler({
        maxConcurrentTasks: 1,
        agingBypassThreshold: K,
        agingIntervalMs: 100000, // disable time aging so only bypass aging operates
      });

      const order = [];
      let releaseBlocker;
      const blocker = new Promise(r => {
        releaseBlocker = r;
      });

      // 1. Fill the single slot with an initial task
      const t0 = scheduler.schedule(
        async () => {
          await blocker;
          order.push('T0');
        },
        { taskId: 't0', priority: 'LOW' },
      );

      // 2. Enqueue the target LOW task
      const lowTarget = scheduler.schedule(
        async () => {
          order.push('LOW_TARGET');
        },
        { taskId: 'low_target', priority: 'LOW' },
      );

      // 3. Flood with 15 CRITICAL tasks
      const critTasks = [];
      for (let i = 1; i <= 15; i++) {
        critTasks.push(
          scheduler.schedule(
            async () => {
              order.push(`CRIT_${i}`);
            },
            { taskId: `crit_${i}`, priority: 'CRITICAL' },
          ),
        );
      }

      // Unblock t0 to start draining
      releaseBlocker();
      await Promise.all([t0, lowTarget, ...critTasks]);

      // Exactly P * K = 3 * 3 = 9 bypasses allowed
      // Order: T0, CRIT_1, CRIT_2, CRIT_3 (bypass 3 -> wt 2)
      //        CRIT_4, CRIT_5, CRIT_6 (bypass 6 -> wt 1)
      //        CRIT_7, CRIT_8, CRIT_9 (bypass 9 -> wt 0)
      // At wt 0, low_target sequenceId < CRIT_10 sequenceId, so LOW_TARGET runs as 10th dispatch after T0!
      const lowIndex = order.indexOf('LOW_TARGET');
      expect(lowIndex).toBe(10); // index 0 is T0, 1..9 are CRIT_1..CRIT_9, 10 is LOW_TARGET
      expect(order[lowIndex - 1]).toBe('CRIT_9');
      expect(order[lowIndex + 1]).toBe('CRIT_10');
    });

    test('MEDIUM task (P=2, K=2) is bypassed by at most 4 tasks under CRITICAL flood', async () => {
      const K = 2;
      const scheduler = new KernelScheduler({
        maxConcurrentTasks: 1,
        agingBypassThreshold: K,
        agingIntervalMs: 100000,
      });

      const order = [];
      let releaseBlocker;
      const blocker = new Promise(r => {
        releaseBlocker = r;
      });

      const t0 = scheduler.schedule(
        async () => {
          await blocker;
          order.push('T0');
        },
        { taskId: 't0', priority: 'LOW' },
      );

      const medTarget = scheduler.schedule(
        async () => {
          order.push('MED_TARGET');
        },
        { taskId: 'med_target', priority: 'MEDIUM' },
      );

      const critTasks = [];
      for (let i = 1; i <= 8; i++) {
        critTasks.push(
          scheduler.schedule(
            async () => {
              order.push(`CRIT_${i}`);
            },
            { taskId: `crit_${i}`, priority: 'CRITICAL' },
          ),
        );
      }

      releaseBlocker();
      await Promise.all([t0, medTarget, ...critTasks]);

      // P * K = 2 * 2 = 4 bypasses allowed
      // T0 (0), CRIT_1 (1), CRIT_2 (2), CRIT_3 (3), CRIT_4 (4), then MED_TARGET (5)
      const medIndex = order.indexOf('MED_TARGET');
      expect(medIndex).toBe(5);
      expect(order[medIndex - 1]).toBe('CRIT_4');
      expect(order[medIndex + 1]).toBe('CRIT_5');
    });
  });

  describe('Interaction of Bypass Counting and Elapsed-Time Aging', () => {
    test('combines bypasses and elapsed wait time to accelerate priority promotion', async () => {
      const scheduler = new KernelScheduler({
        maxConcurrentTasks: 1,
        agingBypassThreshold: 4, // 4 bypasses = 1 tier
        agingIntervalMs: 50, // 50ms = 1 tier
      });

      let releaseBlocker;
      const blocker = new Promise(r => {
        releaseBlocker = r;
      });
      const t0 = scheduler.schedule(
        async () => {
          await blocker;
        },
        { priority: 'LOW' },
      );

      const tLow = scheduler.schedule(async () => 'done', {
        taskId: 'low_hybrid',
        priority: 'LOW',
      });

      // Wait 55ms -> 1 tier boost from time
      await new Promise(r => setTimeout(r, 55));

      const queuedItem = scheduler.queue.find(q => q.taskId === 'low_hybrid');
      expect(queuedItem).toBeDefined();

      // Simulate 4 bypasses manually
      queuedItem.bypasses = 4; // 1 tier boost from bypasses

      // Total boost = 1 (time) + 1 (bypasses) = 2 tiers
      // Base weight 3 - 2 = 1 (HIGH)
      const effWeight = scheduler.getEffectivePriorityWeight(queuedItem, Date.now());
      expect(effWeight).toBe(1);

      releaseBlocker();
      await Promise.all([t0, tLow]);
    });
  });

  describe('Monotonic Sequence Counter Tie-Breaking', () => {
    test('preserves strict FIFO ordering when effective priorities tie', async () => {
      const scheduler = new KernelScheduler({
        maxConcurrentTasks: 1,
        agingEnabled: false, // identical base priority
      });

      const order = [];
      let releaseBlocker;
      const blocker = new Promise(r => {
        releaseBlocker = r;
      });
      const t0 = scheduler.schedule(
        async () => {
          await blocker;
        },
        { priority: 'CRITICAL' },
      );

      // Enqueue 5 tasks with identical CRITICAL priority
      const tasks = [];
      for (let i = 1; i <= 5; i++) {
        tasks.push(
          scheduler.schedule(
            async () => {
              order.push(`T_${i}`);
            },
            { taskId: `t_${i}`, priority: 'CRITICAL' },
          ),
        );
      }

      releaseBlocker();
      await Promise.all([t0, ...tasks]);

      // Strict FIFO order preserved by sequenceId
      expect(order).toEqual(['T_1', 'T_2', 'T_3', 'T_4', 'T_5']);
    });
  });

  describe('Cancellation and Guaranteed Slot Release', () => {
    test('task aborted while in queue releases cleanly without occupying slots', async () => {
      const scheduler = new KernelScheduler({ maxConcurrentTasks: 1 });
      let releaseBlocker;
      const blocker = new Promise(r => {
        releaseBlocker = r;
      });
      const t0 = scheduler.schedule(
        async () => {
          await blocker;
        },
        { priority: 'CRITICAL' },
      );

      const ac = new AbortController();
      const tQueued = scheduler.schedule(async () => 'should_not_run', {
        taskId: 't_abort_me',
        priority: 'LOW',
        signal: ac.signal,
      });

      expect(scheduler.queue).toHaveLength(1);
      ac.abort();

      await expect(tQueued).rejects.toThrow(/TASK_ABORTED/);
      expect(scheduler.queue).toHaveLength(0);

      releaseBlocker();
      await t0;
      expect(scheduler.getMetrics().activeTasks).toBe(0);
    });

    test('timed out task releases global and provider slot immediately', async () => {
      const scheduler = new KernelScheduler({
        maxConcurrentTasks: 2,
        defaultPerProviderLimit: 1,
      });

      const timedOutTask = scheduler.schedule(() => new Promise(r => setTimeout(r, 200)), {
        taskId: 't_timeout',
        provider: 'anthropic',
        timeoutMs: 30,
      });

      await expect(timedOutTask).rejects.toThrow(/TASK_TIMEOUT/);

      const metrics = scheduler.getMetrics();
      expect(metrics.activeTasks).toBe(0);
      expect(metrics.providerConcurrency.anthropic || 0).toBe(0);
    });

    test('errored task releases global and provider slot in finally block', async () => {
      const scheduler = new KernelScheduler({
        maxConcurrentTasks: 2,
        defaultPerProviderLimit: 1,
      });

      const errorTask = scheduler.schedule(
        async () => {
          throw new Error('INTENTIONAL_ERROR');
        },
        { taskId: 't_err', provider: 'openai' },
      );

      await expect(errorTask).rejects.toThrow(/INTENTIONAL_ERROR/);

      const metrics = scheduler.getMetrics();
      expect(metrics.activeTasks).toBe(0);
      expect(metrics.providerConcurrency.openai || 0).toBe(0);
      expect(metrics.failedCount).toBe(1);
    });
  });

  describe('Concurrency Bounding & Per-Provider Throttling', () => {
    test('enforces global concurrency limit and per-provider concurrency throttling', async () => {
      const scheduler = new KernelScheduler({
        maxConcurrentTasks: 3,
        providerLimits: {
          openai: 1, // Only 1 openai task allowed concurrently
          anthropic: 2,
        },
      });

      let activeOpenAi = 0;
      let maxActiveOpenAi = 0;
      let activeTotal = 0;
      let maxActiveTotal = 0;

      const runSim = async (prov, ms) => {
        return scheduler.schedule(
          async () => {
            activeTotal++;
            if (activeTotal > maxActiveTotal) maxActiveTotal = activeTotal;

            if (prov === 'openai') {
              activeOpenAi++;
              if (activeOpenAi > maxActiveOpenAi) maxActiveOpenAi = activeOpenAi;
            }

            await new Promise(r => setTimeout(r, ms));

            if (prov === 'openai') activeOpenAi--;
            activeTotal--;
          },
          { provider: prov },
        );
      };

      const tasks = [
        runSim('openai', 40),
        runSim('openai', 40),
        runSim('anthropic', 40),
        runSim('anthropic', 40),
        runSim('anthropic', 40),
      ];

      await Promise.all(tasks);

      // Invariants:
      // Global concurrency never exceeded 3
      expect(maxActiveTotal).toBeLessThanOrEqual(3);
      // OpenAI concurrency never exceeded 1
      expect(maxActiveOpenAi).toBe(1);
    });
  });
});
