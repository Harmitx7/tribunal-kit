'use strict';

const engine = require('../../.agent/scripts/skill_coverage_expansion_engine');

describe('Phase 24 — Coverage Recalculation Unit Tests', () => {
  const mockClaims = [
    { id: 'C1', testability: 'DIRECT' },
    { id: 'C2', testability: 'DIRECT' },
    { id: 'C3', testability: 'DIRECT' },
    { id: 'C4', testability: 'DIRECT' },
  ];

  test('coverage calculation reflects exact claim states without manual offsets', () => {
    // 2 verified claims out of 4 = 50% -> PARTIAL
    const claimStatesPartial = {
      C1: { status: 'VERIFIED' },
      C2: { status: 'VERIFIED' },
      C3: { status: 'UNTESTED' },
      C4: { status: 'UNTESTED' },
    };

    const resPartial = engine.recalculateCertification('dummy-skill', mockClaims, claimStatesPartial);
    expect(resPartial.coverage).toBe(50);
    expect(resPartial.status).toBe('PARTIAL');

    // 3 verified claims out of 4 = 75% -> HIGH_CONFIDENCE
    const claimStatesHigh = {
      C1: { status: 'VERIFIED' },
      C2: { status: 'VERIFIED' },
      C3: { status: 'VERIFIED' },
      C4: { status: 'UNTESTED' },
    };

    const resHigh = engine.recalculateCertification('dummy-skill', mockClaims, claimStatesHigh);
    expect(resHigh.coverage).toBe(75);
    expect(resHigh.status).toBe('HIGH_CONFIDENCE');

    // 4 verified claims out of 4 = 100% -> BEHAVIORALLY_CERTIFIED
    const claimStatesFull = {
      C1: { status: 'VERIFIED' },
      C2: { status: 'VERIFIED' },
      C3: { status: 'VERIFIED' },
      C4: { status: 'VERIFIED' },
    };

    const resFull = engine.recalculateCertification('dummy-skill', mockClaims, claimStatesFull);
    expect(resFull.coverage).toBe(100);
    expect(resFull.status).toBe('BEHAVIORALLY_CERTIFIED');
  });

  test('reference-only skills remain strictly UNPROVABLE at 0% coverage', () => {
    const resRef = engine.recalculateCertification(
      'apple-design',
      mockClaims,
      { C1: { status: 'VERIFIED' } }
    );
    expect(resRef.status).toBe('UNPROVABLE');
    expect(resRef.coverage).toBe(0);
  });
});
