'use strict';

/**
 * Tribunal-Kit Progressive Disclosure & Priority Engine (Phase 10)
 *
 * Implements deterministic information tiers:
 * 1. Essential: High-level progress, state transitions, approvals, critical errors, concise outcomes.
 * 2. Expanded: Verification summaries, relevant evidence, structured stages, non-blocking warnings.
 * 3. Diagnostic: Full event sequences, stack traces, timing breakdowns, payload inspections.
 *
 * INVARIANTS:
 * - Critical failures, blocks, and human gates are NEVER hidden or suppressed across any tier.
 * - Changing from running to failed is always visibly communicated.
 * - Warnings are never silently dropped merely because similar messages appeared earlier.
 */

const {
  EVENT_TYPES,
  STATUSES,
} = require('./types');

/**
 * Supported information detail levels.
 */
const DETAIL_LEVELS = Object.freeze({
  ESSENTIAL: 'essential',
  EXPANDED: 'expanded',
  DIAGNOSTIC: 'diagnostic',
});

/**
 * Information priority tiers.
 */
const PRIORITY_LEVELS = Object.freeze({
  CRITICAL: 'critical', // P0: Blocking errors, validation failures, gates, stalls
  HIGH: 'high',         // P1: Warnings, operation completion, cancellations
  MEDIUM: 'medium',     // P2: Milestone transitions, verifications, activations
  LOW: 'low',           // P3: Routine tool executions, intermediate progress ticks
});

/**
 * Event types that have CRITICAL priority (never hidden in any mode).
 */
const CRITICAL_EVENT_TYPES = Object.freeze(new Set([
  EVENT_TYPES.VALIDATION_FAILED,
  EVENT_TYPES.OPERATION_BLOCKED,
  EVENT_TYPES.APPROVAL_REQUIRED,
  EVENT_TYPES.HUMAN_APPROVAL_REQUIRED,
  EVENT_TYPES.STALL_SUSPECTED,
]));

/**
 * Event types that have HIGH priority.
 */
const HIGH_PRIORITY_EVENT_TYPES = Object.freeze(new Set([
  EVENT_TYPES.WARNING_DETECTED,
  EVENT_TYPES.OPERATION_COMPLETED,
  EVENT_TYPES.OPERATION_CANCELLED,
]));

/**
 * Event types that have MEDIUM priority.
 */
const MEDIUM_PRIORITY_EVENT_TYPES = Object.freeze(new Set([
  EVENT_TYPES.OPERATION_STARTED,
  EVENT_TYPES.AGENT_ACTIVATED,
  EVENT_TYPES.SKILL_ACTIVATED,
  EVENT_TYPES.ANALYSIS_STARTED,
  EVENT_TYPES.VALIDATION_PASSED,
  EVENT_TYPES.RETRY_STARTED,
  EVENT_TYPES.RETRY_IN_PROGRESS,
]));

/**
 * Resolves a normalized detail level from options or flags.
 *
 * @param {Object} [options]
 * @returns {'essential' | 'expanded' | 'diagnostic'}
 */
function resolveDetailLevel(options = {}) {
  if (options.detailLevel && typeof options.detailLevel === 'string') {
    const lvl = options.detailLevel.toLowerCase();
    if (lvl === DETAIL_LEVELS.ESSENTIAL || lvl === DETAIL_LEVELS.EXPANDED || lvl === DETAIL_LEVELS.DIAGNOSTIC) {
      return lvl;
    }
  }

  // Check verbosity / debug flags
  if (options.verbose || options.debug || options.verbosity === 'verbose' || options.verbosity === 'diagnostic') {
    return DETAIL_LEVELS.DIAGNOSTIC;
  }
  if (options.expanded || options.verbosity === 'expanded') {
    return DETAIL_LEVELS.EXPANDED;
  }
  if (options.essential || options.quiet || options.verbosity === 'essential' || options.verbosity === 'quiet') {
    return DETAIL_LEVELS.ESSENTIAL;
  }

  // Default to expanded for completions and verifications if not specified
  if (options.isCompletion || options.isSummary) {
    return DETAIL_LEVELS.EXPANDED;
  }

  // Default interactive mode: essential
  return DETAIL_LEVELS.ESSENTIAL;
}

