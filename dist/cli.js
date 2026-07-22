#!/usr/bin/env node
"use strict";
/**
 * tribunal-kit CLI Core (TypeScript version)
 *
 * Commands are lazy-loaded: only the invoked command's module is require()'d.
 * This means `tk status` loads ~4 files instead of ~17, cutting startup I/O by ~70%.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const logger_1 = require("./utils/logger");
const helpers_1 = require("./utils/helpers");
const PKG = require('../package.json');
const CURRENT_VERSION = PKG.version;
// ── Arg Parser ───────────────────────────────────────────
function parseArgs(argv) {
    const args = { command: null, flags: {} };
    const raw = argv.slice(2);
    // First non-flag arg is the command
    for (const arg of raw) {
        if (!arg.startsWith('--') && !args.command) {
            args.command = arg;
            continue;
        }
        if (arg === '--force') {
            args.flags.force = true;
            continue;
        }
        if (arg === '--quiet') {
            args.flags.quiet = true;
            continue;
        }
        if (arg === '--verbose') {
            args.flags.verbose = true;
            continue;
        }
        if (arg === '--dry-run') {
            args.flags.dryRun = true;
            continue;
        }
        if (arg === '--minimal') {
            args.flags.minimal = true;
            continue;
        }
        if (arg === '--skip-update-check') {
            args.flags.skipUpdateCheck = true;
            continue;
        }
        if (arg === '--write') {
            args.flags.write = true;
            continue;
        }
        if (arg === '--head') {
            args.flags.head = true;
            continue;
        }
        if (arg.startsWith('--path=')) {
            args.flags.path = arg.split('=').slice(1).join('=');
        }
        if (arg === '--path') {
            const idx = raw.indexOf('--path');
            const nextVal = raw[idx + 1];
            if (!nextVal || nextVal.startsWith('--')) {
                console.error(`  \x1b[91m✖ --path requires a directory argument\x1b[0m`);
                process.exit(1);
            }
            args.flags.path = nextVal;
        }
        if (arg.startsWith('--target=')) {
            args.flags.target = arg.split('=').slice(1).join('=');
        }
        if (arg === '--target') {
            const idx = raw.indexOf('--target');
            const nextVal = raw[idx + 1];
            if (!nextVal || nextVal.startsWith('--')) {
                console.error(`  \x1b[91m✖ --target requires an argument\x1b[0m`);
                process.exit(1);
            }
            args.flags.target = nextVal;
        }
        if (arg.startsWith('--branch=')) {
            args.flags.branch = arg.split('=').slice(1).join('=');
        }
    }
    return args;
}
function cmdHelp(quiet = false) {
    (0, helpers_1.banner)(quiet);
    const cmd = (name, desc) => `  ${(0, logger_1.c)('cyan', name.padEnd(10))}  ${(0, logger_1.c)('gray', desc)}`;
    const opt = (flag, desc) => `  ${(0, logger_1.c)('yellow', flag.padEnd(22))}  ${(0, logger_1.c)('gray', desc)}`;
    const ex = (s) => `  ${(0, logger_1.c)('gray', '▸')} ${(0, logger_1.c)('white', s)}`;
    (0, logger_1.log)((0, logger_1.bold)('  Commands'));
    (0, logger_1.log)(`  ${(0, logger_1.c)('gray', '─'.repeat(40))}`);
    (0, logger_1.log)(cmd('init', 'Install .agent/ into current project'));
    (0, logger_1.log)(cmd('update', 'Re-install to get latest version'));
    (0, logger_1.log)(cmd('status', 'Check if .agent/ is installed'));
    (0, logger_1.log)(cmd('learn', 'Evolve project idioms based on git diffs'));
    (0, logger_1.log)(cmd('case', 'Manage Case Law precedents (add, search, list, show, stats, overrule)'));
    (0, logger_1.log)(cmd('graph', 'Build and visualize the architecture graph'));
    (0, logger_1.log)(cmd('mutate', 'Run the Mutation Engine to test test-suite reliability'));
    (0, logger_1.log)(cmd('context', 'Retrieve a highly-optimized Context Snapshot for a file'));
    (0, logger_1.log)(cmd('sync', 'Synchronize IDE bridge files with current rules'));
    (0, logger_1.log)(cmd('align', 'Clean AI outputs (strip slop, collapse lists, validate code traps)'));
    (0, logger_1.log)(cmd('marathon', 'Long-running agent harness (init, status, next, mark)'));
    (0, logger_1.log)(cmd('hook', 'Install pre-push git hook for auto-learning'));
    (0, logger_1.log)(cmd('compile', 'Compile rules into a static instruction file for terminal agents'));
    (0, logger_1.log)(cmd('memory', '4-Type Taxonomy Persistent Memory Engine (store, recall, gc, stats, export)'));
    (0, logger_1.log)(cmd('optimize-skill', 'Optimize project skills actively using SkillOpt validation gates'));
    (0, logger_1.log)(cmd('guardrail', 'Validate .agent/ integrity (phantom refs, count mismatches, drift)'));
    (0, logger_1.log)(cmd('uninstall', 'Remove .agent/ folder from project'));
    console.log();
    (0, logger_1.log)((0, logger_1.bold)('  Options'));
    (0, logger_1.log)(`  ${(0, logger_1.c)('gray', '─'.repeat(40))}`);
    (0, logger_1.log)(opt('--force', 'Overwrite existing .agent/ folder'));
    (0, logger_1.log)(opt('--path <dir>', 'Install in specific directory'));
    (0, logger_1.log)(opt('--target <name>', 'Target terminal agent for compile (e.g. aider)'));
    (0, logger_1.log)(opt('--quiet', 'Suppress all output'));
    (0, logger_1.log)(opt('--verbose', 'Show detailed debug logging'));
    (0, logger_1.log)(opt('--dry-run', 'Preview actions without executing'));
    (0, logger_1.log)(opt('--minimal', 'Install core agents/skills only (~13 agents)'));
    (0, logger_1.log)(opt('--skip-update-check', 'Skip auto-update version check'));
    (0, logger_1.log)(opt('--head', '(learn) Diff against last commit instead of staged'));
    (0, logger_1.log)(opt('--write', '(align) Write aligned output in-place to the target file'));
    console.log();
    (0, logger_1.log)((0, logger_1.bold)('  Aliases'));
    (0, logger_1.log)(`  ${(0, logger_1.c)('gray', '─'.repeat(40))}`);
    (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', 'tk')}  ${(0, logger_1.c)('gray', 'Shorthand for tribunal-kit (e.g., tk init, tk status)')}`);
    console.log();
    (0, logger_1.log)((0, logger_1.bold)('  Examples'));
    (0, logger_1.log)(`  ${(0, logger_1.c)('gray', '─'.repeat(40))}`);
    (0, logger_1.log)(ex('npx tribunal-kit init'));
    (0, logger_1.log)(ex('tk init --force'));
    (0, logger_1.log)(ex('tk init --path ./my-app'));
    (0, logger_1.log)(ex('npx tribunal-kit init --dry-run'));
    (0, logger_1.log)(ex('tk update'));
    (0, logger_1.log)(ex('tk status'));
    (0, logger_1.log)(ex('tk learn'));
    (0, logger_1.log)(ex('tk learn --dry-run'));
    (0, logger_1.log)(ex('tk learn --head'));
    (0, logger_1.log)(ex('tk case add'));
    (0, logger_1.log)(ex('tk case search "useEffect"'));
    (0, logger_1.log)(ex('tk case list'));
    (0, logger_1.log)(ex('tk case show --id 1'));
    (0, logger_1.log)(ex('tk case stats'));
    (0, logger_1.log)(ex('tk case export'));
    (0, logger_1.log)(ex('tk case overrule --id 1'));
    (0, logger_1.log)(ex('tk graph'));
    (0, logger_1.log)(ex('tk mutate src/utils.js "npm test"'));
    (0, logger_1.log)(ex('tk marathon init "Build a todo app"'));
    (0, logger_1.log)(ex('tk marathon status'));
    (0, logger_1.log)(ex('tk marathon next'));
    (0, logger_1.log)(ex('tk marathon mark 5 pass'));
    (0, logger_1.log)(ex('tk hook'));
    (0, logger_1.log)(ex('tk compile'));
    (0, logger_1.log)(ex('echo "Certainly! Here is - item 1" | tk align'));
    (0, logger_1.log)(ex('tk align output.md --write'));
    (0, logger_1.log)(ex('tk memory store --type semantic --content "Uses PostgreSQL" --tags db,orm'));
    (0, logger_1.log)(ex('tk optimize-skill --target project-idioms "npm test"'));
    (0, logger_1.log)(ex('tk memory recall --query "database" --budget 2000'));
    (0, logger_1.log)(ex('tk memory gc'));
    (0, logger_1.log)(ex('tk memory stats'));
    (0, logger_1.log)(ex('tk memory export'));
    (0, logger_1.log)(ex('tk uninstall'));
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
        case 'guardrail': {
            const cmdGuardrail = loadCmd('./commands/guardrail', 'cmdGuardrail');
            await cmdGuardrail(flags, process.argv, quiet);
            break;
        }
        case 'help':
        case '--help':
        case '-h':
        case null:
            cmdHelp(quiet);
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
    main();
}
