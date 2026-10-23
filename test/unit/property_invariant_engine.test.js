'use strict';

/**
 * property_invariant_engine.test.js
 * ==================================
 * Unit tests for PropertyInvariantEngine (Phase 2 Formal Invariant Verification).
 */

const {
  PropertyInvariantEngine,
  LEGAL_TRANSITIONS,
} = require('../../src/evaluation/property_invariant_engine');

describe('PropertyInvariantEngine — Mathematical Invariant Verification', () => {
  let engine;

  beforeEach(() => {
    engine = new PropertyInvariantEngine();
  });

  describe('State Machine Liveness & Safety DAG', () => {
    test('Permits legal lifecycle transitions', () => {
      expect(engine.verifyStateTransition('DRAFT', 'VALIDATING').valid).toBe(true);
      expect(engine.verifyStateTransition('PROPOSED', 'VALIDATING').valid).toBe(true);
      expect(engine.verifyStateTransition('VALIDATING', 'APPROVED').valid).toBe(true);
      expect(engine.verifyStateTransition('APPROVED', 'PROMOTED').valid).toBe(true);
      expect(engine.verifyStateTransition('PROMOTED', 'ROLLED_BACK').valid).toBe(true);
      expect(engine.verifyStateTransition('VALIDATING', 'REJECTED').valid).toBe(true);
    });

    test('Rejects backward or illegal transitions (PROMOTED -> DRAFT, REJECTED -> APPROVED)', () => {
      expect(() => engine.verifyStateTransition('PROMOTED', 'DRAFT')).toThrow(
        /Illegal state transition/,
      );
      expect(() => engine.verifyStateTransition('REJECTED', 'APPROVED')).toThrow(
        /Illegal state transition/,
      );
      expect(() => engine.verifyStateTransition('ROLLED_BACK', 'PROMOTED')).toThrow(
        /Illegal state transition/,
      );
    });

    test('Throws on unknown or null states', () => {
      expect(() => engine.verifyStateTransition('UNKNOWN_STATE', 'VALIDATING')).toThrow(
        /Unknown state/,
      );
      expect(() => engine.verifyStateTransition(null, 'VALIDATING')).toThrow(
        /Invalid fromState/,
      );
    });
  });

  describe('Monotonic Security Boundaries', () => {
    test('Passes allowed non-sensitive targets', () => {
      const res = engine.verifySecurityBoundaries('rule-heuristics');
      expect(res.valid).toBe(true);
    });

    test('Throws when candidate attempts to target protected security boundaries', () => {
      expect(() => engine.verifySecurityBoundaries('src/security/boundary.js')).toThrow(
        /protected security boundary/,
      );
      expect(() => engine.verifySecurityBoundaries('package.json')).toThrow(
        /protected security boundary/,
      );
    });

    test('Throws when candidate touches affected files within protected boundaries', () => {
      expect(() =>
        engine.verifySecurityBoundaries('rule-heuristics', ['src/security/boundary.js']),
      ).toThrow(/touches forbidden protected boundary/);
    });
  });

  describe('Resource Envelope Invariant', () => {
    test('Passes when duration and memory are within limits', () => {
      const res = engine.verifyResourceEnvelope({ durationMs: 2500, heapDeltaMb: 45 });
      expect(res.valid).toBe(true);
    });

    test('Throws when execution duration exceeds ceiling', () => {
      expect(() => engine.verifyResourceEnvelope({ durationMs: 75000 })).toThrow(
        /Execution duration .* exceeded maximum ceiling/,
      );
    });

    test('Throws when heap growth exceeds ceiling', () => {
      expect(() => engine.verifyResourceEnvelope({ heapDeltaMb: 300 })).toThrow(
        /Heap memory growth .* exceeded maximum limit/,
      );
    });
  });

  describe('Dual-Oracle Soundness Invariant', () => {
    test('Passes when safe pass rate is 1.0 and unsafe pass rate is 0.0', () => {
      const res = engine.verifyDualOracleSoundness({ safePassRate: 1.0, unsafePassRate: 0.0 });
      expect(res.valid).toBe(true);
    });

    test('Throws when safe proposal fails (< 1.0)', () => {
      expect(() =>
        engine.verifyDualOracleSoundness({ safePassRate: 0.95, unsafePassRate: 0.0 }),
      ).toThrow(/Ground-truth soundness check failed/);
    });

    test('Throws when unsafe proposal leaks (> 0.0)', () => {
      expect(() =>
        engine.verifyDualOracleSoundness({ safePassRate: 1.0, unsafePassRate: 0.05 }),
      ).toThrow(/Discriminative sharpness check failed/);
    });
  });

  describe('Cryptographic Proof Certificate Generation', () => {
    test('Generates tamper-evident certificate with valid SHA-256 signature', () => {
      const candidate = {
        candidate_id: 'CAND_PROOF_TEST',
        target: 'routing-rules',
        status: 'APPROVED',
      };
      const cert = engine.generateProofCertificate(candidate, { approver: 'Lead Auditor' });

      expect(cert.certified).toBe(true);
      expect(cert.certificateId).toMatch(/^PROOF-\d+-[a-f0-9]{8}$/);
      expect(cert.signature).toMatch(/^[a-f0-9]{64}$/);
      expect(cert.payload.candidateId).toBe('CAND_PROOF_TEST');
      expect(cert.payload.details.approver).toBe('Lead Auditor');
    });
  });
});
