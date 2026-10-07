'use strict';

const finalValEngine = require('../../.agent/scripts/final_corpus_validation_engine');

describe('Phase 27 — Final Corpus Validation Engine Unit Tests', () => {
  test('validateSkillUniqueness detects duplicate skill definitions', () => {
    const uniqueSkills = ['skill-1', 'skill-2', 'skill-3'];
    expect(finalValEngine.validateSkillUniqueness(uniqueSkills).valid).toBe(true);

    const dupSkills = ['skill-1', 'skill-2', 'skill-1'];
    const res = finalValEngine.validateSkillUniqueness(dupSkills);
    expect(res.valid).toBe(false);
    expect(res.duplicates).toContain('skill-1');
  });

  test('validateReviewerAuthority rejects automated reviewer for security skills', () => {
    const securityEv = [
      { evidence_id: 'E1', skill_id: 'agentshield-security', reviewer: 'auto-bot-auditor', trust_level: 'E5' },
    ];
    const res = finalValEngine.validateReviewerAuthority(securityEv);
    expect(res.valid).toBe(false);
    expect(res.invalid_reviews[0].error).toBe('AUTOMATED_SECURITY_REVIEW');
  });

  test('validateReviewerAuthority accepts human officer with E5 trust level', () => {
    const validSecurityEv = [
      { evidence_id: 'E1', skill_id: 'agentshield-security', reviewer: 'Tribunal Certified Security Officer (STD-100)', trust_level: 'E5' },
      { evidence_id: 'E2', skill_id: 'standard-skill', reviewer: 'Tribunal Senior QA Reviewer', trust_level: 'E2' },
    ];
    const res = finalValEngine.validateReviewerAuthority(validSecurityEv);
    expect(res.valid).toBe(true);
    expect(res.invalid_count).toBe(0);
  });
});
