'use strict';

const valEngine = require('../../.agent/scripts/corpus_validation_engine');

describe('Phase 26 — Duplicate Claim Detection Unit Tests', () => {
  const existingClaims = [
    {
      id: 'CLM-01',
      skill_id: 'test-skill',
      statement: 'Parameter foo must be string',
      source: 'contract.inputs',
      field: 'foo',
      type: 'INPUT_VALIDATION',
    },
    {
      id: 'CLM-02',
      skill_id: 'test-skill',
      statement: 'Safety containment invariant',
      source: 'contract.invariants',
      type: 'SAFETY_INVARIANT',
    },
  ];

  test('detectDuplicateClaims detects exact duplicate claim ID', () => {
    const candidate = { id: 'CLM-01', skill_id: 'test-skill', statement: 'Different text' };
    const res = valEngine.detectDuplicateClaims(existingClaims, candidate);
    expect(res.duplicate).toBe(true);
    expect(res.code).toBe('DUPLICATE_CLAIM_ID');
  });

  test('detectDuplicateClaims detects equivalent claim statement', () => {
    const candidate = { id: 'CLM-NEW-99', skill_id: 'test-skill', statement: 'Parameter foo must be string' };
    const res = valEngine.detectDuplicateClaims(existingClaims, candidate);
    expect(res.duplicate).toBe(true);
    expect(res.code).toBe('DUPLICATE_CLAIM_STATEMENT');
  });

  test('detectDuplicateClaims detects identical source & field expectation', () => {
    const candidate = {
      id: 'CLM-NEW-100',
      skill_id: 'test-skill',
      source: 'contract.inputs',
      field: 'foo',
      type: 'INPUT_VALIDATION',
      statement: 'Foo field must validate as string type',
    };
    const res = valEngine.detectDuplicateClaims(existingClaims, candidate);
    expect(res.duplicate).toBe(true);
    expect(res.code).toBe('DUPLICATE_SOURCE_EXPECTATION');
  });

  test('detectDuplicateClaims allows novel non-duplicate claims', () => {
    const candidate = {
      id: 'CLM-03',
      skill_id: 'test-skill',
      statement: 'Parameter bar must be number',
      source: 'contract.inputs',
      field: 'bar',
      type: 'INPUT_VALIDATION',
    };
    const res = valEngine.detectDuplicateClaims(existingClaims, candidate);
    expect(res.duplicate).toBe(false);
  });
});
