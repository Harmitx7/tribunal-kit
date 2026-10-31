'use strict';

/**
 * src/commands/understand.js — Modular CLI Command Handler for Codebase Intelligence
 * ════════════════════════════════════════════════════════════════════════════════════
 * Routes `tk understand` and `tk tribunal-understand` through the canonical engine.
 */

Object.defineProperty(exports, '__esModule', { value: true });

const { runCodebaseIntelligenceCli, resolveRoute } = require('../../.agent/scripts/codebase_intelligence');

exports.cmdUnderstand = cmdUnderstand;
exports.resolveRoute = resolveRoute;

const SUPPORTED_SUBCOMMANDS = [
  'overview',
  'trace',
  'dependencies',
  'relevant-files',
  'impact',
  'dead-code',
  'onboard',
  'prepare',
  'change-impact',
  'investigate',
];
exports.SUPPORTED_SUBCOMMANDS = SUPPORTED_SUBCOMMANDS;


/**
 * Executes codebase intelligence exploration, feature tracing, dependency analysis,
 * impact assessment, dead-code detection, onboarding, and change preparation.
 *
 * @param {Object} [flags] - CLI flags (--depth, --focus, --json, etc.)
 * @param {string[]|string} [rawArgv] - Positional command-line arguments
 * @param {boolean} [quiet] - Whether output is suppressed
 * @returns {Promise<Object>} Execution result envelope
 */
async function cmdUnderstand(flags = {}, rawArgv, quiet = false) {
  let argv = [];
  if (Array.isArray(rawArgv)) {
    const idx = rawArgv.findIndex(a => a === 'understand' || a === 'tribunal-understand');
    if (idx !== -1) {
      argv = rawArgv.slice(idx + 1);
    } else {
      argv = rawArgv;
    }
  } else if (typeof rawArgv === 'string') {
    argv = rawArgv.split(' ').filter(Boolean);
  }

  return runCodebaseIntelligenceCli(argv, flags, quiet);
}

