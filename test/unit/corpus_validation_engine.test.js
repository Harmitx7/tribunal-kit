'use strict';

const valEngine = require('../../.agent/scripts/corpus_validation_engine');

describe('Phase 26 — Corpus Validation Engine Unit Tests', () => {
  test('validateWave approves clean wave data with valid lineage and fresh sources', () => {
    const cleanWaveData = {
      lineageRecords: [
        {
          evidence: {
            evidence_id: 'EVD-01',
            test_id: 'T-01',
            claim_id: 'C-01',
            skill_id: 'test-skill',
            reviewer: 'Tribunal Senior QA Reviewer',
            execution_hash: 'HASH-01',
            trust_level: 'E2',
          },
          testSpec: {
            id: 'T-01',
            claim: { id: 'C-01' },
            skill_id: 'test-skill',
          },
          reviewPkg: {
            reviewer: 'Tribunal Senior QA Reviewer',
          },
          execResult: {
            evidence: { hash: 'HASH-01' },
          },
        },
      ],
      promotedEvidence: [],
      currentSnapshot: { skills: {} },
    };

    const previousSnapshot = { skills: {} };
    const result = valEngine.validateWave(cleanWaveData, previousSnapshot);

    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  test('validateWave rejects wave containing broken lineage record', () => {
    const brokenWaveData = {
      lineageRecords: [
        {
          evidence: {
            evidence_id: 'EVD-02',
            test_id: 'T-02',
            claim_id: 'C-02',
            skill_id: 'test-skill',
            reviewer: 'Officer A',
            execution_hash: 'HASH-02',
            trust_level: 'E2',
          },
          testSpec: {
            id: 'T-MISMATCH',
            claim: { id: 'C-02' },
            skill_id: 'test-skill',
          },
          reviewPkg: { reviewer: 'Officer A' },
          execResult: { evidence: { hash: 'HASH-02' } },
        },
      ],
    };

    const result = valEngine.validateWave(brokenWaveData);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('LINEAGE_ERROR'))).toBe(true);
  });
});
