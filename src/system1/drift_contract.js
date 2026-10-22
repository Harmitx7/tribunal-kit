'use strict';

/**
 * drift_contract.js — System-1 Phase 7 Cross-Run Drift & Anomaly Contracts
 * =========================================================================
 * Versioned schema (v1), strict allowlists, field bounds, prototype poisoning
 * defense, deterministic canonical hashing, and explainable anomaly records.
 */

const crypto = require('crypto');

const DRIFT_SCHEMA_VERSION = 1;

const DRIFT_CATEGORIES = Object.freeze([
  'REVIEW_QUALITY_DRIFT',
  'REVIEWER_BEHAVIOR_DRIFT',
  'CONFIDENCE_EVIDENCE_DRIFT',
  'RESOURCE_DRIFT',
  'POLICY_EXECUTION_DRIFT',
  'VERIFICATION_DRIFT',
]);

const ANOMALY_SEVERITIES = Object.freeze([
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
]);

const ANOMALY_STATUSES = Object.freeze([
  'DETECTED',
  'INSUFFICIENT_BASELINE',
  'DISMISSED',
  'CONFIRMED',
]);

const COMPARISON_TYPES = Object.freeze([
  'FIXTURE',
  'COHORT',
  'AGGREGATE',
]);

const STATISTICAL_METHODS = Object.freeze([
  'ROBUST_Z_SCORE',
  'RATE_SHIFT',
  'DISCRETE_INVARIANT',
]);

const TOKEN_SOURCES = Object.freeze([
  'TOKENIZER',
  'PROVIDER',
  'ESTIMATED',
  'UNAVAILABLE',
]);

const RISK_LEVELS = Object.freeze(['LOW', 'MEDIUM', 'HIGH']);
const CONFIDENCE_LEVELS = Object.freeze(['HIGH', 'MEDIUM', 'LOW', 'INSUFFICIENT']);
const REVIEW_DEPTHS = Object.freeze(['STANDARD', 'EXPANDED', 'DEEP', 'INSUFFICIENT_EVIDENCE']);
const GOVERNANCE_VERDICTS = Object.freeze(['APPROVED', 'WARNING', 'REJECTED', 'ERROR', 'NEEDS_REVIEW']);

const MIN_BASELINE_SAMPLES = 5;
const MAX_RECORDS_STORED = 500;
const MAX_STORAGE_BYTES = 5 * 1024 * 1024; // 5 MB ceiling
const MAX_STRING_LENGTH = 500;

function isPlainObject(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return false;
  const proto = Object.getPrototypeOf(o);
  return proto === Object.prototype || proto === null;
}

/**
 * Recursive deterministic canonical JSON stringifier with sorted keys and cycle detection.
 */
function canonicalStringify(val, seen = new WeakSet()) {
  if (val === null || typeof val !== 'object') {
    return JSON.stringify(val);
  }
  if (seen.has(val)) {
    throw new TypeError('Cyclic reference detected in canonicalStringify');
  }
  seen.add(val);
  if (Array.isArray(val)) {
    return '[' + val.map(item => canonicalStringify(item, seen)).join(',') + ']';
  }
  const keys = Object.keys(val).filter(k => k !== 'record_hash' && val[k] !== undefined).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalStringify(val[k], seen)).join(',') + '}';
}

/**
 * Deterministic canonical SHA-256 computation of an object with sorted keys.
 */
function computeRecordHash(obj) {
  if (!obj || typeof obj !== 'object') return '';
  const json = canonicalStringify(obj);
  return crypto.createHash('sha256').update(json, 'utf8').digest('hex');
}

/**
 * Computes a safe repository identifier from a path or project name.
 */
function computeSafeRepoId(repoRootOrName) {
  if (typeof repoRootOrName !== 'string' || !repoRootOrName.trim()) {
    return 'repo_unknown';
  }
  const normalized = repoRootOrName.trim().toLowerCase().replace(/\\/g, '/');
  return 'repo_' + crypto.createHash('sha256').update(normalized, 'utf8').digest('hex').slice(0, 16);
}

