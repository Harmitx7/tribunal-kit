'use strict';

/**
 * Tribunal-Kit Canonical Activity Types & Constants (Phase 1)
 *
 * Defines the canonical ActivityEvent contract, operational event types,
 * status enums, and renderer environment targets.
 */

const SCHEMA_VERSION = '1.0.0';

/**
 * The canonical operational events defined by the Tribunal Activity Contract.
 * Includes explicit Phase 1 types and backward-compatible operational aliases.
 */
const EVENT_TYPES = Object.freeze({
  OPERATION_STARTED: 'operation_started',
  AGENT_ACTIVATED: 'agent_activated',
  SKILL_ACTIVATED: 'skill_activated',
  ANALYSIS_STARTED: 'analysis_started',
  ANALYSIS_IN_PROGRESS: 'analysis_in_progress',
  TOOL_EXECUTION_STARTED: 'tool_execution_started',
  TOOL_EXECUTING: 'tool_executing',
  PROGRESS_UPDATED: 'progress_updated',
  TESTS_RUNNING: 'tests_running',
  EVIDENCE_COLLECTED: 'evidence_collected',
  EVIDENCE_COLLECTING: 'evidence_collecting',
  VALIDATION_PASSED: 'validation_passed',
  VALIDATION_FAILED: 'validation_failed',
  WARNING_DETECTED: 'warning_detected',
  APPROVAL_REQUIRED: 'approval_required',
  HUMAN_APPROVAL_REQUIRED: 'human_approval_required',
  OPERATION_BLOCKED: 'operation_blocked',
  RETRY_STARTED: 'retry_started',
  RETRY_IN_PROGRESS: 'retry_in_progress',
  STALL_SUSPECTED: 'stall_suspected',
  PROGRESS_BATCH: 'progress_batch',
  OPERATION_COMPLETED: 'operation_completed',
  OPERATION_CANCELLED: 'operation_cancelled',
});

/**
 * Legal status values describing observed operational reality.
 */
const STATUSES = Object.freeze({
  PENDING: 'pending',
  RUNNING: 'running',
  WAITING: 'waiting',
  PASSED: 'passed',
  FAILED: 'failed',
  WARNING: 'warning',
  BLOCKED: 'blocked',
  RETRYING: 'retrying',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});

/**
 * Operation lifecycle states.
 */
const LIFECYCLE_STATES = Object.freeze({
  PENDING: 'pending',
  RUNNING: 'running',
  WAITING: 'waiting',
  BLOCKED: 'blocked',
  RETRYING: 'retrying',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
});

/**
 * Execution states for agents and skills within an operation.
 */
const AGENT_SKILL_STATES = Object.freeze({
  SELECTED: 'selected',
  ACTIVATED: 'activated',
  EXECUTING: 'executing',
  FINISHED: 'finished',
  FAILED: 'failed',
});

/**
 * Execution states for tools within an operation.
 */
const TOOL_STATES = Object.freeze({
  STARTED: 'started',
  EXECUTING: 'executing',
  COMPLETED: 'completed',
  FAILED: 'failed',
});

/**
 * Authoritative progress and execution states (Phase 5).
 */
const PROGRESS_STATES = Object.freeze({
  QUEUED: 'queued',
  STARTING: 'starting',
  RUNNING: 'running',
  WAITING: 'waiting',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  INTERRUPTED: 'interrupted',
  UNKNOWN: 'unknown',
});

/**
 * Parallel execution aggregation policies (Phase 5).
 */
const AGGREGATION_POLICIES = Object.freeze({
  ALL_MUST_PASS: 'all_must_pass',
  PERMIT_PARTIAL_SUCCESS: 'permit_partial_success',
  ANY_PASS: 'any_pass',
});

/**
 * Event-to-status default mapping.
 */
