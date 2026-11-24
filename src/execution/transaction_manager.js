'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { assertWithinRoot } = require('../security/boundary');

/**
 * Validates that no ancestor directory segment between workspace root and target is a symlink.
 * @param {string} workspaceRoot
 * @param {string} targetPath
 */
function assertNoSymlinkAncestors(workspaceRoot, targetPath) {
  const canonicalRoot = path.resolve(workspaceRoot);
  const resolvedTarget = path.resolve(targetPath);
  const rel = path.relative(canonicalRoot, resolvedTarget);

  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(
      `Security Violation: Target "${targetPath}" escapes workspace root "${workspaceRoot}".`,
    );
  }

  const parts = rel.split(path.sep);
  let curr = canonicalRoot;

  for (let i = 0; i < parts.length - 1; i++) {
    curr = path.join(curr, parts[i]);
    if (fs.existsSync(curr)) {
      const st = fs.lstatSync(curr);
      if (st.isSymbolicLink()) {
        throw new Error(
          `Security Violation: Symlink directory traversal detected at "${parts[i]}". Symlink parent directories are strictly prohibited.`,
        );
      }
    }
  }
}

/**
 * Atomically writes and fsyncs JSON data to physical storage for durable WAL records.
 * @param {string} filePath
 * @param {any} data
 */
