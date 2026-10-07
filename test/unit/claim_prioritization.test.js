'use strict';

const engine = require('../../.agent/scripts/skill_coverage_expansion_engine');

describe('Phase 24 — Claim Prioritization Unit Tests', () => {
  test('prioritizeClaims deterministically sorts claims by priority rank P0 to P7', () => {
    const claims = [
      { id: 'CLM-01-DOC', type: 'BEHAVIORAL_SPEC', skill_id: 'sample-skill' },
      { id: 'CLM-02-INP', type: 'INPUT_VALIDATION', skill_id: 'sample-skill' },
      { id: 'CLM-03-OUT', type: 'OUTPUT_CONFORMANCE', skill_id: 'sample-skill' },
      { id: 'CLM-04-SEC', type: 'SAFETY_INVARIANT', skill_id: 'sample-security-auditor' },
      { id: 'CLM-05-INV', type: 'SAFETY_INVARIANT', skill_id: 'sample-skill' },
    ];

    const sorted = engine.prioritizeClaims(claims);

    expect(sorted[0].id).toBe('CLM-04-SEC'); // P0: Critical safety/security
    expect(sorted[1].id).toBe('CLM-05-INV'); // P1: Contract invariants
    expect(sorted[2].id).toBe('CLM-03-OUT'); // P2: Required outputs
    expect(sorted[3].id).toBe('CLM-02-INP'); // P3: Input validation
    expect(sorted[4].id).toBe('CLM-01-DOC'); // P7: Secondary documented behavior
  });

  test('prioritizeClaims uses claim ID as deterministic tie-breaker for identical priorities', () => {
    const claims = [
      { id: 'CLM-Z-INP', type: 'INPUT_VALIDATION', skill_id: 'sample-skill' },
      { id: 'CLM-A-INP', type: 'INPUT_VALIDATION', skill_id: 'sample-skill' },
      { id: 'CLM-M-INP', type: 'INPUT_VALIDATION', skill_id: 'sample-skill' },
    ];

    const sorted = engine.prioritizeClaims(claims);
    expect(sorted.map(c => c.id)).toEqual(['CLM-A-INP', 'CLM-M-INP', 'CLM-Z-INP']);
  });
});
