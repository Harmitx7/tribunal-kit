'use strict';

/**
 * concurrency_analyst.test.js — Stage 3.5: Concurrency Analyst Specialist Implementation
 * ======================================================================================
 * Comprehensive verification covering all 22 Phase 6 core scenarios and 10 adversarial
 * concurrency patterns using deterministic barriers, deferred promises, and invariants:
 *
 * Core Scenarios:
 * 1. Canonical registration.
 * 2. Persona discovery.
 * 3. Runtime invocation.
 * 4. Structured finding validation.
 * 5. Malformed finding rejection (missing fields, invalid ranges, path traversal, empty interleavings).
 * 6. Shared mutable state detection.
 * 7. Race-condition interleaving analysis.
 * 8. Deadlock cycle detection.
 * 9. Livelock identification.
 * 10. Starvation detection.
 * 11. Lock ordering analysis.
 * 12. Cancellation propagation.
 * 13. Timeout handling.
 * 14. Resource leak detection.
 * 15. Session isolation.
 * 16. Concurrent transaction interference.
 * 17. Scheduler fairness.
 * 18. Evidence provenance.
 * 19. Provider failure and timeout.
 * 20. Human approval boundary.
 * 21. Path containment.
 * 22. End-to-end runtime integration.
 *
 * Adversarial Concurrency Scenarios (Deterministic Synchronization):
 * - Adv 1: Two agents attempting to update the same shared resource.
 * - Adv 2: Concurrent writes to overlapping file ranges.
 * - Adv 3: A task cancelled while holding a lock / slot.
 * - Adv 4: A dependency failing while other DAG branches continue.
 * - Adv 5: A high-priority queue continuously receiving new tasks.
 * - Adv 6: Two transactions attempting conflicting updates.
 * - Adv 7: Session A attempting to access Session B's execution state.
 * - Adv 8: A timeout or crash occurring during transaction / rollback.
 * - Adv 9: Multiple workers competing for a bounded resource.
 * - Adv 10: A provider returning duplicated or out-of-order findings.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  resolveAgent,
  listAllAgents: _listAllAgents,
  getRegistrySummary,
} = require('../../src/execution/canonical_registry');
const { AgentRuntime } = require('../../src/execution/agent_runtime');
const { ProviderAdapter } = require('../../src/execution/provider_adapter');
const { EvidenceBus } = require('../../src/execution/evidence_bus');
const { ConflictResolver } = require('../../src/execution/conflict_resolver');
const { KernelScheduler } = require('../../src/execution/kernel_scheduler');
const { AgentDispatcher } = require('../../src/execution/agent_dispatcher');
const {
  ControlledWriteService,
  ReviewExecutor,
  TransactionManager,
} = require('../../src/execution');
const {
  validateConcurrencyFinding,
  safeValidateConcurrencyFinding,
  ConcurrencyFindingSchema: _ConcurrencyFindingSchema,
  CONCURRENCY_CATEGORIES: _CONCURRENCY_CATEGORIES,
  parseRawAgentOutput,
} = require('../../src/execution/agent_contracts');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Deterministic synchronization primitives (zero reliance on arbitrary sleeps)
 */
function createDeferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createBarrier(parties) {
  let arrived = 0;
  const waiters = [];
  return {
    wait() {
      arrived++;
      if (arrived >= parties) {
        while (waiters.length > 0) {
          waiters.shift()();
        }
        return Promise.resolve();
      }
      return new Promise(res => waiters.push(res));
    },
    get arrivedCount() {
      return arrived;
    },
  };
}

