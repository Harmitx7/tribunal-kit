'use strict';

/**
 * Tribunal-Kit Operation Registry & Activity Intelligence Engine (Phase 2)
 *
 * Provides thread-safe operation lifecycle tracking, hierarchical event correlation,
 * authoritative progress calculation, agent/skill state tracking, retry management,
 * and bounded in-memory retention with time-to-live expiration.
 */

const {
  LIFECYCLE_STATES,
  AGENT_SKILL_STATES,
  TOOL_STATES,
  STATUSES,
} = require('./types');

const {
  canTransition,
  assertValidTransition,
  isTerminalState,
} = require('./lifecycle');

const {
  generateId,
  createActivityEvent,
  ActivityValidationError,
} = require('./schema');

class ActivityProgressError extends Error {
  constructor(message, operationId = null, details = {}) {
    const opPart = operationId ? ` for operation '${operationId}'` : '';
    super(`Activity progress violation${opPart}: ${message}`);
    this.name = 'ActivityProgressError';
    this.code = 'ACTIVITY_PROGRESS_ERROR';
    this.operationId = operationId;
    this.details = details;
  }
}

/**
 * Represents an individual operation tracking its lifecycle, events,
 * execution states, and authoritative evidence.
 */
class OperationRecord {
  constructor(options = {}) {
    this.operationId = options.operationId || generateId('op');
    this.parentOperationId = options.parentOperationId || null;
    this.childOperationIds = [];
    this.title = options.title || 'Engineering Operation';
    this.status = options.status || LIFECYCLE_STATES.PENDING;
    this.phase = options.phase || null;

    const nowIso = new Date().toISOString();
    this.timestamps = {
      startedAt: options.startedAt || nowIso,
      updatedAt: options.updatedAt || nowIso,
      completedAt: null,
    };

    this.attempt = typeof options.attempt === 'number' ? Math.max(1, options.attempt) : 1;
    this.maxAttempts = typeof options.maxAttempts === 'number' ? Math.max(1, options.maxAttempts) : 3;
    this.retries = [];

    this.progress = null;
    if (options.progress) {
      this.progress = this._normalizeProgress(options.progress);
    }

    this.activeAgent = null;
    this.activeSkill = null;
    this.agentHistory = [];
    this.skillHistory = [];

    this.stages = Array.isArray(options.stages) ? options.stages.map(s => ({ ...s })) : [];
    this.tools = [];
    this.evidence = [];
    this.verified = false;

    this.events = [];
    this.error = null;
    this.warnings = [];
    this.cancellation = null;
    this.metadata = options.metadata ? { ...options.metadata } : {};

    this.statusHistory = [
      {
        from: null,
        to: this.status,
        timestamp: nowIso,
        metadata: { initial: true },
      },
    ];

    this._lastProgressAttempt = this.attempt;

    // Async execution queue for thread-safe serialized operations
    this._queue = Promise.resolve();
  }

  /**
   * Executes a task sequentially within this operation's serialized promise queue.
   */
  async executeSerialized(taskFn) {
    const nextInQueue = this._queue.then(() => taskFn(this));
    this._queue = nextInQueue.catch(() => {});
    return nextInQueue;
  }

  /**
   * Normalizes and validates a progress structure.
   */
  _normalizeProgress(progressInput) {
    if (!progressInput || typeof progressInput !== 'object') {
      return null;
    }

    const { current, total, unit, percentage, isAuthoritative, stages } = progressInput;

    const isUnmetered = (current === undefined || current === null) &&
                        (total === undefined || total === null);

    if (isUnmetered) {
      return {
        current: null,
        total: null,
        percentage: null,
        unit: typeof unit === 'string' ? unit : null,
        isAuthoritative: Boolean(isAuthoritative),
        stages: Array.isArray(stages) ? stages.map(s => ({ ...s })) : [],
      };
    }

    if (typeof current !== 'number' || Number.isNaN(current) || current < 0) {
      throw new ActivityProgressError(
        `Invalid current progress: '${current}'. Must be a non-negative number.`,
        this.operationId,
        { current, total }
      );
    }

    if (typeof total !== 'number' || Number.isNaN(total) || total <= 0) {
      throw new ActivityProgressError(
        `Invalid total progress: '${total}'. Must be a positive number.`,
        this.operationId,
        { current, total }
      );
    }

    if (current > total) {
      throw new ActivityProgressError(
        `Current progress (${current}) cannot exceed total (${total}).`,
        this.operationId,
        { current, total }
      );
    }

    let calculatedPercentage = Math.round((current / total) * 100);
    if (typeof percentage === 'number' && !Number.isNaN(percentage)) {
      if (percentage < 0 || percentage > 100) {
        throw new ActivityProgressError(
          `Percentage must be between 0 and 100, received ${percentage}.`,
          this.operationId,
          { percentage }
        );
      }
      calculatedPercentage = percentage;
    }

    return {
      current,
      total,
      percentage: calculatedPercentage,
      unit: typeof unit === 'string' ? unit : null,
      isAuthoritative: isAuthoritative !== false,
      stages: Array.isArray(stages) ? stages.map(s => ({ ...s })) : [],
    };
  }

