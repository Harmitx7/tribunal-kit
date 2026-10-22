'use strict';

/**
 * worktree_sandbox.test.js
 * ========================
 * Unit test suite for WorktreeSandbox (Phase 1 RSIE Foundation).
 * Verifies ephemeral Git worktree creation, command execution isolation,
 * containment guarantees, and guaranteed cleanup.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { WorktreeSandbox } = require('../../src/evaluation/worktree_sandbox');

describe('WorktreeSandbox — Phase 1 Ephemeral Worktree Isolation', () => {
  let repoRoot;
  let sandbox;

  beforeAll(() => {
    // Determine the git repo root
    repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
    }).trim();
  });

  afterEach(async () => {
    if (sandbox && !sandbox.destroyed) {
      await sandbox.destroy();
    }
  });

  test('Creates an isolated Git worktree under .tribunal/worktrees with unique branch', async () => {
    sandbox = new WorktreeSandbox({ repoRoot });
    const info = await sandbox.create();

    expect(info.sandboxId).toMatch(/^rsie-[a-f0-9]+$/);
    expect(info.branch).toBe(`rsie/${info.sandboxId}`);
    expect(fs.existsSync(info.worktreePath)).toBe(true);

    // Verify it is recognized by git worktree list
    const worktreeList = execFileSync('git', ['worktree', 'list'], {
      encoding: 'utf8',
      cwd: repoRoot,
    });
    expect(worktreeList).toContain(info.sandboxId);
  });

  test('runCommand executes strictly inside the worktree directory and injects sandbox env', async () => {
    sandbox = new WorktreeSandbox({ repoRoot });
    const info = await sandbox.create();

    // Run node one-liner to print process.cwd() and process.env.TRIBUNAL_SANDBOX
    const script = 'console.log(JSON.stringify({ cwd: process.cwd(), isSandbox: process.env.TRIBUNAL_SANDBOX }))';
    const result = await sandbox.runCommand('node', ['-e', script]);

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout.trim());
    
    // Normalize paths for comparison (Windows casing / slashes)
    expect(path.resolve(parsed.cwd).toLowerCase()).toBe(path.resolve(info.worktreePath).toLowerCase());
    expect(parsed.isSandbox).toBe('1');
  });

  test('File mutations inside worktree do not contaminate main workspace', async () => {
    sandbox = new WorktreeSandbox({ repoRoot });
    const info = await sandbox.create();

    const isolatedFile = path.join(info.worktreePath, 'SANDBOX_MUTATION_TEST.txt');
    const parentFile = path.join(repoRoot, 'SANDBOX_MUTATION_TEST.txt');

    fs.writeFileSync(isolatedFile, 'mutation payload inside sandbox', 'utf8');
    expect(fs.existsSync(isolatedFile)).toBe(true);
    expect(fs.existsSync(parentFile)).toBe(false);
  });

  test('withSandbox automatically cleans up worktree even on unhandled exception', async () => {
    let capturedPath = null;
    let capturedBranch = null;

    await expect(
      WorktreeSandbox.withSandbox({ repoRoot }, async sb => {
        capturedPath = sb.worktreePath;
        capturedBranch = sb.branch;
        expect(fs.existsSync(capturedPath)).toBe(true);
        throw new Error('Simulated sandbox failure during evaluation');
      }),
    ).rejects.toThrow('Simulated sandbox failure during evaluation');

    // Verify worktree directory is removed
    expect(fs.existsSync(capturedPath)).toBe(false);

    // Verify git worktree list no longer contains the branch
    const worktreeList = execFileSync('git', ['worktree', 'list'], {
      encoding: 'utf8',
      cwd: repoRoot,
    });
    expect(worktreeList).not.toContain(capturedPath);
  });

  test('runCommand enforces execution timeout', async () => {
    sandbox = new WorktreeSandbox({ repoRoot, timeoutMs: 1500 });
    await sandbox.create();

    const start = Date.now();
    // Run an infinite or slow loop in node
    const result = await sandbox.runCommand('node', ['-e', 'setTimeout(() => {}, 10000)']);
    const elapsed = Date.now() - start;

    expect(result.exitCode).not.toBe(0);
    expect(result.timedOut).toBe(true);
    expect(elapsed).toBeLessThan(5000);
  });
});
