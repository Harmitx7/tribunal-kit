'use strict';

/**
 * Tribunal-Kit Activity Contract & Data Integrity Engine (Phase 1)
 *
 * Enforces the canonical ActivityEvent contract, runtime validation,
 * evidence integrity invariants, caller object immutability,
 * and secret-safe sanitization.
 */

const {
  SCHEMA_VERSION,
  EVENT_TYPES,
  STATUSES,
  DEFAULT_EVENT_STATUS,
} = require('./types');

class ActivityValidationError extends Error {
  constructor(errors = []) {
    const message = `ActivityEvent validation failed:\n  - ${errors.join('\n  - ')}`;
    super(message);
    this.name = 'ActivityValidationError';
    this.code = 'ACTIVITY_VALIDATION_ERROR';
    this.errors = errors;
  }
}

// ── Identifier and Date Validation Helpers ────────────────────────────────────

const ID_PATTERN = /^[a-zA-Z0-9_\-\.]{3,64}$/;

function isValidId(val) {
  return typeof val === 'string' && ID_PATTERN.test(val);
}

function isValidIsoDate(str) {
  if (typeof str !== 'string' || str.length < 10) return false;
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return false;
  return str.includes('T') || str.includes('-');
}

function deepClone(obj, seen = new WeakMap()) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (seen.has(obj)) return seen.get(obj);

  if (obj instanceof Error) {
    const errClone = new (obj.constructor || Error)(obj.message);
    seen.set(obj, errClone);
    if (obj.stack) errClone.stack = obj.stack;
    if (obj.code) errClone.code = obj.code;
    if (obj.suggestion) errClone.suggestion = obj.suggestion;
    for (const [k, v] of Object.entries(obj)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      errClone[k] = deepClone(v, seen);
    }
    return errClone;
  }

  if (Array.isArray(obj)) {
    const arr = [];
    seen.set(obj, arr);
    for (let i = 0; i < obj.length; i++) {
      arr[i] = deepClone(obj[i], seen);
    }
    return arr;
  }

  const cloned = {};
  seen.set(obj, cloned);
  for (const [k, v] of Object.entries(obj)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    cloned[k] = deepClone(v, seen);
  }
  return cloned;
}

// ── Secret Redaction ─────────────────────────────────────────────────────────

