'use strict';

const {
  generateCanary,
  registerCanary,
  clearCanaries,
  getActiveCanaries,
  scanForDataLeakage,
  sanitizeTrace,
} = require('../../src/security');

describe('Data Leakage & Canary Token Auditor', () => {
  beforeEach(() => {
    clearCanaries();
  });

  test('generates unique synthetic canary tokens with high entropy', () => {
    const canary1 = generateCanary();
    const canary2 = generateCanary();

    expect(canary1).toMatch(/^CANARY_SECRET_[a-f0-9]{16}$/);
    expect(canary2).toMatch(/^CANARY_SECRET_[a-f0-9]{16}$/);
    expect(canary1).not.toBe(canary2);
    expect(getActiveCanaries()).toContain(canary1);
    expect(getActiveCanaries()).toContain(canary2);
  });

  test('detects canary token leakage in prompt outputs and serialized payloads', () => {
    const canary = generateCanary('CANARY_SECRET');
    const leakPayload = `The secret token is ${canary} and should not be displayed.`;

    const result = scanForDataLeakage(leakPayload);
    expect(result.leaksDetected).toBe(true);
    expect(result.leakedCanaries).toContain(canary);
    expect(result.findings.some(f => f.category === 'CANARY_TOKEN_LEAK')).toBe(true);
    expect(result.sanitizedContent).toContain('[REDACTED_CANARY]');
    expect(result.sanitizedContent).not.toContain(canary);
  });

  test('detects unredacted API key patterns and integrates with secret_redactor', () => {
    const secretPayload = 'Here is the OpenAI key: sk-proj-abcdef1234567890abcdef1234567890 for API calls.';
    const result = scanForDataLeakage(secretPayload);

    expect(result.leaksDetected).toBe(true);
    expect(result.secretRedactionsCount).toBeGreaterThan(0);
    expect(result.findings.some(f => f.category === 'CREDENTIAL_EXPOSURE')).toBe(true);
    expect(result.sanitizedContent).toContain('[REDACTED_API_KEY]');
  });

  test('sanitizeTrace recursively cleans nested objects and arrays', () => {
    const canary = generateCanary();
    const trace = {
      sessionId: 'sess-123',
      meta: {
        rawOutput: `Token found: ${canary}`,
        key: 'sk-ant-api03-abcdef1234567890abcdef',
      },
      events: [
        { type: 'log', message: `Leaked canary: ${canary}` },
        { type: 'status', message: 'All systems normal' },
      ],
    };

    const sanitized = sanitizeTrace(trace, [canary]);
    expect(sanitized.meta.rawOutput).toContain('[REDACTED_CANARY]');
    expect(sanitized.meta.key).toBe('[REDACTED_API_KEY]');
    expect(sanitized.events[0].message).toContain('[REDACTED_CANARY]');
    expect(sanitized.events[1].message).toBe('All systems normal');
    expect(JSON.stringify(sanitized)).not.toContain(canary);
  });
});

