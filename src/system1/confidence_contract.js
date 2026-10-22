'use strict';

/**
 * confidence_contract.js — System-1 Phase 6 Confidence Assessment Contract
 * =========================================================================
 * Versioned schema (v1), strict allowlists, field bounds, prototype poisoning
 * defense, deterministic canonical fingerprinting, and escalation budget accounting.
 */

const crypto = require('crypto');

const CONFIDENCE_SCHEMA_VERSION = 1;

const CONFIDENCE_STATUSES = Object.freeze([
  'EVALUATED',
  'INSUFFICIENT_EVIDENCE',
]);

const CONFIDENCE_LEVELS = Object.freeze([
  'HIGH',
  'MEDIUM',
  'LOW',
  'INSUFFICIENT',
]);

const REVIEW_DEPTHS = Object.freeze([
  'STANDARD',
  'EXPANDED',
  'DEEP',
  'INSUFFICIENT_EVIDENCE',
]);

const NEXT_ACTIONS = Object.freeze([
  'CONTINUE',
  'REQUEST_EVIDENCE',
  'ADD_REVIEWER',
  'RE_RUN_REVIEWER',
  'RUN_VERIFICATION',
  'UNRESOLVED',
  'STOP',
]);

const REASON_CODES = Object.freeze([
  'FAILED_VERIFICATION',
  'REVIEWER_CONTRADICTION',
  'REVIEWER_WARNING_EXPANSION',
  'LOW_REVIEWER_AGREEMENT',
  'LOW_REVIEWER_CONFIDENCE',
  'UNRESOLVED_EVIDENCE_REQUEST',
  'STALE_EVIDENCE_RECORD',
  'UNVERIFIED_EVIDENCE_CLAIM',
  'MISSING_TEST_EVIDENCE',
  'HIGH_RISK',
  'HIGH_RISK_CHANGE',
  'SECURITY_SENSITIVE_BEHAVIOR',
  'CRITICAL_FINDINGS_SCRUTINY',
  'HIGH_AMBIGUITY',
  'CORRELATED_REVIEWERS',
  'INSUFFICIENT_EVIDENCE_BASE',
  'BUDGET_EXHAUSTED',
  'MAX_DEPTH_REACHED',
  'HIGH_CONFIDENCE_STANDARD_DEPTH',
  'MANDATORY_HIGH_RISK_SCRUTINY',
  'LOW_CONFIDENCE_DEEP_SCRUTINY',
  'MODERATE_CONFIDENCE_EXPANSION',
  'TIER_2_EXPANDED_AUDIT',
]);

const DEFAULT_ESCALATION_BUDGET = Object.freeze({
  maxRounds: 2,
  maxAdditionalReviewers: 2,
  maxAdditionalRequests: 5,
  maxTokens: 1500,
  timeoutMs: 10000,
  maxRetriesPerIssue: 2,
});

const HARD_CEILINGS = Object.freeze({
  maxRounds: 3,
  maxAdditionalReviewers: 4,
  maxAdditionalRequests: 10,
  maxTokens: 3000,
  timeoutMs: 30000,
  maxRetriesPerIssue: 3,
});

/**
 * Validates a Confidence Assessment against Schema Version 1.
 */
