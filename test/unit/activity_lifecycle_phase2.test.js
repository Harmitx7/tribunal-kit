'use strict';

/**
 * Phase 2 Test Suite: Activity Intelligence & State Tracking Engine
 *
 * Exhaustively tests:
 * 1. Lifecycle state model & transition rules (all legal and illegal transitions)
 * 2. Operation registry store, queries, and child hierarchy
 * 3. Authoritative progress intelligence and non-monotonic enforcement
 * 4. Agent and skill state tracking
 * 5. Tool execution tracking
 * 6. Evidence integrity & retry history preservation
 * 7. Bounded retention & automatic cleanup (never purging active operations)
 * 8. Concurrency, async serialization, and thread safety
 * 9. ActivityTracker Phase 2 integration
 */

const {
  LIFECYCLE_STATES,
  AGENT_SKILL_STATES,
  TOOL_STATES,
  STATUSES,
  EVENT_TYPES,
  IllegalStateTransitionError,
  canTransition,
  assertValidTransition,
  isTerminalState,
  getLegalNextStates,
  ActivityProgressError,
  OperationRecord,
  OperationRegistry,
  ActivityTracker,
  createActivityEvent,
} = require('../../src/activity');

describe('Phase 2: Activity Intelligence & State Tracking Engine', () => {
  let registry;

  beforeEach(() => {
    registry = new OperationRegistry({
      maxCompletedRetention: 5,
      completedTtlMs: 50, // 50ms for TTL tests
    });
  });

  afterEach(() => {
    registry.reset();
  });

  // ── 1. Lifecycle State Machine & Transition Rules ───────────────────────────
  describe('1. Lifecycle State Machine & Transition Rules', () => {
    test('defines all 8 canonical lifecycle states', () => {
      expect(LIFECYCLE_STATES.PENDING).toBe('pending');
      expect(LIFECYCLE_STATES.RUNNING).toBe('running');
      expect(LIFECYCLE_STATES.WAITING).toBe('waiting');
      expect(LIFECYCLE_STATES.BLOCKED).toBe('blocked');
      expect(LIFECYCLE_STATES.RETRYING).toBe('retrying');
      expect(LIFECYCLE_STATES.COMPLETED).toBe('completed');
      expect(LIFECYCLE_STATES.FAILED).toBe('failed');
      expect(LIFECYCLE_STATES.CANCELLED).toBe('cancelled');
    });

    test('validates legal transitions from PENDING', () => {
      expect(canTransition(LIFECYCLE_STATES.PENDING, LIFECYCLE_STATES.RUNNING)).toBe(true);
      expect(canTransition(LIFECYCLE_STATES.PENDING, LIFECYCLE_STATES.CANCELLED)).toBe(true);
      expect(canTransition(LIFECYCLE_STATES.PENDING, LIFECYCLE_STATES.PENDING)).toBe(true);

      // Illegal targets
      expect(canTransition(LIFECYCLE_STATES.PENDING, LIFECYCLE_STATES.COMPLETED)).toBe(false);
      expect(canTransition(LIFECYCLE_STATES.PENDING, LIFECYCLE_STATES.FAILED)).toBe(false);
      expect(canTransition(LIFECYCLE_STATES.PENDING, LIFECYCLE_STATES.BLOCKED)).toBe(false);
      expect(canTransition(LIFECYCLE_STATES.PENDING, LIFECYCLE_STATES.WAITING)).toBe(false);
      expect(canTransition(LIFECYCLE_STATES.PENDING, LIFECYCLE_STATES.RETRYING)).toBe(false);
    });

    test('validates legal transitions from RUNNING', () => {
      expect(canTransition(LIFECYCLE_STATES.RUNNING, LIFECYCLE_STATES.RUNNING)).toBe(true);
      expect(canTransition(LIFECYCLE_STATES.RUNNING, LIFECYCLE_STATES.WAITING)).toBe(true);
      expect(canTransition(LIFECYCLE_STATES.RUNNING, LIFECYCLE_STATES.BLOCKED)).toBe(true);
      expect(canTransition(LIFECYCLE_STATES.RUNNING, LIFECYCLE_STATES.RETRYING)).toBe(true);
      expect(canTransition(LIFECYCLE_STATES.RUNNING, LIFECYCLE_STATES.COMPLETED)).toBe(true);
      expect(canTransition(LIFECYCLE_STATES.RUNNING, LIFECYCLE_STATES.FAILED)).toBe(true);
      expect(canTransition(LIFECYCLE_STATES.RUNNING, LIFECYCLE_STATES.CANCELLED)).toBe(true);

      // Illegal targets from RUNNING
      expect(canTransition(LIFECYCLE_STATES.RUNNING, LIFECYCLE_STATES.PENDING)).toBe(false);
    });

    test('validates legal transitions from WAITING', () => {
      expect(canTransition(LIFECYCLE_STATES.WAITING, LIFECYCLE_STATES.RUNNING)).toBe(true);
      expect(canTransition(LIFECYCLE_STATES.WAITING, LIFECYCLE_STATES.BLOCKED)).toBe(true);
      expect(canTransition(LIFECYCLE_STATES.WAITING, LIFECYCLE_STATES.FAILED)).toBe(true);
      expect(canTransition(LIFECYCLE_STATES.WAITING, LIFECYCLE_STATES.CANCELLED)).toBe(true);

      // Cannot complete or retry directly from waiting without running
      expect(canTransition(LIFECYCLE_STATES.WAITING, LIFECYCLE_STATES.COMPLETED)).toBe(false);
      expect(canTransition(LIFECYCLE_STATES.WAITING, LIFECYCLE_STATES.RETRYING)).toBe(false);
    });

    test('validates legal transitions from BLOCKED', () => {
      expect(canTransition(LIFECYCLE_STATES.BLOCKED, LIFECYCLE_STATES.RUNNING)).toBe(true);
      expect(canTransition(LIFECYCLE_STATES.BLOCKED, LIFECYCLE_STATES.FAILED)).toBe(true);
      expect(canTransition(LIFECYCLE_STATES.BLOCKED, LIFECYCLE_STATES.CANCELLED)).toBe(true);

      // Cannot complete directly while blocked
      expect(canTransition(LIFECYCLE_STATES.BLOCKED, LIFECYCLE_STATES.COMPLETED)).toBe(false);
    });

    test('validates legal transitions from RETRYING', () => {
      expect(canTransition(LIFECYCLE_STATES.RETRYING, LIFECYCLE_STATES.RUNNING)).toBe(true);
      expect(canTransition(LIFECYCLE_STATES.RETRYING, LIFECYCLE_STATES.FAILED)).toBe(true);
      expect(canTransition(LIFECYCLE_STATES.RETRYING, LIFECYCLE_STATES.CANCELLED)).toBe(true);

      expect(canTransition(LIFECYCLE_STATES.RETRYING, LIFECYCLE_STATES.COMPLETED)).toBe(false);
      expect(canTransition(LIFECYCLE_STATES.RETRYING, LIFECYCLE_STATES.PENDING)).toBe(false);
    });

    test('enforces terminal state boundaries for COMPLETED and CANCELLED', () => {
      // Completed is strictly terminal
      expect(isTerminalState(LIFECYCLE_STATES.COMPLETED)).toBe(true);
      expect(canTransition(LIFECYCLE_STATES.COMPLETED, LIFECYCLE_STATES.RUNNING)).toBe(false);
      expect(canTransition(LIFECYCLE_STATES.COMPLETED, LIFECYCLE_STATES.PENDING)).toBe(false);
      expect(canTransition(LIFECYCLE_STATES.COMPLETED, LIFECYCLE_STATES.CANCELLED)).toBe(false);
      expect(canTransition(LIFECYCLE_STATES.COMPLETED, LIFECYCLE_STATES.FAILED)).toBe(false);

      // Cancelled is strictly terminal
      expect(isTerminalState(LIFECYCLE_STATES.CANCELLED)).toBe(true);
      expect(canTransition(LIFECYCLE_STATES.CANCELLED, LIFECYCLE_STATES.RUNNING)).toBe(false);
      expect(canTransition(LIFECYCLE_STATES.CANCELLED, LIFECYCLE_STATES.COMPLETED)).toBe(false);
    });

    test('allows failed attempt to transition to retrying only when retry is initiated', () => {
      expect(canTransition(LIFECYCLE_STATES.FAILED, LIFECYCLE_STATES.RETRYING)).toBe(true);
      expect(canTransition(LIFECYCLE_STATES.FAILED, LIFECYCLE_STATES.RUNNING)).toBe(false);
      expect(canTransition(LIFECYCLE_STATES.FAILED, LIFECYCLE_STATES.COMPLETED)).toBe(false);
      expect(canTransition(LIFECYCLE_STATES.FAILED, LIFECYCLE_STATES.CANCELLED)).toBe(false);
    });

    test('assertValidTransition throws IllegalStateTransitionError with context', () => {
      expect(() => {
        assertValidTransition(LIFECYCLE_STATES.COMPLETED, LIFECYCLE_STATES.RUNNING, 'op_123');
      }).toThrow(IllegalStateTransitionError);

      try {
        assertValidTransition(LIFECYCLE_STATES.PENDING, LIFECYCLE_STATES.COMPLETED, 'op_999');
      } catch (err) {
        expect(err.name).toBe('IllegalStateTransitionError');
        expect(err.code).toBe('ILLEGAL_STATE_TRANSITION');
        expect(err.fromState).toBe('pending');
        expect(err.toState).toBe('completed');
        expect(err.operationId).toBe('op_999');
        expect(err.message).toContain("Allowed target states from 'pending'");
      }
    });

    test('getLegalNextStates returns defensive array copy of valid next states', () => {
      const nextStates = getLegalNextStates(LIFECYCLE_STATES.PENDING);
      expect(nextStates).toEqual(expect.arrayContaining(['pending', 'running', 'cancelled']));
      expect(getLegalNextStates('unknown_state')).toEqual([]);
    });
  });

  // ── 2. Operation Registry & Hierarchy ───────────────────────────────────────
  describe('2. Operation Registry & Hierarchy', () => {
    test('registers operations and preserves initial metadata', () => {
      const op = registry.register({
        operationId: 'op_custom_1',
        title: 'Verifying Security Invariants',
        metadata: { env: 'staging', subsystem: 'auth' },
      });

      expect(op.operationId).toBe('op_custom_1');
      expect(op.title).toBe('Verifying Security Invariants');
      expect(op.status).toBe(LIFECYCLE_STATES.PENDING);
      expect(op.attempt).toBe(1);
      expect(op.metadata.env).toBe('staging');
      expect(registry.has('op_custom_1')).toBe(true);
      expect(registry.get('op_custom_1')).toBe(op);
    });

    test('auto-generates valid operationId when omitted', () => {
      const op = registry.register({ title: 'Auto ID Operation' });
      expect(op.operationId).toMatch(/^op_[a-zA-Z0-9_-]{8,}/);
      expect(registry.has(op.operationId)).toBe(true);
    });

    test('returns existing record on duplicate registration (idempotency)', () => {
      const op1 = registry.register({ operationId: 'op_idempotent_1', title: 'First' });
      const op2 = registry.register({ operationId: 'op_idempotent_1', title: 'Second' });
      expect(op1).toBe(op2);
      expect(op1.title).toBe('First');
    });

    test('manages parent-child operation relationships', () => {
      const parent = registry.register({ operationId: 'op_parent_1', title: 'Parent Pipeline' });
      const child1 = registry.register({ operationId: 'op_child_1', parentOperationId: 'op_parent_1', title: 'Child 1' });
      const child2 = registry.register({ operationId: 'op_child_2', parentOperationId: 'op_parent_1', title: 'Child 2' });

      expect(child1.parentOperationId).toBe('op_parent_1');
      expect(child2.parentOperationId).toBe('op_parent_1');
      expect(parent.childOperationIds).toEqual(['op_child_1', 'op_child_2']);

      const children = registry.getChildren('op_parent_1');
      expect(children).toHaveLength(2);
      expect(children.map(c => c.operationId)).toEqual(['op_child_1', 'op_child_2']);
    });

    test('lists active vs completed operations accurately', () => {
      const opActive1 = registry.register({ operationId: 'op_act_1', status: LIFECYCLE_STATES.RUNNING });
      const opActive2 = registry.register({ operationId: 'op_act_2', status: LIFECYCLE_STATES.WAITING });
      const opDone1 = registry.register({ operationId: 'op_done_1', status: LIFECYCLE_STATES.RUNNING });
      const opDone2 = registry.register({ operationId: 'op_done_2', status: LIFECYCLE_STATES.RUNNING });

      opDone1.transitionTo(LIFECYCLE_STATES.COMPLETED);
      opDone2.transitionTo(LIFECYCLE_STATES.CANCELLED);

      const active = registry.listActive();
      const completed = registry.listCompleted();

      expect(active.map(o => o.operationId).sort()).toEqual(['op_act_1', 'op_act_2']);
      expect(completed.map(o => o.operationId).sort()).toEqual(['op_done_1', 'op_done_2']);
    });

    test('queries operations with filters', () => {
      const op1 = registry.register({ operationId: 'op_q_1', status: LIFECYCLE_STATES.RUNNING });
      op1.recordAgent('backend-specialist', AGENT_SKILL_STATES.ACTIVATED);

      const op2 = registry.register({ operationId: 'op_q_2', status: LIFECYCLE_STATES.BLOCKED });
      op2.recordAgent('security-auditor', AGENT_SKILL_STATES.ACTIVATED);

      const op3 = registry.register({ operationId: 'op_q_3', status: LIFECYCLE_STATES.RUNNING });
      op3.recordSkill('api-patterns', AGENT_SKILL_STATES.ACTIVATED);

      expect(registry.query({ status: LIFECYCLE_STATES.BLOCKED })).toHaveLength(1);
      expect(registry.query({ agent: 'backend-specialist' })).toHaveLength(1);
      expect(registry.query({ skill: 'api-patterns' })).toHaveLength(1);
      expect(registry.query({ limit: 2 })).toHaveLength(2);
    });
  });

  // ── 3. Progress Intelligence & Monotonic Invariant ──────────────────────────
  describe('3. Progress Intelligence & Monotonic Invariant', () => {
    test('calculates percentage accurately from current and total', () => {
      const op = registry.register({ operationId: 'op_prog_1', status: LIFECYCLE_STATES.RUNNING });
      op.setProgress({ current: 5, total: 20, unit: 'suites' });

      expect(op.progress).toEqual({
        current: 5,
        total: 20,
        percentage: 25,
        unit: 'suites',
        isAuthoritative: true,
        stages: [],
      });
    });

    test('allows explicit percentage override within 0..100', () => {
      const op = registry.register({ operationId: 'op_prog_override' });
      op.setProgress({ current: 1, total: 3, percentage: 35 });
      expect(op.progress.percentage).toBe(35);
    });

    test('supports unmetered progress without false percentages', () => {
      const op = registry.register({ operationId: 'op_prog_unmetered' });
      op.setProgress({ unit: 'files', isAuthoritative: false });

      expect(op.progress.current).toBeNull();
      expect(op.progress.total).toBeNull();
      expect(op.progress.percentage).toBeNull();
      expect(op.progress.isAuthoritative).toBe(false);
      expect(op.progress.unit).toBe('files');
    });

    test('distinguishes genuine zero progress from unmetered progress', () => {
      const op = registry.register({ operationId: 'op_prog_zero' });
      op.setProgress({ current: 0, total: 10, unit: 'tests' });

      expect(op.progress.current).toBe(0);
      expect(op.progress.total).toBe(10);
      expect(op.progress.percentage).toBe(0);
      expect(op.progress.isAuthoritative).toBe(true);
    });

    test('rejects negative progress values', () => {
      const op = registry.register({ operationId: 'op_prog_neg' });
      expect(() => {
        op.setProgress({ current: -1, total: 10 });
      }).toThrow(ActivityProgressError);
    });

    test('rejects total progress <= 0', () => {
      const op = registry.register({ operationId: 'op_prog_bad_total' });
      expect(() => {
        op.setProgress({ current: 0, total: 0 });
      }).toThrow(ActivityProgressError);
      expect(() => {
        op.setProgress({ current: 0, total: -5 });
      }).toThrow(ActivityProgressError);
    });

    test('rejects current exceeding total', () => {
      const op = registry.register({ operationId: 'op_prog_overflow' });
      expect(() => {
        op.setProgress({ current: 11, total: 10 });
      }).toThrow(ActivityProgressError);
    });

    test('enforces monotonic progress rule within the same attempt', () => {
      const op = registry.register({ operationId: 'op_prog_mono' });
      op.setProgress({ current: 4, total: 10 });

      // Increasing progress is valid
      expect(() => {
        op.setProgress({ current: 7, total: 10 });
      }).not.toThrow();

      // Decreasing progress within the same attempt throws ActivityProgressError
      expect(() => {
        op.setProgress({ current: 5, total: 10 });
      }).toThrow(ActivityProgressError);
    });

    test('allows progress reset when an explicit retry begins (attempt increment)', () => {
      const op = registry.register({ operationId: 'op_prog_retry_reset', status: LIFECYCLE_STATES.RUNNING });
      op.setProgress({ current: 8, total: 10 });

      // Trigger retry
      op.recordRetry({ reason: 'Transient timeout' });
      expect(op.attempt).toBe(2);
      expect(op.status).toBe(LIFECYCLE_STATES.RETRYING);

      // Now progress can reset for the new attempt
      expect(() => {
        op.setProgress({ current: 0, total: 10 });
      }).not.toThrow();
      expect(op.progress.current).toBe(0);
    });
  });

  // ── 4. Agent and Skill State Tracking ───────────────────────────────────────
  describe('4. Agent and Skill State Tracking', () => {
    test('tracks agent states through full execution lifecycle', () => {
      const op = registry.register({ operationId: 'op_agent_1' });

      op.recordAgent('backend-specialist', AGENT_SKILL_STATES.SELECTED, 'API design task');
      expect(op.activeAgent.name).toBe('backend-specialist');
      expect(op.activeAgent.state).toBe('selected');

      op.recordAgent('backend-specialist', AGENT_SKILL_STATES.ACTIVATED, 'Building endpoints');
      expect(op.activeAgent.state).toBe('activated');

      op.recordAgent('backend-specialist', AGENT_SKILL_STATES.EXECUTING);
      expect(op.activeAgent.state).toBe('executing');

      op.recordAgent('backend-specialist', AGENT_SKILL_STATES.FINISHED);
      expect(op.activeAgent.state).toBe('finished');

      expect(op.agentHistory).toHaveLength(4);
      expect(op.agentHistory.map(a => a.state)).toEqual([
        'selected',
        'activated',
        'executing',
        'finished',
      ]);
    });

    test('tracks skill state and captures error on failure', () => {
      const op = registry.register({ operationId: 'op_skill_1' });

      op.recordSkill('resilience-reviewer', AGENT_SKILL_STATES.ACTIVATED, 'Circuit breaker check');
      op.recordSkill('resilience-reviewer', AGENT_SKILL_STATES.FAILED, 'Timeout', new Error('Circuit broken'));

      expect(op.activeSkill.state).toBe('failed');
      expect(op.activeSkill.error).toContain('Circuit broken');
      expect(op.skillHistory).toHaveLength(2);
    });
  });

  // ── 5. Tool Execution State Tracking ────────────────────────────────────────
  describe('5. Tool Execution State Tracking', () => {
    test('records tool execution lifecycle, duration, and results', () => {
      const op = registry.register({ operationId: 'op_tool_1' });

      op.recordTool('git_status', TOOL_STATES.STARTED);
      expect(op.tools).toHaveLength(1);
      expect(op.tools[0].status).toBe(TOOL_STATES.STARTED);

      op.recordTool('git_status', TOOL_STATES.COMPLETED, {
        resultRef: 'sha_abcdef123456',
        durationMs: 42,
      });

      expect(op.tools).toHaveLength(1);
      expect(op.tools[0].status).toBe(TOOL_STATES.COMPLETED);
      expect(op.tools[0].resultRef).toBe('sha_abcdef123456');
      expect(op.tools[0].durationMs).toBe(42);
    });

    test('records tool failure with error context', () => {
      const op = registry.register({ operationId: 'op_tool_fail' });

      op.recordTool('npm_test', TOOL_STATES.STARTED);
      op.recordTool('npm_test', TOOL_STATES.FAILED, {
        error: 'Exit code 1: 2 tests failed',
      });

      expect(op.tools[0].status).toBe(TOOL_STATES.FAILED);
      expect(op.tools[0].error).toBe('Exit code 1: 2 tests failed');
    });
  });

  // ── 6. Evidence Integrity & Retry Management ────────────────────────────────
  describe('6. Evidence Integrity & Retry Management', () => {
    test('records verified evidence with authoritative references', () => {
      const op = registry.register({ operationId: 'op_ev_1' });

      const ev = op.recordEvidence({
        ref: 'test/reports/auth_audit.json',
        hash: 'a1b2c3d4e5f6',
        description: 'OWASP ZAP scan clean report',
        verified: true,
      });

      expect(ev.ref).toBe('test/reports/auth_audit.json');
      expect(ev.verified).toBe(true);
      expect(op.evidence).toHaveLength(1);
      expect(op.verified).toBe(true);
    });

    test('rejects evidence without authoritative ref', () => {
      const op = registry.register({ operationId: 'op_ev_bad' });

      expect(() => {
        op.recordEvidence({ description: 'No ref provided' });
      }).toThrow(/authoritative string 'ref'/);

      expect(() => {
        op.recordEvidence(null);
      }).toThrow(/non-null object/);
    });

    test('preserves multi-attempt failure history across retries', () => {
      const op = registry.register({ operationId: 'op_retry_history', status: LIFECYCLE_STATES.RUNNING });

      // Attempt 1 fails
      op.error = { message: 'Database lock timeout', code: 'LOCK_TIMEOUT' };
      op.recordRetry({ reason: 'Lock contention detected, backing off' });

      expect(op.attempt).toBe(2);
      expect(op.status).toBe(LIFECYCLE_STATES.RETRYING);
      expect(op.retries).toHaveLength(1);
      expect(op.retries[0].attempt).toBe(1);
      expect(op.retries[0].reason).toContain('Lock contention');
      expect(op.retries[0].error.code).toBe('LOCK_TIMEOUT');

      // Attempt 2 starts and fails
      op.transitionTo(LIFECYCLE_STATES.RUNNING);
      op.error = { message: 'Deadlock encountered', code: 'DEADLOCK' };
      op.recordRetry({ reason: 'Second deadlock, final attempt' });

      expect(op.attempt).toBe(3);
      expect(op.retries).toHaveLength(2);
      expect(op.retries[1].attempt).toBe(2);
      expect(op.retries[1].error.code).toBe('DEADLOCK');
    });
  });

  // ── 7. Bounded Retention & Memory Cleanup ────────────────────────────────────
  describe('7. Bounded Retention & Memory Cleanup', () => {
    test('never purges active operations during cleanup', () => {
      // Register 10 active operations (capacity is 5)
      for (let i = 0; i < 10; i++) {
        registry.register({
          operationId: `op_active_${i}`,
          status: LIFECYCLE_STATES.RUNNING,
        });
      }

      const res = registry.cleanup({ maxCompleted: 2, ttlMs: 1 });
      expect(res.evictedCount).toBe(0);
      expect(registry.listActive()).toHaveLength(10);
    });

    test('evicts completed operations exceeding retention limit oldest first', () => {
      // Register 6 completed operations (capacity is 5)
      for (let i = 0; i < 6; i++) {
        const op = registry.register({
          operationId: `op_comp_${i}`,
          status: LIFECYCLE_STATES.RUNNING,
        });
        op.transitionTo(LIFECYCLE_STATES.COMPLETED);
      }

      // Cleanup with maxCompleted: 3
      const res = registry.cleanup({ maxCompleted: 3, ttlMs: 1000000 });
      expect(res.evictedCount).toBe(3);
      expect(registry.listCompleted()).toHaveLength(3);

      // Oldest (op_comp_0, op_comp_1, op_comp_2) should have been evicted
      expect(registry.has('op_comp_0')).toBe(false);
      expect(registry.has('op_comp_1')).toBe(false);
      expect(registry.has('op_comp_2')).toBe(false);
      expect(registry.has('op_comp_5')).toBe(true);
    });

    test('expires completed operations past TTL', async () => {
      const op = registry.register({ operationId: 'op_ttl_1', status: LIFECYCLE_STATES.RUNNING });
      op.transitionTo(LIFECYCLE_STATES.COMPLETED);

      // Wait 60ms to exceed completedTtlMs (50ms)
      await new Promise(r => setTimeout(r, 65));

      const res = registry.cleanup({ maxCompleted: 10, ttlMs: 50 });
      expect(res.evictedCount).toBe(1);
      expect(registry.has('op_ttl_1')).toBe(false);
    });
  });

  // ── 8. Concurrency & Async Serialization ────────────────────────────────────
  describe('8. Concurrency & Async Serialization', () => {
    test('serializes asynchronous updates on the same operation without race conditions', async () => {
      const op = registry.register({ operationId: 'op_async_seq' });
      const order = [];

      const p1 = op.executeSerialized(async () => {
        await new Promise(r => setTimeout(r, 25));
        order.push('step_1');
      });

      const p2 = op.executeSerialized(async () => {
        await new Promise(r => setTimeout(r, 10));
        order.push('step_2');
      });

      const p3 = op.executeSerialized(async () => {
        order.push('step_3');
      });

      await Promise.all([p1, p2, p3]);
      expect(order).toEqual(['step_1', 'step_2', 'step_3']);
    });

    test('supports concurrent independent operations without cross-talk', async () => {
      const opA = registry.register({ operationId: 'op_concur_A', status: LIFECYCLE_STATES.RUNNING });
      const opB = registry.register({ operationId: 'op_concur_B', status: LIFECYCLE_STATES.RUNNING });

      const taskA = opA.executeSerialized(async () => {
        opA.setProgress({ current: 5, total: 10 });
        opA.recordTool('tool_A', TOOL_STATES.COMPLETED);
      });

      const taskB = opB.executeSerialized(async () => {
        opB.setProgress({ current: 2, total: 20 });
        opB.recordTool('tool_B', TOOL_STATES.COMPLETED);
      });

      await Promise.all([taskA, taskB]);

      expect(opA.progress.percentage).toBe(50);
      expect(opB.progress.percentage).toBe(10);
      expect(opA.tools[0].toolName).toBe('tool_A');
      expect(opB.tools[0].toolName).toBe('tool_B');
    });
  });

  // ── 9. ActivityTracker Phase 2 Integration ──────────────────────────────────
  describe('9. ActivityTracker Phase 2 Integration', () => {
    test('ActivityTracker delegates to OperationRecord in registry', () => {
      const tracker = new ActivityTracker({
        operationId: 'op_trk_int_1',
        title: 'End-to-End Operation',
        registry,
      });

      expect(tracker.getStatus()).toBe(LIFECYCLE_STATES.RUNNING);
      expect(registry.has('op_trk_int_1')).toBe(true);

      tracker.activateAgent('frontend-specialist', 'Inspecting responsive layout');
      const op = tracker.getOperation();
      expect(op.activeAgent.name).toBe('frontend-specialist');
      expect(op.activeAgent.state).toBe('activated');

      tracker.updateProgress({ current: 3, total: 6, unit: 'components' });
      expect(op.progress.percentage).toBe(50);

      tracker.complete('All components verified', 'ui_audit.json');
      expect(tracker.getStatus()).toBe(LIFECYCLE_STATES.COMPLETED);
      expect(op.status).toBe(LIFECYCLE_STATES.COMPLETED);
      expect(op.verified).toBe(true);
    });

    test('creates and links child tracker hierarchies', () => {
      const parentTracker = new ActivityTracker({
        operationId: 'op_trk_parent',
        title: 'Root Pipeline',
        registry,
      });

      const childTracker = parentTracker.createChildTracker({
        operationId: 'op_trk_child',
        title: 'Worker Subtask',
      });

      expect(childTracker.parentOperationId).toBe('op_trk_parent');
      expect(parentTracker.getOperation().childOperationIds).toContain('op_trk_child');

      childTracker.start('Worker Subtask', 'Executing worker step');
      childTracker.complete('Worker finished');

      expect(childTracker.getStatus()).toBe(LIFECYCLE_STATES.COMPLETED);
      expect(parentTracker.getStatus()).toBe(LIFECYCLE_STATES.RUNNING);
    });
  });
});