/**
 * Validates a CrossRunRecord against Schema Version 1.
 */
function validateCrossRunRecord(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Record must be a non-null object' };
  }

  // Prototype pollution protection
  if (!isPlainObject(raw)) {
    return { ok: false, error: 'Prototype pollution detected in record' };
  }

  // Schema version
  if (raw.schema_version !== DRIFT_SCHEMA_VERSION) {
    return { ok: false, error: `Invalid schema_version: expected ${DRIFT_SCHEMA_VERSION}` };
  }

  // Identifiers
  if (typeof raw.record_id !== 'string' || !raw.record_id.startsWith('crr_') || raw.record_id.length > MAX_STRING_LENGTH) {
    return { ok: false, error: 'Invalid record_id: must start with crr_ and not exceed maximum length' };
  }
  if (typeof raw.review_run_id !== 'string' || !raw.review_run_id.trim() || raw.review_run_id.length > MAX_STRING_LENGTH) {
    return { ok: false, error: 'Invalid review_run_id' };
  }
  if (typeof raw.safe_repo_id !== 'string' || !raw.safe_repo_id.trim() || raw.safe_repo_id.length > MAX_STRING_LENGTH) {
    return { ok: false, error: 'Invalid safe_repo_id' };
  }

  // Timestamp & Future Replay check
  if (typeof raw.timestamp !== 'string') {
    return { ok: false, error: 'Invalid timestamp: must be valid ISO 8601 string' };
  }
  const parsedTime = Date.parse(raw.timestamp);
  if (isNaN(parsedTime)) {
    return { ok: false, error: 'Invalid timestamp: unparseable date' };
  }
  if (parsedTime > Date.now() + 300000) {
    return { ok: false, error: 'Future timestamp detected (clock skew or replayed record)' };
  }

  // Decision & Scope
  if (!isPlainObject(raw.decision)) {
    return { ok: false, error: 'Missing or invalid decision object' };
  }
  const { risk_tier, risk_level } = raw.decision;
  if (!Number.isInteger(risk_tier) || risk_tier < 0 || risk_tier > 3) {
    return { ok: false, error: 'decision.risk_tier must be an integer between 0 and 3' };
  }
  if (!RISK_LEVELS.includes(risk_level)) {
    return { ok: false, error: `decision.risk_level must be one of: ${RISK_LEVELS.join(', ')}` };
  }

  // Environment
  if (!isPlainObject(raw.environment)) {
    return { ok: false, error: 'Missing or invalid environment object' };
  }

  // Reviewers
  if (!isPlainObject(raw.reviewers)) {
    return { ok: false, error: 'Missing or invalid reviewers object' };
  }
  if (!Array.isArray(raw.reviewers.selected) || !Array.isArray(raw.reviewers.executed)) {
    return { ok: false, error: 'reviewers.selected and reviewers.executed must be arrays' };
  }

  // Findings summary
  if (!isPlainObject(raw.findings_summary)) {
    return { ok: false, error: 'Missing or invalid findings_summary object' };
  }
  const fs = raw.findings_summary;
  for (const field of ['total_count', 'critical_count', 'high_count', 'medium_count', 'low_count', 'unverified_count']) {
    if (typeof fs[field] !== 'number' || !Number.isFinite(fs[field]) || fs[field] < 0) {
      return { ok: false, error: `findings_summary.${field} must be a non-negative finite number` };
    }
  }

  // Evidence summary
  if (!isPlainObject(raw.evidence_summary)) {
    return { ok: false, error: 'Missing or invalid evidence_summary object' };
  }
  const es = raw.evidence_summary;
  for (const field of ['total_records', 'observed_count', 'validated_count', 'unverified_count', 'stale_count']) {
    if (typeof es[field] !== 'number' || !Number.isFinite(es[field]) || es[field] < 0) {
      return { ok: false, error: `evidence_summary.${field} must be a non-negative finite number` };
    }
  }

  // Confidence assessment
  if (!isPlainObject(raw.confidence_assessment)) {
    return { ok: false, error: 'Missing or invalid confidence_assessment object' };
  }
  const ca = raw.confidence_assessment;
  if (typeof ca.score !== 'number' || !Number.isFinite(ca.score) || ca.score < 0 || ca.score > 1) {
    return { ok: false, error: 'confidence_assessment.score must be a finite number between 0.0 and 1.0' };
  }
  if (!CONFIDENCE_LEVELS.includes(ca.level)) {
    return { ok: false, error: `confidence_assessment.level must be one of: ${CONFIDENCE_LEVELS.join(', ')}` };
  }
  if (!REVIEW_DEPTHS.includes(ca.review_depth)) {
    return { ok: false, error: `confidence_assessment.review_depth must be one of: ${REVIEW_DEPTHS.join(', ')}` };
  }

  // Governance outcome
  if (!isPlainObject(raw.governance_outcome)) {
    return { ok: false, error: 'Missing or invalid governance_outcome object' };
  }
  if (!GOVERNANCE_VERDICTS.includes(raw.governance_outcome.final_verdict)) {
    return { ok: false, error: `governance_outcome.final_verdict must be one of: ${GOVERNANCE_VERDICTS.join(', ')}` };
  }

  // Resources
  if (!isPlainObject(raw.resources)) {
    return { ok: false, error: 'Missing or invalid resources object' };
  }
  const res = raw.resources;
  for (const field of ['prompt_tokens', 'output_tokens', 'total_tokens', 'duration_ms']) {
    if (typeof res[field] !== 'number' || !Number.isFinite(res[field]) || res[field] < 0) {
      return { ok: false, error: `resources.${field} must be a non-negative finite number` };
    }
  }
  if (!TOKEN_SOURCES.includes(res.token_measurement_source)) {
    return { ok: false, error: `resources.token_measurement_source must be one of: ${TOKEN_SOURCES.join(', ')}` };
  }

  // Cryptographic seal check if record_hash is present
  if (raw.record_hash) {
    const expectedHash = computeRecordHash(raw);
    if (raw.record_hash !== expectedHash) {
      return { ok: false, error: 'Cryptographic record_hash mismatch (possible tampering detected)' };
    }
  }

  return { ok: true, record: raw };
}

