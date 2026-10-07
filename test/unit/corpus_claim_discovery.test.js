'use strict';

const { extractTestableClaims } = require('../../.agent/scripts/skill_test_authoring_engine');

describe('Phase 25 — Corpus Claim Discovery Unit Tests', () => {
  test('extractTestableClaims discovers legitimate contract and invariant claims for corpus skills', () => {
    const claims = extractTestableClaims('bash-linux');
    expect(claims.length).toBeGreaterThan(0);

    const hasInputClaim = claims.some(c => c.type === 'INPUT_VALIDATION');
    const hasSafetyClaim = claims.some(c => c.type === 'SAFETY_INVARIANT');

    expect(hasInputClaim).toBe(true);
    expect(hasSafetyClaim).toBe(true);
  });

  test('reference-only skills receive strictly UNTESTABLE claims', () => {
    const claims = extractTestableClaims('swiss-design');
    for (const c of claims) {
      expect(c.testability).toBe('UNTESTABLE');
    }
  });

  test('human-boundary skills have human-required claims preserved', () => {
    const claims = extractTestableClaims('60fps-animation');
    const humanClaim = claims.find(c => c.testability === 'HUMAN_REQUIRED');
    expect(humanClaim).toBeDefined();
  });
});
