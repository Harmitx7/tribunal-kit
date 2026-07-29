/**
 * tribunal-kit ESM entry point.
 *
 * This thin wrapper re-exports the CJS modules as ESM using createRequire.
 * The actual implementation remains in CommonJS (dist/cli.js) to avoid
 * a full migration while providing ESM compatibility for modern bundlers.
 */

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const cli = require('../cli.js');
const logger = require('../utils/logger.js');
const helpers = require('../utils/helpers.js');

// ── CLI Commands ─────────────────────────────────────────
export const main = cli.main;

// ── Logger Utilities ─────────────────────────────────────
export const C = logger.C;
export const colorize = logger.colorize;
export const c = logger.c;
export const bold = logger.bold;
export const setLogLevels = logger.setLogLevels;
export const log = logger.log;
export const ok = logger.ok;
export const warn = logger.warn;
export const err = logger.err;
export const dim = logger.dim;
export const dbg = logger.dbg;

// ── Helper Utilities ─────────────────────────────────────
export const runShellAsync = helpers.runShellAsync;
export const getKitAgent = helpers.getKitAgent;
export const banner = helpers.banner;

// Helper to wrap CommonJS requires in friendly error diagnostics
function loadCommand(modulePath, functionName, ...args) {
  try {
    const mod = require(modulePath);
    return mod[functionName](...args);
  } catch (err) {
    throw new Error(`Tribunal ESM wrapper failed to load command '${functionName}' from '${modulePath}': ${err.message}`);
  }
}

// ── Lazy command loaders (imported on demand) ────────────
export async function cmdInit(flags, quiet) {
  return loadCommand('../commands/init.js', 'cmdInit', flags, quiet);
}

export async function cmdUpdate(flags) {
  return loadCommand('../commands/update.js', 'cmdUpdate', flags);
}

export function cmdStatus(flags, quiet) {
  return loadCommand('../commands/status.js', 'cmdStatus', flags, quiet);
}

export async function cmdLearn(flags, quiet) {
  return loadCommand('../commands/learn.js', 'cmdLearn', flags, quiet);
}

export async function cmdCase(flags, argv, quiet) {
  return loadCommand('../commands/case.js', 'cmdCase', flags, argv, quiet);
}

export function cmdHook(flags) {
  return loadCommand('../commands/hook.js', 'cmdHook', flags);
}

export async function cmdGraph(flags, quiet) {
  return loadCommand('../commands/graph.js', 'cmdGraph', flags, quiet);
}

export async function cmdMutate(flags, argv) {
  return loadCommand('../commands/mutate.js', 'cmdMutate', flags, argv);
}

export function cmdContext(flags, argv) {
  return loadCommand('../commands/context.js', 'cmdContext', flags, argv);
}

export async function cmdSync() {
  return loadCommand('../commands/sync.js', 'cmdSync');
}

export async function cmdAlign(flags, argv, quiet) {
  return loadCommand('../commands/align.js', 'cmdAlign', flags, argv, quiet);
}

export async function cmdMarathon(flags, argv, quiet) {
  return loadCommand('../commands/marathon.js', 'cmdMarathon', flags, argv, quiet);
}

export async function cmdCompile(flags, quiet) {
  return loadCommand('../commands/compile.js', 'cmdCompile', flags, quiet);
}

export async function cmdMemory(flags, argv, quiet) {
  return loadCommand('../commands/memory.js', 'cmdMemory', flags, argv, quiet);
}

export function cmdUninstall(flags, quiet) {
  return loadCommand('../commands/uninstall.js', 'cmdUninstall', flags, quiet);
}

export async function generateIDEBridges(cwd, agentDest, quiet) {
  return loadCommand('../commands/init.js', 'generateIDEBridges', cwd, agentDest, quiet);
}