/**
 * Validates an explainable AnomalyRecord.
 */
function validateAnomalyRecord(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Anomaly must be a non-null object' };
  }

  if (raw.schema_version !== DRIFT_SCHEMA_VERSION) {
    return { ok: false, error: `Invalid schema_version: expected ${DRIFT_SCHEMA_VERSION}` };
  }

  if (typeof raw.anomaly_id !== 'string' || !raw.anomaly_id.startsWith('anom_')) {
    return { ok: false, error: 'Invalid anomaly_id: must start with anom_' };
  }

  if (!DRIFT_CATEGORIES.includes(raw.drift_category)) {
    return { ok: false, error: `drift_category must be one of: ${DRIFT_CATEGORIES.join(', ')}` };
  }

  if (!ANOMALY_SEVERITIES.includes(raw.severity)) {
    return { ok: false, error: `severity must be one of: ${ANOMALY_SEVERITIES.join(', ')}` };
  }

  if (!ANOMALY_STATUSES.includes(raw.status)) {
    return { ok: false, error: `status must be one of: ${ANOMALY_STATUSES.join(', ')}` };
  }

  if (!raw.affected_run_id || typeof raw.affected_run_id !== 'string') {
    return { ok: false, error: 'Missing or invalid affected_run_id' };
  }

  if (!raw.comparability || typeof raw.comparability !== 'object') {
    return { ok: false, error: 'Missing comparability object' };
  }

  if (!COMPARISON_TYPES.includes(raw.comparability.comparison_type)) {
    return { ok: false, error: `comparability.comparison_type must be one of: ${COMPARISON_TYPES.join(', ')}` };
  }

  if (typeof raw.comparability.baseline_sample_size !== 'number' || raw.comparability.baseline_sample_size < 0) {
    return { ok: false, error: 'comparability.baseline_sample_size must be a non-negative number' };
  }

  if (!raw.metrics || typeof raw.metrics !== 'object') {
    return { ok: false, error: 'Missing metrics object' };
  }

  if (!STATISTICAL_METHODS.includes(raw.metrics.method)) {
    return { ok: false, error: `metrics.method must be one of: ${STATISTICAL_METHODS.join(', ')}` };
  }

  if (!Array.isArray(raw.reason_codes)) {
    return { ok: false, error: 'reason_codes must be an array' };
  }

  if (!Array.isArray(raw.supporting_record_ids)) {
    return { ok: false, error: 'supporting_record_ids must be an array' };
  }

  if (typeof raw.recommended_action !== 'string' || !raw.recommended_action.trim()) {
    return { ok: false, error: 'recommended_action must be a non-empty string' };
  }

  return { ok: true, anomaly: raw };
}