  /**
   * Updates progress ensuring non-monotonic regression within the same attempt.
   */
  setProgress(newProgressData) {
    const normalized = this._normalizeProgress(newProgressData);
    if (!normalized) return;

    if (this.progress && !isTerminalState(this.status)) {
      const prev = this.progress;
      const isSameAttempt = this._lastProgressAttempt === this.attempt;

      if (
        isSameAttempt &&
        prev.current !== null &&
        normalized.current !== null &&
        normalized.current < prev.current
      ) {
        throw new ActivityProgressError(
          `Progress cannot regress backward from ${prev.current}/${prev.total} to ${normalized.current}/${normalized.total} within the same attempt.`,
          this.operationId,
          { previous: prev, updated: normalized, attempt: this.attempt }
        );
      }
    }

    this._lastProgressAttempt = this.attempt;
    this.progress = normalized;
    this.timestamps.updatedAt = new Date().toISOString();
  }

  /**
   * Transitions this operation to a target lifecycle status.
   */
  transitionTo(targetStatus, metadata = {}) {
    if (this.status === targetStatus) {
      this.timestamps.updatedAt = new Date().toISOString();
      return this;
    }

    assertValidTransition(this.status, targetStatus, this.operationId);

    const prevStatus = this.status;
    this.status = targetStatus;
    const nowIso = new Date().toISOString();
    this.timestamps.updatedAt = nowIso;

    if (isTerminalState(targetStatus) || targetStatus === LIFECYCLE_STATES.FAILED) {
      if (!this.timestamps.completedAt) {
        this.timestamps.completedAt = nowIso;
      }
    } else if (targetStatus === LIFECYCLE_STATES.RUNNING || targetStatus === LIFECYCLE_STATES.RETRYING) {
      // Re-opening into retry clears completedAt
      this.timestamps.completedAt = null;
    }

    this.statusHistory.push({
      from: prevStatus,
      to: targetStatus,
      timestamp: nowIso,
      metadata: { ...metadata },
    });

    return this;
  }

  /**
   * Records an agent state update.
   */
  recordAgent(agentName, state, context = null, error = null) {
    const nowIso = new Date().toISOString();
    const entry = {
      name: agentName,
      state,
      context,
      error: error ? (error.message || String(error)) : null,
      timestamp: nowIso,
    };

    this.activeAgent = entry;
    this.agentHistory.push(entry);
    this.timestamps.updatedAt = nowIso;
    return entry;
  }

  /**
   * Records a skill state update.
   */
  recordSkill(skillName, state, context = null, error = null) {
    const nowIso = new Date().toISOString();
    const entry = {
      name: skillName,
      state,
      context,
      error: error ? (error.message || String(error)) : null,
      timestamp: nowIso,
    };

    this.activeSkill = entry;
    this.skillHistory.push(entry);
    this.timestamps.updatedAt = nowIso;
    return entry;
  }

  /**
   * Records a tool execution.
   */
  recordTool(toolName, status, options = {}) {
    const nowIso = new Date().toISOString();
    const existing = this.tools.find(t => t.toolName === toolName && t.status === TOOL_STATES.STARTED);

    if (existing && (status === TOOL_STATES.COMPLETED || status === TOOL_STATES.FAILED)) {
      existing.status = status;
      existing.completedAt = nowIso;
      existing.durationMs = options.durationMs || (new Date(nowIso).getTime() - new Date(existing.startedAt).getTime());
      existing.resultRef = options.resultRef || existing.resultRef || null;
      existing.error = options.error || null;
      this.timestamps.updatedAt = nowIso;
      return existing;
    }

    const toolRecord = {
      toolName,
      status,
      startedAt: options.startedAt || nowIso,
      completedAt: status === TOOL_STATES.COMPLETED || status === TOOL_STATES.FAILED ? nowIso : null,
      durationMs: options.durationMs || null,
      resultRef: options.resultRef || null,
      error: options.error || null,
    };

    this.tools.push(toolRecord);
    this.timestamps.updatedAt = nowIso;
    return toolRecord;
  }

