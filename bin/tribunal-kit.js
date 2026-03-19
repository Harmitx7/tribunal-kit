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
const https = require('https');
const { execSync } = require('child_process');

const PKG = require(path.resolve(__dirname, '..', 'package.json'));
const CURRENT_VERSION = PKG.version;

// ── Colors ───────────────────────────────────────────────
const C = {
    reset:   '\x1b[0m',
    bold:    '\x1b[1m',
    dim:     '\x1b[2m',
    red:     '\x1b[91m',
    green:   '\x1b[92m',
    yellow:  '\x1b[93m',
    blue:    '\x1b[94m',
    magenta: '\x1b[95m',
    cyan:    '\x1b[96m',
    white:   '\x1b[97m',
    gray:    '\x1b[90m',
    bgCyan:  '\x1b[46m',
};

function colorize(color, text) {
    return `${C[color]}${text}${C.reset}`;
}

function c(color, text) { return `${C[color]}${text}${C.reset}`; }
function bold(text)     { return `${C.bold}${text}${C.reset}`; }

// ── Logging ──────────────────────────────────────────────
let quiet = false;

function log(msg)  { if (!quiet) console.log(msg); }
function ok(msg)   { if (!quiet) console.log(`  ${c('green',  '✔')} ${msg}`); }
function warn(msg) { if (!quiet) console.log(`  ${c('yellow', '⚠')}  ${msg}`); }
function err(msg)  { console.error(`  ${c('red', '✖')} ${msg}`); }
function dim(msg)  { if (!quiet) console.log(`  ${c('gray', msg)}`); }

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
        if (arg === '--skip-update-check') { args.flags.skipUpdateCheck = true; continue; }
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

// ── Version Check & Auto-Update ──────────────────────────

/**
 * Compare two semver strings. Returns:
 *   1 if a > b, -1 if a < b, 0 if equal.
 */
function compareSemver(a, b) {
    const pa = a.replace(/^v/, '').split('.').map(Number);
    const pb = b.replace(/^v/, '').split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        const na = pa[i] || 0;
        const nb = pb[i] || 0;
        if (na > nb) return 1;
        if (na < nb) return -1;
    }
    return 0;
}

/**
 * Fetch the latest version from GitHub Releases.
 * Returns the version string (e.g. '2.4.0') or null on failure.
 */
function fetchLatestVersion() {
    return new Promise((resolve) => {
        const req = https.get(
            'https://api.github.com/repos/Harmitx7/tribunal-kit/releases/latest',
            {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': `tribunal-kit/${CURRENT_VERSION}`
                },
                timeout: 5000
            },
            (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        // GitHub tags usually have a 'v' prefix (e.g., 'v2.4.0')
                        const version = json.tag_name ? json.tag_name.replace(/^v/, '') : null;
                        resolve(version);
                    } catch {
                        resolve(null);
                    }
                });
            }
        );
        req.on('error', () => resolve(null));
        req.on('timeout', () => { req.destroy(); resolve(null); });
    });
}

/**
 * Check for a newer version and re-invoke with @latest if found.
 * Uses TK_SKIP_UPDATE_CHECK env var as recursion guard.
 * Returns true if a re-invoke happened (caller should exit), false otherwise.
 */
