const { runBehavioralTest } = require('../../.agent/scripts/skill_behavior_harness');

describe('Skill Behavior Harness', () => {
  it('1. Sandbox isolation works (mocks true for valid scenarios)', () => {
    const res = runBehavioralTest(
      { name: 'test' },
      { class: 'EXECUTABLE', verification_mode: 'sandbox' },
      [{ id: 'verification-assertions', status: 'PROVABLE', expected: { invariants: ['a'] } }],
    );
    expect(res.status).toBe('VERIFIED');
    expect(res.evidence.length).toBe(1);
  });
});
