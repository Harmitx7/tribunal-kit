'use strict';

const {
  extractTestableClaims,
  generateTestSpecification,
  prepareReviewPackage,
  approveSpecification,
  executeApprovedTest,
  evaluateCertification,
  REVIEW_STATES,
  TEST_TYPES,
} = require('../../.agent/scripts/skill_test_authoring_engine');

describe('Skill Certification Pipeline Integration', () => {
  it('1. Computes behavioral coverage and certification state for fully tested skill', () => {
    const skillName = 'lint-and-validate';
    const claims = extractTestableClaims(skillName, { name: skillName });

    const results = [];
    for (const claim of claims.filter(c => c.testability === 'DIRECT' || c.testability === 'DERIVABLE')) {
      const test = generateTestSpecification(skillName, { name: skillName }, claim, TEST_TYPES.POSITIVE);
      const pkg = prepareReviewPackage(test);
      approveSpecification(pkg, test, REVIEW_STATES.APPROVED, 'Lead Reviewer', 'Verified independent expectation');
      const res = executeApprovedTest(test);
      results.push(res);
    }

    const cert = evaluateCertification(skillName, results, claims);

    expect(cert.total_claims).toBe(claims.length);
    expect(cert.applicable_claims).toBeGreaterThan(0);
    expect(cert.verified_claims).toBe(results.length);
    expect(cert.coverage_pct).toBeGreaterThan(0);
    expect(['PARTIAL', 'BEHAVIORALLY_CERTIFIED']).toContain(cert.status);
  });

  it('2. Excludes reference-only skills from certification as NOT_APPLICABLE', () => {
    const skillName = '12-principles-of-animation';
    const claims = extractTestableClaims(skillName, { name: skillName });

    const cert = evaluateCertification(skillName, [], claims);
    expect(cert.status).toBe('NOT_APPLICABLE');
    expect(cert.coverage_pct).toBe(0);
    expect(cert.applicable_claims).toBe(0);
  });

  it('3. Never normalizes failing tests into passing certification evidence', () => {
    const skillName = 'api-patterns';
    const claims = extractTestableClaims(skillName, { name: skillName });

    const mockFailedResult = {
      test_id: 'TEST-mock-fail',
      skill_id: skillName,
      status: 'FAIL',
      repeatability: { classification: 'FAILED' },
    };

    const cert = evaluateCertification(skillName, [mockFailedResult], claims);
    expect(cert.verified_claims).toBe(0);
    expect(cert.status).toBe('UNPROVABLE');
  });
});