function validateConfidenceAssessment(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Assessment must be a non-null object' };
  }

  // Prototype poisoning protection
  const proto = Object.getPrototypeOf(raw);
  if (proto !== Object.prototype && proto !== null) {
    return { ok: false, error: 'Prototype pollution detected in confidence assessment' };
  }

  // Schema version
  if (raw.schema_version !== CONFIDENCE_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Unsupported schema_version: ${raw.schema_version}; expected ${CONFIDENCE_SCHEMA_VERSION}`,
    };
  }

  // Assessment ID
  if (typeof raw.assessment_id !== 'string' || !/^conf_[a-zA-Z0-9_-]{4,64}$/.test(raw.assessment_id)) {
    return { ok: false, error: 'Invalid assessment_id format' };
  }

  // Review Run ID
  if (typeof raw.review_run_id !== 'string' || raw.review_run_id.trim().length === 0) {
    return { ok: false, error: 'Missing or invalid review_run_id' };
  }

  // Status
  if (!CONFIDENCE_STATUSES.includes(raw.status)) {
    return { ok: false, error: `Invalid status: ${raw.status}` };
  }

  // Level
  if (!CONFIDENCE_LEVELS.includes(raw.level)) {
    return { ok: false, error: `Invalid level: ${raw.level}` };
  }

  // Score
  if (typeof raw.score !== 'number' || Number.isNaN(raw.score) || !Number.isFinite(raw.score)) {
    return { ok: false, error: 'Score must be a finite number' };
  }
  if (raw.score < 0.0 || raw.score > 1.0) {
    return { ok: false, error: `Score out of bounds [0.0, 1.0]: ${raw.score}` };
  }

  // Review Depth
  if (!REVIEW_DEPTHS.includes(raw.review_depth)) {
    return { ok: false, error: `Invalid review_depth: ${raw.review_depth}` };
  }

  // Next Action
  if (!NEXT_ACTIONS.includes(raw.next_action)) {
    return { ok: false, error: `Invalid next_action: ${raw.next_action}` };
  }

  // Reason codes
  if (!Array.isArray(raw.reason_codes)) {
    return { ok: false, error: 'reason_codes must be an array' };
  }
  for (const code of raw.reason_codes) {
    if (typeof code !== 'string' || !REASON_CODES.includes(code)) {
      return { ok: false, error: `Invalid reason_code: ${code}` };
    }
  }

  // Scope
  if (!raw.scope || typeof raw.scope !== 'object') {
    return { ok: false, error: 'Missing scope object' };
  }
  if (!Array.isArray(raw.scope.files)) {
    return { ok: false, error: 'scope.files must be an array' };
  }

  // Score components
  if (!raw.score_components || typeof raw.score_components !== 'object') {
    return { ok: false, error: 'Missing score_components object' };
  }

  // Escalation budget
  if (!raw.escalation_budget || typeof raw.escalation_budget !== 'object') {
    return { ok: false, error: 'Missing escalation_budget object' };
  }

  return { ok: true, assessment: raw };
}

/**
 * Computes a deterministic SHA-256 fingerprint for a validated Confidence Assessment.
 */
function computeConfidenceFingerprint(assessment) {
  const reasonCodesSorted = Array.isArray(assessment.reason_codes)
    ? [...assessment.reason_codes].sort()
    : [];

  const canonicalPayload = [
    assessment.schema_version,
    assessment.review_run_id,
    assessment.status,
    assessment.level,
    typeof assessment.score === 'number' ? assessment.score.toFixed(4) : '0.0000',
    assessment.review_depth,
    assessment.next_action,
    reasonCodesSorted.join('|'),
    assessment.scope?.risk_tier ?? 0,
    assessment.scope?.security_sensitive ? '1' : '0',
    assessment.escalation_budget?.current_round ?? 0,
    assessment.stopping_reason || '',
  ].join('::');

  return crypto.createHash('sha256').update(canonicalPayload, 'utf8').digest('hex');
}

/**
 * Bounded escalation budget manager tracking multi-round resources.
 */
class ConfidenceEscalationBudgetManager {
  constructor(options = {}) {
    this.maxRounds = Math.min(
      HARD_CEILINGS.maxRounds,
      Math.max(1, typeof options.maxRounds === 'number' ? options.maxRounds : DEFAULT_ESCALATION_BUDGET.maxRounds),
    );
    this.maxAdditionalReviewers = Math.min(
      HARD_CEILINGS.maxAdditionalReviewers,
      Math.max(0, typeof options.maxAdditionalReviewers === 'number' ? options.maxAdditionalReviewers : DEFAULT_ESCALATION_BUDGET.maxAdditionalReviewers),
    );
    this.maxAdditionalRequests = Math.min(
      HARD_CEILINGS.maxAdditionalRequests,
      Math.max(0, typeof options.maxAdditionalRequests === 'number' ? options.maxAdditionalRequests : DEFAULT_ESCALATION_BUDGET.maxAdditionalRequests),
    );
    this.maxTokens = Math.min(
      HARD_CEILINGS.maxTokens,
      Math.max(1, typeof options.maxTokens === 'number' ? options.maxTokens : DEFAULT_ESCALATION_BUDGET.maxTokens),
    );
    this.timeoutMs = Math.min(
      HARD_CEILINGS.timeoutMs,
      Math.max(1, typeof options.timeoutMs === 'number' ? options.timeoutMs : DEFAULT_ESCALATION_BUDGET.timeoutMs),
    );
    this.maxRetriesPerIssue = Math.min(
      HARD_CEILINGS.maxRetriesPerIssue,
      Math.max(1, typeof options.maxRetriesPerIssue === 'number' ? options.maxRetriesPerIssue : DEFAULT_ESCALATION_BUDGET.maxRetriesPerIssue),
    );

    this.currentRound = 0;
    this.additionalReviewersExecuted = 0;
    this.additionalRequestsExecuted = 0;
    this.tokensConsumed = 0;
    this.startTime = Date.now();
    this.issueRetries = new Map(); // issueKey -> count
    this.seenFingerprints = new Set();
  }

  isTimedOut() {
    return Date.now() - this.startTime >= this.timeoutMs;
  }

  canEscalate() {
    if (this.currentRound >= this.maxRounds) return false;
    if (this.isTimedOut()) return false;
    if (this.tokensConsumed >= this.maxTokens) return false;
    return true;
  }

  canAddReviewer() {
    if (!this.canEscalate()) return false;
    return this.additionalReviewersExecuted < this.maxAdditionalReviewers;
  }

  canRequestEvidence() {
    if (!this.canEscalate()) return false;
    return this.additionalRequestsExecuted < this.maxAdditionalRequests;
  }

  recordRound() {
    this.currentRound++;
    return this.currentRound <= this.maxRounds;
  }

  recordReviewerExecution() {
    if (this.additionalReviewersExecuted >= this.maxAdditionalReviewers) return false;
    this.additionalReviewersExecuted++;
    return true;
  }

  recordEvidenceRequest() {
    if (this.additionalRequestsExecuted >= this.maxAdditionalRequests) return false;
    this.additionalRequestsExecuted++;
    return true;
  }

  recordTokens(tokens) {
    if (typeof tokens === 'number' && tokens > 0) {
      this.tokensConsumed += tokens;
    }
  }

  recordIssueRetry(issueKey) {
    const current = this.issueRetries.get(issueKey) || 0;
    if (current >= this.maxRetriesPerIssue) return false;
    this.issueRetries.set(issueKey, current + 1);
    return true;
  }

  isIssueRetriesExhausted(issueKey) {
    return (this.issueRetries.get(issueKey) || 0) >= this.maxRetriesPerIssue;
  }

  recordFingerprint(fp) {
    if (this.seenFingerprints.has(fp)) return false;
    this.seenFingerprints.add(fp);
    return true;
  }

  getSnapshot() {
    return {
      current_round: this.currentRound,
      max_rounds: this.maxRounds,
      additional_reviewers_executed: this.additionalReviewersExecuted,
      max_additional_reviewers: this.maxAdditionalReviewers,
      additional_requests_executed: this.additionalRequestsExecuted,
      max_additional_requests: this.maxAdditionalRequests,
      tokens_consumed: this.tokensConsumed,
      max_tokens: this.maxTokens,
      is_timed_out: this.isTimedOut(),
      elapsed_ms: Date.now() - this.startTime,
    };
  }
}

module.exports = {
  CONFIDENCE_SCHEMA_VERSION,
  CONFIDENCE_STATUSES,
  CONFIDENCE_LEVELS,
  REVIEW_DEPTHS,
  NEXT_ACTIONS,
  REASON_CODES,
  DEFAULT_ESCALATION_BUDGET,
  HARD_CEILINGS,
  validateConfidenceAssessment,
  computeConfidenceFingerprint,
  ConfidenceEscalationBudgetManager,
};
