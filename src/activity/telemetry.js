'use strict';

/**
 * Tribunal-Kit Telemetry & Live Progress Engine (Phase 5)
 *
 * Implements authoritative real-time execution progress reporting,
 * low-noise event coalescing for high-frequency bursts, stall suspicion telemetry,
 * and composite parallel progress aggregation.
 *
 * Principles:
 * - Observational only: telemetry never alters execution semantics, routing, or retry logic.
 * - Zero fabricated percentages: unmetered or indeterminate tasks report unmetered status.
 * - Non-premature completion: 100% is never reported until authoritative terminal confirmation.
 * - Out-of-order & stale event rejection: late events cannot resurrect terminal states.
 * - Non-blocking & leak-free: timers are strictly unref'd and disposed on shutdown.
 */

const {
  EVENT_TYPES,
  STATUSES,
  PROGRESS_STATES,
  AGGREGATION_POLICIES,
} = require('./types');


class TelemetryError extends Error {
  constructor(message, operationId = null, details = {}) {
    super(message);
    this.name = 'TelemetryError';
    this.code = 'TELEMETRY_ERROR';
    this.operationId = operationId;
    this.details = details;
  }
}

class StaleEventError extends TelemetryError {
  constructor(message, operationId = null, details = {}) {
    super(message, operationId, details);
    this.name = 'StaleEventError';
    this.code = 'STALE_EVENT_ERROR';
  }
}

// ── Progress Calculator & Percentage Integrity Helper ────────────────────────

class ProgressCalculator {
  /**
   * Calculates an authoritative, bounded progress structure.
   *
   * @param {Object} input
   * @param {number|null} [input.current]
   * @param {number|null} [input.total]
   * @param {string} [input.unit]
   * @param {boolean} [input.isAuthoritative]
   * @param {Array} [input.stages]
   * @param {Object} [options]
   * @param {boolean} [options.isTerminal=false] - Whether operation has confirmed terminal completion.
   * @param {number} [options.previousPercentage] - Enforces monotonic progress within attempt.
   * @returns {Object} Normalized progress object.
   */
  static calculate(input, options = {}) {
    if (!input || typeof input !== 'object') {
      return {
        current: null,
        total: null,
        percentage: null,
        unit: 'steps',
        isAuthoritative: false,
        stages: [],
      };
    }

    const { current, total, unit = 'steps', isAuthoritative = true, stages = [] } = input;
    const isUnmetered =
      isAuthoritative === false ||
      current === null ||
      current === undefined ||
      total === null ||
      total === undefined;

    if (isUnmetered) {
      return {
        current: null,
        total: null,
        percentage: null,
        unit: typeof unit === 'string' ? unit : 'steps',
        isAuthoritative: false,
        stages: Array.isArray(stages) ? stages.map(s => ({ ...s })) : [],
      };
    }

    const curNum = Math.max(0, Math.floor(Number(current) || 0));
    const totNum = Math.max(0, Math.floor(Number(total) || 0));

    if (curNum > totNum) {
      throw new TelemetryError(
        `Current progress (${curNum}) cannot exceed total (${totNum})`,
        options.operationId || null,
        { current: curNum, total: totNum }
      );
    }

    let percentage = 0;
    if (totNum > 0) {
      percentage = Math.floor((curNum / totNum) * 100);
    }

    // Guard against premature 100% reporting:
    // If curNum < totNum, percentage cannot reach 100%.
    // If not confirmed terminal and requireTerminalConfirmation is set, cap at 99%.
    if (percentage >= 100 && curNum < totNum) {
      percentage = 99;
    } else if (percentage === 100 && options.isTerminal !== true && options.requireTerminalConfirmation) {
      percentage = 99;
    }

    // Monotonic enforcement within current attempt if requested
    if (typeof options.previousPercentage === 'number' && !Number.isNaN(options.previousPercentage)) {
      percentage = Math.max(percentage, options.previousPercentage);
    }

    // Ensure 0-100 range
    percentage = Math.min(100, Math.max(0, percentage));

    return {
      current: curNum,
      total: totNum,
      percentage,
      unit: typeof unit === 'string' ? unit : 'steps',
      isAuthoritative: true,
      stages: Array.isArray(stages) ? stages.map(s => ({ ...s })) : [],
    };
  }
}

