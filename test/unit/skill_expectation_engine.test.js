const {
  resolveExpectations,
  compareObservation,
} = require('../../.agent/scripts/skill_expectation_engine');

describe('Skill Expectation Engine', () => {
  it('1. Returns UNPROVABLE when no evidence', () => {
    const exp = resolveExpectations({});
    const res = compareObservation(exp, { exit_code: 0 });
    expect(res).toBe('UNPROVABLE');
  });

  it('2. Compares successfully', () => {
    const exp = resolveExpectations({ verification: { assertions: ['test'] } });
    const res = compareObservation(exp, { exit_code: 0 });
    expect(res).toBe('PASS');
  });
});
