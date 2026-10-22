'use strict';

/**
 * evidence_request_schema.js — Versioned Evidence Request Contract & Budget Controls
 * ===================================================================================
 * Tribunal Kit System-1 — Phase 5: Reviewer Evidence Requests
 *
 * Guarantees:
 * 1. Versioned schema contract (schema_version: 1) for reviewer-driven evidence requests.
 * 2. Strict allowlists for gap categories, target types, and priorities.
 * 3. Comprehensive boundary validation rejecting control injection, path traversal,
 *    oversized payloads, and malformed symbols/ranges.
 * 4. Canonical deterministic fingerprinting for reliable duplicate detection.
 * 5. Centralized budget manager tracking per-reviewer, run-level, and target failure quotas.
 */

const crypto = require('crypto');
const { validateLexicalPath } = require('../utils/path_containment');

const EVIDENCE_REQUEST_SCHEMA_VERSION = 1;

/**
 * Permitted evidence-gap categories explaining why evidence is requested.
 */
const EVIDENCE_GAP_CATEGORIES = Object.freeze([
  'MISSING_SYMBOL_DEFINITION',
  'CALLER_CALLEE_GRAPH',
  'TEST_COVERAGE',
  'TYPE_CONTRACT',
  'CONFIGURATION_SETTING',
  'SECURITY_POLICY',
  'CROSS_FILE_REFERENCE',
  'EXISTING_EVIDENCE_LOOKUP',
]);

const VALID_CATEGORIES_SET = Object.freeze(new Set(EVIDENCE_GAP_CATEGORIES));

/**
 * Supported target types for evidence resolution.
 */
const ALLOWED_TARGET_TYPES = Object.freeze([
  'file',
  'directory',
  'symbol',
  'test',
  'configuration',
  'dependency',
  'package_metadata',
  'package metadata',
  'diff',
  'call_site',
  'call site',
  'reference',
  'documentation',
  'existing_evidence_id',
]);

const VALID_TARGET_TYPES_SET = Object.freeze(new Set(ALLOWED_TARGET_TYPES));

/**
 * Request execution statuses.
 */
const REQUEST_STATUSES = Object.freeze([
  'pending',
  'fulfilled',
  'partial',
  'duplicate',
  'unavailable',
  'rejected',
  'timed_out',
  'budget_exhausted',
]);

