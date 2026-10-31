'use strict';

const { CancellationContext } = require('../../src/runtime_reliability');

describe('Hierarchical Cancellation Context & Timeout Propagation', () => {
  test('Basic cancellation aborts signal and records reason', () => {
    const ctx = new CancellationContext();
    expect(ctx.isCancelled()).toBe(false);
    expect(ctx.signal.aborted).toBe(false);

    ctx.cancel('User requested cancellation', 'CANCELLED');
    expect(ctx.isCancelled()).toBe(true);
    expect(ctx.signal.aborted).toBe(true);
    expect(ctx.getReason()).toBe('User requested cancellation');
    expect(ctx.getCategory()).toBe('CANCELLED');
  });

  test('Parent cancellation automatically propagates downward to all child contexts', () => {
    const parent = new CancellationContext();
    const child1 = parent.createChild();
    const child2 = parent.createChild();
    const grandChild = child1.createChild();

    expect(child1.isCancelled()).toBe(false);
    expect(grandChild.isCancelled()).toBe(false);

    parent.cancel('Workflow aborted at root', 'CANCELLED');

    expect(parent.isCancelled()).toBe(true);
    expect(child1.isCancelled()).toBe(true);
    expect(child2.isCancelled()).toBe(true);
    expect(grandChild.isCancelled()).toBe(true);
    expect(grandChild.getReason()).toBe('Workflow aborted at root');
  });

  test('Child cancellation does not cancel parent context', () => {
    const parent = new CancellationContext();
    const child = parent.createChild();

    child.cancel('Child task timed out', 'TIMEOUT');

    expect(child.isCancelled()).toBe(true);
    expect(parent.isCancelled()).toBe(false);
  });

  test('Deadline timer automatically triggers timeout cancellation', async () => {
    const ctx = new CancellationContext({ timeoutMs: 30 });
    expect(ctx.isCancelled()).toBe(false);

    await new Promise((res) => setTimeout(res, 50));

    expect(ctx.isCancelled()).toBe(true);
    expect(ctx.getCategory()).toBe('TIMEOUT');
    expect(ctx.getReason()).toContain('deadline of 30ms expired');
  });

  test('Registered onCancel cleanup hooks are executed on cancellation', () => {
    const ctx = new CancellationContext();
    let hookExecuted = false;
    let receivedReason = null;

    ctx.onCancel((reason) => {
      hookExecuted = true;
      receivedReason = reason;
    });

    ctx.cancel('Cleanup test', 'CANCELLED');

    expect(hookExecuted).toBe(true);
    expect(receivedReason).toBe('Cleanup test');
  });

  test('Dispose clears timers and detaches from parent', () => {
    const parent = new CancellationContext();
    const child = parent.createChild({ timeoutMs: 10000 });

    expect(parent.children.size).toBe(1);
    child.dispose();

    expect(parent.children.size).toBe(0);
    expect(child.timeoutTimer).toBeNull();
  });
});