async function autoUpdateCheck(originalArgs) {
    // Recursion guard: if we're already a re-invoked process, skip
    if (process.env.TK_SKIP_UPDATE_CHECK === '1') {
        return false;
    }

    const latestVersion = await fetchLatestVersion();

    if (!latestVersion) {
        // Network fail — proceed silently with current version
        return false;
    }

    if (compareSemver(latestVersion, CURRENT_VERSION) <= 0) {
        // Already up to date
        dim(`Version ${CURRENT_VERSION} is up to date.`);
        return false;
    }

    // Newer version available — re-invoke
    log('');
    log(colorize('cyan', `  ⬆ New version available: ${colorize('bold', CURRENT_VERSION)} → ${colorize('bold', latestVersion)}`));
    log(colorize('gray', '  Re-invoking with latest version...'));
    log('');

    try {
        // Build the command pulling directly from GitHub
        const args = originalArgs.join(' ');
        const cmd = `npx -y github:Harmitx7/tribunal-kit#v${latestVersion} ${args}`;

        execSync(cmd, {
            stdio: 'inherit',
            env: { ...process.env, TK_SKIP_UPDATE_CHECK: '1' },
        });
        return true; // Re-invoke succeeded, caller should exit
    } catch (e) {
        warn(`Auto-update failed: ${e.message}`);
        warn('Continuing with current version...');
        return false; // Fall through to current version
    }
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

// ── Self-Install Guard ────────────────────────────────────
/**
 * Returns true if the target directory IS the tribunal-kit package itself.
 * This prevents `init --force` / `update` from deleting the package's own files
 * when run from inside the project directory.
 */
function isSelfInstall(targetDir) {
    const kitRoot = path.resolve(__dirname, '..');
    const resolvedTarget = path.resolve(targetDir);

    // Direct path match
    if (resolvedTarget === kitRoot) return true;

    // Check if the target's package.json is this package
    const targetPkg = path.join(resolvedTarget, 'package.json');
    if (fs.existsSync(targetPkg)) {
        try {
            const targetName = JSON.parse(fs.readFileSync(targetPkg, 'utf8')).name;
            if (targetName === PKG.name) return true;
        } catch {
            // Unreadable package.json — not a match
        }
    }

    return false;
}

// ── Banner ────────────────────────────────────────────────
function banner() {
    if (quiet) return;
    // Big ASCII art (TRIBUNAL-KIT)
    const art = String.raw`
___________      ._____.                       .__             ____  __.__  __   
\__    ___/______|__\_ |__  __ __  ____ _____  |  |           |    |/ _|__|/  |_ 
  |    |  \_  __ \  || __ \|  |  \/    \\__  \ |  |    ______ |      < |  \   __\
  |    |   |  | \/  || \_\ \  |  /   |  \/ __ \|  |__ /_____/ |    |  \|  ||  |  
  |____|   |__|  |__||___  /____/|___|  (____  /____/         |____|__ \__||__|  
                         \/           \/     \/                       \/          `.split('\n').filter(Boolean);
    console.log();
    for (const line of art) log(`  ${c('cyan', bold(line))}`);
    console.log();
    // Subtitle strip
    const W   = 80;
    const sub = 'Anti-Hallucination Agent System';
    const sp  = Math.max(0, W - sub.length);
    const centred = ' '.repeat(Math.floor(sp / 2)) + sub + ' '.repeat(Math.ceil(sp / 2));
    console.log(`  ${c('cyan', '╔' + '═'.repeat(W) + '╗')}`);
    console.log(`  ${c('cyan', '║')}${c('gray', centred)}${c('cyan', '║')}`);
    console.log(`  ${c('cyan', '╚' + '═'.repeat(W) + '╝')}`);
    console.log();
}

// ── Commands ──────────────────────────────────────────────
function cmdInit(flags) {
    const agentSrc = getKitAgent();
    const targetDir = flags.path ? path.resolve(flags.path) : process.cwd();
    const agentDest = path.join(targetDir, '.agent');
    const dryRun = flags.dryRun || false;

    // ── Self-install guard ──────────────────────────────────
    if (isSelfInstall(targetDir)) {
        err('Cannot run init/update inside the tribunal-kit package itself.');
        err(`Target: ${targetDir}`);
        err(`Package: ${path.resolve(__dirname, '..')}`);
        console.log();
        dim('This command is designed to install .agent/ into OTHER projects.');
        dim('Run it from the root of the project you want to set up:');
        dim('  cd /path/to/your-project');
        dim('  npx tribunal-kit init');
        console.log();
        process.exit(1);
    }
    // ────────────────────────────────────────────────────────

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
        log(`  ${c('gray', '▸')} To refresh or update it, run: ${colorize('white', 'tribunal-kit init --force')}`);
        log(`  ${c('gray', '▸')} Or check status with:    ${colorize('cyan', 'tribunal-kit status')}`);
        console.log();
        process.exit(0);
    }

    if (!dryRun && fs.existsSync(agentDest) && flags.force) {
        const subdirs = ['agents', 'workflows', 'skills', 'scripts', '.shared'];
        for (const sub of subdirs) {
            const subPath = path.join(agentDest, sub);
            if (fs.existsSync(subPath)) {
                fs.rmSync(subPath, { recursive: true, force: true });
            }
        }
    }

    // Count what we're installing
    const totalFiles = countDir(agentSrc);
    log(`  ${c('gray','▸')} Scanning ${c('white', String(totalFiles))} files  ${c('gray','→')}  ${c('gray', agentDest)}`);

    try {
        const copied = copyDir(agentSrc, agentDest, dryRun);

        console.log();
        if (dryRun) {
            ok(`${bold('DRY RUN')} complete — would install ${c('cyan', String(copied))} files`);
            dim(`Target: ${agentDest}`);
        } else {
            // ── Success card — W=52, rows padded by plain-text length ──
            const W = 52;
            const agentsCount    = fs.readdirSync(path.join(agentDest, 'agents')).length;
            const workflowsCount = fs.readdirSync(path.join(agentDest, 'workflows')).length;
            const skillsCount    = fs.readdirSync(path.join(agentDest, 'skills')).length;
            const scriptsCount   = fs.readdirSync(path.join(agentDest, 'scripts')).length;

            // Stat rows: compute trailing spaces from plain text so right ║ aligns
            const statRow = (icon, label, val, col) => {
                // emoji JS .length===2 == terminal display width 2 ✓
                const plain = `  ${icon}  ${label.padEnd(10)}${String(val).padStart(3)} installed`;
                const trail = ' '.repeat(Math.max(0, W - plain.length));
                return `  ${c('cyan','║')}  ${icon}  ${c('white',label.padEnd(10))}${c(col,String(val).padStart(3))} ${c('gray','installed')}${trail}${c('cyan','║')}`;
            };
            // Plain-text rows (header / blank)
            const plainRow = (text, wrapFn) => {
                const trail = ' '.repeat(Math.max(0, W - text.length));
                return `  ${c('cyan','║')}${wrapFn(text)}${trail}${c('cyan','║')}`;
            };
            // Next-step rows: fixed cmd column + description
            const stepRow = (cmd, desc) => {
                const plain = `  ${cmd.padEnd(16)}${desc}`;
                const trail = ' '.repeat(Math.max(0, W - plain.length));
                return `  ${c('cyan','║')}  ${c('white',cmd.padEnd(16))}${c('gray',desc)}${trail}${c('cyan','║')}`;
            };

            console.log(`  ${c('green','✔')} ${bold(c('green','Installation complete'))} ${c('gray','—')} ${c('white',String(copied))} files`);
            console.log(`  ${c('gray','  ╰─')} ${c('gray', agentDest)}`);
            console.log();
            console.log(`  ${c('cyan', '╔' + '═'.repeat(W) + '╗')}`);
            console.log(plainRow(`  What's inside:`, s => c('bold', c('white', s))));
            console.log(`  ${c('cyan', '╠' + '═'.repeat(W) + '╣')}`);
            console.log(statRow('🤖', 'Agents',    agentsCount,    'magenta'));
            console.log(statRow('⚡',  'Workflows', workflowsCount, 'yellow'));
            console.log(statRow('🧠', 'Skills',    skillsCount,    'blue'));
            console.log(statRow('🔧', 'Scripts',   scriptsCount,   'green'));
            console.log(`  ${c('cyan', '╠' + '═'.repeat(W) + '╣')}`);
            console.log(plainRow('', () => ''));
            console.log(plainRow(`  Next steps:`, s => c('gray', s)));
            console.log(stepRow('/generate',      'Generate code with anti-hallucination'));
            console.log(stepRow('/review',         'Audit existing code for issues'));
            console.log(stepRow('/tribunal-full',  'Run all 11 reviewers in parallel'));
            console.log(plainRow('', () => ''));
            console.log(`  ${c('cyan', '╚' + '═'.repeat(W) + '╝')}`);
            console.log();
            log(`  ${c('gray', '✦ Your AI IDE will pick up changes automatically.')}`);
        }

        console.log();
    } catch (e) {
        err(`Failed to install: ${e.message}`);
        process.exit(1);
    }
}

