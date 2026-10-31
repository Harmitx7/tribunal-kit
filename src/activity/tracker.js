'use strict';

/**
 * Tribunal-Kit Activity Tracker (Phase 2)
 *
 * Manages the lifecycle of an engineering operation, tracks state transitions
 * backed by OperationRegistry, deduplicates repetitive status updates,
 * guarantees evidence integrity, and renders formatted updates to host AI environments.
 */

const { EVENT_TYPES, ACTIVITY_STATES, ENVIRONMENTS, LIFECYCLE_STATES, AGENT_SKILL_STATES, TOOL_STATES } = require('./types');
const { createEvent, generateId } = require('./schema');
const { renderMarkdown } = require('./renderers/markdown');
const { renderTerminal } = require('./renderers/terminal');
const { renderPlainText } = require('./renderers/plaintext');
const { renderJson } = require('./renderers/structured');
const { SkillAgentResolver } = require('./resolver');
const { defaultRegistry } = require('./registry');
const { defaultAnnouncementIntelligence } = require('./announcement');
const { ProgressCoalescer, StallDetector, ParallelProgressAggregator } = require('./telemetry');
const { defaultDiagnosticBuffer } = require('./diagnostics');
const { resolveDetailLevel, shouldDisplayEvent } = require('./progressive_disclosure');
const { formatCompletionSummary } = require('./summary');

class ActivityTracker {
  constructor(options = {}) {
    this.operationId = options.operationId || generateId('op');
    this.parentOperationId = options.parentOperationId || null;
    this.title = options.title || 'Engineering Operation';
    this.environment = options.environment || ENVIRONMENTS.MARKDOWN;
    this.detailLevel = options.detailLevel || resolveDetailLevel(options);
    this.diagnosticBuffer = options.diagnosticBuffer || defaultDiagnosticBuffer;
    this.onEvent = typeof options.onEvent === 'function' ? options.onEvent : null;
    this.resolver = options.resolver || new SkillAgentResolver({ projectRoot: options.projectRoot });
    this.registry = options.registry || defaultRegistry;
    this.announcementIntelligence = options.announcementIntelligence || defaultAnnouncementIntelligence;

    this.events = [];
    this.startedAt = Date.now();
    this.completedAt = null;
    this.lastEventSignature = null;
    this.retries = 0;
    this.warningsCount = 0;
    this.currentPhase = null;
    this.latestProgress = null;

    // Register operation in the registry
    this.operation = this.registry.register({
      operationId: this.operationId,
      parentOperationId: this.parentOperationId,
      title: this.title,
      status: options.initialStatus || LIFECYCLE_STATES.RUNNING,
      metadata: options.metadata || {},
    });

    // Telemetry & Coalescing (Phase 5)
    this.coalescer = options.coalescer || (options.enableCoalescing
      ? new ProgressCoalescer({
          ...options.coalescerOptions,
          onFlush: (flushedEvent) => this._dispatch(flushedEvent, { force: true }),
        })
      : null);

    this.stallDetector = options.stallDetector || (options.enableStallDetection
      ? new StallDetector({
          ...options.stallDetectorOptions,
          onStall: (stallEvt) => this._dispatch(stallEvt, { force: true }),
        })
      : null);

    if (this.stallDetector) {
      this.stallDetector.startMonitoring(this.operationId, {
        title: this.title,
        state: options.initialStatus || LIFECYCLE_STATES.RUNNING,
      });
    }
  }

  /**
   * Retrieves the underlying OperationRecord.
   */
  getOperation() {
    return this.operation;
  }

  /**
   * Returns current operational lifecycle status.
   */
  getStatus() {
    return this.operation ? this.operation.status : null;
  }

  /**
   * Creates a child ActivityTracker linked to this operation.
   */
  createChildTracker(options = {}) {
    return new ActivityTracker({
      title: options.title || `${this.title} · Subtask`,
      ...options,
      parentOperationId: this.operationId,
      registry: this.registry,
      announcementIntelligence: this.announcementIntelligence,
      environment: options.environment || this.environment,
      resolver: this.resolver,
      onEvent: options.onEvent || this.onEvent,
    });
  }

  /**
   * Computes a signature string for an event to prevent spamming identical updates.
   */
  _computeSignature(event) {
    const prog = event.progress ? `${event.progress.current}/${event.progress.total}` : '';
    const err = event.error ? event.error.message : '';
    const warn = event.warning ? event.warning.message : '';
    const att = event.attempt ? `att:${event.attempt}` : '';
    const summary = event.summary ? `sum:${event.summary.slice(0, 30)}` : '';
    return `${event.eventType}::${event.title}::${prog}::${err}::${warn}::${att}::${summary}::${event.nextAction || ''}`;
  }