const VALID_PRIORITIES = Object.freeze(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']);
const VALID_PRIORITIES_SET = Object.freeze(new Set(VALID_PRIORITIES));

/**
 * Default resource quotas and hard ceilings.
 */
const DEFAULT_BUDGETS = Object.freeze({
  maxRequestsPerReviewer: 5,
  maxRequestsPerRun: 15,
  maxExpansionRounds: 2,
  maxRecordsPerRequest: 3,
  maxSourceBytes: 4000,
  maxSourceLines: 50,
  maxTokensPerRequest: 300,
  maxTokensPerReviewer: 1000,
  maxTokensPerRun: 3000,
  maxFailedAttemptsPerTarget: 2,
  timeoutMs: 5000,
});

const HARD_CEILINGS = Object.freeze({
  maxRequestsPerReviewer: 10,
  maxRequestsPerRun: 30,
  maxExpansionRounds: 3,
  maxRecordsPerRequest: 5,
  maxSourceBytes: 8000,
  maxSourceLines: 100,
  maxTokensPerRequest: 500,
  maxTokensPerReviewer: 2000,
  maxTokensPerRun: 6000,
  maxFailedAttemptsPerTarget: 4,
  timeoutMs: 15000,
});

const FORBIDDEN_CONTROL_KEYS = Object.freeze([
  'skipHumanGate',
  'requiresHumanApproval',
  'forceAllow',
  'overridePolicy',
  'policy',
  'action',
  'tier',
  '__proto__',
  'constructor',
  'prototype',
]);

const REVIEWER_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;
const SYMBOL_REGEX = /^[A-Za-z0-9_$#.:-]+$/;
const LINE_RANGE_REGEX = /^\d+(?:-\d+)?$/;

function normalizeTargetPath(target) {
  if (typeof target !== 'string') return '';
  let s = target.trim().replace(/\\/g, '/');
  s = s.replace(/^\.\//, '');
  s = s.replace(/\/+/g, '/');
  if (s.endsWith('/') && s.length > 1) s = s.slice(0, -1);
  return s;
}

/**
 * Computes a deterministic canonical fingerprint for an evidence request.
 *
 * @param {Object} req - Evidence request
 * @returns {string} SHA-256 hex digest
 */
function computeRequestFingerprint(req) {
  if (!req || typeof req !== 'object') {
    return crypto.createHash('sha256').update('invalid').digest('hex');
  }

  const reviewerId = String(req.reviewer_id || '').trim().toLowerCase();
  const target = normalizeTargetPath(String(req.target || '')).toLowerCase();
  const targetType = String(req.target_type || req.evidence_type || 'file').trim().toLowerCase();
  const category = String(req.category || '').trim().toUpperCase();
  const symbol = String(req.symbol || '').trim();
  const lines = String(req.requested_lines || '').trim();
  const evidenceIds = Array.isArray(req.evidence_ids)
    ? [...req.evidence_ids].map(String).sort().join(',')
    : '';

  const canonicalString = [
    reviewerId,
    targetType,
    target,
    category,
    symbol,
    lines,
    evidenceIds,
  ].join('::');

  return crypto.createHash('sha256').update(canonicalString, 'utf8').digest('hex');
}

/**
 * Strictly validates an incoming reviewer evidence request against schema v1.
 *
 * @param {any} rawReq - Raw request object
 * @param {Object} [context={}] - Verification context
 * @param {Set<string>|Array<string>} [context.activeReviewers] - Permitted reviewers in run
 * @param {string} [context.reviewRunId] - Expected review run correlation ID
 * @returns {{ valid: boolean, request?: Object, error?: string, code?: string }}
 */
function validateEvidenceRequest(rawReq, context = {}) {
  if (!rawReq || typeof rawReq !== 'object' || Array.isArray(rawReq)) {
    return {
      valid: false,
      error: 'Evidence request must be a non-null object.',
      code: 'INVALID_OBJECT',
    };
  }

  // 1. Control injection defense
  if (
    Object.getPrototypeOf(rawReq) !== Object.prototype &&
    Object.getPrototypeOf(rawReq) !== null
  ) {
    return {
      valid: false,
      error: 'Evidence request contains forbidden prototype manipulation.',
      code: 'CONTROL_INJECTION_DETECTED',
    };
  }

  for (const k of FORBIDDEN_CONTROL_KEYS) {
    if (
      Object.prototype.hasOwnProperty.call(rawReq, k) ||
      (k in rawReq && !Object.prototype.hasOwnProperty.call(Object.prototype, k))
    ) {
      return {
        valid: false,
        error: `Evidence request contains forbidden control key "${k}".`,
        code: 'CONTROL_INJECTION_DETECTED',
      };
    }
  }

  // 2. Schema version check
  if (rawReq.schema_version !== undefined && rawReq.schema_version !== null) {
    if (rawReq.schema_version !== EVIDENCE_REQUEST_SCHEMA_VERSION && rawReq.schema_version !== '1') {
      return {
        valid: false,
        error: `Unsupported schema_version: ${rawReq.schema_version}. Expected ${EVIDENCE_REQUEST_SCHEMA_VERSION}.`,
        code: 'UNSUPPORTED_SCHEMA_VERSION',
      };
    }
  }

  // 3. Reviewer identity validation
  const rawReviewerId = typeof rawReq.reviewer_id === 'string' ? rawReq.reviewer_id.trim() : '';
  if (!rawReviewerId || !REVIEWER_ID_REGEX.test(rawReviewerId)) {
    return {
      valid: false,
      error: `Invalid or missing reviewer_id: "${rawReq.reviewer_id}". Must match ${REVIEWER_ID_REGEX}.`,
      code: 'INVALID_REVIEWER_ID',
    };
  }

  if (context.activeReviewers) {
    const activeSet = context.activeReviewers instanceof Set
      ? context.activeReviewers
      : new Set(context.activeReviewers);
    if (!activeSet.has(rawReviewerId)) {
      return {
        valid: false,
        error: `Reviewer "${rawReviewerId}" does not belong to active review run.`,
        code: 'UNAUTHORIZED_REVIEWER',
      };
    }
  }

  // 4. Review-run correlation validation
  const rawRunId = typeof rawReq.review_run_id === 'string' ? rawReq.review_run_id.trim() : null;
  if (context.reviewRunId && rawRunId && rawRunId !== context.reviewRunId) {
    return {
      valid: false,
      error: `Mismatched review_run_id: "${rawRunId}". Expected "${context.reviewRunId}".`,
      code: 'CORRELATION_ID_MISMATCH',
    };
  }
  const reviewRunId = rawRunId || context.reviewRunId || null;

  // 5. Evidence gap category validation
  let category = 'CROSS_FILE_REFERENCE';
  if (rawReq.category !== undefined && rawReq.category !== null) {
    const rawCat = String(rawReq.category).trim().toUpperCase();
    if (!VALID_CATEGORIES_SET.has(rawCat)) {
      return {
        valid: false,
        error: `Invalid category: "${rawReq.category}". Must be one of [${EVIDENCE_GAP_CATEGORIES.join(', ')}].`,
        code: 'INVALID_CATEGORY',
      };
    }
    category = rawCat;
  } else if (rawReq.symbol) {
    category = 'MISSING_SYMBOL_DEFINITION';
  } else if (rawReq.target_type === 'test' || rawReq.evidence_type === 'test') {
    category = 'TEST_COVERAGE';
  } else if (rawReq.target_type === 'configuration' || rawReq.evidence_type === 'configuration') {
    category = 'CONFIGURATION_SETTING';
  }

  // 6. Justification / reason validation
  const rawJustification =
    typeof rawReq.justification === 'string' && rawReq.justification.trim()
      ? rawReq.justification.trim()
      : typeof rawReq.reason === 'string' && rawReq.reason.trim()
        ? rawReq.reason.trim()
        : 'Requested evidence';

  if (rawJustification.length > 500) {
    return {
      valid: false,
      error: `Justification length (${rawJustification.length}) exceeds maximum limit of 500 characters.`,
      code: 'JUSTIFICATION_TOO_LONG',
    };
  }

  // 7. Target type validation
  const rawTargetType = typeof rawReq.target_type === 'string' && rawReq.target_type.trim()
    ? rawReq.target_type.trim().toLowerCase()
    : typeof rawReq.evidence_type === 'string' && rawReq.evidence_type.trim()
      ? rawReq.evidence_type.trim().toLowerCase()
      : 'file';

  if (!VALID_TARGET_TYPES_SET.has(rawTargetType)) {
    return {
      valid: false,
      error: `Unsupported target_type: "${rawTargetType}". Allowed types: [${ALLOWED_TARGET_TYPES.join(', ')}].`,
      code: 'INVALID_TARGET_TYPE',
    };
  }

  // 8. Target path lexical validation
  const rawTarget = typeof rawReq.target === 'string' ? rawReq.target.trim() : '';
  if (!rawTarget) {
    return {
      valid: false,
      error: 'Evidence request must contain a non-empty target path or identifier.',
      code: 'MISSING_TARGET',
    };
  }
  if (rawTarget.length > 500) {
    return {
      valid: false,
      error: `Target path length (${rawTarget.length}) exceeds safe limit of 500 characters.`,
      code: 'TARGET_TOO_LONG',
    };
  }

  try {
    validateLexicalPath(rawTarget, { strictChars: true });
  } catch (pathErr) {
    return {
      valid: false,
      error: `Target path fails lexical security validation: ${pathErr.message}`,
      code: 'PATH_TRAVERSAL_DETECTED',
    };
  }

  // 9. Symbol validation (optional)
  let symbol = null;
  if (rawReq.symbol !== undefined && rawReq.symbol !== null) {
    const rawSym = String(rawReq.symbol).trim();
    if (rawSym.length > 0) {
      if (rawSym.length > 150) {
        return {
          valid: false,
          error: `Symbol name length (${rawSym.length}) exceeds maximum limit of 150 characters.`,
          code: 'SYMBOL_TOO_LONG',
        };
      }
      if (!SYMBOL_REGEX.test(rawSym)) {
        return {
          valid: false,
          error: `Malformed symbol parameter: "${rawSym}". Must match ${SYMBOL_REGEX}.`,
          code: 'MALFORMED_SYMBOL',
        };
      }
      symbol = rawSym;
    }
  }

  // 10. Requested lines validation (optional)
  let requestedLines = null;
  if (rawReq.requested_lines !== undefined && rawReq.requested_lines !== null) {
    const rawLines = String(rawReq.requested_lines).trim();
    if (rawLines.length > 0) {
      if (!LINE_RANGE_REGEX.test(rawLines)) {
        return {
          valid: false,
          error: `Malformed requested_lines parameter: "${rawLines}". Expected format: "N" or "N-M".`,
          code: 'MALFORMED_LINE_RANGE',
        };
      }
      const parts = rawLines.split('-').map(Number);
      if (parts.length === 2 && parts[0] > parts[1]) {
        return {
          valid: false,
          error: `Inverted line range: "${rawLines}". Start line cannot be greater than end line.`,
          code: 'INVERTED_LINE_RANGE',
        };
      }
      requestedLines = rawLines;
    }
  }

  // 11. Existing evidence IDs (optional)
  let evidenceIds = [];
  if (rawReq.evidence_ids !== undefined && rawReq.evidence_ids !== null) {
    if (!Array.isArray(rawReq.evidence_ids)) {
      return {
        valid: false,
        error: 'evidence_ids must be an array of strings.',
        code: 'INVALID_EVIDENCE_IDS',
      };
    }
    if (rawReq.evidence_ids.length > 10) {
      return {
        valid: false,
        error: `evidence_ids count (${rawReq.evidence_ids.length}) exceeds maximum limit of 10.`,
        code: 'TOO_MANY_EVIDENCE_IDS',
      };
    }
    evidenceIds = rawReq.evidence_ids.map(id => String(id).trim().slice(0, 100)).filter(Boolean);
  }

  // 12. Priority validation
  let priority = 'NORMAL';
  if (rawReq.priority !== undefined && rawReq.priority !== null) {
    const rawPrio = String(rawReq.priority).trim().toUpperCase();
    if (VALID_PRIORITIES_SET.has(rawPrio)) {
      priority = rawPrio;
    }
  }

  // Compute canonical fingerprint and request ID
  const normalizedCandidate = {
    reviewer_id: rawReviewerId,
    category,
    target: rawTarget,
    target_type: rawTargetType,
    symbol,
    requested_lines: requestedLines,
    evidence_ids: evidenceIds,
  };
  const fingerprint = computeRequestFingerprint(normalizedCandidate);
  const requestId = typeof rawReq.request_id === 'string' && rawReq.request_id.trim()
    ? rawReq.request_id.trim().slice(0, 64)
    : `req_${fingerprint.slice(0, 12)}`;

  const validatedRequest = {
    request_id: requestId,
    schema_version: EVIDENCE_REQUEST_SCHEMA_VERSION,
    reviewer_id: rawReviewerId,
    review_run_id: reviewRunId,
    category,
    justification: rawJustification,
    target_type: rawTargetType,
    target: rawTarget,
    symbol,
    requested_lines: requestedLines,
    evidence_ids: evidenceIds,
    evidence_type: rawTargetType,
    priority,
    status: 'pending',
    token_cost: 0,
    remaining_budget: DEFAULT_BUDGETS.maxTokensPerRequest,
    fingerprint,
    source: 'unresolved',
    reason: rawJustification,
    requested_source: rawTarget,
    requested_symbol: symbol,
    accounting: {
      token_cost: 0,
      byte_cost: 0,
      lines_retrieved: 0,
      remaining_budget: DEFAULT_BUDGETS.maxTokensPerRequest,
      retrieval_duration_ms: 0,
    },
    rejection_reason: null,
    provenance: {
      fingerprint,
      source: 'unresolved',
      timestamp: Date.now(),
    },
  };

  return {
    valid: true,
    request: validatedRequest,
  };
}

/**
 * Centrally manages resource budgets, deduplication, and loop detection for evidence requests.
 */
class EvidenceRequestBudgetManager {
  /**
   * @param {Object} [options={}] - Custom budget options (clamped to hard ceilings)
   */
  constructor(options = {}) {
    this.limits = {
      maxRequestsPerReviewer: Math.min(
        HARD_CEILINGS.maxRequestsPerReviewer,
        Math.max(1, options.maxRequestsPerReviewer || DEFAULT_BUDGETS.maxRequestsPerReviewer),
      ),
      maxRequestsPerRun: Math.min(
        HARD_CEILINGS.maxRequestsPerRun,
        Math.max(1, options.maxRequestsPerRun || DEFAULT_BUDGETS.maxRequestsPerRun),
      ),
      maxExpansionRounds: Math.min(
        HARD_CEILINGS.maxExpansionRounds,
        Math.max(1, options.maxExpansionRounds || DEFAULT_BUDGETS.maxExpansionRounds),
      ),
      maxRecordsPerRequest: Math.min(
        HARD_CEILINGS.maxRecordsPerRequest,
        Math.max(1, options.maxRecordsPerRequest || DEFAULT_BUDGETS.maxRecordsPerRequest),
      ),
      maxSourceBytes: Math.min(
        HARD_CEILINGS.maxSourceBytes,
        Math.max(100, options.maxSourceBytes || DEFAULT_BUDGETS.maxSourceBytes),
      ),
      maxSourceLines: Math.min(
        HARD_CEILINGS.maxSourceLines,
        Math.max(5, options.maxSourceLines || DEFAULT_BUDGETS.maxSourceLines),
      ),
      maxTokensPerRequest: Math.min(
        HARD_CEILINGS.maxTokensPerRequest,
        Math.max(1, options.maxTokensPerRequest !== undefined ? options.maxTokensPerRequest : DEFAULT_BUDGETS.maxTokensPerRequest),
      ),
      maxTokensPerReviewer: Math.min(
        HARD_CEILINGS.maxTokensPerReviewer,
        Math.max(1, options.maxTokensPerReviewer !== undefined ? options.maxTokensPerReviewer : DEFAULT_BUDGETS.maxTokensPerReviewer),
      ),
      maxTokensPerRun: Math.min(
        HARD_CEILINGS.maxTokensPerRun,
        Math.max(1, options.maxTokensPerRun !== undefined ? options.maxTokensPerRun : DEFAULT_BUDGETS.maxTokensPerRun),
      ),
      maxFailedAttemptsPerTarget: Math.min(
        HARD_CEILINGS.maxFailedAttemptsPerTarget,
        Math.max(1, options.maxFailedAttemptsPerTarget || DEFAULT_BUDGETS.maxFailedAttemptsPerTarget),
      ),
      timeoutMs: Math.min(
        HARD_CEILINGS.timeoutMs,
        Math.max(500, options.timeoutMs || DEFAULT_BUDGETS.timeoutMs),
      ),
    };

    this.reviewerRequestCounts = new Map();
    this.reviewerTokenCounts = new Map();
    this.reviewerRecordCounts = new Map();
    this.reviewerByteCounts = new Map();

    this.totalRequests = 0;
    this.totalTokens = 0;
    this.totalBytes = 0;

    this.targetFailureCounts = new Map();
    this.seenFingerprints = new Set();
    this.fulfilledRecordsByFingerprint = new Map();
  }

  /**
   * Checks whether a request can be executed within allocated quotas.
   *
   * @param {string} reviewerId - Reviewer identifier
   * @param {string} target - Normalized target path
   * @param {string} fingerprint - Canonical request fingerprint
   * @returns {{ allowed: boolean, reason?: string, status?: string }}
   */
  canExecute(reviewerId, target, fingerprint) {
    // 1. Check duplicate fingerprint
    if (this.seenFingerprints.has(fingerprint)) {
      return {
        allowed: false,
        status: 'duplicate',
        reason: 'Duplicate evidence request with identical canonical fingerprint.',
      };
    }

    // 2. Check target failure exhaustion (loop breaker)
    const failures = this.targetFailureCounts.get(target) || 0;
    if (failures >= this.limits.maxFailedAttemptsPerTarget) {
      return {
        allowed: false,
        status: 'unavailable',
        reason: `Target "${target}" has repeatedly failed or is unavailable (${failures} attempts).`,
      };
    }

    // 3. Check per-run total requests
    if (this.totalRequests >= this.limits.maxRequestsPerRun) {
      return {
        allowed: false,
        status: 'budget_exhausted',
        reason: `Global review run request quota (${this.limits.maxRequestsPerRun}) exhausted.`,
      };
    }

    // 4. Check per-run total tokens
    if (this.totalTokens >= this.limits.maxTokensPerRun) {
      return {
        allowed: false,
        status: 'budget_exhausted',
        reason: `Global review run token quota (${this.limits.maxTokensPerRun}) exhausted.`,
      };
    }

    // 5. Check per-reviewer requests
    const revReqs = this.reviewerRequestCounts.get(reviewerId) || 0;
    if (revReqs >= this.limits.maxRequestsPerReviewer) {
      return {
        allowed: false,
        status: 'budget_exhausted',
        reason: `Reviewer "${reviewerId}" request quota (${this.limits.maxRequestsPerReviewer}) exhausted.`,
      };
    }

    // 6. Check per-reviewer tokens
    const revTokens = this.reviewerTokenCounts.get(reviewerId) || 0;
    if (revTokens >= this.limits.maxTokensPerReviewer) {
      return {
        allowed: false,
        status: 'budget_exhausted',
        reason: `Reviewer "${reviewerId}" token budget (${this.limits.maxTokensPerReviewer}) exhausted.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Records that an attempt is underway, registering the canonical fingerprint.
   *
   * @param {string} reviewerId
   * @param {string} fingerprint
   */
  recordAttempt(reviewerId, fingerprint) {
    this.totalRequests++;
    const current = this.reviewerRequestCounts.get(reviewerId) || 0;
    this.reviewerRequestCounts.set(reviewerId, current + 1);
    this.seenFingerprints.add(fingerprint);
  }

  /**
   * Records successful evidence acquisition and accounts for consumed resources.
   *
   * @param {string} reviewerId
   * @param {string} fingerprint
   * @param {Object} metrics
   * @param {number} metrics.tokens
   * @param {number} metrics.bytes
   * @param {number} metrics.records
   * @param {Object} [metrics.evidenceItem]
   */
  recordSuccess(reviewerId, fingerprint, metrics) {
    const tokens = metrics.tokens || 0;
    const bytes = metrics.bytes || 0;
    const records = metrics.records || 1;

    this.totalTokens += tokens;
    this.totalBytes += bytes;

    const rTokens = (this.reviewerTokenCounts.get(reviewerId) || 0) + tokens;
    const rBytes = (this.reviewerByteCounts.get(reviewerId) || 0) + bytes;
    const rRecords = (this.reviewerRecordCounts.get(reviewerId) || 0) + records;

    this.reviewerTokenCounts.set(reviewerId, rTokens);
    this.reviewerByteCounts.set(reviewerId, rBytes);
    this.reviewerRecordCounts.set(reviewerId, rRecords);

    if (metrics.evidenceItem) {
      this.fulfilledRecordsByFingerprint.set(fingerprint, metrics.evidenceItem);
    }
  }

  /**
   * Records a target failure or unavailability to trigger loop prevention.
   *
   * @param {string} target
   */
  recordFailure(target) {
    if (target) {
      const current = this.targetFailureCounts.get(target) || 0;
      this.targetFailureCounts.set(target, current + 1);
    }
  }

  /**
   * Returns remaining tokens for a specific reviewer.
   *
   * @param {string} reviewerId
   * @returns {number}
   */
  getRemainingTokens(reviewerId) {
    const used = this.reviewerTokenCounts.get(reviewerId) || 0;
    return Math.max(0, this.limits.maxTokensPerReviewer - used);
  }

  /**
   * Retrieves an existing fulfilled record by fingerprint if already resolved in this run.
   *
   * @param {string} fingerprint
   * @returns {Object|null}
   */
  getFulfilledRecord(fingerprint) {
    return this.fulfilledRecordsByFingerprint.get(fingerprint) || null;
  }
}

module.exports = {
  EVIDENCE_REQUEST_SCHEMA_VERSION,
  EVIDENCE_GAP_CATEGORIES,
  ALLOWED_TARGET_TYPES,
  REQUEST_STATUSES,
  VALID_PRIORITIES,
  DEFAULT_BUDGETS,
  HARD_CEILINGS,
  FORBIDDEN_CONTROL_KEYS,
  REVIEWER_ID_REGEX,
  SYMBOL_REGEX,
  LINE_RANGE_REGEX,
  computeRequestFingerprint,
  validateEvidenceRequest,
  normalizeTargetPath,
  EvidenceRequestBudgetManager,
};
