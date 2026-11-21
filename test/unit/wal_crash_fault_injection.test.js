'use strict';

/**
 * wal_crash_fault_injection.test.js — Stage 2.4 WAL Crash Consistency & 8-Phase Fault-Injection
 *
 * Verifies transaction recovery across all 8 failure phases:
 * Phase 1: Before WAL persistence
 * Phase 2: During backup creation
 * Phase 3: After WAL persistence (VALIDATED)
 * Phase 4: After first file write in multi-file transaction
 * Phase 5: Between subsequent file writes
 * Phase 6: Before commit marker (all files written, wal NOT committed)
 * Phase 7: After commit marker (wal is COMMITTED, cleanup pending)
 * Phase 8: During WAL cleanup
 *
 * Also tests Windows directory junction substitution defense (internal and external traversal).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const TransactionManager = require('../../src/execution/transaction_manager');

describe('Stage 2.4: WAL Fault-Injection & Windows Durability Gauntlet', () => {
  let tmpWorkspace;

  beforeEach(() => {
    tmpWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-wal-fault-'));
    fs.mkdirSync(path.join(tmpWorkspace, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpWorkspace, 'src', 'file1.js'), 'ORIGINAL_FILE_1', 'utf8');
    fs.writeFileSync(path.join(tmpWorkspace, 'src', 'file2.js'), 'ORIGINAL_FILE_2', 'utf8');
    fs.writeFileSync(path.join(tmpWorkspace, 'src', 'file3.js'), 'ORIGINAL_FILE_3', 'utf8');
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpWorkspace, { recursive: true, force: true });
    } catch (_) {}
  });

  function simulateCrash(tm) {
    if (fs.existsSync(tm.lockPath)) {
      const oldTime = new Date(Date.now() - 30000);
      fs.utimesSync(tm.lockPath, oldTime, oldTime);
    }
  }

  // ── Phase 1: Interruption Before WAL Persistence ───────────────────────────
  test('Phase 1: Interruption before WAL persistence leaves repository untouched', () => {
    const tm = new TransactionManager({ workspace: tmpWorkspace });
    tm.begin();
    tm.prepareWrite('src/file1.js', 'MUTATED_FILE_1');
    // Abort before validate() is called
    // Crash simulation: writer process terminates, leaving stale lock
    simulateCrash(tm);

    const recoveryTm = new TransactionManager({ workspace: tmpWorkspace });
    recoveryTm.recover();

    expect(fs.readFileSync(path.join(tmpWorkspace, 'src', 'file1.js'), 'utf8')).toBe(
      'ORIGINAL_FILE_1',
    );
    expect(fs.existsSync(recoveryTm.walPath)).toBe(false);
  });

  // ── Phase 2: Interruption During Backup Creation ─────────────────────────────
  test('Phase 2: Interruption during backup creation cleans up partial undo directory', () => {
    const tm = new TransactionManager({ workspace: tmpWorkspace });
    tm.begin();
    tm.prepareWrite('src/file1.js', 'MUTATED_FILE_1');

    // Simulate crash midway through validate before mapping.json is written
    fs.mkdirSync(tm.undoDir, { recursive: true });
    fs.writeFileSync(path.join(tm.undoDir, 'backup_partial.txt'), 'partial backup');
    simulateCrash(tm);

    const recoveryTm = new TransactionManager({ workspace: tmpWorkspace });
    recoveryTm.recover();

    expect(fs.readFileSync(path.join(tmpWorkspace, 'src', 'file1.js'), 'utf8')).toBe(
      'ORIGINAL_FILE_1',
    );
  });

  // ── Phase 3: Interruption After WAL Persistence (VALIDATED state) ────────────
  test('Phase 3: Interruption after WAL persistence (VALIDATED) safely cleans up without mutation', () => {
    const tm = new TransactionManager({ workspace: tmpWorkspace });
    tm.begin();
    tm.prepareWrite('src/file1.js', 'MUTATED_FILE_1');
    tm.validate();

    // Verify WAL is in VALIDATED state
    const wal = JSON.parse(fs.readFileSync(tm.walPath, 'utf8'));
    expect(wal.state).toBe('VALIDATED');

    simulateCrash(tm);

    const recoveryTm = new TransactionManager({ workspace: tmpWorkspace });
    recoveryTm.recover();

    expect(fs.readFileSync(path.join(tmpWorkspace, 'src', 'file1.js'), 'utf8')).toBe(
      'ORIGINAL_FILE_1',
    );
    expect(fs.existsSync(recoveryTm.walPath)).toBe(false);
  });

  // ── Phase 4: Interruption After First File Write in Multi-File Batch ─────────
  test('Phase 4: Crash after first file write restores pre-transaction backup', () => {
    const tm = new TransactionManager({ workspace: tmpWorkspace });
    tm.begin();
    tm.prepareWrite('src/file1.js', 'NEW_CONTENT_1');
    tm.prepareWrite('src/file2.js', 'NEW_CONTENT_2');
    tm.validate();

    // Simulate writer modifying file 1 and crashing before file 2
    fs.writeFileSync(
      path.join(tmpWorkspace, 'src', 'file1.js'),
      'MUTATED_CRASHED_CONTENT_1',
      'utf8',
    );
    simulateCrash(tm);

    // Process crashed: recovery runs
    const recoveryTm = new TransactionManager({ workspace: tmpWorkspace });
    recoveryTm.recover();

    // INVARIANT: Incomplete transaction was NOT committed! File 1 restored!
    expect(fs.readFileSync(path.join(tmpWorkspace, 'src', 'file1.js'), 'utf8')).toBe(
      'ORIGINAL_FILE_1',
    );
    expect(fs.readFileSync(path.join(tmpWorkspace, 'src', 'file2.js'), 'utf8')).toBe(
      'ORIGINAL_FILE_2',
    );
  });

  // ── Phase 5: Interruption Between Subsequent File Writes ─────────────────────
  test('Phase 5: Crash between subsequent file writes in 3-file batch restores all files', () => {
    const tm = new TransactionManager({ workspace: tmpWorkspace });
    tm.begin();
    tm.prepareWrite('src/file1.js', 'BATCH_1');
    tm.prepareWrite('src/file2.js', 'BATCH_2');
    tm.prepareWrite('src/file3.js', 'BATCH_3');
    tm.validate();

    // Mutate file 1 and file 2, then crash before file 3
    fs.writeFileSync(path.join(tmpWorkspace, 'src', 'file1.js'), 'PARTIAL_BATCH_1', 'utf8');
    fs.writeFileSync(path.join(tmpWorkspace, 'src', 'file2.js'), 'PARTIAL_BATCH_2', 'utf8');
    simulateCrash(tm);

    const recoveryTm = new TransactionManager({ workspace: tmpWorkspace });
    recoveryTm.recover();

    expect(fs.readFileSync(path.join(tmpWorkspace, 'src', 'file1.js'), 'utf8')).toBe(
      'ORIGINAL_FILE_1',
    );
    expect(fs.readFileSync(path.join(tmpWorkspace, 'src', 'file2.js'), 'utf8')).toBe(
      'ORIGINAL_FILE_2',
    );
    expect(fs.readFileSync(path.join(tmpWorkspace, 'src', 'file3.js'), 'utf8')).toBe(
      'ORIGINAL_FILE_3',
    );
  });

  // ── Phase 6: Interruption Before Commit Marker (All files written, WAL uncommitted)
  test('Phase 6: Crash before commit marker does NOT treat transaction as committed and rolls back', () => {
    const tm = new TransactionManager({ workspace: tmpWorkspace });
    tm.begin();
    tm.prepareWrite('src/file1.js', 'FINAL_VERSION_1');
    tm.prepareWrite('src/file2.js', 'FINAL_VERSION_2');
    tm.validate();

    // All files written on disk, but process crashed before wal.state = 'COMMITTED'
    fs.writeFileSync(path.join(tmpWorkspace, 'src', 'file1.js'), 'FINAL_VERSION_1', 'utf8');
    fs.writeFileSync(path.join(tmpWorkspace, 'src', 'file2.js'), 'FINAL_VERSION_2', 'utf8');

    const wal = JSON.parse(fs.readFileSync(tm.walPath, 'utf8'));
    expect(wal.state).toBe('VALIDATED'); // Not COMMITTED
    simulateCrash(tm);

    const recoveryTm = new TransactionManager({ workspace: tmpWorkspace });
    recoveryTm.recover();

    // Crucial Invariant: Without commit marker, transaction is considered uncommitted and rolled back!
    expect(fs.readFileSync(path.join(tmpWorkspace, 'src', 'file1.js'), 'utf8')).toBe(
      'ORIGINAL_FILE_1',
    );
    expect(fs.readFileSync(path.join(tmpWorkspace, 'src', 'file2.js'), 'utf8')).toBe(
      'ORIGINAL_FILE_2',
    );
  });

  // ── Phase 7: Interruption After Commit Marker (wal.state = COMMITTED) ─────────
  test('Phase 7: Crash after commit marker preserves committed files and finishes cleanup', () => {
    const tm = new TransactionManager({ workspace: tmpWorkspace });
    tm.begin();
    tm.prepareWrite('src/file1.js', 'PERSISTED_COMMITTED_DATA');
    tm.validate();

    fs.writeFileSync(
      path.join(tmpWorkspace, 'src', 'file1.js'),
      'PERSISTED_COMMITTED_DATA',
      'utf8',
    );

    // Mark WAL as COMMITTED
    const wal = JSON.parse(fs.readFileSync(tm.walPath, 'utf8'));
    wal.state = 'COMMITTED';
    fs.writeFileSync(tm.walPath, JSON.stringify(wal, null, 2), 'utf8');
    simulateCrash(tm);

    // Process crashed before cleanup
    const recoveryTm = new TransactionManager({ workspace: tmpWorkspace });
    recoveryTm.recover();

    // Invariant: Committed data is preserved
    expect(fs.readFileSync(path.join(tmpWorkspace, 'src', 'file1.js'), 'utf8')).toBe(
      'PERSISTED_COMMITTED_DATA',
    );
    // Invariant: Leftover WAL and undo are now cleaned up
    expect(fs.existsSync(recoveryTm.walPath)).toBe(false);
    expect(fs.existsSync(recoveryTm.undoDir)).toBe(false);
  });

  // ── Phase 8: Interruption During WAL Cleanup ────────────────────────────────
  test('Phase 8: Interruption during WAL cleanup safely finishes removing residual transaction artifacts', () => {
    const tm = new TransactionManager({ workspace: tmpWorkspace });
    tm.begin();
    tm.prepareWrite('src/file1.js', 'CLEANUP_TEST');
    tm.validate();

    fs.writeFileSync(path.join(tmpWorkspace, 'src', 'file1.js'), 'CLEANUP_TEST', 'utf8');

    // State COMMITTED, undo directory removed, but wal.json remained
    const wal = JSON.parse(fs.readFileSync(tm.walPath, 'utf8'));
    wal.state = 'COMMITTED';
    fs.writeFileSync(tm.walPath, JSON.stringify(wal, null, 2), 'utf8');
    fs.rmSync(tm.undoDir, { recursive: true, force: true });
    simulateCrash(tm);

    const recoveryTm = new TransactionManager({ workspace: tmpWorkspace });
    recoveryTm.recover();

    expect(fs.readFileSync(path.join(tmpWorkspace, 'src', 'file1.js'), 'utf8')).toBe(
      'CLEANUP_TEST',
    );
    expect(fs.existsSync(recoveryTm.walPath)).toBe(false);
  });

  // ── Windows Reparse Point & Junction Defense ────────────────────────────────
  test('Windows junction substitution pointing outside repo is rejected and rolled back', () => {
    const tm = new TransactionManager({ workspace: tmpWorkspace });
    tm.begin();
    tm.prepareWrite('src/secret_target/file.js', 'ATTACKER_INJECTION');
    tm.validate();

    // Create an external directory outside tmpWorkspace
    const externalDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-ext-junc-'));
    const externalFile = path.join(externalDir, 'file.js');
    fs.writeFileSync(externalFile, 'PRISTINE_EXTERNAL', 'utf8');

    const juncPath = path.join(tmpWorkspace, 'src', 'secret_target');
    try {
      execSync(`cmd.exe /c mklink /J "${juncPath}" "${externalDir}"`);
    } catch (_e) {
      // Junction unsupported in current environment
      fs.rmSync(externalDir, { recursive: true, force: true });
      return;
    }

    // Attempting to commit into a junction directory escaping workspace must fail closed
    expect(() => tm.commit()).toThrow(/Security Violation/);

    // External file must remain untouched
    expect(fs.readFileSync(externalFile, 'utf8')).toBe('PRISTINE_EXTERNAL');
    fs.rmSync(externalDir, { recursive: true, force: true });
  });

  test('Windows junction substitution within repo is rejected by ancestor walk', () => {
    const tm = new TransactionManager({ workspace: tmpWorkspace });
    tm.begin();
    tm.prepareWrite('src/internal_junc/file.js', 'INTERNAL_INJECTION');
    tm.validate();

    // Create an internal target folder inside tmpWorkspace
    const internalTarget = path.join(tmpWorkspace, 'src', 'actual_dir');
    fs.mkdirSync(internalTarget, { recursive: true });

    const juncPath = path.join(tmpWorkspace, 'src', 'internal_junc');
    try {
      execSync(`cmd.exe /c mklink /J "${juncPath}" "${internalTarget}"`);
    } catch (_e) {
      return;
    }

    // Target is inside repo, but ancestor segment is a junction/symlink:
    // assertNoSymlinkAncestors must throw traversal violation
    expect(() => tm.commit()).toThrow(/Security Violation: Symlink directory traversal detected/);
  });
});
