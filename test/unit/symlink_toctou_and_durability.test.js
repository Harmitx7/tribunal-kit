'use strict';

/**
 * symlink_toctou_and_durability.test.js — Stage 2.3 Symlink TOCTOU Defense & Crash Durability Tests
 *
 * Verifies:
 * 1. Immediate symlink substitution before write is blocked fail-closed.
 * 2. Parent-directory symlink traversal substitution is blocked fail-closed.
 * 3. Handle-bound writes reject non-regular files and symlink targets.
 * 4. Crash-consistent transaction recovery: an interrupted multi-file commit restores pristine state.
 * 5. Stale lock and orphan uncommitted WAL recovery.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const TransactionManager = require('../../src/execution/transaction_manager');

describe('Stage 2.3: Symlink TOCTOU Security & Transaction Durability', () => {
  let tmpWorkspace;

  beforeEach(() => {
    tmpWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-toctou-durability-'));
    fs.mkdirSync(path.join(tmpWorkspace, 'src', 'modules'), { recursive: true });
    fs.writeFileSync(path.join(tmpWorkspace, 'src', 'modules', 'core.js'), 'ORIGINAL_CORE', 'utf8');
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpWorkspace, { recursive: true, force: true });
    } catch (_) {}
  });

  describe('Symlink TOCTOU & Handle-Bound Write Defenses', () => {
    test('blocks direct write to existing file if replaced with a symlink before commit', () => {
      const tm = new TransactionManager({ workspace: tmpWorkspace });
      tm.begin();
      tm.prepareWrite('src/modules/core.js', 'ATTACKER_CONTENT');
      tm.validate();

      // Attacker replaces target file with a symlink right before commit
      fs.unlinkSync(path.join(tmpWorkspace, 'src', 'modules', 'core.js'));
      const targetOutside = path.join(tmpWorkspace, 'secret.txt');
      fs.writeFileSync(targetOutside, 'SECRET_PAYLOAD', 'utf8');

      try {
        fs.symlinkSync(targetOutside, path.join(tmpWorkspace, 'src', 'modules', 'core.js'));
      } catch (symErr) {
        // Skip symlink creation if OS unprivileged
        if (symErr.code === 'EPERM') return;
        throw symErr;
      }

      // Commit must fail closed and NOT overwrite the symlink target
      expect(() => tm.commit()).toThrow(/Security Violation|Symlink write target forbidden/);

      // Verify the target was NOT overwritten!
      const secretContent = fs.readFileSync(targetOutside, 'utf8');
      expect(secretContent).toBe('SECRET_PAYLOAD');
    });

    test('blocks write if any parent directory is substituted with a symlink', () => {
      const tm = new TransactionManager({ workspace: tmpWorkspace });
      tm.begin();
      tm.prepareWrite('src/modules/newfile.js', 'MALICIOUS_DATA');
      tm.validate();

      // Attacker replaces 'src/modules' directory with a symlink to another directory
      const evilDir = path.join(tmpWorkspace, 'evil_outside');
      fs.mkdirSync(evilDir, { recursive: true });
      fs.rmSync(path.join(tmpWorkspace, 'src', 'modules'), { recursive: true, force: true });

      try {
        fs.symlinkSync(evilDir, path.join(tmpWorkspace, 'src', 'modules'), 'dir');
      } catch (symErr) {
        if (symErr.code === 'EPERM') return;
        throw symErr;
      }

      expect(() => tm.commit()).toThrow(/Security Violation: Symlink directory traversal detected/);
      // Ensure evilDir was NOT written to
      expect(fs.existsSync(path.join(evilDir, 'newfile.js'))).toBe(false);
    });
  });

  describe('Crash-Consistent Transaction Durability & WAL Recovery', () => {
    test('recovers pristine state after simulated process crash during multi-file commit', () => {
      const tm = new TransactionManager({ workspace: tmpWorkspace });
      tm.begin();
      tm.prepareWrite('src/modules/core.js', 'COMMITTED_VERSION');
      tm.prepareWrite('src/modules/new_service.js', 'BRAND_NEW_SERVICE');
      tm.validate();

      // Simulate crash: partially write files and crash before COMMITTED state is recorded
      fs.writeFileSync(
        path.join(tmpWorkspace, 'src', 'modules', 'core.js'),
        'PARTIALLY_WRITTEN_CORE',
        'utf8',
      );
      fs.writeFileSync(
        path.join(tmpWorkspace, 'src', 'modules', 'new_service.js'),
        'PARTIALLY_WRITTEN_SERVICE',
        'utf8',
      );

      // The process terminated abruptly (simulated by instantiating a fresh TransactionManager on same workspace)
      const recoverTm = new TransactionManager({ workspace: tmpWorkspace });

      // Simulate stale lock (or orphan transaction without lock)
      if (fs.existsSync(recoverTm.lockPath)) {
        // Backdate lock file mtime to make it stale (>15s)
        const past = new Date(Date.now() - 30000);
        fs.utimesSync(recoverTm.lockPath, past, past);
      }

      // Execute recovery
      recoverTm.recover();

      // Invariants verified:
      // 1. Existing file was restored to ORIGINAL_CORE from backup
      const restoredCore = fs.readFileSync(
        path.join(tmpWorkspace, 'src', 'modules', 'core.js'),
        'utf8',
      );
      expect(restoredCore).toBe('ORIGINAL_CORE');

      // 2. Newly created file was unlinked and removed
      expect(fs.existsSync(path.join(tmpWorkspace, 'src', 'modules', 'new_service.js'))).toBe(
        false,
      );

      // 3. Stale undo and WAL records were cleaned up
      expect(fs.existsSync(recoverTm.undoDir)).toBe(false);
      expect(fs.existsSync(recoverTm.walPath)).toBe(false);
    });

    test('recovers orphan uncommitted transaction even if lock was removed', () => {
      const tm = new TransactionManager({ workspace: tmpWorkspace });
      tm.begin();
      tm.prepareWrite('src/modules/core.js', 'MUTATED_CORE');
      tm.validate();

      // Remove lock directly but leave WAL & undo log (orphan transaction state)
      if (fs.existsSync(tm.lockPath)) fs.unlinkSync(tm.lockPath);

      // Modify file on disk
      fs.writeFileSync(
        path.join(tmpWorkspace, 'src', 'modules', 'core.js'),
        'CORRUPTED_DISK_DATA',
        'utf8',
      );

      const recoveryTm = new TransactionManager({ workspace: tmpWorkspace });
      recoveryTm.recover();

      // Must have restored ORIGINAL_CORE
      const coreData = fs.readFileSync(
        path.join(tmpWorkspace, 'src', 'modules', 'core.js'),
        'utf8',
      );
      expect(coreData).toBe('ORIGINAL_CORE');
    });
  });
});
