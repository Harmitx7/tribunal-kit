'use strict';

/**
 * checkpoint_recovery_engine.js — Durable Checkpoints & Safe Workflow Recovery Engine
 * ==================================================================================
 * Domain: Agent Runtime Reliability & Recovery (agent-runtime-reliability)
 *
 * Responsibilities:
 * 1. Generate tamper-evident workflow checkpoints with SHA-256 cryptographic integrity hashes.
 * 2. Validate checkpoint integrity and schema compatibility before restoration.
 * 3. Reconcile completed idempotent tasks to prevent duplicate execution after restart.
 * 4. Safely resume interrupted workflows from the most recent valid checkpoint.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  CheckpointSchema,
  RuntimeFindingSchema,
  SUPPORTED_SCHEMA_VERSIONS,
} = require('./execution_state_schemas');

/**
 * Computes canonical SHA-256 integrity hash for a checkpoint payload.
 */
function computeCheckpointHash(data) {
  const normalized = {
    checkpointId: data.checkpointId,
    executionId: data.executionId,
    stateRevision: data.stateRevision,
    schemaVersion: data.schemaVersion,
    codeRevision: data.codeRevision,
    completedTasks: [...(data.completedTasks || [])].sort(),
    pendingTasks: [...(data.pendingTasks || [])].sort(),
    idempotencyKeys: [...(data.idempotencyKeys || [])].sort(),
    timestamp: data.timestamp,
  };
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

class CheckpointRecoveryEngine {
  constructor(options = {}) {
    this.storageDir = options.storageDir || path.resolve(process.cwd(), '.agent/checkpoints');
    this.currentCodeRevision = options.codeRevision || '9.3.0';
  }

  /**
   * Create a new cryptographically hashed checkpoint.
   */
  createCheckpoint(data) {
    const timestamp = new Date().toISOString();
    const checkpointId = data.checkpointId || `ckpt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const raw = {
      checkpointId,
      executionId: data.executionId,
      stateRevision: data.stateRevision || 1,
      schemaVersion: data.schemaVersion || '1.0.0',
      codeRevision: data.codeRevision || this.currentCodeRevision,
      completedTasks: data.completedTasks || [],
      pendingTasks: data.pendingTasks || [],
      partialResults: data.partialResults || {},
      idempotencyKeys: data.idempotencyKeys || [],
      timestamp,
    };

    const integrityHash = computeCheckpointHash(raw);
    const checkpoint = CheckpointSchema.parse({ ...raw, integrityHash });

    return checkpoint;
  }

  /**
   * Verify checkpoint integrity, hash correctness, and schema compatibility.
   */
  verifyCheckpoint(checkpointData) {
    const findings = [];

    // 1. Schema conformity check
    let validated;
    try {
      validated = CheckpointSchema.parse(checkpointData);
    } catch (err) {
      findings.push(
        RuntimeFindingSchema.parse({
          id: `ckpt-schema-fail-${Date.now()}`,
          category: 'CORRUPT_CHECKPOINT',
          severity: 'CRITICAL',
          component: 'CheckpointRecoveryEngine',
          title: 'Malformed checkpoint schema',
          description: `Checkpoint failed Zod schema validation: ${err.message}`,
          evidence: `error: ${err.message}`,
          remediation: 'Do not restore from malformed checkpoints; restart workflow cleanly.',
          verdict: 'FAIL',
        })
      );
      return { isValid: false, findingsCount: findings.length, findings };
    }

    // 2. Hash integrity check
    const expectedHash = computeCheckpointHash(validated);
    const matches = crypto.timingSafeEqual(
      Buffer.from(validated.integrityHash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );

    if (!matches) {
      findings.push(
        RuntimeFindingSchema.parse({
          id: `ckpt-tamper-${validated.checkpointId}`,
          category: 'CORRUPT_CHECKPOINT',
          severity: 'CRITICAL',
          component: 'CheckpointRecoveryEngine',
          title: 'Checkpoint integrity hash mismatch',
          description: 'Checkpoint data has been tampered with or corrupted on disk.',
          evidence: `declaredHash: ${validated.integrityHash}, computedHash: ${expectedHash}`,
          remediation: 'Reject corrupt checkpoint and investigate disk or storage tampering.',
          verdict: 'FAIL',
        })
      );
      return { isValid: false, findingsCount: findings.length, findings };
    }

    // 3. Schema version compatibility
    if (!SUPPORTED_SCHEMA_VERSIONS.includes(validated.schemaVersion)) {
      findings.push(
        RuntimeFindingSchema.parse({
          id: `ckpt-version-${validated.checkpointId}`,
          category: 'CORRUPT_CHECKPOINT',
          severity: 'HIGH',
          component: 'CheckpointRecoveryEngine',
          title: `Unsupported checkpoint schema version: ${validated.schemaVersion}`,
          description: `Checkpoint version '${validated.schemaVersion}' is not supported by current runtime.`,
          evidence: `schemaVersion: ${validated.schemaVersion}`,
          remediation: 'Migrate checkpoint schema or upgrade Tribunal-Kit runtime.',
          verdict: 'FAIL',
        })
      );
      return { isValid: false, findingsCount: findings.length, findings };
    }

    return {
      isValid: findings.length === 0,
      checkpoint: validated,
      findingsCount: findings.length,
      findings,
    };
  }

  /**
   * Plan workflow resumption from a verified checkpoint.
   */
  planRecovery(checkpointData) {
    const verification = this.verifyCheckpoint(checkpointData);
    if (!verification.isValid) {
      throw new Error(
        `Cannot recover from invalid checkpoint: ${verification.findings[0]?.description || 'Integrity failure'}`
      );
    }

    const ckpt = verification.checkpoint;
    const completedSet = new Set(ckpt.completedTasks);
    const tasksToResume = ckpt.pendingTasks.filter((taskId) => !completedSet.has(taskId));

    return {
      canResume: true,
      executionId: ckpt.executionId,
      stateRevision: ckpt.stateRevision + 1,
      completedCount: ckpt.completedTasks.length,
      resumedTasksCount: tasksToResume.length,
      tasksToResume,
      partialResults: ckpt.partialResults,
      processedIdempotencyKeys: new Set(ckpt.idempotencyKeys),
    };
  }

  /**
   * Persist checkpoint to disk atomically.
   */
  saveCheckpoint(checkpoint) {
    fs.mkdirSync(this.storageDir, { recursive: true });
    const filePath = path.join(this.storageDir, `${checkpoint.checkpointId}.json`);
    const tempPath = `${filePath}.tmp.${Date.now()}`;

    fs.writeFileSync(tempPath, JSON.stringify(checkpoint, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);

    return filePath;
  }

  /**
   * Load checkpoint from disk.
   */
  loadCheckpoint(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Checkpoint file does not exist: ${filePath}`);
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  }
}

module.exports = {
  computeCheckpointHash,
  CheckpointRecoveryEngine,
};
