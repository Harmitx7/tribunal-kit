'use strict';

/**
 * wal_transaction_manager.test.js
 * ===============================
 * Unit tests for WalTransactionManager (Phase 2 RSIE ACID Transaction Engine).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { WalTransactionManager, TX_STATES } = require('../../src/evolution/wal_transaction_manager');

describe('WalTransactionManager — Write-Ahead Log Transaction Engine', () => {
  let tmpDir;
  let wal;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-wal-test-'));
    wal = new WalTransactionManager({ agentDir: tmpDir });
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('beginTransaction creates valid journal in BEGIN state', () => {
    const tx = wal.beginTransaction('CAND_001', { reason: 'Test' });

    expect(tx.txId).toMatch(/^tx_\d+_[a-f0-9]+$/);
    expect(tx.state).toBe(TX_STATES.BEGIN);

    const journal = wal.getTransaction(tx.txId);
    expect(journal).toBeDefined();
    expect(journal.candidateId).toBe('CAND_001');
    expect(journal.checkpoints).toEqual([]);
  });

  test('checkpointFile snapshots existing file content and hash', () => {
    const testFile = path.join(tmpDir, 'target.txt');
    fs.writeFileSync(testFile, 'initial content', 'utf8');

    const tx = wal.beginTransaction('CAND_002');
    const cp = wal.checkpointFile(tx.txId, testFile);

    expect(cp.originalHash).toMatch(/^[a-f0-9]{64}$/);
    expect(cp.filePath).toBe(testFile);

    const journal = wal.getTransaction(tx.txId);
    expect(journal.checkpoints).toHaveLength(1);
    expect(journal.checkpoints[0].existedBefore).toBe(true);
  });

  test('prepareTransaction and commitTransaction transition states cleanly', () => {
    const tx = wal.beginTransaction('CAND_003');
    const prepared = wal.prepareTransaction(tx.txId, { verified: true });
    expect(prepared.state).toBe(TX_STATES.PREPARE);

    const committed = wal.commitTransaction(tx.txId);
    expect(committed.state).toBe(TX_STATES.COMMIT);

    const journal = wal.getTransaction(tx.txId);
    expect(journal.state).toBe(TX_STATES.COMMIT);
    expect(journal.committedAt).toBeDefined();
  });

  test('rollbackTransaction restores modified files to their original content', () => {
    const testFile = path.join(tmpDir, 'important.txt');
    fs.writeFileSync(testFile, 'ORIGINAL_DATA', 'utf8');

    const tx = wal.beginTransaction('CAND_004');
    wal.checkpointFile(tx.txId, testFile);

    // Simulate mutation
    fs.writeFileSync(testFile, 'CORRUPTED_MUTATION', 'utf8');
    expect(fs.readFileSync(testFile, 'utf8')).toBe('CORRUPTED_MUTATION');

    // Rollback
    const res = wal.rollbackTransaction(tx.txId, 'Invariant breach');
    expect(res.state).toBe(TX_STATES.ABORT);
    expect(res.restoredFiles).toContain(testFile);

    // Verify file content is fully restored
    expect(fs.readFileSync(testFile, 'utf8')).toBe('ORIGINAL_DATA');
  });

  test('rollbackTransaction deletes files that did not exist before checkpoint', () => {
    const newFile = path.join(tmpDir, 'created_file.txt');

    const tx = wal.beginTransaction('CAND_005');
    wal.checkpointFile(tx.txId, newFile);

    // Simulate candidate creating a new file
    fs.writeFileSync(newFile, 'newly created', 'utf8');
    expect(fs.existsSync(newFile)).toBe(true);

    // Rollback
    wal.rollbackTransaction(tx.txId, 'Candidate rejected');
    expect(fs.existsSync(newFile)).toBe(false);
  });

  test('recoverPendingTransactions detects and aborts dangling uncommitted transactions', () => {
    const testFile = path.join(tmpDir, 'dangling.txt');
    fs.writeFileSync(testFile, 'STABLE_VERSION', 'utf8');

    const tx = wal.beginTransaction('CAND_DANGLING');
    wal.checkpointFile(tx.txId, testFile);
    fs.writeFileSync(testFile, 'UNCOMMITTED_DIRTY_DATA', 'utf8');

    // Simulate process crash: instantiate a new manager on same directory
    const newWal = new WalTransactionManager({ agentDir: tmpDir });
    const recovered = newWal.recoverPendingTransactions();

    expect(recovered).toHaveLength(1);
    expect(recovered[0].txId).toBe(tx.txId);
    expect(recovered[0].recovered).toBe(true);

    // Verify restored
    expect(fs.readFileSync(testFile, 'utf8')).toBe('STABLE_VERSION');
  });
});