function cmdUpdate(flags) {
    // ── Self-install guard (early, before banner) ───────────
    const targetDir = flags.path ? path.resolve(flags.path) : process.cwd();
    if (isSelfInstall(targetDir)) {
        err('Cannot run update inside the tribunal-kit package itself.');
        err(`Target: ${targetDir}`);
        console.log();
        dim('This command is designed to update .agent/ in OTHER projects.');
        dim('Run it from the root of the project you want to update:');
        dim('  cd /path/to/your-project');
        dim('  npx tribunal-kit update');
        console.log();
        process.exit(1);
    }
    // ────────────────────────────────────────────────────────

    // Update = init with --force
    flags.force = true;
    if (!quiet) {
        log(`  ${c('cyan','↻')} ${bold('Updating')} ${c('white','.agent/')} to latest version...`);
        console.log();
    }
    cmdInit(flags);
}

// ── Async Main Wrapper ───────────────────────────────────
async function runWithUpdateCheck(command, flags) {
    const shouldSkip = flags.skipUpdateCheck || process.env.TK_SKIP_UPDATE_CHECK === '1';

    if (!shouldSkip && (command === 'init' || command === 'update')) {
        // Pass through the original args (minus the node/script path)
        const originalArgs = process.argv.slice(2);
        const didReInvoke = await autoUpdateCheck(originalArgs);
        if (didReInvoke) {
            process.exit(0); // Latest version handled it
        }
    }

    // Proceed with current version
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
}

