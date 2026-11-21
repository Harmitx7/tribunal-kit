'use strict';

/**
 * token_budget.test.js — Dual Token Budget Governance (Per-Task and Per-Session)
 */

const { KernelScheduler } = require('../../src/execution/kernel_scheduler');
const { AgentRuntime } = require('../../src/execution/agent_runtime');
const { ProviderAdapter } = require('../../src/execution/provider_adapter');
const path = require('path');

describe('Stage 2.1: Dual Token Budget Governance & Accounting', () => {
  const repoRoot = path.resolve(__dirname, '../../');

  describe('Per-Task Budget Enforcement', () => {
    test('enforces per-task token limit using measured provider tokens', async () => {
      const scheduler = new KernelScheduler();

      // Task with budget of 100 tokens, but returns 150 tokens
      const overBudgetTask = scheduler.schedule(
        async () => ({ totalTokens: 150, text: 'long output' }),
        { taskId: 't_over', taskTokenBudget: 100 },
      );

      await expect(overBudgetTask).rejects.toThrow('TASK_TOKEN_BUDGET_EXCEEDED');
      await expect(overBudgetTask).rejects.toThrow(/exceeding allocated task budget of 100/);

      // Verify slot released
      expect(scheduler.getMetrics().activeTasks).toBe(0);
      expect(scheduler.getMetrics().failedCount).toBe(1);
    });

    test('allows tasks that stay strictly within per-task budget', async () => {
      const scheduler = new KernelScheduler();

      const okTask = await scheduler.schedule(
        async () => ({ totalTokens: 80, text: 'within limit' }),
        { taskId: 't_ok', taskTokenBudget: 100 },
      );

      expect(okTask.totalTokens).toBe(80);
      expect(scheduler.getMetrics().completedCount).toBe(1);
    });

    test('enforces per-task budget through AgentRuntime pipeline', async () => {
      const provider = new ProviderAdapter({
        mockHandler: async () => ({
          status: 'SUCCESS',
          summary: 'Generated large response',
          findings: [],
          totalTokens: 250, // exceeds budget of 100
        }),
      });

      const runtime = new AgentRuntime({ repoRoot, provider });
      const result = await runtime.executeTask({
        taskId: 't_runtime_budget',
        agentId: 'backend-specialist',
        objective: 'Test budget violation',
        tokenBudget: 100, // strict budget
      });

      expect(result.status).toBe('ERROR');
      expect(result.summary).toContain('SCHEDULER_ERROR: TASK_TOKEN_BUDGET_EXCEEDED');
      expect(result.errors[0]).toContain('exceeding allocated task budget of 100');
    });
  });

  describe('Per-Session Cumulative Ceiling', () => {
    test('halts additional dispatches once cumulative session ceiling is breached', async () => {
      const scheduler = new KernelScheduler({ maxTotalTokens: 200 });

      await scheduler.schedule(async () => ({ totalTokens: 120 }), { taskId: 't1' });
      expect(scheduler.getMetrics().totalTokensConsumed).toBe(120);

      await scheduler.schedule(async () => ({ totalTokens: 90 }), { taskId: 't2' });
      // Total is now 210, which exceeds 200
      expect(scheduler.getMetrics().totalTokensConsumed).toBe(210);
      expect(scheduler.getMetrics().isSessionBudgetBreached).toBe(true);

      // Third task must be blocked immediately before execution
      const blockedTask = scheduler.schedule(async () => ({ totalTokens: 10 }), { taskId: 't3' });
      await expect(blockedTask).rejects.toThrow('TOKEN_BUDGET_EXCEEDED');
      await expect(blockedTask).rejects.toThrow(/Session token ceiling of 200 reached/);

      expect(scheduler.getMetrics().activeTasks).toBe(0);
    });

    test('pre-execution estimated budget check blocks dispatch that would breach budget', async () => {
      const scheduler = new KernelScheduler({ maxTotalTokens: 100 });

      // Consumed 60 so far
      await scheduler.schedule(async () => ({ totalTokens: 60 }), { taskId: 't1' });

      // Enqueue task estimating 50 tokens (60 + 50 = 110 > 100)
      const greedyTask = scheduler.schedule(async () => ({ totalTokens: 50 }), {
        taskId: 't_greedy',
        estimatedTokens: 50,
      });

      await expect(greedyTask).rejects.toThrow('TOKEN_BUDGET_EXCEEDED');
      await expect(greedyTask).rejects.toThrow(/would breach session budget/);
    });
  });

  describe('Measured vs Estimated Token Accounting', () => {
    test('accurately increments measuredTokensConsumed when vendor provides counts', async () => {
      const scheduler = new KernelScheduler();

      await scheduler.schedule(async () => ({ totalTokens: 75, isEstimated: false }), {
        taskId: 'm1',
      });

      const metrics = scheduler.getMetrics();
      expect(metrics.measuredTokensConsumed).toBe(75);
      expect(metrics.estimatedTokensConsumed).toBe(0);
      expect(metrics.totalTokensConsumed).toBe(75);
    });

    test('never treats missing vendor tokens as zero: computes bounded estimate and tracks separately', async () => {
      const scheduler = new KernelScheduler();

      // Provider returns null/undefined totalTokens and no usage
      const promptText = 'a'.repeat(200);
      const outputText = 'b'.repeat(200);

      await scheduler.schedule(
        async () => ({ text: outputText }), // no totalTokens returned
        { taskId: 'est1', promptLength: promptText.length },
      );

      const metrics = scheduler.getMetrics();
      // Estimate = Math.ceil((200 + 200) / 4) = 100 tokens
      expect(metrics.estimatedTokensConsumed).toBe(100);
      expect(metrics.measuredTokensConsumed).toBe(0);
      expect(metrics.totalTokensConsumed).toBe(100);
    });
  });
});
