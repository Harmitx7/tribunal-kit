#!/usr/bin/env node
/**
 * tribunal-kit CLI
 * 
 * Commands:
 *   init    — Install .agent/ into target project
 *   update  — Re-install to get latest changes
 *   status  — Check if .agent/ is installed
 * 
 * Usage:
 *   npx tribunal-kit init
 *   npx tribunal-kit init --force
 *   npx tribunal-kit init --path ./myapp
 *   npx tribunal-kit init --quiet
 *   npx tribunal-kit init --dry-run
 *   tribunal-kit update
 *   tribunal-kit status
 */

const fs = require('fs');
const path = require('path');

// ── Colors ───────────────────────────────────────────────
const C = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    red: '\x1b[91m',
    green: '\x1b[92m',
    yellow: '\x1b[93m',
    cyan: '\x1b[96m',
    gray: '\x1b[90m',
};

function colorize(color, text) {
    return `${C[color]}${text}${C.reset}`;
}

// ── Logging ──────────────────────────────────────────────
let quiet = false;

function log(msg) { if (!quiet) console.log(msg); }
function ok(msg) { if (!quiet) console.log(`  ${colorize('green', '✅')} ${msg}`); }
function warn(msg) { if (!quiet) console.log(`  ${colorize('yellow', '⚠️ ')} ${msg}`); }
function err(msg) { console.error(`  ${colorize('red', '❌')} ${msg}`); }
function dim(msg) { if (!quiet) console.log(`  ${colorize('gray', msg)}`); }

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
        if (arg === '--force') { args.flags.force = true; continue; }
        if (arg === '--quiet') { args.flags.quiet = true; continue; }
        if (arg === '--dry-run') { args.flags.dryRun = true; continue; }
        if (arg.startsWith('--path=')) {
            args.flags.path = arg.split('=').slice(1).join('=');
        }
        if (arg === '--path') {
            const idx = raw.indexOf('--path');
            args.flags.path = raw[idx + 1] || null;
        }
        if (arg.startsWith('--branch=')) {
            args.flags.branch = arg.split('=').slice(1).join('=');
        }
    }

    return args;
}

// ── File Utilities ────────────────────────────────────────
function copyDir(src, dest, dryRun = false) {
    if (!dryRun) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });
    let count = 0;

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            count += copyDir(srcPath, destPath, dryRun);
        } else {
            if (!dryRun) {
                fs.cpSync(srcPath, destPath, { force: true });
            }
            count++;
        }
    }

    return count;
}

function countDir(dir) {
    let count = 0;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
        if (e.isDirectory()) count += countDir(path.join(dir, e.name));
        else count++;
    }
    return count;
}

// ── Kit Source Location ───────────────────────────────────
function getKitAgent() {
    // When installed via npm, the .agent/ folder is next to this script's package
    const kitRoot = path.resolve(__dirname, '..');
    const agentDir = path.join(kitRoot, '.agent');

    if (!fs.existsSync(agentDir)) {
        err(`Kit .agent/ folder not found at: ${agentDir}`);
        err('The package may be corrupted. Try: npm install -g tribunal-kit');
        process.exit(1);
    }

    return agentDir;
}

// ── Banner ────────────────────────────────────────────────
function banner() {
    if (quiet) return;
    console.log();
    console.log(colorize('cyan', colorize('bold', '  Tribunal Anti-Hallucination Agent Kit')));
    console.log(colorize('gray', '  ──────────────────────────────────────'));
    console.log();
}

