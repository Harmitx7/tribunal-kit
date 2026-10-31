'use strict';

const {
  assertSafeShellArgs,
  shouldRunInShell,
  parseCommandLine,
} = require('../../src/evolution/coevolution_orchestrator');

describe('Windows Shell Argument Injection Defense (Phase 3 Logic War Room)', () => {
  test('shouldRunInShell correctly identifies batch scripts on win32', () => {
    if (process.platform === 'win32') {
      expect(shouldRunInShell('npm')).toBe(true);
      expect(shouldRunInShell('NPX')).toBe(true);
      expect(shouldRunInShell('build.cmd')).toBe(true);
      expect(shouldRunInShell('test.bat')).toBe(true);
      expect(shouldRunInShell('node')).toBe(false);
      expect(shouldRunInShell('git')).toBe(false);
    } else {
      expect(shouldRunInShell('npm')).toBe(false);
    }
  });

  test('assertSafeShellArgs allows benign arguments', () => {
    expect(() => {
      assertSafeShellArgs('npm', ['test', '--', '--coverage', 'unit/foo.test.js']);
    }).not.toThrow();
  });

  test('assertSafeShellArgs throws on command chaining (& and |)', () => {
    if (process.platform === 'win32') {
      expect(() => {
        assertSafeShellArgs('npm', ['test', '&', 'calc.exe']);
      }).toThrow(/dangerous shell metacharacters/i);

      expect(() => {
        assertSafeShellArgs('npm.cmd', ['test', 'foo | dir']);
      }).toThrow(/dangerous shell metacharacters/i);
    }
  });

  test('assertSafeShellArgs throws on redirection (< and >) and environment expansion (%)', () => {
    if (process.platform === 'win32') {
      expect(() => {
        assertSafeShellArgs('npx', ['run', '>out.txt']);
      }).toThrow(/dangerous shell metacharacters/i);

      expect(() => {
        assertSafeShellArgs('npm', ['install', '%USERPROFILE%']);
      }).toThrow(/dangerous shell metacharacters/i);

      expect(() => {
        assertSafeShellArgs('npx.cmd', ['jest', 'line1\nline2']);
      }).toThrow(/dangerous shell metacharacters/i);
    }
  });

  test('parseCommandLine parses arguments with quotes properly', () => {
    const tokens = parseCommandLine('npm test -- --grep "test name"');
    expect(tokens).toEqual(['npm', 'test', '--', '--grep', 'test name']);
  });
});

