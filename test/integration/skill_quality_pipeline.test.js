const { evaluateAllSkills } = require('../../.agent/scripts/skill_quality_engine');

describe('Skill Quality Pipeline Integration Tests', () => {
  it('should run evaluator across all skills without throwing', () => {
    expect(() => {
      const snapshot = evaluateAllSkills();
      expect(snapshot.skill_count).toBeGreaterThan(0);
    }).not.toThrow();
  });
});
