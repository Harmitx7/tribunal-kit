#!/usr/bin/env node
/**
 * syscall_registry.js
 * Centralized registry mapping permitted agent syscalls to their underlying script paths.
 * Enforces execution security boundaries.
 */

'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

// Define allowed syscalls and their corresponding scripts
const SYSCALL_MAP = {
  'run_audit': {
    script: 'checklist.js',
    allowedArgs: ['--strict', '--fix', '.']
  },
  'security_scan': {
    script: 'security_scan.js',
    allowedArgs: ['.']
  },
  'lint_runner': {
    script: 'lint_runner.js',
    allowedArgs: ['--fix', '.']
  },
  'schema_validator': {
    script: 'schema_validator.js',
    allowedArgs: ['.']
  },
  'test_runner': {
    script: 'test_runner.js',
    allowedArgs: ['--coverage', '.']
  },
  'dependency_analyzer': {
    script: 'dependency_analyzer.js',
    allowedArgs: ['--audit', '.']
  }
};

/**
 * Validates and executes a syscall securely.
 * @param {string} syscall - The name of the syscall to execute
 * @param {string[]} args - The arguments passed to the syscall
 * @returns {object} { exitCode: number, stdout: string, stderr: string }
 */
function executeSyscall(syscall, args = []) {
  const config = SYSCALL_MAP[syscall];
  
  if (!config) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: `Security Exception: Syscall '${syscall}' is not recognized or permitted.`
    };
  }

  // Argument validation: only allow arguments pre-approved in allowedArgs
  const invalidArgs = args.filter(arg => !config.allowedArgs.includes(arg) && !arg.startsWith('--target=') && !arg.startsWith('--file='));
  if (invalidArgs.length > 0) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: `Security Exception: Invalid arguments for syscall '${syscall}': ${invalidArgs.join(', ')}`
    };
  }

  // Prevent shell metacharacter injection
  const shellMetaChars = /[;&|><$`\\]/;
  const unsafeArgs = args.filter(arg => shellMetaChars.test(arg));
  if (unsafeArgs.length > 0) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: `Security Exception: Unsafe shell metacharacters detected in arguments.`
    };
  }

  const scriptPath = path.join(__dirname, config.script);
  
  try {
    const result = spawnSync('node', [scriptPath, ...args], {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 300000 // 5 minutes max execution time
    });

    return {
      exitCode: result.status !== null ? result.status : 1,
      stdout: result.stdout || '',
      stderr: result.stderr || (result.error ? result.error.message : '')
    };
  } catch (err) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: `Syscall execution failed: ${err.message}`
    };
  }
}

module.exports = {
  SYSCALL_MAP,
  executeSyscall
};
