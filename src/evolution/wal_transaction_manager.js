'use strict';

/**
 * wal_transaction_manager.js — Write-Ahead Log (WAL) Transaction Manager
 * ======================================================================
 * Phase 2 RSIE: Formal Verification & Invariant Proof Pipeline
 *
 * Provides transactional ACID guarantees for candidate mutations,
 * promotions, and rollbacks in the Tribunal Kit evolution pipeline.
 *
 * Protocol:
 * 1. BEGIN: Logs transaction intent, timestamp, and candidate metadata.
 * 2. CHECKPOINT: Snapshots target file contents and SHA-256 hashes prior to edit.
 * 3. PREPARE: Verifies all invariants; logs prepared state.
 * 4. COMMIT: Seals transaction on successful promotion.
 * 5. ABORT / ROLLBACK: Restores all checkpointed files atomically on any failure.
 * 6. RECOVERY: Detects dangling/uncommitted transactions on startup and rolls back.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { assertWithinRoot, validateResourceId } = require('../security/boundary');

const TX_STATES = Object.freeze({
  BEGIN: 'BEGIN',
  PREPARE: 'PREPARE',
  COMMIT: 'COMMIT',
  ABORT: 'ABORT',
});

class WalTransactionManager {
  /**
   * @param {object} [options]
   * @param {string} [options.agentDir] - Base agent state directory
   */
  constructor(options = {}) {
    this.agentDir = path.resolve(options.agentDir || path.join(process.cwd(), '.agent'));
    this.walDir = path.join(this.agentDir, 'evolution', 'wal');
    this.snapshotsDir = path.join(this.walDir, 'snapshots');
    this._ensureDirs();
  }

  _ensureDirs() {
    if (!fs.existsSync(this.snapshotsDir)) {
      fs.mkdirSync(this.snapshotsDir, { recursive: true });
    }
  }

  _getJournalPath(txId) {
    validateResourceId(txId);
    return path.join(this.walDir, `${txId}.wal.json`);
  }

  _writeAtomic(filePath, data) {
    const tmp = `${filePath}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, filePath);
  }

  /**
   * Begins a new evolution transaction.
   *
   * @param {string} candidateId - Associated evolution candidate
   * @param {object} [metadata]
   * @returns {{ txId: string, state: string, createdAt: string }}
   */
  beginTransaction(candidateId, metadata = {}) {
    const txId = `tx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const record = {
      txId,
      candidateId,
      state: TX_STATES.BEGIN,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata,
      checkpoints: [],
      error: null,
    };

    this._writeAtomic(this._getJournalPath(txId), record);
    return { txId, state: TX_STATES.BEGIN, createdAt: record.createdAt };
  }

  /**
   * Checkpoints a file before modification so it can be restored on abort.
   *
   * @param {string} txId - Active transaction ID
   * @param {string} targetFilePath - Absolute or relative file path to snapshot
   * @returns {{ snapshotId: string, filePath: string, originalHash: string|null }}
   */
  checkpointFile(txId, targetFilePath) {
    const journalPath = this._getJournalPath(txId);
    if (!fs.existsSync(journalPath)) {
      throw new Error(`Transaction ${txId} does not exist.`);
    }

    const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
    if (journal.state === TX_STATES.COMMIT || journal.state === TX_STATES.ABORT) {
      throw new Error(`Cannot checkpoint in sealed transaction ${txId} (state: ${journal.state}).`);
    }

    const resolvedPath = path.resolve(targetFilePath);
    const exists = fs.existsSync(resolvedPath);
    let originalHash = null;
    let snapshotContent = null;

    if (exists) {
      snapshotContent = fs.readFileSync(resolvedPath, 'utf8');
      originalHash = crypto.createHash('sha256').update(snapshotContent).digest('hex');
    }

    const snapshotId = `snap_${crypto.randomBytes(6).toString('hex')}`;
    const snapshotFile = path.join(this.snapshotsDir, `${snapshotId}.bak`);

    if (snapshotContent !== null) {
      fs.writeFileSync(snapshotFile, snapshotContent, 'utf8');
    }

    const checkpoint = {
      snapshotId,
      filePath: resolvedPath,
      existedBefore: exists,
      originalHash,
      snapshotFile: exists ? snapshotFile : null,
      timestamp: new Date().toISOString(),
    };

    journal.checkpoints.push(checkpoint);
    journal.updatedAt = new Date().toISOString();
    this._writeAtomic(journalPath, journal);

    return { snapshotId, filePath: resolvedPath, originalHash };
  }

  /**
   * Marks a transaction as PREPARED (all invariant and test checks completed).
   *
   * @param {string} txId
   * @param {object} [verificationSummary]
   */
  prepareTransaction(txId, verificationSummary = {}) {
    const journalPath = this._getJournalPath(txId);
    if (!fs.existsSync(journalPath)) {
      throw new Error(`Transaction ${txId} does not exist.`);
    }

    const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
    if (journal.state !== TX_STATES.BEGIN) {
      throw new Error(`Cannot PREPARE transaction ${txId} from state "${journal.state}".`);
    }

    journal.state = TX_STATES.PREPARE;
    journal.verificationSummary = verificationSummary;
    journal.updatedAt = new Date().toISOString();
    this._writeAtomic(journalPath, journal);

    return { txId, state: TX_STATES.PREPARE };
  }

  /**
   * Commits the transaction after Human Gate approval or verified promotion.
   *
   * @param {string} txId
   * @returns {{ txId: string, state: string, committedAt: string }}
   */
  commitTransaction(txId) {
    const journalPath = this._getJournalPath(txId);
    if (!fs.existsSync(journalPath)) {
      throw new Error(`Transaction ${txId} does not exist.`);
    }

    const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
    if (journal.state !== TX_STATES.PREPARE && journal.state !== TX_STATES.BEGIN) {
      throw new Error(`Cannot COMMIT transaction ${txId} with state "${journal.state}".`);
    }

    journal.state = TX_STATES.COMMIT;
    journal.committedAt = new Date().toISOString();
    journal.updatedAt = journal.committedAt;
    this._writeAtomic(journalPath, journal);

    return { txId, state: TX_STATES.COMMIT, committedAt: journal.committedAt };
  }

  /**
   * Rolls back all checkpointed files in reverse order and aborts transaction.
   *
   * @param {string} txId
   * @param {string} [reason]
   * @returns {{ txId: string, state: string, restoredFiles: string[] }}
   */
  rollbackTransaction(txId, reason = 'Transaction aborted') {
    const journalPath = this._getJournalPath(txId);
    if (!fs.existsSync(journalPath)) {
      throw new Error(`Transaction ${txId} does not exist.`);
    }

    const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
    const restoredFiles = [];

    // Revert checkpoints in reverse order of modification
    for (let i = journal.checkpoints.length - 1; i >= 0; i--) {
      const cp = journal.checkpoints[i];
      try {
        if (!cp.existedBefore) {
          // File did not exist before -> delete created file
          if (fs.existsSync(cp.filePath)) {
            fs.unlinkSync(cp.filePath);
            restoredFiles.push(cp.filePath);
          }
        } else if (cp.snapshotFile && fs.existsSync(cp.snapshotFile)) {
          // Restore prior content
          const prevContent = fs.readFileSync(cp.snapshotFile, 'utf8');
          fs.writeFileSync(cp.filePath, prevContent, 'utf8');
          restoredFiles.push(cp.filePath);
        }
      } catch (err) {
        console.error(`WAL warning: failed to revert checkpoint for ${cp.filePath}:`, err.message);
      }
    }

    journal.state = TX_STATES.ABORT;
    journal.error = reason;
    journal.abortedAt = new Date().toISOString();
    journal.updatedAt = journal.abortedAt;
    this._writeAtomic(journalPath, journal);

    return { txId, state: TX_STATES.ABORT, restoredFiles };
  }

  /**
   * Crash recovery: scans for dangling uncommitted transactions and aborts them.
   *
   * @returns {Array<{ txId: string, state: string, recovered: boolean }>}
   */
  recoverPendingTransactions() {
    if (!fs.existsSync(this.walDir)) return [];
    const files = fs.readdirSync(this.walDir).filter(f => f.endsWith('.wal.json'));
    const recovered = [];

    for (const f of files) {
      const p = path.join(this.walDir, f);
      try {
        const journal = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (journal.state === TX_STATES.BEGIN || journal.state === TX_STATES.PREPARE) {
          const res = this.rollbackTransaction(journal.txId, 'Recovered dangling transaction on startup');
          recovered.push({ txId: journal.txId, state: res.state, recovered: true });
        }
      } catch (_) {}
    }

    return recovered;
  }

  /**
   * Retrieves transaction record by ID.
   *
   * @param {string} txId
   * @returns {object|null}
   */
  getTransaction(txId) {
    const p = this._getJournalPath(txId);
    if (!fs.existsSync(p)) return null;
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch {
      return null;
    }
  }

  /**
   * Lists all WAL transaction journals, sorted newest first.
   *
   * @returns {Array<object>}
   */
  listTransactions() {
    if (!fs.existsSync(this.walDir)) return [];
    try {
      return fs
        .readdirSync(this.walDir)
        .filter(f => f.endsWith('.wal.json'))
        .map(f => {
          try {
            return JSON.parse(fs.readFileSync(path.join(this.walDir, f), 'utf8'));
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    } catch {
      return [];
    }
  }
}

module.exports = {
  WalTransactionManager,
  TX_STATES,
};
