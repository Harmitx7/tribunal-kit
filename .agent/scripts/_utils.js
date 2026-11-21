// @ts-nocheck
/**
 * _utils.js — Tribunal Kit Shared Utilities
 * ════════════════════════════════════════════════════════════════
 * Single source of truth for all shared utility functions.
 * Import this module instead of duplicating helpers.
 *
 * Usage:
 *   const { findAgentDir, walkDir, loadJson } = require('./_utils');
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { RED, RESET } = require('./_colors');

// ── Default Skip Directories ────────────────────────────────────────────────
const DEFAULT_SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.agent',
  '.agents',
  '__pycache__',
  '.venv',
  'venv',
  'coverage',
  '.turbo',
  '.svelte-kit',
  '.nuxt',
  '.output',
  'scratch',
  'target',
  'benchmarks',
  '.tribunal',
]);

// ── Default Source Extensions ───────────────────────────────────────────────
const SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.rs',
  '.go',
  '.java',
  '.cs',
  '.rb',
  '.vue',
  '.svelte',
]);

// ── Agent Directory Discovery ───────────────────────────────────────────────

/**
 * Walk up the directory tree to find the nearest .agent/ folder.
 * @param {string} [startDir] - Directory to start searching from (defaults to cwd).
 * @returns {string} Absolute path to the .agent directory.
 */
function findAgentDir(startDir) {
  let current = path.resolve(startDir || process.cwd());
  const root = path.parse(current).root;

  while (current !== root) {
    const candidate = path.join(current, '.agent');
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
    current = path.dirname(current);
  }

  console.error(
    `${RED}✖ Error: '.agent' directory not found. Please run 'npx tribunal-kit init' first.${RESET}`,
  );
  process.exit(1);
}

// ── Package.json Helpers ────────────────────────────────────────────────────

/**
 * Check if a package.json exists in the given directory.
 * @param {string} dir - Directory to check.
 * @returns {boolean}
 */
function hasNpm(dir) {
  return fs.existsSync(path.join(dir, 'package.json'));
}

/**
 * Load and parse a JSON file safely. Returns null on failure.
 * @param {string} filePath - Absolute path to the JSON file.
 * @returns {object|null}
 */
function loadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

// ── Filesystem Walking ──────────────────────────────────────────────────────

/**
 * Recursively walk a directory tree, yielding file paths.
 * This is the consolidated walker used by all scanning scripts.
 *
 * @param {string} dir - Root directory to walk.
 * @param {object} [opts] - Options.
 * @param {Set<string>} [opts.skipDirs] - Directory names to skip (default: DEFAULT_SKIP_DIRS).
 * @param {Set<string>} [opts.extensions] - Only yield files with these extensions. Null = all files.
 * @param {function(string): boolean} [opts.filter] - Custom filter predicate for file paths.
 * @returns {string[]} Array of absolute file paths.
 */
function walkDir(dir, opts = {}) {
  const skipDirs = opts.skipDirs || DEFAULT_SKIP_DIRS;
  const extensions = opts.extensions || null;
  const filter = opts.filter || null;
  const results = [];

  function _walk(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!skipDirs.has(entry.name)) {
          _walk(fullPath);
        }
      } else if (entry.isFile()) {
        if (extensions) {
          const ext = path.extname(entry.name);
          if (!extensions.has(ext)) continue;
        }
        if (filter && !filter(fullPath)) continue;
        results.push(fullPath);
      }
    }
  }

  _walk(dir);
  return results;
}

/**
 * Count files in a directory recursively (fast — no file content reads).
 * @param {string} dir
 * @param {Set<string>} [skipDirs]
 * @returns {number}
 */
function countFiles(dir, skipDirs = DEFAULT_SKIP_DIRS) {
  let count = 0;
  function _count(d) {
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.isDirectory() && !skipDirs.has(e.name)) _count(path.join(d, e.name));
      else if (e.isFile()) count++;
    }
  }
  _count(dir);
  return count;
}

// ── CLI Argument Parsing ────────────────────────────────────────────────────

/**
 * Parse command-line arguments into a structured object.
 * Supports --flag, --key value, and positional arguments.
 *
 * @param {string[]} argv - process.argv.slice(2)
 * @param {object} [schema] - Flag definitions: { flag: { type: 'boolean'|'string'|'number', default: any } }
 * @returns {{ flags: object, positional: string[] }}
 */
