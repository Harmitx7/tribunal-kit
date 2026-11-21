'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { cmdMarathon } = require('../../src/commands/marathon');
const { cmdRsi } = require('../../src/commands/rsi');
const { verifyModelFileHash } = require('../../src/system1/provider');
const helpers = require('../../src/utils/helpers');
const logger = require('../../src/utils/logger');

describe('Phase 2 (#7, #9, #14, #22, #26) — Error Swallowing Elimination', () => {
  let tmpRoot;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-phase2-err-'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpRoot)) {
      try {
        fs.rmSync(tmpRoot, { recursive: true, force: true });
      } catch (_) {}
    }
    jest.restoreAllMocks();
  });

  test('#7 — cmdMarathon logs clear error message on runner failure before exiting non-zero', async () => {
    // Setup .agent fixture
    const agentDir = path.join(tmpRoot, '.agent', 'scripts');
    fs.mkdirSync(agentDir, { recursive: true });
    fs.writeFileSync(path.join(agentDir, 'marathon_harness.js'), 'console.log("harness");', 'utf8');

    // Mock runShellAsync to simulate runner error
    jest.spyOn(helpers, 'runShellAsync').mockRejectedValue(new Error('Spawn ENOENT test failure'));
    const errSpy = jest.spyOn(logger, 'err').mockImplementation(() => {});
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(code => {
      throw new Error(`process.exit: ${code}`);
    });

    await expect(
      cmdMarathon({ path: tmpRoot }, ['node', 'tk', 'marathon', 'status'], true),
    ).rejects.toThrow('process.exit: 1');

    expect(errSpy).toHaveBeenCalled();
    const errorMessage = errSpy.mock.calls[0][0];
    expect(errorMessage).toContain('Marathon harness execution failed');
    expect(errorMessage).toContain('Spawn ENOENT test failure');

    errSpy.mockRestore();
    exitSpy.mockRestore();
  });

  test('#14 — cmdRsi status logs clear warning when baseline_report.json contains corrupted JSON', async () => {
    const agentDir = path.join(tmpRoot, '.agent');
    fs.mkdirSync(agentDir, { recursive: true });

    const evalsDir = path.join(tmpRoot, '.tribunal', 'evals');
    fs.mkdirSync(evalsDir, { recursive: true });
    const corruptFile = path.join(evalsDir, 'baseline_report.json');
    fs.writeFileSync(corruptFile, '{ invalid json content...', 'utf8');

    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    await cmdRsi({ path: tmpRoot, json: true }, ['node', 'tk', 'rsi', 'status'], true);

    expect(warnSpy).toHaveBeenCalled();
    const warnCall = warnSpy.mock.calls.find(call =>
      call[0].includes('Corrupted or unreadable baseline report'),
    );
    expect(warnCall).toBeDefined();
    expect(warnCall[0]).toContain(corruptFile);

    warnSpy.mockRestore();
  });

  test('#22 — verifyModelFileHash logs clear warning when model file has hash mismatch', () => {
    const modelFile = path.join(tmpRoot, 'test_model.onnx');
    fs.writeFileSync(modelFile, 'mock model content buffer', 'utf8');

    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    const verified = verifyModelFileHash(
      modelFile,
      '0000000000000000000000000000000000000000000000000000000000000000',
    );
    expect(verified).toBe(false);

    expect(warnSpy).toHaveBeenCalled();
    const warnCall = warnSpy.mock.calls.find(call =>
      call[0].includes('corrupted or modified (SHA-256 hash mismatch)'),
    );
    expect(warnCall).toBeDefined();
    expect(warnCall[0]).toContain(modelFile);

    warnSpy.mockRestore();
  });
});
