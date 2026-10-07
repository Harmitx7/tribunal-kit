const { reconstructSkill } = require('../../.agent/scripts/skill_reconstruction_engine');

describe('Skill Reconstruction Pipeline', () => {
  it('1. Rejects reconstruction without evidence (UNPROVABLE)', () => {
    // Just testing logic on a known reference skill
    const res = reconstructSkill('apple-design');
    expect(res.status).toBe('REJECTED');
    expect(res.reason).toBe('UNPROVABLE');
  });
});
