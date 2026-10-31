'use strict';

const fs = require('fs');
const path = require('path');
const {
  StateMachineEngine,
  CancellationContext,
  RetryAndTimeoutEngine,
  QuorumAndAggregationEngine,
  ResourceGuardEngine,
  CheckpointRecoveryEngine,
  FailureClassifier,
  FaultInjectionEngine,
  executeResilientWorkflow,
} = require('../../src/runtime_reliability');

describe('Agent Runtime Reliability Canonical Skills Behavioral Verification', () => {
  const skillsDir = path.resolve(__dirname, '../../.agent/skills');

  const EXPECTED_SKILLS = [
    'agent-runtime-reliability-auditor',
    'agent-timeout-and-cancellation-auditor',
    'agent-retry-and-idempotency-auditor',
    'agent-state-machine-integrity-auditor',
    'multi-agent-partial-failure-auditor',
    'agent-runtime-resource-guard-auditor',
    'agent-recovery-and-resume-auditor',
    'agent-observability-and-diagnostics-auditor',
    'agent-fault-injection-engineer',
    'agent-fallback-and-degradation-auditor',
    'agent-runtime-deadlock-and-liveness-auditor',
    'agent-runtime-regression-auditor',
  ];

  test('All 12 canonical skills exist in .agent/skills/ with valid SKILL.md frontmatter', () => {
    for (const skillName of EXPECTED_SKILLS) {
      const skillPath = path.join(skillsDir, skillName, 'SKILL.md');
      expect(fs.existsSync(skillPath)).toBe(true);

      const content = fs.readFileSync(skillPath, 'utf8');
      expect(content).toContain(`name: ${skillName}`);
      expect(content).toContain('version: 1.0.0');
      expect(content).toContain('Mandatory Pre-Flight Context Inspection');
      expect(content).toContain('Activation Boundaries');
      expect(content).toContain('Multi-Pass Execution Protocol');
      expect(content).toContain('Verification Command');
    }
  });

  test('Skill 1: agent-runtime-reliability-auditor behavioral execution', () => {
    const sm = new StateMachineEngine({
      id: 'exec-skill-1',
      agentId: 'reliability-auditor',
      taskType: 'lifecycle_audit',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    sm.start();
    sm.complete();
    expect(sm.getState()).toBe('SUCCEEDED');
  });

  test('Skill 2: agent-timeout-and-cancellation-auditor behavioral execution', () => {
    const ctx = new CancellationContext();
    const child = ctx.createChild();
    ctx.cancel('Root timeout', 'TIMEOUT');
    expect(child.isCancelled()).toBe(true);
    expect(child.getCategory()).toBe('TIMEOUT');
  });

  test('Skill 3: agent-retry-and-idempotency-auditor behavioral execution', async () => {
    const engine = new RetryAndTimeoutEngine();
    const res = await engine.execute(async () => 'OK', { idempotencyKey: 'key-1' });
    expect(res.fromCache).toBe(false);
    const cached = await engine.execute(async () => 'OK', { idempotencyKey: 'key-1' });
    expect(cached.fromCache).toBe(true);
  });

  test('Skill 4: agent-state-machine-integrity-auditor behavioral execution', () => {
    const sm = new StateMachineEngine({
      id: 'exec-fsm-test',
      agentId: 'fsm-auditor',
      taskType: 'transition_check',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    sm.start();
    expect(sm.getState()).toBe('RUNNING');
    expect(() => sm._transition('PENDING')).toThrow();
  });

  test('Skill 5: multi-agent-partial-failure-auditor behavioral execution', () => {
    const quorum = new QuorumAndAggregationEngine({
      requiredAgents: ['security'],
      optionalAgents: ['style'],
      minSuccessThreshold: 0.5,
    });
    const evalRes = quorum.evaluateResults([
      { agentId: 'security', status: 'SUCCEEDED' },
      { agentId: 'style', status: 'FAILED' },
    ]);
    expect(evalRes.status).toBe('SUCCEEDED');
  });

  test('Skill 6: agent-runtime-resource-guard-auditor behavioral execution', async () => {
    const guard = new ResourceGuardEngine({ maxConcurrency: 1 });
    await guard.acquireSlot('t1');
    expect(guard.activeTaskCount).toBe(1);
    guard.releaseSlot();
    expect(guard.activeTaskCount).toBe(0);
  });

  test('Skill 7: agent-recovery-and-resume-auditor behavioral execution', () => {
    const recovery = new CheckpointRecoveryEngine();
    const ckpt = recovery.createCheckpoint({
      executionId: 'exec-rec',
      completedTasks: ['t1'],
      pendingTasks: ['t2'],
    });
    const plan = recovery.planRecovery(ckpt);
    expect(plan.canResume).toBe(true);
    expect(plan.tasksToResume).toEqual(['t2']);
  });

  test('Skill 8: agent-observability-and-diagnostics-auditor behavioral execution', () => {
    const err = new Error('ECONNRESET');
    err.code = 'ECONNRESET';
    const category = FailureClassifier.classify(err);
    expect(category).toBe('TRANSIENT_NETWORK');
  });

  test('Skill 9: agent-fault-injection-engineer behavioral execution', async () => {
    const chaos = new FaultInjectionEngine();
    chaos.addRule('testOp', { type: 'TIMEOUT' });
    await expect(chaos.intercept('testOp', async () => 'OK')).rejects.toThrow('Injected timeout');
  });

  test('Skill 10: agent-fallback-and-degradation-auditor behavioral execution', () => {
    const err500 = new Error('Internal Server Error from Provider');
    err500.status = 500;
    expect(FailureClassifier.isRetryable('MODEL_FAILURE', true)).toBe(true);
  });

  test('Skill 11: agent-runtime-deadlock-and-liveness-auditor behavioral execution', () => {
    const guard = new ResourceGuardEngine();
    guard.registerWaitDependency('agent-1', 'agent-2');
    guard.registerWaitDependency('agent-2', 'agent-1');
    const dl = guard.detectDeadlocks();
    expect(dl.hasDeadlock).toBe(true);
  });

  test('Skill 12: agent-runtime-regression-auditor behavioral execution', async () => {
    const res = await executeResilientWorkflow([
      { id: 'task-reg-1', fn: async () => 'done', isRequired: true },
    ]);
    expect(res.status).toBe('PASS');
    expect(res.succeededTasks).toBe(1);
  });
});
