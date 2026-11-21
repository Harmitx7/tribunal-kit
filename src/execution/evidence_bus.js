'use strict';

/**
 * evidence_bus.js — Shared Evidence Envelope & Immutable Event Store
 * ==================================================================
 * Stage 2: Shared Evidence Envelope
 *
 * Guarantees:
 * 1. Immutable event-sourced record of all agent findings, artifacts, and metrics.
 * 2. Cryptographic provenance hashing (SHA-256) per evidence event.
 * 3. Session isolation to guarantee zero cross-run state pollution.
 * 4. Deterministic querying by session, file path, line range, agent, or severity.
 */

const crypto = require('crypto');

const VALID_EVIDENCE_TYPES = Object.freeze(
  new Set(['FINDING', 'ARTIFACT', 'METRIC', 'OBSERVATION']),
);

function computeSha256(data) {
  return crypto
    .createHash('sha256')
    .update(data || '', 'utf8')
    .digest('hex');
}

/**
 * Deep freezes an object and all nested properties recursively.
 * @param {any} obj
 * @returns {any}
 */
function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object' || Object.isFrozen(obj)) {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.getOwnPropertyNames(obj)) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      deepFreeze(obj[key]);
    }
  }
  return obj;
}

/**
 * Deterministically sorts object keys for canonical JSON serialization.
 * @param {any} val
 * @returns {any}
 */
function canonicalizeJson(val) {
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(canonicalizeJson);
  }
  const sorted = {};
  for (const k of Object.keys(val).sort()) {
    sorted[k] = canonicalizeJson(val[k]);
  }
  return sorted;
}

/**
 * Normalizes line range representation into consistent object or string.
 * @param {string|number|{start:number, end:number}} range
 * @returns {{ start: number, end: number }|string|null}
 */
function normalizeLineRange(range) {
  if (!range) return null;
  if (
    typeof range === 'object' &&
    typeof range.start === 'number' &&
    typeof range.end === 'number'
  ) {
    return { start: range.start, end: range.end };
  }
  if (typeof range === 'number') {
    return { start: range, end: range };
  }
  if (typeof range === 'string') {
    const trimmed = range.trim();
    const dashMatch = trimmed.match(/^(\d+)\s*[-:]\s*(\d+)$/);
    if (dashMatch) {
      return { start: parseInt(dashMatch[1], 10), end: parseInt(dashMatch[2], 10) };
    }
    const singleMatch = trimmed.match(/^(\d+)$/);
    if (singleMatch) {
      const num = parseInt(singleMatch[1], 10);
      return { start: num, end: num };
    }
    return trimmed;
  }
  return null;
}

class EvidenceSession {
  /**
   * @param {string} sessionId
   * @param {EvidenceBus} bus
   */
  constructor(sessionId, bus) {
    this.sessionId = sessionId;
    this.bus = bus;
  }

  recordFinding(task, finding) {
    return this.bus.recordFinding(this.sessionId, task, finding);
  }

  recordArtifact(task, artifact) {
    return this.bus.recordArtifact(this.sessionId, task, artifact);
  }

  recordMetric(task, name, value, metadata) {
    return this.bus.recordMetric(this.sessionId, task, name, value, metadata);
  }

  recordObservation(task, observation) {
    return this.bus.recordObservation(this.sessionId, task, observation);
  }

  query(filters = {}) {
    return this.bus.query({ ...filters, sessionId: this.sessionId });
  }

  getFindings() {
    return this.bus.getFindings(this.sessionId);
  }

  getArtifacts() {
    return this.bus.getArtifacts(this.sessionId);
  }

  getMetrics() {
    return this.bus.getMetrics(this.sessionId);
  }

  clear() {
    this.bus.clearSession(this.sessionId);
  }
}

class EvidenceBus {
  constructor() {
    /** @type {Map<string, Array<Object>>} sessionId -> event list */
    this._sessions = new Map();
  }

