#!/usr/bin/env node
/**
 * syscall_registry.js
 * Centralized registry mapping permitted agent syscalls to their underlying script paths.
 * Enforces execution security boundaries.
 */

'use strict';

const path = require('path');
const { spawnSync } = require('child_process');
const { assertWithinRoot } = require('../../src/utils/path_containment');

// Define allowed syscalls and their corresponding scripts with Object.create(null)
const SYSCALL_MAP = Object.create(null);

Object.assign(SYSCALL_MAP, {
  run_audit: {
    script: 'checklist.js',
    allowedArgs: ['--strict', '--fix', '.'],
    allowPaths: true,
  },
  security_scan: {
    script: 'security_scan.js',
    allowedArgs: ['.'],
    allowPaths: true,
  },
  lint_runner: {
    script: 'lint_runner.js',
    allowedArgs: ['--fix', '.'],
    allowPaths: true,
  },
  schema_validator: {
    script: 'schema_validator.js',
    allowedArgs: ['.'],
    allowPaths: true,
  },
  test_runner: {
    script: 'test_runner.js',
    allowedArgs: ['--coverage', '.'],
    allowPaths: true,
  },
  dependency_analyzer: {
    script: 'dependency_analyzer.js',
    allowedArgs: ['--audit', '.'],
    allowPaths: true,
  },
});

// Windows cmd.exe & POSIX shell metacharacter filter
const SHELL_META_CHARS = /[;&|><$`\\%^!"()\r\n]/;

/**
 * Validates and executes a syscall securely.
 * @param {string} syscall - The name of the syscall to execute
 * @param {string[]} args - The arguments passed to the syscall
 * @returns {object} { exitCode: number, stdout: string, stderr: string }
 */
function executeSyscall(syscall, args = []) {
  if (typeof syscall !== 'string' || !Object.hasOwn(SYSCALL_MAP, syscall)) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: `Security Exception: Syscall '${syscall}' is not recognized or permitted.`,
    };
  }

  const config = SYSCALL_MAP[syscall];

  if (!Array.isArray(args)) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: `Security Exception: Arguments must be an array.`,
    };
  }

  // Shell metacharacter check across all arguments
  for (const arg of args) {
    if (typeof arg !== 'string') {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `Security Exception: All arguments must be strings.`,
      };
    }
    if (SHELL_META_CHARS.test(arg)) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `Security Exception: Unsafe shell metacharacters detected in argument: "${arg}"`,
      };
    }
  }

  // Argument validation: allow pre-approved args or validated --target=/--file=
  for (const arg of args) {
    if (config.allowedArgs.includes(arg)) {
      continue;
    }

    if (config.allowPaths && (arg.startsWith('--target=') || arg.startsWith('--file='))) {
      const eqIdx = arg.indexOf('=');
      const targetVal = arg.slice(eqIdx + 1);

      if (!targetVal || targetVal.startsWith('-')) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: `Security Exception: Flag argument "${arg}" cannot have leading dash or empty value.`,
        };
      }

      try {
        assertWithinRoot(process.cwd(), targetVal);
        continue;
      } catch (err) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: `Security Exception: Path traversal or invalid path in "${arg}": ${err.message}`,
        };
      }
    }

    return {
      exitCode: 1,
      stdout: '',
      stderr: `Security Exception: Invalid argument for syscall '${syscall}': "${arg}"`,
    };
  }

  const scriptPath = path.join(__dirname, config.script);

  try {
    const result = spawnSync(process.execPath, [scriptPath, ...args], {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 300000, // 5 minutes max execution time
      shell: false,
    });

    return {
      exitCode: result.status !== null ? result.status : 1,
      stdout: result.stdout || '',
      stderr: result.stderr || (result.error ? result.error.message : ''),
    };
  } catch (err) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: `Syscall execution failed: ${err.message}`,
    };
  }
}

module.exports = {
  SYSCALL_MAP,
  executeSyscall,
};
