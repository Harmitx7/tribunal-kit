'use strict';

/**
 * Tribunal-Kit Announcement Intelligence Engine (Phase 4)
 *
 * Implements centralized announcement decision logic, operation-scoped deduplication,
 * execution state differentiation, and context-aware filtering to eliminate
 * generic status noise across supported AI chat environments.
 */

const {
  EVENT_TYPES,
  AGENT_SKILL_STATES,
} = require('./types');

/**
 * Announcement decision verdicts.
 */
const ANNOUNCEMENT_DECISIONS = Object.freeze({
  ANNOUNCE: 'announce',
  SUPPRESS: 'suppress',
  DEFER: 'defer',
});

/**
 * Concrete reasons for announcement decisions.
 */
const ANNOUNCEMENT_REASONS = Object.freeze({
  FIRST_ACTIVATION: 'first_activation',
  STATE_TRANSITION: 'state_transition',
  RETRY_ATTEMPT: 'retry_attempt',
  PROGRESS_MILESTONE: 'progress_milestone',
  DUPLICATE_SUPPRESSED: 'duplicate_suppressed',
  INTERNAL_CANDIDATE: 'internal_candidate',
  NO_PROGRESS_DELTA: 'no_progress_delta',
  TERMINAL_OUTCOME: 'terminal_outcome',
});

/**
 * Operation-scoped announcement deduplicator.
 * Ensures announcements are deduplicated within an operation attempt without
 * leaking state across independent concurrent operations.
 */
class AnnouncementDeduplicator {
  constructor(operationId) {
    this.operationId = operationId;
    this.announcedAgents = new Set();
    this.announcedSkills = new Set();
    this.lastAttempt = 1;
    this.lastProgressSignature = null;
    this.lastToolSignature = null;
    this.emittedEventTypes = new Set();
  }

  /**
   * Resets attempt-scoped announcement caches when a new retry attempt begins.
   */
  resetForAttempt(newAttempt) {
    this.announcedAgents.clear();
    this.announcedSkills.clear();
    this.lastAttempt = newAttempt;
    this.lastProgressSignature = null;
    this.lastToolSignature = null;
  }