  /**
   * Creates a session-isolated interface.
   * @param {string} [sessionId]
   * @returns {EvidenceSession}
   */
  createSession(sessionId) {
    const id = sessionId || `sess_${crypto.randomBytes(8).toString('hex')}`;
    if (!this._sessions.has(id)) {
      this._sessions.set(id, []);
    }
    return new EvidenceSession(id, this);
  }

  /**
   * Appends an immutable evidence item to a session.
   *
   * @param {string} sessionId
   * @param {Object} rawItem
   * @returns {Object} Sealed evidence item with provenance
   */
  emit(sessionId, rawItem) {
    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error('EVIDENCE_BUS_ERROR: sessionId must be a non-empty string.');
    }
    if (!rawItem || typeof rawItem !== 'object') {
      throw new Error('EVIDENCE_BUS_ERROR: Evidence item must be an object.');
    }

    const type =
      rawItem.type && VALID_EVIDENCE_TYPES.has(rawItem.type.toUpperCase())
        ? rawItem.type.toUpperCase()
        : 'OBSERVATION';

    const timestamp = rawItem.timestamp || Date.now();
    const id = rawItem.id || `ev_${crypto.randomBytes(8).toString('hex')}`;
    const taskId = rawItem.taskId || 'unknown_task';
    const agentId = rawItem.agentId || 'unknown_agent';
    const content =
      rawItem.content !== undefined ? rawItem.content : rawItem.description || rawItem.text || '';

    const lineRange = normalizeLineRange(rawItem.lineRange);
    const filePath =
      typeof rawItem.filePath === 'string' ? rawItem.filePath.replace(/\\/g, '/') : undefined;

    // Defensive clone of content and metadata to prevent external mutation leaks
    let clonedContent;
    try {
      clonedContent =
        typeof content === 'object' && content !== null
          ? JSON.parse(JSON.stringify(content))
          : content;
    } catch (_) {
      clonedContent = String(content);
    }

    let clonedMetadata;
    try {
      clonedMetadata =
        rawItem.metadata && typeof rawItem.metadata === 'object'
          ? JSON.parse(JSON.stringify(rawItem.metadata))
          : {};
    } catch (_) {
      clonedMetadata = {};
    }

    const canonicalPayload = canonicalizeJson({
      sessionId,
      taskId,
      agentId,
      type,
      category: rawItem.category || 'OTHER',
      severity: rawItem.severity || 'INFO',
      confidence:
        typeof rawItem.confidence === 'number' ? Math.max(0, Math.min(1, rawItem.confidence)) : 1.0,
      filePath,
      lineRange,
      content: clonedContent,
      metadata: clonedMetadata,
      timestamp,
    });

    const provenanceHash = computeSha256(JSON.stringify(canonicalPayload));

    const sealed = deepFreeze({
      id,
      sessionId,
      taskId,
      agentId,
      type,
      category: rawItem.category || 'OTHER',
      severity: rawItem.severity || 'INFO',
      ...(filePath ? { filePath } : {}),
      ...(lineRange !== null ? { lineRange } : {}),
      confidence:
        typeof rawItem.confidence === 'number' ? Math.max(0, Math.min(1, rawItem.confidence)) : 1.0,
      content: clonedContent,
      metadata: clonedMetadata,
      provenanceHash,
      timestamp,
    });