// ── Low-Noise Event Coalescer ────────────────────────────────────────────────

const CRITICAL_EVENT_TYPES = new Set([
  EVENT_TYPES.VALIDATION_FAILED,
  EVENT_TYPES.VALIDATION_PASSED,
  EVENT_TYPES.APPROVAL_REQUIRED,
  EVENT_TYPES.HUMAN_APPROVAL_REQUIRED,
  EVENT_TYPES.OPERATION_BLOCKED,
  EVENT_TYPES.OPERATION_COMPLETED,
  EVENT_TYPES.OPERATION_CANCELLED,
  EVENT_TYPES.WARNING_DETECTED,
  EVENT_TYPES.STALL_SUSPECTED,
]);

class ProgressCoalescer {
  /**
   * @param {Object} [options]
   * @param {number} [options.windowMs=50] - Coalescing window in milliseconds.
   * @param {number} [options.maxBurstSize=100] - Immediate flush threshold on high burst.
   * @param {Function} [options.onFlush] - Callback invoked when an event is flushed.
   * @param {Function} [options.isCriticalEvent] - Custom critical event checker.
   */
  constructor(options = {}) {
    this.windowMs = typeof options.windowMs === 'number' ? Math.max(10, options.windowMs) : 50;
    this.maxBurstSize = typeof options.maxBurstSize === 'number' ? Math.max(1, options.maxBurstSize) : 100;
    this.onFlush = typeof options.onFlush === 'function' ? options.onFlush : null;
    this.isCritical = typeof options.isCriticalEvent === 'function'
      ? options.isCriticalEvent
      : (evt) => evt && CRITICAL_EVENT_TYPES.has(evt.eventType);

    this.buffers = new Map();
    this.isDisposed = false;
  }

  /**
   * Pushes an event into the coalescer.
   * Critical events immediately flush pending buffers and dispatch synchronously.
   * Progress events are buffered and merged across windowMs.
   *
   * @param {Object} event
   * @param {Object} [options]
   * @returns {Object} Dispatch outcome { coalesced, immediate, sampleCount, event }
   */
  push(event, options = {}) {
    if (this.isDisposed || !event || typeof event !== 'object') {
      return { coalesced: false, immediate: false, event };
    }

    const opId = event.operationId || 'default';

    // Critical events must never be delayed
    if (this.isCritical(event) || options.forceImmediate) {
      // Flush any pending progress tick for this operation first
      if (this.buffers.has(opId)) {
        this.flush(opId);
      }
      if (this.onFlush) {
        this.onFlush(event);
      }
      return { coalesced: false, immediate: true, sampleCount: 1, event };
    }

    // Coalesce non-critical progress events
    let buffer = this.buffers.get(opId);

    if (!buffer) {
      buffer = {
        operationId: opId,
        timer: null,
        sampleCount: 1,
        firstTimestamp: Date.now(),
        lastTimestamp: Date.now(),
        initialCurrent: event.progress && typeof event.progress.current === 'number' ? event.progress.current : null,
        latestEvent: event,
      };

      buffer.timer = setTimeout(() => {
        this.flush(opId);
      }, this.windowMs);

      if (buffer.timer && typeof buffer.timer.unref === 'function') {
        buffer.timer.unref();
      }

      this.buffers.set(opId, buffer);
      return { coalesced: true, immediate: false, sampleCount: 1, pending: true, event };
    }

    // Existing buffer: merge
    buffer.sampleCount++;
    buffer.lastTimestamp = Date.now();
    buffer.latestEvent = event;

    // Flush immediately if burst reaches maxBurstSize
    if (buffer.sampleCount >= this.maxBurstSize) {
      const flushed = this.flush(opId);
      return { coalesced: true, immediate: true, sampleCount: buffer.sampleCount, pending: false, event: flushed };
    }

    return { coalesced: true, immediate: false, sampleCount: buffer.sampleCount, pending: true, event };
  }

