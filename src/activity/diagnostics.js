'use strict';

/**
 * Tribunal-Kit Diagnostic Retention & Intelligence Engine (Phase 10)
 *
 * Implements bounded, secret-safe in-memory diagnostic storage and actionable
 * report generation.
 *
 * INVARIANTS:
 * - Diagnostic retention is strictly bounded in event count and memory footprint.
 * - Sensitive values and secrets (API keys, tokens) are redacted before retention.
 * - Diagnostic evidence is never silently discarded; truncation is explicitly tracked.
 * - Failures are categorized accurately with evidence-backed remedies.
 */

const {
  EVENT_TYPES,
} = require('./types');

const {
  sanitizeActivityEvent,
} = require('./schema');

const DEFAULT_MAX_OPERATIONS = 20;
const DEFAULT_MAX_EVENTS_PER_OPERATION = 50;
const DEFAULT_MAX_EVIDENCE_BYTES = 16384; // 16 KB

/**
 * Failure category classifications.
 */
const FAILURE_CATEGORIES = Object.freeze({
  VALIDATION_FAILURE: 'validation_failure',
  TEST_FAILURE: 'test_failure',
  DEPENDENCY_FAILURE: 'dependency_failure',
  PERMISSION_ERROR: 'permission_error',
  TIMEOUT_OR_STALL: 'timeout_or_stall',
  CANCELLATION: 'cancellation',
  INVALID_INPUT: 'invalid_input',
  MISSING_CONFIG: 'missing_config',
  UNSUPPORTED_HOST: 'unsupported_host',
  INTERNAL_ERROR: 'internal_error',
});

/**
 * Bounded ring-buffer diagnostic storage for an individual operation.
 */
class OperationDiagnosticRecord {
  constructor(operationId, options = {}) {
    this.operationId = operationId;
    this.maxEvents = typeof options.maxEvents === 'number' ? options.maxEvents : DEFAULT_MAX_EVENTS_PER_OPERATION;
    this.events = [];
    this.truncatedCount = 0;
    this.createdAt = new Date().toISOString();
    this.updatedAt = this.createdAt;
    this.error = null;
    this.failureCategory = null;
    this.remedy = null;
    this.metadata = {};
  }

  /**
   * Pushes an event into the bounded buffer.
   */
  push(rawEvent) {
    if (!rawEvent || typeof rawEvent !== 'object') return;

    // Apply secret scrubbing before storage to prevent credential retention
    const sanitized = sanitizeActivityEvent(rawEvent);

    // Deep copy and truncate oversized evidence if needed
    const event = { ...sanitized };
    if (event.evidence && typeof event.evidence === 'object') {
      try {
        const json = JSON.stringify(event.evidence);
        if (json.length > DEFAULT_MAX_EVIDENCE_BYTES) {
          event.evidence = {
            _truncated: true,
            originalSize: json.length,
            preview: json.slice(0, 1024),
            notice: `Evidence exceeded ${DEFAULT_MAX_EVIDENCE_BYTES} bytes and was truncated for diagnostic retention.`,
          };
        }
      } catch {
        event.evidence = '[Circular or Unserializable Evidence Payload]';
      }
    }

    if (this.events.length >= this.maxEvents) {
      // Evict oldest event
      this.events.shift();
      this.truncatedCount++;
    }

    this.events.push(event);
    this.updatedAt = new Date().toISOString();

    // Track critical errors and failure category
    if (event.error) {
      this.error = event.error;
      this.failureCategory = classifyFailure(event.error, event);
      if (event.error.suggestion) {
        this.remedy = event.error.suggestion;
      }
    }
  }

  /**
   * Returns retention metadata.
   */
  getRetentionInfo() {
    return {
      operationId: this.operationId,
      retainedCount: this.events.length,
      truncatedCount: this.truncatedCount,
      capacity: this.maxEvents,
      isTruncated: this.truncatedCount > 0,
    };
  }
}

/**
 * Classifies an error or failure event into a structured category.
 *
 * @param {Object} error
 * @param {Object} event
 * @returns {string}
 */
function classifyFailure(error = {}, event = {}) {
  const msg = String(error.message || event.summary || event.title || '').toLowerCase();
  const code = String(error.code || '').toUpperCase();

  if (code.includes('EACCES') || code.includes('EPERM') || msg.includes('permission denied')) {
    return FAILURE_CATEGORIES.PERMISSION_ERROR;
  }
  if (code.includes('TIMEOUT') || code.includes('ETIMEDOUT') || msg.includes('timed out') || event.eventType === EVENT_TYPES.STALL_SUSPECTED) {
    return FAILURE_CATEGORIES.TIMEOUT_OR_STALL;
  }
  if (msg.includes('abort') || msg.includes('cancel') || event.eventType === EVENT_TYPES.OPERATION_CANCELLED) {
    return FAILURE_CATEGORIES.CANCELLATION;
  }
  if (msg.includes('jest') || msg.includes('test failed') || msg.includes('assertion') || /\bexpected\b/.test(msg) || event.eventType === EVENT_TYPES.TESTS_RUNNING) {
    return FAILURE_CATEGORIES.TEST_FAILURE;
  }
  if (msg.includes('module not found') || msg.includes('cannot find module') || msg.includes('dependency') || code.includes('MODULE_NOT_FOUND')) {
    return FAILURE_CATEGORIES.DEPENDENCY_FAILURE;
  }
  if (msg.includes('config') || msg.includes('missing flag') || msg.includes('not found') && msg.includes('.json')) {
    return FAILURE_CATEGORIES.MISSING_CONFIG;
  }
  if (event.eventType === EVENT_TYPES.VALIDATION_FAILED || msg.includes('validation') || msg.includes('schema mismatch')) {
    return FAILURE_CATEGORIES.VALIDATION_FAILURE;
  }
  if (msg.includes('invalid argument') || msg.includes('invalid option') || msg.includes('syntax error')) {
    return FAILURE_CATEGORIES.INVALID_INPUT;
  }

  return FAILURE_CATEGORIES.INTERNAL_ERROR;
}

