'use strict';

const {
  extractTestableClaims,
  generateTestSpecification,
  prepareReviewPackage,
  approveSpecification,
  calculateTestQualityScore,
  REVIEW_STATES,
  TEST_TYPES,
} = require('../../.agent/scripts/skill_test_authoring_engine');

describe('Security Boundary Integration Tests', () => {
  it('1. Enforces 5 repetitions and CRITICAL risk for security skills', () => {
    const securitySkill = 'api-security-auditor';
    const claims = extractTestableClaims(securitySkill, { name: securitySkill });
    const safetyClaim = claims.find(c => c.type === 'SAFETY_INVARIANT') || claims[0];

    const test = generateTestSpecification(securitySkill, { name: securitySkill }, safetyClaim, TEST_TYPES.SAFETY);

    expect(test.risk).toBe('CRITICAL');
    expect(test.execution.repetitions).toBe(5);
  });

  it('2. Rejects automated approval for security-classified skills', () => {
    const securitySkill = 'api-security-auditor';
    const claims = extractTestableClaims(securitySkill, { name: securitySkill });
    const claim = claims[0];
    const test = generateTestSpecification(securitySkill, { name: securitySkill }, claim, TEST_TYPES.POSITIVE);
    const pkg = prepareReviewPackage(test);

    // Automated approval attempt should throw
    expect(() => {
      approveSpecification(pkg, test, REVIEW_STATES.APPROVED, 'auto-bot-verifier', 'automated acceptance');
    }).toThrow(/require explicit human approval, not automated approval/);
  });

  it('3. Accepts human reviewer approval for security-classified skills', () => {
    const securitySkill = 'api-security-auditor';
    const claims = extractTestableClaims(securitySkill, { name: securitySkill });
    const claim = claims[0];
    const test = generateTestSpecification(securitySkill, { name: securitySkill }, claim, TEST_TYPES.POSITIVE);
    const pkg = prepareReviewPackage(test);

    approveSpecification(pkg, test, REVIEW_STATES.APPROVED, 'SecAudit Human Officer', 'Independent safety and contract verification passed');
    expect(test.review.status).toBe(REVIEW_STATES.APPROVED);
    expect(test.review.reviewer).toBe('SecAudit Human Officer');
  });
});
