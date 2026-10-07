'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Phase 2B: Transaction Manager
 * Implements a production-grade multi-file transaction engine (WAL) for Tribunal Kit.
 * Lifecycle: PREPARE -> VALIDATE -> COMMIT / ROLLBACK
 */
class TransactionManager {
  constructor(options = {}) {
    this.workspace = options.workspace || process.cwd();
    this.agentDir = options.agentDir || path.join(this.workspace, '.agent');
    this.txDir = path.join(this.agentDir, 'transactions');
    this.lockPath = path.join(this.txDir, 'tx.lock');
    this.walPath = path.join(this.txDir, 'wal.json');
    this.undoDir = path.join(this.txDir, 'undo');

    this.activeTxId = null;
    this.operations = []; // Array of { action: 'WRITE'|'DELETE', path, data, encoding }
    this.state = 'IDLE';
  }

  _isLocked() {
    return fs.existsSync(this.lockPath);
  }

  _isStaleLock() {
    try {
      const stats = fs.statSync(this.lockPath);
      return Date.now() - stats.mtimeMs > 15000; // 15 seconds stale
    } catch (e) {
      return false;
    }
  }

  _applyUndoLog() {
    if (fs.existsSync(this.undoDir)) {
      const mapPath = path.join(this.undoDir, 'mapping.json');
      if (fs.existsSync(mapPath)) {
        const mapping = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
        for (const [realPath, backupName] of Object.entries(mapping)) {
          const backupPath = path.join(this.undoDir, backupName);
          if (backupName === '__DELETED__') {
            if (fs.existsSync(realPath)) fs.unlinkSync(realPath);
          } else if (fs.existsSync(backupPath)) {
            fs.copyFileSync(backupPath, realPath);
          }
        }
      }
    }
    // Clean up
    fs.rmSync(this.undoDir, { recursive: true, force: true });
    if (fs.existsSync(this.walPath)) fs.unlinkSync(this.walPath);
  }

  recover() {
    if (this._isLocked()) {
      if (this._isStaleLock()) {
        // Stale lock detected, try recovering
        if (fs.existsSync(this.walPath)) {
          let wal;
          try {
            wal = JSON.parse(fs.readFileSync(this.walPath, 'utf8'));
          } catch (e) {
            wal = null;
          }
          if (wal && wal.state !== 'COMMITTED') {
            this._applyUndoLog();
          }
        }
        this._releaseLock();
      } else {
        throw new Error(
          'Active transaction lock found. Cannot safely recover while another process holds the lock.',
        );
      }
    }
  }

  begin() {
    if (this.state !== 'IDLE' && this.state !== 'ROLLED_BACK') {
      throw new Error('Transaction already active in memory.');
    }
    this.recover();

    if (!fs.existsSync(this.txDir)) fs.mkdirSync(this.txDir, { recursive: true });

    const maxRetries = 30;
    let acquired = false;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const fd = fs.openSync(this.lockPath, 'wx');
        fs.closeSync(fd);
        acquired = true;
        break;
      } catch (err) {
        if (err.code !== 'EEXIST') throw err;
        try {
          const waitBuf = new Int32Array(new SharedArrayBuffer(4));
          Atomics.wait(waitBuf, 0, 0, 30);
        } catch (e) {} // fallback if Atomics unavailable or blocked
      }
    }

    if (!acquired) {
      if (this._isStaleLock()) {
        this.recover();
        const fd = fs.openSync(this.lockPath, 'wx');
        fs.closeSync(fd);
      } else {
        throw new Error('Could not acquire concurrency lock for transaction.');
      }
    }

    this.activeTxId = `TX-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    this.operations = [];
    this.state = 'PREPARING';
  }

  prepareWrite(targetPath, data, encoding = 'utf8') {
    if (this.state !== 'PREPARING')
      throw new Error('Can only prepare operations in PREPARING state.');
    const resolvedPath = path.resolve(this.workspace, targetPath);
    if (!resolvedPath.startsWith(path.resolve(this.workspace))) {
      throw new Error('Path security violation: Cannot modify files outside workspace.');
    }
    this.operations.push({ action: 'WRITE', path: resolvedPath, data, encoding });
  }

  prepareDelete(targetPath) {
    if (this.state !== 'PREPARING')
      throw new Error('Can only prepare operations in PREPARING state.');
    const resolvedPath = path.resolve(this.workspace, targetPath);
    if (!resolvedPath.startsWith(path.resolve(this.workspace))) {
      throw new Error('Path security violation: Cannot modify files outside workspace.');
    }
    this.operations.push({ action: 'DELETE', path: resolvedPath });
  }

  validate() {
    if (this.state !== 'PREPARING') throw new Error('Can only validate from PREPARING state.');
    this.state = 'VALIDATING';

    if (fs.existsSync(this.undoDir)) fs.rmSync(this.undoDir, { recursive: true, force: true });
    fs.mkdirSync(this.undoDir, { recursive: true });

    const mapping = {};
    for (let i = 0; i < this.operations.length; i++) {
      const op = this.operations[i];
      if (fs.existsSync(op.path)) {
        const backupName = `backup_${i}_${path.basename(op.path)}`;
        const backupPath = path.join(this.undoDir, backupName);
        fs.copyFileSync(op.path, backupPath);
        mapping[op.path] = backupName;
      } else {
        mapping[op.path] = '__DELETED__';
      }
    }

    fs.writeFileSync(
      path.join(this.undoDir, 'mapping.json'),
      JSON.stringify(mapping, null, 2),
      'utf8',
    );

    const wal = {
      id: this.activeTxId,
      state: 'VALIDATED',
      timestamp: new Date().toISOString(),
      operations: this.operations.map(op => ({ action: op.action, path: op.path })),
    };
    fs.writeFileSync(this.walPath, JSON.stringify(wal, null, 2), 'utf8');
  }

  commit() {
    if (this.state !== 'VALIDATING') throw new Error('Must validate before committing.');
    this.state = 'COMMITTING';

    try {
      for (const op of this.operations) {
        if (op.action === 'WRITE') {
          const dir = path.dirname(op.path);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(op.path, op.data, op.encoding);
        } else if (op.action === 'DELETE') {
          if (fs.existsSync(op.path)) {
            fs.unlinkSync(op.path);
          }
        }
      }

      const wal = JSON.parse(fs.readFileSync(this.walPath, 'utf8'));
      wal.state = 'COMMITTED';
      fs.writeFileSync(this.walPath, JSON.stringify(wal, null, 2), 'utf8');

      fs.rmSync(this.undoDir, { recursive: true, force: true });
      fs.unlinkSync(this.walPath);

      this.state = 'IDLE';
      this.activeTxId = null;
      this.operations = [];
      this._releaseLock();
    } catch (err) {
      this.rollback();
      throw new Error(`Transaction failed during commit and was rolled back: ${err.message}`);
    }
  }

  rollback() {
    if (this.state === 'IDLE' || this.state === 'ROLLED_BACK') return;
    this.state = 'ROLLING_BACK';

    try {
      this._applyUndoLog();
    } catch (e) {
      console.error(`CRITICAL: Rollback failed for TX ${this.activeTxId}`, e);
    }

    this.state = 'ROLLED_BACK';
    this.activeTxId = null;
    this.operations = [];
    this._releaseLock();
  }

  _releaseLock() {
    try {
      if (fs.existsSync(this.lockPath)) {
        fs.unlinkSync(this.lockPath);
      }
    } catch (_) {}
  }
}

module.exports = TransactionManager;
