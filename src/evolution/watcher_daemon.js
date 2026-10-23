'use strict';

/**
 * watcher_daemon.js — Continuous Autonomous Assurance & Watcher Daemon
 * =====================================================================
 * Phase 4 RSIE: Autonomous Assurance & Continuous Self-Improvement
 *
 * Provides background surveillance and event-driven self-improvement:
 * 1. Surveillance: Continuously monitors Negative CBR buffers, test failure
 *    artifacts, and review rejection logs for emerging vulnerabilities.
 * 2. Rate-Limiting & Cooldown: Enforces configurable cooldown periods (default: 30s)
 *    to prevent mutation thrashing.
 * 3. Meta-Assurance Governance: Interlocks with MetaAssuranceEngine to strictly
 *    halt mutation dispatch whenever the emergency circuit breaker is TRIPPED.
 * 4. Process Lifecycle: Maintains PID tracking (.agent/data/rsi_watcher.pid) and
 *    graceful teardown for daemonized execution.
 */

const fs = require('fs');
const path = require('path');
const { MetaAssuranceEngine } = require('./meta_assurance');
const { CoEvolutionEngine } = require('./coevolution_engine');
const { getCorpusScenarios } = require('../../benchmarks/corpus/index');
const { loadRejections } = require('./negative_memory');

const DEFAULT_WATCHER_CONFIG = Object.freeze({
  intervalMs: 5000, // 5 second polling interval
  cooldownMs: 30000, // 30 second cooldown between co-evolution runs
  targetSkill: 'project-idioms',
});

class WatcherDaemon {
  /**
   * @param {object} [options]
   * @param {string} [options.repoRoot] - Repository root
   * @param {string} [options.agentDir] - Base agent state directory
   * @param {number} [options.intervalMs=5000]
   * @param {number} [options.cooldownMs=30000]
   * @param {string} [options.targetSkill='project-idioms']
   */
  constructor(options = {}) {
    this.repoRoot = path.resolve(options.repoRoot || process.cwd());
    this.agentDir = path.resolve(options.agentDir || path.join(this.repoRoot, '.agent'));
    this.intervalMs = Math.max(Number(options.intervalMs) || DEFAULT_WATCHER_CONFIG.intervalMs, 100);
    this.cooldownMs = Math.max(
      Number(options.cooldownMs) || DEFAULT_WATCHER_CONFIG.cooldownMs,
      500,
    );
    this.targetSkill = options.targetSkill || DEFAULT_WATCHER_CONFIG.targetSkill;

    this.metaAssurance = new MetaAssuranceEngine({ agentDir: this.agentDir });
    this.coevolution = new CoEvolutionEngine({
      repoRoot: this.repoRoot,
      agentDir: this.agentDir,
      maxRounds: 1,
      runsPerScenario: 1,
    });

    this.pidFilePath = path.join(this.agentDir, 'data', 'rsi_watcher.pid');
    this.eventsFilePath = path.join(this.agentDir, 'data', 'rsi_watcher_events.jsonl');
    this.timer = null;
    this.isRunning = false;
    this.lastTriggeredAt = null;
    this.lastRejectionCount = 0;
    this.eventsCount = 0;

    this._ensureDirs();
  }

