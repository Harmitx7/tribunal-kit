'use strict';

const {
  acquireEvidenceForSkill,
  selectPilot,
} = require('../../.agent/scripts/skill_evidence_acquisition_engine');

describe('Skill Certification Pipeline Integration', () => {
  it('1. Reference-only skill is excluded from behavioral certification', () => {
    const result = acquireEvidenceForSkill('apple-design');
    expect(result.state).toBe('UNPROVABLE');
    if (result.certification) {
      expect(result.certification.behavioral.status).toBe('UNPROVABLE');
      expect(result.certification.structural.status).toBe('CERTIFIED');
    }
  });

  it('2. Pilot selection returns documented reasons for each skill', () => {
    const { pilot, reasons } = selectPilot();
    for (const name of pilot) {
      expect(typeof reasons[name]).toBe('string');
      expect(reasons[name].length).toBeGreaterThan(0);
    }
  });

  it('3. Every pilot skill receives an explicit final state', () => {
    const { pilot } = selectPilot();
    for (const name of pilot) {
      const result = acquireEvidenceForSkill(name);
      expect(result.state).toBeDefined();
      expect(['UNPROVABLE', 'EVIDENCE_FOUND', 'SCENARIO_READY', 'AWAITING_VALIDATION',
        'READY_FOR_EXECUTION', 'EXECUTING', 'OBSERVED', 'REPEATABILITY_PENDING',
        'CERTIFIED', 'FAILED', 'QUARANTINED', 'STALE', 'NOT_FOUND']).toContain(result.state);
    }
  });
});
