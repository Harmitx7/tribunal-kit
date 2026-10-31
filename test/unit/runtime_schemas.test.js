'use strict';

const {
  CANONICAL_STATES,
  FAILURE_CATEGORIES,
  ExecutionRecordSchema,
  CheckpointSchema,
  RetryPolicySchema,
  QuorumPolicySchema,
  RuntimeFindingSchema,
  RuntimeAuditResultSchema,
} = require('../../src/runtime_reliability');

const fixtureData = require('../fixtures/agent_runtime/runtime_dataset_v1.json');

describe('Agent Runtime Reliability Schemas & Contracts', () => {
  test('CANONICAL_STATES contains all 10 standard lifecycle states', () => {
    expect(CANONICAL_STATES.length).toBe(10);
    expect(CANONICAL_STATES).toContain('PENDING');
    expect(CANONICAL_STATES).toContain('RUNNING');
    expect(CANONICAL_STATES).toContain('SUCCEEDED');
    expect(CANONICAL_STATES).toContain('FAILED');
    expect(CANONICAL_STATES).toContain('TIMED_OUT');
    expect(CANONICAL_STATES).toContain('CANCELLED');
    expect(CANONICAL_STATES).toContain('INTERRUPTED');
    expect(CANONICAL_STATES).toContain('PARTIAL');
    expect(CANONICAL_STATES).toContain('RETRYING');
    expect(CANONICAL_STATES).toContain('BLOCKED');
  });

  test('FAILURE_CATEGORIES contains all 14 normalized failure classes', () => {
    expect(FAILURE_CATEGORIES.length).toBe(14);
    expect(FAILURE_CATEGORIES).toContain('TRANSIENT_NETWORK');
    expect(FAILURE_CATEGORIES).toContain('RATE_LIMITED');
    expect(FAILURE_CATEGORIES).toContain('AUTHORIZATION_FAILURE');
    expect(FAILURE_CATEGORIES).toContain('INVALID_INPUT');
    expect(FAILURE_CATEGORIES).toContain('MALFORMED_OUTPUT');
    expect(FAILURE_CATEGORIES).toContain('MODEL_FAILURE');
    expect(FAILURE_CATEGORIES).toContain('TOOL_FAILURE');
    expect(FAILURE_CATEGORIES).toContain('TIMEOUT');
    expect(FAILURE_CATEGORIES).toContain('CANCELLED');
    expect(FAILURE_CATEGORIES).toContain('RESOURCE_EXHAUSTED');
    expect(FAILURE_CATEGORIES).toContain('STATE_INTEGRITY_FAILURE');
    expect(FAILURE_CATEGORIES).toContain('DEPENDENCY_UNAVAILABLE');
    expect(FAILURE_CATEGORIES).toContain('NON_RETRYABLE');
    expect(FAILURE_CATEGORIES).toContain('UNKNOWN');
  });

  test('ExecutionRecordSchema parses valid execution record correctly', () => {
    const record = ExecutionRecordSchema.parse(fixtureData.validExecutionRecord);
    expect(record.id).toBe('exec-task-001');
    expect(record.state).toBe('PENDING');
    expect(record.attempt).toBe(1);
  });

  test('ExecutionRecordSchema rejects invalid state', () => {
    expect(() => {
      ExecutionRecordSchema.parse({
        ...fixtureData.validExecutionRecord,
        state: 'INVALID_STATE',
      });
    }).toThrow();
  });

  test('CheckpointSchema parses valid checkpoint and rejects malformed SHA-256 hash', () => {
    const ckpt = CheckpointSchema.parse(fixtureData.validCheckpoint);
    expect(ckpt.checkpointId).toBe('ckpt_20261030_001');
    expect(ckpt.integrityHash).toMatch(/^[a-f0-9]{64}$/);

    expect(() => {
      CheckpointSchema.parse({
        ...fixtureData.validCheckpoint,
        integrityHash: 'invalid-hash-string',
      });
    }).toThrow(/Integrity hash must be a SHA-256 hex string/);
  });

  test('RetryPolicySchema and QuorumPolicySchema parse valid policies', () => {
    const retryPolicy = RetryPolicySchema.parse(fixtureData.retryPolicyConfig);
    expect(retryPolicy.maxAttempts).toBe(3);
    expect(retryPolicy.backoffFactor).toBe(2.0);

    const quorumPolicy = QuorumPolicySchema.parse(fixtureData.quorumPolicies.strictRequired);
    expect(quorumPolicy.policyType).toBe('ALL_REQUIRED');
    expect(quorumPolicy.requiredAgents).toContain('security-auditor');
  });

  test('RuntimeFindingSchema validates runtime defect findings', () => {
    const finding = RuntimeFindingSchema.parse({
      id: 'finding-001',
      category: 'DEADLOCK_DETECTED',
      severity: 'CRITICAL',
      component: 'AgentOrchestrator',
      title: 'Cyclic wait detected',
      description: 'Agents A and B are deadlocked',
      evidence: 'A -> B -> A',
      remediation: 'Order lock acquisition',
      verdict: 'FAIL',
    });
    expect(finding.category).toBe('DEADLOCK_DETECTED');
    expect(finding.verdict).toBe('FAIL');
  });

  test('RuntimeAuditResultSchema validates aggregated runtime results', () => {
    const result = RuntimeAuditResultSchema.parse({
      status: 'PASS',
      timestamp: new Date().toISOString(),
      summary: 'All 5 tasks executed successfully with quorum',
      totalTasks: 5,
      succeededTasks: 5,
      failedTasks: 0,
      findings: [],
      metrics: {
        totalExecutionTimeMs: 450,
        quorumSatisfied: true,
      },
    });
    expect(result.status).toBe('PASS');
    expect(result.succeededTasks).toBe(5);
  });
});
