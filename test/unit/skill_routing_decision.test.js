const path = require('path');
const { discoverSkills, clearSkillsCache } = require('../../.agent/scripts/skill_intelligence');

describe('Skill Routing Decision', () => {
  const agentDir = path.resolve(__dirname, '../../');

  beforeEach(() => {
    clearSkillsCache();
  });

  it('should emit a valid routingDecision trace', () => {
    const res = discoverSkills('Build a resilient payment API', agentDir);
    expect(res.routingDecision).toBeDefined();
    expect(res.routingDecision.candidates.length).toBeGreaterThan(0);
    expect(res.routingDecision.selected.length).toBeGreaterThan(0);
    expect(res.routingDecision.policy.conflictResolution).toBe('explicit-wins');
  });

  it('should handle explicitIncludes overriding scores', () => {
    const res = discoverSkills('Build something', agentDir, { explicitIncludes: ['api-patterns'] });
    const apiPatterns = res.routingDecision.candidates.find(c => c.skillId === 'api-patterns');

    expect(apiPatterns).toBeDefined();
    expect(apiPatterns.score).toBeGreaterThanOrEqual(100);
    expect(apiPatterns.matched).toBe(true);
    expect(res.mandatory.map(s => s.skill)).toContain('api-patterns');
  });

  it('should handle explicitExcludes preventing selection', () => {
    // Usually 'api-patterns' triggers on 'payment API' due to risk/failure domains or name
    const res = discoverSkills('Build payment API', agentDir, {
      explicitExcludes: ['api-patterns'],
    });
    const apiPatterns = res.routingDecision.candidates.find(c => c.skillId === 'api-patterns');

    expect(apiPatterns).toBeDefined();
    expect(apiPatterns.rejected).toBe(true);
    expect(apiPatterns.matched).toBe(false);
    expect(apiPatterns.rejectionReason).toBe('Explicitly excluded by user');
    expect(res.pipeline).not.toContain('api-patterns');
  });
});
