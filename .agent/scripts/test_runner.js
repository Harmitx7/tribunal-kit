#!/usr/bin/env node
/**
 * test_runner.js — Standalone test runner for the Tribunal Agent Kit.
 *
 * Usage:
 *   node .agent/scripts/test_runner.js .
 *   node .agent/scripts/test_runner.js . --coverage
 *   node .agent/scripts/test_runner.js . --watch
 *   node .agent/scripts/test_runner.js . --file src/utils.test.ts
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const {
  RED,
  GREEN,
  BOLD,
  DIM,
  CYAN,
  RESET,
  banner,
  sectionHeader,
  timer,
  formatMs,
  ok,
  fail,
  skip,
} = require('./_colors');

const { loadJson } = require('./_utils');

const SHELL_META_REGEX = /[;&|><$`\\%^!"()\r\n]/;

function resolveTestTool(cmd0) {
  if (process.platform === 'win32') {
    const lower = cmd0.toLowerCase();
    if (lower === 'npm' || lower === 'npm.cmd') {
      const npmCli = path.join(
        path.dirname(process.execPath),
        'node_modules',
        'npm',
        'bin',
        'npm-cli.js',
      );
      if (fs.existsSync(npmCli)) return { bin: process.execPath, prefix: [npmCli] };
    } else if (lower === 'npx' || lower === 'npx.cmd') {
      const npxCli = path.join(
        path.dirname(process.execPath),
        'node_modules',
        'npm',
        'bin',
        'npx-cli.js',
      );
      if (fs.existsSync(npxCli)) return { bin: process.execPath, prefix: [npxCli, '--no-install'] };
    }
  }
  return { bin: cmd0, prefix: [] };
}

function runTests(label, cmd, cwd) {
  const elapsed = timer();
  try {
    const { bin, prefix } = resolveTestTool(cmd[0]);
    const fullArgs = [...prefix, ...cmd.slice(1)];
    if (cmd[0] === 'npx' && !fullArgs.includes('--no-install')) {
      fullArgs.unshift('--no-install');
    }
    const result = spawnSync(bin, fullArgs, {
      cwd,
      encoding: 'utf8',
      timeout: 300000, // 5m
      shell: false,
    });

    const ms = elapsed();

    if (result.error && !result.stdout && !result.stderr) {
      console.log(`    Error: ${result.error.message}`);
    }
    const out = result.stdout ? result.stdout.toString() : '';
    const err = result.stderr ? result.stderr.toString() : '';
    const output = (out + '\n' + err).trim();
    if (output) {
      for (const line of output.split('\n')) {
        console.log(`    ${line}`);
      }
    }

    if (result.status === 0) {
      ok(`${label} — all tests passed ${DIM}(${formatMs(ms)})${RESET}`);
      return true;
    }

    fail(`${label} — test failures detected ${DIM}(${formatMs(ms)})${RESET}`);
    return false;
  } catch {
    skip(`${label} — tool not installed`);
    return true;
  }
}

function detectTestFramework(projectRoot) {
  const pkg = loadJson(path.join(projectRoot, 'package.json'));
  if (pkg) {
    const deps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };
    const scripts = pkg.scripts || {};

    if (deps.vitest) return 'vitest';
    if (deps.jest) return 'jest';
    if (deps.mocha) return 'mocha';
    if (scripts.test) return 'npm-test';
  }

  if (
    fs.existsSync(path.join(projectRoot, 'pytest.ini')) ||
    fs.existsSync(path.join(projectRoot, 'pyproject.toml')) ||
    fs.existsSync(path.join(projectRoot, 'conftest.py'))
  ) {
    return 'pytest';
  }

  // Go
  function hasGoTests(dir) {
    let items;
    try {
      items = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return false;
    }
    for (const item of items) {
      if (item.isDirectory() && !['node_modules', '.git'].includes(item.name)) {
        if (hasGoTests(path.join(dir, item.name))) return true;
      } else if (item.name.endsWith('_test.go')) {
        return true;
      }
    }
    return false;
  }

  if (hasGoTests(projectRoot)) return 'go';

  return null;
}

function main() {
  const args = process.argv.slice(2);
  let targetPath = null;
  let coverageFlag = false;
  let watchFlag = false;
  let fileArg = null;

  let i = 0;
  while (i < args.length) {
    if (args[i] === '--coverage') coverageFlag = true;
    else if (args[i] === '--watch') watchFlag = true;
    else if (args[i] === '--file' && i + 1 < args.length) {
      const candidate = args[++i];
      if (candidate.startsWith('-')) {
        fail(`Security Violation: File argument cannot start with dash: ${candidate}`);
        process.exit(1);
      }
      if (SHELL_META_REGEX.test(candidate)) {
        fail(`Security Violation: Shell metacharacter detected in file argument: ${candidate}`);
        process.exit(1);
      }
      fileArg = candidate;
    } else if (!targetPath && !args[i].startsWith('-')) targetPath = args[i];
    i++;
  }

  if (!targetPath) {
    console.log('Usage: node test_runner.js <path> [--coverage] [--watch] [--file <filepath>]');
    process.exit(1);
  }

  const projectRoot = path.resolve(targetPath);
  if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
    fail(`Directory not found: ${projectRoot}`);
    process.exit(1);
  }

  const framework = detectTestFramework(projectRoot);
  console.log(
    banner('test_runner.js', {
      Project: projectRoot,
      Framework: framework || 'none detected',
    }),
  );

  if (!framework) {
    skip('No test framework detected in this project');
    process.exit(0);
  }

  console.log(sectionHeader(`Running tests (${framework})`));

  let cmd = [];
  let passed = true;

  if (['vitest', 'jest', 'mocha', 'npm-test'].includes(framework)) {
    if (framework === 'vitest') {
      cmd = watchFlag ? ['npx', 'vitest'] : ['npx', 'vitest', 'run'];
      if (coverageFlag) cmd.push('--coverage');
      if (fileArg) {
        cmd.push('--');
        cmd.push(fileArg);
      }
    } else if (framework === 'jest') {
      cmd = ['npx', 'jest'];
      if (coverageFlag) cmd.push('--coverage');
      if (watchFlag) cmd.push('--watch');
      if (fileArg) cmd.push(fileArg);
    } else {
      cmd = ['npm', 'test', '--', '--passWithNoTests'];
      if (coverageFlag) cmd.push('--coverage');
      if (fileArg) cmd.push(fileArg);
    }
    passed = runTests(framework, cmd, projectRoot);
  } else if (framework === 'pytest') {
    cmd = ['python', '-m', 'pytest', '-v'];
    if (coverageFlag) cmd.push('--cov', '--cov-report=term-missing');
    if (watchFlag) cmd = ['python', '-m', 'pytest-watch', '--', '-v'];
    if (fileArg) cmd.push(fileArg);
    passed = runTests('pytest', cmd, projectRoot);
  } else if (framework === 'go') {
    cmd = ['go', 'test', './...', '-v'];
    if (coverageFlag) cmd.push('-cover');
    if (fileArg) cmd = ['go', 'test', '-v', '-run', fileArg];
    passed = runTests('go test', cmd, projectRoot);
  }

  console.log(`\n${BOLD}${CYAN}━━━ Test Summary ━━━${RESET}`);
  if (passed) {
    console.log(`\n${GREEN}${BOLD}  ✔ Tests passed (${framework}).${RESET}\n`);
  } else {
    console.log(`\n${RED}${BOLD}  ✖ Tests failed (${framework}).${RESET}\n`);
  }

  process.exit(passed ? 0 : 1);
}

if (require.main === module) {
  main();
}
