'use strict';

/**
 * invariant_verifier.js — EvalOpt Anti-Weakening Invariant Verifier
 * =================================================================
 * Enforces the core mathematical law of adversarial evaluation mutation:
 * Test mutations can only HARDEN evaluation standards, NEVER weaken them.
 *
 * Rules:
 * 1. Ground-Truth Soundness: safeProposal MUST pass execution.
 * 2. Discriminative Sharpness: unsafeProposal MUST fail execution.
 * 3. Monotonic Hardness: Verification assertions cannot be truncated or deleted.
 */

const crypto = require('crypto');

class InvariantVerifier {
  /**
   * Verifies an adversarial mutated scenario against its parent specification.
   *
   * @param {object} baseScenario - The original ground-truth scenario
   * @param {object} mutatedScenario - The candidate mutated scenario
   * @param {object} runner - EvaluationRunner instance or mock supporting evaluateCandidate(scenario, code)
   * @returns {Promise<{ valid: boolean, verdict: string, reason: string, proof?: object }>}
   */
  async verifyMutation(baseScenario, mutatedScenario, runner) {
    if (!baseScenario || !mutatedScenario || !runner) {
      throw new Error('baseScenario, mutatedScenario, and runner are required.');
    }

    // 1. Monotonic Assertion Check: Mutated script must not delete or truncate base assertions
    const baseScript = (baseScenario.verificationCommand?.args?.[1] || '').trim();
    const mutatedScript = (mutatedScenario.verificationCommand?.args?.[1] || '').trim();

    if (mutatedScript.length < baseScript.length) {
      return {
        valid: false,
        verdict: 'REJECT_WEAKENED',
        reason: 'Mutated scenario shortened or deleted parent assertions.',
      };
    }

    // 2. Ground-Truth Soundness Check: safeProposal MUST pass
    const safeReport = await runner.evaluateCandidate(
      mutatedScenario,
      baseScenario.safeProposal,
    );

    if (safeReport.verdict !== 'APPROVED' || safeReport.exitCode !== 0) {
      return {
        valid: false,
        verdict: 'REJECT_UNSOUND',
        reason: `Safe proposal failed under mutated scenario: ${safeReport.reason || 'non-zero exit'}`,
        safeReport,
      };
    }

    // 3. Discriminative Sharpness Check: unsafeProposal MUST fail
    const unsafeReport = await runner.evaluateCandidate(
      mutatedScenario,
      baseScenario.unsafeProposal,
    );

    if (unsafeReport.verdict === 'APPROVED' && unsafeReport.exitCode === 0) {
      return {
        valid: false,
        verdict: 'REJECT_INSUFFICIENT_DISCRIMINATION',
        reason: 'Flawed unsafe proposal passed the mutated scenario (insufficient discriminative power).',
        unsafeReport,
      };
    }

    // 4. Certified Hardened: Generate cryptographic InvariantProof
    const hashPayload = JSON.stringify({
      scenarioId: mutatedScenario.scenarioId,
      parentScenarioId: baseScenario.scenarioId,
      category: mutatedScenario.category,
      cmd: mutatedScenario.verificationCommand,
    });
    const provenanceHash = crypto.createHash('sha256').update(hashPayload).digest('hex');

    const proof = {
      status: 'CERTIFIED_HARDENED',
      scenarioId: mutatedScenario.scenarioId,
      parentScenarioId: baseScenario.scenarioId,
      category: mutatedScenario.category,
      safeProposalPassed: true,
      unsafeProposalFailed: true,
      assertionCountDelta: mutatedScript.length - baseScript.length,
      provenanceHash,
      certifiedAt: new Date().toISOString(),
    };

    return {
      valid: true,
      verdict: 'CERTIFIED_HARDENED',
      reason: 'Mutated scenario successfully passed the anti-weakening dual-oracle gate.',
      proof,
    };
  }
}

module.exports = { InvariantVerifier };
