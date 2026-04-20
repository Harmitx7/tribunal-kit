#!/usr/bin/env node
/**
 * checklist.js — Priority-based project audit runner for the Tribunal Agent Kit.
 *
 * Runs a tiered audit sequence:
 *   Priority 1: Security
 *   Priority 2: Lint
 *   Priority 3: Schema validation
 *   Priority 4: Tests
 *   Priority 5: UX / Accessibility
 *   Priority 6: SEO
 *   Priority 7: Lighthouse / E2E (requires --url)
 *
 * Usage:
 *   node .agent/scripts/checklist.js .
 *   node .agent/scripts/checklist.js . --url http://localhost:3000
 *   node .agent/scripts/checklist.js . --skip security,seo
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// ━━━ ANSI color output ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const RED    = '\x1b[91m';
const GREEN  = '\x1b[92m';
const YELLOW = '\x1b[93m';
const BLUE   = '\x1b[94m';
const BOLD   = '\x1b[1m';
const RESET  = '\x1b[0m';


function printHeader(title) {
    console.log(`\n${BOLD}${BLUE}━━━ ${title} ━━━${RESET}`);
}

function printOk(msg) {
    console.log(`  ${GREEN}✅ ${msg}${RESET}`);
}

function printFail(msg) {
    console.log(`  ${RED}❌ ${msg}${RESET}`);
}

function printSkip(msg) {
    console.log(`  ${YELLOW}⏭️  Skipped: ${msg}${RESET}`);
}


/**
 * Run a shell command and return true if it exits with code 0.
 * @param {string} label - Human-readable label for the check.
 * @param {string[]} cmd - Command and arguments array.
 * @param {string} cwd - Working directory.
 * @returns {boolean}
 */
function runCheck(label, cmd, cwd) {
    try {
        execFileSync(cmd[0], cmd.slice(1), {
            cwd,
            stdio: 'pipe',
            timeout: 60000,
            encoding: 'utf8',
        });
        printOk(`${label} passed`);
        return true;
    } catch (err) {
        if (err.code === 'ENOENT') {
            printSkip(`${label} — command not found (tool not installed)`);
            return true; // Don't block on tools that aren't installed
        }
        if (err.killed) {
            printFail(`${label} — timed out after 60s`);
            return false;
        }
        printFail(`${label} failed`);
        const output = (err.stdout || '') + (err.stderr || '');
        if (output.trim()) {
            console.log(`    ${output.trim().slice(0, 500)}`);
        }
        return false;
    }
}


/**
 * Scan for hardcoded secrets in source files.
 * @param {string} projectRoot - Project root directory.
 * @returns {boolean} True if no secrets found.
 */
function checkSecrets(projectRoot) {
    printHeader('Security — Secret Scan');
    const dangerousPatterns = [
        'password=', 'secret=', 'api_key=',
        'apikey=', 'auth_token=', 'private_key=',
    ];
    let foundIssues = false;
    const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.env']);
    const skipDirs = new Set(['node_modules', '.git', '.agent', 'dist', '__pycache__']);

    function walk(dir) {
        let entries;
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (!skipDirs.has(entry.name)) walk(fullPath);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name);
                if (!sourceExtensions.has(ext)) continue;
                if (entry.name.startsWith('.env')) continue; // .env files are allowed

                let content;
                try { content = fs.readFileSync(fullPath, 'utf8'); } catch { continue; }

                const lines = content.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    const lineLower = lines[i].toLowerCase().trim();
                    const hasPattern = dangerousPatterns.some(p => lineLower.includes(p));
                    if (hasPattern && lineLower.includes('=') && !lineLower.startsWith('#')) {
                        const rel = path.relative(projectRoot, fullPath);
                        printFail(`Possible secret: ${rel}:${i + 1} → ${lines[i].trim().slice(0, 80)}`);
                        foundIssues = true;
                    }
                }
            }
        }
    }

    walk(projectRoot);

    if (!foundIssues) {
        printOk('No hardcoded secrets detected');
    }
    return !foundIssues;
}