  /**
   * Records verified evidence.
   */
  recordEvidence(evidenceItem) {
    if (!evidenceItem || typeof evidenceItem !== 'object') {
      throw new Error('Evidence item must be a non-null object');
    }
    const ref = evidenceItem.ref || evidenceItem.path || evidenceItem.artifact;
    if (!ref || typeof ref !== 'string') {
      throw new Error("Evidence item must include an authoritative string 'ref' or 'path'");
    }

    const nowIso = new Date().toISOString();
    const record = {
      ref,
      hash: evidenceItem.hash || null,
      description: evidenceItem.description || null,
      verified: Boolean(evidenceItem.verified),
      collectedAt: evidenceItem.collectedAt || nowIso,
    };

    this.evidence.push(record);
    if (record.verified) {
      this.verified = true;
    }
    this.timestamps.updatedAt = nowIso;
    return record;
  }

  /**
   * Records a retry, archiving the previous attempt and incrementing the attempt counter.
   */
  recordRetry(options = {}) {
    const nowIso = new Date().toISOString();
    const failureRecord = {
      attempt: this.attempt,
      failedAt: nowIso,
      reason: options.reason || 'Operation retry triggered',
      error: options.error || (this.error ? { ...this.error } : null),
      durationMs: this.timestamps.startedAt
        ? new Date(nowIso).getTime() - new Date(this.timestamps.startedAt).getTime()
        : null,
    };

    this.retries.push(failureRecord);
    this.attempt += 1;
    this.error = null;

    // Transition to retrying status
    this.transitionTo(LIFECYCLE_STATES.RETRYING, {
      attempt: this.attempt,
      reason: options.reason,
    });

    this.timestamps.updatedAt = nowIso;
    return failureRecord;
  }

  /**
   * Records cancellation.
   */
  recordCancellation(reason = 'Operation aborted by user', metadata = {}) {
    if (this.status === LIFECYCLE_STATES.CANCELLED) {
      return this;
    }

    const nowIso = new Date().toISOString();
    this.cancellation = {
      reason,
      cancelledAt: nowIso,
      metadata: { ...metadata },
    };

    this.transitionTo(LIFECYCLE_STATES.CANCELLED, { reason });
    return this;
  }

  /**
   * Correlates an ActivityEvent with this operation record.
   */
  addEvent(event) {
    if (!event || typeof event !== 'object') return;
    this.events.push(event);

    if (event.progress) {
      try {
        this.setProgress(event.progress);
      } catch (err) {
        // If progress validation fails on event ingestion, record error
        this.warnings.push({
          message: err.message,
          impact: 'Event progress was not applied due to validation violation',
          detectedAt: new Date().toISOString(),
        });
      }
    }

    if (event.warning) {
      this.warnings.push({
        message: event.warning.message || String(event.warning),
        impact: event.warning.impact || null,
        detectedAt: new Date().toISOString(),
      });
    }

    if (event.error) {
      this.error = {
        message: event.error.message || String(event.error),
        code: event.error.code || null,
        suggestion: event.error.suggestion || null,
      };
    }

    if (event.evidence) {
      const ref = typeof event.evidence === 'string'
        ? event.evidence
        : (event.evidence.ref || event.evidence.path || 'evidence_artifact');
      this.recordEvidence({
        ref,
        verified: Boolean(event.verified),
        description: event.summary || null,
      });
    }

    this.timestamps.updatedAt = new Date().toISOString();
  }

  /**
   * Generates a snapshot of the operation's current state.
   */
  toJSON() {
    return {
      operationId: this.operationId,
      parentOperationId: this.parentOperationId,
      childOperationIds: [...this.childOperationIds],
      title: this.title,
      status: this.status,
      phase: this.phase,
      timestamps: { ...this.timestamps },
      attempt: this.attempt,
      maxAttempts: this.maxAttempts,
      retries: [...this.retries],
      progress: this.progress ? { ...this.progress } : null,
      activeAgent: this.activeAgent ? { ...this.activeAgent } : null,
      activeSkill: this.activeSkill ? { ...this.activeSkill } : null,
      agentHistory: [...this.agentHistory],
      skillHistory: [...this.skillHistory],
      stages: [...this.stages],
      tools: [...this.tools],
      evidence: [...this.evidence],
      verified: this.verified,
      error: this.error ? { ...this.error } : null,
      warningsCount: this.warnings.length,
      warnings: [...this.warnings],
      cancellation: this.cancellation ? { ...this.cancellation } : null,
      eventCount: this.events.length,
      metadata: { ...this.metadata },
    };
  }
}

