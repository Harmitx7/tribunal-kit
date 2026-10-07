const { createFixture } = require('../../.agent/scripts/skill_fixture_engine');

describe('Skill Fixture Engine', () => {
  it('1. Fixture isolation and cleanup', () => {
    const fix = createFixture('test');
    expect(fix.fixture_id).toBeDefined();
    fix.cleanup(); // verify it doesn't crash
  });
});