  /**
   * Internal dispatcher for recording, storing, and rendering an event.
   */
  _dispatch(eventPayload, options = {}) {
    const event = createEvent({
      ...eventPayload,
      operationId: this.operationId,
      attempt: eventPayload.attempt || (this.operation ? this.operation.attempt : undefined),
      phase: eventPayload.phase || this.currentPhase,
    });

    // Retain in bounded diagnostic buffer
    if (this.diagnosticBuffer) {
      this.diagnosticBuffer.record(event);
    }

    // Evaluate announcement decision via AnnouncementIntelligence
    const decision = this.announcementIntelligence
      ? this.announcementIntelligence.evaluate(event, options)
      : { shouldAnnounce: true };

    const signature = this._computeSignature(event);
    if (!options.force && (!decision.shouldAnnounce || signature === this.lastEventSignature)) {
      if (this.operation) this.operation.addEvent(event);
      this.events.push(event);
      return { event, formatted: null, isDuplicate: true, suppressedReason: decision.reason };
    }
    this.lastEventSignature = signature;

    // Synchronize event with OperationRecord in registry
    if (this.operation) {
      this.operation.addEvent(event);

      // State transitions based on event type
      switch (event.eventType) {
        case ACTIVITY_STATES.OPERATION_STARTED:
          if (this.operation.status === LIFECYCLE_STATES.PENDING) {
            this.operation.transitionTo(LIFECYCLE_STATES.RUNNING);
          }
          break;
        case ACTIVITY_STATES.APPROVAL_REQUIRED:
        case ACTIVITY_STATES.HUMAN_APPROVAL_REQUIRED:
        case ACTIVITY_STATES.OPERATION_BLOCKED:
          if (this.operation.status === LIFECYCLE_STATES.RUNNING) {
            this.operation.transitionTo(LIFECYCLE_STATES.BLOCKED, { reason: event.summary });
          }
          break;
        case ACTIVITY_STATES.OPERATION_COMPLETED:
          if (this.operation.status !== LIFECYCLE_STATES.COMPLETED) {
            this.operation.transitionTo(LIFECYCLE_STATES.COMPLETED);
          }
          break;
        case ACTIVITY_STATES.OPERATION_CANCELLED:
          if (this.operation.status !== LIFECYCLE_STATES.CANCELLED) {
            this.operation.transitionTo(LIFECYCLE_STATES.CANCELLED);
          }
          break;
        default:
          break;
      }
    }

    if (event.progress) {
      this.latestProgress = event.progress;
    }
    if (event.eventType === ACTIVITY_STATES.WARNING_DETECTED) {
      this.warningsCount++;
    }
    if (event.eventType === ACTIVITY_STATES.RETRY_IN_PROGRESS) {
      this.retries++;
    }

    this.events.push(event);
    if (this.events.length > 200) {
      this.events.shift();
      this._eventsTruncated = (this._eventsTruncated || 0) + 1;
    }

    // Notify stall detector of activity
    if (this.stallDetector) {
      this.stallDetector.recordActivity(this.operationId, event);
    }

    const detailLevel = options.detailLevel || this.detailLevel;
    const renderOpts = { detailLevel, ...options };

    if (options.filterByDetailLevel) {
      const check = shouldDisplayEvent(event, detailLevel, options);
      if (!check.visible) {
        return { event, formatted: null, isDuplicate: false, suppressedByDetailLevel: true };
      }
    }

    const formatted = this.format(event, options.environment || this.environment, renderOpts);

    if (this.onEvent) {
      this.onEvent(event, formatted);
    }

    return { event, formatted, isDuplicate: false };
  }

  /**
   * Formats an event according to the target environment.
   */
  format(event, targetEnvironment = null, options = {}) {
    const env = targetEnvironment || this.environment;
    switch (env) {
      case ENVIRONMENTS.TERMINAL:
        return renderTerminal(event, options);
      case ENVIRONMENTS.PLAINTEXT:
        return renderPlainText(event, options);
      case ENVIRONMENTS.JSON:
      case ENVIRONMENTS.STRUCTURED:
        return renderJson(event, options);
      case ENVIRONMENTS.MARKDOWN:
      default:
        return renderMarkdown(event, options);
    }
  }

  /**
   * Retrieves retained diagnostics for this operation.
   */
  getDiagnostics() {
    return this.diagnosticBuffer ? this.diagnosticBuffer.getDiagnostics(this.operationId) : null;
  }

  /**
   * Generates an actionable diagnostic report for this operation.
   */
  getDiagnosticReport(options = {}) {
    return this.diagnosticBuffer ? this.diagnosticBuffer.getDiagnosticReport(this.operationId, options) : '';
  }

  /**
   * Generates an authoritative completion summary card.
   */
  getCompletionSummary(options = {}) {
    return formatCompletionSummary(this, options);
  }

  // ── High-Level Operational State Transitions ────────────────────────────────