// ── Commands ──────────────────────────────────────────────
function cmdInit(flags) {
    const agentSrc = getKitAgent();
    const targetDir = flags.path ? path.resolve(flags.path) : process.cwd();
    const agentDest = path.join(targetDir, '.agent');
    const dryRun = flags.dryRun || false;

    banner();

    if (dryRun) {
        log(colorize('yellow', '  DRY RUN — no files will be written'));
        console.log();
    }

    // Check target exists
    if (!fs.existsSync(targetDir)) {
        err(`Target directory not found: ${targetDir}`);
        process.exit(1);
    }

    // Check if .agent already exists
    if (fs.existsSync(agentDest) && !flags.force) {
        warn('.agent/ already exists in this project.');
        dim('Use --force to overwrite:  tribunal-kit init --force');
        console.log();
        process.exit(0);
    }

    // Count what we're installing
    const totalFiles = countDir(agentSrc);
    dim(`Installing ${totalFiles} files → ${agentDest}`);

    try {
        const copied = copyDir(agentSrc, agentDest, dryRun);

        console.log();
        if (dryRun) {
            ok(`DRY RUN complete — would install ${copied} files`);
            dim(`Target: ${agentDest}`);
        } else {
            ok(`Installation complete — ${copied} files installed`);
            dim(`Location: ${agentDest}`);
        }
        console.log();

        if (!dryRun) {
            log(colorize('bold', '  What was installed:'));
            dim(`  Agents:    ${fs.readdirSync(path.join(agentDest, 'agents')).length} specialist agents`);
            dim(`  Workflows: ${fs.readdirSync(path.join(agentDest, 'workflows')).length} slash commands`);
            dim(`  Skills:    ${fs.readdirSync(path.join(agentDest, 'skills')).length} skill modules`);
            dim(`  Scripts:   ${fs.readdirSync(path.join(agentDest, 'scripts')).length} utility scripts`);
            console.log();
            log(colorize('gray', '  Your AI IDE will pick this up automatically.'));
            log(colorize('gray', '  Type /generate, /review, /tribunal-full in the chat.'));
        }

        console.log();
    } catch (e) {
        err(`Failed to install: ${e.message}`);
        process.exit(1);
    }
}

function cmdUpdate(flags) {
    // Update = init with --force
    flags.force = true;
    if (!quiet) {
        log(colorize('cyan', '  Updating .agent/ to latest version...'));
        console.log();
    }
    cmdInit(flags);
}

function cmdStatus(flags) {
    const targetDir = flags.path ? path.resolve(flags.path) : process.cwd();
    const agentDest = path.join(targetDir, '.agent');

    banner();

    if (!fs.existsSync(agentDest)) {
        log(`  ${colorize('red', '🔴')} Not installed in: ${targetDir}`);
        console.log();
        dim('Run: tribunal-kit init');
        console.log();
        return;
    }

    log(`  ${colorize('green', '🟢')} Installed at: ${agentDest}`);
    console.log();

    const subdirs = ['agents', 'workflows', 'skills', 'scripts'];
    for (const sub of subdirs) {
        const subPath = path.join(agentDest, sub);
        if (fs.existsSync(subPath)) {
            const count = fs.readdirSync(subPath).filter(f => !fs.statSync(path.join(subPath, f)).isDirectory()).length;
            dim(`  ${sub.padEnd(12)} ${count} files`);
        }
    }
    console.log();
}

function cmdHelp() {
    banner();
    console.log(colorize('bold', '  Commands:'));
    console.log();
    console.log(`    ${colorize('cyan', 'init')}      Install .agent/ into current project`);
    console.log(`    ${colorize('cyan', 'update')}    Re-install to get latest version`);
    console.log(`    ${colorize('cyan', 'status')}    Check if .agent/ is installed`);
    console.log();
    console.log(colorize('bold', '  Options:'));
    console.log();
    console.log(`    ${colorize('gray', '--force')}       Overwrite existing .agent/ folder`);
    console.log(`    ${colorize('gray', '--path <dir>')}  Install in specific directory`);
    console.log(`    ${colorize('gray', '--quiet')}       Suppress all output`);
    console.log(`    ${colorize('gray', '--dry-run')}     Preview actions without executing`);
    console.log();
    console.log(colorize('bold', '  Examples:'));
    console.log();
    console.log(`    ${colorize('gray', 'npx tribunal-kit init')}`);
    console.log(`    ${colorize('gray', 'npx tribunal-kit init --force')}`);
    console.log(`    ${colorize('gray', 'npx tribunal-kit init --path ./my-app')}`);
    console.log(`    ${colorize('gray', 'npx tribunal-kit init --dry-run')}`);
    console.log(`    ${colorize('gray', 'npx tribunal-kit update')}`);
    console.log(`    ${colorize('gray', 'npx tribunal-kit status')}`);
    console.log();
}

// ── Main ──────────────────────────────────────────────────
const { command, flags } = parseArgs(process.argv);

if (flags.quiet) quiet = true;

switch (command) {
    case 'init':
        cmdInit(flags);
        break;
    case 'update':
        cmdUpdate(flags);
        break;
    case 'status':
        cmdStatus(flags);
        break;
    case 'help':
    case '--help':
    case '-h':
    case null:
        cmdHelp();
        break;
    default:
        err(`Unknown command: "${command}"`);
        console.log();
        dim('Run tribunal-kit --help for usage');
        process.exit(1);
}
