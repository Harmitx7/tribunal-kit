'use strict';

const { ResourceGuardEngine } = require('../../src/runtime_reliability');

describe('Resource Guard, Backpressure & Deadlock Detector Engine', () => {
  test('Throttles concurrency to maxConcurrency limit', async () => {
    const guard = new ResourceGuardEngine({ maxConcurrency: 2, maxQueueDepth: 10 });

    const slot1 = await guard.acquireSlot('t1');
    const slot2 = await guard.acquireSlot('t2');

    expect(slot1.acquiredImmediately).toBe(true);
    expect(slot2.acquiredImmediately).toBe(true);
    expect(guard.activeTaskCount).toBe(2);

    // Third task must be queued
    let t3Resolved = false;
    guard.acquireSlot('t3').then(() => {
      t3Resolved = true;
    });

    expect(t3Resolved).toBe(false);
    expect(guard.queue.length).toBe(1);

    // Releasing one slot drains queue
    guard.releaseSlot();
    await new Promise((r) => setImmediate(r));
    expect(t3Resolved).toBe(true);
    expect(guard.queue.length).toBe(0);

    guard.releaseSlot();
    guard.releaseSlot();
    expect(guard.activeTaskCount).toBe(0);
  });

  test('Applies queue backpressure rejection when maxQueueDepth is exceeded', async () => {
    const guard = new ResourceGuardEngine({ maxConcurrency: 1, maxQueueDepth: 2 });

    await guard.acquireSlot('t1'); // active
    guard.acquireSlot('t2'); // queued 1
    guard.acquireSlot('t3'); // queued 2

    // 4th task should be rejected with RESOURCE_EXHAUSTED
    await expect(guard.acquireSlot('t4')).rejects.toThrow('capacity exceeded');
  });

  test('Tracks token consumption and enforces budget limit', () => {
    const guard = new ResourceGuardEngine({ tokenBudget: 1000 });

    guard.recordTokenUsage(400);
    expect(guard.consumedTokens).toBe(400);

    guard.recordTokenUsage(500);
    expect(guard.consumedTokens).toBe(900);

    expect(() => guard.recordTokenUsage(200)).toThrow('Token budget of 1000 exceeded');
  });

  test('boundOutput truncates oversized response text', () => {
    const guard = new ResourceGuardEngine({ maxOutputChars: 50 });
    const shortText = 'Clean concise response.';
    expect(guard.boundOutput(shortText)).toBe(shortText);

    const longText = 'A'.repeat(100);
    const bounded = guard.boundOutput(longText);
    expect(bounded.length).toBeLessThan(100);
    expect(bounded).toContain('[TRUNCATED');
  });

  test('detectDeadlocks detects circular wait dependencies among agents', () => {
    const guard = new ResourceGuardEngine();

    // Setup circular wait: Agent A -> Agent B -> Agent C -> Agent A
    guard.registerWaitDependency('agent-A', 'agent-B');
    guard.registerWaitDependency('agent-B', 'agent-C');
    guard.registerWaitDependency('agent-C', 'agent-A');

    const result = guard.detectDeadlocks();
    expect(result.hasDeadlock).toBe(true);
    expect(result.deadlocksCount).toBeGreaterThanOrEqual(1);
    expect(result.findings.length).toBeGreaterThanOrEqual(1);
    expect(result.findings[0].category).toBe('DEADLOCK_DETECTED');
    expect(result.findings[0].severity).toBe('CRITICAL');

    // Removing dependency resolves deadlock
    guard.removeWaitDependency('agent-C', 'agent-A');
    const cleanResult = guard.detectDeadlocks();
    expect(cleanResult.hasDeadlock).toBe(false);
  });
});
