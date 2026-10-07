'use strict';

const {
  transition,
  createEvidenceRecord,
  isCircularEvidence,
  isStaleEvidence,
  VALID_TRANSITIONS,
} = require('../../.agent/scripts/skill_evidence_acquisition_engine');

describe('Skill Certification Safety', () => {
  it('1. Fabricated expectations are rejected (circular evidence)', () => {
    const ev = createEvidenceRecord('IMPLEMENTATION', null, 'test', 'h1', 'h2', 'E3');
    expect(isCircularEvidence(ev)).toBe(true);
    expect(ev.independent).toBe(false);
  });

  it('2. Stale evidence is rejected when source file gone', () => {
    const ev = createEvidenceRecord('TEST', '/definitely/nonexistent.js', 'test', 'h1', 'h2', 'E2');
    expect(isStaleEvidence(ev)).toBe(true);
  });

  it('3. UNPROVABLE → CERTIFIED transition is impossible', () => {
    const result = transition('UNPROVABLE', 'CERTIFIED');
    expect(result.success).toBe(false);
  });

  it('4. EVIDENCE_FOUND → CERTIFIED transition is impossible', () => {
    const result = transition('EVIDENCE_FOUND', 'CERTIFIED');
    expect(result.success).toBe(false);
  });

  it('5. SCENARIO_READY → CERTIFIED transition is impossible', () => {
    const result = transition('SCENARIO_READY', 'CERTIFIED');
    expect(result.success).toBe(false);
  });

  it('6. Only REPEATABILITY_PENDING → CERTIFIED is the valid final path', () => {
    const result = transition('REPEATABILITY_PENDING', 'CERTIFIED');
    expect(result.success).toBe(true);
  });

  it('7. Human approval cannot be forged — IMPLEMENTATION is not independent', () => {
    const ev = createEvidenceRecord('IMPLEMENTATION', null, 'test', 'h1', 'h2', 'E3');
    expect(ev.independent).toBe(false);
  });

  it('8. TEST evidence is marked independent', () => {
    const ev = createEvidenceRecord('TEST', null, 'test', 'h1', 'h2', 'E2');
    expect(ev.independent).toBe(true);
  });

  it('9. HUMAN evidence is marked independent', () => {
    const ev = createEvidenceRecord('HUMAN', null, 'test', 'h1', 'h2', 'E4');
    expect(ev.independent).toBe(true);
  });

  it('10. QUARANTINED state has zero valid outgoing transitions', () => {
    expect(VALID_TRANSITIONS.QUARANTINED.length).toBe(0);
  });
});