const DEFAULT_EVENT_STATUS = Object.freeze({
  [EVENT_TYPES.OPERATION_STARTED]: STATUSES.RUNNING,
  [EVENT_TYPES.AGENT_ACTIVATED]: STATUSES.RUNNING,
  [EVENT_TYPES.SKILL_ACTIVATED]: STATUSES.RUNNING,
  [EVENT_TYPES.ANALYSIS_STARTED]: STATUSES.RUNNING,
  [EVENT_TYPES.ANALYSIS_IN_PROGRESS]: STATUSES.RUNNING,
  [EVENT_TYPES.TOOL_EXECUTION_STARTED]: STATUSES.RUNNING,
  [EVENT_TYPES.TOOL_EXECUTING]: STATUSES.RUNNING,
  [EVENT_TYPES.PROGRESS_UPDATED]: STATUSES.RUNNING,
  [EVENT_TYPES.TESTS_RUNNING]: STATUSES.RUNNING,
  [EVENT_TYPES.EVIDENCE_COLLECTED]: STATUSES.RUNNING,
  [EVENT_TYPES.EVIDENCE_COLLECTING]: STATUSES.RUNNING,
  [EVENT_TYPES.VALIDATION_PASSED]: STATUSES.PASSED,
  [EVENT_TYPES.VALIDATION_FAILED]: STATUSES.FAILED,
  [EVENT_TYPES.WARNING_DETECTED]: STATUSES.WARNING,
  [EVENT_TYPES.APPROVAL_REQUIRED]: STATUSES.BLOCKED,
  [EVENT_TYPES.HUMAN_APPROVAL_REQUIRED]: STATUSES.BLOCKED,
  [EVENT_TYPES.OPERATION_BLOCKED]: STATUSES.BLOCKED,
  [EVENT_TYPES.RETRY_STARTED]: STATUSES.RUNNING,
  [EVENT_TYPES.RETRY_IN_PROGRESS]: STATUSES.RUNNING,
  [EVENT_TYPES.STALL_SUSPECTED]: STATUSES.WARNING,
  [EVENT_TYPES.PROGRESS_BATCH]: STATUSES.RUNNING,
  [EVENT_TYPES.OPERATION_COMPLETED]: STATUSES.COMPLETED,
  [EVENT_TYPES.OPERATION_CANCELLED]: STATUSES.CANCELLED,
});

/**
 * Human-readable action verbs for concise presentation badges.
 */
const EVENT_VERBS = Object.freeze({
  [EVENT_TYPES.OPERATION_STARTED]: 'Started',
  [EVENT_TYPES.AGENT_ACTIVATED]: 'Activated',
  [EVENT_TYPES.SKILL_ACTIVATED]: 'Skill Applied',
  [EVENT_TYPES.ANALYSIS_STARTED]: 'Analyzing',
  [EVENT_TYPES.ANALYSIS_IN_PROGRESS]: 'Analyzing',
  [EVENT_TYPES.TOOL_EXECUTION_STARTED]: 'Executing',
  [EVENT_TYPES.TOOL_EXECUTING]: 'Executing',
  [EVENT_TYPES.PROGRESS_UPDATED]: 'Progress',
  [EVENT_TYPES.TESTS_RUNNING]: 'Testing',
  [EVENT_TYPES.EVIDENCE_COLLECTED]: 'Evidence Collected',
  [EVENT_TYPES.EVIDENCE_COLLECTING]: 'Collecting Evidence',
  [EVENT_TYPES.VALIDATION_PASSED]: 'Verified',
  [EVENT_TYPES.VALIDATION_FAILED]: 'Failed',
  [EVENT_TYPES.WARNING_DETECTED]: 'Warning',
  [EVENT_TYPES.APPROVAL_REQUIRED]: 'Approval Required',
  [EVENT_TYPES.HUMAN_APPROVAL_REQUIRED]: 'Approval Required',
  [EVENT_TYPES.OPERATION_BLOCKED]: 'Blocked',
  [EVENT_TYPES.RETRY_STARTED]: 'Retrying',
  [EVENT_TYPES.RETRY_IN_PROGRESS]: 'Retrying',
  [EVENT_TYPES.STALL_SUSPECTED]: 'Stall Suspected',
  [EVENT_TYPES.PROGRESS_BATCH]: 'Progress Batch',
  [EVENT_TYPES.OPERATION_COMPLETED]: 'Completed',
  [EVENT_TYPES.OPERATION_CANCELLED]: 'Cancelled',
});

const EVENT_GLYPHS = Object.freeze({
  [EVENT_TYPES.OPERATION_STARTED]: '›',
  [EVENT_TYPES.AGENT_ACTIVATED]: '›',
  [EVENT_TYPES.SKILL_ACTIVATED]: '›',
  [EVENT_TYPES.ANALYSIS_STARTED]: '›',
  [EVENT_TYPES.ANALYSIS_IN_PROGRESS]: '›',
  [EVENT_TYPES.TOOL_EXECUTION_STARTED]: '›',
  [EVENT_TYPES.TOOL_EXECUTING]: '›',
  [EVENT_TYPES.PROGRESS_UPDATED]: '›',
  [EVENT_TYPES.TESTS_RUNNING]: '›',
  [EVENT_TYPES.EVIDENCE_COLLECTED]: '›',
  [EVENT_TYPES.EVIDENCE_COLLECTING]: '›',
  [EVENT_TYPES.VALIDATION_PASSED]: '✔',
  [EVENT_TYPES.VALIDATION_FAILED]: '✖',
  [EVENT_TYPES.WARNING_DETECTED]: '⚠',
  [EVENT_TYPES.APPROVAL_REQUIRED]: '⏸',
  [EVENT_TYPES.HUMAN_APPROVAL_REQUIRED]: '⏸',
  [EVENT_TYPES.OPERATION_BLOCKED]: '⛔',
  [EVENT_TYPES.RETRY_STARTED]: '⟳',
  [EVENT_TYPES.RETRY_IN_PROGRESS]: '⟳',
  [EVENT_TYPES.STALL_SUSPECTED]: '⚠',
  [EVENT_TYPES.PROGRESS_BATCH]: '›',
  [EVENT_TYPES.OPERATION_COMPLETED]: '✔',
  [EVENT_TYPES.OPERATION_CANCELLED]: '⊘',
});

