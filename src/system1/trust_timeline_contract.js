'use strict';

/**
 * trust_timeline_contract.js — System-1 Phase 8 Trust Timeline Event Contracts
 * =============================================================================
 * Versioned schema (v1), strict allowlists, monotonic sequence verification,
 * tamper detection, and explainable timeline event records.
 *
 * Strictly observational and diagnostic:
 * - NO authority over Decision Plan or risk tier
 * - NO authority over reviewer selection or verdict
 * - NO Human Gate overrides
 */

const crypto = require('crypto');
const { computeSafeRepoId } = require('./drift_contract');

const TIMELINE_SCHEMA_VERSION = 1;
const MAX_STRING_LENGTH = 500;
const MAX_METADATA_KEYS = 50;
const MAX_EVENTS_PER_RUN = 500;

const EVENT_TYPES = Object.freeze([
  'REVIEW_STARTED',
  'DECISION_PLAN_CREATED',
  'REVIEWER_SELECTED',
  'REVIEWER_STARTED',
  'REVIEWER_COMPLETED',
  'REVIEWER_FAILED',
  'REVIEWER_TIMED_OUT',
  'EVIDENCE_ADDED',
  'EVIDENCE_INVALIDATED',
  'EVIDENCE_REQUESTED',
  'EVIDENCE_REQUEST_RESOLVED',
  'PROGRESSIVE_EXPANSION_TRIGGERED',
  'CONFIDENCE_ASSESSED',
  'REVIEW_DEPTH_ESCALATED',
  'VERIFICATION_COMPLETED',
  'ANOMALY_DETECTED',
  'GOVERNANCE_VERDICT_ISSUED',
  'HUMAN_APPROVAL_REQUIRED',
  'HUMAN_APPROVAL_RECORDED',
  'REVIEW_COMPLETED',
]);

const EVENT_STAGES = Object.freeze([
  'INITIALIZATION',
  'PLANNING',
  'CONTEXT_GATHERING',
  'REVIEW_EXECUTION',
  'EVIDENCE_RESOLUTION',
  'EVALUATION',
  'VERIFICATION',
  'ANOMALY_AUDIT',
  'GOVERNANCE',
  'HUMAN_GATE',
  'COMPLETION',
]);

const EVENT_STATUSES = Object.freeze([
  'INFO',
  'SUCCESS',
  'WARNING',
  'ERROR',
  'BLOCKED',
]);

const EVENT_SEVERITIES = Object.freeze([
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
]);

const EVIDENCE_TRUST_STATES = Object.freeze([
  'OBSERVED',
  'VALIDATED',
  'UNVERIFIED_CLAIM',
  'STALE',
  'INVALID',
]);

function isPlainObject(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return false;
  const proto = Object.getPrototypeOf(o);
  return proto === Object.prototype || proto === null;
}

/**
 * Deterministic canonical JSON stringifier with cycle prevention and sorted keys.
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
  const keys = Object.keys(val).filter(k => k !== 'integrity_hash' && val[k] !== undefined).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalStringify(val[k], seen)).join(',') + '}';
}

/**
 * Deterministic SHA-256 computation of a timeline event.
 */
function computeEventHash(event) {
  if (!event || typeof event !== 'object') return '';
  const json = canonicalStringify(event);
  return crypto.createHash('sha256').update(json, 'utf8').digest('hex');
}

/**
 * Validates a single TimelineEvent against Schema Version 1.
 */
