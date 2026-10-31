'use strict';

/**
 * state_machine_engine.js — Canonical Execution State Machine & Transition Validator
 * ==================================================================================
 * Domain: Agent Runtime Reliability & Recovery (agent-runtime-reliability)
 *
 * Responsibilities:
 * 1. Maintain execution state governed by the 10 canonical lifecycle states.
 * 2. Enforce legal transition rules and fail closed on illegal transitions.
 * 3. Prevent duplicate finalization and race conditions.
 * 4. Maintain an immutable audit log of all state transitions with timestamps and causes.
 */

const {
  ExecutionRecordSchema,
  TERMINAL_STATES,
} = require('./execution_state_schemas');

class IllegalStateTransitionError extends Error {
  constructor(executionId, fromState, toState, reason) {
    super(
      `Illegal state transition for execution '${executionId}': cannot transition from '${fromState}' to '${toState}'${
        reason ? ` (${reason})` : ''
      }.`
    );
    this.name = 'IllegalStateTransitionError';
    this.executionId = executionId;
    this.fromState = fromState;
    this.toState = toState;
  }
}

const LEGAL_TRANSITIONS = {
  PENDING: new Set(['RUNNING', 'CANCELLED']),
  RUNNING: new Set([
    'SUCCEEDED',
    'FAILED',
    'TIMED_OUT',
    'CANCELLED',
    'RETRYING',
    'BLOCKED',
    'PARTIAL',
    'INTERRUPTED',
  ]),
  RETRYING: new Set(['RUNNING', 'CANCELLED', 'FAILED']),
  BLOCKED: new Set(['RUNNING', 'CANCELLED', 'FAILED']),
  INTERRUPTED: new Set(['RUNNING', 'FAILED']),
  // Terminal states have zero allowed outbound transitions
  SUCCEEDED: new Set(),
  FAILED: new Set(),
  TIMED_OUT: new Set(),
  CANCELLED: new Set(),
  PARTIAL: new Set(),
};

class StateMachineEngine {
  constructor(initialRecord) {
    const validated = ExecutionRecordSchema.parse(initialRecord);
    this.record = { ...validated };
    this.auditLog = [
      {
        fromState: null,
        toState: this.record.state,
        timestamp: this.record.createdAt,
        reason: 'Execution initialized',
        attempt: this.record.attempt,
      },
    ];
  }

  /**
   * Internal transition validator.
   */
  _transition(targetState, reason = '', error = null, failureCategory = null) {
    const currentState = this.record.state;

    // Check duplicate finalization or terminal state violation
    if (TERMINAL_STATES.has(currentState)) {
      throw new IllegalStateTransitionError(
        this.record.id,
        currentState,
        targetState,
        'Cannot transition out of a terminal state'
      );
    }

    const allowed = LEGAL_TRANSITIONS[currentState] || new Set();
    if (!allowed.has(targetState)) {
      throw new IllegalStateTransitionError(
        this.record.id,
        currentState,
        targetState,
        `Not an authorized transition in legal transition table`
      );
    }

    const now = new Date().toISOString();
    this.record.state = targetState;
    this.record.updatedAt = now;
    if (error) this.record.error = error;
    if (failureCategory) this.record.failureCategory = failureCategory;

    this.auditLog.push({
      fromState: currentState,
      toState: targetState,
      timestamp: now,
      reason,
      attempt: this.record.attempt,
      error,
      failureCategory,
    });

    return this.record;
  }

  start(reason = 'Task started') {
    return this._transition('RUNNING', reason);
  }

  complete(metadata = {}, reason = 'Task completed successfully') {
    this.record.metadata = { ...this.record.metadata, ...metadata };
    return this._transition('SUCCEEDED', reason);
  }

  fail(error, failureCategory = 'UNKNOWN', reason = 'Task failed') {
    return this._transition('FAILED', reason, error, failureCategory);
  }

  timeout(reason = 'Task deadline expired') {
    return this._transition('TIMED_OUT', reason, 'Execution timeout exceeded', 'TIMEOUT');
  }

  cancel(reason = 'Execution cancelled by caller') {
    return this._transition('CANCELLED', reason, reason, 'CANCELLED');
  }

  retry(error, failureCategory = 'TRANSIENT_NETWORK', reason = 'Retrying after transient failure') {
    if (this.record.attempt >= this.record.maxAttempts) {
      return this.fail(
        `Retry budget exhausted after ${this.record.attempt} attempts: ${error}`,
        failureCategory,
        'Retry budget exhausted'
      );
    }
    this.record.attempt += 1;
    return this._transition('RETRYING', reason, error, failureCategory);
  }

  attemptNext(reason = 'Starting retry attempt') {
    return this._transition('RUNNING', reason);
  }

  block(dependency, reason = 'Waiting on external dependency') {
    return this._transition('BLOCKED', `${reason} [${dependency}]`);
  }

  unblock(reason = 'Dependency resolved') {
    return this._transition('RUNNING', reason);
  }

  finalizePartial(findings = [], reason = 'Completed with partial findings') {
    this.record.metadata = { ...this.record.metadata, partialFindingsCount: findings.length };
    return this._transition('PARTIAL', reason);
  }

  interrupt(reason = 'Process interrupted') {
    return this._transition('INTERRUPTED', reason);
  }

  resume(reason = 'Resumed from checkpoint') {
    return this._transition('RUNNING', reason);
  }

  getState() {
    return this.record.state;
  }

  isTerminal() {
    return TERMINAL_STATES.has(this.record.state);
  }

  getRecord() {
    return { ...this.record };
  }

  getAuditLog() {
    return [...this.auditLog];
  }
}

module.exports = {
  IllegalStateTransitionError,
  LEGAL_TRANSITIONS,
  StateMachineEngine,
};
