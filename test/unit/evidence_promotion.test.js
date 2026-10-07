'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  promoteEvidence,
  REPEATABILITY,
} = require('../../.agent/scripts/skill_certification_engine');

describe('Evidence Promotion Engine Unit Tests', () => {
  const validTestSpec = {
    id: 'TEST-promo-1',
    skill_id: 'api-patterns',
    claim: { id: 'CLM-promo-1', statement: 'Output format verified' },
    test_type: 'POSITIVE',
    review: { status: 'APPROVED' },
    independence: { verified: true, expectation_source: 'contract.outputs', implementation_source: 'skill.runtime_execution' },
    evidence_sources: [
      {
        source_hash: crypto.createHash('sha256').update(fs.readFileSync('./.agent/skills/api-patterns/SKILL.md', 'utf8')).digest('hex'),
      },
    ],
  };

  const validReviewPkg = {
    review_decision: 'APPROVED',
    reviewer: 'Tribunal Human Officer',
    review_date: new Date().toISOString(),
  };

  const validExecutionResult = {
    status: 'PASS',
    repeatability: { classification: REPEATABILITY.DETERMINISTIC, runs: 3, passed_runs: 3 },
    assertions: { failed: [] },
    evidence: { hash: 'HASH-EXEC-123' },
  };

  it('1. Successfully promotes valid, independent, approved, deterministic evidence', () => {
    const promo = promoteEvidence(validTestSpec, validReviewPkg, validExecutionResult);
    expect(promo.promoted).toBe(true);
    expect(promo.evidence.evidence_id).toMatch(/^EVD-/);
    expect(promo.evidence.trust_level).toBe('E2');
    expect(promo.evidence.independent).toBe(true);
    expect(promo.evidence.certifying).toBe(true);
  });

  it('2. Rejects promotion when test is unapproved', () => {
    const unapprovedSpec = {
      ...validTestSpec,
      review: { status: 'DRAFT' },
    };

    const promo = promoteEvidence(unapprovedSpec, { review_decision: 'PENDING' }, validExecutionResult);
    expect(promo.promoted).toBe(false);
    expect(promo.code).toBe('PROMOTION_REJECTED');
    expect(promo.reason).toContain('UNAPPROVED_TEST');
  });

  it('3. Rejects promotion when expectation is circular or unverified', () => {
    const circularSpec = {
      ...validTestSpec,
      independence: {
        verified: false,
        expectation_source: 'skill.runtime_execution_observed_output',
        implementation_source: 'skill.runtime_execution',
      },
    };

    const promo = promoteEvidence(circularSpec, validReviewPkg, validExecutionResult);
    expect(promo.promoted).toBe(false);
    expect(promo.code).toBe('PROMOTION_REJECTED');
    expect(promo.reason).toContain('CIRCULAR');
  });

  it('4. Rejects promotion when execution failed or failed assertions exist', () => {
    const failedResult = {
      ...validExecutionResult,
      status: 'FAIL',
      assertions: { failed: ['exit_status_mismatch'] },
    };

    const promo = promoteEvidence(validTestSpec, validReviewPkg, failedResult);
    expect(promo.promoted).toBe(false);
    expect(promo.code).toBe('PROMOTION_REJECTED');
    expect(promo.reason).toContain('EXECUTION_FAILED');
  });

  it('5. Rejects promotion when execution is non-deterministic or unstable', () => {
    const nondetResult = {
      ...validExecutionResult,
      repeatability: { classification: REPEATABILITY.NONDETERMINISTIC, runs: 3, passed_runs: 2 },
    };

    const promo = promoteEvidence(validTestSpec, validReviewPkg, nondetResult);
    expect(promo.promoted).toBe(false);
    expect(promo.code).toBe('PROMOTION_REJECTED');
    expect(promo.reason).toContain('REPEATABILITY_FAILED');
  });
});
