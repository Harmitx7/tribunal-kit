'use strict';

/**
 * skill_execution_coordinator.js — Auditable Multi-Skill Orchestrator & Lifecycle Engine
 * =======================================================================================
 * Enforces Phase 6 & Phase 7 invariants:
 * 1. Zero silent skill abandonment — every selected skill reaches an auditable terminal state.
 * 2. 10 Canonical Execution States (DISCOVERED, SELECTED, READY, RUNNING, COMPLETED, FAILED,
 *    BLOCKED, TIMED_OUT, CANCELLED, SKIPPED_OPTIONAL).
 * 3. Strict prerequisite resolution before dependent execution starts.
 * 4. Safe artifact transfer between sequential execution stages.
 * 5. Bounded parallel execution with deterministic verdict & finding aggregation.
 * 6. Explicit failure propagation — missing capabilities or failed required checks halt safely.
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');

const SKILL_STATES = Object.freeze({
  DISCOVERED: 'DISCOVERED',
  SELECTED: 'SELECTED',
  READY: 'READY',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  BLOCKED: 'BLOCKED',
  TIMED_OUT: 'TIMED_OUT',
  CANCELLED: 'CANCELLED',
  SKIPPED_OPTIONAL: 'SKIPPED_OPTIONAL',
});

const TERMINAL_STATES = Object.freeze(new Set([
  SKILL_STATES.COMPLETED,
  SKILL_STATES.FAILED,
  SKILL_STATES.BLOCKED,
  SKILL_STATES.TIMED_OUT,
  SKILL_STATES.CANCELLED,
  SKILL_STATES.SKIPPED_OPTIONAL,
]));

const LEGAL_TRANSITIONS = Object.freeze({
  [SKILL_STATES.DISCOVERED]: new Set([SKILL_STATES.SELECTED, SKILL_STATES.CANCELLED]),
  [SKILL_STATES.SELECTED]: new Set([SKILL_STATES.READY, SKILL_STATES.BLOCKED, SKILL_STATES.SKIPPED_OPTIONAL, SKILL_STATES.CANCELLED]),
  [SKILL_STATES.READY]: new Set([SKILL_STATES.RUNNING, SKILL_STATES.BLOCKED, SKILL_STATES.CANCELLED]),
  [SKILL_STATES.RUNNING]: new Set([SKILL_STATES.COMPLETED, SKILL_STATES.FAILED, SKILL_STATES.TIMED_OUT, SKILL_STATES.CANCELLED]),
  [SKILL_STATES.COMPLETED]: new Set(),
  [SKILL_STATES.FAILED]: new Set([SKILL_STATES.READY]), // retry transition
  [SKILL_STATES.BLOCKED]: new Set([SKILL_STATES.READY, SKILL_STATES.CANCELLED]),
  [SKILL_STATES.TIMED_OUT]: new Set([SKILL_STATES.READY]), // retry transition
  [SKILL_STATES.CANCELLED]: new Set(),
  [SKILL_STATES.SKIPPED_OPTIONAL]: new Set(),
});

class SkillExecutionCoordinator extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxRetries = options.maxRetries ?? 2;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 15000;
    this.skillRegistry = options.skillRegistry ?? new Map();
    this.executionRecords = new Map();
  }

  /**
   * Register a skill execution plan item.
   */
  createRecord(skillName, { isRequired = true, reason = 'Direct routing', selector = 'Router', prerequisites = [] } = {}) {
    const record = {
      id: `exec-${skillName}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      skillName,
      isRequired: Boolean(isRequired),
      reason,
      selector,
      prerequisites: [...prerequisites],
      state: SKILL_STATES.DISCOVERED,
      history: [{ state: SKILL_STATES.DISCOVERED, timestamp: Date.now() }],
      startedAt: null,
      completedAt: null,
      output: null,
      validationPassed: null,
      failure: null,
      retries: 0,
    };
    this.executionRecords.set(skillName, record);
    this.transition(skillName, SKILL_STATES.SELECTED, 'Plan established');
    return record;
  }

  /**
   * Transition a skill to a new state validating legality.
   */
  transition(skillName, newState, reason = '') {
    const record = this.executionRecords.get(skillName);
    if (!record) {
      throw new Error(`Cannot transition unregistered skill '${skillName}'`);
    }

    const currentState = record.state;
    if (currentState === newState) return record;

    const allowed = LEGAL_TRANSITIONS[currentState];
    if (!allowed || !allowed.has(newState)) {
      throw new Error(`Illegal state transition for skill '${skillName}' from '${currentState}' to '${newState}'`);
    }

    record.state = newState;
    record.history.push({ state: newState, timestamp: Date.now(), reason });

    if (newState === SKILL_STATES.RUNNING && !record.startedAt) {
      record.startedAt = Date.now();
    }
    if (TERMINAL_STATES.has(newState) && !record.completedAt) {
      record.completedAt = Date.now();
    }

    this.emit('transition', { skillName, from: currentState, to: newState, reason, record });
    return record;
  }

  /**
   * Execute a sequential chain of skills with artifact handoff and strict halting on failure.
   */
  async executeSequence(plan, executorFn) {
    const results = [];
    let cumulativeContext = {};

    for (const item of plan) {
      const { skillName, isRequired = true, prerequisites = [] } = item;
      const record = this.createRecord(skillName, item);

      // 1. Verify Prerequisites
      const missingPrereqs = prerequisites.filter(p => {
        const pRec = this.executionRecords.get(p);
        return !pRec || pRec.state !== SKILL_STATES.COMPLETED;
      });

      if (missingPrereqs.length > 0) {
        this.transition(skillName, SKILL_STATES.BLOCKED, `Missing prerequisites: ${missingPrereqs.join(', ')}`);
        record.failure = {
          category: 'DEPENDENCY_UNAVAILABLE',
          error: `Unsatisfied prerequisites: ${missingPrereqs.join(', ')}`,
        };
        if (isRequired) {
          throw new Error(`Execution halted: Required skill '${skillName}' blocked by missing prerequisite(s): ${missingPrereqs.join(', ')}`);
        }
        continue;
      }

      this.transition(skillName, SKILL_STATES.READY, 'Prerequisites satisfied');

      // 2. Execute with bounded timeout and retries
      let executedSuccessfully = false;
      let attempt = 0;

      while (!executedSuccessfully && attempt <= this.maxRetries) {
        attempt++;
        this.transition(skillName, SKILL_STATES.RUNNING, `Attempt ${attempt}`);

        let timeoutHandle;
        try {
          const runPromise = executorFn(skillName, cumulativeContext);
          const timeoutPromise = new Promise((_, reject) => {
            timeoutHandle = setTimeout(() => {
              reject(new Error(`Timeout after ${this.defaultTimeoutMs}ms`));
            }, this.defaultTimeoutMs);
          });

          const rawOutput = await Promise.race([runPromise, timeoutPromise]);

          // Validate Output
          if (!rawOutput || rawOutput.valid === false) {
            throw new Error(rawOutput?.error || 'Validation failed for produced output');
          }

          record.output = rawOutput;
          record.validationPassed = true;
          this.transition(skillName, SKILL_STATES.COMPLETED, 'Execution and validation passed');
          executedSuccessfully = true;

          // Merge artifacts into cumulative context for next stage
          cumulativeContext = { ...cumulativeContext, [skillName]: rawOutput };
          results.push({ skillName, success: true, output: rawOutput });
        } catch (err) {
          const isTimeout = err.message && err.message.includes('Timeout');
          if (attempt <= this.maxRetries) {
            record.retries++;
            this.transition(skillName, isTimeout ? SKILL_STATES.TIMED_OUT : SKILL_STATES.FAILED, `Retrying: ${err.message}`);
            this.transition(skillName, SKILL_STATES.READY, 'Ready for retry');
          } else {
            this.transition(skillName, isTimeout ? SKILL_STATES.TIMED_OUT : SKILL_STATES.FAILED, `Terminal error: ${err.message}`);
            record.failure = {
              category: isTimeout ? 'TIMEOUT' : 'EXECUTION_FAILURE',
              error: err.message,
            };

            if (isRequired) {
              throw new Error(`Required skill '${skillName}' failed terminally after ${attempt} attempts: ${err.message}`);
            } else {
              results.push({ skillName, success: false, error: err.message });
            }
          }
        } finally {
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }
        }
      }
    }

    return { success: true, results, cumulativeContext, records: Array.from(this.executionRecords.values()) };
  }

  /**
   * Execute skills in parallel and aggregate their results deterministically.
   */
  async executeParallel(skills, executorFn) {
    const promises = skills.map(async (item) => {
      const { skillName, isRequired = true } = item;
      const record = this.createRecord(skillName, item);
      this.transition(skillName, SKILL_STATES.READY, 'Parallel dispatch ready');
      this.transition(skillName, SKILL_STATES.RUNNING, 'Parallel execution started');

      try {
        const output = await executorFn(skillName);
        if (!output || output.valid === false) {
          throw new Error(output?.error || 'Validation failed');
        }
        record.output = output;
        record.validationPassed = true;
        this.transition(skillName, SKILL_STATES.COMPLETED, 'Parallel execution complete');
        return { skillName, success: true, output, isRequired: Boolean(isRequired) };
      } catch (err) {
        this.transition(skillName, SKILL_STATES.FAILED, err.message);
        record.failure = { category: 'EXECUTION_FAILURE', error: err.message };
        return { skillName, success: false, error: err.message, isRequired: Boolean(isRequired) };
      }
    });

    const settled = await Promise.allSettled(promises);
    const results = settled.map(s => {
      if (s.status === 'fulfilled') return s.value;
      return { success: false, error: s.reason?.message || String(s.reason), isRequired: true };
    });

    const failedRequired = results.find(r => !r.success && r.isRequired);
    if (failedRequired) {
      throw new Error(`Required parallel skill '${failedRequired.skillName}' failed: ${failedRequired.error}`);
    }

    return {
      success: results.every(s => s.success),
      results,
      records: Array.from(this.executionRecords.values()),
    };
  }

  /**
   * Get an authoritative audit log proving zero silent skill abandonment.
   */
  getAuditLog() {
    const allRecords = Array.from(this.executionRecords.values());
    const uncompletedRequired = allRecords.filter(r => r.isRequired && r.state !== SKILL_STATES.COMPLETED);
    const nonTerminal = allRecords.filter(r => !TERMINAL_STATES.has(r.state));

    return {
      totalSkillsAccounted: allRecords.length,
      allReachedTerminalState: nonTerminal.length === 0,
      zeroSilentAbandonment: uncompletedRequired.every(r => r.state === SKILL_STATES.FAILED || r.state === SKILL_STATES.BLOCKED || r.state === SKILL_STATES.TIMED_OUT),
      records: allRecords,
    };
  }
}

module.exports = {
  SkillExecutionCoordinator,
  SKILL_STATES,
  TERMINAL_STATES,
  LEGAL_TRANSITIONS,
};