  /**
   * Flushes pending buffered events for an operation, or all operations.
   *
   * @param {string|null} [operationId]
   * @returns {Object|Array<Object>|null}
   */
  flush(operationId = null) {
    if (operationId !== null) {
      const buffer = this.buffers.get(operationId);
      if (!buffer) return null;

      if (buffer.timer) {
        clearTimeout(buffer.timer);
      }
      this.buffers.delete(operationId);

      const flushedEvent = buffer.latestEvent;
      const durationMs = Math.max(1, buffer.lastTimestamp - buffer.firstTimestamp);

      let velocity = null;
      if (
        flushedEvent.progress &&
        typeof flushedEvent.progress.current === 'number' &&
        typeof buffer.initialCurrent === 'number'
      ) {
        const delta = flushedEvent.progress.current - buffer.initialCurrent;
        const seconds = durationMs / 1000;
        if (seconds > 0) {
          velocity = Number((delta / seconds).toFixed(2));
        }
      }

      // Attach telemetry annotations
      const telemetryMeta = {
        coalesced: true,
        sampleCount: buffer.sampleCount,
        elapsedMs: durationMs,
        velocity,
      };

      const enrichedEvent = Object.isFrozen(flushedEvent)
        ? Object.freeze({
            ...flushedEvent,
            metadata: Object.freeze({
              ...(flushedEvent.metadata || {}),
              _telemetry: telemetryMeta,
            }),
          })
        : Object.assign(flushedEvent, {
            metadata: {
              ...(flushedEvent.metadata || {}),
              _telemetry: telemetryMeta,
            },
          });

      if (this.onFlush) {
        this.onFlush(enrichedEvent);
      }

      return enrichedEvent;
    }

    // Flush all
    const results = [];
    const opIds = Array.from(this.buffers.keys());
    for (const id of opIds) {
      const item = this.flush(id);
      if (item) results.push(item);
    }
    return results;
  }

  /**
   * Disposes the coalescer, flushing all pending buffers and clearing timers.
   */
  dispose() {
    this.isDisposed = true;
    this.flush();
    this.buffers.clear();
  }
}

// ── Stall Detector & Suspicion Telemetry ─────────────────────────────────────

class StallDetector {
  /**
   * @param {Object} [options]
   * @param {number} [options.stallThresholdMs=30000] - Inactivity duration before flagging stall.
   * @param {number} [options.checkIntervalMs=5000] - Periodic scan interval.
   * @param {Function} [options.onStall] - Callback invoked when a stall is detected.
   */
  constructor(options = {}) {
    this.stallThresholdMs = typeof options.stallThresholdMs === 'number'
      ? Math.max(10, options.stallThresholdMs)
      : 30000;
    this.checkIntervalMs = typeof options.checkIntervalMs === 'number'
      ? Math.max(10, options.checkIntervalMs)
      : 5000;
    this.onStall = typeof options.onStall === 'function' ? options.onStall : null;

    this.monitored = new Map();
    this.intervalTimer = null;
    this.isDisposed = false;
  }

  /**
   * Begins monitoring an operation for silence / stalled execution.
   *
   * @param {string} operationId
   * @param {Object} [options]
   */
  startMonitoring(operationId, options = {}) {
    if (this.isDisposed || !operationId) return;

    this.monitored.set(operationId, {
      operationId,
      title: options.title || 'Engineering Operation',
      state: options.state || PROGRESS_STATES.RUNNING,
      lastHeartbeatAt: Date.now(),
      flagged: false,
      metadata: options.metadata || {},
    });

    this._ensureTimer();
  }

