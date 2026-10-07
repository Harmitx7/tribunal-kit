'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const TransactionManager = require('../../src/execution/transaction_manager');

describe('TransactionManager', () => {
  let workspace;
  let agentDir;
  let txManager;

  beforeEach(() => {
    const id = crypto.randomBytes(4).toString('hex');
    workspace = path.join(__dirname, `../../.tmp_tx_test_${id}`);
    agentDir = path.join(workspace, '.agent');
    fs.mkdirSync(workspace, { recursive: true });
    txManager = new TransactionManager({ workspace, agentDir });
  });

  afterEach(() => {
    try {
      fs.rmSync(workspace, { recursive: true, force: true });
    } catch (e) {}
  });

  describe('Basic Lifecycle', () => {
    it('should successfully prepare, validate, and commit a transaction', () => {
      txManager.begin();

      const targetPath = path.join(workspace, 'test.txt');
      txManager.prepareWrite(targetPath, 'hello world');

      txManager.validate();
      expect(fs.existsSync(txManager.undoDir)).toBe(true);
      expect(fs.existsSync(txManager.walPath)).toBe(true);

      txManager.commit();

      expect(fs.existsSync(targetPath)).toBe(true);
      expect(fs.readFileSync(targetPath, 'utf8')).toBe('hello world');

      // Cleanup checks
      expect(fs.existsSync(txManager.undoDir)).toBe(false);
      expect(fs.existsSync(txManager.walPath)).toBe(false);
      expect(fs.existsSync(txManager.lockPath)).toBe(false);
    });
  });

  describe('Rollback', () => {
    it('should rollback changes and restore undo log on explicit rollback', () => {
      const targetPath = path.join(workspace, 'existing.txt');
      fs.writeFileSync(targetPath, 'original content');

      txManager.begin();
      txManager.prepareWrite(targetPath, 'new content');
      txManager.validate();

      // Simulate partial write before rollback
      fs.writeFileSync(targetPath, 'partial write');

      txManager.rollback();

      // Should restore original
      expect(fs.readFileSync(targetPath, 'utf8')).toBe('original content');
      expect(fs.existsSync(txManager.lockPath)).toBe(false);
    });
  });

  describe('Path Security', () => {
    it('should reject paths outside the workspace', () => {
      txManager.begin();
      expect(() => {
        txManager.prepareWrite('../outside.txt', 'evil');
      }).toThrow(/Path security violation/);
      txManager.rollback();
    });
  });

  describe('Crash Recovery', () => {
    it('should recover from a stale lock and uncommitted WAL', () => {
      const targetPath = path.join(workspace, 'crash.txt');
      fs.writeFileSync(targetPath, 'safe');

      txManager.begin();
      txManager.prepareWrite(targetPath, 'corrupted');
      txManager.validate();

      // Simulate crash by forcing stale lock
      const pastTime = new Date(Date.now() - 20000); // 20 seconds ago
      fs.utimesSync(txManager.lockPath, pastTime, pastTime);

      // Create a new manager instance simulating a process restart
      const recoveryManager = new TransactionManager({ workspace, agentDir });

      // This should trigger recovery and rollback
      recoveryManager.begin();

      expect(fs.readFileSync(targetPath, 'utf8')).toBe('safe');

      recoveryManager.rollback();
    });
  });
});
