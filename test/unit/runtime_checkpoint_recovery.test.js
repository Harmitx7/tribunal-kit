'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  CheckpointRecoveryEngine,
  computeCheckpointHash,
} = require('../../src/runtime_reliability');

const fixtureData = require('../fixtures/agent_runtime/runtime_dataset_v1.json');

describe('Checkpoint Integrity & Safe Recovery Engine', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tribunal-ckpt-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('createCheckpoint generates valid checkpoint with SHA-256 integrity hash', () => {
    const engine = new CheckpointRecoveryEngine({ storageDir: tempDir });
    const ckpt = engine.createCheckpoint({
      executionId: 'exec-100',
      stateRevision: 1,
      completedTasks: ['task-a'],
      pendingTasks: ['task-b', 'task-c'],
      idempotencyKeys: ['key-a'],
    });

    expect(ckpt.checkpointId).toBeDefined();
    expect(ckpt.integrityHash).toMatch(/^[a-f0-9]{64}$/);
    expect(ckpt.completedTasks).toContain('task-a');

    const verification = engine.verifyCheckpoint(ckpt);
    expect(verification.isValid).toBe(true);
    expect(verification.findingsCount).toBe(0);
  });

  test('verifyCheckpoint rejects tampered checkpoint data with CORRUPT_CHECKPOINT', () => {
    const engine = new CheckpointRecoveryEngine({ storageDir: tempDir });
    const verification = engine.verifyCheckpoint(fixtureData.tamperedCheckpoint);

    expect(verification.isValid).toBe(false);
    expect(verification.findings.length).toBeGreaterThan(0);
    expect(verification.findings[0].category).toBe('CORRUPT_CHECKPOINT');
    expect(verification.findings[0].title).toContain('hash mismatch');
  });

  test('planRecovery extracts pending tasks and filters already completed tasks', () => {
    const engine = new CheckpointRecoveryEngine({ storageDir: tempDir });
    const plan = engine.planRecovery(fixtureData.validCheckpoint);

    expect(plan.canResume).toBe(true);
    expect(plan.executionId).toBe('wf-exec-999');
    expect(plan.completedCount).toBe(2);
    expect(plan.resumedTasksCount).toBe(2);
    expect(plan.tasksToResume).toEqual(['task-3', 'task-4']);
    expect(plan.processedIdempotencyKeys.has('key-task-1')).toBe(true);
  });

  test('saveCheckpoint and loadCheckpoint persist and restore atomically', () => {
    const engine = new CheckpointRecoveryEngine({ storageDir: tempDir });
    const ckpt = engine.createCheckpoint({
      executionId: 'exec-atomic',
      completedTasks: ['t1'],
      pendingTasks: ['t2'],
    });

    const savedPath = engine.saveCheckpoint(ckpt);
    expect(fs.existsSync(savedPath)).toBe(true);

    const loaded = engine.loadCheckpoint(savedPath);
    expect(loaded.checkpointId).toBe(ckpt.checkpointId);
    expect(loaded.integrityHash).toBe(ckpt.integrityHash);

    const verifyLoaded = engine.verifyCheckpoint(loaded);
    expect(verifyLoaded.isValid).toBe(true);
  });
});
