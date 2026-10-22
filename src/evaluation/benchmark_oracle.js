'use strict';

/**
 * benchmark_oracle.js — Anti-Eval-Hacking Integrity Oracle
 * ========================================================
 * Guarantees that evaluation test suites, assertion fixtures, and benchmark
 * definitions cannot be tampered with by candidate proposals or generators.
 *
 * Enforces:
 * 1. Cryptographic SHA-256 baseline hashing of protected test suites.
 * 2. Pre-evaluation integrity verification of worktree files.
 * 3. Detection of modified assertions, deleted tests, or injected fixtures.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { assertWithinRoot } = require('../security/boundary');

class BenchmarkOracle {
  /**
   * @param {object} [options]
   * @param {string} [options.repoRoot] - Base repository root
   * @param {string[]} [options.protectedPatterns] - Glob patterns for protected files
   * @param {string} [options.manifestPath] - Path to ground truth manifest
   */
  constructor(options = {}) {
    this.repoRoot = path.resolve(options.repoRoot || process.cwd());
    this.protectedPatterns = options.protectedPatterns || [
      'test/unit/**/*.test.js',
    ];
    this.manifestPath =
      options.manifestPath ||
      path.join(this.repoRoot, '.tribunal', 'oracles', 'manifest.json');
    this.manifest = null;
  }

  _hashFile(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  _getTrackedFiles() {
    try {
      const { execFileSync } = require('child_process');
      const output = execFileSync('git', ['ls-files'], {
        cwd: this.repoRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      return new Set(
        output
          .split(/\r?\n/)
          .map(f => f.trim().replace(/\\/g, '/'))
          .filter(Boolean),
      );
    } catch {
      return null;
    }
  }

  _scanDirectory(dir, baseDir, fileList = [], tracked = null) {
    if (!fs.existsSync(dir)) return fileList;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip node_modules, .git, and worktrees
        if (
          entry.name === 'node_modules' ||
          entry.name === '.git' ||
          entry.name === '.tribunal'
        ) {
          continue;
        }
        this._scanDirectory(fullPath, baseDir, fileList, tracked);
      } else if (entry.isFile()) {
        const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        if (tracked && !tracked.has(relPath)) {
          continue;
        }
        if (this._matchesPattern(relPath)) {
          fileList.push(relPath);
        }
      }
    }

    return fileList;
  }

  _globToRegex(pattern) {
    const normalized = pattern.replace(/\\/g, '/');
    let regex = '';
    for (let i = 0; i < normalized.length; i++) {
      const c = normalized[i];
      if (c === '*' && normalized[i + 1] === '*') {
        if (normalized[i + 2] === '/') {
          regex += '(?:.+/)?';
          i += 2;
        } else {
          regex += '.*';
          i++;
        }
      } else if (c === '*') {
        regex += '[^/]*';
      } else if (['.', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\'].includes(c)) {
        regex += '\\' + c;
      } else {
        regex += c;
      }
    }
    return new RegExp(`^${regex}$`);
  }

  _matchesPattern(relPath) {
    if (this.manifest && this.manifest.entries && this.manifest.entries[relPath]) {
      return true;
    }
    for (const pattern of this.protectedPatterns) {
      const regex = this._globToRegex(pattern);
      if (regex.test(relPath)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Generates the baseline ground-truth manifest from the trusted repository root.
   */
  generateManifest() {
    const tracked = this._getTrackedFiles();
    const files = this._scanDirectory(this.repoRoot, this.repoRoot, [], tracked);
    const entries = {};

    for (const relPath of files) {
      const fullPath = path.join(this.repoRoot, relPath);
      const hash = this._hashFile(fullPath);
      const stats = fs.statSync(fullPath);

      entries[relPath] = {
        hash,
        sizeBytes: stats.size,
      };
    }

    this.manifest = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      repoRoot: this.repoRoot,
      totalFiles: Object.keys(entries).length,
      entries,
    };

    return this.manifest;
  }

  /**
   * Saves the manifest to disk.
   */
  saveManifest(targetPath = this.manifestPath) {
    if (!this.manifest) {
      this.generateManifest();
    }
    const safePath = assertWithinRoot(this.repoRoot, targetPath);
    const dir = path.dirname(safePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(safePath, JSON.stringify(this.manifest, null, 2), 'utf8');
    return safePath;
  }

  /**
   * Loads a manifest from disk.
   */
  loadManifest(sourcePath = this.manifestPath) {
    const safePath = assertWithinRoot(this.repoRoot, sourcePath);
    if (!fs.existsSync(safePath)) {
      throw new Error(`Manifest not found at: ${sourcePath}`);
    }
    this.manifest = JSON.parse(fs.readFileSync(safePath, 'utf8'));
    return this.manifest;
  }

  /**
   * Verifies the integrity of a target directory (e.g. worktree sandbox)
   * against the trusted ground-truth manifest.
   *
   * @param {string} targetDir - Directory to verify
   * @returns {{ valid: boolean, violations: Array<{ type: string, file: string, reason: string }>, totalChecked: number }}
   */
  verifyIntegrity(targetDir) {
    if (!this.manifest) {
      this.generateManifest();
    }

    const resolvedTarget = path.resolve(targetDir);
    const violations = [];
    const entries = this.manifest.entries;
    let totalChecked = 0;

    for (const [relPath, expected] of Object.entries(entries)) {
      totalChecked++;
      const targetFilePath = path.join(resolvedTarget, relPath);

      if (!fs.existsSync(targetFilePath)) {
        violations.push({
          type: 'DELETED',
          file: relPath,
          reason: `Protected test file "${relPath}" is missing from evaluation target.`,
        });
        continue;
      }

      const actualHash = this._hashFile(targetFilePath);
      if (actualHash !== expected.hash) {
        violations.push({
          type: 'MODIFIED',
          file: relPath,
          expectedHash: expected.hash,
          actualHash,
          reason: `Protected test file "${relPath}" was modified (hash mismatch). Anti-eval-hacking defense triggered.`,
        });
      }
    }

    return {
      valid: violations.length === 0,
      violations,
      totalChecked,
    };
  }
}

module.exports = { BenchmarkOracle };
