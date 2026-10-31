'use strict';

/**
 * Tribunal-Kit Operation Lifecycle State Machine (Phase 2)
 *
 * Implements deterministic lifecycle state transitions, transition validation,
 * and strict boundary enforcement for operational intelligence.
 *
 * States:
 *   - pending: Operation registered but not yet executing.
 *   - running: Actively executing tasks, analyses, or tools.
 *   - waiting: Paused waiting for external input, child operations, or network.
 *   - blocked: Halted on hard requirement, human gate, or unmet dependency.
 *   - retrying: Scheduled or preparing a retry attempt after transient failure.
 *   - completed: Successfully terminated (terminal).
 *   - failed: Terminated with unrecoverable failure (terminal unless retrying).
 *   - cancelled: Aborted by human operator or timeout (terminal).
 */

const { LIFECYCLE_STATES } = require('./types');

class IllegalStateTransitionError extends Error {
  constructor(fromState, toState, operationId = null, reason = null) {
    const opPart = operationId ? ` for operation '${operationId}'` : '';
    const reasonPart = reason ? `: ${reason}` : '';
    super(`Illegal lifecycle state transition${opPart} from '${fromState}' to '${toState}'${reasonPart}`);
    this.name = 'IllegalStateTransitionError';
    this.code = 'ILLEGAL_STATE_TRANSITION';
    this.fromState = fromState;
    this.toState = toState;
    this.operationId = operationId;
  }
}

/**
 * Strictly defined legal transitions between operational lifecycle states.
 */
const LIFECYCLE_TRANSITIONS = Object.freeze({
  [LIFECYCLE_STATES.PENDING]: Object.freeze([
    LIFECYCLE_STATES.PENDING,
    LIFECYCLE_STATES.RUNNING,
    LIFECYCLE_STATES.CANCELLED,
  ]),
  [LIFECYCLE_STATES.RUNNING]: Object.freeze([
    LIFECYCLE_STATES.RUNNING,
    LIFECYCLE_STATES.WAITING,
    LIFECYCLE_STATES.BLOCKED,
    LIFECYCLE_STATES.RETRYING,
    LIFECYCLE_STATES.COMPLETED,
    LIFECYCLE_STATES.FAILED,
    LIFECYCLE_STATES.CANCELLED,
  ]),
  [LIFECYCLE_STATES.WAITING]: Object.freeze([
    LIFECYCLE_STATES.WAITING,
    LIFECYCLE_STATES.RUNNING,
    LIFECYCLE_STATES.BLOCKED,
    LIFECYCLE_STATES.FAILED,
    LIFECYCLE_STATES.CANCELLED,
  ]),
  [LIFECYCLE_STATES.BLOCKED]: Object.freeze([
    LIFECYCLE_STATES.BLOCKED,
    LIFECYCLE_STATES.RUNNING,
    LIFECYCLE_STATES.FAILED,
    LIFECYCLE_STATES.CANCELLED,
  ]),
  [LIFECYCLE_STATES.RETRYING]: Object.freeze([
    LIFECYCLE_STATES.RETRYING,
    LIFECYCLE_STATES.RUNNING,
    LIFECYCLE_STATES.FAILED,
    LIFECYCLE_STATES.CANCELLED,
  ]),
  [LIFECYCLE_STATES.FAILED]: Object.freeze([
    LIFECYCLE_STATES.FAILED,
    LIFECYCLE_STATES.RETRYING, // Explicit retry initiated with new attempt context
  ]),
  [LIFECYCLE_STATES.COMPLETED]: Object.freeze([
    LIFECYCLE_STATES.COMPLETED, // Idempotent terminal confirmation
  ]),
  [LIFECYCLE_STATES.CANCELLED]: Object.freeze([
    LIFECYCLE_STATES.CANCELLED, // Idempotent terminal confirmation
  ]),
});

const TERMINAL_STATES = Object.freeze(new Set([
  LIFECYCLE_STATES.COMPLETED,
  LIFECYCLE_STATES.CANCELLED,
]));

/**
 * Checks whether transitioning from `fromState` to `toState` is legally permitted.
 *
 * @param {string} fromState
 * @param {string} toState
 * @returns {boolean}
 */
function canTransition(fromState, toState) {
  if (!fromState || !toState) return false;
  const legalTargets = LIFECYCLE_TRANSITIONS[fromState];
  if (!legalTargets) return false;
  return legalTargets.includes(toState);
}

/**
 * Asserts that transitioning from `fromState` to `toState` is legal.
 * Throws an `IllegalStateTransitionError` if the transition violates the lifecycle contract.
 *
 * @param {string} fromState
 * @param {string} toState
 * @param {string} [operationId]
 * @throws {IllegalStateTransitionError}
 */
function assertValidTransition(fromState, toState, operationId = null) {
  if (!canTransition(fromState, toState)) {
    const validTargets = LIFECYCLE_TRANSITIONS[fromState]
      ? LIFECYCLE_TRANSITIONS[fromState].join(', ')
      : 'none';
    throw new IllegalStateTransitionError(
      fromState,
      toState,
      operationId,
      `Allowed target states from '${fromState}': [${validTargets}]`
    );
  }
}

/**
 * Determines whether a lifecycle state is strictly terminal (cannot transition out).
 *
 * @param {string} state
 * @returns {boolean}
 */
function isTerminalState(state) {
  return state === LIFECYCLE_STATES.COMPLETED ||
         state === LIFECYCLE_STATES.CANCELLED;
}

/**
 * Returns the list of legal target states for a given state.
 *
 * @param {string} state
 * @returns {string[]}
 */
function getLegalNextStates(state) {
  return LIFECYCLE_TRANSITIONS[state] ? [...LIFECYCLE_TRANSITIONS[state]] : [];
}

module.exports = {
  IllegalStateTransitionError,
  LIFECYCLE_TRANSITIONS,
  TERMINAL_STATES,
  canTransition,
  assertValidTransition,
  isTerminalState,
  getLegalNextStates,
};
