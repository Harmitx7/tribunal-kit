'use strict';

const fs = require('fs');
const path = require('path');
const { ControlledWriteService } = require('../../src/execution/controlled_write_service');
const TransactionManager = require('../../src/execution/transaction_manager');

describe('ControlledWriteService & TransactionManager Lifecycle Invariants (Phase 3)', () => {
  let testWorkspace;
  let service;

  beforeAll(() => {
    testWorkspace = path.join(__dirname, '..', 'fixtures', 'tx-lifecycle-workspace');
    if (!fs.existsSync(testWorkspace)) {
      fs.mkdirSync(testWorkspace, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testWorkspace)) {
      try {
        fs.rmSync(testWorkspace, { recursive: true, force: true });
      } catch (_) {}
    }
  });

  beforeEach(() => {
    service = new ControlledWriteService({ workspaceRoot: testWorkspace });
    service.reviewExecutor = {
      executeReview: async () => ({
        reviewRunId: 'test-run',
        results: [{ reviewerId: 'logic-reviewer', verdict: 'APPROVED', findings: [] }],
      }),
    };
  });

  test('rejects write requests with duplicate file paths', async () => {
    await expect(
      service.requestWrite({
        workspaceId: 'ws-1',
        agentId: 'agent-1',
        files: [
          { path: 'dup.txt', operation: 'CREATE', content: 'v1' },
          { path: 'dup.txt', operation: 'MODIFY', content: 'v2' },
        ],
        reason: 'test duplicate path',
      }),
    ).rejects.toThrow(/duplicate file path/i);
  });

  test('rejects CREATE and MODIFY with non-string content', async () => {
    await expect(
      service.requestWrite({
        workspaceId: 'ws-1',
        agentId: 'agent-1',
        files: [{ path: 'empty.txt', operation: 'CREATE' }],
        reason: 'test missing content',
      }),
    ).rejects.toThrow(/file content must be a string/i);
  });

  test('rejects approveWrite with invalid or missing approverId', async () => {
    expect(() => {
      service.approveWrite('tok_fake', '');
    }).toThrow(/invalid or expired token/i);
  });

  test('TransactionManager retains earliest pre-transaction backup on duplicate ops', () => {
    const tx = new TransactionManager({ workspace: testWorkspace });
    const targetFile = path.join(testWorkspace, 'pre_existing.txt');
    fs.writeFileSync(targetFile, 'INITIAL_CONTENT', 'utf8');

    tx.begin();
    tx.prepareWrite('pre_existing.txt', 'MODIFIED_ONCE');
    tx.prepareWrite('pre_existing.txt', 'MODIFIED_TWICE');
    tx.validate();

    // Verify backup mapping exists and points to backup of INITIAL_CONTENT
    const mapPath = path.join(tx.undoDir, 'mapping.json');
    expect(fs.existsSync(mapPath)).toBe(true);
    const mapping = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    const backupFile = path.join(tx.undoDir, mapping[targetFile]);
    expect(fs.readFileSync(backupFile, 'utf8')).toBe('INITIAL_CONTENT');

    tx.rollback();
    expect(fs.readFileSync(targetFile, 'utf8')).toBe('INITIAL_CONTENT');
    fs.unlinkSync(targetFile);
  });

  test('TransactionManager recovers safely when wal.json is corrupted', () => {
    const tx = new TransactionManager({ workspace: testWorkspace });
    const targetFile = path.join(testWorkspace, 'corrupt_test.txt');
    fs.writeFileSync(targetFile, 'ORIGINAL', 'utf8');

    tx.begin();
    tx.prepareWrite('corrupt_test.txt', 'CHANGED');
    tx.validate();

    // Corrupt wal.json intentionally
    fs.writeFileSync(tx.walPath, '{ corrupted json', 'utf8');

    // Simulate stale lock recovery
    const stats = fs.statSync(tx.lockPath);
    const oldTime = new Date(Date.now() - 20000);
    fs.utimesSync(tx.lockPath, oldTime, oldTime);

    const recoveryTx = new TransactionManager({ workspace: testWorkspace });
    recoveryTx.recover();

    // Undo should have been applied despite corrupted WAL
    expect(fs.readFileSync(targetFile, 'utf8')).toBe('ORIGINAL');
    expect(fs.existsSync(tx.lockPath)).toBe(false);
    fs.unlinkSync(targetFile);
  });
});