function cmdStatus(flags) {
    const targetDir = flags.path ? path.resolve(flags.path) : process.cwd();
    const agentDest = path.join(targetDir, '.agent');

    banner();

    if (!fs.existsSync(agentDest)) {
        log(`  ${c('red','✖')} ${bold('Not installed')} in this project`);
        console.log();
        log(`  ${c('gray','Run:')} ${c('cyan','npx tribunal-kit init')}`);
        console.log();
        return;
    }

    log(`  ${c('green','✔')} ${bold(c('green','Installed'))}  ${c('gray','→')}  ${c('gray', agentDest)}`);
    console.log();

    const icons   = { agents: '🤖', workflows: '⚡', skills: '🧠', scripts: '🔧' };
    const colors  = { agents: 'magenta', workflows: 'yellow', skills: 'blue', scripts: 'green' };
    const subdirs = ['agents', 'workflows', 'skills', 'scripts'];
    for (const sub of subdirs) {
        const subPath = path.join(agentDest, sub);
        if (fs.existsSync(subPath)) {
            const count = fs.readdirSync(subPath).filter(f => !fs.statSync(path.join(subPath, f)).isDirectory()).length;
            log(`  ${icons[sub]}  ${c(colors[sub], sub.padEnd(12))}${c('white', String(count).padStart(3))} files`);
        }
    }
    console.log();
}

function cmdHelp() {
    banner();
    const cmd  = (name, desc) => `  ${c('cyan', name.padEnd(10))}  ${c('gray', desc)}`;
    const opt  = (flag, desc) => `  ${c('yellow', flag.padEnd(22))}  ${c('gray', desc)}`;
    const ex   = (s)          => `  ${c('gray', '▸')} ${c('white', s)}`;

    log(bold('  Commands'));
    log(`  ${c('gray','─'.repeat(40))}`);
    log(cmd('init',   'Install .agent/ into current project'));
    log(cmd('update', 'Re-install to get latest version'));
    log(cmd('status', 'Check if .agent/ is installed'));
    console.log();
    log(bold('  Options'));
    log(`  ${c('gray','─'.repeat(40))}`);
    log(opt('--force',              'Overwrite existing .agent/ folder'));
    log(opt('--path <dir>',         'Install in specific directory'));
    log(opt('--quiet',              'Suppress all output'));
    log(opt('--dry-run',            'Preview actions without executing'));
    log(opt('--skip-update-check',  'Skip auto-update version check'));
    console.log();
    log(bold('  Examples'));
    log(`  ${c('gray','─'.repeat(40))}`);
    log(ex('npx tribunal-kit init'));
    log(ex('npx tribunal-kit init --force'));
    log(ex('npx tribunal-kit init --path ./my-app'));
    log(ex('npx tribunal-kit init --dry-run'));
    log(ex('npx tribunal-kit update'));
    log(ex('npx tribunal-kit status'));
    console.log();
}

// ── Main ──────────────────────────────────────────────────
const { command, flags } = parseArgs(process.argv);

if (flags.quiet) quiet = true;

runWithUpdateCheck(command, flags);
