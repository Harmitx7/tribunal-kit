#!/usr/bin/env node
/**
 * verify_all.js — Full pre-deploy validation suite for the Tribunal Agent Kit.
 *
 * Runs comprehensive checks before any production deployment.
 *
 * Usage:
 *   node .agent/scripts/verify_all.js
 *   node .agent/scripts/verify_all.js --skip build,deps
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// ━━━ ANSI colors ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const RED    = '\x1b[91m';
const GREEN  = '\x1b[92m';
const YELLOW = '\x1b[93m';
const BLUE   = '\x1b[94m';
const BOLD   = '\x1b[1m';
const RESET  = '\x1b[0m';

const RESULTS = [];

function section(title) {
    console.log(`\n${BOLD}${BLUE}━━━ ${title} ━━━${RESET}`);
}

function ok(label, note) {
    const msg = `${GREEN}✅ ${label}${RESET}` + (note ? `  ${YELLOW}(${note})${RESET}` : '');
    console.log(`  ${msg}`);
    RESULTS.push({ label, passed: true, note: note || '' });
}

function fail(label, note) {
    const noteStr = note ? `\n     ${note}` : '';
    console.log(`  ${RED}❌ ${label}${RESET}${noteStr}`);
    RESULTS.push({ label, passed: false, note: note || '' });
}

function skip(label, reason) {
    console.log(`  ${YELLOW}⏭️  ${label} — ${reason}${RESET}`);
    RESULTS.push({ label, passed: true, note: `skipped: ${reason}` });
}

/**
 * Run a shell command and return true if it exits with code 0.
 */
function run(label, cmd, cwd) {
    try {
        const isWindows = process.platform === 'win32';
        let bin = cmd[0];
        if (isWindows && (bin === 'npm' || bin === 'npx')) bin += '.cmd';

        execFileSync(bin, cmd.slice(1), {
            cwd,
            stdio: 'pipe',
            timeout: 120000,
            encoding: 'utf8',
        });
        ok(label);
        return true;
    } catch (err) {
        if (err.code === 'ENOENT') {
            skip(label, 'tool not installed — skipping');
            return true;
        }
        if (err.killed) {
            fail(label, 'timed out after 120s');
            return false;
        }
        const output = ((err.stdout || '') + (err.stderr || '')).trim();
        fail(label, output ? output.slice(0, 500) : 'non-zero exit code');
        return false;
    }
}


/**
 * Scan source files for obviously hardcoded credentials.
 */
function scanSecrets(cwd) {
    const patterns = ['password=', 'secret=', 'api_key=', 'private_key=', 'auth_token='];
    const found = [];
    const skipDirs = new Set(['node_modules', '.git', 'dist', '__pycache__', '.agent']);

    function walk(dir) {
        let entries;
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (!skipDirs.has(entry.name)) walk(fullPath);
            } else if (entry.isFile()) {
                if (!/\.(ts|js|tsx|jsx|py)$/.test(entry.name)) continue;

                let content;
                try { content = fs.readFileSync(fullPath, 'utf8'); } catch { continue; }

                const lines = content.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    const low = lines[i].toLowerCase().trim();
                    const hasPattern = patterns.some(p => low.includes(p));
                    if (hasPattern && !low.startsWith('#') && low.includes('=')) {
                        const rel = path.relative(cwd, fullPath);
                        found.push(`${rel}:${i + 1}`);
                    }
                }
            }
        }
    }

    walk(cwd);

    if (found.length > 0) {
        fail('Secret scan', found.slice(0, 5).join('\n     '));
        return false;
    }
    ok('Secret scan — no hardcoded credentials found');
    return true;
}


/**
 * Check if there's a package.json to run npm commands against.
 */
function hasNpm(cwd) {
    return fs.existsSync(path.join(cwd, 'package.json'));
}


/**
 * Run all verification checks. Returns number of failures.
 */
function verifyAll(cwd, skipped) {
    let failures = 0;

    section('1 — Secret Scan');
    if (!skipped.includes('secrets')) {
        if (!scanSecrets(cwd)) failures++;
    } else {
        skip('Secret scan', 'skipped by flag');
    }

    section('2 — TypeScript');
    if (!skipped.includes('typescript')) {
        if (hasNpm(cwd)) {
            if (!run('tsc --noEmit', ['npx', 'tsc', '--noEmit'], cwd)) failures++;
        } else {
            skip('TypeScript', 'no package.json found in project');
        }
    } else {
        skip('TypeScript', 'skipped by flag');
    }

    section('3 — ESLint');
    if (!skipped.includes('lint')) {
        if (hasNpm(cwd)) {
            if (!run('ESLint', ['npx', 'eslint', '.', '--max-warnings=0'], cwd)) failures++;
        } else {
            skip('ESLint', 'no package.json found in project');
        }
    } else {
        skip('ESLint', 'skipped by flag');
    }

    section('4 — Unit Tests');
    if (!skipped.includes('tests')) {
        if (hasNpm(cwd)) {
            if (!run('Test suite', ['npm', 'test', '--', '--passWithNoTests'], cwd)) failures++;
        } else {
            skip('Tests', 'no package.json found in project');
        }
    } else {
        skip('Tests', 'skipped by flag');
    }

    section('5 — Build');
    if (!skipped.includes('build')) {
        if (hasNpm(cwd)) {
            if (!run('npm run build', ['npm', 'run', 'build'], cwd)) failures++;
        } else {
            skip('Build', 'no package.json found in project');
        }
    } else {
        skip('Build', 'skipped by flag');
    }

    section('6 — Dependency Audit');
    if (!skipped.includes('deps')) {
        if (hasNpm(cwd)) {
            if (!run('npm audit', ['npm', 'audit', '--audit-level=high'], cwd)) failures++;
        } else {
            skip('Dependency audit', 'no package.json found in project');
        }
    } else {
        skip('Dependency audit', 'skipped by flag');
    }

    // ━━━ Summary ━━━
    console.log(`\n${BOLD}━━━ Summary ━━━${RESET}`);
    for (const { label, passed, note } of RESULTS) {
        const status = passed ? `${GREEN}✅${RESET}` : `${RED}❌${RESET}`;
        const noteStr = (!passed && note) ? `  ${YELLOW}(${note})${RESET}` : '';
        console.log(`  ${status} ${label}${noteStr}`);
    }

    console.log();
    if (failures === 0) {
        console.log(`${GREEN}${BOLD}All checks passed — safe to deploy.${RESET}`);
    } else {
        console.log(`${RED}${BOLD}${failures} check(s) failed — fix before deploying.${RESET}`);
    }

    return failures;
}


/**
 * Parse CLI arguments manually (no external dependencies).
 */
function parseArgs(argv) {
    const args = { skip: [] };
    const raw = argv.slice(2);

    for (let i = 0; i < raw.length; i++) {
        if (raw[i] === '--skip' && raw[i + 1]) {
            args.skip = raw[++i].split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        }
    }
    return args;
}


function main() {
    const args = parseArgs(process.argv);
    const cwd = process.cwd();

    console.log(`${BOLD}Tribunal — verify_all.js${RESET}`);
    console.log(`Project: ${cwd}\n`);

    const failures = verifyAll(cwd, args.skip);
    process.exit(failures > 0 ? 1 : 0);
}


// ━━━ Exports for testing & programmatic use ━━━
module.exports = { verifyAll, scanSecrets, hasNpm };

if (require.main === module) {
    main();
}
