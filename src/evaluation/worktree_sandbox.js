'use strict';

/**
 * worktree_sandbox.js — Phase 1: Ephemeral Git Worktree Sandbox
 * ==============================================================
 * Provides isolated, disposable Git worktrees for candidate mutation,
 * independent test execution, and safe evaluation.
 *
 * Enforces:
 * 1. Filesystem containment via assertWithinRoot.
 * 2. Dedicated ephemeral git branches (rsie/<uuid>).
 * 3. Execution time limits and automatic cleanup.
 * 4. Zero pollution of the host working tree.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync, spawnSync } = require('child_process');
const { assertWithinRoot, validateResourceId } = require('../security/boundary');

class WorktreeSandbox {
  /**
   * @param {object} [options]
   * @param {string} [options.repoRoot] - Root of the git repository
   * @param {string} [options.sandboxBase] - Directory to store worktrees (default: .tribunal/worktrees)
   * @param {number} [options.timeoutMs] - Default command execution timeout in ms (default: 60000)
   * @param {string} [options.baseCommit] - Git commit/ref to base the worktree on (default: 'HEAD')
   */
  constructor(options = {}) {
    this.repoRoot = options.repoRoot || this._findRepoRoot();
    this.sandboxBase =
      options.sandboxBase || path.join(this.repoRoot, '.tribunal', 'worktrees');
    this.timeoutMs = options.timeoutMs || 60000;
    this.baseCommit = options.baseCommit || 'HEAD';

    this.sandboxId = null;
    this.branch = null;
    this.worktreePath = null;
    this.destroyed = false;
  }

  _findRepoRoot() {
    try {
      const gitRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      if (gitRoot && fs.existsSync(gitRoot)) {
        return gitRoot;
      }
    } catch {
      // Fallback to searching upwards for .git
    }

    let current = process.cwd();
    while (true) {
      if (fs.existsSync(path.join(current, '.git'))) {
        return current;
      }
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
    return process.cwd();
  }

  /**
   * Creates the ephemeral Git worktree and branch.
   */
  async create() {
    if (this.worktreePath) {
      throw new Error('Sandbox already created.');
    }

    this.sandboxId = `rsie-${crypto.randomBytes(6).toString('hex')}`;
    validateResourceId(this.sandboxId);
    this.branch = `rsie/${this.sandboxId}`;

    fs.mkdirSync(this.sandboxBase, { recursive: true });

    // Protect sandboxBase with .gitignore if not present
    const gitignorePath = path.join(this.sandboxBase, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(gitignorePath, '*\n', 'utf8');
    }

    const targetPath = path.join(this.sandboxBase, this.sandboxId);
    this.worktreePath = assertWithinRoot(this.repoRoot, targetPath);

    // Create the Git worktree with a new dedicated branch
    try {
      execFileSync(
        'git',
        ['worktree', 'add', '-b', this.branch, this.worktreePath, this.baseCommit],
        {
          cwd: this.repoRoot,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );
    } catch (err) {
      throw new Error(`Failed to create git worktree: ${err.stderr || err.message}`);
    }

    // Link node_modules so tests can run in the worktree without full re-installation
    const parentNodeModules = path.join(this.repoRoot, 'node_modules');
    const worktreeNodeModules = path.join(this.worktreePath, 'node_modules');

    if (fs.existsSync(parentNodeModules) && !fs.existsSync(worktreeNodeModules)) {
      try {
        const isWindows = process.platform === 'win32';
        fs.symlinkSync(
          parentNodeModules,
          worktreeNodeModules,
          isWindows ? 'junction' : 'dir',
        );
      } catch (_) {
        // Non-fatal if junction/symlink fails; modules can still be resolved from parent traversal
      }
    }

    return {
      sandboxId: this.sandboxId,
      branch: this.branch,
      worktreePath: this.worktreePath,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Executes a command inside the sandbox.
   *
   * @param {string} command - Executable to run
   * @param {string[]} [args] - Command arguments
   * @param {object} [options] - Additional spawn options
   * @returns {Promise<{ exitCode: number, stdout: string, stderr: string, durationMs: number, timedOut: boolean, success: boolean }>}
   */
  async runCommand(command, args = [], options = {}) {
    if (!this.worktreePath || this.destroyed) {
      throw new Error('Cannot execute command: Sandbox is not active.');
    }

    const timeout = options.timeoutMs || this.timeoutMs;
    const start = Date.now();

    const env = {
      ...process.env,
      TRIBUNAL_SANDBOX: '1',
      TRIBUNAL_SANDBOX_ID: this.sandboxId,
      TRIBUNAL_SANDBOX_PATH: this.worktreePath,
      ...(options.env || {}),
    };

    const result = spawnSync(command, args, {
      cwd: this.worktreePath,
      encoding: 'utf8',
      timeout,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const durationMs = Date.now() - start;
    const timedOut = Boolean(result.error && result.error.code === 'ETIMEDOUT');
    const exitCode = result.status !== null ? result.status : timedOut ? 124 : 1;

    return {
      exitCode,
      stdout: result.stdout || '',
      stderr: result.stderr || (result.error ? result.error.message : ''),
      durationMs,
      timedOut,
      success: exitCode === 0 && !timedOut,
    };
  }

  /**
   * Cleans up and destroys the ephemeral worktree and branch.
   */
  async destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    if (!this.worktreePath) return;

    // Remove node_modules junction/symlink first to prevent git worktree remove issues
    const worktreeNodeModules = path.join(this.worktreePath, 'node_modules');
    if (fs.existsSync(worktreeNodeModules)) {
      try {
        fs.unlinkSync(worktreeNodeModules);
      } catch (_) {
        try {
          fs.rmSync(worktreeNodeModules, { recursive: true, force: true });
        } catch (_) {}
      }
    }

    // Remove git worktree
    try {
      execFileSync('git', ['worktree', 'remove', '--force', this.worktreePath], {
        cwd: this.repoRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (_) {}

    // Ensure directory is completely removed on disk (handles Windows git leaving empty directory)
    try {
      if (fs.existsSync(this.worktreePath)) {
        fs.rmSync(this.worktreePath, {
          recursive: true,
          force: true,
          maxRetries: 5,
          retryDelay: 50,
        });
      }
    } catch (_) {}

    // Prune worktree metadata
    try {
      execFileSync('git', ['worktree', 'prune'], {
        cwd: this.repoRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (_) {}

    // Delete ephemeral branch
    if (this.branch) {
      try {
        execFileSync('git', ['branch', '-D', this.branch], {
          cwd: this.repoRoot,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        });
      } catch (_) {}
    }
  }

  /**
   * Helper pattern to guarantee cleanup of the sandbox.
   */
  static async withSandbox(options, fn) {
    const sandbox = new WorktreeSandbox(options);
    await sandbox.create();
    try {
      return await fn(sandbox);
    } finally {
      await sandbox.destroy();
    }
  }
}

module.exports = { WorktreeSandbox };
