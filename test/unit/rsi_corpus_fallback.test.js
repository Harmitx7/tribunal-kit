'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { cmdRsi } = require('../../src/commands/rsi');

describe('RSI Benchmark Corpus Fallback', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-rsi-test-'));
    fs.mkdirSync(path.join(tempDir, '.agent', 'rules'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, '.agent', 'rules', 'GEMINI.md'), '# Rules\n');
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) {}
  });

  test('cmdRsi status succeeds and returns status data without throwing MODULE_NOT_FOUND', async () => {
    const flags = { path: tempDir, json: true };
    const statusData = await cmdRsi(flags, ['node', 'tk', 'rsi', 'status'], true);
    expect(statusData).toBeDefined();
    expect(statusData.vault).toBeDefined();
    expect(typeof statusData.vault.scenariosLoaded).toBe('number');
  });

  test('cmdRsi run degrades cleanly when benchmark corpus is unavailable', async () => {
    // Override require or pass mock where corpus scenarios return 0
    const flags = { path: tempDir, json: true };
    const result = await cmdRsi(flags, ['node', 'tk', 'rsi', 'run', 'test-skill'], true);
    expect(result).toBeDefined();
    expect(['BLOCKED', 'SUCCESS', 'FAILED']).toContain(result.verdict);
  });
});