  _ensureDirs() {
    const dataDir = path.dirname(this.pidFilePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  /**
   * Checks whether an external watcher daemon process is actively running.
   *
   * @returns {{ running: boolean, pid: number|null }}
   */
  isDaemonRunning() {
    if (!fs.existsSync(this.pidFilePath)) {
      return { running: false, pid: null };
    }

    try {
      const pidStr = fs.readFileSync(this.pidFilePath, 'utf8').trim();
      const pid = parseInt(pidStr, 10);
      if (isNaN(pid)) return { running: false, pid: null };

      // Probe process existence (signals 0 does not terminate, only verifies existence)
      process.kill(pid, 0);
      return { running: true, pid };
    } catch (_) {
      // Stale PID file
      try {
        fs.unlinkSync(this.pidFilePath);
      } catch {}
      return { running: false, pid: null };
    }
  }

  /**
   * Checks for telemetry changes that warrant an autonomous co-evolution trigger.
   *
   * @returns {{ triggered: boolean, reason: string|null, newRejections: number }}
   */
  checkTriggers() {
    const rejections = loadRejections(this.agentDir, this.targetSkill);
    const currentCount = rejections.length;

    if (currentCount > this.lastRejectionCount) {
      const diff = currentCount - this.lastRejectionCount;
      this.lastRejectionCount = currentCount;
      return {
        triggered: true,
        reason: `Discovered ${diff} new adversarial vulnerability records in Negative CBR buffer.`,
        newRejections: diff,
      };
    }

    return {
      triggered: false,
      reason: null,
      newRejections: 0,
    };
  }

  /**
   * Reads or generates baseline target skill instructions for mutation.
   *
   * @private
   * @returns {string}
   */
  _loadTargetSkillInstructions() {
    const skillPath = path.join(this.agentDir, 'skills', this.targetSkill, 'SKILL.md');
    if (fs.existsSync(skillPath)) {
      try {
        return fs.readFileSync(skillPath, 'utf8');
      } catch {}
    }

    // Default baseline skill template if skill file not on disk
    return (
      `# ${this.targetSkill} Skill\n\n` +
      `System-1 idiomatic guidelines for defensive engineering and zero-defect delivery.\n`.repeat(
        35,
      )
    );
  }

  /**
   * Logs a watcher telemetry event to JSONL.
   *
   * @private
   */
  _logEvent(event) {
    this._ensureDirs();
    const entry = {
      timestamp: new Date().toISOString(),
      targetSkill: this.targetSkill,
      ...event,
    };
    fs.appendFileSync(this.eventsFilePath, JSON.stringify(entry) + '\n', 'utf8');
    this.eventsCount++;
  }

  /**
   * Performs a single surveillance tick.
   *
   * @returns {Promise<object>}
   */
  async tick() {
    const now = Date.now();
    const trigger = this.checkTriggers();

    if (!trigger.triggered) {
      return { action: 'IDLE', reason: 'No new vulnerabilities or triggers detected.' };
    }

    // 1. Enforce cooldown period
    if (this.lastTriggeredAt && now - this.lastTriggeredAt < this.cooldownMs) {
      const remainingSec = Math.round((this.cooldownMs - (now - this.lastTriggeredAt)) / 1000);
      return {
        action: 'COOLDOWN',
        reason: `Co-evolution on cooldown (${remainingSec}s remaining).`,
      };
    }

    // 2. Enforce Meta-Assurance Circuit Breaker
    try {
      this.metaAssurance.assertMutationPermitted();
    } catch (err) {
      this._logEvent({
        action: 'CIRCUIT_BLOCKED',
        error: err.message,
      });
      return {
        action: 'CIRCUIT_BLOCKED',
        reason: err.message,
      };
    }

    // 3. Dispatch autonomous co-evolution round
    try {
      this.lastTriggeredAt = now;
      const skillText = this._loadTargetSkillInstructions();
      const corpus = getCorpusScenarios().slice(0, 5); // Fast bounded sample

      const roundResult = await this.coevolution.executeRound(
        1,
        this.targetSkill,
        skillText,
        corpus,
      );

      this._logEvent({
        action: 'COEVOLUTION_DISPATCHED',
        verdict: roundResult.verdict,
        appliedRulesCount: roundResult.appliedRules ? roundResult.appliedRules.length : 0,
        walTxId: roundResult.walTxId,
        triggerReason: trigger.reason,
      });

      return {
        action: 'DISPATCHED',
        verdict: roundResult.verdict,
        roundResult,
      };
    } catch (err) {
      this._logEvent({
        action: 'DISPATCH_ERROR',
        error: err.message,
      });
      return {
        action: 'ERROR',
        error: err.message,
      };
    }
  }

  /**
   * Starts the background observation loop.
   */
  start() {
    if (this.isRunning) return;

    const daemonStatus = this.isDaemonRunning();
    if (daemonStatus.running && daemonStatus.pid !== process.pid) {
      throw new Error(
        `Watcher daemon is already actively running under PID ${daemonStatus.pid}. Stop it first.`,
      );
    }

    this._ensureDirs();
    fs.writeFileSync(this.pidFilePath, String(process.pid), 'utf8');
    this.isRunning = true;

    // Initialize baseline rejection count
    const initialRejections = loadRejections(this.agentDir, this.targetSkill);
    this.lastRejectionCount = initialRejections.length;

    this.timer = setInterval(async () => {
      try {
        await this.tick();
      } catch (err) {
        this._logEvent({ action: 'TICK_EXCEPTION', error: err.message });
      }
    }, this.intervalMs);

    if (this.timer.unref) {
      this.timer.unref(); // Don't block event loop from exiting in tests
    }
  }

  /**
   * Stops the background observation loop and removes pidfile.
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;

    if (fs.existsSync(this.pidFilePath)) {
      try {
        fs.unlinkSync(this.pidFilePath);
      } catch {}
    }
  }

  /**
   * Returns complete daemon status.
   *
   * @returns {object}
   */
  getStatus() {
    const isDaemon = this.isDaemonRunning();
    const circuitState = this.metaAssurance.getCircuitState();

    return {
      running: this.isRunning || isDaemon.running,
      pid: isDaemon.pid || (this.isRunning ? process.pid : null),
      targetSkill: this.targetSkill,
      intervalMs: this.intervalMs,
      cooldownMs: this.cooldownMs,
      lastTriggeredAt: this.lastTriggeredAt ? new Date(this.lastTriggeredAt).toISOString() : null,
      circuitState: circuitState.circuitState,
      quarantineReason: circuitState.quarantineReason,
      eventsCount: this.eventsCount,
    };
  }
}

module.exports = {
  WatcherDaemon,
  DEFAULT_WATCHER_CONFIG,
};