/**
 * Operation Registry managing active and completed operations,
 * enforcing bounded memory retention, and providing query filters.
 */
class OperationRegistry {
  constructor(options = {}) {
    this.maxCompletedRetention = typeof options.maxCompletedRetention === 'number'
      ? Math.max(1, options.maxCompletedRetention)
      : 1000;
    this.completedTtlMs = typeof options.completedTtlMs === 'number'
      ? Math.max(1000, options.completedTtlMs)
      : 3600000; // 1 hour

    this.operations = new Map();
  }

  /**
   * Registers a new operation or returns the existing operation if ID matches.
   *
   * @param {Object} options
   * @returns {OperationRecord}
   */
  register(options = {}) {
    const operationId = options.operationId || generateId('op');

    if (this.operations.has(operationId)) {
      return this.operations.get(operationId);
    }

    if (options.parentOperationId) {
      const parent = this.operations.get(options.parentOperationId);
      if (parent) {
        if (!parent.childOperationIds.includes(operationId)) {
          parent.childOperationIds.push(operationId);
        }
      }
    }

    const record = new OperationRecord({
      ...options,
      operationId,
    });

    this.operations.set(operationId, record);
    return record;
  }

  /**
   * Retrieves an operation by its identifier.
   */
  get(operationId) {
    return this.operations.get(operationId) || null;
  }

  /**
   * Returns true if the operation is registered.
   */
  has(operationId) {
    return this.operations.has(operationId);
  }

  /**
   * Transitions an operation's status.
   */
  transition(operationId, targetStatus, metadata = {}) {
    const record = this.operations.get(operationId);
    if (!record) {
      throw new Error(`Operation '${operationId}' not found in registry.`);
    }
    return record.transitionTo(targetStatus, metadata);
  }

  /**
   * Updates an operation's progress.
   */
  updateProgress(operationId, progressData) {
    const record = this.operations.get(operationId);
    if (!record) {
      throw new Error(`Operation '${operationId}' not found in registry.`);
    }
    record.setProgress(progressData);
    return record.progress;
  }

  /**
   * Records agent state on an operation.
   */
  recordAgentState(operationId, agentName, state, context = null, error = null) {
    const record = this.operations.get(operationId);
    if (!record) {
      throw new Error(`Operation '${operationId}' not found in registry.`);
    }
    return record.recordAgent(agentName, state, context, error);
  }

  /**
   * Records skill state on an operation.
   */
  recordSkillState(operationId, skillName, state, context = null, error = null) {
    const record = this.operations.get(operationId);
    if (!record) {
      throw new Error(`Operation '${operationId}' not found in registry.`);
    }
    return record.recordSkill(skillName, state, context, error);
  }

  /**
   * Records a tool execution on an operation.
   */
  recordToolExecution(operationId, toolName, status, options = {}) {
    const record = this.operations.get(operationId);
    if (!record) {
      throw new Error(`Operation '${operationId}' not found in registry.`);
    }
    return record.recordTool(toolName, status, options);
  }

  /**
   * Records verified evidence on an operation.
   */
  recordEvidence(operationId, evidenceItem) {
    const record = this.operations.get(operationId);
    if (!record) {
      throw new Error(`Operation '${operationId}' not found in registry.`);
    }
    return record.recordEvidence(evidenceItem);
  }

  /**
   * Records an operation retry.
   */
  recordRetry(operationId, options = {}) {
    const record = this.operations.get(operationId);
    if (!record) {
      throw new Error(`Operation '${operationId}' not found in registry.`);
    }
    return record.recordRetry(options);
  }

  /**
   * Records an operation cancellation.
   */
  recordCancellation(operationId, reason, metadata = {}) {
    const record = this.operations.get(operationId);
    if (!record) {
      throw new Error(`Operation '${operationId}' not found in registry.`);
    }
    return record.recordCancellation(reason, metadata);
  }

