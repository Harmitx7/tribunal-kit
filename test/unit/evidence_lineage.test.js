'use strict';

const valEngine = require('../../.agent/scripts/corpus_validation_engine');

describe('Phase 26 — Evidence Lineage Validation Unit Tests', () => {
  const baseRecord = {
    evidence: {
      evidence_id: 'EVD-101',
      test_id: 'TEST-101',
      claim_id: 'CLM-101',
      skill_id: 'target-skill',
      reviewer: 'Tribunal Senior QA Reviewer',
      execution_hash: 'HASH-EXEC-101',
      trust_level: 'E2',
    },
    testSpec: {
      id: 'TEST-101',
      claim: { id: 'CLM-101' },
      skill_id: 'target-skill',
    },
    reviewPkg: {
      reviewer: 'Tribunal Senior QA Reviewer',
    },
    execResult: {
      evidence: { hash: 'HASH-EXEC-101' },
    },
  };

  test('validateEvidenceLineage passes when all lineage identifiers resolve', () => {
    const res = valEngine.validateEvidenceLineage(
      baseRecord.evidence,
      baseRecord.testSpec,
      baseRecord.reviewPkg,
      baseRecord.execResult
    );
    expect(res.valid).toBe(true);
  });

  test('validateEvidenceLineage fails when claim_id does not match test specification', () => {
    const corruptedEvidence = { ...baseRecord.evidence, claim_id: 'CLM-MISMATCH' };
    const res = valEngine.validateEvidenceLineage(
      corruptedEvidence,
      baseRecord.testSpec,
      baseRecord.reviewPkg,
      baseRecord.execResult
    );
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('claim_id mismatch');
  });

  test('validateEvidenceLineage fails when reviewer does not match approved review package', () => {
    const corruptedEvidence = { ...baseRecord.evidence, reviewer: 'Different Reviewer' };
    const res = valEngine.validateEvidenceLineage(
      corruptedEvidence,
      baseRecord.testSpec,
      baseRecord.reviewPkg,
      baseRecord.execResult
    );
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('reviewer mismatch');
  });

  test('validateEvidenceLineage fails when execution hash differs from empirical run hash', () => {
    const corruptedEvidence = { ...baseRecord.evidence, execution_hash: 'TAMPERED-HASH' };
    const res = valEngine.validateEvidenceLineage(
      corruptedEvidence,
      baseRecord.testSpec,
      baseRecord.reviewPkg,
      baseRecord.execResult
    );
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('execution_hash mismatch');
  });
});
