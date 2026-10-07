'use strict';

const fs = require('fs');
const crypto = require('crypto');
const {
  evaluateClaimStates,
  evaluateSkillCertification,
  CLAIM_STATUS,
  CERTIFICATION_LEVELS,
} = require('../../.agent/scripts/skill_certification_engine');

describe('Claim-Level Certification Unit Tests', () => {
  const skillName = 'api-patterns';
  const skillFile = './.agent/skills/api-patterns/SKILL.md';
  const realHash = crypto.createHash('sha256').update(fs.readFileSync(skillFile, 'utf8')).digest('hex');

  it('1. Assigns discrete claim statuses based on test review and execution state', () => {
    const claims = [
      { id: 'CLM-1', statement: 'Output string', testability: 'DIRECT' },
      { id: 'CLM-2', statement: 'Input boolean', testability: 'DIRECT' },
      { id: 'CLM-3', statement: 'Subjective aesthetic', testability: 'UNTESTABLE' },
    ];

    const testInventory = [
      {
        test_id: 'TEST-1',
        skill_id: skillName,
        claim_id: 'CLM-1',
        test_type: 'POSITIVE',
      },
      {
        test_id: 'TEST-2',
        skill_id: skillName,
        claim_id: 'CLM-2',
        test_type: 'NEGATIVE',
      },
    ];

    const reviewPackages = {
      'TEST-1': {
        review_decision: 'APPROVED',
        reviewer: 'Human QA',
        review_date: new Date().toISOString(),
        source_evidence: [{ source_hash: realHash }],
        independence_analysis: { verified: true, expectation_source: 'contract.outputs', implementation_source: 'skill.runtime_execution' },
      },
      'TEST-2': {
        review_decision: 'REJECTED',
        reviewer: 'Human QA',
        review_reason: 'Inadequate negative boundary',
      },
    };

    const executionResults = {
      'TEST-1': {
        status: 'PASS',
        repeatability: { classification: 'DETERMINISTIC', runs: 3, passed_runs: 3 },
        assertions: { failed: [] },
        evidence: { hash: 'HASH-123' },
      },
      'TEST-2': null,
    };

    const claimStates = evaluateClaimStates(claims, testInventory, reviewPackages, executionResults);

    expect(claimStates['CLM-1'].status).toBe(CLAIM_STATUS.VERIFIED);
    expect(claimStates['CLM-1'].certifying).toBe(true);
    expect(claimStates['CLM-2'].status).toBe(CLAIM_STATUS.TEST_REJECTED);
    expect(claimStates['CLM-2'].certifying).toBe(false);
    expect(claimStates['CLM-3'].status).toBe(CLAIM_STATUS.UNTESTED);
    expect(claimStates['CLM-3'].certifying).toBe(false);
  });

  it('2. Evaluates skill certification level strictly from verified claim coverage', () => {
    const claims = [
      { id: 'CLM-1', testability: 'DIRECT' },
      { id: 'CLM-2', testability: 'DIRECT' },
      { id: 'CLM-3', testability: 'DIRECT' },
      { id: 'CLM-4', testability: 'DIRECT' },
    ];

    // Only 2 of 4 verified = 50% coverage -> PARTIAL
    const claimStates = {
      'CLM-1': { status: CLAIM_STATUS.VERIFIED },
      'CLM-2': { status: CLAIM_STATUS.VERIFIED },
      'CLM-3': { status: CLAIM_STATUS.EXECUTION_FAILED },
      'CLM-4': { status: CLAIM_STATUS.TEST_PENDING },
    };

    const cert = evaluateSkillCertification('sample-skill', claims, claimStates);
    expect(cert.coverage).toBe(50);
    expect(cert.status).toBe(CERTIFICATION_LEVELS.PARTIAL);
    expect(cert.behavioral_certified).toBe(false);
  });

  it('3. Excludes reference-only skills from behavioral certification', () => {
    const claims = [{ id: 'CLM-ref', testability: 'UNTESTABLE' }];
    const claimStates = {
      'CLM-ref': { status: CLAIM_STATUS.UNTESTED },
    };

    const cert = evaluateSkillCertification('12-principles-of-animation', claims, claimStates);
    expect(cert.status).toBe(CERTIFICATION_LEVELS.UNPROVABLE);
    expect(cert.behavioral_certified).toBe(false);
    expect(cert.reason).toContain('Reference-only skill is excluded');
  });
});
