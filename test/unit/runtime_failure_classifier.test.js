'use strict';

const { FailureClassifier } = require('../../src/runtime_reliability');

describe('Failure Classifier & Retryability Evaluator', () => {
  test('Classifies transient network errors', () => {
    const errReset = new Error('read ECONNRESET');
    errReset.code = 'ECONNRESET';
    expect(FailureClassifier.classify(errReset)).toBe('TRANSIENT_NETWORK');

    const err503 = new Error('Service Unavailable');
    err503.status = 503;
    expect(FailureClassifier.classify(err503)).toBe('TRANSIENT_NETWORK');
  });

  test('Classifies rate limiting (HTTP 429)', () => {
    const err429 = new Error('Too Many Requests');
    err429.status = 429;
    expect(FailureClassifier.classify(err429)).toBe('RATE_LIMITED');
  });

  test('Classifies authorization and authentication errors', () => {
    const err401 = new Error('Invalid API key provided');
    err401.status = 401;
    expect(FailureClassifier.classify(err401)).toBe('AUTHORIZATION_FAILURE');

    const err403 = new Error('Forbidden resource');
    err403.status = 403;
    expect(FailureClassifier.classify(err403)).toBe('AUTHORIZATION_FAILURE');
  });

  test('Classifies malformed JSON and syntax errors', () => {
    const syntaxErr = new SyntaxError('Unexpected token < in JSON at position 0');
    expect(FailureClassifier.classify(syntaxErr)).toBe('MALFORMED_OUTPUT');
  });

  test('Classifies timeouts and cancellations', () => {
    const timeoutErr = new Error('TOOL_TIMEOUT: Process took too long');
    expect(FailureClassifier.classify(timeoutErr)).toBe('TIMEOUT');

    const abortErr = new Error('Operation was aborted');
    abortErr.name = 'AbortError';
    expect(FailureClassifier.classify(abortErr)).toBe('CANCELLED');
  });

  test('Evaluates retryability based on failure class and idempotency', () => {
    // Idempotent read + Transient network -> retryable
    expect(FailureClassifier.isRetryable('TRANSIENT_NETWORK', true)).toBe(true);

    // Non-idempotent write + Transient network -> NOT retryable
    expect(FailureClassifier.isRetryable('TRANSIENT_NETWORK', false)).toBe(false);

    // Rate limited + Idempotent -> retryable
    expect(FailureClassifier.isRetryable('RATE_LIMITED', true)).toBe(true);

    // Authorization failure -> NEVER retryable
    expect(FailureClassifier.isRetryable('AUTHORIZATION_FAILURE', true)).toBe(false);
    expect(FailureClassifier.isRetryable('INVALID_INPUT', true)).toBe(false);
    expect(FailureClassifier.isRetryable('TIMEOUT', true)).toBe(false);
  });

  test('extractRetryAfterMs extracts delay from headers or properties', () => {
    const errWithHeader = {
      headers: { 'retry-after': '5' },
    };
    expect(FailureClassifier.extractRetryAfterMs(errWithHeader)).toBe(5000);

    const errWithProp = { retryAfterMs: 2500 };
    expect(FailureClassifier.extractRetryAfterMs(errWithProp)).toBe(2500);

    const errNoHeader = {};
    expect(FailureClassifier.extractRetryAfterMs(errNoHeader)).toBeNull();
  });
});
