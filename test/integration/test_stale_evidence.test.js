'use strict';

const {
  extractTestableClaims,
  generateTestSpecification,
  prepareReviewPackage,
  approveSpecification,
  checkStaleTests,
  REVIEW_STATES,
  TEST_TYPES,
} = require('../../.agent/scripts/skill_test_authoring_engine');

describe('Stale Evidence Invalidation Integration', () => {
  it('1. Marks test as STALE when recorded source hash mismatches current SKILL.md hash', () => {
    const skillName = 'api-patterns';
    const claims = extractTestableClaims(skillName, { name: skillName });
    const claim = claims[0];
    const test = generateTestSpecification(skillName, { name: skillName }, claim, TEST_TYPES.POSITIVE);
    const pkg = prepareReviewPackage(test);
    approveSpecification(pkg, test, REVIEW_STATES.APPROVED, 'Reviewer', 'Approved');

    // Simulate stale hash
    test.evidence_sources[0].source_hash = '0000000000000000000000000000000000000000000000000000000000000000';

    const staleCheck = checkStaleTests(test);
    expect(staleCheck.is_stale).toBe(true);
    expect(test.review.status).toBe(REVIEW_STATES.STALE);
    expect(staleCheck.reason).toContain('source hash mismatch');
  });

  it('2. Retains VALID status when source hash matches current file', () => {
    const skillName = 'api-patterns';
    const claims = extractTestableClaims(skillName, { name: skillName });
    const claim = claims[0];
    const test = generateTestSpecification(skillName, { name: skillName }, claim, TEST_TYPES.POSITIVE);

    const staleCheck = checkStaleTests(test);
    expect(staleCheck.is_stale).toBe(false);
    expect(test.review.status).not.toBe(REVIEW_STATES.STALE);
  });
});
