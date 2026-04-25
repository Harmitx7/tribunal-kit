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
let verbose = false;

function log(msg)  { if (!quiet) console.log(msg); }
function ok(msg)   { if (!quiet) console.log(`  ${c('green',  '✔')} ${msg}`); }
function warn(msg) { if (!quiet) console.log(`  ${c('yellow', '⚠')}  ${msg}`); }
function err(msg)  { console.error(`  ${c('red', '✖')} ${msg}`); }
function dim(msg)  { if (!quiet) console.log(`  ${c('gray', msg)}`); }
function dbg(msg)  { if (verbose) console.log(`  ${c('gray', '⊡')} ${c('gray', msg)}`); }

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
        if (arg === '--verbose') { args.flags.verbose = true; continue; }
        if (arg === '--dry-run') { args.flags.dryRun = true; continue; }
        if (arg === '--minimal') { args.flags.minimal = true; continue; }
        if (arg === '--skip-update-check') { args.flags.skipUpdateCheck = true; continue; }
        if (arg === '--head') { args.flags.head = true; continue; }
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
        if (arg.startsWith('--branch=')) {
            args.flags.branch = arg.split('=').slice(1).join('=');
        }
    }

    return args;
}

// ── File Utilities ────────────────────────────────────────

// Core agents to install in --minimal mode
const CORE_AGENTS = new Set([
    'backend-specialist.md',
    'frontend-specialist.md',
    'database-architect.md',
    'debugger.md',
    'security-auditor.md',
    'logic-reviewer.md',
    'dependency-reviewer.md',
    'type-safety-reviewer.md',
    'performance-reviewer.md',
    'orchestrator.md',
    'explorer-agent.md',
    'project-planner.md',
    'test-engineer.md',
]);

// Core skills to install in --minimal mode
const CORE_SKILLS = new Set([
    'clean-code', 'architecture', 'testing-patterns', 'systematic-debugging',
    'frontend-design', 'database-design', 'api-patterns', 'nodejs-best-practices',
    'vulnerability-scanner', 'typescript-advanced', 'python-pro', 'nextjs-react-expert',
    'react-specialist', 'performance-profiling', 'lint-and-validate',
]);

