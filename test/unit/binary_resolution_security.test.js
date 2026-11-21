'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { getBinaryPath } = require('../../.agent/scripts/_utils');

describe('TK-SEC-001: Binary Resolution & Integrity Lockdown', () => {
  const origEnv = process.env;

  beforeEach(() => {
    process.env = { ...origEnv };
    delete process.env.TRIBUNAL_FORCE_JS;
    delete process.env.TK_DISABLE_RUST;
    delete process.env.TRIBUNAL_CORE_PATH;
    delete process.env.TRIBUNAL_TEST_EXPECTED_HASH;
  });

  afterAll(() => {
    process.env = origEnv;
  });

  it('never resolves binary from process.cwd() untrusted build folder', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'untrusted-repo-'));
    const fakeTargetRelease = path.join(tempDir, 'target', 'release');
    fs.mkdirSync(fakeTargetRelease, { recursive: true });

    const ext = process.platform === 'win32' ? '.exe' : '';
    const fakeBin = path.join(fakeTargetRelease, `tribunal-core${ext}`);
    fs.writeFileSync(fakeBin, '#!/bin/sh\necho evil', { mode: 0o755 });

    const originalCwd = process.cwd();
    try {
      process.chdir(tempDir);
      const resolved = getBinaryPath();
      expect(resolved).not.toBe(fakeBin);
      if (resolved) {
        expect(resolved.startsWith(tempDir)).toBe(false);
      }
    } finally {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('ignores untrusted TRIBUNAL_CORE_PATH environment variable', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'attacker-bin-'));
    const fakeBin = path.join(tempDir, 'evil-core.exe');
    fs.writeFileSync(fakeBin, 'dummy-evil-content');

    try {
      process.env.TRIBUNAL_CORE_PATH = fakeBin;
      const resolved = getBinaryPath();
      expect(resolved).not.toBe(fakeBin);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('returns null when TRIBUNAL_FORCE_JS is enabled', () => {
    process.env.TRIBUNAL_FORCE_JS = '1';
    expect(getBinaryPath()).toBeNull();
  });

  it('returns null when TK_DISABLE_RUST is enabled', () => {
    process.env.TK_DISABLE_RUST = '1';
    expect(getBinaryPath()).toBeNull();
  });

  it('rejects binary when SHA-256 integrity hash mismatches', () => {
    process.env.TRIBUNAL_TEST_EXPECTED_HASH =
      '0000000000000000000000000000000000000000000000000000000000000000';
    const resolved = getBinaryPath();
    expect(resolved).toBeNull();
  });

  it('nativeValidate does not short-circuit JS schema validation in swarm_dispatcher', () => {
    const { validatePayload } = require('../../.agent/scripts/swarm_dispatcher');
    // An invalid payload should still be rejected by JS Zod validation
    const invalidPayload = { invalid: true };
    const tempPayloadFile = path.join(os.tmpdir(), `test-payload-${Date.now()}.json`);
    fs.writeFileSync(tempPayloadFile, JSON.stringify(invalidPayload));

    try {
      const result = validatePayload(
        invalidPayload,
        process.cwd(),
        path.join(process.cwd(), '.agent', 'agents'),
        tempPayloadFile,
      );
      expect(result).toBe(false);
    } finally {
      if (fs.existsSync(tempPayloadFile)) {
        fs.unlinkSync(tempPayloadFile);
      }
    }
  });
});
