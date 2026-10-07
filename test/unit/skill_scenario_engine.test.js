const { deriveScenarios } = require('../../.agent/scripts/skill_scenario_engine');

describe('Skill Scenario Engine', () => {
  it('1. Refuses to invent assertions for reference skill', () => {
    const res = deriveScenarios({ name: 'apple-design' }, { class: 'REFERENCE_ONLY' });
    expect(res[0].status).toBe('UNPROVABLE');
  });

  it('2. Derives from verification block', () => {
    const res = deriveScenarios(
      { name: 'test', verification: { assertions: ['test passes'] } },
      { class: 'EXECUTABLE' },
    );
    expect(res.some(r => r.id === 'verification-assertions')).toBe(true);
  });
});