  /**
   * Evaluates whether an event warrants a visible announcement.
   *
   * @param {Object} event - Canonical ActivityEvent
   * @param {Object} [options]
   * @returns {{ verdict: string, reason: string }}
   */
  evaluate(event, options = {}) {
    if (options.force) {
      return { verdict: ANNOUNCEMENT_DECISIONS.ANNOUNCE, reason: 'forced' };
    }

    // 1. Detect retry attempt boundary
    if (event.attempt && event.attempt > this.lastAttempt) {
      this.resetForAttempt(event.attempt);
    }

    // 2. Candidate / Dry-run consideration is internal
    if (event.executionState === AGENT_SKILL_STATES.SELECTED || event.metadata?.dryRun) {
      return {
        verdict: ANNOUNCEMENT_DECISIONS.SUPPRESS,
        reason: ANNOUNCEMENT_REASONS.INTERNAL_CANDIDATE,
      };
    }

    // 3. Agent Activation Deduplication
    if (event.eventType === EVENT_TYPES.AGENT_ACTIVATED && event.agent) {
      if (this.announcedAgents.has(event.agent)) {
        return {
          verdict: ANNOUNCEMENT_DECISIONS.SUPPRESS,
          reason: ANNOUNCEMENT_REASONS.DUPLICATE_SUPPRESSED,
        };
      }
      this.announcedAgents.add(event.agent);
      return {
        verdict: ANNOUNCEMENT_DECISIONS.ANNOUNCE,
        reason: event.attempt && event.attempt > 1
          ? ANNOUNCEMENT_REASONS.RETRY_ATTEMPT
          : ANNOUNCEMENT_REASONS.FIRST_ACTIVATION,
      };
    }

    // 4. Skill Activation Deduplication
    if (event.eventType === EVENT_TYPES.SKILL_ACTIVATED && event.skill) {
      if (this.announcedSkills.has(event.skill)) {
        return {
          verdict: ANNOUNCEMENT_DECISIONS.SUPPRESS,
          reason: ANNOUNCEMENT_REASONS.DUPLICATE_SUPPRESSED,
        };
      }
      this.announcedSkills.add(event.skill);
      return {
        verdict: ANNOUNCEMENT_DECISIONS.ANNOUNCE,
        reason: ANNOUNCEMENT_REASONS.FIRST_ACTIVATION,
      };
    }

    // 5. Tool Execution Deduplication
    if (event.eventType === EVENT_TYPES.TOOL_EXECUTING || event.eventType === EVENT_TYPES.TOOL_EXECUTION_STARTED) {
      const toolSig = `${event.title}::${event.summary || ''}`;
      if (toolSig === this.lastToolSignature && !event.progress) {
        return {
          verdict: ANNOUNCEMENT_DECISIONS.SUPPRESS,
          reason: ANNOUNCEMENT_REASONS.DUPLICATE_SUPPRESSED,
        };
      }
      this.lastToolSignature = toolSig;
      return {
        verdict: ANNOUNCEMENT_DECISIONS.ANNOUNCE,
        reason: ANNOUNCEMENT_REASONS.STATE_TRANSITION,
      };
    }

    // 6. Progress Deduplication (suppress zero-delta ticks)
    if (event.eventType === EVENT_TYPES.PROGRESS_UPDATED && event.progress) {
      const progSig = `${event.progress.current}/${event.progress.total}::${event.progress.percentage}`;
      if (progSig === this.lastProgressSignature) {
        return {
          verdict: ANNOUNCEMENT_DECISIONS.SUPPRESS,
          reason: ANNOUNCEMENT_REASONS.NO_PROGRESS_DELTA,
        };
      }
      this.lastProgressSignature = progSig;
      return {
        verdict: ANNOUNCEMENT_DECISIONS.ANNOUNCE,
        reason: ANNOUNCEMENT_REASONS.PROGRESS_MILESTONE,
      };
    }

    // 7. Critical State Transitions & Terminal Outcomes (ALWAYS ANNOUNCE)
    const alwaysAnnounceTypes = [
      EVENT_TYPES.OPERATION_STARTED,
      EVENT_TYPES.VALIDATION_PASSED,
      EVENT_TYPES.VALIDATION_FAILED,
      EVENT_TYPES.WARNING_DETECTED,
      EVENT_TYPES.APPROVAL_REQUIRED,
      EVENT_TYPES.HUMAN_APPROVAL_REQUIRED,
      EVENT_TYPES.OPERATION_BLOCKED,
      EVENT_TYPES.RETRY_STARTED,
      EVENT_TYPES.RETRY_IN_PROGRESS,
      EVENT_TYPES.OPERATION_COMPLETED,
      EVENT_TYPES.OPERATION_CANCELLED,
    ];

    if (alwaysAnnounceTypes.includes(event.eventType)) {
      return {
        verdict: ANNOUNCEMENT_DECISIONS.ANNOUNCE,
        reason: ANNOUNCEMENT_REASONS.TERMINAL_OUTCOME,
      };
    }

    return {
      verdict: ANNOUNCEMENT_DECISIONS.ANNOUNCE,
      reason: ANNOUNCEMENT_REASONS.STATE_TRANSITION,
    };
  }
}

/**
 * Announcement Intelligence Coordinator.
 * Manages operation-scoped deduplicators and announcement policies.
 */
class AnnouncementIntelligence {
  constructor() {
    this.deduplicators = new Map();
  }

  /**
   * Retrieves or initializes an AnnouncementDeduplicator for an operation.
   */
  getDeduplicator(operationId) {
    if (!operationId) {
      return new AnnouncementDeduplicator('global_default');
    }
    if (!this.deduplicators.has(operationId)) {
      this.deduplicators.set(operationId, new AnnouncementDeduplicator(operationId));
    }
    return this.deduplicators.get(operationId);
  }

  /**
   * Evaluates an event against the announcement intelligence policy.
   *
   * @param {Object} event
   * @param {Object} [options]
   * @returns {{ shouldAnnounce: boolean, verdict: string, reason: string }}
   */
  evaluate(event, options = {}) {
    if (!event || typeof event !== 'object') {
      return { shouldAnnounce: false, verdict: ANNOUNCEMENT_DECISIONS.SUPPRESS, reason: 'invalid_event' };
    }

    const deduplicator = this.getDeduplicator(event.operationId);
    const decision = deduplicator.evaluate(event, options);

    return {
      shouldAnnounce: decision.verdict === ANNOUNCEMENT_DECISIONS.ANNOUNCE,
      verdict: decision.verdict,
      reason: decision.reason,
    };
  }

  /**
   * Cleans up deduplication state for a terminated operation.
   */
  cleanup(operationId) {
    this.deduplicators.delete(operationId);
  }

  /**
   * Resets all announcement states (for test isolation).
   */
  reset() {
    this.deduplicators.clear();
  }
}

const defaultAnnouncementIntelligence = new AnnouncementIntelligence();

module.exports = {
  ANNOUNCEMENT_DECISIONS,
  ANNOUNCEMENT_REASONS,
  AnnouncementDeduplicator,
  AnnouncementIntelligence,
  defaultAnnouncementIntelligence,
};