/**
 * Run all checklist tiers. Returns number of failures.
 * @param {string} projectRoot - Project root.
 * @param {string|null} url - URL for Lighthouse/E2E checks.
 * @param {string[]} skip - Tiers to skip.
 * @returns {number}
 */
function runAll(projectRoot, url, skip) {
    let failures = 0;

    // Priority 1 — Security
    if (!skip.includes('security')) {
        printHeader('Priority 1 — Security');
        if (!checkSecrets(projectRoot)) failures++;
    } else {
        printSkip('Security tier');
    }

    // Priority 2 — Lint
    if (!skip.includes('lint')) {
        printHeader('Priority 2 — Lint');
        if (!runCheck('ESLint', ['npx', 'eslint', '.', '--max-warnings=0'], projectRoot)) failures++;
        if (!runCheck('TypeScript', ['npx', 'tsc', '--noEmit'], projectRoot)) failures++;
    } else {
        printSkip('Lint tier');
    }

    // Priority 3 — Schema
    if (!skip.includes('schema')) {
        printHeader('Priority 3 — Schema');
        printSkip('Schema check — run manually if you have DB migrations');
    } else {
        printSkip('Schema tier');
    }

    // Priority 4 — Tests
    if (!skip.includes('tests')) {
        printHeader('Priority 4 — Tests');
        if (!runCheck('Test suite', ['npm', 'test', '--', '--passWithNoTests'], projectRoot)) failures++;
    } else {
        printSkip('Tests tier');
    }

    // Priority 5 — UX
    if (!skip.includes('ux')) {
        printHeader('Priority 5 — UX / Accessibility');
        printSkip('UX audit — run /preview start then check manually or with Lighthouse');
    } else {
        printSkip('UX tier');
    }

    // Priority 6 — SEO
    if (!skip.includes('seo')) {
        printHeader('Priority 6 — SEO');
        printSkip('SEO check — use /ui-ux-pro-max for SEO-sensitive pages');
    } else {
        printSkip('SEO tier');
    }

    // Priority 7 — Lighthouse / E2E
    if (url && !skip.includes('e2e')) {
        printHeader('Priority 7 — Lighthouse / E2E');
        if (!runCheck('Playwright E2E', ['npx', 'playwright', 'test'], projectRoot)) failures++;
    } else if (!url) {
        printSkip('E2E / Lighthouse — pass --url to enable');
    }

    // ━━━ Summary ━━━
    console.log(`\n${BOLD}━━━ Checklist Summary ━━━${RESET}`);
    if (failures === 0) {
        printOk('All checks passed — ready to proceed');
    } else {
        printFail(`${failures} tier(s) failed — fix Critical issues before proceeding`);
    }

    return failures;
}


/**
 * Parse CLI arguments manually (no external dependencies).
 */
function parseArgs(argv) {
    const args = { path: null, url: null, skip: [] };
    const raw = argv.slice(2);

    for (let i = 0; i < raw.length; i++) {
        if (raw[i] === '--url' && raw[i + 1]) {
            args.url = raw[++i];
        } else if (raw[i] === '--skip' && raw[i + 1]) {
            args.skip = raw[++i].split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        } else if (!raw[i].startsWith('--') && !args.path) {
            args.path = raw[i];
        }
    }
    return args;
}


function main() {
    const args = parseArgs(process.argv);

    if (!args.path) {
        console.error(`Usage: node checklist.js <path> [--url <url>] [--skip security,lint,schema,tests,ux,seo,e2e]`);
        process.exit(1);
    }

    const projectRoot = path.resolve(args.path);
    if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
        printFail(`Directory not found: ${projectRoot}`);
        process.exit(1);
    }

    console.log(`${BOLD}Tribunal Checklist — ${projectRoot}${RESET}`);
    const failures = runAll(projectRoot, args.url, args.skip);
    process.exit(failures > 0 ? 1 : 0);
}


// ━━━ Exports for testing & programmatic use ━━━
module.exports = { runCheck, checkSecrets, runAll };

if (require.main === module) {
    main();
}
