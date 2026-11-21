'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { cmdHook, generateHookScript } = require('../../src/commands/hook');
const logger = require('../../src/utils/logger');

describe('Phase 3: Git Pre-Push Hook Windows-Compatibility (#8)', () => {
  let tempRepoDir;

  beforeEach(() => {
    tempRepoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-hook-test-'));
    fs.mkdirSync(path.join(tempRepoDir, '.git'), { recursive: true });
  });

  afterEach(() => {
    if (tempRepoDir && fs.existsSync(tempRepoDir)) {
      fs.rmSync(tempRepoDir, { recursive: true, force: true });
    }
  });

  test('generateHookScript outputs strict LF line endings (no \\r\\n)', () => {
    const script = generateHookScript();

    expect(script).toBeDefined();
    expect(script.includes('\r\n')).toBe(false);
    expect(script.includes('\r')).toBe(false);
    expect(script.startsWith('#!/bin/sh\n')).toBe(true);
    expect(script).toContain('npx tribunal-kit learn --head');
    expect(script).toContain('npx tribunal-kit sync');
  });

  test('cmdHook installs hook into .git/hooks/pre-push with LF line endings', () => {
    const logSpy = jest.spyOn(logger, 'log').mockImplementation(() => {});

    cmdHook({ path: tempRepoDir });

    const hookFile = path.join(tempRepoDir, '.git', 'hooks', 'pre-push');
    expect(fs.existsSync(hookFile)).toBe(true);

    const writtenContent = fs.readFileSync(hookFile, 'utf8');
    expect(writtenContent.includes('\r')).toBe(false);
    expect(writtenContent).toContain('Tribunal Supreme Court: Evolving Skills');

    logSpy.mockRestore();
  });

  test('cmdHook cleanly removes pre-push hook with --uninstall or --remove', () => {
    const logSpy = jest.spyOn(logger, 'log').mockImplementation(() => {});

    // Install first
    cmdHook({ path: tempRepoDir });
    const hookFile = path.join(tempRepoDir, '.git', 'hooks', 'pre-push');
    expect(fs.existsSync(hookFile)).toBe(true);

    // Uninstall
    cmdHook({ path: tempRepoDir, uninstall: true });
    expect(fs.existsSync(hookFile)).toBe(false);

    // Uninstall when already absent should not crash
    expect(() => {
      cmdHook({ path: tempRepoDir, remove: true });
    }).not.toThrow();

    logSpy.mockRestore();
  });

  test('cmdHook handles win32 platform safely without chmod failures', () => {
    const originalPlatform = process.platform;
    const logSpy = jest.spyOn(logger, 'log').mockImplementation(() => {});
    const chmodSpy = jest.spyOn(fs, 'chmodSync');

    try {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });

      cmdHook({ path: tempRepoDir });

      const hookFile = path.join(tempRepoDir, '.git', 'hooks', 'pre-push');
      expect(fs.existsSync(hookFile)).toBe(true);
      // On win32, chmodSync should be skipped to prevent Windows EPERM/permission quirks
      expect(chmodSpy).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
      chmodSpy.mockRestore();
      logSpy.mockRestore();
    }
  });

  test('cmdHook fails fast if target directory is not a git repository', () => {
    const nonGitDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-non-git-'));
    const errSpy = jest.spyOn(logger, 'err').mockImplementation(() => {});
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(code => {
      throw new Error(`process.exit: ${code}`);
    });

    try {
      expect(() => {
        cmdHook({ path: nonGitDir });
      }).toThrow('process.exit: 1');

      expect(errSpy).toHaveBeenCalledWith('Not a git repository. Cannot install git hooks here.');
    } finally {
      fs.rmSync(nonGitDir, { recursive: true, force: true });
      errSpy.mockRestore();
      exitSpy.mockRestore();
    }
  });
});