    if (!this._sessions.has(sessionId)) {
      this._sessions.set(sessionId, []);
    }
    this._sessions.get(sessionId).push(sealed);
    return sealed;
  }

  /**
   * Records a validated AgentFinding into the session envelope.
   * @param {string} sessionId
   * @param {Object} task
   * @param {Object} finding
   * @returns {Object} Sealed evidence item
   */
  recordFinding(sessionId, task, finding) {
    return this.emit(sessionId, {
      type: 'FINDING',
      taskId: task.taskId,
      agentId: task.agentId,
      category: finding.category || 'CORRECTNESS',
      severity: finding.severity || 'MEDIUM',
      filePath: finding.filePath,
      lineRange: finding.lineRange,
      content: {
        findingId: finding.findingId,
        description: finding.description,
        evidence: finding.evidence,
      },
      confidence: finding.confidence,
      metadata: {
        findingId: finding.findingId,
      },
    });
  }

  /**
   * Records an artifact output into the session envelope.
   * @param {string} sessionId
   * @param {Object} task
   * @param {Object} artifact
   * @returns {Object} Sealed evidence item
   */
  recordArtifact(sessionId, task, artifact) {
    return this.emit(sessionId, {
      type: 'ARTIFACT',
      taskId: task.taskId,
      agentId: task.agentId,
      category: artifact.category || 'ARTIFACT',
      filePath: artifact.filePath || artifact.path,
      content: artifact.content || artifact.description || artifact,
      metadata: artifact.metadata || {},
    });
  }

  /**
   * Records an execution metric.
   * @param {string} sessionId
   * @param {Object} task
   * @param {string} name
   * @param {number} value
   * @param {Object} [metadata]
   * @returns {Object}
   */
  recordMetric(sessionId, task, name, value, metadata = {}) {
    return this.emit(sessionId, {
      type: 'METRIC',
      taskId: task.taskId,
      agentId: task.agentId,
      category: 'TELEMETRY',
      content: { name, value },
      metadata,
    });
  }

  /**
   * Records an arbitrary observation.
   * @param {string} sessionId
   * @param {Object} task
   * @param {string|Object} observation
   * @returns {Object}
   */
  recordObservation(sessionId, task, observation) {
    return this.emit(sessionId, {
      type: 'OBSERVATION',
      taskId: task.taskId,
      agentId: task.agentId,
      content: observation,
    });
  }

  /**
   * Queries events within a session or globally.
   *
   * @param {Object} filters
   * @param {string} [filters.sessionId]
   * @param {string} [filters.agentId]
   * @param {string} [filters.taskId]
   * @param {string} [filters.type]
   * @param {string} [filters.category]
   * @param {string} [filters.severity]
   * @param {string} [filters.filePath]
   * @param {number} [filters.minConfidence]
   * @returns {Array<Object>}
   */
  query(filters = {}) {
    let pool = [];
    if (filters.sessionId) {
      pool = this._sessions.get(filters.sessionId) || [];
    } else {
      for (const sessionEvents of this._sessions.values()) {
        pool.push(...sessionEvents);
      }
    }

    return pool.filter(item => {
      if (filters.agentId && item.agentId !== filters.agentId) return false;
      if (filters.taskId && item.taskId !== filters.taskId) return false;
      if (filters.type && item.type !== filters.type.toUpperCase()) return false;
      if (filters.category && item.category !== filters.category.toUpperCase()) return false;
      if (filters.severity && item.severity !== filters.severity.toUpperCase()) return false;
      if (filters.filePath) {
        const norm = filters.filePath.replace(/\\/g, '/');
        if (!item.filePath || item.filePath.toLowerCase() !== norm.toLowerCase()) return false;
      }
      if (typeof filters.minConfidence === 'number' && item.confidence < filters.minConfidence) {
        return false;
      }
      return true;
    });
  }

  getFindings(sessionId) {
    return this.query({ sessionId, type: 'FINDING' });
  }

  getArtifacts(sessionId) {
    return this.query({ sessionId, type: 'ARTIFACT' });
  }

  getMetrics(sessionId) {
    return this.query({ sessionId, type: 'METRIC' });
  }

  clearSession(sessionId) {
    this._sessions.delete(sessionId);
  }

  clearAll() {
    this._sessions.clear();
  }
}

module.exports = {
  EvidenceBus,
  EvidenceSession,
  VALID_EVIDENCE_TYPES,
  normalizeLineRange,
  deepFreeze,
  canonicalizeJson,
};
