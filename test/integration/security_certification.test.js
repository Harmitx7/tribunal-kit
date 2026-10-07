'use strict';

const fs = require('fs');
const crypto = require('crypto');
const {
  promoteEvidence,
  REPEATABILITY,
} = require('../../.agent/scripts/skill_certification_engine');

describe('Security Skill Certification Integration Tests', () => {
  const securitySkill = 'api-security-auditor';
  const skillFile = './.agent/skills/api-security-auditor/SKILL.md';
  const sourceHash = crypto.createHash('sha256').update(fs.readFileSync(skillFile, 'utf8')).digest('hex');

  const baseSecuritySpec = {
    id: 'TEST-sec-gate-1',
    skill_id: securitySkill,
    claim: { id: 'CLM-sec-1', statement: 'API auth enforcement' },
    review: { status: 'APPROVED' },
    independence: { verified: true, expectation_source: 'contract.invariants', implementation_source: 'skill.runtime_execution' },
    evidence_sources: [{ source_hash: sourceHash }],
  };

  it('1. Rejects promotion for security skills if reviewer was automated bot', () => {
    const autoReviewPkg = {
      review_decision: 'APPROVED',
      reviewer: 'auto-bot-auditor',
      review_date: new Date().toISOString(),
    };

    const valid5RunResult = {
      status: 'PASS',
      repeatability: { classification: REPEATABILITY.DETERMINISTIC, runs: 5, passed_runs: 5 },
      assertions: { failed: [] },
    };

    const promo = promoteEvidence(baseSecuritySpec, autoReviewPkg, valid5RunResult);
    expect(promo.promoted).toBe(false);
    expect(promo.reason).toContain('SECURITY_GATE_FAILED');
  });

  it('2. Rejects promotion for security skills if repetition count is less than 5', () => {
    const humanReviewPkg = {
      review_decision: 'APPROVED',
      reviewer: 'Human Security Officer',
      review_date: new Date().toISOString(),
    };

    const only3RunResult = {
      status: 'PASS',
      repeatability: { classification: REPEATABILITY.DETERMINISTIC, runs: 3, passed_runs: 3 }, // < 5!
      assertions: { failed: [] },
    };

    const promo = promoteEvidence(baseSecuritySpec, humanReviewPkg, only3RunResult);
    expect(promo.promoted).toBe(false);
    expect(promo.reason).toContain('INSUFFICIENT_REPETITIONS');
  });

  it('3. Successfully promotes security evidence with human approval and 5 deterministic runs', () => {
    const humanReviewPkg = {
      review_decision: 'APPROVED',
      reviewer: 'Chief Security Officer (Human)',
      review_date: new Date().toISOString(),
    };

    const valid5RunResult = {
      status: 'PASS',
      repeatability: { classification: REPEATABILITY.DETERMINISTIC, runs: 5, passed_runs: 5 },
      assertions: { failed: [] },
      evidence: { hash: 'HASH-SEC-5RUN' },
    };

    const promo = promoteEvidence(baseSecuritySpec, humanReviewPkg, valid5RunResult);
    expect(promo.promoted).toBe(true);
    expect(promo.evidence.trust_level).toBe('E5');
    expect(promo.evidence.repeatability.runs).toBe(5);
  });
});