function validateTimelineEvent(raw) {
  if (!isPlainObject(raw)) {
    return { ok: false, error: 'Event must be a non-null plain object (prototype pollution protected)' };
  }

  if (raw.schema_version !== TIMELINE_SCHEMA_VERSION) {
    return { ok: false, error: `Invalid schema_version: expected ${TIMELINE_SCHEMA_VERSION}` };
  }

  // Identifiers
  if (typeof raw.event_id !== 'string' || !raw.event_id.startsWith('evt_') || raw.event_id.length > MAX_STRING_LENGTH) {
    return { ok: false, error: 'Invalid event_id: must start with evt_ and not exceed maximum length' };
  }

  if (typeof raw.review_run_id !== 'string' || !raw.review_run_id.trim() || raw.review_run_id.length > MAX_STRING_LENGTH) {
    return { ok: false, error: 'Invalid review_run_id' };
  }

  // Sequence
  if (!Number.isInteger(raw.sequence) || raw.sequence < 1) {
    return { ok: false, error: 'sequence must be a positive integer >= 1' };
  }

  // Timestamps
  if (typeof raw.timestamp !== 'string') {
    return { ok: false, error: 'timestamp must be a valid ISO 8601 string' };
  }
  const parsedTime = Date.parse(raw.timestamp);
  if (isNaN(parsedTime)) {
    return { ok: false, error: 'timestamp is not a valid date string' };
  }
  if (parsedTime > Date.now() + 300000) {
    return { ok: false, error: 'Future timestamp detected (clock skew or replayed event)' };
  }

  // Recording timestamp
  if (typeof raw.recording_timestamp !== 'string' || isNaN(Date.parse(raw.recording_timestamp))) {
    return { ok: false, error: 'recording_timestamp must be a valid ISO 8601 string' };
  }

  // Enumerated fields
  if (!EVENT_TYPES.includes(raw.event_type)) {
    return { ok: false, error: `event_type must be one of: ${EVENT_TYPES.join(', ')}` };
  }

  if (!EVENT_STAGES.includes(raw.stage)) {
    return { ok: false, error: `stage must be one of: ${EVENT_STAGES.join(', ')}` };
  }

  if (!EVENT_STATUSES.includes(raw.status)) {
    return { ok: false, error: `status must be one of: ${EVENT_STATUSES.join(', ')}` };
  }

  if (!EVENT_SEVERITIES.includes(raw.severity)) {
    return { ok: false, error: `severity must be one of: ${EVENT_SEVERITIES.join(', ')}` };
  }

  if (typeof raw.source_component !== 'string' || !raw.source_component.trim() || raw.source_component.length > MAX_STRING_LENGTH) {
    return { ok: false, error: 'Invalid source_component' };
  }

  // Summary
  if (typeof raw.summary !== 'string' || !raw.summary.trim() || raw.summary.length > MAX_STRING_LENGTH) {
    return { ok: false, error: 'summary must be a non-empty string within bounds' };
  }

  // Array fields
  for (const arrField of ['reason_codes', 'evidence_refs', 'decision_refs', 'correlation_refs']) {
    if (!Array.isArray(raw[arrField])) {
      return { ok: false, error: `${arrField} must be an array` };
    }
    for (const item of raw[arrField]) {
      if (typeof item !== 'string' || item.length > MAX_STRING_LENGTH) {
        return { ok: false, error: `Elements in ${arrField} must be strings within length limits` };
      }
    }
  }

  // Metadata object
  if (!isPlainObject(raw.metadata)) {
    return { ok: false, error: 'metadata must be a plain object' };
  }
  const metaKeys = Object.keys(raw.metadata);
  if (metaKeys.length > MAX_METADATA_KEYS) {
    return { ok: false, error: `metadata exceeds maximum allowable keys (${MAX_METADATA_KEYS})` };
  }

  // Previous event hash in hash chain
  if (raw.prev_hash !== undefined) {
    if (typeof raw.prev_hash !== 'string' || !/^[0-9a-f]{64}$/.test(raw.prev_hash)) {
      return { ok: false, error: 'prev_hash must be a 64-character lowercase hex string' };
    }
  }

  // Authoritative Human Gate Verification Invariant
  if (raw.event_type === 'HUMAN_APPROVAL_RECORDED') {
    if (
      !raw.metadata ||
      typeof raw.metadata.approved_by !== 'string' ||
      !raw.metadata.approved_by.trim() ||
      typeof raw.metadata.confirmation_channel !== 'string' ||
      !raw.metadata.confirmation_channel.trim()
    ) {
      return {
        ok: false,
        error: 'HUMAN_APPROVAL_RECORDED event requires authoritative approval metadata (approved_by and confirmation_channel)',
      };
    }
  }

  // Integrity hash verification
  if (raw.integrity_hash) {
    const expectedHash = computeEventHash(raw);
    if (raw.integrity_hash !== expectedHash) {
      return { ok: false, error: 'Cryptographic integrity_hash mismatch (event tampering or corruption detected)' };
    }
  }

  return { ok: true, event: raw };
}

/**
 * Creates, formats, and seals a valid TimelineEvent.
 */