/**
 * Evaluates the priority level of an activity event.
 *
 * @param {Object} event
 * @returns {'critical' | 'high' | 'medium' | 'low'}
 */
function getEventPriority(event) {
  if (!event || typeof event !== 'object') {
    return PRIORITY_LEVELS.LOW;
  }

  // If event has an explicit error or failure status, it is critical
  if (event.error || event.status === STATUSES.FAILED || event.status === STATUSES.BLOCKED) {
    return PRIORITY_LEVELS.CRITICAL;
  }

  if (CRITICAL_EVENT_TYPES.has(event.eventType)) {
    return PRIORITY_LEVELS.CRITICAL;
  }

  if (HIGH_PRIORITY_EVENT_TYPES.has(event.eventType)) {
    return PRIORITY_LEVELS.HIGH;
  }

  if (MEDIUM_PRIORITY_EVENT_TYPES.has(event.eventType)) {
    return PRIORITY_LEVELS.MEDIUM;
  }

  // Progress check: terminal progress (100% or current === total) promotes to MEDIUM
  if (event.progress && typeof event.progress === 'object') {
    if (
      event.progress.percentage === 100 ||
      (event.progress.current !== null && event.progress.current === event.progress.total)
    ) {
      return PRIORITY_LEVELS.MEDIUM;
    }
  }

  return PRIORITY_LEVELS.LOW;
}

/**
 * Determines whether an activity event should be presented given the current detail level.
 *
 * @param {Object} event
 * @param {'essential' | 'expanded' | 'diagnostic'} [detailLevel]
 * @param {Object} [options]
 * @returns {{ visible: boolean, reason: string, priority: string }}
 */
function shouldDisplayEvent(event, detailLevel = DETAIL_LEVELS.ESSENTIAL, options = {}) {
  const priority = getEventPriority(event);

  // Forced visibility bypasses tier checks (unless explicitly suppressed)
  if (options.force) {
    return { visible: true, reason: 'forced', priority };
  }

  // INVARIANT 1: Critical events are NEVER suppressed across any tier
  if (priority === PRIORITY_LEVELS.CRITICAL) {
    return { visible: true, reason: 'critical_invariant', priority };
  }

  // INVARIANT 2: Diagnostic level shows all events
  if (detailLevel === DETAIL_LEVELS.DIAGNOSTIC) {
    return { visible: true, reason: 'diagnostic_level', priority };
  }

  // High priority events (warnings, completions, cancellations) are always visible
  if (priority === PRIORITY_LEVELS.HIGH) {
    return { visible: true, reason: 'high_priority', priority };
  }

  // Expanded level shows Medium and High priority events, and compacts Low priority
  if (detailLevel === DETAIL_LEVELS.EXPANDED) {
    return { visible: true, reason: 'expanded_level', priority };
  }

  // Essential level (interactive/default):
  if (detailLevel === DETAIL_LEVELS.ESSENTIAL) {
    if (priority === PRIORITY_LEVELS.MEDIUM) {
      // Primary lifecycle milestones (start, verified, agent activation) are visible
      return { visible: true, reason: 'essential_milestone', priority };
    }

    // Low priority events (e.g. intermediate progress ticks, sub-tool invocations) are suppressed
    // or consolidated in essential mode
    return { visible: false, reason: 'suppressed_essential', priority };
  }

  return { visible: true, reason: 'default_fallback', priority };
}

module.exports = {
  DETAIL_LEVELS,
  PRIORITY_LEVELS,
  CRITICAL_EVENT_TYPES,
  HIGH_PRIORITY_EVENT_TYPES,
  MEDIUM_PRIORITY_EVENT_TYPES,
  resolveDetailLevel,
  getEventPriority,
  shouldDisplayEvent,
};