/**
 * Creates and cryptographically seals a validated CrossRunRecord.
 */
function createCrossRunRecord(params = {}) {
  const timestamp = params.timestamp || new Date().toISOString();
  const hex = crypto.randomBytes(6).toString('hex');
  const record_id = `crr_${Date.now()}_${hex}`;
  const review_run_id = params.review_run_id || `run_${Date.now()}_${hex.slice(0, 4)}`;
  const safe_repo_id = computeSafeRepoId(params.repoRoot || params.safe_repo_id || 'default');

  const record = {
    schema_version: DRIFT_SCHEMA_VERSION,
    record_id,
    review_run_id,
    safe_repo_id,
    timestamp,
    fixture_id: params.fixture_id ? String(params.fixture_id).slice(0, MAX_STRING_LENGTH) : undefined,

    decision: {
      plan_id: params.decision?.plan_id || `plan_${hex.slice(0, 4)}`,
      risk_tier: typeof params.decision?.risk_tier === 'number' ? params.decision.risk_tier : 1,
      risk_level: RISK_LEVELS.includes(params.decision?.risk_level) ? params.decision.risk_level : 'LOW',
      security_sensitive: Boolean(params.decision?.security_sensitive),
      files_count: Math.max(0, parseInt(params.decision?.files_count, 10) || 0),
      lines_changed: Math.max(0, parseInt(params.decision?.lines_changed, 10) || 0),
    },

    environment: {
      node_version: process.version,
      platform: process.platform,
      tribunal_version: '9.2.8',
      policy_hash: params.environment?.policy_hash || 'policy_default_v1',
      model_id: params.environment?.model_id ? String(params.environment.model_id).slice(0, 100) : undefined,
      prompt_version: params.environment?.prompt_version ? String(params.environment.prompt_version).slice(0, 50) : undefined,
    },

    reviewers: {
      selected: Array.isArray(params.reviewers?.selected) ? [...params.reviewers.selected] : [],
      executed: Array.isArray(params.reviewers?.executed) ? [...params.reviewers.executed] : [],
      failed: Array.isArray(params.reviewers?.failed) ? [...params.reviewers.failed] : [],
      timeouts: Array.isArray(params.reviewers?.timeouts) ? [...params.reviewers.timeouts] : [],
    },

    findings_summary: {
      total_count: Math.max(0, parseInt(params.findings_summary?.total_count, 10) || 0),
      critical_count: Math.max(0, parseInt(params.findings_summary?.critical_count, 10) || 0),
      high_count: Math.max(0, parseInt(params.findings_summary?.high_count, 10) || 0),
      medium_count: Math.max(0, parseInt(params.findings_summary?.medium_count, 10) || 0),
      low_count: Math.max(0, parseInt(params.findings_summary?.low_count, 10) || 0),
      unverified_count: Math.max(0, parseInt(params.findings_summary?.unverified_count, 10) || 0),
      finding_fingerprints: Array.isArray(params.findings_summary?.finding_fingerprints)
        ? [...params.findings_summary.finding_fingerprints]
        : [],
    },

    evidence_summary: {
      total_records: Math.max(0, parseInt(params.evidence_summary?.total_records, 10) || 0),
      observed_count: Math.max(0, parseInt(params.evidence_summary?.observed_count, 10) || 0),
      validated_count: Math.max(0, parseInt(params.evidence_summary?.validated_count, 10) || 0),
      unverified_count: Math.max(0, parseInt(params.evidence_summary?.unverified_count, 10) || 0),
      stale_count: Math.max(0, parseInt(params.evidence_summary?.stale_count, 10) || 0),
      requests_count: Math.max(0, parseInt(params.evidence_summary?.requests_count, 10) || 0),
      requests_fulfilled: Math.max(0, parseInt(params.evidence_summary?.requests_fulfilled, 10) || 0),
    },

    confidence_assessment: {
      assessment_id: params.confidence_assessment?.assessment_id || `conf_${hex.slice(0, 4)}`,
      score: typeof params.confidence_assessment?.score === 'number' && Number.isFinite(params.confidence_assessment.score)
        ? Math.max(0, Math.min(1, parseFloat(params.confidence_assessment.score.toFixed(4))))
        : 1.0,
      level: CONFIDENCE_LEVELS.includes(params.confidence_assessment?.level) ? params.confidence_assessment.level : 'HIGH',
      review_depth: REVIEW_DEPTHS.includes(params.confidence_assessment?.review_depth)
        ? params.confidence_assessment.review_depth
        : 'STANDARD',
      next_action: String(params.confidence_assessment?.next_action || 'STOP').slice(0, 50),
      reason_codes: Array.isArray(params.confidence_assessment?.reason_codes)
        ? [...params.confidence_assessment.reason_codes]
        : [],
      escalation_rounds: Math.max(0, parseInt(params.confidence_assessment?.escalation_rounds, 10) || 0),
    },

    governance_outcome: {
      final_verdict: GOVERNANCE_VERDICTS.includes(params.governance_outcome?.final_verdict)
        ? params.governance_outcome.final_verdict
        : 'APPROVED',
      requires_human_approval: Boolean(params.governance_outcome?.requires_human_approval),
      human_override: params.governance_outcome?.human_override ? Boolean(params.governance_outcome.human_override) : undefined,
    },

    resources: {
      prompt_tokens: Math.max(0, parseInt(params.resources?.prompt_tokens, 10) || 0),
      output_tokens: Math.max(0, parseInt(params.resources?.output_tokens, 10) || 0),
      total_tokens: Math.max(0, parseInt(params.resources?.total_tokens, 10) || 0),
      token_measurement_source: TOKEN_SOURCES.includes(params.resources?.token_measurement_source)
        ? params.resources.token_measurement_source
        : 'TOKENIZER',
      duration_ms: Math.max(0, parseFloat(Number(params.resources?.duration_ms || 0).toFixed(2))),
    },

    record_hash: '',
  };

  record.record_hash = computeRecordHash(record);

  const validation = validateCrossRunRecord(record);
  if (!validation.ok) {
    throw new Error(`Generated cross-run record failed schema validation: ${validation.error}`);
  }

  return record;
}

module.exports = {
  DRIFT_SCHEMA_VERSION,
  DRIFT_CATEGORIES,
  ANOMALY_SEVERITIES,
  ANOMALY_STATUSES,
  COMPARISON_TYPES,
  STATISTICAL_METHODS,
  TOKEN_SOURCES,
  MIN_BASELINE_SAMPLES,
  MAX_RECORDS_STORED,
  MAX_STORAGE_BYTES,
  MAX_STRING_LENGTH,
  computeRecordHash,
  computeSafeRepoId,
  validateCrossRunRecord,
  validateAnomalyRecord,
  createCrossRunRecord,
};
