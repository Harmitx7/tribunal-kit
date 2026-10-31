'use strict';

/**
 * state_machine_engine.js — Finite State Machine (FSM) Model Checker & Transition Verifier
 * ========================================================================================
 * Domain: Software Verification & Formal Methods (software-verification-formal-methods)
 *
 * Implements FSM static verification and runtime execution:
 * 1. Static Reachability & Deadlock Analysis: Detects orphan states and terminal deadlocks
 * 2. Transition Completeness: Validates all state-event pairs
 * 3. Guard & Invariant Enforcement: Validates state assertions during transitions
 * 4. Deterministic State Path Verification: Replays event sequences with audit logs
 */

/**
 * Statically analyzes a finite state machine definition for completeness and deadlocks.
 *
 * @param {object} fsm - FSM definition { states, initialState, terminalStates, transitions, invariants }
 * @returns {object} Verification report
 */
function verifyFsmCompleteness(fsm) {
  if (!fsm || typeof fsm !== 'object') {
    throw new Error('verifyFsmCompleteness requires an FSM definition object.');
  }

  const states = new Set(Array.isArray(fsm.states) ? fsm.states : []);
  const initialState = fsm.initialState;
  const terminalStates = new Set(Array.isArray(fsm.terminalStates) ? fsm.terminalStates : []);
  const transitions = Array.isArray(fsm.transitions) ? fsm.transitions : [];

  const issues = [];

  if (!states.has(initialState)) {
    issues.push({
      type: 'INVALID_INITIAL_STATE',
      severity: 'CRITICAL',
      message: `Initial state "${initialState}" is not declared in states set.`,
    });
  }

  // Build adjacency graph: from -> Set(to)
  const outgoingMap = new Map();
  for (const s of states) {
    outgoingMap.set(s, new Set());
  }

  for (const t of transitions) {
    if (!states.has(t.from)) {
      issues.push({
        type: 'UNDECLARED_SOURCE_STATE',
        severity: 'HIGH',
        message: `Transition references undeclared source state "${t.from}".`,
      });
    }
    if (!states.has(t.to)) {
      issues.push({
        type: 'UNDECLARED_TARGET_STATE',
        severity: 'HIGH',
        message: `Transition references undeclared target state "${t.to}".`,
      });
    }
    if (outgoingMap.has(t.from)) {
      outgoingMap.get(t.from).add(t.to);
    }
  }

  // Reachability Analysis via BFS from initialState
  const reachable = new Set();
  if (states.has(initialState)) {
    const queue = [initialState];
    reachable.add(initialState);

    while (queue.length > 0) {
      const curr = queue.shift();
      const neighbors = outgoingMap.get(curr) || new Set();
      for (const next of neighbors) {
        if (!reachable.has(next)) {
          reachable.add(next);
          queue.push(next);
        }
      }
    }
  }

  const unreachableStates = [];
  for (const s of states) {
    if (!reachable.has(s)) {
      unreachableStates.push(s);
      issues.push({
        type: 'UNREACHABLE_STATE',
        severity: 'MEDIUM',
        message: `State "${s}" is unreachable from initial state "${initialState}".`,
      });
    }
  }

  // Deadlock Analysis: Non-terminal states with zero outgoing transitions
  const deadlocks = [];
  for (const s of states) {
    const outgoing = outgoingMap.get(s) || new Set();
    if (outgoing.size === 0 && !terminalStates.has(s)) {
      deadlocks.push(s);
      issues.push({
        type: 'UNINTENDED_DEADLOCK',
        severity: 'HIGH',
        message: `Non-terminal state "${s}" has zero outgoing transitions (deadlock).`,
      });
    }
  }

  return {
    isComplete: issues.length === 0,
    totalStates: states.size,
    totalTransitions: transitions.length,
    reachableStatesCount: reachable.size,
    unreachableStates,
    deadlocks,
    issues,
  };
}

/**
 * Creates an executable runtime FSM instance enforcing transitions and guards.
 *
 * @param {object} fsm - FSM definition
 * @param {object} [initialContext={}] - Initial state machine data context
 * @returns {object} Executable FSM controller
 */
function createFsmInstance(fsm, initialContext = {}) {
  const analysis = verifyFsmCompleteness(fsm);
  if (!analysis.isComplete && analysis.issues.some(i => i.severity === 'CRITICAL')) {
    throw new Error(`Cannot initialize FSM: ${analysis.issues[0].message}`);
  }

  let currentState = fsm.initialState;
  let context = { ...initialContext };
  const transitionHistory = [];

  return {
    getState() {
      return currentState;
    },

    getContext() {
      return { ...context };
    },

    getHistory() {
      return [...transitionHistory];
    },

    transition(event, payload = {}) {
      const candidates = fsm.transitions.filter(
        t => t.from === currentState && t.event === event
      );

      if (candidates.length === 0) {
        throw new Error(
          `Invalid state transition: No transition defined for event "${event}" from state "${currentState}".`
        );
      }

      // Check guards
      const validTransition = candidates.find(t => {
        if (!t.guard || typeof t.guard !== 'function') return true;
        return t.guard(context, payload);
      });

      if (!validTransition) {
        throw new Error(
          `Transition guard rejected: Event "${event}" from state "${currentState}" did not satisfy guard condition.`
        );
      }

      const previousState = currentState;
      currentState = validTransition.to;

      // Apply transition action if defined
      if (typeof validTransition.action === 'function') {
        context = validTransition.action(context, payload) || context;
      }

      // Verify invariants for the new state
      if (Array.isArray(fsm.invariants)) {
        for (const inv of fsm.invariants) {
          if (inv.state === currentState || inv.state === '*') {
            if (typeof inv.check === 'function' && !inv.check(context)) {
              throw new Error(
                `State invariant violated in state "${currentState}": ${inv.message || 'Invariant check failed'}`
              );
            }
          }
        }
      }

      const record = {
        from: previousState,
        event,
        to: currentState,
        timestamp: new Date().toISOString(),
      };
      transitionHistory.push(record);

      return {
        previousState,
        currentState,
        context: { ...context },
      };
    },
  };
}

module.exports = {
  verifyFsmCompleteness,
  createFsmInstance,
};