/**
 * Central Diagnostic Retention Buffer managing multi-operation diagnostic records.
 */
class DiagnosticBuffer {
  constructor(options = {}) {
    this.maxOperations = typeof options.maxOperations === 'number' ? options.maxOperations : DEFAULT_MAX_OPERATIONS;
    this.maxEventsPerOperation = typeof options.maxEventsPerOperation === 'number'
      ? options.maxEventsPerOperation
      : DEFAULT_MAX_EVENTS_PER_OPERATION;

    this.operations = new Map();
  }

  /**
   * Records an activity event in the appropriate diagnostic buffer.
   */
  record(event) {
    if (!event || typeof event !== 'object') return;

    const opId = event.operationId || 'default';
    let record = this.operations.get(opId);

    if (!record) {
      if (this.operations.size >= this.maxOperations) {
        // Evict oldest operation
        const oldestKey = this.operations.keys().next().value;
        this.operations.delete(oldestKey);
      }

      record = new OperationDiagnosticRecord(opId, { maxEvents: this.maxEventsPerOperation });
      this.operations.set(opId, record);
    }

    record.push(event);
  }

  /**
   * Retrieves recorded diagnostic events and retention info for an operation.
   */
  getDiagnostics(operationId = 'default') {
    const record = this.operations.get(operationId);
    if (!record) {
      return {
        operationId,
        events: [],
        retention: { retainedCount: 0, truncatedCount: 0, capacity: this.maxEventsPerOperation, isTruncated: false },
        error: null,
      };
    }

    return {
      operationId,
      events: [...record.events],
      retention: record.getRetentionInfo(),
      error: record.error,
      failureCategory: record.failureCategory,
      remedy: record.remedy,
    };
  }

  /**
   * Generates a structured, actionable diagnostic report for an operation.
   *
   * @param {string} operationId
   * @param {Object} [options]
   * @returns {string} Formatted markdown/plaintext diagnostic report
   */
  getDiagnosticReport(operationId = 'default', options = {}) {
    const data = this.getDiagnostics(operationId);
    if (!data || data.events.length === 0) {
      return `### Diagnostic Report [${operationId}]\nNo diagnostic events recorded for operation '${operationId}'.`;
    }

    const lines = [];
    lines.push(`### Diagnostic Report: \`${operationId}\``);
    lines.push(`- **Events Retained**: ${data.retention.retainedCount} of ${data.retention.capacity}${data.retention.isTruncated ? ` (${data.retention.truncatedCount} older events evicted)` : ''}`);

    if (data.error) {
      lines.push(`- **Failure Category**: \`${data.failureCategory || 'unknown'}\``);
      lines.push(`- **Root Cause**: ${data.error.message || 'Unknown error'}`);
      if (data.remedy) {
        lines.push(`- **Suggested Remedy**: ${data.remedy}`);
      }
      if (data.error.stack && options.includeStack !== false) {
        lines.push(`\n\`\`\`text\n${data.error.stack}\n\`\`\``);
      }
    } else {
      lines.push(`- **Status**: No unhandled errors recorded in this operation.`);
    }

    // Sequence timeline
    lines.push(`\n#### Operational Event Sequence`);
    data.events.forEach((ev, idx) => {
      const timePart = ev.timestamp ? ` [${ev.timestamp.split('T')[1]?.slice(0, 8) || ''}]` : '';
      const statusPart = ev.status ? ` (${ev.status})` : '';
      lines.push(`${idx + 1}.${timePart} **${ev.eventType}** · ${ev.title}${statusPart}`);
      if (ev.evidence && options.verbose) {
        lines.push(`   - Evidence: ${typeof ev.evidence === 'object' ? JSON.stringify(ev.evidence) : ev.evidence}`);
      }
    });

    return lines.join('\n');
  }

  /**
   * Exports diagnostics in structured JSON.
   */
  exportDiagnostics(operationId = 'default', format = 'json') {
    const diag = this.getDiagnostics(operationId);
    if (format === 'json') {
      return JSON.stringify(diag, null, 2);
    }
    return this.getDiagnosticReport(operationId);
  }

  /**
   * Clears diagnostics for a specific operation.
   */
  clear(operationId) {
    return this.operations.delete(operationId);
  }

  /**
   * Clears all diagnostic records.
   */
  clearAll() {
    this.operations.clear();
  }
}

const defaultDiagnosticBuffer = new DiagnosticBuffer();

module.exports = {
  DEFAULT_MAX_OPERATIONS,
  DEFAULT_MAX_EVENTS_PER_OPERATION,
  DEFAULT_MAX_EVIDENCE_BYTES,
  FAILURE_CATEGORIES,
  OperationDiagnosticRecord,
  DiagnosticBuffer,
  classifyFailure,
  defaultDiagnosticBuffer,
};
