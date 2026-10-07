'use strict';

const fs = require('fs');
const path = require('path');
const {
  promoteEvidence,
  checkSourceFreshness,
  readLedgerEvents,
  REPEATABILITY,
} = require('../../.agent/scripts/skill_certification_engine');

describe('Source Freshness Integration Tests', () => {
  it('1. Blocks evidence promotion when source hash has drifted', () => {
    const testSpec = {
      id: 'TEST-stale-drift',
      skill_id: 'lint-and-validate',
      claim: { id: 'CLM-1', statement: 'Check lint' },
      review: { status: 'APPROVED' },
      independence: { verified: true, expectation_source: 'contract.outputs', implementation_source: 'skill.runtime_execution' },
      evidence_sources: [
        { source_hash: 'DRIFTED_HASH_1234567890abcdef1234567890abcdef' },
      ],
    };

    const reviewPkg = {
      review_decision: 'APPROVED',
      reviewer: 'QA Officer',
      review_date: new Date().toISOString(),
    };

    const executionResult = {
      status: 'PASS',
      repeatability: { classification: REPEATABILITY.DETERMINISTIC, runs: 3, passed_runs: 3 },
      assertions: { failed: [] },
    };

    const promo = promoteEvidence(testSpec, reviewPkg, executionResult);
    expect(promo.promoted).toBe(false);
    expect(promo.code).toBe('PROMOTION_REJECTED');
    expect(promo.reason).toContain('SOURCE_STALE');

    // Confirm event recorded in ledger
    const events = readLedgerEvents('lint-and-validate');
    const staleEvt = events.find(e => e.event === 'SOURCE_STALE' && e.test_id === 'TEST-stale-drift');
    expect(staleEvt).toBeDefined();
  });

  it('2. Permits promotion when source hash matches disk exactly', () => {
    const crypto = require('crypto');
    const skillContent = fs.readFileSync('./.agent/skills/lint-and-validate/SKILL.md', 'utf8');
    const realHash = crypto.createHash('sha256').update(skillContent).digest('hex');

    const testSpec = {
      id: 'TEST-fresh-match',
      skill_id: 'lint-and-validate',
      claim: { id: 'CLM-fresh', statement: 'Check lint' },
      review: { status: 'APPROVED' },
      independence: { verified: true, expectation_source: 'contract.outputs', implementation_source: 'skill.runtime_execution' },
      evidence_sources: [{ source_hash: realHash }],
    };

    const reviewPkg = {
      review_decision: 'APPROVED',
      reviewer: 'QA Officer',
      review_date: new Date().toISOString(),
    };

    const executionResult = {
      status: 'PASS',
      repeatability: { classification: REPEATABILITY.DETERMINISTIC, runs: 3, passed_runs: 3 },
      assertions: { failed: [] },
      evidence: { hash: 'HASH-123' },
    };

    const promo = promoteEvidence(testSpec, reviewPkg, executionResult);
    expect(promo.promoted).toBe(true);
    expect(promo.evidence.source_freshness.verified).toBe(true);
  });
});
