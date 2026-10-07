'use strict';

const {
  discoverTestableSkills,
  extractTestableClaims,
  generateTestSpecification,
  validateSpecification,
  calculateTestQualityScore,
  TEST_TYPES,
  TESTABILITY,
} = require('../../.agent/scripts/skill_test_authoring_engine');

describe('Test Authoring Pipeline Integration', () => {
  it('1. Executes full test authoring across pilot skills without circular expectations', () => {
    const discovery = discoverTestableSkills();
    expect(discovery.pilot.length).toBe(25);

    let totalAuthored = 0;
    let totalQualityPass = 0;

    for (const skillName of discovery.pilot.slice(0, 5)) {
      const claims = extractTestableClaims(skillName, { name: skillName });
      expect(claims.length).toBeGreaterThan(0);

      const testableClaims = claims.filter(c => c.testability !== TESTABILITY.UNTESTABLE);

      for (const claim of testableClaims) {
        // Author positive test
        const posTest = generateTestSpecification(skillName, { name: skillName }, claim, TEST_TYPES.POSITIVE);
        const val = validateSpecification(posTest);
        expect(val.valid).toBe(true);

        const quality = calculateTestQualityScore(posTest);
        if (quality.acceptable) totalQualityPass++;
        totalAuthored++;

        // Verify expectation precedes execution
        expect(posTest.independence.verified).toBe(true);
        expect(posTest.independence.expectation_source).not.toContain('runtime');
        expect(posTest.independence.expectation_source).not.toContain('implementation');
      }
    }

    expect(totalAuthored).toBeGreaterThan(0);
    expect(totalQualityPass).toBeGreaterThanOrEqual(Math.floor(totalAuthored * 0.9));
  });

  it('2. Correctly preserves UNTESTABLE status for reference-only skills', () => {
    const claims = extractTestableClaims('12-principles-of-animation', {
      name: '12-principles-of-animation',
    });
    const testableClaims = claims.filter(c => c.testability !== TESTABILITY.UNTESTABLE);
    // Zero testable claims allowed for reference-only
    expect(testableClaims.length).toBe(0);
  });
});