  start(title, summary, options = {}) {
    if (title) {
      this.title = title;
      if (this.operation) this.operation.title = title;
    }
    return this._dispatch({
      eventType: ACTIVITY_STATES.OPERATION_STARTED,
      title: this.title,
      summary,
      ...options,
    });
  }

  setPhase(phaseName) {
    this.currentPhase = phaseName;
    if (this.operation) this.operation.phase = phaseName;
  }

  activateAgent(agentName, taskContext = '') {
    if (this.operation) {
      this.operation.recordAgent(agentName, AGENT_SKILL_STATES.ACTIVATED, taskContext);
    }
    const event = this.resolver.createAgentActivationEvent(agentName, taskContext);
    return this._dispatch(event);
  }

  activateSkill(skillName, taskContext = '') {
    if (this.operation) {
      this.operation.recordSkill(skillName, AGENT_SKILL_STATES.ACTIVATED, taskContext);
    }
    const event = this.resolver.createSkillActivationEvent(skillName, taskContext);
    return this._dispatch(event);
  }

  analyzing(title, summary, options = {}) {
    return this._dispatch({
      eventType: ACTIVITY_STATES.ANALYSIS_IN_PROGRESS,
      title,
      summary,
      ...options,
    });
  }

  executingTool(toolName, summary, options = {}) {
    if (this.operation) {
      this.operation.recordTool(toolName, TOOL_STATES.EXECUTING, options);
    }
    return this._dispatch({
      eventType: ACTIVITY_STATES.TOOL_EXECUTING,
      title: `Tool: ${toolName}`,
      summary,
      ...options,
    });
  }

  runningTests(target, progress = null, nextAction = null) {
    if (progress && this.operation) {
      this.operation.setProgress(progress);
    }
    return this._dispatch({
      eventType: ACTIVITY_STATES.TESTS_RUNNING,
      title: `Running Tests: ${target}`,
      progress: progress || (this.operation ? this.operation.progress : null),
      nextAction,
    });
  }

  updateProgress(progressData, options = {}) {
    if (this.operation) {
      this.operation.setProgress(progressData);
    }
    return this._dispatch({
      eventType: EVENT_TYPES.PROGRESS_UPDATED,
      title: options.title || this.title,
      summary: options.summary || null,
      progress: this.operation ? this.operation.progress : progressData,
      ...options,
    });
  }

  coalesceProgress(progressData, options = {}) {
    if (!this.coalescer) {
      return this.updateProgress(progressData, options);
    }
    if (this.operation) {
      this.operation.setProgress(progressData);
    }
    const eventPayload = {
      eventType: EVENT_TYPES.PROGRESS_UPDATED,
      title: options.title || this.title,
      summary: options.summary || null,
      progress: this.operation ? this.operation.progress : progressData,
      ...options,
    };
    const event = createEvent({
      ...eventPayload,
      operationId: this.operationId,
      attempt: this.operation ? this.operation.attempt : undefined,
      phase: eventPayload.phase || this.currentPhase,
    });
    return this.coalescer.push(event, options);
  }

  flushCoalesced() {
    if (this.coalescer) {
      return this.coalescer.flush(this.operationId);
    }
    return null;
  }

  heartbeat(metadata = {}) {
    if (this.stallDetector) {
      this.stallDetector.heartbeat(this.operationId, metadata);
    }
  }

  stallSuspected(reason, remedy = null, options = {}) {
    return this._dispatch({
      eventType: EVENT_TYPES.STALL_SUSPECTED,
      title: `Stall Suspected · ${this.title}`,
      summary: reason || 'Operation heartbeat exceeded silence threshold',
      nextAction: remedy || 'Check worker status or inspect active processes',
      ...options,
    });
  }

  createParallelAggregator(options = {}) {
    const aggregator = new ParallelProgressAggregator({
      parentOperationId: this.operationId,
      ...options,
    });
    if (options.autoTrackProgress) {
      aggregator.onUpdate = (snapshot) => {
        if (snapshot && snapshot.progress) {
          this.updateProgress(snapshot.progress, { title: options.title || `${this.title} · Parallel` });
        }
      };
    }
    return aggregator;
  }

  collectingEvidence(source, summary, options = {}) {
    return this._dispatch({
      eventType: ACTIVITY_STATES.EVIDENCE_COLLECTING,
      title: `Collecting Evidence · ${source}`,
      summary,
      ...options,
    });
  }

  passed(title, evidence, nextAction = null, options = {}) {
    if (this.operation && evidence) {
      const ref = typeof evidence === 'string' ? evidence : (evidence.ref || evidence.path || 'validation_artifact');
      this.operation.recordEvidence({ ref, verified: true, description: title });
    }
    return this._dispatch({
      eventType: ACTIVITY_STATES.VALIDATION_PASSED,
      title,
      evidence,
      verified: true,
      nextAction,
      ...options,
    });
  }

