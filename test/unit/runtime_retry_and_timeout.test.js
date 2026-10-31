'use strict';

const {
  RetryAndTimeoutEngine,
  calculateJitteredBackoff,
  interruptibleSleep,
} = require('../../src/runtime_reliability');

describe('Bounded Retry, Exponential Backoff & Idempotency Engine', () => {
  test('calculateJitteredBackoff computes backoff delay bounded by maxDelay', () => {
    const policy = {
      initialDelayMs: 100,
      maxDelayMs: 1000,
      backoffFactor: 2.0,
      jitter: false,
    };

    expect(calculateJitteredBackoff(1, policy)).toBe(100);
    expect(calculateJitteredBackoff(2, policy)).toBe(200);
    expect(calculateJitteredBackoff(3, policy)).toBe(400);
    expect(calculateJitteredBackoff(5, policy)).toBe(1000); // capped at maxDelayMs

    // Honors Retry-After parameter
    expect(calculateJitteredBackoff(1, policy, 350)).toBe(350);
  });

  test('RetryAndTimeoutEngine executes successful tasks immediately', async () => {
    const engine = new RetryAndTimeoutEngine();
    const result = await engine.execute(async () => 'OK');

    expect(result.result).toBe('OK');
    expect(result.attempts).toBe(1);
    expect(result.fromCache).toBe(false);
  });

  test('RetryAndTimeoutEngine recovers after transient failures', async () => {
    const engine = new RetryAndTimeoutEngine({
      policy: {
        maxAttempts: 3,
        initialDelayMs: 10,
        maxDelayMs: 50,
        backoffFactor: 2.0,
        jitter: false,
      },
    });

    let calls = 0;
    const result = await engine.execute(async (attempt) => {
      calls++;
      if (calls < 2) {
        const err = new Error('read ECONNRESET');
        err.code = 'ECONNRESET';
        throw err;
      }
      return 'RECOVERED';
    });

    expect(result.result).toBe('RECOVERED');
    expect(result.attempts).toBe(2);
    expect(result.retriedErrors.length).toBe(1);
    expect(result.retriedErrors[0].category).toBe('TRANSIENT_NETWORK');
  });

  test('RetryAndTimeoutEngine halts immediately on non-retryable errors', async () => {
    const engine = new RetryAndTimeoutEngine({
      policy: { maxAttempts: 5, initialDelayMs: 10 },
    });

    let calls = 0;
    await expect(
      engine.execute(async () => {
        calls++;
        const authErr = new Error('Invalid API key');
        authErr.status = 401;
        throw authErr;
      })
    ).rejects.toThrow('Invalid API key');

    expect(calls).toBe(1); // Did not retry
  });

  test('RetryAndTimeoutEngine halts retrying when non-idempotent operation fails', async () => {
    const engine = new RetryAndTimeoutEngine({
      policy: { maxAttempts: 3, initialDelayMs: 10, idempotentOnly: true },
    });

    let calls = 0;
    await expect(
      engine.execute(
        async () => {
          calls++;
          const netErr = new Error('Network blip');
          netErr.code = 'ECONNRESET';
          throw netErr;
        },
        { isIdempotent: false }
      )
    ).rejects.toThrow('Network blip');

    expect(calls).toBe(1); // Non-idempotent -> prohibited from retrying
  });

  test('RetryAndTimeoutEngine caches results by idempotencyKey', async () => {
    const engine = new RetryAndTimeoutEngine();
    let executions = 0;

    const op = () => {
      executions++;
      return { data: 'processed_payload' };
    };

    const res1 = await engine.execute(op, { idempotencyKey: 'tx_token_123' });
    expect(res1.fromCache).toBe(false);
    expect(executions).toBe(1);

    const res2 = await engine.execute(op, { idempotencyKey: 'tx_token_123' });
    expect(res2.fromCache).toBe(true);
    expect(res2.result.data).toBe('processed_payload');
    expect(executions).toBe(1); // Function not invoked a second time
  });

  test('interruptibleSleep terminates promptly on AbortSignal', async () => {
    const controller = new AbortController();
    const sleepPromise = interruptibleSleep(5000, controller.signal);

    setTimeout(() => controller.abort(), 20);

    await expect(sleepPromise).rejects.toThrow('Execution aborted during retry backoff');
  });
});
