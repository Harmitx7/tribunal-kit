const {
  createReviewPackage,
  processHumanValidation,
} = require('../../.agent/scripts/skill_human_validation');

describe('Skill Human Validation Engine', () => {
  it('1. Package creation and decision logic', () => {
    const pkg = createReviewPackage('test', {}, {});
    const decision = processHumanValidation(pkg, 'ACCEPT', 'Reviewer', 'Good');
    expect(decision.decision).toBe('ACCEPT');
    expect(decision.hash_of_review_package).toBe(pkg.hash);
  });
});
