'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

describe('TK-SEC-003 & TK-SEC-005: Runners Security & Untrusted Workspace Gating', () => {
  const origEnv = process.env;

  beforeEach(() => {
    process.env = { ...origEnv };
    delete process.env.TRIBUNAL_WORKSPACE_TRUST;
    delete process.env.TRIBUNAL_ALLOW_UNTRUSTED_EXEC;
  });

  afterAll(() => {
    process.env = origEnv;
  });

  it('checklist.js skips active linter and test execution in untrusted workspace', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'untrusted-repo-'));
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'untrusted-pkg', scripts: { test: 'exit 1' } }),
    );

    const checklistPath = path.resolve(__dirname, '../../.agent/scripts/checklist.js');
    try {
      // Running without --trusted should skip lint and test execution
      const output = execFileSync(process.execPath, [checklistPath, tempDir], {
        encoding: 'utf8',
      });
      expect(output).toContain('Workspace untrusted: skipped execution');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('checklist.js allows execution when --trusted is explicitly passed', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trusted-repo-'));
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'test-pkg' }));

    const checklistPath = path.resolve(__dirname, '../../.agent/scripts/checklist.js');
    try {
      let output = '';
      try {
        output = execFileSync(process.execPath, [checklistPath, tempDir, '--trusted'], {
          encoding: 'utf8',
        });
      } catch (err) {
        output = (err.stdout || '') + (err.stderr || '');
      }
      // Should not contain untrusted skip message
      expect(output).not.toContain('Workspace untrusted: skipped execution');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('lint_runner.js rejects file arguments starting with leading dash (flag injection)', () => {
    const lintPath = path.resolve(__dirname, '../../.agent/scripts/lint_runner.js');
    try {
      execFileSync(process.execPath, [lintPath, '.', '--files', '--config=evil.js'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      throw new Error('Should have failed');
    } catch (err) {
      const out = (err.stdout || '') + (err.stderr || '');
      expect(out).toContain('cannot start with dash');
    }
  });

  it('lint_runner.js rejects file arguments with Windows shell metacharacters', () => {
    const lintPath = path.resolve(__dirname, '../../.agent/scripts/lint_runner.js');
    try {
      execFileSync(process.execPath, [lintPath, '.', '--files', 'foo&calc.exe'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      throw new Error('Should have failed');
    } catch (err) {
      const out = (err.stdout || '') + (err.stderr || '');
      expect(out).toContain('Shell metacharacter detected');
    }
  });

  it('test_runner.js rejects file arguments starting with leading dash', () => {
    const testPath = path.resolve(__dirname, '../../.agent/scripts/test_runner.js');
    try {
      execFileSync(process.execPath, [testPath, '.', '--file', '-o=bad'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      throw new Error('Should have failed');
    } catch (err) {
      const out = (err.stdout || '') + (err.stderr || '');
      expect(out).toContain('cannot start with dash');
    }
  });

  it('verifies that runner scripts never use shell: true in child process calls', () => {
    const scripts = [
      'checklist.js',
      'lint_runner.js',
      'test_runner.js',
      'verify_all.js',
      '_utils.js',
    ];
    for (const s of scripts) {
      const content = fs.readFileSync(path.resolve(__dirname, '../../.agent/scripts', s), 'utf8');
      expect(content).not.toMatch(
        /shell:\s*(true|isWindows|process\.platform\s*===\s*['"]win32['"]|isCmdShim)/,
      );
    }
  });
});
