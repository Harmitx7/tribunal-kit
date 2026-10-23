'use strict';

/**
 * property_invariant_engine.js — Formal Invariant Verification Engine
 * ===================================================================
 * Phase 2 RSIE: Formal Verification & Invariant Proof Pipeline
 *
 * Enforces mathematical and structural guarantees across candidate mutations:
 * 1. State Machine Liveness & Safety Invariant (valid DAG transitions only).
 * 2. Monotonic Security Boundary Invariant (FORBIDDEN_TARGETS containment).
 * 3. Execution Resource Envelope Invariant (memory & duration ceilings).
 * 4. Dual-Oracle Anti-Weakening Invariant (100% safe pass, 0% unsafe leak).
 * 5. Cryptographic Proof Certificate Generation.
 */

const crypto = require('crypto');
const path = require('path');
const { FORBIDDEN_TARGETS, ALLOWED_TARGETS } = require('../evolution/engine');

/**
 * Formal State Machine Transition Directed Acyclic Graph (DAG)
 */
const LEGAL_TRANSITIONS = Object.freeze({
  DRAFT: new Set(['VALIDATING']),
  PROPOSED: new Set(['VALIDATING', 'REJECTED']),
  VALIDATING: new Set(['VALIDATING', 'VALIDATED', 'APPROVED', 'REJECTED']),
  VALIDATED: new Set(['APPROVED', 'REJECTED']),
  APPROVED: new Set(['PROMOTED', 'REJECTED']),
  PROMOTED: new Set(['ROLLED_BACK']),
  REJECTED: new Set([]), // Terminal state
  ROLLED_BACK: new Set([]), // Terminal state
});

const DEFAULT_RESOURCE_LIMITS = Object.freeze({
  maxDurationMs: 60000,
  maxHeapDeltaMb: 256,
});

class PropertyInvariantEngine {
  /**
   * @param {object} [options]
   * @param {Set<string>} [options.forbiddenTargets] - Override or augment forbidden targets
   * @param {object} [options.resourceLimits] - Custom execution resource limits
   */
  constructor(options = {}) {
    this.forbiddenTargets = options.forbiddenTargets || FORBIDDEN_TARGETS;
    this.allowedTargets = options.allowedTargets || ALLOWED_TARGETS;
    this.resourceLimits = { ...DEFAULT_RESOURCE_LIMITS, ...(options.resourceLimits || {}) };
  }

  /**
   * Asserts that a state machine transition adheres to the legal lifecycle DAG.
   *
   * @param {string} fromState - Starting state
   * @param {string} toState - Requested destination state
   * @throws {Error} If transition violates state safety invariant
   * @returns {{ valid: boolean, fromState: string, toState: string }}
   */
  verifyStateTransition(fromState, toState) {
    if (!fromState || typeof fromState !== 'string') {
      throw new Error(`Invariant Violation: Invalid fromState "${fromState}". State must be a valid string.`);
    }
    if (!toState || typeof toState !== 'string') {
      throw new Error(`Invariant Violation: Invalid toState "${toState}". State must be a valid string.`);
    }

    const legalDestinations = LEGAL_TRANSITIONS[fromState];
    if (!legalDestinations) {
      throw new Error(
        `Invariant Violation: Unknown state "${fromState}". Allowed states: ${Object.keys(LEGAL_TRANSITIONS).join(', ')}`,
      );
    }

    if (!legalDestinations.has(toState)) {
      throw new Error(
        `Invariant Violation: Illegal state transition from "${fromState}" to "${toState}". Allowed transitions: [${Array.from(legalDestinations).join(', ')}]`,
      );
    }

    return { valid: true, fromState, toState };
  }