  /**
   * Records an explicit heartbeat for an operation.
   *
   * @param {string} operationId
   * @param {Object} [metadata]
   */
  heartbeat(operationId, metadata = {}) {
    const entry = this.monitored.get(operationId);
    if (!entry) return;

    entry.lastHeartbeatAt = Date.now();
    entry.flagged = false;
    if (metadata.state) {
      entry.state = metadata.state;
    }
    if (metadata) {
      entry.metadata = { ...entry.metadata, ...metadata };
    }
  }

  /**
   * Updates state based on an observed activity event.
   * Automatically deregisters terminal operations and suspends stall flags during waiting states.
   *
   * @param {string} operationId
   * @param {Object} event
   */
  recordActivity(operationId, event) {
    if (!event || !operationId) return;
    const entry = this.monitored.get(operationId);
    if (!entry) return;

    entry.lastHeartbeatAt = Date.now();
    entry.flagged = false;

    // Terminal events stop monitoring automatically
    if (
      event.eventType === EVENT_TYPES.OPERATION_COMPLETED ||
      event.eventType === EVENT_TYPES.OPERATION_CANCELLED ||
      (event.eventType === EVENT_TYPES.VALIDATION_FAILED && event.terminal)
    ) {
      this.stopMonitoring(operationId);
      return;
    }

    // Expected waiting states (e.g. human gate, external rate limiter)
    if (
      event.eventType === EVENT_TYPES.APPROVAL_REQUIRED ||
      event.eventType === EVENT_TYPES.HUMAN_APPROVAL_REQUIRED ||
      event.eventType === EVENT_TYPES.OPERATION_BLOCKED
    ) {
      entry.state = PROGRESS_STATES.WAITING;
      return;
    }

    if (entry.state === PROGRESS_STATES.WAITING) {
      entry.state = PROGRESS_STATES.RUNNING;
    }
  }

