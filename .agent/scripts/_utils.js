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
  '__pycache__',
  '.venv',
  'venv',
  'coverage',
  '.turbo',
  '.svelte-kit',
  '.nuxt',
  '.output',
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
      const schemaDef = schema[flagName];

      if (schemaDef && schemaDef.type === 'boolean') {
        flags[flagName] = true;
      } else if (schemaDef && i + 1 < argv.length) {
        const val = argv[++i];
        flags[flagName] = schemaDef.type === 'number' ? Number(val) : val;
      } else {
        // Unknown flag, store as boolean
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
  const executable = normalizeCommand(cmd);

  const result = spawnSync(executable, args, {
    encoding: 'utf8',
    timeout: opts.timeout || 120000,
    cwd: opts.cwd || process.cwd(),
    shell: false,
    stdio: opts.stdio || 'pipe',
    ...opts,
  });

  return {
    status: result.status ?? 1,
    stdout: (result.stdout || '').toString(),
    stderr: (result.stderr || '').toString(),
    ok: result.status === 0,
  };
}

// ── Native Binary Resolution ────────────────────────────────────────────────

/**
 * Determine the path to the compiled Rust tribunal-core binary.
 * Checks environment overrides, bin/wrapper.js, production optionalDependencies,
 * and local dev target directories.
 *
 * @param {string} [startDir]
 * @returns {string|null} Absolute path to executable or null.
 */
function getBinaryPath(startDir) {
  if (process.env.TRIBUNAL_FORCE_JS === '1' || process.env.TRIBUNAL_FORCE_JS === 'true') {
    return null;
  }

  if (process.env.TRIBUNAL_CORE_PATH && fs.existsSync(process.env.TRIBUNAL_CORE_PATH)) {
    return process.env.TRIBUNAL_CORE_PATH;
  }

  // Try wrapper if accessible
  const wrapperCandidates = [
    path.resolve(__dirname, '..', '..', 'bin', 'wrapper.js'),
    path.resolve(__dirname, '..', 'bin', 'wrapper.js'),
    path.resolve(process.cwd(), 'bin', 'wrapper.js'),
    path.resolve(process.cwd(), 'tribunal-kit', 'bin', 'wrapper.js'),
  ];
  for (const candidate of wrapperCandidates) {
    if (fs.existsSync(candidate)) {
      try {
        const wrapper = require(candidate);
        if (typeof wrapper.getBinaryPath === 'function') {
          const bin = wrapper.getBinaryPath();
          if (bin && fs.existsSync(bin)) {
            return bin;
          }
        }
      } catch {}
    }
  }

  const isWindows = process.platform === 'win32';
  const ext = isWindows ? '.exe' : '';
  const platform = process.platform;
  const arch = process.arch;

  // Try optionalDependencies
  const pkgName = `@tribunal-kit/core-${platform}-${arch}`;
  try {
    const pkgPath = require.resolve(`${pkgName}/package.json`);
    const pkgDir = path.dirname(pkgPath);
    const binPath = path.resolve(pkgDir, `bin/tribunal-core${ext}`);
    if (fs.existsSync(binPath)) return binPath;
    const rootBinPath = path.resolve(pkgDir, `tribunal-core${ext}`);
    if (fs.existsSync(rootBinPath)) return rootBinPath;
  } catch {}

  // Direct candidate locations
  const searchRoots = [
    __dirname,
    path.resolve(__dirname, '..'),
    path.resolve(__dirname, '..', '..'),
    process.cwd(),
    path.resolve(process.cwd(), 'tribunal-kit'),
  ];
  if (startDir) searchRoots.unshift(path.resolve(startDir));

  for (const root of searchRoots) {
    const releaseCandidate = path.resolve(root, 'target', 'release', `tribunal-core${ext}`);
    if (fs.existsSync(releaseCandidate)) return releaseCandidate;
    const debugCandidate = path.resolve(root, 'target', 'debug', `tribunal-core${ext}`);
    if (fs.existsSync(debugCandidate)) return debugCandidate;
  }

  return null;
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
};