function writeAndSyncJson(filePath, data) {
  const json = JSON.stringify(data, null, 2);
  const fd = fs.openSync(
    filePath,
    fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC,
    0o666,
  );
  try {
    const buf = Buffer.from(json, 'utf8');
    fs.writeSync(fd, buf, 0, buf.length, 0);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

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
    } catch (_e) {
      return false;
    }
  }

  _applyUndoLog() {
    if (fs.existsSync(this.undoDir)) {
      const mapPath = path.join(this.undoDir, 'mapping.json');
      if (fs.existsSync(mapPath)) {
        const mapping = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
        for (const [realPath, backupName] of Object.entries(mapping)) {
          assertWithinRoot(this.workspace, realPath, { checkSymlinks: false });
          assertNoSymlinkAncestors(this.workspace, realPath);
          if (fs.lstatSync(realPath, { throwIfNoEntry: false })?.isSymbolicLink()) {
            continue;
          }
          if (backupName === '__DELETED__') {
            if (fs.existsSync(realPath)) fs.unlinkSync(realPath);
          } else {
            const backupPath = path.join(this.undoDir, backupName);
            assertWithinRoot(this.undoDir, backupPath);
            if (fs.existsSync(backupPath)) {
              fs.copyFileSync(backupPath, realPath);
            }
          }
        }
      }
    }
    // Clean up
    fs.rmSync(this.undoDir, { recursive: true, force: true });
    if (fs.existsSync(this.walPath)) fs.unlinkSync(this.walPath);
  }

  recover(options = {}) {
    const force = Boolean(options && options.force);
    if (this._isLocked()) {
      if (force || this._isStaleLock()) {
        // Stale lock detected, try recovering
        if (fs.existsSync(this.walPath)) {
          let wal;
          try {
            wal = JSON.parse(fs.readFileSync(this.walPath, 'utf8'));
          } catch (_e) {
            wal = null;
          }
          if (!wal || wal.state !== 'COMMITTED') {
            this._applyUndoLog();
          } else {
            // Transaction committed before crash; clean up undo and wal
            if (fs.existsSync(this.undoDir))
              fs.rmSync(this.undoDir, { recursive: true, force: true });
            if (fs.existsSync(this.walPath)) fs.unlinkSync(this.walPath);
          }
        } else if (fs.existsSync(this.undoDir)) {
          this._applyUndoLog();
        }
        this._releaseLock();
      } else {
        throw new Error(
          'Active transaction lock found. Cannot safely recover while another process holds the lock.',
        );
      }
    } else {
      // No active lock, but leftover WAL or undo directory exists (crash during un-locked cleanup or orphan recovery)
      if (fs.existsSync(this.walPath) || fs.existsSync(this.undoDir)) {
        let wal = null;
        if (fs.existsSync(this.walPath)) {
          try {
            wal = JSON.parse(fs.readFileSync(this.walPath, 'utf8'));
          } catch (_) {
            wal = null;
          }
        }
        if (!wal || wal.state !== 'COMMITTED') {
          this._applyUndoLog();
        } else {
          if (fs.existsSync(this.undoDir))
            fs.rmSync(this.undoDir, { recursive: true, force: true });
          if (fs.existsSync(this.walPath)) fs.unlinkSync(this.walPath);
        }
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
        } catch (_e) {} // fallback if Atomics unavailable or blocked
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
    const resolvedPath = assertWithinRoot(this.workspace, targetPath);
    this.operations.push({ action: 'WRITE', path: resolvedPath, data, encoding });
  }

  prepareDelete(targetPath) {
    if (this.state !== 'PREPARING')
      throw new Error('Can only prepare operations in PREPARING state.');
    const resolvedPath = assertWithinRoot(this.workspace, targetPath);
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
      assertWithinRoot(this.workspace, op.path);
      // Retain earliest pre-transaction backup for each unique path
      if (op.path in mapping) {
        continue;
      }
      if (fs.existsSync(op.path)) {
        try {
          const lstat = fs.lstatSync(op.path);
          if (lstat.isSymbolicLink()) {
            const real = fs.realpathSync(op.path);
            assertWithinRoot(this.workspace, real);
          }
        } catch (e) {
          if (
            e.message.includes('Security Violation') ||
            e.message.includes('Path security violation')
          )
            throw e;
        }
        const backupName = `backup_${i}_${path.basename(op.path)}`;
        const backupPath = path.join(this.undoDir, backupName);
        fs.copyFileSync(op.path, backupPath);
        mapping[op.path] = backupName;
      } else {
        mapping[op.path] = '__DELETED__';
      }
    }

    writeAndSyncJson(path.join(this.undoDir, 'mapping.json'), mapping);

    const wal = {
      id: this.activeTxId,
      state: 'VALIDATED',
      timestamp: new Date().toISOString(),
      operations: this.operations.map(op => ({ action: op.action, path: op.path })),
    };
    writeAndSyncJson(this.walPath, wal);
  }

  commit() {
    if (this.state !== 'VALIDATING') throw new Error('Must validate before committing.');
    this.state = 'COMMITTING';

    try {
      for (const op of this.operations) {
        assertWithinRoot(this.workspace, op.path);
        assertNoSymlinkAncestors(this.workspace, op.path);

        if (op.action === 'WRITE') {
          const dir = path.dirname(op.path);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          assertWithinRoot(this.workspace, dir);
          assertNoSymlinkAncestors(this.workspace, dir);

          // Fail-closed against writing through symlinks (TOCTOU protection)
          if (fs.existsSync(op.path)) {
            const lstat = fs.lstatSync(op.path);
            if (lstat.isSymbolicLink()) {
              throw new Error(
                `Security Violation: Symlink write target forbidden: "${op.path}". Direct writes through symlinks are prohibited.`,
              );
            }
          }

          // Handle-bound file open with O_NOFOLLOW
          const openFlags =
            fs.constants.O_WRONLY |
            fs.constants.O_CREAT |
            fs.constants.O_TRUNC |
            (fs.constants.O_NOFOLLOW || 0);

          let fd = null;
          try {
            fd = fs.openSync(op.path, openFlags, 0o666);
            const fstat = fs.fstatSync(fd);
            if (!fstat.isFile()) {
              throw new Error(`Security Violation: Target "${op.path}" is not a regular file.`);
            }

            // Post-open verification: Verify canonical target did not escape workspace root (junction/symlink defense)
            const canonicalTarget =
              typeof fs.realpathSync.native === 'function'
                ? fs.realpathSync.native(op.path)
                : fs.realpathSync(op.path);
            assertWithinRoot(this.workspace, canonicalTarget);

            const buf = Buffer.isBuffer(op.data)
              ? op.data
              : Buffer.from(op.data, op.encoding || 'utf8');
            fs.writeSync(fd, buf, 0, buf.length, 0);
            fs.fsyncSync(fd); // Flush to physical storage for transaction durability
          } finally {
            if (fd !== null) {
              fs.closeSync(fd);
            }
          }
        } else if (op.action === 'DELETE') {
          if (fs.existsSync(op.path)) {
            const lstat = fs.lstatSync(op.path);
            if (lstat.isSymbolicLink()) {
              const real = fs.realpathSync(op.path);
              assertWithinRoot(this.workspace, real);
            }
            fs.unlinkSync(op.path);
          }
        }
      }

      const wal = JSON.parse(fs.readFileSync(this.walPath, 'utf8'));
      wal.state = 'COMMITTED';
      writeAndSyncJson(this.walPath, wal);

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
