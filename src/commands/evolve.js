'use strict';

/**
 * evolve.js — Co-Evolution & Continuous Auto-Tuning Command (Phase 4)
 * ===================================================================
 * Loop 1 (SkillOpt v2) + Loop 2 (EvalOpt) Autonomous Co-Evolution.
 *
 * Capabilities:
 * 1. Coordinates multi-round adversarial red-team fuzzing and skill hardening.
 * 2. Cross-evaluates candidates against baseline harness and anti-weakening invariants.
 * 3. Enforces consecutive regression circuit-breaker rollback.
 * 4. Stages certified EvolutionProposals under .agent/evolution/proposals/ for Human Gate.
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const helpers = require('../utils/helpers');
const { CoEvolutionOrchestrator } = require('../evolution/coevolution_orchestrator');
const { loadEvolutionProposals, FORBIDDEN_TARGETS } = require('../evolution/engine');

async function cmdEvolve(flags = {}, processArgs = [], quiet = false) {
  const targetDir = flags.path ? path.resolve(flags.path) : process.cwd();
  const agentDest = path.join(targetDir, '.agent');
  const tribunalDest = path.join(targetDir, '.tribunal');

  if (!fs.existsSync(agentDest)) {
    logger.err('.agent/ not found. Run: npx tribunal-kit init');
    process.exit(1);
  }

  // ── 1. Status Mode: List staged evolution proposals ───────────────────────
  if (flags.status) {
    helpers.banner(quiet);
    const proposals = loadEvolutionProposals(agentDest);
    logger.log(`\n  ${logger.bold('Staged Co-Evolution Proposals')} (${proposals.length} total)`);
    logger.dim('  ─────────────────────────────────────────────────────────');

    if (proposals.length === 0) {
      logger.dim('  No evolution proposals found. Run tk evolve to generate auto-tuning proposals.');
    } else {
      for (const p of proposals) {
        const color = p.status === 'APPROVED' ? 'green' : p.status === 'REJECTED' ? 'red' : 'yellow';
        logger.log(
          `  ${logger.c(color, `[${p.status}]`)} ${logger.bold(p.proposal_id)} — Target: ${logger.c('cyan', p.target)} [${p.risk} risk]`,
        );
        logger.dim(`    Evidence: ${(p.observed_evidence || '').slice(0, 80)}...`);
        logger.dim(`    Created: ${p.created_at || 'unknown'}`);
      }
    }
    logger.log('');
    return { status: true, total: proposals.length };
  }

  // ── 2. Resolve Target Skill ───────────────────────────────────────────────
  let targetSkill = flags.target;
  if (!targetSkill) {
    const skillsDir = path.join(agentDest, 'skills');
    if (fs.existsSync(skillsDir)) {
      const skills = fs.readdirSync(skillsDir).filter(s => {
        return fs.existsSync(path.join(skillsDir, s, 'SKILL.md'));
      });
      if (skills.includes('project-idioms')) {
        targetSkill = 'project-idioms';
      } else if (skills.length > 0) {
        targetSkill = skills[0];
      }
    }
  }

  if (!targetSkill) {
    targetSkill = 'project-idioms';
  }

  // Security boundary check
  const isForbidden =
    FORBIDDEN_TARGETS.has(targetSkill) ||
    targetSkill.toLowerCase().includes('security') ||
    targetSkill.toLowerCase().includes('boundary') ||
    targetSkill.toLowerCase().includes('shell') ||
    targetSkill.toLowerCase().includes('policy') ||
    targetSkill.toLowerCase().includes('human-gate') ||
    targetSkill.toLowerCase().includes('package.json');

  if (isForbidden) {
    logger.err(`Target "${targetSkill}" is a protected security boundary. Co-evolution is strictly forbidden.`);
    process.exit(1);
  }

  helpers.banner(quiet);

  // ── 3. Parse Orchestrator Options ─────────────────────────────────────────
  const rounds = flags.rounds ? Number(flags.rounds) : 2;
  const fuzzDepth = flags['fuzz-depth'] ? Number(flags['fuzz-depth']) : 2;
  const useSandbox = flags.sandbox === true || (flags.sandbox !== false && !flags['no-sandbox']);
  const autoPromote = Boolean(flags['auto-promote'] || flags.autoPromote);

  const nonFlagArgs = (processArgs || []).slice(2).filter(a => !a.startsWith('-'));
  let harnessCmd = flags['harness-cmd'] || flags.harness;
  if (!harnessCmd) {
    const candidateHarnessArgs = nonFlagArgs.filter(
      a => a !== 'evolve' && a !== 'auto-tune' && a !== targetSkill,
    );
    if (candidateHarnessArgs.length > 0) {
      harnessCmd = candidateHarnessArgs[0];
    }
  }
  if (!harnessCmd) {
    harnessCmd = 'node -e "process.exit(0)"';
  }

  if (!quiet) {
    logger.log(`  ${logger.c('cyan', '∞')} Starting Dual-Loop Continuous Co-Evolution Campaign`);
    logger.log(`  ${logger.c('cyan', '∞')} Target Skill:        ${logger.bold(targetSkill)}`);
    logger.log(`  ${logger.c('cyan', '∞')} Max Rounds:          ${logger.bold(String(rounds))}`);
    logger.log(`  ${logger.c('cyan', '∞')} Loop 2 Fuzz Depth:   ${logger.bold(String(fuzzDepth))} per vector`);
    logger.log(`  ${logger.c('cyan', '∞')} Sandbox Isolation:    ${logger.bold(useSandbox ? 'Enabled (Worktree)' : 'Direct')}`);
    logger.log(`  ${logger.c('cyan', '∞')} Promotion Policy:    ${logger.bold(autoPromote ? 'Auto-Promote (Bypass Gate)' : 'Human Gate Staged')}`);
    logger.log('');
  }

  // ── 4. Execute Co-Evolution Orchestrator ───────────────────────────────────
  try {
    const orchestrator = new CoEvolutionOrchestrator({
      repoRoot: targetDir,
      targetSkill,
      maxRounds: rounds,
      fuzzDepth,
      sandbox: useSandbox,
      autoPromote,
      harnessCmd,
    });

    const telemetry = await orchestrator.run();

    // ── 5. Render Real-Time Dual-Loop HUD ───────────────────────────────────
    if (!quiet) {
      logger.log(`\n  ${logger.bold('Co-Evolution Telemetry Summary')}`);
      logger.dim('  ─────────────────────────────────────────────────────────');

      for (const r of telemetry.roundTelemetry) {
        if (r.action === 'ROLLBACK') {
          logger.log(
            `  ${logger.c('red', '✖')} Round ${r.round}: Baseline Regression detected → Candidate Rolled Back (Consecutive: ${r.consecutiveRollbacks})`,
          );
        } else {
          const sign = r.resilienceGain >= 0 ? '+' : '';
          logger.log(
            `  ${logger.c('green', '✔')} Round ${r.round}: Baseline Passed | Resilience: ${r.initialResilience.toFixed(1)}% → ${r.finalResilience.toFixed(1)}% (${sign}${r.resilienceGain.toFixed(1)}%) | Action: ${logger.bold(r.action)}`,
          );
        }
      }

      logger.dim('  ─────────────────────────────────────────────────────────');
      logger.log(`  Total Rounds Executed:    ${logger.bold(String(telemetry.roundsExecuted))}`);
      logger.log(`  Total Rollbacks:         ${logger.bold(String(telemetry.rollbacks))}`);
      logger.log(`  Final Resilience:        ${logger.bold(telemetry.finalResilience.toFixed(1) + '%')}`);
      logger.log(
        `  Circuit Breaker:         ${telemetry.circuitBreakerTripped ? logger.c('red', 'TRIPPED (Halted Early)') : logger.c('green', 'NORMAL')}`,
      );
      logger.log(
        `  Convergence:             ${telemetry.converged ? logger.c('green', 'CONVERGED (100% Resilience)') : logger.dim('MAX ROUNDS REACHED')}`,
      );

      if (telemetry.stagedProposals && telemetry.stagedProposals.length > 0) {
        logger.log('');
        if (autoPromote) {
          logger.log(
            `  ${logger.c('green', '✔')} Auto-promoted ${telemetry.stagedProposals.length} proposal(s) directly into production.`,
          );
        } else {
          logger.log(
            `  ${logger.c('yellow', '⚡')} Staged ${telemetry.stagedProposals.length} EvolutionProposal(s) awaiting Human Gate approval:`,
          );
          for (const pid of telemetry.stagedProposals) {
            logger.log(`    ▸ ${logger.bold(pid)} — run: ${logger.c('cyan', `tk learn --approve ${pid}`)}`);
          }
        }
      }
      logger.log('');
    }

    return telemetry;
  } catch (err) {
    logger.err(`Co-evolution failed: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  cmdEvolve,
};
