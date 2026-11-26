'use strict';

const _path = require('path');
const { executeSyscall } = require('../../.agent/scripts/syscall_registry');

describe('TK-SEC-008: Syscall Registry Security & Hardening', () => {
  it('safely rejects prototype property names without unhandled TypeError', () => {
    const r1 = executeSyscall('constructor', []);
    expect(r1.exitCode).toBe(1);
    expect(r1.stderr).toContain('is not recognized or permitted');

    const r2 = executeSyscall('__proto__', []);
    expect(r2.exitCode).toBe(1);
    expect(r2.stderr).toContain('is not recognized or permitted');

    const r3 = executeSyscall('toString', []);
    expect(r3.exitCode).toBe(1);
    expect(r3.stderr).toContain('is not recognized or permitted');
  });

  it('rejects path traversal attempts via --file= and --target=', () => {
    const r1 = executeSyscall('lint_runner', ['--file=../../etc/passwd']);
    expect(r1.exitCode).toBe(1);
    expect(r1.stderr).toContain('Path traversal');

    const r2 = executeSyscall('test_runner', ['--target=../../../windows/system32/cmd.exe']);
    expect(r2.exitCode).toBe(1);
    expect(r2.stderr).toContain('Path traversal');
  });

  it('rejects Windows cmd.exe metacharacters (%, ^, !, ", (, ), newlines)', () => {
    const chars = ['%', '^', '!', '"', '(', ')', '\n', '\r', '&', '|', '>', '<', ';'];
    for (const c of chars) {
      const res = executeSyscall('lint_runner', [`--file=src/foo${c}bar.js`]);
      expect(res.exitCode).toBe(1);
      expect(res.stderr).toContain('Unsafe shell metacharacters detected');
    }
  });

  it('rejects flag injection via leading dash in --file= or --target=', () => {
    const res = executeSyscall('lint_runner', ['--file=--config=evil.js']);
    expect(res.exitCode).toBe(1);
    expect(res.stderr).toContain('cannot have leading dash');
  });

  it('rejects unapproved CLI flags on syscalls', () => {
    const res = executeSyscall('security_scan', ['--unauthorized-flag']);
    expect(res.exitCode).toBe(1);
    expect(res.stderr).toContain('Invalid argument for syscall');
  });

  it('accepts valid contained file paths without shell injection', () => {
    // Valid arguments format should not trigger argument rejection
    const validRelative = 'src/security/boundary.js';
    const res = executeSyscall('security_scan', [`--file=${validRelative}`]);
    // It should not be blocked by the registry argument validator
    expect(res.stderr).not.toContain('Security Exception');
  });
});
