'use strict';

/**
 * benchmark_oracle.test.js
 * ========================
 * Unit tests for BenchmarkOracle (Phase 1 RSIE Anti-Eval-Hacking Defense).
 * Verifies that candidate mutations inside an isolated worktree CANNOT modify
 * test assertions, bypasses, or delete benchmark test files without detection.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { BenchmarkOracle } = require('../../src/evaluation/benchmark_oracle');
const { WorktreeSandbox } = require('../../src/evaluation/worktree_sandbox');

describe('BenchmarkOracle — Anti-Eval-Hacking Integrity Verifier', () => {
  let tmpDir;
  let oracle;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-oracle-test-'));
    // Set up a mock repo structure
    fs.mkdirSync(path.join(tmpDir, 'test', 'unit'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'test', 'unit', 'protected_suite.test.js'),
      'expect(authCheck()).toBe(true);',
      'utf8',
    );
    fs.writeFileSync(
      path.join(tmpDir, 'test', 'unit', 'another_suite.test.js'),
      'expect(sqliBlocked()).toBe(true);',
      'utf8',
    );

    oracle = new BenchmarkOracle({
      repoRoot: tmpDir,
      protectedPatterns: ['test/unit/*.test.js'],
    });
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('Generates cryptographic manifest of protected test suites', () => {
    const manifest = oracle.generateManifest();

    expect(manifest.version).toBe('1.0');
    expect(manifest.entries['test/unit/protected_suite.test.js']).toBeDefined();
    expect(manifest.entries['test/unit/protected_suite.test.js'].hash).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.totalFiles).toBe(2);
  });

  test('verifyIntegrity passes when worktree files match ground-truth manifest', () => {
    oracle.generateManifest();
    // Simulate a target directory that matches
    const result = oracle.verifyIntegrity(tmpDir);

    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  test('verifyIntegrity detects modified test assertions (tampering attempt)', () => {
    oracle.generateManifest();

    // Create a mock worktree copy and modify an assertion
    const worktreeCopy = path.join(tmpDir, 'worktree_mock');
    fs.mkdirSync(path.join(worktreeCopy, 'test', 'unit'), { recursive: true });
    fs.writeFileSync(
      path.join(worktreeCopy, 'test', 'unit', 'protected_suite.test.js'),
      'expect(true).toBe(true); // TAMPERED ASSERTION',
      'utf8',
    );
    fs.writeFileSync(
      path.join(worktreeCopy, 'test', 'unit', 'another_suite.test.js'),
      'expect(sqliBlocked()).toBe(true);',
      'utf8',
    );

    const result = oracle.verifyIntegrity(worktreeCopy);

    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0].type).toBe('MODIFIED');
    expect(result.violations[0].file).toBe('test/unit/protected_suite.test.js');
  });

  test('verifyIntegrity detects deleted test files', () => {
    oracle.generateManifest();

    const worktreeCopy = path.join(tmpDir, 'worktree_mock_deleted');
    fs.mkdirSync(path.join(worktreeCopy, 'test', 'unit'), { recursive: true });
    // Only copy one file, leaving protected_suite.test.js missing
    fs.writeFileSync(
      path.join(worktreeCopy, 'test', 'unit', 'another_suite.test.js'),
      'expect(sqliBlocked()).toBe(true);',
      'utf8',
    );

    const result = oracle.verifyIntegrity(worktreeCopy);

    expect(result.valid).toBe(false);
    const violation = result.violations.find(v => v.file === 'test/unit/protected_suite.test.js');
    expect(violation).toBeDefined();
    expect(violation.type).toBe('DELETED');
  });
});
