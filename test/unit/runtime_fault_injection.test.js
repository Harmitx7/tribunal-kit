'use strict';

const {
  FaultInjectionEngine,
  RetryAndTimeoutEngine,
} = require('../../src/runtime_reliability');

describe('In-Process Deterministic Fault Injection & Chaos Engine', () => {
  let faultEngine;

  beforeEach(() => {
    faultEngine = new FaultInjectionEngine();
  });

  afterEach(() => {
    faultEngine.reset();
  });

  test('Injects synthetic timeout fault', async () => {
    faultEngine.addRule('callModel', { type: 'TIMEOUT' });

    await expect(
      faultEngine.intercept('callModel', async () => 'real result')
    ).rejects.toThrow('Injected timeout');

    expect(faultEngine.getInterceptCount('callModel')).toBe(1);
  });

  test('Injects synthetic transient network failure (ECONNRESET)', async () => {
    faultEngine.addRule('fetchDependency', {
      type: 'NETWORK',
      params: { code: 'ECONNRESET' },
    });

    await expect(
      faultEngine.intercept('fetchDependency', async () => 'payload')
    ).rejects.toThrow('Injected connection reset');
  });

  test('Injects synthetic HTTP 429 rate limit with Retry-After', async () => {
    faultEngine.addRule('generateResponse', {
      type: 'RATE_LIMIT',
      params: { retryAfterMs: 150 },
    });

    try {
      await faultEngine.intercept('generateResponse', async () => 'OK');
      throw new Error('Should have failed');
    } catch (err) {
      expect(err.status).toBe(429);
      expect(err.failureCategory).toBe('RATE_LIMITED');
      expect(err.retryAfterMs).toBe(150);
    }
  });

  test('Injects malformed JSON response', async () => {
    faultEngine.addRule('parseOutput', { type: 'MALFORMED' });

    await expect(
      faultEngine.intercept('parseOutput', async () => '{"valid": true}')
    ).rejects.toThrow(SyntaxError);
  });

  test('Simulates transient failure that recovers on attempt 2 using RetryAndTimeoutEngine', async () => {
    // Rule fires only once, then passes through to original function
    faultEngine.injectTransientFailure('unstableApi', 'NETWORK', 1, { code: 'ECONNRESET' });

    const retryEngine = new RetryAndTimeoutEngine({
      policy: {
        maxAttempts: 3,
        initialDelayMs: 10,
        maxDelayMs: 50,
        jitter: false,
      },
    });

    const result = await retryEngine.execute(async () => {
      return faultEngine.intercept('unstableApi', async () => 'RECOVERED_SUCCESS');
    });

    expect(result.result).toBe('RECOVERED_SUCCESS');
    expect(result.attempts).toBe(2);
    expect(faultEngine.getInterceptCount('unstableApi')).toBe(1);
  });
});