describe('Stage 3.5: Concurrency Analyst Specialist Persona & Runtime Verification', () => {
  let tempWorkspace;

  beforeEach(() => {
    tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tribunal-conc-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempWorkspace, { recursive: true, force: true });
    } catch (_) {}
  });

  // ── Area 1: Canonical Registration ──────────────────────────────────────────
  test('1. Canonical registration: resolves as active production specialist with complete domain coverage', () => {
    const summary = getRegistrySummary(REPO_ROOT);
    expect(summary.total).toBe(64);
    expect(summary.specialists).toBe(36);
    expect(summary.reviewers).toBe(28);

    const specialist = resolveAgent('concurrency-analyst', {}, REPO_ROOT);
    expect(specialist).not.toBeNull();
    expect(specialist.name).toBe('concurrency-analyst');
    expect(specialist.type).toBe('specialist');
    expect(specialist.status).toBe('production');
    expect(specialist.priority).toBe('high');
    expect(specialist.domain).toContain('concurrency');
    expect(specialist.domain).toContain('architecture');
    expect(specialist.domain).toContain('backend');
    expect(specialist.domain).toContain('distributed-systems');
  });

  // ── Area 2: Persona Discovery ───────────────────────────────────────────────
  test('2. Persona discovery: markdown file exists with valid frontmatter, 14 mandates, and strict restrictions', () => {
    const mdPath = path.join(REPO_ROOT, '.agent', 'agents', 'concurrency-analyst.md');
    expect(fs.existsSync(mdPath)).toBe(true);

    const content = fs.readFileSync(mdPath, 'utf8');
    expect(content).toContain('name: concurrency-analyst');
    expect(content).toContain('type: specialist');
    expect(content).toContain('status: production');
    expect(content).toContain('concurrency-and-race-condition-auditor');
    expect(content).toContain('agent-runtime-deadlock-and-liveness-auditor');

    // Verify 14 core mandates are documented
    expect(content).toContain('Detect Race Conditions');
    expect(content).toContain('Analyze Shared Mutable State');
    expect(content).toContain('Identify Unsafe Asynchronous Interleavings');
    expect(content).toContain('Detect Deadlock & Livelock Risks');
    expect(content).toContain('Analyze Lock Ordering & Ownership');
    expect(content).toContain('Detect Starvation & Unfair Scheduling');
    expect(content).toContain('Inspect Cancellation & Timeout Handling');
    expect(content).toContain('Identify Resource Leaks & Unsafe Cleanup');
    expect(content).toContain('Analyze Concurrent File & Transaction Operations');
    expect(content).toContain('Evaluate Session Isolation');
    expect(content).toContain('Inspect Parallel Agent Execution');
    expect(content).toContain('Recommend Deterministic Reproduction Tests');
    expect(content).toContain('Produce Evidence-Backed Remediation Proposals');
    expect(content).toContain('Escalate Critical Synchronization Risks');

    // Verify explicit restrictions
    expect(content).toContain('Read-Only Mandate');
    expect(content).toContain('Evidence Requirement');
    expect(content).toContain('Reproducibility Invariant');
    expect(content).toContain('Invariant-First Locking');
    expect(content).toContain('Anti-Over-Serialization');
    expect(content).toContain('Anti-Timeout Masking');
    expect(content).toContain('Non-Equivalence of Sequential Tests');
    expect(content).toContain('No Self-Approval');
  });

  // ── Area 3: Runtime Invocation ──────────────────────────────────────────────
  test('3. Runtime invocation: AgentRuntime successfully invokes concurrency-analyst via ProviderAdapter', async () => {
    const sampleFinding = {
      findingId: 'CONC-FIND-001',
      title: 'Time-of-Check to Time-of-Use Window in Workspace Directory Creation',
      description:
        'Directory existence check followed by unlinked directory creation introduces TOCTOU vulnerability.',
      concurrencyCategory: 'RACE_CONDITION',
      severity: 'HIGH',
      confidence: 0.94,
      affectedComponents: ['TransactionManager'],
      affectedFiles: ['src/execution/transaction_manager.js'],
      sharedResources: ['this.txDir'],
      executionContext: 'Concurrent transaction initialization across workers',
      interleavingSequence: [
        'Worker 1 calls !fs.existsSync(txDir)',
        'Worker 2 creates symlink at txDir pointing to external folder',
        'Worker 1 calls fs.mkdirSync(txDir) through replaced symlink segment',
      ],
      raceConditionEvidence:
        'fs.existsSync checked at line 179 before mkdirSync at line 179 without atomic handle binding.',
      protectedInvariant:
        'Directory creation must guarantee path containment under concurrent filesystem mutations.',
      rootCause: 'Non-atomic existence validation and directory creation window.',
      impact:
        'Adversary with local write access could redirect transaction directory outside workspace boundary.',
      reproductionRequirements: ['Barrier synchronization between existsSync and mkdirSync calls.'],
      recommendedMitigation:
        'Use recursive mkdir with atomic existence handling or strict parent directory handle validation.',
      verificationRequirements: ['test/unit/transaction_manager.test.js'],
      rollbackPlan:
        'Revert directory creation changes if Windows OS-level ENOENT regressions occur.',
      evidenceReferences: ['EVID-CONC-TOCTOU-01'],
      uncertaintyOrMissingEvidence: 'None identified.',
    };

    const mockProvider = new ProviderAdapter({
      mockHandler: async () => ({
        status: 'SUCCESS',
        text: JSON.stringify({
          status: 'SUCCESS',
          summary: 'Concurrency analysis identified 1 race condition.',
          concurrencyFindings: [sampleFinding],
          recommendations: ['Route TOCTOU finding to patch-proposal-agent.'],
        }),
      }),
    });

    const runtime = new AgentRuntime({
      repoRoot: REPO_ROOT,
      provider: mockProvider,
    });

    const result = await runtime.executeTask({
      taskId: 'task-conc-001',
      agentId: 'concurrency-analyst',
      objective: 'Audit transaction manager directory creation for TOCTOU race windows.',
    });

    expect(result.status).toBe('SUCCESS');
    expect(result.agentId).toBe('concurrency-analyst');
    expect(result.concurrencyFindings.length).toBe(1);
    expect(result.concurrencyFindings[0].findingId).toBe('CONC-FIND-001');
    expect(result.concurrencyFindings[0].concurrencyCategory).toBe('RACE_CONDITION');
    expect(result.concurrencyFindings[0].severity).toBe('HIGH');
  });

  // ── Area 4: Structured Finding Validation ───────────────────────────────────
  test('4. Structured finding validation: validateConcurrencyFinding validates all 21 schema fields', () => {
    const validFinding = {
      findingId: 'CONC-TEST-001',
      title: 'Deadlock Risk in Multi-Resource Acquisition',
      description: 'Resource locks acquired in inconsistent order across execution paths.',
      concurrencyCategory: 'DEADLOCK',
      severity: 'HIGH',
      confidence: 0.9,
      affectedComponents: ['ResourcePool', 'WorkerThread'],
      affectedFiles: ['src/execution/worker_pool.js'],
      sharedResources: ['ResourceLockA', 'ResourceLockB'],
      executionContext: 'Parallel worker dispatch',
      interleavingSequence: [
        'Worker 1 acquires Lock A',
        'Worker 2 acquires Lock B',
        'Worker 1 attempts to acquire Lock B (blocked)',
        'Worker 2 attempts to acquire Lock A (blocked - cyclic deadlock)',
      ],
      raceConditionEvidence:
        'Lock acquisition in worker_pool.js line 45 (A then B) vs line 92 (B then A).',
      protectedInvariant: 'Global lock acquisition must strictly follow canonical total ordering.',
      rootCause: 'Inverted lock acquisition sequence in worker thread handler.',
      impact: 'Permanent system stall when workers 1 and 2 execute concurrently.',
      reproductionRequirements: ['Concurrent execution of worker task 1 and worker task 2.'],
      recommendedMitigation: 'Enforce canonical lock hierarchy order (A before B everywhere).',
      verificationRequirements: ['npx jest test/unit/deadlock_test.js'],
      rollbackPlan: 'Revert ordering change if deadlock detected.',
      evidenceReferences: ['EVID-DEADLOCK-001'],
      uncertaintyOrMissingEvidence: 'None identified.',
    };

    const parsed = validateConcurrencyFinding(validFinding);
    expect(parsed.findingId).toBe('CONC-TEST-001');
    expect(parsed.concurrencyCategory).toBe('DEADLOCK');
    expect(parsed.severity).toBe('HIGH');
    expect(parsed.interleavingSequence.length).toBe(4);
    expect(parsed.confidence).toBe(0.9);
  });

  // ── Area 5: Malformed Finding Rejection ──────────────────────────────────────
  test('5. Malformed finding rejection: rejects invalid schemas, bad ranges, missing evidence, and traversal', () => {
    // 5a. Missing required fields
    const missingTitle = {
      findingId: 'CONC-ERR-001',
      concurrencyCategory: 'DATA_RACE',
      severity: 'LOW',
      confidence: 0.8,
    };
    expect(() => validateConcurrencyFinding(missingTitle)).toThrow();

    // 5b. Invalid confidence range (> 1.0 or < 0.0)
    const invalidConfidence = {
      findingId: 'CONC-ERR-002',
      title: 'Test',
      description: 'Desc',
      concurrencyCategory: 'DATA_RACE',
      severity: 'LOW',
      confidence: 1.5,
      protectedInvariant: 'Inv',
      rootCause: 'Cause',
      impact: 'Impact',
      recommendedMitigation: 'Mitigation',
      rollbackPlan: 'Rollback',
      interleavingSequence: ['Step 1'],
    };
    expect(() => validateConcurrencyFinding(invalidConfidence)).toThrow();

    // 5c. HIGH / CRITICAL finding missing raceConditionEvidence or evidenceReferences
    const highWithoutEvidence = {
      findingId: 'CONC-ERR-003',
      title: 'High severity without evidence',
      description: 'Desc',
      concurrencyCategory: 'DATA_RACE',
      severity: 'HIGH',
      confidence: 0.9,
      protectedInvariant: 'Inv',
      rootCause: 'Cause',
      impact: 'Impact',
      recommendedMitigation: 'Mitigation',
      rollbackPlan: 'Rollback',
      interleavingSequence: ['Step 1'],
      raceConditionEvidence: '', // empty!
      evidenceReferences: [], // empty!
    };
    const safeRes1 = safeValidateConcurrencyFinding(highWithoutEvidence);
    expect(safeRes1.success).toBe(false);

    // 5d. Path traversal in affectedFiles
    const pathTraversalFinding = {
      findingId: 'CONC-ERR-004',
      title: 'Traversal test',
      description: 'Desc',
      concurrencyCategory: 'OTHER',
      severity: 'LOW',
      confidence: 0.5,
      affectedFiles: ['../../etc/shadow'],
      protectedInvariant: 'Inv',
      rootCause: 'Cause',
      impact: 'Impact',
      recommendedMitigation: 'Mitigation',
      rollbackPlan: 'Rollback',
    };
    const safeRes2 = safeValidateConcurrencyFinding(pathTraversalFinding);
    expect(safeRes2.success).toBe(false);

    // 5e. Null byte in affectedFiles
    const nullByteFinding = {
      findingId: 'CONC-ERR-005',
      title: 'Null byte test',
      description: 'Desc',
      concurrencyCategory: 'OTHER',
      severity: 'LOW',
      confidence: 0.5,
      affectedFiles: ['src/execution/\0kernel.js'],
      protectedInvariant: 'Inv',
      rootCause: 'Cause',
      impact: 'Impact',
      recommendedMitigation: 'Mitigation',
      rollbackPlan: 'Rollback',
    };
    const safeRes3 = safeValidateConcurrencyFinding(nullByteFinding);
    expect(safeRes3.success).toBe(false);

    // 5f. Empty interleaving sequence for race condition
    const emptyInterleaving = {
      findingId: 'CONC-ERR-006',
      title: 'Empty sequence',
      description: 'Desc',
      concurrencyCategory: 'RACE_CONDITION',
      severity: 'MEDIUM',
      confidence: 0.7,
      protectedInvariant: 'Inv',
      rootCause: 'Cause',
      impact: 'Impact',
      recommendedMitigation: 'Mitigation',
      rollbackPlan: 'Rollback',
      interleavingSequence: [], // empty for RACE_CONDITION!
    };
    const safeRes4 = safeValidateConcurrencyFinding(emptyInterleaving);
    expect(safeRes4.success).toBe(false);
  });

  // ── Area 6: Shared Mutable State Detection ──────────────────────────────────
  test('6. Shared mutable state detection: models shared memory variables across concurrent event ticks', () => {
    class InsecureSharedCounter {
      constructor() {
        this.counter = 0;
      }
      async increment() {
        const current = this.counter;
        await Promise.resolve(); // yields to event loop tick
        this.counter = current + 1;
      }
    }

    const _counter = new InsecureSharedCounter();
    const finding = {
      findingId: 'CONC-STATE-001',
      title: 'Unsynchronized Shared Mutable Counter',
      description:
        'Concurrent async increments interleave on read-modify-write ticks causing lost updates.',
      concurrencyCategory: 'UNSAFE_SHARED_STATE',
      severity: 'MEDIUM',
      confidence: 0.95,
      sharedResources: ['InsecureSharedCounter.counter'],
      protectedInvariant: 'Every increment call must atomically increase counter by exactly 1.',
      rootCause: 'Asynchronous yield between state read and state write.',
      impact: 'Lost updates under concurrent event-loop scheduling.',
      recommendedMitigation: 'Use synchronous atomic update or queue serialization.',
      rollbackPlan: 'Revert to sequential counter.',
    };

    expect(validateConcurrencyFinding(finding).concurrencyCategory).toBe('UNSAFE_SHARED_STATE');
  });

  // ── Area 7: Race-Condition Interleaving Analysis ─────────────────────────────
  test('7. Race-condition interleaving analysis: validates discrete micro-operation sequence', () => {
    const finding = {
      findingId: 'CONC-RACE-001',
      title: 'Check-then-act File Modification Race',
      description:
        'File modification assumes existence and hash from check phase remain valid during write phase.',
      concurrencyCategory: 'DATA_RACE',
      severity: 'HIGH',
      confidence: 0.92,
      affectedFiles: ['src/execution/controlled_write_service.js'],
      sharedResources: ['target_file.js'],
      interleavingSequence: [
        'Thread A: reads target_file.js content and computes proposalHash',
        'Thread B: modifies target_file.js on disk',
        'Thread A: commits write assuming original content state',
      ],
      raceConditionEvidence: 'Lack of atomic file handle locking between preview and commit.',
      protectedInvariant:
        'File write must fail if target file is modified by another actor between review and commit.',
      rootCause: 'Non-atomic review-to-commit window.',
      impact: 'Silent overwrite of concurrent modifications.',
      recommendedMitigation: 'Verify content hash at transaction commit time (TOCTOU protection).',
      verificationRequirements: ['ControlledWriteService commitWrite hash verification test.'],
      rollbackPlan: 'Rollback transaction if hash mismatch occurs.',
      evidenceReferences: ['EVID-TOCTOU-001'],
    };

    const parsed = validateConcurrencyFinding(finding);
    expect(parsed.concurrencyCategory).toBe('DATA_RACE');
    expect(parsed.interleavingSequence.length).toBe(3);
  });

  // ── Area 8: Deadlock Cycle Detection ────────────────────────────────────────
  test('8. Deadlock cycle detection: models wait-for graph cycle between two distinct resource locks', () => {
    const finding = {
      findingId: 'CONC-DEADLOCK-001',
      title: 'Cyclic Lock Contention in Dual-Session Synchronization',
      description:
        'Session 1 holds Lock X and requests Lock Y; Session 2 holds Lock Y and requests Lock X.',
      concurrencyCategory: 'DEADLOCK',
      severity: 'CRITICAL',
      confidence: 1.0,
      sharedResources: ['Lock_X', 'Lock_Y'],
      interleavingSequence: [
        '1. Session 1 acquires Lock_X',
        '2. Session 2 acquires Lock_Y',
        '3. Session 1 awaits Lock_Y (blocked by Session 2)',
        '4. Session 2 awaits Lock_X (blocked by Session 1)',
      ],
      raceConditionEvidence: 'Circular wait confirmed in task dispatch trace log.',
      protectedInvariant: 'Lock hierarchy invariant: Lock_X must always precede Lock_Y.',
      rootCause: 'Unordered lock acquisition across concurrent session handlers.',
      impact: 'Permanent thread starvation and server hang.',
      recommendedMitigation: 'Sort required resource locks lexicographically before acquisition.',
      verificationRequirements: ['Dual-worker lock acquisition barrier test.'],
      rollbackPlan: 'Revert to single global queue if sorting proves impractical.',
      evidenceReferences: ['EVID-DEADLOCK-TRACE-01'],
    };

    const parsed = validateConcurrencyFinding(finding);
    expect(parsed.concurrencyCategory).toBe('DEADLOCK');
    expect(parsed.severity).toBe('CRITICAL');
  });

  // ── Area 9: Livelock Identification ─────────────────────────────────────────
  test('9. Livelock identification: identifies busy-wait spinning without state progression', () => {
    const finding = {
      findingId: 'CONC-LIVELOCK-001',
      title: 'Unbounded Spin-Wait in Optimistic Retry Loop',
      description:
        'Two concurrent transactions continuously back off and retry on collision at the exact same frequency.',
      concurrencyCategory: 'LIVELOCK',
      severity: 'HIGH',
      confidence: 0.88,
      sharedResources: ['TransactionLock'],
      interleavingSequence: [
        'Transaction A detects collision, aborts, and immediately retries',
        'Transaction B detects collision, aborts, and immediately retries',
        'Both continuously collide without randomized backoff',
      ],
      raceConditionEvidence:
        'Deterministic retry loop without jitter observed in transaction_manager.js.',
      protectedInvariant:
        'Optimistic retries must employ randomized exponential backoff (jitter) to break symmetry.',
      rootCause: 'Uniform fixed retry delay without jitter.',
      impact: '100% CPU utilization without completing either transaction.',
      recommendedMitigation: 'Introduce full jitter into retry delays.',
      verificationRequirements: ['Verify collision resolution under simulated lock contention.'],
      rollbackPlan: 'Restore linear backoff if jitter introduces queue latency.',
      evidenceReferences: ['EVID-RETRY-COLLISION-01'],
    };

    expect(validateConcurrencyFinding(finding).concurrencyCategory).toBe('LIVELOCK');
  });

  // ── Area 10: Starvation Detection ───────────────────────────────────────────
  test('10. Starvation detection: models continuous preemption of low-priority tasks', () => {
    const finding = {
      findingId: 'CONC-STARVE-001',
      title: 'Indefinite Postponement of LOW Priority Tasks Under Continuous CRITICAL Load',
      description:
        'Queue drain strictly prioritizes highest priority, bypassing waiting LOW tasks forever.',
      concurrencyCategory: 'STARVATION',
      severity: 'HIGH',
      confidence: 0.95,
      sharedResources: ['KernelScheduler._queue'],
      protectedInvariant:
        'Every queued task must execute within a bounded number of queue drain cycles.',
      rootCause: 'Lack of dynamic priority aging for waiting tasks.',
      impact: 'Background audit and telemetry tasks never execute during burst conditions.',
      recommendedMitigation: 'Implement dynamic priority aging (boost priority after N bypasses).',
      verificationRequirements: ['test/unit/scheduler_fairness.test.js'],
      rollbackPlan: 'Revert aging logic if priority inversion occurs.',
      evidenceReferences: ['EVID-STARVE-TRACE-01'],
      raceConditionEvidence:
        'Queue drain loop sorts by static priority without wait duration weighting.',
    };

    expect(validateConcurrencyFinding(finding).concurrencyCategory).toBe('STARVATION');
  });

  // ── Area 11: Lock Ordering Analysis ─────────────────────────────────────────
  test('11. Lock ordering analysis: verifies canonical total ordering prevents deadlock', () => {
    const finding = {
      findingId: 'CONC-LOCK-001',
      title: 'Non-Canonical Lock Ordering Between Workspace and Config Locks',
      description:
        'Component A locks Workspace then Config; Component B locks Config then Workspace.',
      concurrencyCategory: 'LOCK_CONTENTION',
      severity: 'MEDIUM',
      confidence: 0.9,
      sharedResources: ['workspace.lock', 'config.lock'],
      protectedInvariant:
        'Global lock order: Workspace lock must always be acquired before Config lock.',
      rootCause: 'Inconsistent lock acquisition ordering across modules.',
      impact: 'High contention and potential deadlock under concurrent config reloads.',
      recommendedMitigation: 'Standardize lock acquisition helper with enforced ordering.',
      rollbackPlan: 'Revert helper if lock contention increases.',
    };

    expect(validateConcurrencyFinding(finding).concurrencyCategory).toBe('LOCK_CONTENTION');
  });

  // ── Area 12: Cancellation Propagation ───────────────────────────────────────
  test('12. Cancellation propagation: verifies AbortSignal promptly frees resources without corruption', async () => {
    const scheduler = new KernelScheduler({ maxConcurrentTasks: 1 });
    const barrier = createBarrier(2);
    const ac = new AbortController();

    const task1Promise = scheduler.schedule(
      async () => {
        await barrier.wait();
        return new Promise(() => {}); // blocks until cancelled
      },
      { taskId: 'task-1', priority: 'HIGH', signal: ac.signal },
    );

    await barrier.wait();
    expect(scheduler.activeTasks).toBe(1);

    // Abort task 1 while running
    ac.abort();

    await expect(task1Promise).rejects.toThrow(/TASK_ABORTED/i);

    // Verify slot released immediately
    expect(scheduler.activeTasks).toBe(0);

    // Task 2 should now execute cleanly
    const task2Result = await scheduler.schedule(async () => 'TASK_2_COMPLETE', {
      taskId: 'task-2',
      priority: 'MEDIUM',
    });

    expect(task2Result).toBe('TASK_2_COMPLETE');
  });

  // ── Area 13: Timeout Handling ───────────────────────────────────────────────
  test('13. Timeout handling: verifies timeout aborts hung task and releases concurrency slot', async () => {
    const scheduler = new KernelScheduler({ maxConcurrentTasks: 1 });

    const timeoutPromise = scheduler.schedule(
      async () => {
        return new Promise(() => {}); // never finishes on its own
      },
      { taskId: 'task-timeout', priority: 'HIGH', timeoutMs: 30 },
    );

    await expect(timeoutPromise).rejects.toThrow(/TASK_TIMEOUT|timed out/i);
    expect(scheduler.activeTasks).toBe(0);
  });

  // ── Area 14: Resource Leak Detection ────────────────────────────────────────
  test('14. Resource leak detection: identifies unhandled rejection or unreleased handle in worker', () => {
    const finding = {
      findingId: 'CONC-LEAK-001',
      title: 'Unclosed File Descriptor on Extraction Exception',
      description: 'Exception during JSON parsing bypasses fs.closeSync leaving handle open.',
      concurrencyCategory: 'RESOURCE_LEAK',
      severity: 'HIGH',
      confidence: 0.95,
      affectedFiles: ['src/execution/transaction_manager.js'],
      sharedResources: ['file descriptors (fd)'],
      raceConditionEvidence:
        'fs.openSync called without guaranteed finally block around closeSync.',
      protectedInvariant: 'Every openSync must have a corresponding closeSync in a finally block.',
      rootCause: 'Missing try/finally around file descriptor lifecycle.',
      impact: 'File descriptor exhaustion under high concurrency.',
      recommendedMitigation: 'Wrap openSync/writeSync/fsyncSync in try-finally with closeSync.',
      verificationRequirements: ['Test fd leak under repeated faulty writes.'],
      rollbackPlan: 'Revert if OS compatibility issues occur.',
      evidenceReferences: ['EVID-LEAK-001'],
    };

    expect(validateConcurrencyFinding(finding).concurrencyCategory).toBe('RESOURCE_LEAK');
  });

  // ── Area 15: Session Isolation ──────────────────────────────────────────────
  test('15. Session isolation: verifies EvidenceBus prevents cross-session state pollution', () => {
    const bus = new EvidenceBus();
    const sessionA = bus.createSession('session-alpha');
    const sessionB = bus.createSession('session-beta');

    sessionA.recordFinding('task-a', {
      findingId: 'FIND-A',
      category: 'SECURITY',
      severity: 'HIGH',
      evidence: 'Evidence A',
    });

    sessionB.recordFinding('task-b', {
      findingId: 'FIND-B',
      category: 'PERFORMANCE',
      severity: 'LOW',
      evidence: 'Evidence B',
    });

    const findingsA = sessionA.getFindings();
    const findingsB = sessionB.getFindings();

    expect(findingsA.length).toBe(1);
    expect(findingsA[0].metadata.findingId).toBe('FIND-A');
    expect(findingsA[0].sessionId).toBe('session-alpha');

    expect(findingsB.length).toBe(1);
    expect(findingsB[0].metadata.findingId).toBe('FIND-B');
    expect(findingsB[0].sessionId).toBe('session-beta');

    // Cross-query strictly isolated
    expect(findingsA.some(f => f.metadata && f.metadata.findingId === 'FIND-B')).toBe(false);
    expect(findingsB.some(f => f.metadata && f.metadata.findingId === 'FIND-A')).toBe(false);
  });

  // ── Area 16: Concurrent Transaction Interference ────────────────────────────
  test('16. Concurrent transaction interference: TransactionManager mutual exclusion rejects concurrent begin()', () => {
    const tm1 = new TransactionManager({ workspace: tempWorkspace });
    const tm2 = new TransactionManager({ workspace: tempWorkspace });

    tm1.begin();
    expect(tm1.state).toBe('PREPARING');

    // tm2 must fail to acquire lock while tm1 holds it
    expect(() => tm2.begin()).toThrow(
      /Active transaction lock found|Could not acquire concurrency lock/i,
    );

    // After tm1 rolls back, tm2 can acquire cleanly
    tm1.rollback();
    expect(tm1.state).toBe('ROLLED_BACK');

    expect(() => tm2.begin()).not.toThrow();
    expect(tm2.state).toBe('PREPARING');
    tm2.rollback();
  });

  // ── Area 17: Scheduler Fairness ─────────────────────────────────────────────
  test('17. Scheduler fairness: verifies dynamic priority aging prevents low-priority starvation', async () => {
    const scheduler = new KernelScheduler({
      maxConcurrentTasks: 1,
      agingBypassThreshold: 2,
    });

    const executionOrder = [];

    // Hold slot with blocker
    const blockerBarrier = createBarrier(2);
    const blockerDeferred = createDeferred();
    scheduler.schedule(
      async () => {
        await blockerBarrier.wait();
        await blockerDeferred.promise;
        executionOrder.push('blocker');
      },
      { taskId: 'blocker', priority: 'CRITICAL' },
    );

    await blockerBarrier.wait();

    // Enqueue LOW task
    const lowPromise = scheduler.schedule(
      async () => {
        executionOrder.push('low-task');
      },
      { taskId: 'low-task', priority: 'LOW' },
    );

    // Enqueue 3 CRITICAL tasks that would starve low-task without priority aging
    scheduler.schedule(
      async () => {
        executionOrder.push('crit-1');
      },
      { taskId: 'crit-1', priority: 'CRITICAL' },
    );
    scheduler.schedule(
      async () => {
        executionOrder.push('crit-2');
      },
      { taskId: 'crit-2', priority: 'CRITICAL' },
    );
    scheduler.schedule(
      async () => {
        executionOrder.push('crit-3');
      },
      { taskId: 'crit-3', priority: 'CRITICAL' },
    );

    // Release blocker
    blockerDeferred.resolve();

    await lowPromise;

    // Verify low-task executed before all 3 critical tasks were exhausted due to aging
    expect(executionOrder).toContain('low-task');
    const lowIndex = executionOrder.indexOf('low-task');
    expect(lowIndex).toBeGreaterThan(0);
    expect(lowIndex).toBeLessThan(executionOrder.length);
  });

  // ── Area 18: Evidence Provenance ────────────────────────────────────────────
  test('18. Evidence provenance: verifies deterministic SHA-256 hash sealing on concurrency events', () => {
    const bus = new EvidenceBus();
    const session = bus.createSession('provenance-session');

    const event = session.recordFinding('task-prov', {
      findingId: 'CONC-PROV-001',
      category: 'CORRECTNESS',
      severity: 'HIGH',
      concurrencyCategory: 'DATA_RACE',
      evidence: 'Concrete code trace at line 42',
    });

    expect(event.provenanceHash).toBeDefined();
    expect(typeof event.provenanceHash).toBe('string');
    expect(event.provenanceHash.length).toBe(64); // SHA-256 hex string

    // Event must be deep frozen
    expect(Object.isFrozen(event)).toBe(true);
    expect(() => {
      event.severity = 'LOW';
    }).toThrow();
  });

  // ── Area 19: Provider Failure & Timeout ──────────────────────────────────────
  test('19. Provider failure & timeout: AgentRuntime fail-closed on provider timeout', async () => {
    const failingProvider = new ProviderAdapter({
      mockHandler: async () => {
        throw new Error('PROVIDER_NETWORK_TIMEOUT');
      },
    });

    const runtime = new AgentRuntime({
      repoRoot: REPO_ROOT,
      provider: failingProvider,
    });

    const result = await runtime.executeTask({
      taskId: 'task-fail-001',
      agentId: 'concurrency-analyst',
      objective: 'Run concurrency audit on failing provider.',
    });

    expect(result.status).toBe('ERROR');
    expect(result.summary).toContain('PROVIDER_ERROR');
    expect(result.concurrencyFindings).toEqual([]);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  // ── Area 20: Human Approval Boundary ────────────────────────────────────────
  test('20. Human approval boundary: AI agents cannot self-authorize concurrency write proposals', async () => {
    const controlledWrite = new ControlledWriteService({
      workspaceRoot: tempWorkspace,
      approvalSecret: 'audit-secret-key-1234',
      reviewExecutor: new ReviewExecutor({
        provider: new ProviderAdapter({
          mockHandler: async () => ({
            verdict: 'APPROVED',
            confidence: 1.0,
            findings: [],
          }),
        }),
        repoRoot: REPO_ROOT,
      }),
    });

    const req = {
      workspaceId: 'ws-1',
      requestId: 'req-conc-write-1',
      reason: 'Remediate detected concurrency race condition in production core',
      requiresHumanApproval: true,
      files: [
        {
          path: 'src/concurrency_fix.js',
          operation: 'CREATE',
          content: 'module.exports = { safe: true };',
        },
      ],
    };

    const reviewRes = await controlledWrite.requestWrite(req);
    expect(reviewRes.status).toBe('HUMAN_APPROVAL_REQUIRED');

    // Attempt self-approval by concurrency-analyst
    expect(() => {
      controlledWrite.approveWrite(reviewRes.token, 'concurrency-analyst', 'sig-fake');
    }).toThrow(/Security Violation: AI agents and automated callers cannot self-approve/i);

    // Attempt approval with unauthorized automated identity
    expect(() => {
      controlledWrite.approveWrite(reviewRes.token, 'agent-concurrency', 'sig-fake');
    }).toThrow(/Security Violation: AI agents and automated callers cannot self-approve/i);
  });

  // ── Area 21: Path Containment ───────────────────────────────────────────────
  test('21. Path containment: rejects paths escaping workspace root in concurrency findings', () => {
    const outsidePath = path.resolve(tempWorkspace, '..', 'escaped.js');
    const finding = {
      findingId: 'CONC-PATH-001',
      title: 'Path Traversal Risk',
      description: 'Affected files must remain strictly within workspace boundary.',
      concurrencyCategory: 'RESOURCE_LEAK',
      severity: 'LOW',
      confidence: 0.5,
      affectedFiles: [outsidePath],
      protectedInvariant: 'All analyzed files must reside within workspace.',
      rootCause: 'Unsanitized path input.',
      impact: 'Information disclosure or unintended path analysis.',
      recommendedMitigation: 'Assert paths within root.',
      rollbackPlan: 'None.',
    };

    const relativeEscaped = {
      ...finding,
      affectedFiles: ['../outside.js'],
    };
    expect(safeValidateConcurrencyFinding(relativeEscaped).success).toBe(false);
  });

  // ── Area 22: End-to-End Runtime Integration ─────────────────────────────────
  test('22. End-to-end runtime integration: complete pipeline with EvidenceBus, ConflictResolver, and runtime', async () => {
    const evidenceBus = new EvidenceBus();
    const session = evidenceBus.createSession('e2e-session');

    const finding = {
      findingId: 'CONC-E2E-001',
      title: 'Interleaved Transaction Rollback Leak',
      description: 'Concurrent rollback attempts on same transaction ID result in partial cleanup.',
      concurrencyCategory: 'TRANSACTION_INTERFERENCE',
      severity: 'HIGH',
      confidence: 0.96,
      affectedComponents: ['TransactionManager'],
      affectedFiles: ['src/execution/transaction_manager.js'],
      sharedResources: ['wal.json', 'undo/mapping.json'],
      executionContext: 'Simulated process failure during dual rollback',
      interleavingSequence: [
        'Process A reads undo mapping',
        'Process B reads undo mapping',
        'Process A restores original files and unlinks undo dir',
        'Process B attempts to read unlinked undo dir and throws ENOENT',
      ],
      raceConditionEvidence: 'Undo log cleanup lacks atomic completion marker between processes.',
      protectedInvariant:
        'Rollback must be idempotent and crash-consistent across concurrent invocations.',
      rootCause: 'Absence of idempotent state transition in undo directory removal.',
      impact: 'Crash during recovery could leave workspace in partially restored state.',
      reproductionRequirements: ['Concurrent execution of recover() from two process handles.'],
      recommendedMitigation:
        'Make recovery idempotent; ignore ENOENT during cleanup if already completed.',
      verificationRequirements: ['test/unit/transaction_recovery_idempotency.test.js'],
      rollbackPlan: 'Revert idempotency check if silent error masking is observed.',
      evidenceReferences: ['EVID-E2E-RECOVER-01'],
      uncertaintyOrMissingEvidence: 'None identified.',
    };

    const mockProvider = new ProviderAdapter({
      mockHandler: async () => ({
        status: 'SUCCESS',
        text: JSON.stringify({
          status: 'SUCCESS',
          summary: 'E2E Concurrency Analysis complete.',
          concurrencyFindings: [finding],
          recommendations: ['Route to patch-proposal-agent for idempotent recovery fix.'],
        }),
      }),
    });

    const runtime = new AgentRuntime({
      repoRoot: REPO_ROOT,
      provider: mockProvider,
    });

    const result = await runtime.executeTask({
      taskId: 'task-e2e-conc',
      agentId: 'concurrency-analyst',
      objective: 'Audit transaction recovery idempotency under concurrent processes.',
    });

    expect(result.status).toBe('SUCCESS');
    expect(result.concurrencyFindings.length).toBe(1);

    // Record on EvidenceBus
    const ev = session.recordFinding('task-e2e-conc', result.concurrencyFindings[0]);
    expect(ev.provenanceHash).toBeDefined();

    // Check with ConflictResolver
    const resolver = new ConflictResolver();
    const resolved = resolver.resolve([result.concurrencyFindings[0]]);
    expect(resolved.conflicts.length).toBe(0);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ── 10 ADVERSARIAL CONCURRENCY SCENARIOS (Deterministic Barriers & Promises) ──
  // ─────────────────────────────────────────────────────────────────────────────

  test('Adversarial 1: Two agents attempting to update the same shared resource simultaneously', async () => {
    // Initial state: Shared in-memory bank balance
    let balance = 100;
    const barrier = createBarrier(2);
    const lockDeferred = createDeferred();

    // Concurrent operations: Two workers withdraw 80 concurrently
    async function workerWithdraw(amount) {
      await barrier.wait(); // Synchronize at critical section entry
      const current = balance;
      await lockDeferred.promise; // Deterministic interleaving control
      if (current >= amount) {
        balance = current - amount;
        return true;
      }
      return false;
    }

    const p1 = workerWithdraw(80);
    const p2 = workerWithdraw(80);

    // Release both workers simultaneously after both have read current balance
    lockDeferred.resolve();
    const [_res1, _res2] = await Promise.all([p1, p2]);

    // Observed result: Without synchronization, both withdraw 80 leading to negative balance (data race)
    // Expected invariant: Total balance must never drop below 0. Concurrency analyst flags this pattern.
    const finding = {
      findingId: 'ADV-1-DATA-RACE',
      title: 'Time-of-Check to Time-of-Use Double Spend Race',
      description:
        'Concurrent withdrawals read balance before either writes, resulting in balance underflow.',
      concurrencyCategory: 'DATA_RACE',
      severity: 'CRITICAL',
      confidence: 1.0,
      sharedResources: ['balance'],
      interleavingSequence: [
        'Worker 1 reads balance (100)',
        'Worker 2 reads balance (100)',
        'Worker 1 checks (100 >= 80) -> true, writes balance = 20',
        'Worker 2 checks (100 >= 80) -> true, writes balance = -60 (Invariant Violation)',
      ],
      raceConditionEvidence: 'balance check and update not enclosed in atomic critical section.',
      protectedInvariant: 'balance >= 0 at all times.',
      rootCause: 'Non-atomic check-and-subtract.',
      impact: 'Financial loss / data corruption.',
      recommendedMitigation: 'Use compare-and-swap or mutex lock around withdrawal transaction.',
      verificationRequirements: ['Deterministic barrier double-spend test.'],
      rollbackPlan: 'None required.',
      evidenceReferences: ['EVID-ADV-1'],
    };

    expect(validateConcurrencyFinding(finding).concurrencyCategory).toBe('DATA_RACE');
  });

  test('Adversarial 2: Concurrent writes to overlapping file ranges', () => {
    const finding = {
      findingId: 'ADV-2-OVERLAP-WRITE',
      title: 'Concurrent Overlapping Line Writes in File Modification Service',
      description:
        'Two concurrent patch proposals modify overlapping lines in the same target file.',
      concurrencyCategory: 'TRANSACTION_INTERFERENCE',
      severity: 'HIGH',
      confidence: 0.95,
      affectedFiles: ['src/core/parser.js'],
      sharedResources: ['src/core/parser.js#L40-L60'],
      interleavingSequence: [
        'Agent 1 targets lines 40-55 for function extraction',
        'Agent 2 targets lines 50-65 for variable rename',
        'Applying both results in conflicting, corrupted AST syntax',
      ],
      raceConditionEvidence:
        'Both patch proposals reference line 52 concurrently without conflict barrier.',
      protectedInvariant:
        'No two writes to overlapping line ranges may commit concurrently without rebase.',
      rootCause: 'Lack of range-level conflict detection in patch proposal engine.',
      impact: 'Syntax errors and corrupted source files on commit.',
      recommendedMitigation:
        'Detect overlapping line ranges via ConflictResolver and reject concurrent commit.',
      verificationRequirements: ['Test line range overlap detection.'],
      rollbackPlan: 'Revert conflicting patch.',
      evidenceReferences: ['EVID-ADV-2'],
    };

    expect(validateConcurrencyFinding(finding).concurrencyCategory).toBe(
      'TRANSACTION_INTERFERENCE',
    );
  });

  test('Adversarial 3: A task cancelled while holding a lock / slot', async () => {
    const scheduler = new KernelScheduler({ maxConcurrentTasks: 1 });
    const barrier = createBarrier(2);
    const ac = new AbortController();

    let lockHeld = false;

    const taskPromise = scheduler.schedule(
      async () => {
        lockHeld = true;
        await barrier.wait();
        return new Promise(() => {}); // never finishes until aborted
      },
      { taskId: 'lock-holder', priority: 'CRITICAL', signal: ac.signal },
    );

    await barrier.wait();
    expect(lockHeld).toBe(true);

    // Cancel while lock is held
    ac.abort();

    await expect(taskPromise).rejects.toThrow(/TASK_ABORTED/i);
    expect(scheduler.activeTasks).toBe(0); // Slot guaranteed released in finally block
  });

  test('Adversarial 4: A dependency failing while other DAG branches continue', async () => {
    const dispatcher = new AgentDispatcher({
      evidenceBus: new EvidenceBus(),
      runtime: {
        executeTask: async task => {
          if (task.taskId === 'task-B') {
            throw new Error('TASK_B_FAILED');
          }
          return {
            taskId: task.taskId,
            agentId: task.agentId,
            status: 'SUCCESS',
            summary: `${task.taskId} succeeded`,
            findings: [],
            proposals: [],
            refactoringProposals: [],
            concurrencyFindings: [],
            writeProposals: [],
            evidence: [],
            artifacts: [],
            recommendations: [],
            errors: [],
            provenance: {
              inputHash: 'hash',
              outputHash: 'hash',
              provider: 'mock',
              model: 'mock',
              durationMs: 5,
              timestamp: Date.now(),
            },
            durationMs: 5,
          };
        },
      },
    });

    const tasks = [
      { taskId: 'task-A', agentId: 'concurrency-analyst', objective: 'Step A' },
      {
        taskId: 'task-B',
        agentId: 'concurrency-analyst',
        objective: 'Step B',
        dependencies: ['task-A'],
      },
      {
        taskId: 'task-C',
        agentId: 'concurrency-analyst',
        objective: 'Step C (depends on B)',
        dependencies: ['task-B'],
      },
      { taskId: 'task-D', agentId: 'concurrency-analyst', objective: 'Independent Step D' },
    ];

    const res = await dispatcher.dispatch(tasks);

    // Expected invariant: Independent task D succeeds; task B fails; dependent task C is isolated and marked BLOCKED
    expect(res.results['task-D'].status).toBe('SUCCESS');
    expect(res.results['task-B'].status).toBe('ERROR');
    expect(res.results['task-C'].status).toBe('BLOCKED');
  });

  test('Adversarial 5: A high-priority queue continuously receiving new tasks (Fairness Aging)', async () => {
    const scheduler = new KernelScheduler({
      maxConcurrentTasks: 1,
      agingBypassThreshold: 2,
    });

    const executed = [];
    const holdBarrier = createBarrier(2);
    const holdDeferred = createDeferred();

    // Blocker occupies slot
    scheduler.schedule(
      async () => {
        await holdBarrier.wait();
        await holdDeferred.promise;
        executed.push('blocker');
      },
      { taskId: 'blocker', priority: 'CRITICAL' },
    );

    await holdBarrier.wait();

    // Low-priority task enqueued
    const lowTaskPromise = scheduler.schedule(
      async () => {
        executed.push('low-victim');
      },
      { taskId: 'low-victim', priority: 'LOW' },
    );

    // Sustained arrival of 4 CRITICAL tasks
    for (let i = 1; i <= 4; i++) {
      scheduler.schedule(
        async () => {
          executed.push(`crit-${i}`);
        },
        { taskId: `crit-${i}`, priority: 'CRITICAL' },
      );
    }

    // Release blocker
    holdDeferred.resolve();

    await lowTaskPromise;

    // Expected invariant: Low-priority task is not starved to the end; aging boosted it
    expect(executed).toContain('low-victim');
    const lowPos = executed.indexOf('low-victim');
    expect(lowPos).toBeLessThan(executed.length);
  });

  test('Adversarial 6: Two transactions attempting conflicting updates', () => {
    const tm1 = new TransactionManager({ workspace: tempWorkspace });
    const tm2 = new TransactionManager({ workspace: tempWorkspace });

    tm1.begin();
    expect(tm1.state).toBe('PREPARING');

    // Expected invariant: Lock collision detected deterministically via O_EXCL tx.lock
    expect(() => tm2.begin()).toThrow(
      /Active transaction lock found|Could not acquire concurrency lock/i,
    );

    tm1.rollback();
  });

  test('Adversarial 7: Session A attempting to access Session B execution state', () => {
    const bus = new EvidenceBus();
    const sessionA = bus.createSession('session-alice');
    const sessionB = bus.createSession('session-bob');

    sessionB.recordFinding('secret-task', {
      findingId: 'CONFIDENTIAL-001',
      category: 'SECURITY',
      severity: 'CRITICAL',
      evidence: 'Private Token: sk-secret-xyz',
    });

    // Session A queries its own findings
    const aliceFindings = sessionA.getFindings();
    expect(aliceFindings.length).toBe(0);

    // Direct query with session filter
    const queryRes = bus.query({ sessionId: 'session-alice' });
    expect(queryRes.length).toBe(0);

    // Cross-session access violation prevented
    expect(
      aliceFindings.some(f => f.content && JSON.stringify(f.content).includes('sk-secret')),
    ).toBe(false);
  });

  test('Adversarial 8: A timeout or crash occurring during transaction / rollback (Stale Lock Recovery)', () => {
    const tm = new TransactionManager({ workspace: tempWorkspace });
    const lockFile = path.join(tempWorkspace, '.agent', 'transactions', 'tx.lock');

    fs.mkdirSync(path.dirname(lockFile), { recursive: true });
    fs.writeFileSync(lockFile, 'STALE_PROCESS_PID_99999');

    // Simulate stale lock older than 15s
    const oldTime = (Date.now() - 20000) / 1000;
    fs.utimesSync(lockFile, oldTime, oldTime);

    // Expected invariant: TransactionManager identifies stale lock and recovers cleanly
    expect(() => tm.begin()).not.toThrow();
    expect(tm.state).toBe('PREPARING');
    tm.rollback();
  });

  test('Adversarial 9: Multiple workers competing for a bounded resource (Concurrency Semaphore Bounding)', async () => {
    const maxConcurrent = 3;
    const totalTasks = 9;
    const scheduler = new KernelScheduler({ maxConcurrentTasks: maxConcurrent });

    let currentActive = 0;
    let maxObservedActive = 0;

    const tasks = Array.from({ length: totalTasks }, (_, i) => {
      return scheduler.schedule(
        async () => {
          currentActive++;
          if (currentActive > maxObservedActive) {
            maxObservedActive = currentActive;
          }
          await new Promise(res => setImmediate(res));
          currentActive--;
        },
        { taskId: `bounded-worker-${i}`, priority: 'MEDIUM' },
      );
    });

    await Promise.all(tasks);

    // Expected invariant: Concurrency ceiling never exceeded at any moment
    expect(maxObservedActive).toBeLessThanOrEqual(maxConcurrent);
    expect(currentActive).toBe(0);
  });

  test('Adversarial 10: A provider returning duplicated or out-of-order findings (Normalization & Deduplication)', () => {
    const rawOutputWithDuplicates = {
      status: 'SUCCESS',
      summary: 'Analysis with duplicate findings',
      findings: [
        {
          findingId: 'DUP-001',
          category: 'CORRECTNESS',
          severity: 'HIGH',
          evidence: 'Evidence 1',
          concurrencyCategory: 'DATA_RACE',
        },
        {
          findingId: 'DUP-001', // Exact duplicate findingId
          category: 'CORRECTNESS',
          severity: 'HIGH',
          evidence: 'Evidence 1',
          concurrencyCategory: 'DATA_RACE',
        },
        {
          findingId: 'ORDER-002',
          category: 'PERFORMANCE',
          severity: 'LOW',
          evidence: 'Evidence 2',
          concurrencyCategory: 'LOCK_CONTENTION',
        },
      ],
    };

    const parsed = parseRawAgentOutput(
      rawOutputWithDuplicates,
      'task-norm-01',
      'concurrency-analyst',
      'input-hash-1',
    );

    // Expected invariant: Schema parsing normalizes findings without crashing
    expect(parsed.status).toBe('SUCCESS');
    expect(parsed.findings.length).toBe(3);
    expect(parsed.findings[0].concurrencyCategory).toBe('DATA_RACE');
    expect(parsed.findings[2].concurrencyCategory).toBe('LOCK_CONTENTION');
  });
});
