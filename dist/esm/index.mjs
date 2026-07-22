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

// ── Lazy command loaders (imported on demand) ────────────
export async function cmdInit(flags, quiet) {
  const mod = require('../commands/init.js');
  return mod.cmdInit(flags, quiet);
}

export async function cmdUpdate(flags) {
  const mod = require('../commands/update.js');
  return mod.cmdUpdate(flags);
}

export function cmdStatus(flags, quiet) {
  const mod = require('../commands/status.js');
  return mod.cmdStatus(flags, quiet);
}

export async function cmdLearn(flags, quiet) {
  const mod = require('../commands/learn.js');
  return mod.cmdLearn(flags, quiet);
}

export async function cmdCase(flags, argv, quiet) {
  const mod = require('../commands/case.js');
  return mod.cmdCase(flags, argv, quiet);
}

export function cmdHook(flags) {
  const mod = require('../commands/hook.js');
  return mod.cmdHook(flags);
}

export async function cmdGraph(flags, quiet) {
  const mod = require('../commands/graph.js');
  return mod.cmdGraph(flags, quiet);
}

export async function cmdMutate(flags, argv) {
  const mod = require('../commands/mutate.js');
  return mod.cmdMutate(flags, argv);
}

export function cmdContext(flags, argv) {
  const mod = require('../commands/context.js');
  return mod.cmdContext(flags, argv);
}

export async function cmdSync() {
  const mod = require('../commands/sync.js');
  return mod.cmdSync();
}

export async function cmdAlign(flags, argv, quiet) {
  const mod = require('../commands/align.js');
  return mod.cmdAlign(flags, argv, quiet);
}

export async function cmdMarathon(flags, argv, quiet) {
  const mod = require('../commands/marathon.js');
  return mod.cmdMarathon(flags, argv, quiet);
}

export async function cmdCompile(flags, quiet) {
  const mod = require('../commands/compile.js');
  return mod.cmdCompile(flags, quiet);
}

export async function cmdMemory(flags, argv, quiet) {
  const mod = require('../commands/memory.js');
  return mod.cmdMemory(flags, argv, quiet);
}

export function cmdUninstall(flags, quiet) {
  const mod = require('../commands/uninstall.js');
  return mod.cmdUninstall(flags, quiet);
}

export async function generateIDEBridges(cwd, agentDest, quiet) {
  const mod = require('../commands/init.js');
  return mod.generateIDEBridges(cwd, agentDest, quiet);
}
