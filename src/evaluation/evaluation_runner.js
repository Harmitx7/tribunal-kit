'use strict';

/**
 * evaluation_runner.js — Phase 1 Deterministic Benchmark Runner
 * ===============================================================
 * Executes real candidate evaluation inside ephemeral WorktreeSandbox
 * instances while enforcing BenchmarkOracle integrity verification.
 *
 * Guarantees:
 * 1. Hermetic execution: each candidate runs in its own isolated worktree.
 * 2. Anti-eval-hacking: protected test suites cannot be altered.
 * 3. Deterministic scoring: exit codes, timings, and memory telemetry.
 */

const fs = require('fs');
const path = require('path');
const { WorktreeSandbox } = require('./worktree_sandbox');
const { BenchmarkOracle } = require('./benchmark_oracle');
const { getScenarios } = require('./scenario_registry');
const { assertWithinRoot } = require('../security/boundary');

class EvaluationRunner {
  /**
   * @param {object} [options]
   * @param {string} [options.repoRoot] - Repository root path
   * @param {BenchmarkOracle} [options.oracle] - Custom BenchmarkOracle instance
   * @param {Array} [options.scenarios] - Scenarios list to evaluate
   * @param {object} [options.sandboxOptions] - Additional sandbox config
   */
  constructor(options = {}) {
    this.repoRoot = path.resolve(options.repoRoot || process.cwd());
    this.oracle = options.oracle || new BenchmarkOracle({ repoRoot: this.repoRoot });
    this.scenarios = options.scenarios || getScenarios();
    this.sandboxOptions = {
      repoRoot: this.repoRoot,
      ...(options.sandboxOptions || {}),
    };

    // Ensure ground-truth oracle manifest is generated
    this.oracle.generateManifest();
  }

  /**
   * Evaluates a single candidate proposal against an isolated scenario.
   *
   * @param {object} scenario - Scenario definition from scenario_registry
   * @param {string} candidateCode - Proposed code to test
   * @param {object} [options]
   * @returns {Promise<{ scenarioId: string, verdict: 'APPROVED'|'REJECTED'|'QUARANTINED', exitCode: number, durationMs: number, timedOut: boolean, reason: string }>}
   */
  async evaluateCandidate(scenario, candidateCode, options = {}) {
    if (!scenario || !scenario.scenarioId) {
      throw new Error('Invalid scenario provided to evaluateCandidate.');
    }

    return await WorktreeSandbox.withSandbox(this.sandboxOptions, async sandbox => {
      // 1. Initial anti-eval-hacking check: ensure worktree begins untampered
      const initialIntegrity = this.oracle.verifyIntegrity(sandbox.worktreePath);
      if (!initialIntegrity.valid) {
        return {
          scenarioId: scenario.scenarioId,
          verdict: 'QUARANTINED',
          exitCode: 1,
          reason: `PROTECTED_FILE_MODIFIED: Pre-test integrity violation: ${initialIntegrity.violations.map(v => v.file).join(', ')}`,
          violations: initialIntegrity.violations,
          durationMs: 0,
          timedOut: false,
        };
      }

      // 2. Check if targetFile is within protected test patterns
      const normTarget = scenario.targetFile.replace(/\\/g, '/');
      if (this.oracle._matchesPattern(normTarget)) {
        return {
          scenarioId: scenario.scenarioId,
          verdict: 'QUARANTINED',
          exitCode: 1,
          reason: `PROTECTED_FILE_MODIFIED: Target file "${scenario.targetFile}" is a protected test file. Candidates cannot mutate test suites.`,
          durationMs: 0,
          timedOut: false,
        };
      }

      // 3. Write candidate code into the sandbox
      const targetFilePath = assertWithinRoot(
        sandbox.worktreePath,
        path.join(sandbox.worktreePath, scenario.targetFile),
      );
      const targetDir = path.dirname(targetFilePath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.writeFileSync(targetFilePath, candidateCode, 'utf8');

      // 4. Post-mutation anti-eval-hacking check: ensure no test files were modified as a side-effect
      const postIntegrity = this.oracle.verifyIntegrity(sandbox.worktreePath);
      if (!postIntegrity.valid) {
        return {
          scenarioId: scenario.scenarioId,
          verdict: 'QUARANTINED',
          exitCode: 1,
          reason: `PROTECTED_FILE_MODIFIED: Post-mutation integrity violation: ${postIntegrity.violations.map(v => v.file).join(', ')}`,
          violations: postIntegrity.violations,
          durationMs: 0,
          timedOut: false,
        };
      }

      // 5. Run the scenario verification command inside the sandbox
      const vCmd = scenario.verificationCommand;
      const cmdRes = await sandbox.runCommand(vCmd.cmd, vCmd.args || [], {
        timeoutMs: scenario.timeoutMs || 30000,
      });

      const isApproved = cmdRes.exitCode === 0 && !cmdRes.timedOut;

      return {
        scenarioId: scenario.scenarioId,
        verdict: isApproved ? 'APPROVED' : 'REJECTED',
        exitCode: cmdRes.exitCode,
        stdout: cmdRes.stdout,
        stderr: cmdRes.stderr,
        durationMs: cmdRes.durationMs,
        timedOut: cmdRes.timedOut,
        reason: isApproved
          ? 'Verification command succeeded.'
          : `Verification failed with exit code ${cmdRes.exitCode}: ${(cmdRes.stderr || cmdRes.stdout).trim()}`,
      };
    });
  }

  /**
   * Executes the entire benchmark suite.
   */
  async runSuite(options = {}) {
    const results = [];
    const stats = {
      total: this.scenarios.length,
      approved: 0,
      rejected: 0,
      quarantined: 0,
      totalDurationMs: 0,
    };

    for (const scenario of this.scenarios) {
      // Test safeProposal by default in benchmark suite run
      const report = await this.evaluateCandidate(scenario, scenario.safeProposal, options);
      results.push({ scenario, report });

      if (report.verdict === 'APPROVED') stats.approved++;
      else if (report.verdict === 'REJECTED') stats.rejected++;
      else if (report.verdict === 'QUARANTINED') stats.quarantined++;

      stats.totalDurationMs += report.durationMs;
    }

    return {
      timestamp: new Date().toISOString(),
      stats,
      results,
    };
  }
}

module.exports = { EvaluationRunner };
