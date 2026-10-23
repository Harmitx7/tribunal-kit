'use strict';

/**
 * watcher_daemon.test.js
 * =======================
 * Unit tests for WatcherDaemon background surveillance and triggers.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { WatcherDaemon } = require('../../src/evolution/watcher_daemon');
const { recordRejection } = require('../../src/evolution/negative_memory');

describe('WatcherDaemon — Surveillance & Autonomous Trigger Lifecycle', () => {
  let tmpDir;
  let daemon;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-watcher-test-'));
    daemon = new WatcherDaemon({
      repoRoot: tmpDir,
      agentDir: tmpDir,
      intervalMs: 100,
      cooldownMs: 1000,
      targetSkill: 'test-skill',
    });
  });

  afterEach(() => {
    daemon.stop();
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('checkTriggers returns false when no new negative CBR rejections exist', () => {
    const trigger = daemon.checkTriggers();
    expect(trigger.triggered).toBe(false);
    expect(trigger.newRejections).toBe(0);
  });

  test('checkTriggers detects newly recorded rejections in negative CBR memory', () => {
    // Record rejection
    recordRejection(
      tmpDir,
      'test-skill',
      1,
      [{ op: 'probe', content: 'test payload' }],
      'Vulnerability discovered',
    );

    const trigger = daemon.checkTriggers();
    expect(trigger.triggered).toBe(true);
    expect(trigger.newRejections).toBe(1);
    expect(trigger.reason).toContain('Discovered 1 new adversarial vulnerability');

    // Second check without new records should be false
    const secondCheck = daemon.checkTriggers();
    expect(secondCheck.triggered).toBe(false);
  });

  test('tick respects cooldownMs and returns COOLDOWN action', async () => {
    recordRejection(tmpDir, 'test-skill', 1, ['bad-payload-1'], 'Finding 1');

    daemon.lastTriggeredAt = Date.now(); // Simulate recent trigger
    const tickResult = await daemon.tick();

    expect(tickResult.action).toBe('COOLDOWN');
    expect(tickResult.reason).toContain('remaining');
  });

  test('tick halts with CIRCUIT_BLOCKED when Meta-Assurance circuit breaker is TRIPPED', async () => {
    recordRejection(tmpDir, 'test-skill', 1, ['bad-payload-2'], 'Finding 2');

    // Trip circuit breaker
    daemon.metaAssurance.tripCircuitBreaker('Quarantine active for testing');

    const tickResult = await daemon.tick();
    expect(tickResult.action).toBe('CIRCUIT_BLOCKED');
    expect(tickResult.reason).toContain('Quarantine active for testing');
  });

  test('start creates pidfile and stop cleans it up gracefully', () => {
    expect(daemon.isDaemonRunning().running).toBe(false);

    daemon.start();
    expect(daemon.isRunning).toBe(true);
    expect(fs.existsSync(daemon.pidFilePath)).toBe(true);

    const status = daemon.getStatus();
    expect(status.running).toBe(true);
    expect(status.pid).toBe(process.pid);

    daemon.stop();
    expect(daemon.isRunning).toBe(false);
    expect(fs.existsSync(daemon.pidFilePath)).toBe(false);
  });
});
