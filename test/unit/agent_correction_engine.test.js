const { AgentCorrectionEngine } = require('../../src/execution/agent_correction_engine');

describe('AgentCorrectionEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new AgentCorrectionEngine();
  });

  it('returns null if not rejected or denied', () => {
    const res = engine.generateCorrection({}, { verdict: 'APPROVED' }, { action: 'ALLOW' });
    expect(res).toBeNull();
  });

  it('generates payload for policy DENY', () => {
    const res = engine.generateCorrection(
      {},
      { verdict: 'APPROVED' },
      { action: 'DENY', reason: 'Modification of protected file: .env' },
    );

    expect(res).not.toBeNull();
    expect(res.status).toBe('REJECTED');
    expect(res.reason).toContain('protected file: .env');
    expect(res.failed_constraints).toContain('Policy Engine: Modification of protected file: .env');
    expect(res.suggested_actions).toContain(
      'Do not modify protected boundaries or sensitive files without explicit authorization.',
    );
  });

  it('generates payload for reviewer REJECTED with findings', () => {
    const verdict = {
      verdict: 'REJECTED',
      reason: 'Critical security vulnerability found',
      findings: [
        {
          severity: 'CRITICAL',
          category: 'Security',
          file: 'src/api.js',
          issue: 'SQL Injection vector',
          recommendation: 'Use parameterized queries instead of string concatenation.',
        },
        {
          severity: 'INFO', // Should be ignored in failed_constraints
          category: 'Style',
          file: 'src/api.js',
          issue: 'Missing trailing comma',
          recommendation: 'Add trailing comma',
        },
      ],
    };
    const policy = { action: 'ALLOW' };

    const res = engine.generateCorrection({}, verdict, policy);

    expect(res).not.toBeNull();
    expect(res.status).toBe('REJECTED');
    expect(res.failed_constraints).toContain('[Security] SQL Injection vector');
    expect(res.failed_constraints).not.toContain('[Style] Missing trailing comma');
    expect(res.suggested_actions).toContain(
      'Fix in src/api.js: Use parameterized queries instead of string concatenation.',
    );
  });

  it('deduplicates constraints and actions', () => {
    const verdict = {
      verdict: 'REJECTED',
      reason: 'Multiple issues',
      findings: [
        {
          severity: 'CRITICAL',
          category: 'Auth',
          file: 'auth.js',
          issue: 'Missing JWT validation',
          recommendation: 'Validate JWT',
        },
        {
          severity: 'CRITICAL',
          category: 'Auth',
          file: 'auth.js', // Same issue duplicate
          issue: 'Missing JWT validation',
          recommendation: 'Validate JWT',
        },
      ],
    };

    const res = engine.generateCorrection({}, verdict, { action: 'ALLOW' });
    expect(res.failed_constraints.length).toBe(1);
    expect(res.suggested_actions.length).toBe(1);
  });
});
