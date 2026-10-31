'use strict';

/**
 * Phase 5 Unit Tests: Live Progress & Execution Telemetry
 *
 * Verifies:
 * 1. Authoritative progress calculation & zero-fabricated percentage rules.
 * 2. Low-noise event coalescing for high-frequency progress bursts.
 * 3. Immediate bypass for critical operational events.
 * 4. Stall suspicion detection and heartbeat telemetry.
 * 5. Composite parallel progress aggregation and pluggable policies.
 * 6. Stale and out-of-order event defense (anti-resurrection).
 * 7. ActivityTracker telemetry integration and clean timer disposal.
 */

const {
  EVENT_TYPES,
  STATUSES,
  PROGRESS_STATES,
  AGGREGATION_POLICIES,
  ProgressCalculator,
  ProgressCoalescer,
  StallDetector,
  ParallelProgressAggregator,
  TelemetryError,
  CRITICAL_EVENT_TYPES,
  ActivityTracker,
  createActivityEvent,
} = require('../../src/activity');

describe('Phase 5: Live Progress & Execution Telemetry', () => {
  // ── 1. Progress States & Constants ──────────────────────────────────────────
  describe('1. Authoritative Execution States & Aggregation Policies', () => {
    test('defines all 9 canonical progress states', () => {
      expect(PROGRESS_STATES.QUEUED).toBe('queued');
      expect(PROGRESS_STATES.STARTING).toBe('starting');
      expect(PROGRESS_STATES.RUNNING).toBe('running');
      expect(PROGRESS_STATES.WAITING).toBe('waiting');
      expect(PROGRESS_STATES.COMPLETED).toBe('completed');
      expect(PROGRESS_STATES.FAILED).toBe('failed');
      expect(PROGRESS_STATES.CANCELLED).toBe('cancelled');
      expect(PROGRESS_STATES.INTERRUPTED).toBe('interrupted');
      expect(PROGRESS_STATES.UNKNOWN).toBe('unknown');
    });

    test('defines aggregation policies', () => {
      expect(AGGREGATION_POLICIES.ALL_MUST_PASS).toBe('all_must_pass');
      expect(AGGREGATION_POLICIES.PERMIT_PARTIAL_SUCCESS).toBe('permit_partial_success');
      expect(AGGREGATION_POLICIES.ANY_PASS).toBe('any_pass');
    });

    test('defines critical event types set for coalescing bypass', () => {
      expect(CRITICAL_EVENT_TYPES.has(EVENT_TYPES.VALIDATION_FAILED)).toBe(true);
      expect(CRITICAL_EVENT_TYPES.has(EVENT_TYPES.VALIDATION_PASSED)).toBe(true);
      expect(CRITICAL_EVENT_TYPES.has(EVENT_TYPES.APPROVAL_REQUIRED)).toBe(true);
      expect(CRITICAL_EVENT_TYPES.has(EVENT_TYPES.HUMAN_APPROVAL_REQUIRED)).toBe(true);
      expect(CRITICAL_EVENT_TYPES.has(EVENT_TYPES.OPERATION_BLOCKED)).toBe(true);
      expect(CRITICAL_EVENT_TYPES.has(EVENT_TYPES.OPERATION_COMPLETED)).toBe(true);
      expect(CRITICAL_EVENT_TYPES.has(EVENT_TYPES.OPERATION_CANCELLED)).toBe(true);
      expect(CRITICAL_EVENT_TYPES.has(EVENT_TYPES.STALL_SUSPECTED)).toBe(true);
    });
  });

  // ── 2. Progress Calculator & Percentage Integrity ──────────────────────────
  describe('2. Progress Calculation & Percentage Integrity', () => {
    test('calculates accurate percentage for metered progress', () => {
      const p = ProgressCalculator.calculate({ current: 25, total: 100, unit: 'files' });
      expect(p.current).toBe(25);
      expect(p.total).toBe(100);
      expect(p.percentage).toBe(25);
      expect(p.unit).toBe('files');
      expect(p.isAuthoritative).toBe(true);
    });

    test('returns percentage: null and isAuthoritative: false for unmetered progress', () => {
      const p1 = ProgressCalculator.calculate({ current: null, total: null });
      expect(p1.percentage).toBeNull();
      expect(p1.isAuthoritative).toBe(false);

      const p2 = ProgressCalculator.calculate({ current: 5, total: 10, isAuthoritative: false });
      expect(p2.percentage).toBeNull();
      expect(p2.isAuthoritative).toBe(false);
    });

    test('throws TelemetryError if current exceeds total', () => {
      expect(() => {
        ProgressCalculator.calculate({ current: 15, total: 10 });
      }).toThrow(TelemetryError);
    });

    test('prevents premature 100% reporting when not terminal', () => {
      // 99 / 100 is 99%
      const p1 = ProgressCalculator.calculate({ current: 99, total: 100 });
      expect(p1.percentage).toBe(99);

      // If requireTerminalConfirmation is active and isTerminal is false, caps at 99%
      const p2 = ProgressCalculator.calculate(
        { current: 10, total: 10 },
        { isTerminal: false, requireTerminalConfirmation: true }
      );
      expect(p2.percentage).toBe(99);

      // When confirmed terminal, reaches 100%
      const p3 = ProgressCalculator.calculate(
        { current: 10, total: 10 },
        { isTerminal: true, requireTerminalConfirmation: true }
      );
      expect(p3.percentage).toBe(100);
    });

    test('enforces monotonic progress when previousPercentage is specified', () => {
      const p = ProgressCalculator.calculate(
        { current: 20, total: 100 },
        { previousPercentage: 35 }
      );
      expect(p.percentage).toBe(35); // Does not regress from 35 to 20
    });
  });

  // ── 3. Low-Noise Event Coalescer ───────────────────────────────────────────
  describe('3. Event Coalescer (ProgressCoalescer)', () => {
    test('coalesces rapid progress ticks within the time window', async () => {
      const flushedEvents = [];
      const coalescer = new ProgressCoalescer({
        windowMs: 40,
        onFlush: (evt) => flushedEvents.push(evt),
      });

      // Send a rapid burst of 20 progress updates
      for (let i = 1; i <= 20; i++) {
        coalescer.push({
          eventType: EVENT_TYPES.PROGRESS_UPDATED,
          operationId: 'op_burst',
          title: 'Indexing AST',
          progress: { current: i, total: 100 },
        });
      }

      // Immediately after burst, onFlush should not have been called 20 times
      expect(flushedEvents.length).toBe(0);

      // Wait for coalescing window to fire
      await new Promise((r) => setTimeout(r, 60));

      expect(flushedEvents.length).toBe(1);
      const flushed = flushedEvents[0];
      expect(flushed.progress.current).toBe(20);
      expect(flushed.metadata._telemetry.coalesced).toBe(true);
      expect(flushed.metadata._telemetry.sampleCount).toBe(20);

      coalescer.dispose();
    });

    test('critical events immediately bypass coalescing and flush pending progress', () => {
      const flushedEvents = [];
      const coalescer = new ProgressCoalescer({
        windowMs: 100,
        onFlush: (evt) => flushedEvents.push(evt),
      });

      // Buffer a progress event
      coalescer.push({
        eventType: EVENT_TYPES.PROGRESS_UPDATED,
        operationId: 'op_crit',
        title: 'Running checks',
        progress: { current: 5, total: 10 },
      });

      expect(flushedEvents.length).toBe(0);

      // Push critical failure event
      const failureEvent = {
        eventType: EVENT_TYPES.VALIDATION_FAILED,
        operationId: 'op_crit',
        title: 'Security check failed',
        error: { message: 'SQL injection detected' },
      };

      const result = coalescer.push(failureEvent);
      expect(result.immediate).toBe(true);

      // Pending progress was flushed first, followed immediately by critical event
      expect(flushedEvents.length).toBe(2);
      expect(flushedEvents[0].eventType).toBe(EVENT_TYPES.PROGRESS_UPDATED);
      expect(flushedEvents[1].eventType).toBe(EVENT_TYPES.VALIDATION_FAILED);

      coalescer.dispose();
    });

    test('immediate flush when burst size reaches maxBurstSize', () => {
      const flushedEvents = [];
      const coalescer = new ProgressCoalescer({
        windowMs: 500,
        maxBurstSize: 5,
        onFlush: (evt) => flushedEvents.push(evt),
      });

      for (let i = 1; i <= 5; i++) {
        coalescer.push({
          eventType: EVENT_TYPES.PROGRESS_UPDATED,
          operationId: 'op_max_burst',
          title: 'Parsing files',
          progress: { current: i, total: 50 },
        });
      }

      // Reached maxBurstSize 5 -> flushes immediately without waiting 500ms
      expect(flushedEvents.length).toBe(1);
      expect(flushedEvents[0].progress.current).toBe(5);
      expect(flushedEvents[0].metadata._telemetry.sampleCount).toBe(5);

      coalescer.dispose();
    });
  });

  // ── 4. Stall Detector & Suspicion Telemetry ────────────────────────────────
  describe('4. Stall Detection & Suspicion Telemetry (StallDetector)', () => {
    test('emits stall_suspected when operation is silent beyond stallThresholdMs', () => {
      const stallEvents = [];
      const detector = new StallDetector({
        stallThresholdMs: 50,
        checkIntervalMs: 20,
        onStall: (evt) => stallEvents.push(evt),
      });

      detector.startMonitoring('op_stall_1', { title: 'Long DB Migration' });

      // Fast-forward silence: simulate time passing by altering lastHeartbeatAt
      const entry = detector.monitored.get('op_stall_1');
      entry.lastHeartbeatAt = Date.now() - 100;

      const detected = detector.check();
      expect(detected.length).toBe(1);
      expect(detected[0].eventType).toBe(EVENT_TYPES.STALL_SUSPECTED);
      expect(detected[0].operationId).toBe('op_stall_1');
      expect(detected[0].status).toBe(STATUSES.WARNING);
      expect(detected[0].title).toContain('Long DB Migration');

      detector.dispose();
    });

    test('does not flag stall if operation is in WAITING state (e.g. human gate)', () => {
      const detector = new StallDetector({ stallThresholdMs: 50 });
      detector.startMonitoring('op_wait', {
        title: 'Production Deploy',
        state: PROGRESS_STATES.WAITING,
      });

      const entry = detector.monitored.get('op_wait');
      entry.lastHeartbeatAt = Date.now() - 200;

      const detected = detector.check();
      expect(detected.length).toBe(0); // Expected idle waiting, not a stall

      detector.dispose();
    });

    test('heartbeat resets stall suspicion timer', () => {
      const detector = new StallDetector({ stallThresholdMs: 100 });
      detector.startMonitoring('op_hb', { title: 'Background Indexing' });

      const entry = detector.monitored.get('op_hb');
      entry.lastHeartbeatAt = Date.now() - 80;

      // Heartbeat arrives
      detector.heartbeat('op_hb');
      expect(Date.now() - entry.lastHeartbeatAt).toBeLessThan(10);

      const detected = detector.check();
      expect(detected.length).toBe(0);

      detector.dispose();
    });

    test('terminal events automatically stop monitoring', () => {
      const detector = new StallDetector({ stallThresholdMs: 100 });
      detector.startMonitoring('op_term', { title: 'Linting' });
      expect(detector.monitored.has('op_term')).toBe(true);

      detector.recordActivity('op_term', {
        eventType: EVENT_TYPES.OPERATION_COMPLETED,
        operationId: 'op_term',
      });

      expect(detector.monitored.has('op_term')).toBe(false);
      detector.dispose();
    });
  });

  // ── 5. Parallel Progress Aggregator ────────────────────────────────────────
  describe('5. Parallel Progress Aggregator (ParallelProgressAggregator)', () => {
    test('aggregates metered children under ALL_MUST_PASS policy', () => {
      const aggregator = new ParallelProgressAggregator({
        parentOperationId: 'parent_review',
        policy: AGGREGATION_POLICIES.ALL_MUST_PASS,
      });

      aggregator.registerChild('worker_1', { name: 'Security Auditor' });
      aggregator.registerChild('worker_2', { name: 'Performance Optimizer' });

      aggregator.updateChildProgress('worker_1', { current: 5, total: 10 });
      aggregator.updateChildProgress('worker_2', { current: 10, total: 10 });

      let snap = aggregator.getSnapshot();
      expect(snap.totalKnown).toBe(2);
      expect(snap.counts.running).toBe(2);
      expect(snap.overallState).toBe(PROGRESS_STATES.RUNNING);
      expect(snap.progress.isAuthoritative).toBe(true);
      // Total current: 15, Total total: 20 -> 75%
      expect(snap.progress.percentage).toBe(75);

      // Finish worker 1 and 2
      aggregator.updateChildState('worker_1', PROGRESS_STATES.COMPLETED);
      aggregator.updateChildState('worker_2', PROGRESS_STATES.COMPLETED);

      snap = aggregator.getSnapshot();
      expect(snap.overallState).toBe(PROGRESS_STATES.COMPLETED);
      expect(snap.progress.percentage).toBe(100);

      aggregator.dispose();
    });

    test('marks parent as FAILED under ALL_MUST_PASS if any non-optional child fails', () => {
      const aggregator = new ParallelProgressAggregator({
        policy: AGGREGATION_POLICIES.ALL_MUST_PASS,
      });

      aggregator.registerChild('sub_1', { name: 'Core Lint' });
      aggregator.registerChild('sub_2', { name: 'Core Test' });

      aggregator.updateChildState('sub_1', PROGRESS_STATES.COMPLETED);
      aggregator.updateChildState('sub_2', PROGRESS_STATES.FAILED, {
        error: { message: 'Unit test failure' },
      });

      const snap = aggregator.getSnapshot();
      expect(snap.overallState).toBe(PROGRESS_STATES.FAILED);
      expect(snap.counts.failed).toBe(1);
      expect(snap.counts.completed).toBe(1);

      aggregator.dispose();
    });

    test('permits failure of optional subtask under ALL_MUST_PASS', () => {
      const aggregator = new ParallelProgressAggregator({
        policy: AGGREGATION_POLICIES.ALL_MUST_PASS,
        optionalSubtasks: ['optional_bench'],
      });

      aggregator.registerChild('required_test', { name: 'Jest Suite' });
      aggregator.registerChild('optional_bench', { name: 'Performance Benchmark' });

      aggregator.updateChildState('required_test', PROGRESS_STATES.COMPLETED);
      aggregator.updateChildState('optional_bench', PROGRESS_STATES.FAILED);

      const snap = aggregator.getSnapshot();
      expect(snap.overallState).toBe(PROGRESS_STATES.COMPLETED);

      aggregator.dispose();
    });

    test('supports PERMIT_PARTIAL_SUCCESS policy with threshold', () => {
      const aggregator = new ParallelProgressAggregator({
        policy: AGGREGATION_POLICIES.PERMIT_PARTIAL_SUCCESS,
        partialSuccessThreshold: 0.75, // 75% must pass
      });

      aggregator.registerChild('t1', { isOptional: true });
      aggregator.registerChild('t2', { isOptional: true });
      aggregator.registerChild('t3', { isOptional: true });
      aggregator.registerChild('t4', { isOptional: true });

      aggregator.updateChildState('t1', PROGRESS_STATES.COMPLETED);
      aggregator.updateChildState('t2', PROGRESS_STATES.COMPLETED);
      aggregator.updateChildState('t3', PROGRESS_STATES.COMPLETED);
      aggregator.updateChildState('t4', PROGRESS_STATES.FAILED); // 3 of 4 = 75%

      const snap = aggregator.getSnapshot();
      expect(snap.overallState).toBe(PROGRESS_STATES.COMPLETED);

      aggregator.dispose();
    });

    test('reports unmetered status without fabricated percentage if any child is unmetered', () => {
      const aggregator = new ParallelProgressAggregator();
      aggregator.registerChild('metered_task');
      aggregator.registerChild('unmetered_task');

      aggregator.updateChildProgress('metered_task', { current: 5, total: 10 });
      aggregator.updateChildProgress('unmetered_task', { current: null, total: null });

      const snap = aggregator.getSnapshot();
      expect(snap.progress.isAuthoritative).toBe(false);
      expect(snap.progress.percentage).toBeNull();
      expect(snap.progress.total).toBe(2); // accurately reflects 2 subtasks

      aggregator.dispose();
    });
  });

  // ── 6. Stale Event & Out-of-Order Defense ──────────────────────────────────
  describe('6. Stale Event & Out-of-Order Defense', () => {
    test('drops progress update with older or equal sequenceNum', () => {
      const aggregator = new ParallelProgressAggregator();
      aggregator.registerChild('worker_seq');

      aggregator.updateChildProgress('worker_seq', { current: 5, total: 10 }, { sequenceNum: 10 });
      expect(aggregator.children.get('worker_seq').progress.current).toBe(5);

      // Stale update with older sequence number (e.g. 8 < 10)
      aggregator.updateChildProgress('worker_seq', { current: 2, total: 10 }, { sequenceNum: 8 });
      expect(aggregator.children.get('worker_seq').progress.current).toBe(5); // Retains 5

      aggregator.dispose();
    });

    test('prevents late event from resurrecting terminal child state', () => {
      const aggregator = new ParallelProgressAggregator();
      aggregator.registerChild('worker_term');

      aggregator.updateChildState('worker_term', PROGRESS_STATES.COMPLETED);
      expect(aggregator.children.get('worker_term').state).toBe(PROGRESS_STATES.COMPLETED);

      // Late progress update or running state transition
      aggregator.updateChildProgress('worker_term', { current: 3, total: 10 });
      aggregator.updateChildState('worker_term', PROGRESS_STATES.RUNNING);

      expect(aggregator.children.get('worker_term').state).toBe(PROGRESS_STATES.COMPLETED);
      expect(aggregator.children.get('worker_term').isTerminal).toBe(true);

      aggregator.dispose();
    });
  });

  // ── 7. ActivityTracker Telemetry Integration ───────────────────────────────
  describe('7. ActivityTracker Telemetry Integration', () => {
    test('coalesces progress updates via tracker.coalesceProgress', async () => {
      const emittedEvents = [];
      const tracker = new ActivityTracker({
        title: 'High-Frequency Build',
        enableCoalescing: true,
        coalescerOptions: { windowMs: 30 },
        onEvent: (evt) => emittedEvents.push(evt),
      });

      for (let i = 1; i <= 10; i++) {
        tracker.coalesceProgress({ current: i, total: 100, unit: 'modules' });
      }

      expect(emittedEvents.length).toBe(0);

      await new Promise((r) => setTimeout(r, 50));

      expect(emittedEvents.length).toBe(1);
      expect(emittedEvents[0].progress.current).toBe(10);
      expect(emittedEvents[0].metadata._telemetry.sampleCount).toBe(10);

      tracker.dispose();
    });

    test('tracker.createParallelAggregator tracks composite subtasks', () => {
      const tracker = new ActivityTracker({ title: 'Wave Execution' });
      const aggregator = tracker.createParallelAggregator({
        policy: AGGREGATION_POLICIES.ALL_MUST_PASS,
      });

      aggregator.registerChild('w1');
      aggregator.registerChild('w2');
      aggregator.updateChildState('w1', PROGRESS_STATES.COMPLETED);
      aggregator.updateChildState('w2', PROGRESS_STATES.COMPLETED);

      const snap = aggregator.getSnapshot();
      expect(snap.overallState).toBe(PROGRESS_STATES.COMPLETED);
      expect(snap.counts.completed).toBe(2);

      aggregator.dispose();
      tracker.dispose();
    });

    test('tracker.stallSuspected emits warning event with remedy', () => {
      const emittedEvents = [];
      const tracker = new ActivityTracker({
        title: 'Remote API Fetch',
        onEvent: (evt) => emittedEvents.push(evt),
      });

      const { event } = tracker.stallSuspected(
        'Upstream endpoint did not respond within 45s',
        'Check network connectivity or retry with increased timeout'
      );

      expect(event.eventType).toBe(EVENT_TYPES.STALL_SUSPECTED);
      expect(event.status).toBe(STATUSES.WARNING);
      expect(event.nextAction).toContain('Check network connectivity');

      tracker.dispose();
    });

    test('tracker.complete flushes coalesced buffers and disposes monitoring', () => {
      const emittedEvents = [];
      const tracker = new ActivityTracker({
        title: 'Batch Job',
        enableCoalescing: true,
        coalescerOptions: { windowMs: 100 },
        onEvent: (evt) => emittedEvents.push(evt),
      });

      tracker.coalesceProgress({ current: 5, total: 10 });
      expect(emittedEvents.length).toBe(0);

      // Calling complete flushes pending progress and emits completion event
      tracker.complete('Job finished successfully');
      expect(emittedEvents.length).toBe(2);
      expect(emittedEvents[0].eventType).toBe(EVENT_TYPES.PROGRESS_UPDATED);
      expect(emittedEvents[1].eventType).toBe(EVENT_TYPES.OPERATION_COMPLETED);

      tracker.dispose();
    });
  });
});

