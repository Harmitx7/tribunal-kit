"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmdInit = cmdInit;
exports.generateIDEBridges = generateIDEBridges;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
const fs_2 = require("../utils/fs");
const helpers_1 = require("../utils/helpers");
const hasher_1 = require("../utils/hasher");
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
async function cmdInit(flags, quiet = false) {
    const agentSrc = (0, helpers_1.getKitAgent)();
    const targetDir = flags.path ? path_1.default.resolve(flags.path) : process.cwd();
    const agentDest = path_1.default.join(targetDir, '.agent');
    const dryRun = flags.dryRun || false;
    const pkgStr = fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../../package.json'), 'utf8');
    const pkg = JSON.parse(pkgStr);
    // ── Self-install guard ──────────────────────────────────
    if ((0, fs_2.isSelfInstall)(targetDir, pkg.name, path_1.default.resolve(__dirname, '../..'))) {
        (0, logger_1.err)('Cannot run init/update inside the tribunal-kit package itself.');
        (0, logger_1.err)(`Target: ${targetDir}`);
        (0, logger_1.err)(`Package: ${path_1.default.resolve(__dirname, '../..')}`);
        console.log();
        (0, logger_1.dim)('This command is designed to install .agent/ into OTHER projects.');
        (0, logger_1.dim)('Run it from the root of the project you want to set up:');
        (0, logger_1.dim)('  cd /path/to/your-project');
        (0, logger_1.dim)('  npx tribunal-kit init');
        console.log();
        process.exit(1);
    }
    // ────────────────────────────────────────────────────────
    let diff = null;
    let incremental = false;

    if (!dryRun && fs_1.default.existsSync(agentDest) && flags.force) {
        const oldManifest = (0, hasher_1.readManifest)(agentDest);
        if (oldManifest) {
            const newManifest = await (0, hasher_1.generateManifest)(agentSrc);
            diff = (0, hasher_1.diffManifests)(oldManifest, newManifest);
            incremental = true;
            
            const addCount = diff.added.length;
            const changeCount = diff.changed.length;
            const removeCount = diff.removed.length;
            
            (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', '↻')} ${(0, logger_1.bold)('Performing incremental update...')}`);
            
            const addedPart = `${(0, logger_1.c)('green', `[+ ${addCount}]`)} added`;
            const changedPart = `${(0, logger_1.c)('yellow', `[~ ${changeCount}]`)} changed`;
            const removedPart = `${(0, logger_1.c)('red', `[- ${removeCount}]`)} removed`;
            (0, logger_1.log)(`    ${addedPart}   ${changedPart}   ${removedPart}`);
            
            const totalChanges = addCount + changeCount + removeCount;
            if (totalChanges > 0) {
                const maxBarWidth = 30;
                const addPct = Math.round((addCount / totalChanges) * maxBarWidth);
                const changePct = Math.round((changeCount / totalChanges) * maxBarWidth);
                const removePct = Math.max(0, maxBarWidth - addPct - changePct);
                
                const bar = 
                    (0, logger_1.c)('green', '█'.repeat(addPct)) +
                    (0, logger_1.c)('yellow', '█'.repeat(changePct)) +
                    (0, logger_1.c)('red', '█'.repeat(removePct));
                
                (0, logger_1.log)(`    Syncing: [${bar}] ${totalChanges} files`);
            }
            
            // Backup ONLY changed or removed files
            const toBackup = [...diff.changed, ...diff.removed];
            if (toBackup.length > 0) {
                const backupDir = path_1.default.join(agentDest, '.backups', `backup-${Date.now()}`);
                fs_1.default.mkdirSync(backupDir, { recursive: true });
                let backedUpCount = 0;
                for (const file of toBackup) {
                    const srcPath = path_1.default.join(agentDest, file);
                    const destPath = path_1.default.join(backupDir, file);
                    if (fs_1.default.existsSync(srcPath)) {
                        fs_1.default.mkdirSync(path_1.default.dirname(destPath), { recursive: true });
                        fs_1.default.copyFileSync(srcPath, destPath);
                        backedUpCount++;
                    }
                }
                (0, logger_1.log)(`  ${(0, logger_1.c)('gray', '✦')} Backed up ${backedUpCount} modified/removed files ${(0, logger_1.c)('gray', '→')} ${(0, logger_1.c)('gray', '.agent/.backups/')}`);
            }
            
            // Remove removed files
            for (const file of diff.removed) {
                const target = path_1.default.join(agentDest, file);
                if (fs_1.default.existsSync(target)) {
                    fs_1.default.rmSync(target);
                }
            }
        } else {
            // Legacy full backup
            const backupDir = path_1.default.join(agentDest, '.backups', `backup-${Date.now()}`);
            fs_1.default.mkdirSync(backupDir, { recursive: true });
            const subdirs = ['agents', 'workflows', 'skills', 'scripts', '.shared', 'rules'];
            for (const sub of subdirs) {
                const subPath = path_1.default.join(agentDest, sub);
                if (fs_1.default.existsSync(subPath)) {
                    await (0, fs_2.copyDir)(subPath, path_1.default.join(backupDir, sub), false);
                    await fs_1.default.promises.rm(subPath, { recursive: true, force: true });
                }
            }
            (0, logger_1.log)(`  ${(0, logger_1.c)('gray', '✦')} Backed up existing configurations ${(0, logger_1.c)('gray', '→')} ${(0, logger_1.c)('gray', '.agent/.backups/')}`);
        }
    }
    // ────────────────────────────────────────────────────────
    (0, helpers_1.banner)(quiet);
    if (dryRun) {
        (0, logger_1.log)((0, logger_1.colorize)('yellow', '  DRY RUN — no files will be written'));
        console.log();
    }
    // Check target exists
    if (!fs_1.default.existsSync(targetDir)) {
        (0, logger_1.err)(`Target directory not found: ${targetDir}`);
        process.exit(1);
    }
    // Check if .agent already exists
    if (fs_1.default.existsSync(agentDest) && !flags.force) {
        (0, logger_1.warn)('.agent/ already exists in this project.');
        (0, logger_1.log)(`  ${(0, logger_1.c)('gray', '▸')} To refresh or update it, run: ${(0, logger_1.colorize)('white', 'tribunal-kit init --force')}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('gray', '▸')} Or check status with:    ${(0, logger_1.colorize)('cyan', 'tribunal-kit status')}`);
        console.log();
        process.exit(0);
    }
    // Ensure history dirs exist (Case Law + Skill Evolution)
    if (!dryRun) {
        const caseDir = path_1.default.join(agentDest, 'history', 'case-law', 'cases');
        const evoDir = path_1.default.join(agentDest, 'history', 'skill-evolution');
        fs_1.default.mkdirSync(caseDir, { recursive: true });
        fs_1.default.mkdirSync(evoDir, { recursive: true });
        const gkCase = path_1.default.join(caseDir, '.gitkeep');
        const gkEvo = path_1.default.join(evoDir, '.gitkeep');
        if (!fs_1.default.existsSync(gkCase))
            fs_1.default.writeFileSync(gkCase, '');
        if (!fs_1.default.existsSync(gkEvo))
            fs_1.default.writeFileSync(gkEvo, '');
    }
    // Count what we're installing
    const isMinimal = flags.minimal || false;
    if (isMinimal) {
        (0, logger_1.log)(`  ${(0, logger_1.c)('yellow', '⚡')} ${(0, logger_1.bold)('Minimal mode')} — installing core agents and skills only`);
        console.log();
    }
    const totalFiles = await (0, fs_2.countDir)(agentSrc);
    (0, logger_1.dbg)(`Source: ${agentSrc}`);
    (0, logger_1.dbg)(`Target: ${agentDest}`);
    (0, logger_1.dbg)(`Total source files: ${totalFiles}`);
    (0, logger_1.log)(`  ${(0, logger_1.c)('gray', '▸')} Scanning ${(0, logger_1.c)('white', String(totalFiles))} files  ${(0, logger_1.c)('gray', '→')}  ${(0, logger_1.c)('gray', agentDest)}`);
    try {
        // Build filter for --minimal mode
        let filterFunc = isMinimal ? (name, parentDir, isDir) => {
            if (isDir) return true; // always traverse directories
            const parentName = path_1.default.basename(parentDir);
            if (parentName === 'agents')
                return CORE_AGENTS.has(name);
            if (parentName === 'skills')
                return CORE_SKILLS.has(name);
            return true; // everything else passes
        } : null;

        if (incremental && diff) {
            const addedSet = new Set(diff.added);
            const changedSet = new Set(diff.changed);
            const baseFilter = filterFunc;
            filterFunc = (name, parentDir, isDir) => {
                if (isDir) return true;
                if (baseFilter && !baseFilter(name, parentDir, isDir)) return false;
                
                const relativePath = path_1.default.relative(agentSrc, path_1.default.join(parentDir, name)).replace(/\\/g, '/');
                return addedSet.has(relativePath) || changedSet.has(relativePath);
            };
        }

        const copied = await (0, fs_2.copyDir)(agentSrc, agentDest, dryRun, filterFunc);
        // Generate and save hash manifest for incremental future updates
        if (!dryRun) {
            try {
                const manifest = await (0, hasher_1.generateManifest)(agentSrc);
                (0, hasher_1.writeManifest)(agentDest, manifest);
                (0, logger_1.dbg)(`  Manifest saved: ${Object.keys(manifest).length} files hashed`);
            } catch (e) {
                (0, logger_1.dbg)(`  Manifest generation skipped: ${e.message}`);
            }
        }
        console.log();
        if (dryRun) {
            (0, logger_1.ok)(`${(0, logger_1.bold)('DRY RUN')} complete — would install ${(0, logger_1.c)('cyan', String(copied))} files`);
            (0, logger_1.dim)(`Target: ${agentDest}`);
        }
        else {
            // ── Success card — W=62, rows padded by plain-text length ──
            const W = 62;
            const borderCol = 'red';
            const agentsCount = fs_1.default.readdirSync(path_1.default.join(agentDest, 'agents')).length;
            const workflowsCount = fs_1.default.readdirSync(path_1.default.join(agentDest, 'workflows')).length;
            const skillsCount = fs_1.default.readdirSync(path_1.default.join(agentDest, 'skills')).length;
            const scriptsCount = fs_1.default.readdirSync(path_1.default.join(agentDest, 'scripts')).length;
            
            const drawRow = (plainText, styledText) => {
                const trail = ' '.repeat(Math.max(0, W - plainText.length));
                return `  ${(0, logger_1.c)(borderCol, '│')}${styledText}${trail}${(0, logger_1.c)(borderCol, '│')}`;
            };
            
            const compRow = (icon, label, count, color) => {
                const leftPlain = `    ${icon}  ${label.padEnd(10)} `;
                const rightPlain = ` [ ${String(count).padStart(3)} ]`;
                const numDots = W - leftPlain.length - rightPlain.length - 4; // 4 spaces margin
                const dots = '.'.repeat(Math.max(0, numDots));
                
                const plain = `${leftPlain}${dots}${rightPlain}`;
                const styled = `    ${icon}  ${(0, logger_1.c)('white', label.padEnd(10))} ${(0, logger_1.c)('gray', dots)} ${(0, logger_1.c)('gray', '[')} ${(0, logger_1.c)(color, String(count).padStart(3))} ${(0, logger_1.c)('gray', ']')}`;
                return drawRow(plain, styled);
            };
            
            const stepRow = (cmd, desc) => {
                const leftPlain = `    ${cmd.padEnd(16)}`;
                const rightPlain = `▸  ${desc}`;
                const plain = `${leftPlain}${rightPlain}`;
                const styled = `    ${(0, logger_1.c)('white', cmd.padEnd(16))}${(0, logger_1.c)('gray', '▸')}  ${(0, logger_1.c)('gray', desc)}`;
                return drawRow(plain, styled);
            };
            
            console.log(`  ${(0, logger_1.c)('green', '✔')} ${(0, logger_1.bold)((0, logger_1.c)('green', 'Installation complete'))} ${(0, logger_1.c)('gray', '—')} ${(0, logger_1.c)('white', String(copied))} files`);
            console.log(`  ${(0, logger_1.c)('gray', '  ╰─')} ${(0, logger_1.c)('gray', agentDest)}`);
            console.log();
            console.log(`  ${(0, logger_1.c)(borderCol, '┌' + '─'.repeat(W) + '┐')}`);
            console.log(drawRow(`  TRIBUNAL ENVIRONMENT SYNCHRONIZED`, `  ${(0, logger_1.bold)((0, logger_1.c)('white', 'TRIBUNAL ENVIRONMENT SYNCHRONIZED'))}`));
            console.log(`  ${(0, logger_1.c)(borderCol, '├' + '─'.repeat(W) + '┤')}`);
            console.log(drawRow(`  Guarding:  Active & Enforcing`, `  ${(0, logger_1.c)('gray', 'Guarding:')}  ${(0, logger_1.c)('green', 'Active & Enforcing')}`));
            console.log(drawRow(`  Manifest:  Verified`, `  ${(0, logger_1.c)('gray', 'Manifest:')}  ${(0, logger_1.c)('cyan', 'Verified')}`));
            console.log(drawRow('', ''));
            console.log(drawRow('  Installed Components:', (0, logger_1.bold)((0, logger_1.c)('white', '  Installed Components:'))));
            console.log(compRow('🤖', 'Agents', agentsCount, 'magenta'));
            console.log(compRow('⚡', 'Workflows', workflowsCount, 'yellow'));
            console.log(compRow('🧠', 'Skills', skillsCount, 'blue'));
            console.log(compRow('🔧', 'Scripts', scriptsCount, 'green'));
            console.log(`  ${(0, logger_1.c)(borderCol, '├' + '─'.repeat(W) + '┤')}`);
            console.log(drawRow('', ''));
            console.log(drawRow('  Next Steps:', (0, logger_1.c)('gray', '  Next Steps:')));
            console.log(stepRow('/generate', 'Generate code with reviews'));
            console.log(stepRow('/review', 'Audit existing code for issues'));
            console.log(stepRow('/tribunal-full', 'Run all 20 reviewers in parallel'));
            console.log(drawRow('', ''));
            console.log(`  ${(0, logger_1.c)(borderCol, '└' + '─'.repeat(W) + '┘')}`);
            console.log();
            (0, logger_1.log)(`  ${(0, logger_1.c)('gray', '✦ Generating IDE bridge files...')}`);
            await generateIDEBridges(targetDir, agentDest, dryRun, isMinimal);
        }
        console.log();
    }
    catch (e) {
        if (e instanceof Error) {
            (0, logger_1.err)(`Failed to install: ${e.message}`);
        }
        else {
            (0, logger_1.err)(`Failed to install: ${String(e)}`);
        }
        process.exit(1);
    }
}
async function generateIDEBridges(targetDir, agentDest, dryRun = false, isMinimal = false) {
    const rulesFilename = isMinimal ? 'kernel.md' : 'GEMINI.md';
    const rulesFile = path_1.default.join(agentDest, 'rules', rulesFilename);
    let rulesContent = '';
    try {
        rulesContent = await fs_1.default.promises.readFile(rulesFile, 'utf8');
    }
    catch {
        // rules file doesn't exist
    }
    // Helper: write a bridge file only if it doesn't already exist
    const writeBridge = async (filePath, content, label) => {
        if (dryRun) {
            (0, logger_1.dbg)(`  would create: ${filePath}`);
            return;
        }
        const dir = path_1.default.dirname(filePath);
        try {
            await fs_1.default.promises.mkdir(dir, { recursive: true });
            await fs_1.default.promises.stat(filePath);
            (0, logger_1.dbg)(`  skip (exists): ${path_1.default.basename(filePath)}`);
        }
        catch (statErr) {
            if (statErr instanceof Error && statErr.code === 'ENOENT') {
                await fs_1.default.promises.writeFile(filePath, content, 'utf8');
                (0, logger_1.ok)(`${label} → ${(0, logger_1.c)('gray', path_1.default.relative(targetDir, filePath))}`);
            }
        }
    };
    // ── 1. Cursor (.cursorrules) ──────────────────────────
    const cursorRules = `# Tribunal Kit — Cursor Bridge
# Auto-generated by tribunal-kit init. Do not edit manually.
# Source: .agent/rules/${rulesFilename}

${rulesContent}
`;
    // ── 2. Windsurf (.windsurfrules) ─────────────────────
    const windsurfRules = `# Tribunal Kit — Windsurf Bridge
# Auto-generated by tribunal-kit init. Do not edit manually.
# Source: .agent/rules/${rulesFilename}

${rulesContent}
`;
    // ── 3. Gemini / Antigravity (.gemini/settings.json) ──
    const geminiSettings = JSON.stringify({
        "rules": [
            { "path": `../.agent/rules/${rulesFilename}`, "trigger": "always_on" }
        ],
        "agents": { "directory": "../.agent/agents" },
        "skills": { "directory": "../.agent/skills" },
        "workflows": { "directory": "../.agent/workflows" }
    }, null, 2) + '\n';
    // ── Also create .gemini/GEMINI.md as a direct rules file ──
    const geminiRulesBridge = `---
trigger: always_on
---

# Tribunal Kit — Gemini Bridge
# Auto-generated by tribunal-kit init.
# Full rules: .agent/rules/${rulesFilename}

${rulesContent}
`;
    // ── 4. GitHub Copilot (.github/copilot-instructions.md) ──
    const copilotInstructions = `# Tribunal Kit — Copilot Bridge
# Auto-generated by tribunal-kit init. Do not edit manually.
# Source: .agent/rules/${rulesFilename}

${rulesContent}
`;
    // ── 5. Claude (.claude/CLAUDE.md) ─────────────────────
    const claudeRules = `# Tribunal Kit — Claude Bridge
# Auto-generated by tribunal-kit init. Do not edit manually.
# Source: .agent/rules/${rulesFilename}

${rulesContent}
`;
    // Fire ALL bridge writes concurrently via Promise.all
    const bridges = [
        { path: path_1.default.join(targetDir, '.cursorrules'), content: cursorRules, label: 'Cursor' },
        { path: path_1.default.join(targetDir, '.windsurfrules'), content: windsurfRules, label: 'Windsurf' },
        { path: path_1.default.join(targetDir, '.gemini', 'settings.json'), content: geminiSettings, label: 'Gemini/Antigravity' },
        { path: path_1.default.join(targetDir, '.gemini', 'GEMINI.md'), content: geminiRulesBridge, label: 'Gemini rules' },
        { path: path_1.default.join(targetDir, '.github', 'copilot-instructions.md'), content: copilotInstructions, label: 'GitHub Copilot' },
        { path: path_1.default.join(targetDir, '.claude', 'CLAUDE.md'), content: claudeRules, label: 'Claude' },
    ];
    await Promise.all(bridges.map(b => writeBridge(b.path, b.content, b.label)));
    console.log();
}