  /**
   * Correlates an ActivityEvent with an operation.
   */
  recordEvent(operationId, eventOrPartial) {
    let record = this.operations.get(operationId);
    if (!record) {
      record = this.register({ operationId });
    }

    const event = eventOrPartial.eventId
      ? eventOrPartial
      : createActivityEvent({ ...eventOrPartial, operationId });

    record.addEvent(event);
    return event;
  }

  /**
   * Returns all active (non-terminal) operations.
   */
  listActive() {
    const active = [];
    for (const record of this.operations.values()) {
      if (!isTerminalState(record.status) && record.status !== LIFECYCLE_STATES.FAILED) {
        active.push(record);
      }
    }
    return active;
  }

  /**
   * Returns all terminal (completed, cancelled, or permanently failed) operations.
   */
  listCompleted() {
    const completed = [];
    for (const record of this.operations.values()) {
      if (isTerminalState(record.status) || record.status === LIFECYCLE_STATES.FAILED) {
        completed.push(record);
      }
    }
    return completed;
  }

  /**
   * Returns child operations for a given parent operation ID.
   */
  getChildren(parentOperationId) {
    const children = [];
    for (const record of this.operations.values()) {
      if (record.parentOperationId === parentOperationId) {
        children.push(record);
      }
    }
    return children;
  }

  /**
   * Queries operations matching filter criteria.
   */
  query(filters = {}) {
    const results = [];
    const now = Date.now();

    for (const record of this.operations.values()) {
      if (filters.status && record.status !== filters.status) {
        continue;
      }
      if (filters.parentOperationId && record.parentOperationId !== filters.parentOperationId) {
        continue;
      }
      if (filters.agent && (!record.activeAgent || record.activeAgent.name !== filters.agent)) {
        continue;
      }
      if (filters.skill && (!record.activeSkill || record.activeSkill.name !== filters.skill)) {
        continue;
      }
      if (filters.since) {
        const start = new Date(record.timestamps.startedAt).getTime();
        if (start < new Date(filters.since).getTime()) continue;
      }
      if (filters.until) {
        const start = new Date(record.timestamps.startedAt).getTime();
        if (start > new Date(filters.until).getTime()) continue;
      }

      results.push(record);

      if (filters.limit && results.length >= filters.limit) {
        break;
      }
    }

    return results;
  }

  /**
   * Performs bounded cleanup of expired and excess completed operations.
   * INVARIANT: Never evicts active (non-terminal) operations.
   *
   * @param {Object} [options]
   * @returns {{ evictedCount: number, activeCount: number, completedCount: number }}
   */
  cleanup(options = {}) {
    const maxCompleted = typeof options.maxCompleted === 'number'
      ? options.maxCompleted
      : this.maxCompletedRetention;
    const ttlMs = typeof options.ttlMs === 'number'
      ? options.ttlMs
      : this.completedTtlMs;

    const now = Date.now();
    let evictedCount = 0;
    const terminalRecords = [];

    for (const [id, record] of this.operations.entries()) {
      const isTerminal = isTerminalState(record.status) || record.status === LIFECYCLE_STATES.FAILED;
      if (!isTerminal) {
        // Active operation is strictly protected from eviction
        continue;
      }

      const completedTime = record.timestamps.completedAt
        ? new Date(record.timestamps.completedAt).getTime()
        : new Date(record.timestamps.updatedAt).getTime();

      // Check TTL expiration
      if (now - completedTime > ttlMs) {
        this.operations.delete(id);
        evictedCount++;
      } else {
        terminalRecords.push({ id, completedTime, record });
      }
    }

    // Check capacity retention limit: evict oldest completed first
    if (terminalRecords.length > maxCompleted) {
      terminalRecords.sort((a, b) => a.completedTime - b.completedTime);
      const excessCount = terminalRecords.length - maxCompleted;
      for (let i = 0; i < excessCount; i++) {
        this.operations.delete(terminalRecords[i].id);
        evictedCount++;
      }
    }

    return {
      evictedCount,
      activeCount: this.listActive().length,
      completedCount: this.listCompleted().length,
    };
  }

  /**
   * Resets the registry (primarily for test environments).
   */
  reset() {
    this.operations.clear();
  }
}

const defaultRegistry = new OperationRegistry();

module.exports = {
  ActivityProgressError,
  OperationRecord,
  OperationRegistry,
  defaultRegistry,
};
