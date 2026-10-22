'use strict';

/**
 * evalopt.js — EvalOpt Adversarial Red-Teaming & Scenario Fuzzing Command
 * =======================================================================
 * Loop 2 of the Asymmetric Dual-Loop Self-Improvement Engine.
 * 
 * Capabilities:
 * 1. Probes candidate implementations against 4 attack vectors (Boundary, Injection, Type, DoS).
 * 2. Enforces Anti-Weakening Invariants (safeProposal MUST pass, unsafeProposal MUST fail).
 * 3. Bridges breaking vulnerabilities directly into Phase 2 Negative Memory (recordRejection).
 * 4. Stages certified hardened scenarios in .tribunal/evals/candidate_scenarios.json.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const logger = require('../utils/logger');
const helpers = require('../utils/helpers');
const { SCENARIOS } = require('../evaluation/scenario_registry');
const { AdversarialMutator } = require('../evaluation/adversarial_mutator');
const { InvariantVerifier } = require('../evaluation/invariant_verifier');
const { WorktreeSandbox } = require('../evaluation/worktree_sandbox');
const {
  recordAdversarialFinding,
  stageCandidateScenario,
  loadCandidateScenarios,
  promoteCandidateScenario,
} = require('../evaluation/coevolution_bridge');

function shouldRunInShell(cmd) {
  if (process.platform !== 'win32') return false;
  const lower = (cmd || '').toLowerCase();
  return lower === 'npm' || lower === 'npx' || lower.endsWith('.cmd') || lower.endsWith('.bat');
}

async function cmdEvalOpt(flags, processArgs, quiet = false) {
  const targetDir = flags.path ? path.resolve(flags.path) : process.cwd();
  const agentDest = path.join(targetDir, '.agent');
  const tribunalDest = path.join(targetDir, '.tribunal');

  if (!fs.existsSync(agentDest)) {
    logger.err('.agent/ not found. Run: npx tribunal-kit init');
    process.exit(1);
  }

  if (!fs.existsSync(tribunalDest)) {
    fs.mkdirSync(tribunalDest, { recursive: true });
  }

  // ── 1. Status Mode: List staged candidate scenarios ───────────────────────
  if (flags.status) {
    helpers.banner(quiet);
    const candidates = loadCandidateScenarios(tribunalDest);
    logger.log(`\n  ${logger.bold('Staged Adversarial Candidate Scenarios')} (${candidates.length} total)`);
    logger.dim('  ─────────────────────────────────────────────────────────');

    if (candidates.length === 0) {
      logger.dim('  No candidate scenarios staged. Run tk evalopt to generate mutations.');
    } else {
      for (const c of candidates) {
        const color = c.status === 'PROMOTED' ? 'green' : 'yellow';
        logger.log(
          `  ${logger.c(color, `[${c.status}]`)} ${logger.bold(c.candidateId)} — ${logger.c('cyan', c.scenarioId)} [${c.category}]`,
        );
        logger.dim(`    Parent: ${c.parentScenarioId} | Staged: ${c.stagedAt}`);
      }
    }
    logger.log('');
    return { status: true, total: candidates.length };
  }

  // ── 2. Promotion Mode: Promote staged scenario to permanent suite ──────────
  if (flags.promote) {
    try {
      const candidateId = String(flags.promote);
      const promoted = promoteCandidateScenario(tribunalDest, candidateId);
      if (!quiet) {
        logger.log(
          `  ${logger.c('green', '✔')} Promoted adversarial candidate: ${logger.bold(promoted.candidateId)} [${promoted.scenarioId}]`,
        );
      }
      return { promoted: true, candidateId };
    } catch (e) {
      logger.err(`Failed to promote candidate scenario: ${e.message}`);
      process.exit(1);
    }
  }

  helpers.banner(quiet);

  // ── 3. Red-Team Execution Mode ─────────────────────────────────────────────
  const fuzzDepth = Number(flags['fuzz-depth'] || flags.depth) || 3;
  const useSandbox = flags.sandbox === true || (flags.sandbox !== false && !flags['no-sandbox']);

  logger.log(`  ${logger.c('cyan', '⊘')} Starting EvalOpt Adversarial Red-Team Campaign`);
  logger.log(`  ${logger.c('cyan', '⊘')} Fuzz Depth: ${logger.bold(String(fuzzDepth))} per vector`);
  logger.log(`  ${logger.c('cyan', '⊘')} Sandbox Isolation: ${logger.bold(useSandbox ? 'Enabled (Worktree)' : 'Direct')}`);
  logger.log('');

  // Filter target scenarios
  let targetScenarios = SCENARIOS;
  if (flags.target) {
    const matched = SCENARIOS.filter(
      s => s.scenarioId.toLowerCase() === flags.target.toLowerCase() ||
           s.targetFile.toLowerCase().includes(flags.target.toLowerCase()),
    );
    if (matched.length > 0) {
      targetScenarios = matched;
    }
  }

  let sandbox = null;
  let runDir = targetDir;
  const originalHostFiles = new Map();

  if (useSandbox) {
    try {
      logger.log(`  ${logger.c('cyan', '⊘')} Provisioning ephemeral WorktreeSandbox...`);
      sandbox = new WorktreeSandbox({ repoRoot: targetDir });
      await sandbox.create();
      runDir = sandbox.worktreePath;
      logger.log(`  ${logger.c('green', '✔')} WorktreeSandbox active: ${logger.bold(sandbox.branch)}`);
    } catch (e) {
      logger.warn(`  ⚠️ WorktreeSandbox creation bypassed: ${e.message}`);
      sandbox = null;
      runDir = targetDir;
    }
  }

  // If running in direct mode (not in worktree sandbox), snapshot original files to restore later
  if (!sandbox) {
    for (const s of targetScenarios) {
      const p = path.join(runDir, s.targetFile);
      if (fs.existsSync(p)) {
        originalHostFiles.set(p, fs.readFileSync(p, 'utf8'));
      } else {
        originalHostFiles.set(p, null);
      }
    }
  }

  const mutator = new AdversarialMutator();
  const verifier = new InvariantVerifier();

  let totalTested = 0;
  let certifiedCount = 0;
  let bridgedVulnerabilities = 0;
  const vectorStats = {};

  try {
    // Runner adapter compatible with InvariantVerifier and sandbox
    const runnerAdapter = {
      evaluateCandidate: async (scenario, code) => {
        const targetPath = path.join(runDir, scenario.targetFile);
        const targetParent = path.dirname(targetPath);
        if (!fs.existsSync(targetParent)) {
          fs.mkdirSync(targetParent, { recursive: true });
        }
        fs.writeFileSync(targetPath, code, 'utf8');

        let cmdRes = { exitCode: 0, stdout: '', stderr: '', reason: '' };
        try {
          const vCmd = scenario.verificationCommand;
          const stdout = execFileSync(vCmd.cmd, vCmd.args || [], {
            encoding: 'utf8',
            cwd: runDir,
            stdio: 'pipe',
            shell: shouldRunInShell(vCmd.cmd),
          });
          cmdRes = { exitCode: 0, stdout, stderr: '', verdict: 'APPROVED' };
        } catch (e) {
          cmdRes = {
            exitCode: e.status || 1,
            stdout: e.stdout || '',
            stderr: e.stderr || e.message,
            verdict: 'REJECTED',
            reason: (e.stderr || e.message || '').trim(),
          };
        }
        return cmdRes;
      },
    };

    for (const baseScenario of targetScenarios) {
      logger.log(`  ${logger.c('cyan', '▶')} Red-teaming: ${logger.bold(baseScenario.scenarioId)} [${baseScenario.category}]`);

      const mutations = mutator.generateMutations(baseScenario, { depth: fuzzDepth });
      for (const mutation of mutations) {
        totalTested++;
        vectorStats[mutation.category] = vectorStats[mutation.category] || { total: 0, passed: 0 };
        vectorStats[mutation.category].total++;

        const verification = await verifier.verifyMutation(baseScenario, mutation, runnerAdapter);

        if (verification.valid) {
          certifiedCount++;
          vectorStats[mutation.category].passed++;
          stageCandidateScenario(tribunalDest, mutation, verification.proof);
          logger.log(
            `    ${logger.c('green', '✔')} [${mutation.category}] Certified Hardened: ${logger.c('gray', mutation.scenarioId)}`,
          );
        } else {
          logger.log(
            `    ${logger.c('yellow', '⚡')} [${mutation.category}] Vulnerability Discovered: ${logger.c('gray', verification.reason)}`,
          );

          // Bridge failure directly to Negative CBR Memory if enabled
          if (flags.bridge !== false) {
            recordAdversarialFinding(agentDest, baseScenario.targetFile, {
              payload: mutation.mutationPayload,
              category: mutation.category,
              reason: verification.reason,
            });
            bridgedVulnerabilities++;
          }
        }
      }
      logger.log('');
    }
  } finally {
    if (sandbox) {
      await sandbox.destroy();
      logger.log(`  ${logger.c('gray', '●')} Ephemeral WorktreeSandbox cleaned up.`);
    } else {
      // Direct mode cleanup: restore any modified host files
      for (const [filePath, content] of originalHostFiles.entries()) {
        try {
          if (content === null) {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          } else {
            fs.writeFileSync(filePath, content, 'utf8');
          }
        } catch (_) {}
      }
    }
  }

  const resilienceRate = totalTested > 0 ? (certifiedCount / totalTested) * 100 : 100;

  // ── 4. Adversarial Resilience Matrix ──────────────────────────────────────
  logger.log(`  ${logger.bold('━━━ Adversarial Resilience Matrix ━━━')}`);
  logger.log(`  Total Scenarios Probed:      ${logger.bold(String(totalTested))}`);
  logger.log(`  Invariants Certified:        ${logger.c('green', String(certifiedCount))}`);
  logger.log(`  Vulnerabilities Bridged:     ${logger.c('yellow', String(bridgedVulnerabilities))}`);
  logger.log(
    `  Adversarial Resilience:      ${logger.bold(resilienceRate >= 80 ? logger.c('green', `${resilienceRate.toFixed(1)}%`) : logger.c('red', `${resilienceRate.toFixed(1)}%`))}`,
  );
  logger.log('');

  return {
    totalTested,
    certifiedCount,
    bridgedVulnerabilities,
    resilienceRate,
  };
}

module.exports = { cmdEvalOpt };