const ASCII_GLYPHS = Object.freeze({
  [EVENT_TYPES.OPERATION_STARTED]: '>',
  [EVENT_TYPES.AGENT_ACTIVATED]: '>',
  [EVENT_TYPES.SKILL_ACTIVATED]: '>',
  [EVENT_TYPES.ANALYSIS_STARTED]: '>',
  [EVENT_TYPES.ANALYSIS_IN_PROGRESS]: '>',
  [EVENT_TYPES.TOOL_EXECUTION_STARTED]: '>',
  [EVENT_TYPES.TOOL_EXECUTING]: '>',
  [EVENT_TYPES.PROGRESS_UPDATED]: '>',
  [EVENT_TYPES.TESTS_RUNNING]: '>',
  [EVENT_TYPES.EVIDENCE_COLLECTED]: '>',
  [EVENT_TYPES.EVIDENCE_COLLECTING]: '>',
  [EVENT_TYPES.VALIDATION_PASSED]: '[OK]',
  [EVENT_TYPES.VALIDATION_FAILED]: '[FAIL]',
  [EVENT_TYPES.WARNING_DETECTED]: '[WARN]',
  [EVENT_TYPES.APPROVAL_REQUIRED]: '[GATE]',
  [EVENT_TYPES.HUMAN_APPROVAL_REQUIRED]: '[GATE]',
  [EVENT_TYPES.OPERATION_BLOCKED]: '[BLOCKED]',
  [EVENT_TYPES.RETRY_STARTED]: '[RETRY]',
  [EVENT_TYPES.RETRY_IN_PROGRESS]: '[RETRY]',
  [EVENT_TYPES.STALL_SUSPECTED]: '[STALL]',
  [EVENT_TYPES.PROGRESS_BATCH]: '[BATCH]',
  [EVENT_TYPES.OPERATION_COMPLETED]: '[DONE]',
  [EVENT_TYPES.OPERATION_CANCELLED]: '[CANCEL]',
});

const ENVIRONMENTS = Object.freeze({
  MARKDOWN: 'markdown',
  TERMINAL: 'terminal',
  PLAINTEXT: 'plaintext',
  STRUCTURED: 'structured',
  JSON: 'json',
});

const ACTIVITY_STATES = Object.freeze({
  OPERATION_STARTED: 'operation_started',
  AGENT_ACTIVATED: 'agent_activated',
  SKILL_ACTIVATED: 'skill_activated',
  ANALYSIS_IN_PROGRESS: 'analysis_in_progress',
  TOOL_EXECUTING: 'tool_executing',
  TESTS_RUNNING: 'tests_running',
  EVIDENCE_COLLECTING: 'evidence_collecting',
  VALIDATION_PASSED: 'validation_passed',
  VALIDATION_FAILED: 'validation_failed',
  WARNING_DETECTED: 'warning_detected',
  HUMAN_APPROVAL_REQUIRED: 'human_approval_required',
  OPERATION_BLOCKED: 'operation_blocked',
  RETRY_IN_PROGRESS: 'retry_in_progress',
  OPERATION_COMPLETED: 'operation_completed',
  OPERATION_CANCELLED: 'operation_cancelled',
});

module.exports = {
  SCHEMA_VERSION,
  EVENT_TYPES,
  STATUSES,
  LIFECYCLE_STATES,
  PROGRESS_STATES,
  AGENT_SKILL_STATES,
  TOOL_STATES,
  AGGREGATION_POLICIES,
  DEFAULT_EVENT_STATUS,
  EVENT_VERBS,
  EVENT_GLYPHS,
  ASCII_GLYPHS,
  ENVIRONMENTS,
  // Backward-compatible aliases
  ACTIVITY_STATES,
  ACTIVITY_VERBS: EVENT_VERBS,
  ACTIVITY_GLYPHS: EVENT_GLYPHS,
};
