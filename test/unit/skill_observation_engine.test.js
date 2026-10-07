const {
  observeExecution,
  hashObservation,
} = require('../../.agent/scripts/skill_observation_engine');

describe('Skill Observation Engine', () => {
  it('1. Observation hashing works', () => {
    const obs = observeExecution('test', {}, { foo: 'bar' });
    expect(obs.sha256).toBeDefined();
    expect(obs.outputs.foo).toBe('bar');
  });
});