function createTimelineEvent(params = {}) {
  const timestamp = params.timestamp || new Date().toISOString();
  const recording_timestamp = params.recording_timestamp || new Date().toISOString();
  const hex = crypto.randomBytes(4).toString('hex');
  const sequence = Number.isInteger(params.sequence) ? params.sequence : 1;

  // Default prev_hash to 64 zeros for first event, or inherit supplied prev_hash
  const defaultPrevHash = sequence === 1 ? '0'.repeat(64) : '0'.repeat(64);
  const prev_hash = (typeof params.prev_hash === 'string' && /^[0-9a-f]{64}$/.test(params.prev_hash))
    ? params.prev_hash
    : defaultPrevHash;

  const event = {
    schema_version: TIMELINE_SCHEMA_VERSION,
    event_id: params.event_id || `evt_${Date.now()}_${hex}`,
    review_run_id: String(params.review_run_id || `run_${Date.now()}`).slice(0, MAX_STRING_LENGTH),
    sequence,
    prev_hash,
    timestamp,
    recording_timestamp,
    event_type: EVENT_TYPES.includes(params.event_type) ? params.event_type : 'REVIEW_STARTED',
    stage: EVENT_STAGES.includes(params.stage) ? params.stage : 'INITIALIZATION',
    status: EVENT_STATUSES.includes(params.status) ? params.status : 'INFO',
    severity: EVENT_SEVERITIES.includes(params.severity) ? params.severity : 'LOW',
    source_component: String(params.source_component || 'system').slice(0, MAX_STRING_LENGTH),
    reason_codes: Array.isArray(params.reason_codes) ? params.reason_codes.map(r => String(r).slice(0, 100)) : [],
    evidence_refs: Array.isArray(params.evidence_refs) ? params.evidence_refs.map(r => String(r).slice(0, 100)) : [],
    decision_refs: Array.isArray(params.decision_refs) ? params.decision_refs.map(r => String(r).slice(0, 100)) : [],
    correlation_refs: Array.isArray(params.correlation_refs) ? params.correlation_refs.map(r => String(r).slice(0, 100)) : [],
    summary: String(params.summary || 'Review event').slice(0, MAX_STRING_LENGTH),
    metadata: isPlainObject(params.metadata) ? { ...params.metadata } : {},
    integrity_hash: '',
  };

  event.integrity_hash = computeEventHash(event);

  const val = validateTimelineEvent(event);
  if (!val.ok) {
    throw new Error(`Failed to create valid timeline event: ${val.error}`);
  }

  return event;
}

/**
 * Validates a collection of events for a review run.
 * Checks schema validity, monotonic sequence ordering, and hash chain integrity.
 */
function validateTimeline(events) {
  if (!Array.isArray(events)) {
    return { ok: false, error: 'Timeline must be an array of events', completeness: 'CORRUPTED', has_integrity_failure: true };
  }

  if (events.length === 0) {
    return { ok: true, events: [], completeness: 'EMPTY', has_sequence_gap: false, has_integrity_failure: false };
  }

  const validated = [];
  let expectedSeq = 1;
  let hasSequenceGap = false;
  const seenEventIds = new Set();
  let prevEventHash = '0'.repeat(64);

  for (let i = 0; i < events.length; i++) {
    const raw = events[i];
    const val = validateTimelineEvent(raw);
    if (!val.ok) {
      return {
        ok: false,
        error: `Event at index ${i} failed validation: ${val.error}`,
        completeness: 'CORRUPTED',
        has_integrity_failure: true,
        has_sequence_gap: hasSequenceGap,
        events: validated,
      };
    }

    if (seenEventIds.has(raw.event_id)) {
      return {
        ok: false,
        error: `Duplicate event_id "${raw.event_id}" detected in timeline`,
        completeness: 'CORRUPTED',
        has_integrity_failure: true,
        has_sequence_gap: hasSequenceGap,
        events: validated,
      };
    }
    seenEventIds.add(raw.event_id);

    // Hash chain verification: when sequence is continuous, prev_hash must match preceding event
    if (raw.sequence !== expectedSeq) {
      hasSequenceGap = true;
    } else if (i > 0) {
      if (raw.prev_hash && raw.prev_hash !== '0'.repeat(64) && raw.prev_hash !== prevEventHash) {
        return {
          ok: false,
          error: `Hash chain broken at event sequence ${raw.sequence}: prev_hash does not match preceding event integrity_hash`,
          completeness: 'CORRUPTED',
          has_integrity_failure: true,
          has_sequence_gap: hasSequenceGap,
          events: validated,
        };
      }
    }
    prevEventHash = raw.integrity_hash;
    expectedSeq = raw.sequence + 1;

    validated.push(raw);
  }

  return {
    ok: true,
    events: validated,
    completeness: hasSequenceGap ? 'PARTIAL' : 'COMPLETE',
    has_sequence_gap: hasSequenceGap,
    has_integrity_failure: false,
  };
}

module.exports = {
  TIMELINE_SCHEMA_VERSION,
  MAX_STRING_LENGTH,
  MAX_METADATA_KEYS,
  MAX_EVENTS_PER_RUN,
  EVENT_TYPES,
  EVENT_STAGES,
  EVENT_STATUSES,
  EVENT_SEVERITIES,
  EVIDENCE_TRUST_STATES,
  computeEventHash,
  computeSafeRepoId,
  validateTimelineEvent,
  createTimelineEvent,
  validateTimeline,
};