  failed(title, error, nextAction = null, options = {}) {
    if (this.operation && error) {
      this.operation.error = {
        message: error.message || String(error),
        code: error.code || null,
        suggestion: error.suggestion || null,
      };
      if (options.terminal && this.operation.status === LIFECYCLE_STATES.RUNNING) {
        this.operation.transitionTo(LIFECYCLE_STATES.FAILED, { error: this.operation.error });
      }
    }
    if (options.terminal) {
      this.completedAt = Date.now();
      this.flushCoalesced();
      if (this.stallDetector) {
        this.stallDetector.stopMonitoring(this.operationId);
      }
    }
    return this._dispatch({
      eventType: ACTIVITY_STATES.VALIDATION_FAILED,
      title,
      error,
      nextAction,
      ...options,
    });
  }

  warning(message, impact = null, options = {}) {
    return this._dispatch({
      eventType: ACTIVITY_STATES.WARNING_DETECTED,
      title: 'Warning Detected',
      warning: { message, impact },
      ...options,
    });
  }

  approvalRequired(title, prompt, details = null) {
    return this._dispatch({
      eventType: ACTIVITY_STATES.HUMAN_APPROVAL_REQUIRED,
      title,
      summary: prompt,
      evidence: details,
      nextAction: 'Awaiting human gate sign-off (Y/N/R)',
    });
  }

  blocked(reason, remedy, options = {}) {
    return this._dispatch({
      eventType: ACTIVITY_STATES.OPERATION_BLOCKED,
      title: 'Operation Blocked',
      error: { message: reason, suggestion: remedy },
      nextAction: remedy ? `Unblock via: ${remedy}` : 'Awaiting unblocking prerequisite',
      ...options,
    });
  }

  retry(attempt, maxAttempts, reason, options = {}) {
    if (this.operation) {
      this.operation.recordRetry({
        reason,
        error: options.error,
      });
    }
    return this._dispatch({
      eventType: ACTIVITY_STATES.RETRY_IN_PROGRESS,
      title: `Retrying Operation`,
      attempt,
      maxAttempts,
      summary: reason,
      ...options,
    });
  }

  complete(summary, evidence = null, reportReferences = [], nextAction = null) {
    this.completedAt = Date.now();
    this.flushCoalesced();
    if (this.stallDetector) {
      this.stallDetector.stopMonitoring(this.operationId);
    }
    if (this.operation && evidence) {
      const ref = typeof evidence === 'string' ? evidence : (evidence.ref || evidence.path || 'completion_evidence');
      this.operation.recordEvidence({ ref, verified: true, description: summary });
    }
    return this._dispatch({
      eventType: ACTIVITY_STATES.OPERATION_COMPLETED,
      title: this.title,
      summary,
      evidence,
      reportReferences,
      nextAction,
    });
  }

  cancel(reason, options = {}) {
    this.completedAt = Date.now();
    this.flushCoalesced();
    if (this.stallDetector) {
      this.stallDetector.stopMonitoring(this.operationId);
    }
    if (this.operation) {
      this.operation.recordCancellation(reason);
    }
    return this._dispatch({
      eventType: ACTIVITY_STATES.OPERATION_CANCELLED,
      title: this.title,
      summary: `Cancelled: ${reason}`,
      ...options,
    });
  }

  /**
   * Cleans up timers, flushes any pending coalesced progress events, and unregisters monitoring.
   */
  dispose() {
    this.flushCoalesced();
    if (this.coalescer) {
      this.coalescer.dispose();
    }
    if (this.stallDetector) {
      this.stallDetector.stopMonitoring(this.operationId);
    }
  }

  /**
   * Produces an authoritative final completion summary object and formatted string.
   */
  getExecutiveSummary() {
    const durationMs = (this.completedAt || Date.now()) - this.startedAt;
    const durationFormatted = durationMs >= 1000 ? `${(durationMs / 1000).toFixed(2)}s` : `${durationMs}ms`;

    const passedCount = this.events.filter(e => e.eventType === ACTIVITY_STATES.VALIDATION_PASSED).length;
    const failedCount = this.events.filter(e => e.eventType === ACTIVITY_STATES.VALIDATION_FAILED).length;
    const warningsCount = this.warningsCount;
    const retriesCount = this.retries;

    const allArtifacts = Array.from(new Set(this.events.flatMap(e => e.reportReferences || [])));

    return {
      operationId: this.operationId,
      title: this.title,
      status: this.getStatus(),
      durationMs,
      durationFormatted,
      eventCount: this.events.length,
      passedCount,
      failedCount,
      warningsCount,
      retriesCount,
      artifacts: allArtifacts,
    };
  }
}

module.exports = {
  ActivityTracker,
};
