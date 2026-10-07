'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  promoteEvidence,
  evaluateClaimStates,
  CLAIM_STATUS,
  REPEATABILITY,
} = require('../../.agent/scripts/skill_certification_engine');

describe('Failure Preservation Integration Tests', () => {
  it('1. Preserves failed execution in claim state history and refuses promotion', () => {
    const skillPath = './.agent/skills/api-patterns/SKILL.md';
    const realHash = crypto.createHash('sha256').update(fs.readFileSync(skillPath, 'utf8')).digest('hex');

    const failedResult = {
      test_id: 'TEST-preserve-fail',
      skill_id: 'api-patterns',
      claim_id: 'CLM-fail-1',
      status: 'FAIL',
      failure_reason: 'Exit code 1 returned; expected 0',
      execution_hash: 'HASH-FAILED-RUN',
      timestamp: new Date().toISOString(),
      repeatability: { classification: REPEATABILITY.FAILED, runs: 3, passed_runs: 0 },
      assertions: { failed: ['exit_status_mismatch: expected 0, got 1'] },
    };

    const testSpec = {
      id: failedResult.test_id,
      skill_id: 'api-patterns',
      claim: { id: failedResult.claim_id, statement: 'Must succeed' },
      review: { status: 'APPROVED' },
      independence: { verified: true, expectation_source: 'contract.outputs', implementation_source: 'skill.runtime_execution' },
      evidence_sources: [{ source_hash: realHash }],
    };

    const reviewPkg = {
      review_decision: 'APPROVED',
      reviewer: 'QA Officer',
    };

    const promo = promoteEvidence(testSpec, reviewPkg, failedResult);
    expect(promo.promoted).toBe(false);
    expect(promo.reason).toContain('EXECUTION_FAILED');

    // Claim state evaluation preserves failed status
    const claims = [{ id: failedResult.claim_id, statement: 'Must succeed', testability: 'DIRECT' }];
    const testInventory = [{ test_id: testSpec.id, skill_id: testSpec.skill_id, claim_id: failedResult.claim_id }];
    const claimStates = evaluateClaimStates(claims, testInventory, { [testSpec.id]: reviewPkg }, { [testSpec.id]: failedResult });

    expect(claimStates[failedResult.claim_id].status).toBe(CLAIM_STATUS.EXECUTION_FAILED);
    expect(claimStates[failedResult.claim_id].certifying).toBe(false);
    expect(claimStates[failedResult.claim_id].failure_reasons.length).toBeGreaterThan(0);
  });
});