function parseArgs(argv, schema = {}) {
  const flags = {};
  const positional = [];

  // Set defaults
  for (const [key, def] of Object.entries(schema)) {
    flags[key] = def.default ?? (def.type === 'boolean' ? false : null);
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '-h' || arg === '--help') {
      flags.help = true;
      continue;
    }

    if (arg.startsWith('--')) {
      const flagName = arg.slice(2);
      let inlineValue = null;
      if (flagName.includes('=')) {
        const eqIdx = flagName.indexOf('=');
        inlineValue = flagName.slice(eqIdx + 1);
        flagName = flagName.slice(0, eqIdx);
      }
      const schemaDef = schema[flagName];

      if (inlineValue !== null) {
        flags[flagName] =
          schemaDef && schemaDef.type === 'number' ? Number(inlineValue) : inlineValue;
      } else if (schemaDef && schemaDef.type === 'boolean') {
        flags[flagName] = true;
      } else if (schemaDef && i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
        const val = argv[++i];
        flags[flagName] = schemaDef.type === 'number' ? Number(val) : val;
      } else if (!schemaDef && i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
        flags[flagName] = argv[++i];
      } else {
        flags[flagName] = true;
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      // Short flag — treat as boolean
      flags[arg.slice(1)] = true;
    } else {
      positional.push(arg);
    }
  }

  return { flags, positional };
}

// ── Command Runner ──────────────────────────────────────────────────────────

const WINDOWS_CMD_SHIMS = new Set(['npm', 'npx', 'pnpm', 'yarn', 'bun', 'bunx']);

/**
 * Select the executable that should be passed to spawnSync.
 * Only package-manager shims need a .cmd suffix on Windows; native executables
 * such as node, cargo, and git must retain their original names.
 *
 * @param {string} cmd - Command to run
 * @param {string} [platform] - Platform override for deterministic testing
 * @returns {string}
 */
function normalizeCommand(cmd, platform = process.platform) {
  const lowerCaseCommand = cmd.toLowerCase();
  const hasPath = cmd.includes('/') || cmd.includes('\\\\');
  if (
    platform === 'win32' &&
    !hasPath &&
    !lowerCaseCommand.endsWith('.cmd') &&
    WINDOWS_CMD_SHIMS.has(lowerCaseCommand)
  ) {
    return `${cmd}.cmd`;
  }
  return cmd;
}

/**
 * Run a command synchronously and return a structured result.
 * Handles known Windows package-manager shims without rewriting native tools.
 *
 * @param {string} cmd - Command to run
 * @param {string[]} args - Arguments
 * @param {object} [opts] - spawnSync options (cwd, timeout, etc.)
 * @returns {{ status: number, stdout: string, stderr: string, ok: boolean }}
 */
function runCommand(cmd, args = [], opts = {}) {
  const { spawnSync } = require('child_process');
  let executable = cmd;
  const extraPrefix = [];

  if (process.platform === 'win32') {
    const lower = cmd.toLowerCase();
    if (lower === 'npm' || lower === 'npm.cmd') {
      const npmCli = path.join(
        path.dirname(process.execPath),
        'node_modules',
        'npm',
        'bin',
        'npm-cli.js',
      );
      if (fs.existsSync(npmCli)) {
        executable = process.execPath;
        extraPrefix.push(npmCli);
      }
    } else if (lower === 'npx' || lower === 'npx.cmd') {
      const npxCli = path.join(
        path.dirname(process.execPath),
        'node_modules',
        'npm',
        'bin',
        'npx-cli.js',
      );
      if (fs.existsSync(npxCli)) {
        executable = process.execPath;
        extraPrefix.push(npxCli, '--no-install');
      }
    }
  }

  const fullArgs = [...extraPrefix, ...args];

  // TK-SEC-005: Enforce shell: false unconditionally
  const result = spawnSync(executable, fullArgs, {
    encoding: 'utf8',
    timeout: opts.timeout || 120000,
    cwd: opts.cwd || process.cwd(),
    stdio: opts.stdio || 'pipe',
    ...opts,
    shell: false,
  });

  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || (result.error ? result.error.message : ''),
    ok: result.status === 0,
  };
}
// ── Native Binary Resolution ────────────────────────────────────────────────

const crypto = require('crypto');

/**
 * Verify binary integrity using SHA-256 digest against an embedded/manifest hash.
 * @param {string} binPath
 * @returns {boolean}
 */
