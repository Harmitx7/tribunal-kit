const { classifySkill } = require('../../.agent/scripts/skill_behavior_classifier');

describe('Skill Behavior Classifier', () => {
  it('1. Correctly classifies routing skill', () => {
    const res = classifySkill('test-routing', { name: 'test-routing', content: 'router' });
    expect(res.class).toBe('ROUTING');
  });

  it('2. Correctly classifies reference skill', () => {
    const res = classifySkill('apple-design', { name: 'apple-design', content: 'guidelines' });
    expect(res.class).toBe('REFERENCE_ONLY');
  });

  it('3. Correctly classifies executable skill', () => {
    const res = classifySkill('run-test', { name: 'run-test', content: 'npm run test' });
    expect(res.class).toBe('EXECUTABLE');
  });
});
