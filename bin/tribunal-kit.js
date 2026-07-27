#!/usr/bin/env node
/**
 * tribunal-kit CLI (alias: tk)
 *
 * Commands:
 *   init      — Install .agent/ into target project
 *   update    — Re-install to get latest changes
 *   status    — Check if .agent/ is installed
 *   learn     — Evolve project idioms based on git diffs
 *   case      — Manage Case Law precedents
 *   hook      — Install pre-push git hook
 *   uninstall — Remove .agent/ from project
 *   align     — Clean AI outputs & enforce guardrails
 *   compile   — Compile rules for terminal agents
 *   memory    — 4-Type Taxonomy Persistent Memory Engine
 *   guardrail — Validate .agent/ integrity
 *
 * Usage:
 *   npx tribunal-kit init
 *   npx tribunal-kit init --force
 *   npx tribunal-kit init --path ./myapp
 *   npx tribunal-kit init --quiet
 *   npx tribunal-kit init --dry-run
 *   tribunal-kit update
 *   tribunal-kit status
 *   tribunal-kit uninstall
 */

"use strict";

const path = require("path");

// Delegate core execution to the modular dist/ entry point
const { main } = require("../dist/cli.js");

// Utilities re-exported for backwards compatibility with tests
const { compareSemver } = require("../dist/utils/version");
const { copyDir, countDir, isSelfInstall: _isSelfInstall } = require("../dist/utils/fs");
const { CORE_AGENTS, CORE_SKILLS, generateIDEBridges } = require("../dist/commands/init");
const { cmdMarathon: _cmdMarathon } = require("../dist/commands/marathon");

function cmdMarathon(flags, processArgs = process.argv) {
  return _cmdMarathon(flags, processArgs, flags?.quiet || false);
}


const PKG = require(path.resolve(__dirname, "..", "package.json"));

/**
 * Returns true if the target directory IS the tribunal-kit package itself.
 */
function isSelfInstall(targetDir) {
  const kitRoot = path.resolve(__dirname, "..");
  return _isSelfInstall(targetDir, PKG.name, kitRoot);
}

/**
 * CLI Argument Parser for backward compatibility with unit tests.
 */
function parseArgs(argv) {
  const args = { command: null, flags: {} };
  const raw = argv.slice(2);

  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i];
    if (!arg.startsWith("--") && !arg.startsWith("-") && !args.command) {
      args.command = arg;
      continue;
    }
    if (arg === "--force") args.flags.force = true;
    else if (arg === "--quiet") args.flags.quiet = true;
    else if (arg === "--verbose") args.flags.verbose = true;
    else if (arg === "--dry-run") args.flags.dryRun = true;
    else if (arg === "--minimal") args.flags.minimal = true;
    else if (arg === "--token-optimized") args.flags.tokenOptimized = true;
    else if (arg === "--skip-update-check") args.flags.skipUpdateCheck = true;
    else if (arg === "--head") args.flags.head = true;
    else if (arg.startsWith("--path=")) {
      args.flags.path = arg.split("=").slice(1).join("=");
    } else if (arg === "--path" && raw[i + 1] && !raw[i + 1].startsWith("-")) {
      args.flags.path = raw[++i];
    } else if (arg.startsWith("--branch=")) {
      args.flags.branch = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--log=")) {
      args.flags.log = arg.split("=").slice(1).join("=");
    } else if (arg === "--log" && raw[i + 1] && !raw[i + 1].startsWith("-")) {
      args.flags.log = raw[++i];
    } else if (arg.startsWith("--strategy=")) {
      args.flags.strategy = arg.split("=").slice(1).join("=");
    } else if (arg === "--strategy" && raw[i + 1] && !raw[i + 1].startsWith("-")) {
      args.flags.strategy = raw[++i];
    }
  }

  return args;
}

// Execute CLI when run directly
if (require.main === module) {
  main();
}

// Module exports for unit test suite backward compatibility
module.exports = {
  parseArgs,
  compareSemver,
  copyDir,
  countDir,
  isSelfInstall,
  CORE_AGENTS,
  CORE_SKILLS,
  generateIDEBridges,
  cmdMarathon,
};