function verifyBinaryIntegrity(binPath) {
  if (!binPath || typeof binPath !== 'string' || !fs.existsSync(binPath)) {
    return false;
  }
  try {
    if (process.env.TRIBUNAL_TEST_EXPECTED_HASH) {
      const fileBuf = fs.readFileSync(binPath);
      const actualHash = crypto.createHash('sha256').update(fileBuf).digest('hex');
      return actualHash.toLowerCase() === process.env.TRIBUNAL_TEST_EXPECTED_HASH.toLowerCase();
    }

    const checksumsPath = path.resolve(__dirname, '..', '..', 'bin', 'checksums.json');
    if (fs.existsSync(checksumsPath)) {
      const checksums = JSON.parse(fs.readFileSync(checksumsPath, 'utf8'));
      const key = `${process.platform}-${process.arch}`;
      const expected = checksums[key] || checksums[path.basename(binPath)];
      if (expected) {
        const fileBuf = fs.readFileSync(binPath);
        const actualHash = crypto.createHash('sha256').update(fileBuf).digest('hex');
        return actualHash.toLowerCase() === expected.toLowerCase();
      }
    }

    const repoCargoToml = path.resolve(__dirname, '..', '..', 'Cargo.toml');
    const repoTargetDir = path.resolve(__dirname, '..', '..', 'target');
    const cratesTargetDir = path.resolve(__dirname, '..', '..', 'crates', 'core', 'target');
    const resolvedBin = path.resolve(binPath);

    if (
      fs.existsSync(repoCargoToml) &&
      (resolvedBin.startsWith(repoTargetDir) || resolvedBin.startsWith(cratesTargetDir))
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Determine the path to the compiled Rust tribunal-core binary.
 * Resolves exclusively from trusted package locations, never process.cwd() or unverified PATH.
 *
 * @returns {string|null} Absolute path to verified executable or null.
 */
function getBinaryPath() {
  if (
    process.env.TRIBUNAL_FORCE_JS === '1' ||
    process.env.TRIBUNAL_FORCE_JS === 'true' ||
    process.env.TK_DISABLE_RUST === '1'
  ) {
    return null;
  }

  const isWindows = process.platform === 'win32';
  const ext = isWindows ? '.exe' : '';
  const platform = process.platform;
  const arch = process.arch;

  const pkgName = `@tribunal-kit/core-${platform}-${arch}`;
  try {
    const pkgPath = require.resolve(`${pkgName}/package.json`);
    const pkgDir = path.dirname(pkgPath);
    const candidatePaths = [
      path.resolve(pkgDir, `bin/tribunal-core${ext}`),
      path.resolve(pkgDir, `tribunal-core${ext}`),
    ];
    for (const cand of candidatePaths) {
      if (fs.existsSync(cand) && verifyBinaryIntegrity(cand)) {
        return cand;
      }
    }
  } catch {}

  const repoCargoToml = path.resolve(__dirname, '..', '..', 'Cargo.toml');
  if (fs.existsSync(repoCargoToml)) {
    const trustedDevCandidates = [
      path.resolve(__dirname, '..', '..', 'target', 'release', `tribunal-core${ext}`),
      path.resolve(
        __dirname,
        '..',
        '..',
        'crates',
        'core',
        'target',
        'release',
        `tribunal-core${ext}`,
      ),
      path.resolve(__dirname, '..', '..', 'bin', `tribunal-core${ext}`),
    ];
    for (const cand of trustedDevCandidates) {
      if (fs.existsSync(cand) && verifyBinaryIntegrity(cand)) {
        return cand;
      }
    }
  }

  return null;
}

let assertWithinRoot;
try {
  ({ assertWithinRoot } = require('../../src/utils/path_containment'));
} catch {
  try {
    ({ assertWithinRoot } = require('../src/utils/path_containment'));
  } catch {
    try {
      ({ assertWithinRoot } = require(path.resolve(__dirname, '../../src/utils/path_containment')));
    } catch {
      assertWithinRoot = (root, targetPath) => {
        const resRoot = path.resolve(root);
        const resTarget = path.resolve(resRoot, targetPath);
        const rel = path.relative(resRoot, resTarget);
        if (
          rel === '..' ||
          rel.startsWith('..' + path.sep) ||
          rel.startsWith('../') ||
          path.isAbsolute(rel)
        ) {
          throw new Error(
            `Path security violation: Target "${targetPath}" escapes authorized root "${root}".`,
          );
        }
        return resTarget;
      };
    }
  }
}

module.exports = {
  // Agent discovery
  findAgentDir,
  // Package.json
  hasNpm,
  loadJson,
  // Filesystem
  walkDir,
  countFiles,
  DEFAULT_SKIP_DIRS,
  SOURCE_EXTENSIONS,
  // CLI
  parseArgs,
  // Commands
  normalizeCommand,
  runCommand,
  // Native binary resolution
  getBinaryPath,
  // Security
  assertWithinRoot,
};
