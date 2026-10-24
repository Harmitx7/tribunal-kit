#!/usr/bin/env node
'use strict';
/**
 * tribunal-kit CLI Core (TypeScript version)
 *
 * Commands are lazy-loaded: only the invoked command's module is require()'d.
 * This means `tk status` loads ~4 files instead of ~17, cutting startup I/O by ~70%.
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.main = main;
const logger_1 = require('./utils/logger');
const helpers_1 = require('./utils/helpers');
const PKG = require('../package.json');
const CURRENT_VERSION = PKG.version;
// ── Arg Parser ───────────────────────────────────────────
function parseArgs(argv) {
  const args = { command: null, flags: {} };
  const raw = argv.slice(2);
  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i];
    if (!arg.startsWith('-')) {
      if (!args.command) {
        args.command = arg;
      }
      continue;
    }
    if (arg === '--version' || arg === '-v') {
      args.flags.version = true;
      if (!args.command) {
        args.command = '--version';
      }
    } else if (arg === '--force') {
      args.flags.force = true;
    } else if (arg === '--quiet') {
      args.flags.quiet = true;
    } else if (arg === '--verbose') {
      args.flags.verbose = true;
    } else if (arg === '--dry-run') {
      args.flags.dryRun = true;
    } else if (arg === '--minimal') {
      args.flags.minimal = true;
    } else if (arg.startsWith('--profile=')) {
      args.flags.profile = arg.split('=').slice(1).join('=');
    } else if (arg === '--profile') {
      const nextVal = raw[++i];
      args.flags.profile = nextVal || 'full';
    } else if (arg === '--skip-update-check') {
      args.flags.skipUpdateCheck = true;
    } else if (arg === '--write') {
      args.flags.write = true;
    } else if (arg === '--head') {
      args.flags.head = true;
    } else if (arg.startsWith('--path=')) {
      args.flags.path = arg.split('=').slice(1).join('=');
    } else if (arg === '--path') {
      const nextVal = raw[++i];
      if (!nextVal || nextVal.startsWith('--')) {
        console.error(`  \x1b[91m✖ --path requires a directory argument\x1b[0m`);
        process.exit(1);
      }
      args.flags.path = nextVal;
    } else if (arg.startsWith('--file=')) {
      args.flags.file = arg.split('=').slice(1).join('=');
    } else if (arg === '--file') {
      const nextVal = raw[++i];
      if (!nextVal || nextVal.startsWith('--')) {
        console.error(`  \x1b[91m✖ --file requires an argument\x1b[0m`);
        process.exit(1);
      }
      args.flags.file = nextVal;
    } else if (arg.startsWith('--target=')) {
      args.flags.target = arg.split('=').slice(1).join('=');
    } else if (arg === '--target') {
      const nextVal = raw[++i];
      if (!nextVal || nextVal.startsWith('--')) {
        console.error(`  \x1b[91m✖ --target requires an argument\x1b[0m`);
        process.exit(1);
      }
      args.flags.target = nextVal;
    } else if (arg.startsWith('--branch=')) {
      args.flags.branch = arg.split('=').slice(1).join('=');
    } else if (arg === '--branch') {
      args.flags.branch = raw[++i];
    } else if (arg.startsWith('--log=')) {
      args.flags.log = arg.split('=').slice(1).join('=');
    } else if (arg === '--log') {
      args.flags.log = raw[++i];
    } else if (arg.startsWith('--strategy=')) {
      args.flags.strategy = arg.split('=').slice(1).join('=');
    } else if (arg === '--strategy') {
      args.flags.strategy = raw[++i];
    } else if (arg.startsWith('--fuzz-depth=')) {
      args.flags['fuzz-depth'] = parseInt(arg.split('=').slice(1).join('='), 10);
    } else if (arg === '--fuzz-depth') {
      args.flags['fuzz-depth'] = parseInt(raw[++i], 10);
    } else if (arg.startsWith('--promote=')) {
      args.flags.promote = arg.split('=').slice(1).join('=');
    } else if (arg === '--promote') {
      args.flags.promote = raw[++i];
    } else if (arg === '--status') {
      args.flags.status = true;
    } else if (arg === '--json') {
      args.flags.json = true;
    } else if (arg === '--sandbox') {
      args.flags.sandbox = true;
    } else if (arg === '--no-sandbox') {
      args.flags['no-sandbox'] = true;
    } else if (arg.startsWith('--rounds=')) {
      args.flags.rounds = parseInt(arg.split('=').slice(1).join('='), 10);
    } else if (arg === '--rounds') {
      args.flags.rounds = parseInt(raw[++i], 10);
    } else if (arg.startsWith('--harness=')) {
      args.flags.harness = arg.split('=').slice(1).join('=');
    } else if (arg === '--harness') {
      args.flags.harness = raw[++i];
    } else if (arg.startsWith('--harness-cmd=')) {
      args.flags['harness-cmd'] = arg.split('=').slice(1).join('=');
    } else if (arg === '--harness-cmd') {
      args.flags['harness-cmd'] = raw[++i];
    } else if (arg === '--auto-promote') {
      args.flags['auto-promote'] = true;
    } else if (arg === '--bridge') {
      args.flags.bridge = true;
    } else if (arg === '--no-bridge') {
      args.flags.bridge = false;
    }
  }
  return args;
}
function cmdHelp(quiet = false) {
  (0, helpers_1.banner)(quiet);
  const { color, bold, dim, RGB, GLYPHS } = require('./tui');

  const cmd = (name, desc) =>
    `    ${color(RGB.CYAN, name.padEnd(16))} ${dim(desc)}`;
  const opt = (flag, desc) =>
    `    ${color(RGB.AMBER, flag.padEnd(24))} ${dim(desc)}`;
  const ex = s => `    ${color(RGB.FLAME, '▸')} ${color(RGB.WHITE, s)}`;
  const section = (title, icon = '✦') => {
    console.log();
    console.log(`  ${color(RGB.FLAME, icon)} ${bold(color(RGB.WHITE, title))}`);
    console.log(`  ${dim('─'.repeat(48))}`);
  };

  section('Core Lifecycle & Platform', '⚡');
  console.log(cmd('init', 'Install .agent/ into current workspace'));
  console.log(cmd('status', 'Display high-density architecture cockpit'));
  console.log(cmd('update', 'Re-install to upgrade to latest engine'));
  console.log(cmd('sync', 'Synchronize IDE bridge files (.cursorrules, etc.)'));
  console.log(cmd('guardrail', 'Validate .agent/ integrity & detect drift'));
  console.log(cmd('uninstall', 'Remove .agent/ folder from current project'));

  section('Governance & Architecture Intelligence', '🛡');
  console.log(cmd('validate', 'Verify JSON payloads or .agent/ with 28-reviewer grid'));
  console.log(cmd('arch', 'Architecture Intelligence (map, verify, impact, audit)'));
  console.log(cmd('graph', 'Build and visualize dependency architecture graph'));
  console.log(cmd('contract', 'AI Agent Behavioral Contract Testing (verify, replay)'));
  console.log(cmd('impact-tier', 'Classify task governance impact tier (0-3)'));

  section('Recursive Self-Improvement & Learning', '🏛');
  console.log(cmd('rsi', 'Recursive Self-Improvement Engine (status, run, watch)'));
  console.log(cmd('evolve', 'Continuous Asymmetric Dual-Loop Auto-Tuning'));
  console.log(cmd('learn', 'Evolve project idioms based on git diffs'));
  console.log(cmd('case', 'Case Law Precedent Engine (add, search, list, overrule)'));
  console.log(cmd('memory', '4-Type Taxonomy Persistent Memory Engine'));
  console.log(cmd('mutate', 'Mutation Engine to test test-suite reliability'));
  console.log(cmd('evalopt', 'Adversarial red-teaming & evaluation mutation'));

  section('Agentic Context & Subagent Workflows', '🧠');
  console.log(cmd('marathon', 'Long-running autonomous agent harness'));
  console.log(cmd('sdd', 'Subagent-Driven Development workspace & brief slicing'));
  console.log(cmd('skill-intel', 'Autonomous Skill Intelligence Engine (discover, gate)'));
  console.log(cmd('compile', 'Compile rules into static instructions for CLI agents'));
  console.log(cmd('context', 'Retrieve highly-optimized Context Snapshot for a file'));
  console.log(cmd('align', 'Clean AI outputs (strip slop, collapse lists)'));

  section('Web & Browser Intelligence', '🌐');
  console.log(cmd('browse', 'Token-efficient web reader (pruned to <4k bytes)'));
  console.log(cmd('audit-web', 'Live browser accessibility, console & vitals auditor'));
  console.log(cmd('compare-web', 'Visual regression differ for CI & release gating'));
  console.log(cmd('deconstruct', 'Reverse-engineer live web elements into React TSX'));
  console.log(cmd('heal', 'Runtime Sentinel error hunter & live fix verifier'));

  section('Options & Flags', '⚙');
  console.log(opt('--force', 'Overwrite existing .agent/ folder'));
  console.log(opt('--path <dir>', 'Target specific directory'));
  console.log(opt('--json', 'Emit machine-readable JSON output'));
  console.log(opt('--quiet', 'Suppress all non-essential output'));
  console.log(opt('--verbose', 'Show detailed debug logging'));
  console.log(opt('--dry-run', 'Preview actions without writing disk changes'));
  console.log(opt('--minimal', 'Install core agents & skills only (~13 specialists)'));
  console.log(opt('--version, -v', 'Print installed package version'));

  section('Aliases & Shortcuts', '❯');
  console.log(`    ${color(RGB.CYAN, 'tk')}            ${dim('Shorthand for tribunal-kit (e.g., tk status, tk rsi)')}`);

  section('Key Examples', '💡');
  console.log(ex('tk status'));
  console.log(ex('tk init --force'));
  console.log(ex('tk validate --file payload.json'));
  console.log(ex('tk rsi status'));
  console.log(ex('tk skill-intel "Build payment idempotency API"'));
  console.log(ex('tk case search "useEffect"'));
  console.log(ex('tk marathon init "Implement user billing"'));
  console.log();
}
// ── Lazy Loaders ─────────────────────────────────────────
// Each command module is require()'d only when invoked.
// Running `tk status` loads ~4 files instead of ~17.
function loadCmd(modulePath, exportName) {
  return require(modulePath)[exportName];
}
async function runWithUpdateCheck(command, flags) {
  const shouldSkip = flags.skipUpdateCheck || process.env.TK_SKIP_UPDATE_CHECK === '1';
  if (!shouldSkip && (command === 'init' || command === 'update')) {
    // version.ts is only loaded for init/update — not every command
    const { autoUpdateCheck } = require('./utils/version');
    const originalArgs = process.argv.slice(2);
    const didReInvoke = await autoUpdateCheck(originalArgs, CURRENT_VERSION);
    if (didReInvoke) {
      process.exit(0);
    }
  }
  const quiet = flags.quiet || false;
  switch (command) {
    case 'init': {
      const cmdInit = loadCmd('./commands/init', 'cmdInit');
      await cmdInit(flags, quiet);
      break;
    }
    case 'update': {
      const cmdUpdate = loadCmd('./commands/update', 'cmdUpdate');
      await cmdUpdate(flags);
      break;
    }
    case 'status': {
      const cmdStatus = loadCmd('./commands/status', 'cmdStatus');
      cmdStatus(flags, quiet);
      break;
    }
    case 'learn': {
      const cmdLearn = loadCmd('./commands/learn', 'cmdLearn');
      await cmdLearn(flags, quiet);
      break;
    }
    case 'case': {
      const cmdCase = loadCmd('./commands/case', 'cmdCase');
      await cmdCase(flags, process.argv, quiet);
      break;
    }
    case 'hook': {
      const cmdHook = loadCmd('./commands/hook', 'cmdHook');
      cmdHook(flags);
      break;
    }
    case 'graph': {
      const cmdGraph = loadCmd('./commands/graph', 'cmdGraph');
      await cmdGraph(flags, quiet);
      break;
    }
    case 'arch': {
      const cmdArch = loadCmd('./commands/arch', 'cmdArch');
      await cmdArch(flags, process.argv, quiet);
      break;
    }
    case 'mutate': {
      const cmdMutate = loadCmd('./commands/mutate', 'cmdMutate');
      await cmdMutate(flags, process.argv);
      break;
    }
    case 'context': {
      const cmdContext = loadCmd('./commands/context', 'cmdContext');
      cmdContext(flags, process.argv);
      break;
    }
    case 'sync': {
      const cmdSync = loadCmd('./commands/sync', 'cmdSync');
      await cmdSync();
      break;
    }
    case 'align': {
      const cmdAlign = loadCmd('./commands/align', 'cmdAlign');
      await cmdAlign(flags, process.argv, quiet);
      break;
    }
    case 'marathon': {
      const cmdMarathon = loadCmd('./commands/marathon', 'cmdMarathon');
      await cmdMarathon(flags, process.argv, quiet);
      break;
    }
    case 'minimal': {
      const cmdMinimal = loadCmd('./commands/minimal', 'cmdMinimal');
      cmdMinimal(flags, quiet);
      break;
    }
    case 'compile': {
      const cmdCompile = loadCmd('./commands/compile', 'cmdCompile');
      await cmdCompile(flags, quiet);
      break;
    }
    case 'uninstall': {
      const cmdUninstall = loadCmd('./commands/uninstall', 'cmdUninstall');
      cmdUninstall(flags, quiet);
      break;
    }
    case 'memory': {
      const cmdMemory = loadCmd('./commands/memory', 'cmdMemory');
      await cmdMemory(flags, process.argv, quiet);
      break;
    }
    case 'optimize-skill': {
      const cmdOptimizeSkill = loadCmd('./commands/optimize', 'cmdOptimizeSkill');
      await cmdOptimizeSkill(flags, process.argv, quiet);
      break;
    }
    case 'evalopt':
    case 'redteam': {
      const cmdEvalOpt = loadCmd('./commands/evalopt', 'cmdEvalOpt');
      await cmdEvalOpt(flags, process.argv, quiet);
      break;
    }
    case 'evolve':
    case 'auto-tune': {
      const cmdEvolve = loadCmd('./commands/evolve', 'cmdEvolve');
      await cmdEvolve(flags, process.argv, quiet);
      break;
    }
    case 'guardrail': {
      const cmdGuardrail = loadCmd('./commands/guardrail', 'cmdGuardrail');
      await cmdGuardrail(flags, process.argv, quiet);
      break;
    }
    case 'rsi': {
      const cmdRsi = loadCmd('./commands/rsi', 'cmdRsi');
      await cmdRsi(flags, process.argv, quiet);
      break;
    }
    case 'contract': {
      const cmdContract = loadCmd('./commands/contract', 'cmdContract');
      await cmdContract(flags, process.argv, quiet);
      break;
    }
    case 'validate': {
      const cmdValidate = loadCmd('./commands/validate', 'cmdValidate');
      await cmdValidate(flags, quiet);
      break;
    }
    case 'min-context': {
      const cmdMinContext = loadCmd('./commands/native', 'cmdMinContext');
      cmdMinContext(process.argv, quiet);
      break;
    }
    case 'dag-schedule': {
      const cmdDagSchedule = loadCmd('./commands/native', 'cmdDagSchedule');
      cmdDagSchedule(process.argv, quiet);
      break;
    }
    case 'context-compress': {
      const cmdContextCompress = loadCmd('./commands/native', 'cmdContextCompress');
      cmdContextCompress(process.argv, quiet);
      break;
    }
    case 'optimize-step': {
      const cmdOptimizeStep = loadCmd('./commands/native', 'cmdOptimizeStep');
      cmdOptimizeStep(process.argv, quiet);
      break;
    }
    case 'impact-tier': {
      const cmdImpactTier = loadCmd('./commands/native', 'cmdImpactTier');
      await cmdImpactTier(process.argv, quiet);
      break;
    }
    case 'context-rank': {
      const cmdContextRank = loadCmd('./commands/context', 'cmdContextRank');
      cmdContextRank(flags, process.argv, quiet);
      break;
    }
    case 'system1': {
      const cmdSystem1 = loadCmd('./commands/system1', 'cmdSystem1');
      await cmdSystem1(flags, process.argv, quiet);
      break;
    }
    case 'intelligence':
    case 'cases':
    case 'case':
    case 'similar':
    case 'failures':
    case 'risk':
    case 'review-plan':
    case 'evidence-plan':
    case 'reviewer-stats':
    case 'governance-drift':
    case 'simulate-policy':
    case 'policy-proposals': {
      const { cmdIntelligence } = require('./commands/intelligence');
      const realArgs = process.argv.slice(2).filter(a => !a.startsWith('-'));
      // The command is the first non-flag arg; the sub-args are subsequent
      await cmdIntelligence(command, realArgs.slice(1));
      break;
    }
    case 'browse': {
      const cmdBrowse = loadCmd('./commands/browse', 'cmdBrowse');
      await cmdBrowse(flags, process.argv, quiet);
      break;
    }
    case 'audit-web': {
      const cmdAuditWeb = loadCmd('./commands/audit-web', 'cmdAuditWeb');
      await cmdAuditWeb(flags, process.argv, quiet);
      break;
    }
    case 'compare-web': {
      const cmdCompareWeb = loadCmd('./commands/compare-web', 'cmdCompareWeb');
      await cmdCompareWeb(flags, process.argv, quiet);
      break;
    }
    case 'deconstruct': {
      const cmdDeconstruct = loadCmd('./commands/deconstruct', 'cmdDeconstruct');
      await cmdDeconstruct(flags, process.argv, quiet);
      break;
    }
    case 'heal': {
      const cmdHeal = loadCmd('./commands/heal', 'cmdHeal');
      await cmdHeal(flags, process.argv, quiet);
      break;
    }
    case 'review': {
      const cmdReview = loadCmd('./commands/review', 'cmdReview');
      await cmdReview(flags, process.argv, quiet);
      break;
    }
    case 'sdd': {
      const cmdSdd = loadCmd('./commands/sdd', 'cmdSdd');
      await cmdSdd(flags, process.argv, quiet);
      break;
    }
    case 'skill-intel':
    case 'skill-intelligence': {
      const cmdSkillIntel = loadCmd('./commands/skill-intelligence', 'cmdSkillIntel');
      await cmdSkillIntel(flags, process.argv, quiet);
      break;
    }
    case 'help':
    case '--help':
    case '-h':
    case null:
      cmdHelp(quiet);
      break;
    case '--version':
    case '-v':
      (0, logger_1.log)(CURRENT_VERSION);
      break;
    default:
      (0, logger_1.err)(`Unknown command: "${command}"`);
      console.log();
      (0, logger_1.dim)('Run tribunal-kit --help for usage');
      process.exit(1);
  }
}
// ── Main ──────────────────────────────────────────────────
async function main() {
  const { command, flags } = parseArgs(process.argv);
  (0, logger_1.setLogLevels)(flags.quiet || false, flags.verbose || false);
  await runWithUpdateCheck(command, flags);
}
if (require.main === module) {
  main().catch(err => {
    console.error(`\x1b[91m✖ Fatal Error:\x1b[0m ${err.message || err}`);
    process.exit(1);
  });
}