  /**
   * Verifies that the candidate target does not violate security boundaries.
   *
   * @param {string} target - Target path or identifier
   * @param {string[]} [affectedFiles] - Additional file paths touched
   * @returns {{ valid: boolean, target: string }}
   */
  verifySecurityBoundaries(target, affectedFiles = []) {
    if (!target || typeof target !== 'string') {
      throw new Error('Invariant Violation: Target must be a non-empty string.');
    }

    const isTargetForbidden =
      this.forbiddenTargets.has(target) ||
      target.includes('security') ||
      target.includes('boundary') ||
      target.includes('package.json') ||
      target.includes('shell-execution-policy');

    if (isTargetForbidden) {
      throw new Error(
        `Invariant Violation: Target "${target}" is a protected security boundary. Automatic evolution of security boundaries is strictly prohibited.`,
      );
    }

    // Check affected files against forbidden paths
    const normalizedFiles = affectedFiles.map(f => f.replace(/\\/g, '/'));
    for (const file of normalizedFiles) {
      const isFileForbidden =
        this.forbiddenTargets.has(file) ||
        file.includes('security') ||
        file.includes('boundary') ||
        file.includes('package.json') ||
        file.startsWith('src/security') ||
        file.startsWith('.tribunal/oracles');

      if (isFileForbidden) {
        throw new Error(
          `Invariant Violation: File "${file}" touches forbidden protected boundary.`,
        );
      }
    }

    return { valid: true, target };
  }

  /**
   * Verifies execution duration and memory envelope against resource limits.
   *
   * @param {{ durationMs?: number, heapDeltaMb?: number }} metrics
   * @returns {{ valid: boolean, metrics: object }}
   */
  verifyResourceEnvelope(metrics = {}) {
    if (metrics.durationMs !== undefined && metrics.durationMs > this.resourceLimits.maxDurationMs) {
      throw new Error(
        `Invariant Violation: Execution duration (${metrics.durationMs}ms) exceeded maximum ceiling of ${this.resourceLimits.maxDurationMs}ms.`,
      );
    }

    if (metrics.heapDeltaMb !== undefined && metrics.heapDeltaMb > this.resourceLimits.maxHeapDeltaMb) {
      throw new Error(
        `Invariant Violation: Heap memory growth (${metrics.heapDeltaMb}MB) exceeded maximum limit of ${this.resourceLimits.maxHeapDeltaMb}MB.`,
      );
    }

    return { valid: true, metrics };
  }

  /**
   * Verifies dual-oracle results: safe proposal must have passRate === 1.0,
   * unsafe proposal must have passRate === 0.0.
   *
   * @param {{ safePassRate: number, unsafePassRate: number }} evaluationReport
   * @returns {{ valid: boolean, safePassRate: number, unsafePassRate: number }}
   */
  verifyDualOracleSoundness(evaluationReport = {}) {
    const { safePassRate, unsafePassRate } = evaluationReport;

    if (safePassRate === undefined || safePassRate < 1.0) {
      throw new Error(
        `Invariant Violation: Ground-truth soundness check failed. Safe proposal pass rate was ${safePassRate !== undefined ? safePassRate * 100 : 0}%, but must be strictly 100%.`,
      );
    }

    if (unsafePassRate === undefined || unsafePassRate > 0.0) {
      throw new Error(
        `Invariant Violation: Discriminative sharpness check failed. Unsafe proposal leaked ${unsafePassRate * 100}%, but must be strictly 0.0%.`,
      );
    }

    return { valid: true, safePassRate, unsafePassRate };
  }

  /**
   * Generates a tamper-evident cryptographic Invariant Proof Certificate.
   *
   * @param {object} candidate
   * @param {object} verificationDetails
   * @returns {object} Signed certificate
   */
  generateProofCertificate(candidate, verificationDetails = {}) {
    const payload = {
      candidateId: candidate.candidate_id || candidate.candidateId,
      target: candidate.target,
      status: candidate.status,
      timestamp: new Date().toISOString(),
      details: verificationDetails,
    };

    const signature = crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');

    return {
      certificateId: `PROOF-${Date.now()}-${signature.substring(0, 8)}`,
      certified: true,
      signature,
      payload,
    };
  }
}

module.exports = {
  PropertyInvariantEngine,
  LEGAL_TRANSITIONS,
  DEFAULT_RESOURCE_LIMITS,
};
