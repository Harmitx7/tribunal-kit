'use strict';

const valEngine = require('../../.agent/scripts/corpus_validation_engine');

describe('Phase 26 — Cross-Wave Consistency Unit Tests', () => {
  const claims = [
    { id: 'C1', testability: 'DIRECT' },
    { id: 'C2', testability: 'DIRECT' },
    { id: 'C3', testability: 'DIRECT' },
    { id: 'C4', testability: 'DIRECT' },
  ];

  test('validateCertificationConsistency accepts consistent coverage and status', () => {
    const claimStates = {
      C1: { status: 'VERIFIED' },
      C2: { status: 'VERIFIED' },
      C3: { status: 'VERIFIED' },
      C4: { status: 'VERIFIED' },
    };

    const validCert = {
      coverage: 100,
      status: 'BEHAVIORALLY_CERTIFIED',
    };

    const result = valEngine.validateCertificationConsistency('test-skill', claims, claimStates, validCert);
    expect(result.consistent).toBe(true);
  });

  test('validateCertificationConsistency rejects mismatched coverage percentage', () => {
    const claimStates = {
      C1: { status: 'VERIFIED' },
      C2: { status: 'VERIFIED' },
      C3: { status: 'UNTESTED' },
      C4: { status: 'UNTESTED' },
    };

    // Actual coverage is 50%, but cert claims 75%
    const invalidCert = {
      coverage: 75,
      status: 'PARTIAL',
    };

    const result = valEngine.validateCertificationConsistency('test-skill', claims, claimStates, invalidCert);
    expect(result.consistent).toBe(false);
    expect(result.code).toBe('COVERAGE_MISMATCH');
  });

  test('validateCertificationConsistency rejects mismatched status level', () => {
    const claimStates = {
      C1: { status: 'VERIFIED' },
      C2: { status: 'VERIFIED' },
      C3: { status: 'VERIFIED' },
      C4: { status: 'UNTESTED' },
    };

    // Actual coverage is 75% -> HIGH_CONFIDENCE, but cert claims BEHAVIORALLY_CERTIFIED
    const invalidCert = {
      coverage: 75,
      status: 'BEHAVIORALLY_CERTIFIED',
    };

    const result = valEngine.validateCertificationConsistency('test-skill', claims, claimStates, invalidCert);
    expect(result.consistent).toBe(false);
    expect(result.code).toBe('STATUS_MISMATCH');
  });
});
