'use strict';

/**
 * rsi_cli_daemon.test.js
 * =======================
 * Integration test for Phase 4:
 * Proves end-to-end functionality of `tk rsi` CLI commands,
 * Meta-Assurance emergency self-quarantine, and Watcher Daemon lifecycle.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { cmdRsi } = require('../../src/commands/rsi');
const { WalTransactionManager } = require('../../src/evolution/wal_transaction_manager');

describe('RSIE CLI & Autonomous Daemon Integration', () => {
  let tmpDir;
  let wal;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-rsi-integration-test-'));
    const agentDir = path.join(tmpDir, '.agent');
    fs.mkdirSync(path.join(agentDir, 'skills', 'test-skill'), { recursive: true });
    fs.writeFileSync(
      path.join(agentDir, 'skills', 'test-skill', 'SKILL.md'),
      '# Test Skill\n\n' +
        'Defensive guidelines for testing and robust software development with zero defects.\n'.repeat(
          60,
        ),
      'utf8',
    );
    wal = new WalTransactionManager({ agentDir });
  });

  afterEach(() => {
    // Ensure any running daemon in test stops
    try {
      cmdRsi({ path: tmpDir, stop: true }, ['node', 'tk', 'rsi', 'watch', '--stop'], true);
    } catch {}

    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('tk rsi status returns comprehensive system telemetry in JSON mode', async () => {
    const status = await cmdRsi(
      { path: tmpDir, json: true },
      ['node', 'tk', 'rsi', 'status'],
      true,
    );

    expect(status.vault.scenariosLoaded).toBe(50);
    expect(status.metaAssurance.circuitState).toBe('CLOSED');
    expect(status.metaAssurance.healthy).toBe(true);
    expect(status.watcherDaemon.running).toBe(false);
    expect(status.negativeMemory.recordedVulnerabilities).toBe(0);
  });

  test('tk rsi freeze trips circuit breaker and tk rsi unfreeze restores health', async () => {
    // 1. Freeze
    const freezeRes = await cmdRsi(
      { path: tmpDir, reason: 'Manual audit required' },
      ['node', 'tk', 'rsi', 'freeze'],
      true,
    );
    expect(freezeRes.circuitState).toBe('TRIPPED');
    expect(freezeRes.quarantineReason).toBe('Manual audit required');

    // 2. Status confirms TRIPPED
    const statusTripped = await cmdRsi(
      { path: tmpDir, json: true },
      ['node', 'tk', 'rsi', 'status'],
      true,
    );
    expect(statusTripped.metaAssurance.circuitState).toBe('TRIPPED');
    expect(statusTripped.metaAssurance.healthy).toBe(false);

    // 3. Unfreeze
    const unfreezeRes = await cmdRsi(
      { path: tmpDir, reason: 'Operator verified zero regressions' },
      ['node', 'tk', 'rsi', 'unfreeze'],
      true,
    );
    expect(unfreezeRes.circuitState).toBe('CLOSED');
    expect(unfreezeRes.quarantineReason).toBeNull();

    // 4. Status confirms CLOSED
    const statusClosed = await cmdRsi(
      { path: tmpDir, json: true },
      ['node', 'tk', 'rsi', 'status'],
      true,
    );
    expect(statusClosed.metaAssurance.circuitState).toBe('CLOSED');
    expect(statusClosed.metaAssurance.healthy).toBe(true);
  });

  test('tk rsi run is blocked when frozen, and succeeds when healthy', async () => {
    // 1. Freeze
    await cmdRsi(
      { path: tmpDir, reason: 'Block test' },
      ['node', 'tk', 'rsi', 'freeze'],
      true,
    );

    // 2. Attempt run while frozen
    const blockedRes = await cmdRsi(
      { path: tmpDir, target: 'test-skill' },
      ['node', 'tk', 'rsi', 'run', 'test-skill'],
      true,
    );
    expect(blockedRes.status).toBe('BLOCKED');
    expect(blockedRes.error).toContain('RSIE Self-Quarantine Active');

    // 3. Unfreeze
    await cmdRsi(
      { path: tmpDir },
      ['node', 'tk', 'rsi', 'unfreeze'],
      true,
    );

    // 4. Run succeeds
    const runRes = await cmdRsi(
      { path: tmpDir, target: 'test-skill', json: true },
      ['node', 'tk', 'rsi', 'run', 'test-skill'],
      true,
    );
    expect(runRes.verdict).toBe('SUCCESS');
    expect(runRes.adversarialFindings).toBeGreaterThan(0);
    expect(runRes.walTxId).toBeDefined();
    expect(runRes.proposalId).toBeDefined();
  });

  test('tk rsi watch starts and stops daemon lifecycle cleanly', async () => {
    // 1. Start watch daemon
    const startRes = await cmdRsi(
      { path: tmpDir },
      ['node', 'tk', 'rsi', 'watch'],
      true,
    );
    expect(startRes.started).toBe(true);
    expect(startRes.pid).toBe(process.pid);

    // 2. Query watch status
    const statusRes = await cmdRsi(
      { path: tmpDir, status: true, json: true },
      ['node', 'tk', 'rsi', 'watch', '--status'],
      true,
    );
    expect(statusRes.running).toBe(true);

    // 3. Stop watch daemon
    const stopRes = await cmdRsi(
      { path: tmpDir, stop: true },
      ['node', 'tk', 'rsi', 'watch', '--stop'],
      true,
    );
    expect(stopRes.stopped).toBe(true);

    // 4. Query status after stop
    const statusAfterStop = await cmdRsi(
      { path: tmpDir, status: true, json: true },
      ['node', 'tk', 'rsi', 'watch', '--status'],
      true,
    );
    expect(statusAfterStop.running).toBe(false);
  });

  test('tk rsi rollback reverts a target transaction cleanly', async () => {
    // Create an open transaction
    const tx = wal.beginTransaction('rollback-target', { action: 'TEST_ROLLBACK' });

    const rollbackRes = await cmdRsi(
      { path: tmpDir },
      ['node', 'tk', 'rsi', 'rollback', tx.txId],
      true,
    );

    expect(rollbackRes.state).toBe('ABORT');
    expect(rollbackRes.txId).toBe(tx.txId);

    const journal = wal.getTransaction(tx.txId);
    expect(journal.state).toBe('ABORT');
  });
});