function copyDir(src, dest, dryRun = false, filter = null) {
    if (!dryRun) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });
    let count = 0;

    for (const entry of entries) {
        // Apply filter if provided (for --minimal mode)
        if (filter && !filter(entry.name, src)) {
            dbg(`  skip: ${entry.name}`);
            continue;
        }

        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            count += copyDir(srcPath, destPath, dryRun, filter);
        } else {
            if (!dryRun) {
                fs.cpSync(srcPath, destPath, { force: true });
            }
            dbg(`  copy: ${entry.name}`);
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
 * Fetch the latest version from npm registry.
 * Returns the version string (e.g. '4.0.0') or null on failure.
 */
function fetchLatestVersion() {
    return new Promise((resolve) => {
        const req = https.get(
            'https://registry.npmjs.org/tribunal-kit/latest',
            {
                headers: {
                    'Accept': 'application/json',
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
                        const version = json.version || null;
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
        // Build the command pulling from npm registry
        const args = originalArgs.join(' ');
        const cmd = `npx -y tribunal-kit@${latestVersion} ${args}`;

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
████████╗██████╗ ██╗██████╗ ██╗   ██╗███╗   ██╗ █████╗ ██╗      ██╗  ██╗██╗████████╗
╚══██╔══╝██╔══██╗██║██╔══██╗██║   ██║████╗  ██║██╔══██╗██║      ██║ ██╔╝██║╚══██╔══╝
   ██║   ██████╔╝██║██████╔╝██║   ██║██╔██╗ ██║███████║██║█████╗█████╔╝ ██║   ██║   
   ██║   ██╔══██╗██║██╔══██╗██║   ██║██║╚██╗██║██╔══██║██║╚════╝██╔═██╗ ██║   ██║   
   ██║   ██║  ██║██║██████╔╝╚██████╔╝██║ ╚████║██║  ██║███████╗ ██║  ██╗██║   ██║   
   ╚═╝   ╚═╝  ╚═╝╚═╝╚═════╝  ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝ ╚═╝  ╚═╝╚═╝   ╚═╝   `.split('\n').filter(Boolean);
    console.log();
    const maxLen = Math.max(...art.map(line => line.length));
    for (const line of art) {
        let gradientLine = '  ' + C.bold;
        for (let i = 0; i < line.length; i++) {
            const p = maxLen > 1 ? i / (maxLen - 1) : 0;
            // Solid #ff1637 (R: 255, G: 22, B: 55)
            const r = 255;
            const g = 22;
            const b = 55;
            gradientLine += `\x1b[38;2;${r};${g};${b}m${line[i]}`;
        }
        gradientLine += C.reset;
        log(gradientLine);
    }
    console.log();
    // Subtitle strip
    const W   = 84;
    const sub = 'Anti-Hallucination Agent System';
    const sp  = Math.max(0, W - sub.length);
    const centred = ' '.repeat(Math.floor(sp / 2)) + sub + ' '.repeat(Math.ceil(sp / 2));
    const RED_ANSI = '\x1b[38;2;255;22;55m';
    console.log(`  ${RED_ANSI}╔${'═'.repeat(W)}╗${C.reset}`);
    console.log(`  ${RED_ANSI}║${C.reset}${c('gray', centred)}${RED_ANSI}║${C.reset}`);
    console.log(`  ${RED_ANSI}╚${'═'.repeat(W)}╝${C.reset}`);
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

    // ── Backup / Cleanup ────────────────────────────────────
    if (!dryRun && fs.existsSync(agentDest) && flags.force) {
        // Backup the existing subdirectories before overwriting
        const backupDir = path.join(agentDest, '.backups', `backup-${Date.now()}`);
        fs.mkdirSync(backupDir, { recursive: true });

        // PRESERVE_DIRS: user-generated content that must survive updates
        const PRESERVE_DIRS = ['history', 'patterns', 'mcp_config.json'];
        const subdirs = ['agents', 'workflows', 'skills', 'scripts', '.shared', 'rules'];
        for (const sub of subdirs) {
            const subPath = path.join(agentDest, sub);
            if (fs.existsSync(subPath)) {
                // Copy to backup dir
                copyDir(subPath, path.join(backupDir, sub), false);
                fs.rmSync(subPath, { recursive: true, force: true });
            }
        }
        log(`  ${c('gray', '✦ Backed up existing configurations to .agent/.backups/')}`);

        // Verify preserved dirs still exist after cleanup
        for (const kept of PRESERVE_DIRS) {
            const keptPath = path.join(agentDest, kept);
            if (kept.includes('.') ? false : !fs.existsSync(keptPath)) {
                // It's okay if it doesn't exist yet — it'll be created below
            }
        }
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

    // Ensure history dirs exist (Case Law + Skill Evolution)
    if (!dryRun) {
        const caseDir = path.join(agentDest, 'history', 'case-law', 'cases');
        const evoDir  = path.join(agentDest, 'history', 'skill-evolution');
        fs.mkdirSync(caseDir, { recursive: true });
        fs.mkdirSync(evoDir,  { recursive: true });
        const gkCase = path.join(caseDir, '.gitkeep');
        const gkEvo  = path.join(evoDir, '.gitkeep');
        if (!fs.existsSync(gkCase)) fs.writeFileSync(gkCase, '');
        if (!fs.existsSync(gkEvo))  fs.writeFileSync(gkEvo,  '');
    }

    // Count what we're installing
    const isMinimal = flags.minimal || false;
    if (isMinimal) {
        log(`  ${c('yellow','⚡')} ${bold('Minimal mode')} — installing core agents and skills only`);
        console.log();
    }
    const totalFiles = countDir(agentSrc);
    dbg(`Source: ${agentSrc}`);
    dbg(`Target: ${agentDest}`);
    dbg(`Total source files: ${totalFiles}`);
    log(`  ${c('gray','▸')} Scanning ${c('white', String(totalFiles))} files  ${c('gray','→')}  ${c('gray', agentDest)}`);

    try {
        // Build filter for --minimal mode
        const minimalFilter = isMinimal ? (name, parentDir) => {
            const parentName = path.basename(parentDir);
            if (parentName === 'agents') return CORE_AGENTS.has(name);
            if (parentName === 'skills') return CORE_SKILLS.has(name);
            return true; // everything else passes
        } : null;

        const copied = copyDir(agentSrc, agentDest, dryRun, minimalFilter);

        console.log();
        if (dryRun) {
            ok(`${bold('DRY RUN')} complete — would install ${c('cyan', String(copied))} files`);
            dim(`Target: ${agentDest}`);
        } else {
            // ── Success card — W=62, rows padded by plain-text length ──
            const W = 62;
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
            console.log(stepRow('/tribunal-full',  'Run all 16 reviewers in parallel'));
            console.log(plainRow('', () => ''));
            console.log(`  ${c('cyan', '╚' + '═'.repeat(W) + '╝')}`);
            console.log();
            log(`  ${c('gray', '✦ Generating IDE bridge files...')}`);
            generateIDEBridges(targetDir, agentDest, dryRun);
        }

        console.log();
    } catch (e) {
        err(`Failed to install: ${e.message}`);
        process.exit(1);
    }
}

// ── IDE Bridge Files ──────────────────────────────────────
// Each AI IDE reads rules from a different location.
// We generate bridge files that point each IDE at .agent/
function generateIDEBridges(targetDir, agentDest, dryRun = false) {
    const rulesFile = path.join(agentDest, 'rules', 'GEMINI.md');
    let rulesContent = '';
    if (fs.existsSync(rulesFile)) {
        rulesContent = fs.readFileSync(rulesFile, 'utf8');
    }

    // Helper: write a bridge file only if it doesn't already exist
    const writeBridge = (filePath, content, label) => {
        if (dryRun) {
            dbg(`  would create: ${filePath}`);
            return;
        }
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (fs.existsSync(filePath)) {
            dbg(`  skip (exists): ${path.basename(filePath)}`);
            return;
        }
        fs.writeFileSync(filePath, content, 'utf8');
        ok(`${label} → ${c('gray', path.relative(targetDir, filePath))}`);
    };

    // ── 1. Cursor (.cursorrules) ──────────────────────────
    const cursorRules = `# Tribunal Kit — Cursor Bridge
# Auto-generated by tribunal-kit init. Do not edit manually.
# Source: .agent/rules/GEMINI.md

${rulesContent}
`;
    writeBridge(
        path.join(targetDir, '.cursorrules'),
        cursorRules,
        'Cursor'
    );

    // ── 2. Windsurf (.windsurfrules) ─────────────────────
    const windsurfRules = `# Tribunal Kit — Windsurf Bridge
# Auto-generated by tribunal-kit init. Do not edit manually.
# Source: .agent/rules/GEMINI.md

${rulesContent}
`;
    writeBridge(
        path.join(targetDir, '.windsurfrules'),
        windsurfRules,
        'Windsurf'
    );

    // ── 3. Gemini / Antigravity (.gemini/settings.json) ──
    const geminiSettings = JSON.stringify({
        "$schema": "https://raw.githubusercontent.com/anthropics/anthropic-cookbook/main/.gemini/settings.schema.json",
        "rules": [
            { "path": "../.agent/rules/GEMINI.md", "trigger": "always_on" }
        ],
        "agents": { "directory": "../.agent/agents" },
        "skills": { "directory": "../.agent/skills" },
        "workflows": { "directory": "../.agent/workflows" }
    }, null, 2) + '\n';
    writeBridge(
        path.join(targetDir, '.gemini', 'settings.json'),
        geminiSettings,
        'Gemini/Antigravity'
    );

    // ── Also create .gemini/GEMINI.md as a direct rules file ──
    const geminiRulesBridge = `---
trigger: always_on
---

# Tribunal Kit — Gemini Bridge
# Auto-generated by tribunal-kit init.
# Full rules: .agent/rules/GEMINI.md

${rulesContent}
`;
    writeBridge(
        path.join(targetDir, '.gemini', 'GEMINI.md'),
        geminiRulesBridge,
        'Gemini rules'
    );

    // ── 4. GitHub Copilot (.github/copilot-instructions.md) ──
    const copilotInstructions = `# Tribunal Kit — Copilot Bridge
# Auto-generated by tribunal-kit init. Do not edit manually.
# Source: .agent/rules/GEMINI.md

${rulesContent}
`;
    writeBridge(
        path.join(targetDir, '.github', 'copilot-instructions.md'),
        copilotInstructions,
        'GitHub Copilot'
    );

    // ── 5. Claude (.claude/CLAUDE.md) ─────────────────────
    const claudeRules = `# Tribunal Kit — Claude Bridge
# Auto-generated by tribunal-kit init. Do not edit manually.
# Source: .agent/rules/GEMINI.md

${rulesContent}
`;
    writeBridge(
        path.join(targetDir, '.claude', 'CLAUDE.md'),
        claudeRules,
        'Claude'
    );

    console.log();
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


function cmdLearn(flags) {
    const targetDir = flags.path ? path.resolve(flags.path) : process.cwd();
    const agentDest = path.join(targetDir, '.agent');

    if (!fs.existsSync(agentDest)) {
        err('.agent/ not found. Run: npx tribunal-kit init');
        process.exit(1);
    }

    banner();

    const W     = 62;
    const title = '  Tribunal Learn — Supreme Court Mode';
    const trail = ' '.repeat(Math.max(0, W - title.length));
    console.log(`  ${c('cyan', '\u2554' + '\u2550'.repeat(W) + '\u2557')}`);
    console.log(`  ${c('cyan', '\u2551')}${c('bold', c('white', title))}${trail}${c('cyan', '\u2551')}`);
    console.log(`  ${c('cyan', '\u255a' + '\u2550'.repeat(W) + '\u255d')}`);
    console.log();

    const dryRun  = flags.dryRun ? '--dry-run' : '';
    const useHead = flags.head   ? '--head'    : '';
    const { execSync } = require('child_process');

    // Phase 1: Skill Evolution
    log(`  ${c('cyan', '\u229b')} ${bold('Phase 1')} \u2014 Skill Evolution Forge (auto-generating project idioms)`);
    const evoScript = path.join(agentDest, 'scripts', 'skill_evolution.js');
    if (!fs.existsSync(evoScript)) {
        warn('skill_evolution.js not found \u2014 run: npx tribunal-kit update');
    } else {
        try {
            const cmd = `node "${evoScript}" digest ${dryRun} ${useHead}`.trim();
            execSync(cmd, { stdio: 'inherit', cwd: targetDir });
        } catch (e) {
            warn(`Skill Evolution error: ${e.message}`);
        }
    }

    console.log();

    // Phase 2: Case Law prompt
    log(`  ${c('cyan', '\u229b')} ${bold('Phase 2')} \u2014 Case Law Engine (building precedence record)`);
    console.log();
    log(`  ${c('gray','\u25b8')} Record a new rejection precedent:`);
    log(`    ${c('white', 'npx tribunal-kit case add')}`);
    console.log();
    log(`  ${c('gray','\u25b8')} Search existing case law:`);
    log(`    ${c('white', 'npx tribunal-kit case search "your query"')}`);
    console.log();
    log(`  ${c('green', '\u2714')} ${bold('Learn cycle complete.')} Your Tribunal grows smarter with every commit.`);
    console.log();
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
        case 'learn':
            cmdLearn(flags);
            break;
        case 'case':
            cmdCase(flags);
            break;
        case 'hook':
            cmdHook(flags);
            break;
        case 'uninstall':
            cmdUninstall(flags);
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

function cmdCase(flags) {
    const targetDir = flags.path ? path.resolve(flags.path) : process.cwd();
    const agentDest = path.join(targetDir, '.agent');

    if (!fs.existsSync(agentDest)) {
        err('.agent/ not found. Run: npx tribunal-kit init');
        process.exit(1);
    }

    const args = process.argv.slice(3).join(' ');
    if (!args || args === 'help' || args === '--help' || args === '-h') {
        banner();
        log(`  ${c('cyan', '\u2554' + '\u2550'.repeat(60) + '\u2557')}`);
        log(`  ${c('cyan', '\u2551')}${c('bold', c('white', '  Tribunal Case Law Engine \u2014 Supreme Court             '))}${c('cyan', '\u2551')}`);
        log(`  ${c('cyan', '\u255a' + '\u2550'.repeat(60) + '\u255d')}`);
        console.log();
        log(`  ${c('cyan', 'add'.padEnd(10))}  ${c('gray', 'Record a new Case Law rejection pattern')}`);
        log(`  ${c('cyan', 'search'.padEnd(10))}  ${c('gray', 'Search existing cases (e.g., search "query")')}`);
        log(`  ${c('cyan', 'list'.padEnd(10))}  ${c('gray', 'List all recorded case law')}`);
        log(`  ${c('cyan', 'show'.padEnd(10))}  ${c('gray', 'Show full diff for a case (e.g., show --id 1)')}`);
        log(`  ${c('cyan', 'stats'.padEnd(10))}  ${c('gray', 'Show case law stats by domain/verdict')}`);
        log(`  ${c('cyan', 'export'.padEnd(10))}  ${c('gray', 'Export all cases to Markdown')}`);
        log(`  ${c('cyan', 'overrule'.padEnd(10))}  ${c('gray', 'Overrule a past precedent (e.g., overrule --id 1)')}`);
        console.log();
        process.exit(1);
    }

    const caseLawScript = path.join(agentDest, 'scripts', 'case_law_manager.js');

    // Make shorthand aliases
    let pyArgs = args;
    if (pyArgs.startsWith('add')) pyArgs = pyArgs.replace(/^add/, 'add-case');
    if (pyArgs.startsWith('search')) pyArgs = pyArgs.replace(/^search/, 'search-cases');

    try {
        const { execSync } = require('child_process');
        execSync(`node "${caseLawScript}" ${pyArgs}`, { stdio: 'inherit', cwd: targetDir });
    } catch (e) {
        process.exit(1); // Script already prints errors
    }
}

function cmdHook(flags) {
    const targetDir = flags.path ? path.resolve(flags.path) : process.cwd();
    const gitDir = path.join(targetDir, '.git');
    
    if (!fs.existsSync(gitDir)) {
        err('Not a git repository. Cannot install git hooks here.');
        process.exit(1);
    }
    
    const hooksDir = path.join(gitDir, 'hooks');
    if (!fs.existsSync(hooksDir)) {
        fs.mkdirSync(hooksDir, { recursive: true });
    }
    
    const prePushPath = path.join(hooksDir, 'pre-push');
    const hookScript = `#!/bin/sh\n# Supreme Court - Auto Learn on Push\necho "⚖️  Tribunal Supreme Court: Evolving Skills..."\nnpx tribunal-kit learn --head\n`;
    
    fs.writeFileSync(prePushPath, hookScript, { mode: 0o755 });
    
    console.log();
    log(`  ${c('green', '✔')} Installed pre-push git hook.`);
    log(`  ${c('gray', '▸')} Skill Evolution will now run automatically every time you git push.`);
    console.log();
}

function cmdUninstall(flags) {
    const targetDir = flags.path ? path.resolve(flags.path) : process.cwd();
    const agentDest = path.join(targetDir, '.agent');

    banner();

    if (!fs.existsSync(agentDest)) {
        log(`  ${c('yellow','⚠')} ${bold('.agent/')} is not installed in this project.`);
        console.log();
        return;
    }

    if (flags.dryRun) {
        log(colorize('yellow', '  DRY RUN — would remove:'));
        log(`  ${c('gray','  ╰─')} ${agentDest}`);
        console.log();
        return;
    }

    try {
        fs.rmSync(agentDest, { recursive: true, force: true });
        log(`  ${c('green','✔')} ${bold('.agent/')} has been removed from this project.`);
        console.log();
        log(`  ${c('gray','▸')} To reinstall: ${c('cyan','npx tribunal-kit init')}`);
        console.log();
    } catch (e) {
        err(`Failed to remove .agent/: ${e.message}`);
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
    log(cmd('init',     'Install .agent/ into current project'));
    log(cmd('update',   'Re-install to get latest version'));
    log(cmd('status',   'Check if .agent/ is installed'));
    log(cmd('learn',    'Evolve project idioms based on git diffs'));
    log(cmd('case',     'Manage Case Law precedents (add, search, list, show, stats, overrule)'));
    log(cmd('hook',     'Install pre-push git hook for auto-learning'));
    log(cmd('uninstall','Remove .agent/ folder from project'));
    console.log();
    log(bold('  Options'));
    log(`  ${c('gray','─'.repeat(40))}`);
    log(opt('--force',              'Overwrite existing .agent/ folder'));
    log(opt('--path <dir>',         'Install in specific directory'));
    log(opt('--quiet',              'Suppress all output'));
    log(opt('--verbose',            'Show detailed debug logging'));
    log(opt('--dry-run',            'Preview actions without executing'));
    log(opt('--minimal',            'Install core agents/skills only (~13 agents)'));
    log(opt('--skip-update-check',  'Skip auto-update version check'));
    log(opt('--head',               '(learn) Diff against last commit instead of staged'));
    console.log();
    log(bold('  Aliases'));
    log(`  ${c('gray','─'.repeat(40))}`);
    log(`  ${c('cyan', 'tk')}  ${c('gray', 'Shorthand for tribunal-kit (e.g., tk init, tk status)')}`);
    console.log();
    log(bold('  Examples'));
    log(`  ${c('gray','─'.repeat(40))}`);
    log(ex('npx tribunal-kit init'));
    log(ex('tk init --force'));
    log(ex('tk init --path ./my-app'));
    log(ex('npx tribunal-kit init --dry-run'));
    log(ex('tk update'));
    log(ex('tk status'));
    log(ex('tk learn'));
    log(ex('tk learn --dry-run'));
    log(ex('tk learn --head'));
    log(ex('tk case add'));
    log(ex('tk case search "useEffect"'));
    log(ex('tk case list'));
    log(ex('tk case show --id 1'));
    log(ex('tk case stats'));
    log(ex('tk case export'));
    log(ex('tk case overrule --id 1'));
    log(ex('tk hook'));
    log(ex('tk uninstall'));
    console.log();
}

// ── Main ──────────────────────────────────────────────────
const { command, flags } = parseArgs(process.argv);

if (flags.quiet) quiet = true;
if (flags.verbose) verbose = true;

runWithUpdateCheck(command, flags);

// -- Exports (for testing) -- do not remove
if (require.main !== module) {
  module.exports = { parseArgs, compareSemver, copyDir, countDir, isSelfInstall, CORE_AGENTS, CORE_SKILLS, generateIDEBridges };
}
