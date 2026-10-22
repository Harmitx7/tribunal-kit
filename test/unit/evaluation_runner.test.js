'use strict';

/**
 * evaluation_runner.test.js
 * =========================
 * Unit tests for the upgraded EvaluationRunner (Phase 1 RSIE Benchmark Engine).
 * Verifies real isolated sandbox evaluation, tamper detection, and deterministic metrics.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { EvaluationRunner } = require('../../src/evaluation/evaluation_runner');
const { getScenarios } = require('../../src/evaluation/scenario_registry');

describe('EvaluationRunner — Phase 1 Deterministic Benchmark Engine', () => {
  let repoRoot;
  let runner;

  beforeAll(() => {
    repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
    }).trim();
    runner = new EvaluationRunner({ repoRoot });
  });

  test('scenario_registry exports executable benchmark scenarios', () => {
    const scenarios = getScenarios();
    expect(Array.isArray(scenarios)).toBe(true);
    expect(scenarios.length).toBeGreaterThanOrEqual(3);

    for (const sc of scenarios) {
      expect(sc.scenarioId).toBeDefined();
      expect(sc.targetFile).toBeDefined();
      expect(sc.safeProposal).toBeDefined();
      expect(sc.unsafeProposal).toBeDefined();
      expect(sc.verificationCommand).toBeDefined();
    }
  });

  test('evaluateCandidate approves safe proposal inside ephemeral worktree', async () => {
    const scenarios = getScenarios();
    const scenario = scenarios.find(s => s.scenarioId === 'SCENARIO_TIER1_MATH_FEATURE');
    expect(scenario).toBeDefined();

    const result = await runner.evaluateCandidate(scenario, scenario.safeProposal);

    expect(result.verdict).toBe('APPROVED');
    expect(result.exitCode).toBe(0);
    expect(result.durationMs).toBeGreaterThan(0);
    expect(result.timedOut).toBe(false);
  });

  test('evaluateCandidate rejects unsafe proposal containing bug or vulnerability', async () => {
    const scenarios = getScenarios();
    const scenario = scenarios.find(s => s.scenarioId === 'SCENARIO_TIER1_MATH_FEATURE');
    expect(scenario).toBeDefined();

    const result = await runner.evaluateCandidate(scenario, scenario.unsafeProposal);

    expect(result.verdict).toBe('REJECTED');
    expect(result.exitCode).not.toBe(0);
  });

  test('evaluateCandidate quarantines proposals that attempt to overwrite protected test files', async () => {
    const maliciousScenario = {
      scenarioId: 'SCENARIO_MALICIOUS_EVAL_HACK',
      targetFile: 'test/unit/security_containment.test.js', // Target is protected test suite!
      verificationCommand: { cmd: 'node', args: ['-e', 'process.exit(0)'] },
    };

    const maliciousCode = '// Tampered test content';
    const result = await runner.evaluateCandidate(maliciousScenario, maliciousCode);

    expect(result.verdict).toBe('QUARANTINED');
    expect(result.reason).toContain('PROTECTED_FILE_MODIFIED');
  });

  test('runSuite executes all scenarios and generates aggregated report', async () => {
    const report = await runner.runSuite();

    expect(report.timestamp).toBeDefined();
    expect(report.stats.total).toBe(3);
    expect(report.stats.approved).toBe(3);
    expect(report.stats.rejected).toBe(0);
    expect(report.stats.quarantined).toBe(0);
    expect(report.results).toHaveLength(3);
  });
});
