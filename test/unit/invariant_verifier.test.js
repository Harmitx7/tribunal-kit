'use strict';

/**
 * invariant_verifier.test.js
 * ===========================
 * Unit tests for Phase 3 Anti-Weakening Invariant Verifier.
 * Verifies that:
 * 1. Mutations where safeProposal fails are rejected as UNSOUND.
 * 2. Mutations where unsafeProposal passes are rejected as INSUFFICIENT_DISCRIMINATION.
 * 3. Mutations with deleted/weakened checks are rejected as WEAKENED.
 * 4. Mutations satisfying all invariants are certified as CERTIFIED_HARDENED with an InvariantProof.
 */

const { InvariantVerifier } = require('../../src/evaluation/invariant_verifier');
const { SCENARIOS } = require('../../src/evaluation/scenario_registry');

describe('Anti-Weakening Invariant Verifier — EvalOpt Safety Gate', () => {
  let verifier;
  let baseMathScenario;

  beforeEach(() => {
    verifier = new InvariantVerifier();
    baseMathScenario = SCENARIOS.find(s => s.scenarioId === 'SCENARIO_TIER1_MATH_FEATURE');
  });

  test('Rejects unsound mutation when safe proposal fails execution', async () => {
    const unsoundMutation = {
      scenarioId: 'MATH_UNSOUND',
      parentScenarioId: baseMathScenario.scenarioId,
      category: 'BOUNDARY_EXTREMA',
      targetFile: baseMathScenario.targetFile,
      safeProposal: baseMathScenario.safeProposal,
      unsafeProposal: baseMathScenario.unsafeProposal,
      // Impossible requirement added to base script: expects calculateMean([2, 4, 6]) === 999
      verificationCommand: {
        cmd: 'node',
        args: [
          '-e',
          `${baseMathScenario.verificationCommand.args[1]} if (calculateMean([2, 4, 6]) !== 999) process.exit(1);`,
        ],
      },
      timeoutMs: 5000,
    };

    const mockRunner = {
      evaluateCandidate: jest.fn().mockResolvedValueOnce({
        scenarioId: 'MATH_UNSOUND',
        verdict: 'REJECTED',
        exitCode: 1,
        reason: 'Failed on calculateMean',
      }),
    };

    const result = await verifier.verifyMutation(baseMathScenario, unsoundMutation, mockRunner);
    expect(result.valid).toBe(false);
    expect(result.verdict).toBe('REJECT_UNSOUND');
    expect(result.reason).toContain('Safe proposal failed');
  });

  test('Rejects mutation with insufficient discriminative power when unsafe proposal passes', async () => {
    const weakMutation = {
      scenarioId: 'MATH_WEAK',
      parentScenarioId: baseMathScenario.scenarioId,
      category: 'BOUNDARY_EXTREMA',
      targetFile: baseMathScenario.targetFile,
      safeProposal: baseMathScenario.safeProposal,
      unsafeProposal: baseMathScenario.unsafeProposal,
      verificationCommand: {
        cmd: 'node',
        args: [
          '-e',
          `${baseMathScenario.verificationCommand.args[1]} /* trivial check */ if (false) process.exit(1);`,
        ],
      },
      timeoutMs: 5000,
    };

    const mockRunner = {
      evaluateCandidate: jest
        .fn()
        // safe proposal passes
        .mockResolvedValueOnce({ verdict: 'APPROVED', exitCode: 0 })
        // unsafe proposal also passes (fails to catch bug)
        .mockResolvedValueOnce({ verdict: 'APPROVED', exitCode: 0 }),
    };

    const result = await verifier.verifyMutation(baseMathScenario, weakMutation, mockRunner);
    expect(result.valid).toBe(false);
    expect(result.verdict).toBe('REJECT_INSUFFICIENT_DISCRIMINATION');
  });

  test('Rejects mutation that weakens or truncates parent assertions', async () => {
    const weakenedMutation = {
      scenarioId: 'MATH_TRUNCATED',
      parentScenarioId: baseMathScenario.scenarioId,
      category: 'BOUNDARY_EXTREMA',
      targetFile: baseMathScenario.targetFile,
      safeProposal: baseMathScenario.safeProposal,
      unsafeProposal: baseMathScenario.unsafeProposal,
      // Shortened script that deleted the parent checks
      verificationCommand: {
        cmd: 'node',
        args: ['-e', 'if (1 !== 1) process.exit(1);'],
      },
      timeoutMs: 5000,
    };

    const mockRunner = {
      evaluateCandidate: jest
        .fn()
        .mockResolvedValueOnce({ verdict: 'APPROVED', exitCode: 0 })
        .mockResolvedValueOnce({ verdict: 'REJECTED', exitCode: 1 }),
    };

    const result = await verifier.verifyMutation(baseMathScenario, weakenedMutation, mockRunner);
    expect(result.valid).toBe(false);
    expect(result.verdict).toBe('REJECT_WEAKENED');
    expect(result.reason).toContain('shortened or deleted parent assertions');
  });

  test('Certifies sound and discriminative mutation with InvariantProof', async () => {
    const hardenedMutation = {
      scenarioId: 'MATH_CERTIFIED',
      parentScenarioId: baseMathScenario.scenarioId,
      category: 'BOUNDARY_EXTREMA',
      targetFile: baseMathScenario.targetFile,
      safeProposal: baseMathScenario.safeProposal,
      unsafeProposal: baseMathScenario.unsafeProposal,
      // Extends base assertions with additional hardened check
      verificationCommand: {
        cmd: 'node',
        args: [
          '-e',
          `${baseMathScenario.verificationCommand.args[1]} if (calculateMean([-2, -4]) !== -3) process.exit(1);`,
        ],
      },
      timeoutMs: 5000,
    };

    const mockRunner = {
      evaluateCandidate: jest
        .fn()
        // safe proposal passes
        .mockResolvedValueOnce({ verdict: 'APPROVED', exitCode: 0 })
        // unsafe proposal fails (correctly catches bug)
        .mockResolvedValueOnce({ verdict: 'REJECTED', exitCode: 1, reason: 'Failed on empty array' }),
    };

    const result = await verifier.verifyMutation(baseMathScenario, hardenedMutation, mockRunner);
    expect(result.valid).toBe(true);
    expect(result.verdict).toBe('CERTIFIED_HARDENED');
    expect(result.proof).toBeDefined();
    expect(result.proof.provenanceHash).toBeDefined();
    expect(result.proof.safeProposalPassed).toBe(true);
    expect(result.proof.unsafeProposalFailed).toBe(true);
  });
});
