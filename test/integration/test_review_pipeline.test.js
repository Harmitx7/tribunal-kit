'use strict';

const {
  extractTestableClaims,
  generateTestSpecification,
  prepareReviewPackage,
  approveSpecification,
  executeApprovedTest,
  REVIEW_STATES,
  TEST_TYPES,
} = require('../../.agent/scripts/skill_test_authoring_engine');

describe('Test Review Pipeline Integration', () => {
  it('1. Transitions test from DRAFT to REVIEW_REQUIRED upon review package creation', () => {
    const claims = extractTestableClaims('api-patterns', { name: 'api-patterns' });
    const claim = claims.find(c => c.type === 'OUTPUT_CONFORMANCE') || claims[0];
    const test = generateTestSpecification('api-patterns', { name: 'api-patterns' }, claim, TEST_TYPES.POSITIVE);

    expect(test.review.status).toBe(REVIEW_STATES.DRAFT);

    const pkg = prepareReviewPackage(test);

    expect(test.review.status).toBe(REVIEW_STATES.REVIEW_REQUIRED);
    expect(pkg.review_status).toBe(REVIEW_STATES.REVIEW_REQUIRED);
    expect(pkg.review_decision).toBe('PENDING');
    expect(pkg.hashes.test_hash).toBeDefined();
    expect(pkg.hashes.source_hash).toBeDefined();
    expect(pkg.hashes.expectation_hash).toBeDefined();
  });

  it('2. Reviewer can approve test specification and unlock execution', () => {
    const claims = extractTestableClaims('api-patterns', { name: 'api-patterns' });
    const claim = claims.find(c => c.type === 'OUTPUT_CONFORMANCE') || claims[0];
    const test = generateTestSpecification('api-patterns', { name: 'api-patterns' }, claim, TEST_TYPES.POSITIVE);
    const pkg = prepareReviewPackage(test);

    approveSpecification(pkg, test, REVIEW_STATES.APPROVED, 'SeniorQA Reviewer', 'Independent contract assertions verified');

    expect(test.review.status).toBe(REVIEW_STATES.APPROVED);
    expect(test.review.reviewer).toBe('SeniorQA Reviewer');

    const result = executeApprovedTest(test);
    expect(result.status).toBe('PASS');
    expect(result.repeatability.classification).toBe('DETERMINISTIC');
  });

  it('3. Rejected test cannot be executed', () => {
    const claims = extractTestableClaims('api-patterns', { name: 'api-patterns' });
    const claim = claims.find(c => c.type === 'OUTPUT_CONFORMANCE') || claims[0];
    const test = generateTestSpecification('api-patterns', { name: 'api-patterns' }, claim, TEST_TYPES.POSITIVE);
    const pkg = prepareReviewPackage(test);

    approveSpecification(pkg, test, REVIEW_STATES.REJECTED, 'QA Auditor', 'Inadequate failure criteria');

    expect(test.review.status).toBe(REVIEW_STATES.REJECTED);

    expect(() => {
      executeApprovedTest(test);
    }).toThrow(/Cannot execute test with status 'REJECTED'/);
  });
});
