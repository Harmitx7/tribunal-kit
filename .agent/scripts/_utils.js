/**
 * _utils.js — Tribunal Kit Shared Utilities
 * ════════════════════════════════════════════════════════════════
 * Single source of truth for all shared utility functions.
 * Import this module instead of duplicating helpers.
 *
 * Usage:
 *   const { findAgentDir, walkDir, loadJson } = require('./_utils');
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { RED, RESET } = require("./_colors");

// ── Default Skip Directories ────────────────────────────────────────────────
const DEFAULT_SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".agent",
  "__pycache__",
  ".venv",
  "venv",
  "coverage",
  ".turbo",
  ".svelte-kit",
  ".nuxt",
  ".output",
]);

// ── Default Source Extensions ───────────────────────────────────────────────
const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".rs",
  ".go",
  ".java",
  ".cs",
  ".rb",
  ".vue",
  ".svelte",
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
    const candidate = path.join(current, ".agent");
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
  return fs.existsSync(path.join(dir, "package.json"));
}

/**
 * Load and parse a JSON file safely. Returns null on failure.
 * @param {string} filePath - Absolute path to the JSON file.
 * @returns {object|null}
 */
function loadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
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
      if (e.isDirectory() && !skipDirs.has(e.name))
        _count(path.join(d, e.name));
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
    flags[key] = def.default ?? (def.type === "boolean" ? false : null);
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "-h" || arg === "--help") {
      flags.help = true;
      continue;
    }

    if (arg.startsWith("--")) {
      const flagName = arg.slice(2);
      const schemaDef = schema[flagName];

      if (schemaDef && schemaDef.type === "boolean") {
        flags[flagName] = true;
      } else if (schemaDef && i + 1 < argv.length) {
        const val = argv[++i];
        flags[flagName] = schemaDef.type === "number" ? Number(val) : val;
      } else {
        // Unknown flag, store as boolean
        flags[flagName] = true;
      }
    } else if (arg.startsWith("-") && arg.length === 2) {
      // Short flag — treat as boolean
      flags[arg.slice(1)] = true;
    } else {
      positional.push(arg);
    }
  }

  return { flags, positional };
}

// ── Command Runner ──────────────────────────────────────────────────────────

/**
 * Run a command synchronously and return a structured result.
 * Handles Windows .cmd shims automatically.
 *
 * @param {string} cmd - Command to run
 * @param {string[]} args - Arguments
 * @param {object} [opts] - spawnSync options (cwd, timeout, etc.)
 * @returns {{ status: number, stdout: string, stderr: string, ok: boolean }}
 */
function runCommand(cmd, args = [], opts = {}) {
  const { spawnSync } = require("child_process");
  const executable =
    process.platform === "win32" &&
    !cmd.endsWith(".cmd") &&
    !cmd.includes(path.sep)
      ? `${cmd}.cmd`
      : cmd;

  const result = spawnSync(executable, args, {
    encoding: "utf8",
    timeout: opts.timeout || 120000,
    cwd: opts.cwd || process.cwd(),
    shell: process.platform === "win32",
    stdio: opts.stdio || "pipe",
    ...opts,
  });

  return {
    status: result.status ?? 1,
    stdout: (result.stdout || "").toString(),
    stderr: (result.stderr || "").toString(),
    ok: result.status === 0,
  };
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
  runCommand,
};
