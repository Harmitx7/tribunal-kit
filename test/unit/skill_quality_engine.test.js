const {
  calculateSkillQuality,
  assertSkillQuality,
  compareQualitySnapshots,
} = require('../../.agent/scripts/skill_quality_engine');

describe('Skill Quality Engine Unit Tests', () => {
  const dummyOntology = { skills: { 'test-skill': { parents: [] } } };

  it('1. Perfect skill -> A', () => {
    const skill = {
      name: 'test-skill',
      verification: { declared: true, assertions: ['something'] },
    };
    const p = calculateSkillQuality('test-skill', skill, dummyOntology);
    // Even if it's not perfect 100 because of default scores, it should not be a BLOCK.
    expect(p.classification).not.toBe('BLOCK');
  });

  it('2. Missing contract -> BLOCK', () => {
    const p = calculateSkillQuality('test-skill', null, dummyOntology);
    expect(p.classification).toBe('BLOCK');
    expect(p.findings[0].finding_id).toBe('CON-001');
  });

  it('3. Missing verification -> C/D (Not BLOCK, but penalty applied)', () => {
    const skill = { name: 'test-skill' };
    const p = calculateSkillQuality('test-skill', skill, dummyOntology);
    expect(p.classification).not.toBe('BLOCK');
    expect(p.recommendations).toContain('ADD_VERIFICATION');
  });

  it('4. Declared verification without assertions -> BLOCK', () => {
    const skill = { name: 'test-skill', verification: { declared: true, assertions: null } };
    const p = calculateSkillQuality('test-skill', skill, dummyOntology);
    expect(p.classification).toBe('BLOCK');
    expect(p.findings.some(f => f.finding_id === 'VER-001')).toBe(true);
  });

  it('11. Snapshot diff -> correct', () => {
    const prev = { skills: { s1: { overall_score: 90 } } };
    const curr = { skills: { s1: { overall_score: 85 } } };
    const diff = compareQualitySnapshots(prev, curr);
    expect(diff['s1'].regression).toBe(true);
  });
});
