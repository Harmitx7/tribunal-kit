'use strict';

const {
  TRUST_LEVELS,
  CERT_STATES,
  VALID_TRANSITIONS,
  transition,
  createEvidenceRecord,
  isCircularEvidence,
  isStaleEvidence,
  deduplicateEvidence,
  discoverEvidenceForSkill,
  generateCertificationScenarios,
  classifyRepeatability,
  acquireEvidenceForSkill,
  selectPilot,
  MIN_REPETITIONS,
} = require('../../.agent/scripts/skill_evidence_acquisition_engine');

describe('Skill Evidence Acquisition Engine', () => {
  // ─── Trust Hierarchy ────────────────────────────────────────────────────
  describe('Trust Hierarchy', () => {
    it('1. E0 is not certifiable', () => {
      expect(TRUST_LEVELS.E0.certifiable).toBe(false);
    });

    it('2. E1 structural evidence is not certifiable alone', () => {
      expect(TRUST_LEVELS.E1.certifiable).toBe(false);
    });

    it('3. E2 test evidence is certifiable', () => {
      expect(TRUST_LEVELS.E2.certifiable).toBe(true);
    });

    it('4. E3 implementation evidence is NOT certifiable (circular risk)', () => {
      expect(TRUST_LEVELS.E3.certifiable).toBe(false);
    });

    it('5. E4 human-approved evidence is certifiable', () => {
      expect(TRUST_LEVELS.E4.certifiable).toBe(true);
    });

    it('6. E5 repeated empirical is certifiable', () => {
      expect(TRUST_LEVELS.E5.certifiable).toBe(true);
    });
  });

  // ─── State Machine ──────────────────────────────────────────────────────
  describe('Certification State Machine', () => {
    it('7. Legal transition UNPROVABLE → EVIDENCE_FOUND succeeds', () => {
      const result = transition('UNPROVABLE', 'EVIDENCE_FOUND');
      expect(result.success).toBe(true);
      expect(result.state).toBe('EVIDENCE_FOUND');
    });

    it('8. Illegal transition UNPROVABLE → CERTIFIED is blocked', () => {
      const result = transition('UNPROVABLE', 'CERTIFIED');
      expect(result.success).toBe(false);
    });

    it('9. Illegal transition EVIDENCE_FOUND → CERTIFIED is blocked', () => {
      const result = transition('EVIDENCE_FOUND', 'CERTIFIED');
      expect(result.success).toBe(false);
    });

    it('10. QUARANTINED is a terminal state', () => {
      const allowed = VALID_TRANSITIONS.QUARANTINED;
      expect(allowed.length).toBe(0);
    });

    it('11. CERTIFIED can become STALE', () => {
      const result = transition('CERTIFIED', 'STALE');
      expect(result.success).toBe(true);
    });
  });

  // ─── Evidence Provenance ────────────────────────────────────────────────
  describe('Evidence Provenance', () => {
    it('12. Circular evidence is detected for IMPLEMENTATION type', () => {
      const ev = createEvidenceRecord('IMPLEMENTATION', null, 'test-skill', 'h1', 'h2', 'E3');
      expect(isCircularEvidence(ev)).toBe(true);
    });

    it('13. TEST-sourced evidence is not circular', () => {
      const ev = createEvidenceRecord('TEST', null, 'test-skill', 'h1', 'h2', 'E2');
      expect(isCircularEvidence(ev)).toBe(false);
    });

    it('14. Stale evidence is detected when source file is missing', () => {
      const ev = createEvidenceRecord('TEST', '/nonexistent/file.js', 'test-skill', 'h1', 'h2', 'E2');
      expect(isStaleEvidence(ev)).toBe(true);
    });
  });

  // ─── Evidence Deduplication ─────────────────────────────────────────────
  describe('Evidence Deduplication', () => {
    it('15. Duplicate evidence is not double-counted', () => {
      const items = [
        { skill_id: 'a', scenario_hash: 'h1', expectation_hash: 'h2' },
        { skill_id: 'a', scenario_hash: 'h1', expectation_hash: 'h2' },
        { skill_id: 'a', scenario_hash: 'h3', expectation_hash: 'h4' },
      ];
      const unique = deduplicateEvidence(items);
      expect(unique.length).toBe(2);
    });
  });

  // ─── Repeatability ─────────────────────────────────────────────────────
  describe('Repeatability Classification', () => {
    it('16. All same hash = DETERMINISTIC', () => {
      const results = [
        { status: 'PASS', stdout_hash: 'abc' },
        { status: 'PASS', stdout_hash: 'abc' },
        { status: 'PASS', stdout_hash: 'abc' },
      ];
      expect(classifyRepeatability(results)).toBe('DETERMINISTIC');
    });

    it('17. Mixed hashes = NONDETERMINISTIC', () => {
      const results = [
        { status: 'PASS', stdout_hash: 'abc' },
        { status: 'PASS', stdout_hash: 'def' },
        { status: 'PASS', stdout_hash: 'ghi' },
      ];
      expect(classifyRepeatability(results)).toBe('NONDETERMINISTIC');
    });

    it('18. Failed run = UNSTABLE', () => {
      const results = [
        { status: 'PASS', stdout_hash: 'abc' },
        { status: 'FAIL', stdout_hash: 'abc' },
        { status: 'PASS', stdout_hash: 'abc' },
      ];
      expect(classifyRepeatability(results)).toBe('UNSTABLE');
    });

    it('19. Empty results = FAILED', () => {
      expect(classifyRepeatability([])).toBe('FAILED');
    });
  });

  // ─── Pilot Selection ───────────────────────────────────────────────────
  describe('Pilot Selection', () => {
    it('20. Selects up to 12 pilot skills deterministically', () => {
      const { pilot, reasons } = selectPilot();
      expect(Array.isArray(pilot)).toBe(true);
      expect(pilot.length).toBeLessThanOrEqual(12);
      // All selections must have documented reasons
      for (const name of pilot) {
        expect(reasons[name]).toBeDefined();
      }
    });
  });

  // ─── Minimum Repetitions ───────────────────────────────────────────────
  describe('Repetition Requirements', () => {
    it('21. MIN_REPETITIONS is at least 3', () => {
      expect(MIN_REPETITIONS).toBeGreaterThanOrEqual(3);
    });
  });
});
