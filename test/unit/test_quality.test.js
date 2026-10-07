'use strict';

const {
  calculateTestQualityScore,
  extractTestableClaims,
  generateTestSpecification,
  TEST_TYPES,
} = require('../../.agent/scripts/skill_test_authoring_engine');

describe('Test Quality Score Unit Tests', () => {
  it('1. Computes deterministic quality score with all 6 dimensions', () => {
    const claims = extractTestableClaims('api-patterns', { name: 'api-patterns' });
    const claim = claims.find(c => c.type === 'OUTPUT_CONFORMANCE') || claims[0];
    const test = generateTestSpecification('api-patterns', { name: 'api-patterns' }, claim, TEST_TYPES.POSITIVE);

    const quality = calculateTestQualityScore(test);

    expect(quality.score).toBeGreaterThanOrEqual(80);
    expect(quality.acceptable).toBe(true);
    expect(quality.breakdown.claim_clarity).toBeGreaterThan(0);
    expect(quality.breakdown.expectation_authority).toBe(25);
    expect(quality.breakdown.independence).toBe(20);
    expect(quality.breakdown.observability).toBe(15);
    expect(quality.breakdown.failure_specificity).toBe(10);
    expect(quality.breakdown.repeatability).toBeGreaterThanOrEqual(8);
  });

  it('2. Flags test with score below 80 as requiring human override', () => {
    const poorTest = {
      id: 'TEST-poor',
      claim: { id: 'c1', statement: 'do test', testability: 'DIRECT' },
      independence: { verified: false, expectation_source: 'documented_behavior' },
      expected: { outputs: [] },
      forbidden: {},
      execution: { repetitions: 1 },
      questions: {},
    };

    const quality = calculateTestQualityScore(poorTest);
    expect(quality.score).toBeLessThan(80);
    expect(quality.acceptable).toBe(false);
    expect(quality.requires_human_review).toBe(true);
  });

  it('3. Critical security test below 90 requires human review', () => {
    const securityTest = {
      id: 'TEST-security-borderline',
      risk: 'CRITICAL',
      claim: { id: 'c-sec', statement: 'Validate input sanitize policy', testability: 'DIRECT' },
      independence: { verified: true, expectation_source: 'contract.invariants' }, // 20 instead of 25
      expected: { outputs: [{ field: 'res' }], exit_status: 0 },
      forbidden: { outputs: [] },
      execution: { repetitions: 3 }, // 8 instead of 10
      questions: { failure_definition: 'Escape from sandbox' },
    };

    const quality = calculateTestQualityScore(securityTest);
    // Score should be between 80 and 89
    expect(quality.score).toBeLessThan(90);
    expect(quality.requires_human_review).toBe(true);
  });
});
