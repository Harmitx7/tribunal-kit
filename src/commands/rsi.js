'use strict';

/**
 * rsi.js — Recursive Self-Improvement Engine (RSIE) CLI
 * =====================================================
 * Phase 4 RSIE: Autonomous Assurance & Continuous Self-Improvement
 *
 * Implements the unified `tk rsi` CLI command surface:
 * - tk rsi status [--json]
 * - tk rsi run [target-skill] [--rounds=N]
 * - tk rsi watch [--interval=N] [--stop] [--status]
 * - tk rsi rollback <txId>
 * - tk rsi unfreeze [--reason=...]
 * - tk rsi freeze [--reason=...]
 */

const fs = require('fs');
const path = require('path');
const { color, bold, dim, RGB, GLYPHS, renderBanner, renderPanel } = require('../tui');
const { MetaAssuranceEngine } = require('../evolution/meta_assurance');
const { WatcherDaemon } = require('../evolution/watcher_daemon');
const { WalTransactionManager } = require('../evolution/wal_transaction_manager');
const { CoEvolutionEngine } = require('../evolution/coevolution_engine');
const { getCorpusScenarios } = require('../../benchmarks/corpus/index');
const { loadRejections } = require('../evolution/negative_memory');
const { loadEvolutionProposals } = require('../evolution/engine');