  /**
   * Stops monitoring an operation.
   *
   * @param {string} operationId
   */
  stopMonitoring(operationId) {
    this.monitored.delete(operationId);
    if (this.monitored.size === 0 && this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  /**
   * Runs a scan across all monitored operations and emits stall events for unresponsive tasks.
   *
   * @returns {Array<Object>} List of newly flagged stall events.
   */
  check() {
    if (this.isDisposed) return [];

    const now = Date.now();
    const stallEvents = [];

    for (const [opId, entry] of this.monitored.entries()) {
      // Waiting states are expected idle times, not stalls
      if (entry.state === PROGRESS_STATES.WAITING) {
        continue;
      }

      // Already flagged without intermediate activity
      if (entry.flagged) {
        continue;
      }

      const silenceDurationMs = now - entry.lastHeartbeatAt;
      if (silenceDurationMs >= this.stallThresholdMs) {
        entry.flagged = true;

        const silenceSeconds = Math.round(silenceDurationMs / 1000);
        const stallEvent = {
          eventType: EVENT_TYPES.STALL_SUSPECTED,
          operationId: opId,
          status: STATUSES.WARNING,
          title: `Stall Suspected · ${entry.title}`,
          summary: `No activity detected for ${silenceSeconds}s. The underlying subprocess or reviewer pipeline may be blocked or unmetered.`,
          metadata: {
            silenceDurationMs,
            lastHeartbeatAt: new Date(entry.lastHeartbeatAt).toISOString(),
            state: entry.state,
            ...entry.metadata,
          },
          nextAction: 'Verify process liveness, check subprocess stderr, or confirm network/gate availability',
        };

        stallEvents.push(stallEvent);

        if (this.onStall) {
          this.onStall(stallEvent);
        }
      }
    }

    return stallEvents;
  }

  _ensureTimer() {
    if (this.intervalTimer || this.isDisposed) return;
    this.intervalTimer = setInterval(() => {
      this.check();
    }, this.checkIntervalMs);

    if (this.intervalTimer && typeof this.intervalTimer.unref === 'function') {
      this.intervalTimer.unref();
    }
  }

  /**
   * Disposes the stall detector and clears all intervals and state.
   */
  dispose() {
    this.isDisposed = true;
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.monitored.clear();
  }
}

// ── Composite Parallel Progress Aggregator ───────────────────────────────────

class ParallelProgressAggregator {
  /**
   * @param {Object} [options]
   * @param {string} [options.parentOperationId] - Parent composite operation ID.
   * @param {string} [options.policy=AGGREGATION_POLICIES.ALL_MUST_PASS] - Aggregation policy.
   * @param {number} [options.partialSuccessThreshold=1.0] - Threshold ratio (0.0 - 1.0) for partial success.
   * @param {Array<string>} [options.optionalSubtasks] - IDs of subtasks that are non-critical.
   * @param {number} [options.totalExpected] - Expected total tasks if known upfront.
   * @param {Function} [options.onUpdate] - Listener invoked whenever aggregated state updates.
   */
  constructor(options = {}) {
    this.parentOperationId = options.parentOperationId || 'parent_op';
    this.policy = options.policy || AGGREGATION_POLICIES.ALL_MUST_PASS;
    this.partialSuccessThreshold = typeof options.partialSuccessThreshold === 'number'
      ? Math.max(0, Math.min(1, options.partialSuccessThreshold))
      : 1.0;
    this.optionalSubtasks = new Set(Array.isArray(options.optionalSubtasks) ? options.optionalSubtasks : []);
    this.totalExpected = typeof options.totalExpected === 'number' ? Math.max(0, options.totalExpected) : null;
    this.onUpdate = typeof options.onUpdate === 'function' ? options.onUpdate : null;

    this.children = new Map();
    this.isDisposed = false;
  }

  /**
   * Registers a child subtask or parallel worker.
   *
   * @param {string} childId
   * @param {Object} [options]
   */
  registerChild(childId, options = {}) {
    if (this.isDisposed || !childId) return;

    const isOptional = options.isOptional !== undefined
      ? Boolean(options.isOptional)
      : this.optionalSubtasks.has(childId);

    const childRecord = {
      id: childId,
      name: options.name || childId,
      weight: typeof options.weight === 'number' ? Math.max(0.1, options.weight) : 1,
      state: options.state || PROGRESS_STATES.QUEUED,
      progress: options.progress ? ProgressCalculator.calculate(options.progress) : null,
      isOptional,
      isTerminal: false,
      lastSequenceNum: 0,
      lastUpdatedAt: Date.now(),
      error: null,
    };

    this.children.set(childId, childRecord);
    this._notify();
  }

  /**
   * Updates child progress with strict monotonic guards and stale-event protection.
   *
   * @param {string} childId
   * @param {Object} progressPayload
   * @param {Object} [options]
   * @param {number} [options.sequenceNum]
   * @param {string|number} [options.timestamp]
   */
  updateChildProgress(childId, progressPayload, options = {}) {
    if (this.isDisposed) return;
    const child = this.children.get(childId);
    if (!child) {
      this.registerChild(childId, { state: PROGRESS_STATES.RUNNING, progress: progressPayload });
      return;
    }

    // Stale event defense: If sequenceNum is older than last known, drop
    if (typeof options.sequenceNum === 'number' && options.sequenceNum <= child.lastSequenceNum) {
      return;
    }

    // A progress event cannot resurrect an already terminal child
    if (child.isTerminal) {
      return;
    }

    const calculated = ProgressCalculator.calculate(progressPayload, {
      previousPercentage: child.progress ? child.progress.percentage : undefined,
    });

    child.progress = calculated;
    if (typeof options.sequenceNum === 'number') {
      child.lastSequenceNum = options.sequenceNum;
    }
    child.lastUpdatedAt = Date.now();

    if (child.state === PROGRESS_STATES.QUEUED) {
      child.state = PROGRESS_STATES.RUNNING;
    }

    this._notify();
  }

  /**
   * Updates child execution state. Protects terminal outcomes from resurrection.
   *
   * @param {string} childId
   * @param {string} state - PROGRESS_STATES value.
   * @param {Object} [options]
   */
  updateChildState(childId, state, options = {}) {
    if (this.isDisposed) return;
    let child = this.children.get(childId);
    if (!child) {
      this.registerChild(childId, { state });
      child = this.children.get(childId);
    }

    // Stale sequence protection
    if (typeof options.sequenceNum === 'number' && options.sequenceNum <= child.lastSequenceNum) {
      return;
    }

    // Guard: Terminal state cannot be undone by non-terminal transition
    const isTerminalState =
      state === PROGRESS_STATES.COMPLETED ||
      state === PROGRESS_STATES.FAILED ||
      state === PROGRESS_STATES.CANCELLED ||
      state === PROGRESS_STATES.INTERRUPTED;

    if (child.isTerminal && !isTerminalState) {
      // Discard resurrection attempt
      return;
    }

    child.state = state;
    if (isTerminalState) {
      child.isTerminal = true;
    }
    if (options.error) {
      child.error = options.error;
    }
    if (typeof options.sequenceNum === 'number') {
      child.lastSequenceNum = options.sequenceNum;
    }
    child.lastUpdatedAt = Date.now();

    this._notify();
  }

  /**
   * Computes an authoritative composite execution and progress snapshot.
   *
   * @returns {Object} Composite snapshot.
   */
  getSnapshot() {
    const totalKnown = this.children.size;
    let queuedCount = 0;
    let runningCount = 0;
    let waitingCount = 0;
    let completedCount = 0;
    let failedCount = 0;
    let cancelledCount = 0;
    let interruptedCount = 0;

    let hasUnmeteredChild = false;
    let totalWeight = 0;
    let weightedCurrent = 0;
    let weightedTotal = 0;

    const childSnapshots = [];

    for (const child of this.children.values()) {
      childSnapshots.push({
        id: child.id,
        name: child.name,
        state: child.state,
        isOptional: child.isOptional,
        isTerminal: child.isTerminal,
        progress: child.progress,
      });

      switch (child.state) {
        case PROGRESS_STATES.QUEUED:
        case PROGRESS_STATES.STARTING:
          queuedCount++;
          break;
        case PROGRESS_STATES.RUNNING:
          runningCount++;
          break;
        case PROGRESS_STATES.WAITING:
          waitingCount++;
          break;
        case PROGRESS_STATES.COMPLETED:
          completedCount++;
          break;
        case PROGRESS_STATES.FAILED:
          failedCount++;
          break;
        case PROGRESS_STATES.CANCELLED:
          cancelledCount++;
          break;
        case PROGRESS_STATES.INTERRUPTED:
          interruptedCount++;
          break;
        default:
          break;
      }

      // Check metered progress availability
      if (child.progress && child.progress.isAuthoritative && child.progress.total > 0) {
        const weight = child.weight;
        totalWeight += weight;
        weightedCurrent += (child.progress.current || 0) * weight;
        weightedTotal += (child.progress.total || 0) * weight;
      } else {
        hasUnmeteredChild = true;
      }
    }

    // Determine composite overall state
    const allTerminal = totalKnown > 0 && (completedCount + failedCount + cancelledCount + interruptedCount === totalKnown);
    let overallState = PROGRESS_STATES.RUNNING;

    if (totalKnown === 0) {
      overallState = PROGRESS_STATES.QUEUED;
    } else if (queuedCount === totalKnown) {
      overallState = PROGRESS_STATES.QUEUED;
    } else if (waitingCount === totalKnown) {
      overallState = PROGRESS_STATES.WAITING;
    } else if (allTerminal) {
      // Evaluate outcome based on policy
      if (this.policy === AGGREGATION_POLICIES.ALL_MUST_PASS) {
        // Any required child failure fails the parent
        const requiredFailed = Array.from(this.children.values()).some(
          c => !c.isOptional && (c.state === PROGRESS_STATES.FAILED || c.state === PROGRESS_STATES.INTERRUPTED)
        );
        const requiredCancelled = Array.from(this.children.values()).some(
          c => !c.isOptional && c.state === PROGRESS_STATES.CANCELLED
        );

        if (requiredFailed) {
          overallState = PROGRESS_STATES.FAILED;
        } else if (requiredCancelled) {
          overallState = PROGRESS_STATES.CANCELLED;
        } else {
          overallState = PROGRESS_STATES.COMPLETED;
        }
      } else if (this.policy === AGGREGATION_POLICIES.PERMIT_PARTIAL_SUCCESS) {
        const successRatio = totalKnown > 0 ? completedCount / totalKnown : 0;
        const requiredPassed = Array.from(this.children.values()).every(
          c => c.isOptional || c.state === PROGRESS_STATES.COMPLETED
        );

        if (requiredPassed && successRatio >= this.partialSuccessThreshold) {
          overallState = PROGRESS_STATES.COMPLETED;
        } else {
          overallState = PROGRESS_STATES.FAILED;
        }
      } else if (this.policy === AGGREGATION_POLICIES.ANY_PASS) {
        if (completedCount >= 1) {
          overallState = PROGRESS_STATES.COMPLETED;
        } else {
          overallState = PROGRESS_STATES.FAILED;
        }
      }
    } else {
      // Not all terminal. If policy is strict ALL_MUST_PASS and a required child failed:
      const requiredFailedEarly = Array.from(this.children.values()).some(
        c => !c.isOptional && (c.state === PROGRESS_STATES.FAILED || c.state === PROGRESS_STATES.INTERRUPTED)
      );
      if (this.policy === AGGREGATION_POLICIES.ALL_MUST_PASS && requiredFailedEarly) {
        overallState = PROGRESS_STATES.FAILED;
      } else {
        overallState = PROGRESS_STATES.RUNNING;
      }
    }

    // Determine composite progress:
    // If ANY child is unmetered or not all children have metered progress,
    // composite percentage MUST NOT be fabricated. Report unmetered status accurately.
    let compositeProgress = null;

    if (!hasUnmeteredChild && totalWeight > 0 && weightedTotal > 0) {
      let pct = Math.floor((weightedCurrent / weightedTotal) * 100);
      if (pct >= 100 && overallState !== PROGRESS_STATES.COMPLETED) {
        pct = 99;
      }
      if (overallState === PROGRESS_STATES.COMPLETED) {
        pct = 100;
      }

      compositeProgress = {
        current: Math.round(weightedCurrent),
        total: Math.round(weightedTotal),
        percentage: pct,
        unit: 'steps',
        isAuthoritative: true,
      };
    } else {
      // Unmetered composite progress accurately conveys subtask completion counts without fake percentage
      compositeProgress = {
        current: completedCount,
        total: totalKnown,
        percentage: null,
        unit: 'subtasks',
        isAuthoritative: false,
      };
    }

    return {
      parentOperationId: this.parentOperationId,
      policy: this.policy,
      overallState,
      totalKnown,
      expectedTotal: this.totalExpected || totalKnown,
      counts: {
        queued: queuedCount,
        running: runningCount,
        waiting: waitingCount,
        completed: completedCount,
        failed: failedCount,
        cancelled: cancelledCount,
        interrupted: interruptedCount,
      },
      progress: compositeProgress,
      isAllTerminal: allTerminal,
      children: childSnapshots,
    };
  }

  _notify() {
    if (this.onUpdate && !this.isDisposed) {
      this.onUpdate(this.getSnapshot());
    }
  }

  /**
   * Disposes the aggregator.
   */
  dispose() {
    this.isDisposed = true;
    this.children.clear();
  }
}

module.exports = {
  TelemetryError,
  StaleEventError,
  ProgressCalculator,
  ProgressCoalescer,
  StallDetector,
  ParallelProgressAggregator,
  CRITICAL_EVENT_TYPES,
};