const SECRET_PATTERNS = [
  { pattern: /\b(sk-[A-Za-z0-9_\-]{16,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_\-]{20,}|(sk_live_|sk_test_|pk_live_|pk_test_|api_key_|key_)[A-Za-z0-9_\-]{8,})\b/g, label: '[REDACTED_API_KEY]' },
  { pattern: /Bearer\s+[A-Za-z0-9\-_.~+/]{20,}/gi, label: 'Bearer [REDACTED_TOKEN]' },
  { pattern: /eyJ[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}/g, label: '[REDACTED_JWT]' },
  { pattern: /-----BEGIN\s+([A-Z0-9_\-]+\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+([A-Z0-9_\-]+\s+)?PRIVATE\s+KEY-----/g, label: '[REDACTED_PRIVATE_KEY]' },
  { pattern: /(postgres|postgresql|mysql|mongodb|redis|amqp):\/\/[^\s"'`]+/gi, label: '[REDACTED_DB_URL]' },
  { pattern: /(https?:\/\/[^\s\/?#:]+):([^\s\/?#]+)@([a-zA-Z0-9_\-\.]+)/gi, label: '$1:[REDACTED_PASSWORD]@$3' },
  { pattern: /\b(xox[baprs]-[A-Za-z0-9\-]{10,})\b/g, label: '[REDACTED_SLACK_TOKEN]' },
  { pattern: /\bAKIA[A-Z0-9]{16}\b/g, label: '[REDACTED_AWS_KEY]' },
  { pattern: /(aws_secret_access_key|aws_session_token)\s*[:=]\s*["']?(?!\[REDACTED_)[A-Za-z0-9/+=]{40}["']?/gi, label: '$1: [REDACTED_AWS_SECRET]' },
  { pattern: /(password|passwd|secret|token|api_key|apikey|auth_token|access_token|private_key)\s*[:=]\s*["']?(?!\[REDACTED_)[^\s"'`]{8,}["']?/gi, label: '$1: [REDACTED_SECRET]' },
];

const SECRET_TRIGGER_PATTERN = /sk-|ghp_|github_pat_|sk_|pk_|[bB]earer|eyJ|-----BEGIN|:\/\/|xox[baprs]|AKIA|aws_|pass|secret|token|key|auth/i;

function redactSecrets(input, seen = new WeakSet(), memo = new WeakMap()) {
  if (typeof input === 'string') {
    if (input.length < 8 || !SECRET_TRIGGER_PATTERN.test(input)) {
      return input;
    }
    let sanitized = input;
    for (const { pattern, label } of SECRET_PATTERNS) {
      sanitized = sanitized.replace(pattern, label);
    }
    return sanitized;
  }
  if (input instanceof Error) {
    if (seen.has(input)) return '[Circular]';
    if (memo.has(input)) return memo.get(input);
    seen.add(input);
    const errClone = new (input.constructor || Error)(redactSecrets(input.message, seen, memo));
    memo.set(input, errClone);
    if (input.stack) errClone.stack = redactSecrets(input.stack, seen, memo);
    if (input.code) errClone.code = input.code;
    if (input.suggestion) errClone.suggestion = redactSecrets(input.suggestion, seen, memo);
    for (const [k, v] of Object.entries(input)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      errClone[k] = redactSecrets(v, seen, memo);
    }
    seen.delete(input);
    return errClone;
  }
  if (Array.isArray(input)) {
    if (seen.has(input)) return '[Circular]';
    if (memo.has(input)) return memo.get(input);
    seen.add(input);
    const arr = [];
    memo.set(input, arr);
    for (let i = 0; i < input.length; i++) {
      arr.push(redactSecrets(input[i], seen, memo));
    }
    seen.delete(input);
    return arr;
  }
  if (input !== null && typeof input === 'object') {
    if (seen.has(input)) return '[Circular]';
    if (memo.has(input)) return memo.get(input);
    seen.add(input);
    const res = {};
    memo.set(input, res);
    for (const [k, v] of Object.entries(input)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      res[k] = redactSecrets(v, seen, memo);
    }
    seen.delete(input);
    return res;
  }
  return input;
}

/**
 * Returns a new sanitized clone of an event with secrets redacted from presentation fields,
 * leaving caller's original event completely unmodified.
 */
function sanitizeActivityEvent(event) {
  const cloned = deepClone(event);
  if (cloned.title) cloned.title = redactSecrets(cloned.title);
  if (cloned.summary) cloned.summary = redactSecrets(cloned.summary);
  if (cloned.evidence) cloned.evidence = redactSecrets(cloned.evidence);
  if (cloned.error) cloned.error = redactSecrets(cloned.error);
  if (cloned.warning) cloned.warning = redactSecrets(cloned.warning);
  if (cloned.nextAction) cloned.nextAction = redactSecrets(cloned.nextAction);
  if (Array.isArray(cloned.reportReferences)) {
    cloned.reportReferences = cloned.reportReferences.map(redactSecrets);
  }
  return cloned;
}

// ── Validation Logic ─────────────────────────────────────────────────────────

function validateActivityEvent(event) {
  const errors = [];

  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    return { valid: false, errors: ['ActivityEvent must be a non-null object'] };
  }

  // 1. Schema Version
  if (event.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`Unsupported or missing schemaVersion: expected '${SCHEMA_VERSION}', received '${event.schemaVersion}'`);
  }

  // 2. Identifiers
  if (!isValidId(event.eventId)) {
    errors.push(`Invalid eventId: must match /^[a-zA-Z0-9_\\-\\.]{3,64}$/, received '${event.eventId}'`);
  }
  if (!isValidId(event.operationId)) {
    errors.push(`Invalid operationId: must match /^[a-zA-Z0-9_\\-\\.]{3,64}$/, received '${event.operationId}'`);
  }

  // 3. Event Type & Status
  const validEventTypes = Object.values(EVENT_TYPES);
  if (!validEventTypes.includes(event.eventType)) {
    errors.push(`Invalid eventType: '${event.eventType}'. Must be one of: ${validEventTypes.join(', ')}`);
  }

  const validStatuses = Object.values(STATUSES);
  if (!validStatuses.includes(event.status)) {
    errors.push(`Invalid status: '${event.status}'. Must be one of: ${validStatuses.join(', ')}`);
  }

  // 4. Title
  if (typeof event.title !== 'string' || event.title.trim().length === 0) {
    errors.push('Title is required and must be a non-empty string');
  } else if (event.title.length > 200) {
    errors.push(`Title exceeds maximum length of 200 characters (length: ${event.title.length})`);
  }

  // 5. Summary (optional)
  if (event.summary !== undefined && event.summary !== null) {
    if (typeof event.summary !== 'string') {
      errors.push('Summary must be a string or null');
    } else if (event.summary.length > 2000) {
      errors.push(`Summary exceeds maximum length of 2000 characters (length: ${event.summary.length})`);
    }
  }

  // 6. Timestamps
  const ts = event.timestamps;
  if (!ts || typeof ts !== 'object' || Array.isArray(ts)) {
    errors.push('Timestamps object is required');
  } else {
    if (!isValidIsoDate(ts.startedAt)) {
      errors.push(`Invalid startedAt timestamp: '${ts.startedAt}'. Must be valid ISO 8601 string`);
    }
    if (!isValidIsoDate(ts.updatedAt)) {
      errors.push(`Invalid updatedAt timestamp: '${ts.updatedAt}'. Must be valid ISO 8601 string`);
    }
    if (ts.completedAt !== undefined && ts.completedAt !== null) {
      if (!isValidIsoDate(ts.completedAt)) {
        errors.push(`Invalid completedAt timestamp: '${ts.completedAt}'. Must be valid ISO 8601 string`);
      } else if (isValidIsoDate(ts.startedAt)) {
        const start = new Date(ts.startedAt).getTime();
        const end = new Date(ts.completedAt).getTime();
        if (end < start) {
          errors.push(`completedAt (${ts.completedAt}) cannot be earlier than startedAt (${ts.startedAt})`);
        }
      }
    }
  }

  // 7. Progress validation
  if (event.progress !== undefined && event.progress !== null) {
    const p = event.progress;
    if (typeof p !== 'object' || Array.isArray(p)) {
      errors.push('Progress must be an object');
    } else {
      if (typeof p.isAuthoritative !== 'boolean') {
        errors.push('progress.isAuthoritative must be a boolean');
      }

      if (p.current !== undefined && p.current !== null) {
        if (!Number.isInteger(p.current) || p.current < 0) {
          errors.push(`progress.current must be a non-negative integer, received ${p.current}`);
        }
      }

      if (p.total !== undefined && p.total !== null) {
        if (!Number.isInteger(p.total) || p.total < 0) {
          errors.push(`progress.total must be a non-negative integer, received ${p.total}`);
        }
      }

      // Check current <= total when total is positive
      if (
        p.current !== undefined && p.current !== null &&
        p.total !== undefined && p.total !== null &&
        p.total > 0 &&
        p.current > p.total
      ) {
        errors.push(`progress.current (${p.current}) cannot exceed progress.total (${p.total})`);
      }

      if (p.percentage !== undefined && p.percentage !== null) {
        if (typeof p.percentage !== 'number' || Number.isNaN(p.percentage) || p.percentage < 0 || p.percentage > 100) {
          errors.push(`progress.percentage must be a number between 0 and 100, received ${p.percentage}`);
        }
      }

      // Invariant: Unmetered progress cannot claim percentage
      if (p.isAuthoritative === false && p.percentage !== undefined && p.percentage !== null) {
        errors.push('progress.percentage cannot be provided when isAuthoritative is false');
      }
    }
  }

  // 8. Evidence Semantics & Invariants
  const isValidationPassed = event.eventType === EVENT_TYPES.VALIDATION_PASSED || event.status === STATUSES.PASSED;
  if (isValidationPassed) {
    const hasEvidence = Boolean(
      event.evidence &&
      (Array.isArray(event.evidence) ? event.evidence.length > 0 : (typeof event.evidence === 'object' ? Object.keys(event.evidence).length > 0 : true))
    );
    if (!hasEvidence && event.verified !== true) {
      errors.push('validation_passed requires authoritative verification evidence or explicit verified flag');
    }
  }

  // 9. Error Semantics
  const isValidationFailed = event.eventType === EVENT_TYPES.VALIDATION_FAILED || event.status === STATUSES.FAILED;
  if (isValidationFailed) {
    if (!event.error || (typeof event.error === 'object' && !event.error.message)) {
      errors.push('validation_failed requires error details with a non-empty message');
    }
  }

  // 10. Report References
  if (event.reportReferences !== undefined && event.reportReferences !== null) {
    if (!Array.isArray(event.reportReferences)) {
      errors.push('reportReferences must be an array of strings');
    } else {
      for (let i = 0; i < event.reportReferences.length; i++) {
        if (typeof event.reportReferences[i] !== 'string') {
          errors.push(`reportReferences[${i}] must be a string`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function assertValidActivityEvent(event) {
  const result = validateActivityEvent(event);
  if (!result.valid) {
    throw new ActivityValidationError(result.errors);
  }
  return true;
}

function generateId(prefix = 'evt') {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${ts}_${rand}`;
}

/**
 * Normalizes progress structure and enforces authoritative semantics.
 */
function normalizeProgress(rawP) {
  if (!rawP || typeof rawP !== 'object') return null;
  const isAuthoritative = Boolean(rawP.isAuthoritative);
  const current = Number.isInteger(rawP.current) ? Math.max(0, rawP.current) : null;
  const total = Number.isInteger(rawP.total) ? Math.max(0, rawP.total) : null;
  const unit = typeof rawP.unit === 'string' ? rawP.unit.trim() : 'steps';

  let percentage = null;
  if (isAuthoritative && current !== null && total !== null && total > 0) {
    percentage = Math.min(100, Math.max(0, Math.round((current / total) * 100)));
  } else if (isAuthoritative && typeof rawP.percentage === 'number') {
    percentage = Math.min(100, Math.max(0, Math.round(rawP.percentage)));
  }

  return {
    current,
    total,
    unit,
    percentage,
    isAuthoritative,
    stages: Array.isArray(rawP.stages) ? rawP.stages : [],
  };
}

/**
 * Creates an ActivityEvent from partial input.
 * Normalizes aliases, populates defaults, validates invariants, and redacts secrets.
 */
function createActivityEvent(partial = {}) {
  const input = deepClone(partial);

  const now = new Date().toISOString();
  const rawEventType = input.eventType || input.status || EVENT_TYPES.OPERATION_STARTED;

  // Resolve colloquial aliases
  const validEventTypes = Object.values(EVENT_TYPES);
  let eventType = validEventTypes.includes(rawEventType) ? rawEventType : null;
  if (!eventType) {
    const lower = String(rawEventType).toLowerCase();
    if (lower.includes('test')) eventType = EVENT_TYPES.TESTS_RUNNING;
    else if (lower.includes('fail') || lower.includes('error')) eventType = EVENT_TYPES.VALIDATION_FAILED;
    else if (lower.includes('pass') || lower.includes('verif') || lower.includes('check_passed')) eventType = EVENT_TYPES.VALIDATION_PASSED;
    else if (lower.includes('warn')) eventType = EVENT_TYPES.WARNING_DETECTED;
    else if (lower.includes('block')) eventType = EVENT_TYPES.OPERATION_BLOCKED;
    else if (lower.includes('gate') || lower.includes('approv')) eventType = EVENT_TYPES.HUMAN_APPROVAL_REQUIRED;
    else if (lower.includes('retry')) eventType = EVENT_TYPES.RETRY_STARTED;
    else if (lower.includes('complete') || lower.includes('done') || lower.includes('success')) eventType = EVENT_TYPES.OPERATION_COMPLETED;
    else if (lower.includes('cancel')) eventType = EVENT_TYPES.OPERATION_CANCELLED;
    else eventType = EVENT_TYPES.ANALYSIS_IN_PROGRESS;
  }

  // Evidence integrity check on creation: validation_passed requires evidence
  let evidence = input.evidence || null;
  const verified = input.verified || false;
  if (eventType === EVENT_TYPES.VALIDATION_PASSED) {
    const hasEvidence = Boolean(
      evidence &&
      (Array.isArray(evidence) ? evidence.length > 0 : Object.keys(evidence).length > 0)
    );
    if (!hasEvidence && verified !== true) {
      eventType = EVENT_TYPES.ANALYSIS_IN_PROGRESS;
      evidence = { unverifiedNote: 'Validation claimed without authoritative verification evidence' };
    }
  }

  const status = input.status || DEFAULT_EVENT_STATUS[eventType] || STATUSES.RUNNING;

  const startedAt = input.timestamps?.startedAt || input.startedAt || now;
  const updatedAt = input.timestamps?.updatedAt || input.updatedAt || now;
  let completedAt = input.timestamps?.completedAt || input.completedAt || null;
  if (!completedAt && (status === STATUSES.COMPLETED || status === STATUSES.CANCELLED)) {
    completedAt = now;
  }

  const progress = normalizeProgress(input.progress);

  // Normalize error
  let error = null;
  if (input.error) {
    if (typeof input.error === 'string') {
      error = { message: input.error };
    } else if (typeof input.error === 'object') {
      error = {
        message: input.error.message || 'Operational failure',
        code: input.error.code || null,
        suggestion: input.error.suggestion || null,
        stack: input.error.stack || null,
      };
    }
  } else if (eventType === EVENT_TYPES.VALIDATION_FAILED) {
    error = { message: 'Validation failure detected' };
  }

  let warning = null;
  if (input.warning) {
    if (typeof input.warning === 'string') {
      warning = { message: input.warning };
    } else if (typeof input.warning === 'object') {
      warning = {
        message: input.warning.message || 'Warning detected',
        impact: input.warning.impact || null,
      };
    }
  }

  const event = {
    schemaVersion: SCHEMA_VERSION,
    eventId: input.eventId || generateId('evt'),
    operationId: input.operationId || generateId('op'),
    eventType,
    status,
    title: input.title ? String(input.title).trim() : 'Operational Event',
    summary: input.summary ? String(input.summary).trim() : null,
    phase: input.phase || null,
    agent: input.agent || null,
    skill: input.skill || null,
    domain: input.domain || null,
    executionState: input.executionState || null,
    metadata: input.metadata ? { ...input.metadata } : {},
    progress,
    evidence,
    verified,
    error,
    warning,
    nextAction: input.nextAction ? String(input.nextAction).trim() : null,
    reportReferences: Array.isArray(input.reportReferences) ? input.reportReferences : [],
    attempt: Number.isInteger(input.attempt) ? input.attempt : undefined,
    maxAttempts: Number.isInteger(input.maxAttempts) ? input.maxAttempts : undefined,
    timestamps: {
      startedAt,
      updatedAt,
      completedAt,
    },
    startedAt,
    updatedAt,
    completedAt,
  };

  // Validate internal consistency
  assertValidActivityEvent(event);

  // Sanitize presentation fields for safe return
  return Object.freeze(redactSecrets(event));
}

module.exports = {
  ActivityValidationError,
  validateActivityEvent,
  assertValidActivityEvent,
  createActivityEvent,
  createEvent: createActivityEvent,
  normalizeProgress,
  sanitizeActivityEvent,
  redactSecrets,
  deepClone,
  generateId,
  SECRET_PATTERNS,
};