async function cmdRsi(flags, processArgs = [], quiet = false) {
  const targetDir = flags.path ? path.resolve(flags.path) : process.cwd();
  const agentDest = path.join(targetDir, '.agent');
  const PKG = require('../../package.json');

  if (!quiet && !flags.json) {
    renderBanner(PKG.version, false);
  }

  const rawArgs = processArgs.slice(3);
  const subCommand = (rawArgs[0] || 'status').toLowerCase();

  const metaAssurance = new MetaAssuranceEngine({ agentDir: agentDest });
  const wal = new WalTransactionManager({ agentDir: agentDest });
  const watcher = new WatcherDaemon({ repoRoot: targetDir, agentDir: agentDest });

  switch (subCommand) {
    case 'status': {
      const health = metaAssurance.evaluateHealth();
      const daemonStatus = watcher.isDaemonRunning();
      const scenarios = getCorpusScenarios();
      const rejections = loadRejections(agentDest);
      const proposals = loadEvolutionProposals(agentDest);
      const pendingProposals = proposals.filter(p => p.status === 'PENDING');

      // Check baseline report if exists
      const baselineReportPath = path.join(targetDir, '.tribunal', 'evals', 'baseline_report.json');
      let baselineReport = null;
      if (fs.existsSync(baselineReportPath)) {
        try {
          baselineReport = JSON.parse(fs.readFileSync(baselineReportPath, 'utf8'));
        } catch {}
      }

      const baselineSummary = baselineReport
        ? baselineReport.summary || baselineReport
        : null;

      const statusData = {
        vault: {
          scenariosLoaded: scenarios.length,
          baselineCertified: baselineSummary
            ? baselineSummary.verdict === 'BENCHMARK_VAULT_CERTIFIED' ||
              baselineSummary.overallVerdict === 'BENCHMARK_VAULT_CERTIFIED'
            : false,
          safePassRate: baselineSummary ? baselineSummary.safePassRate : null,
          unsafeLeakRate: baselineSummary
            ? baselineSummary.unsafePassRate !== undefined
              ? baselineSummary.unsafePassRate
              : baselineSummary.unsafeLeakRate
            : null,
        },
        metaAssurance: {
          circuitState: health.circuitState,
          healthy: health.healthy,
          rollbackRatio: health.rollbackRatio,
          windowCount: health.windowCount,
          abortCount: health.abortCount,
          commitCount: health.commitCount,
          quarantineReason: health.quarantineReason,
        },
        watcherDaemon: {
          running: daemonStatus.running,
          pid: daemonStatus.pid,
        },
        negativeMemory: {
          recordedVulnerabilities: rejections.length,
        },
        proposals: {
          total: proposals.length,
          pendingHumanGate: pendingProposals.length,
        },
      };

      if (flags.json) {
        console.log(JSON.stringify(statusData, null, 2));
        return statusData;
      }

      const g = GLYPHS;
      const vaultBadge = statusData.vault.baselineCertified
        ? `${color(RGB.EMERALD, g.success)} ${bold(color(RGB.EMERALD, '[CERTIFIED]'))}`
        : `${color(RGB.AMBER, '⚠')} ${bold(color(RGB.AMBER, '[INITIALIZING]'))}`;

      const circuitBadge = health.circuitState === 'CLOSED'
        ? `${color(RGB.EMERALD, g.success)} ${bold(color(RGB.EMERALD, '[CLOSED · Healthy]'))}`
        : `${color(RGB.ROSE, g.failure)} ${bold(color(RGB.ROSE, '[TRIPPED · Quarantine]'))}`;

      const watcherBadge = daemonStatus.running
        ? `${color(RGB.EMERALD, g.success)} ${bold(color(RGB.EMERALD, `[RUNNING · PID ${daemonStatus.pid}]`))}`
        : `${color(RGB.AMBER, '○')} ${dim('[STOPPED]')}`;

      const rsiLines = [
        `  ${bold(color(RGB.WHITE, 'Benchmark Vault'))}         ${vaultBadge} ${dim(`(${scenarios.length} scenarios across 4 categories)`)}`,
      ];
      if (statusData.vault.safePassRate !== null) {
        rsiLines.push(`    Safe Proposal Pass:     ${color(RGB.CYAN, (statusData.vault.safePassRate * 100).toFixed(1) + '%')}`);
        rsiLines.push(`    Unsafe Proposal Leak:   ${color(RGB.CYAN, (statusData.vault.unsafeLeakRate * 100).toFixed(1) + '%')}`);
      }
      rsiLines.push('');
      rsiLines.push(`  ${bold(color(RGB.WHITE, 'Circuit Breaker'))}         ${circuitBadge}`);
      rsiLines.push(`    Rollback Ratio:         ${color(RGB.CYAN, (health.rollbackRatio * 100).toFixed(1) + '%')} ${dim(`(${health.abortCount} aborts / ${health.windowCount} txs)`)}`);
      if (health.quarantineReason) {
        rsiLines.push(`    Quarantine Note:        ${color(RGB.ROSE, health.quarantineReason)}`);
      }
      rsiLines.push('');
      rsiLines.push(`  ${bold(color(RGB.WHITE, 'Watcher Daemon'))}          ${watcherBadge}`);
      rsiLines.push(`    Negative CBR Memory:    ${color(RGB.CYAN, String(rejections.length))} recorded attack vectors`);
      rsiLines.push(`    Staged Proposals:       ${color(RGB.CYAN, String(pendingProposals.length))} awaiting Human Gate sign-off`);

      renderPanel('RSIE Autonomous Assurance Telemetry', rsiLines, {
        accessory: health.circuitState === 'CLOSED' ? '[NOMINAL]' : '[ALERT]',
        borderColor: health.circuitState === 'CLOSED' ? RGB.SLATE_700 : RGB.ROSE,
        titleColor: health.circuitState === 'CLOSED' ? RGB.WHITE : RGB.ROSE,
      });

      return statusData;
    }

    case 'run': {
      const targetSkill = rawArgs[1] || flags.target || 'project-idioms';
      const rounds = Number(flags.rounds) || 1;

      console.log(`  ${bold('🚀 Dispatching Co-Evolution Round for:')} ${color(RGB.CYAN, targetSkill)}`);

      // Check circuit breaker first
      try {
        metaAssurance.assertMutationPermitted();
      } catch (err) {
        console.error(`  ${color(RGB.ROSE, GLYPHS.failure)} ${bold('Cannot execute mutation:')} ${err.message}`);
        return { error: err.message, status: 'BLOCKED' };
      }

      const engine = new CoEvolutionEngine({
        repoRoot: targetDir,
        agentDir: agentDest,
        maxRounds: rounds,
        runsPerScenario: 1,
      });

      const skillPath = path.join(agentDest, 'skills', targetSkill, 'SKILL.md');
      let skillText = '';
      if (fs.existsSync(skillPath)) {
        skillText = fs.readFileSync(skillPath, 'utf8');
      } else {
        skillText =
          `# ${targetSkill} Skill\n\n` +
          `Defensive engineering guidelines and architectural invariant rules for robust delivery.\n`.repeat(
            50,
          );
      }

      const corpus = getCorpusScenarios().slice(0, 5);
      const result = await engine.executeRound(1, targetSkill, skillText, corpus);

      if (flags.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`    Verdict:             ${result.verdict === 'SUCCESS' ? color(RGB.EMERALD, 'SUCCESS') : color(RGB.ROSE, 'FAILED')}`);
        console.log(`    Adversarial Probes:  ${result.adversarialFindings}`);
        console.log(`    Rules Synthesized:   ${result.appliedRules ? result.appliedRules.length : 0}`);
        console.log(`    WAL Transaction:     ${color(RGB.CYAN, result.walTxId || 'none')}`);
        if (result.proposalId) {
          console.log(`    Proposal Staged:     ${color(RGB.EMERALD, result.proposalId)} (Pending Human Gate)`);
        }
        if (result.error) {
          console.log(`    Failure Reason:      ${color(RGB.ROSE, result.error)}`);
        }
      }
      return result;
    }

    case 'watch': {
      if (flags.stop) {
        watcher.stop();
        console.log(`  ${color(RGB.EMERALD, GLYPHS.success)} Watcher daemon stopped.`);
        return { stopped: true };
      }

      if (flags.status) {
        const status = watcher.getStatus();
        if (flags.json) {
          console.log(JSON.stringify(status, null, 2));
        } else {
          console.log(`  Watcher Daemon Status: ${status.running ? color(RGB.EMERALD, `RUNNING (PID ${status.pid})`) : dim('STOPPED')}`);
        }
        return status;
      }

      // Start daemon
      watcher.start();
      console.log(`  ${color(RGB.EMERALD, GLYPHS.success)} ${bold('Watcher daemon started')} under PID ${process.pid}`);
      console.log(`  ${dim('Surveillance active: polling Negative CBR and test telemetry every 5s.')}`);
      return { started: true, pid: process.pid };
    }

    case 'rollback': {
      const txId = rawArgs[1] || flags.tx;
      if (!txId) {
        console.error(`  ${color(RGB.ROSE, GLYPHS.failure)} Usage: tk rsi rollback <txId>`);
        return { error: 'Missing txId' };
      }

      const res = wal.rollbackTransaction(txId, 'Manual operator rollback via tk rsi rollback');
      console.log(`  ${color(RGB.EMERALD, GLYPHS.success)} Rolled back transaction ${color(RGB.CYAN, txId)}: state=${res.state}`);
      return res;
    }

    case 'unfreeze': {
      const reason = flags.reason || rawArgs.slice(1).join(' ') || 'Manual operator audit and unfreeze';
      const state = metaAssurance.resetCircuitBreaker(reason);
      console.log(`  ${color(RGB.EMERALD, GLYPHS.success)} ${bold('Circuit Breaker RESET')}: state=${state.circuitState}`);
      return state;
    }

    case 'freeze': {
      const reason = flags.reason || rawArgs.slice(1).join(' ') || 'Manual operator emergency freeze';
      const state = metaAssurance.tripCircuitBreaker(reason);
      console.log(`  ${color(RGB.ROSE, GLYPHS.failure)} ${bold('Circuit Breaker TRIPPED')}: state=${state.circuitState} (Quarantine active)`);
      return state;
    }

    default:
      console.log(`  Unknown subcommand: ${subCommand}`);
      console.log(`  Available commands: status, run, watch, rollback, unfreeze, freeze`);
      return { error: 'Unknown subcommand' };
  }
}

module.exports = {
  cmdRsi,
};
