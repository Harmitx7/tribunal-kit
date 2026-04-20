#!/usr/bin/env node
/**
 * lint_runner.js — Standalone lint runner for the Tribunal Agent Kit.
 *
 * Usage:
 *   node .agent/scripts/lint_runner.js .
 *   node .agent/scripts/lint_runner.js . --fix
 *   node .agent/scripts/lint_runner.js . --files src/index.ts src/utils.ts
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const { RED, GREEN, YELLOW, BLUE, BOLD, RESET } = require('./colors.js');

function header(title) {
    console.log(`\n${BOLD}${BLUE}━━━ ${title} ━━━${RESET}`);
}

function ok(msg) {
    console.log(`  ${GREEN}✅ ${msg}${RESET}`);
}

function fail(msg) {
    console.log(`  ${RED}❌ ${msg}${RESET}`);
}

function skip(msg) {
    console.log(`  ${YELLOW}⏭️  ${msg}${RESET}`);
}

function runLinter(label, cmd, cwd) {
    try {
        const executable = process.platform === 'win32' && cmd[0] === 'npx' ? 'npx.cmd' : cmd[0];
        const result = spawnSync(executable, cmd.slice(1), {
            cwd,
            encoding: 'utf8',
            timeout: 120000,
            shell: process.platform === 'win32'
        });

        if (result.status === 0) {
            ok(`${label} — clean`);
            return true;
        }

        fail(`${label} — issues found`);
        if (result.error) {
            console.log(`    Error: ${result.error.message}`);
        }
        const out = result.stdout ? result.stdout.toString() : '';
        const err = result.stderr ? result.stderr.toString() : '';
        const output = (out + "\n" + err).trim();
        if (output) {
            const lines = output.split('\n');
            for (const line of lines.slice(0, 15)) {
                console.log(`    ${line}`);
            }
            if (lines.length > 15) {
                console.log(`    ... and ${lines.length - 15} more lines`);
            }
        }
        return false;
    } catch {
        skip(`${label} — tool not installed`);
        return true;
    }
}

function detectLinters(projectRoot) {
    const available = {};
    const pkgJson = path.join(projectRoot, "package.json");
    
    if (fs.existsSync(pkgJson)) {
        const eslintFiles = [".eslintrc", ".eslintrc.js", ".eslintrc.json", ".eslintrc.yml", "eslint.config.js", "eslint.config.mjs"];
        available.eslint = eslintFiles.some(f => fs.existsSync(path.join(projectRoot, f))); 
        
        const prettierFiles = [".prettierrc", ".prettierrc.js", ".prettierrc.json", "prettier.config.js"];
        available.prettier = prettierFiles.some(f => fs.existsSync(path.join(projectRoot, f)));
    }

    available.ruff = fs.existsSync(path.join(projectRoot, "pyproject.toml")) || fs.existsSync(path.join(projectRoot, "ruff.toml"));
    available.flake8 = fs.existsSync(path.join(projectRoot, ".flake8")) || fs.existsSync(path.join(projectRoot, "setup.cfg"));

    return available;
}

function main() {
    const args = process.argv.slice(2);
    let targetPath = null;
    let fixFlag = false;
    let fileArgs = [];

    let i = 0;
    while (i < args.length) {
        if (args[i] === '--fix') fixFlag = true;
        else if (args[i] === '--files') {
            i++;
            while (i < args.length && !args[i].startsWith('--')) {
                fileArgs.push(args[i++]);
            }
            continue;
        } else if (!targetPath && !args[i].startsWith('-')) {
            targetPath = args[i];
        }
        i++;
    }

    if (!targetPath) {
        console.log("Usage: node lint_runner.js <path> [--fix] [--files <file1> <file2> ...]");
        process.exit(1);
    }

    const projectRoot = path.resolve(targetPath);
    if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
        fail(`Directory not found: ${projectRoot}`);
        process.exit(1);
    }

    console.log(`${BOLD}Tribunal — lint_runner.js${RESET}`);
    console.log(`Project: ${projectRoot}`);

    const available = detectLinters(projectRoot);
    if (!Object.values(available).some(Boolean)) {
        skip("No linter configuration detected in this project");
        process.exit(0);
    }

    let failures = 0;

    if (available.eslint) {
        header("ESLint");
        const cmd = ["npx", "eslint"];
        if (fixFlag) cmd.push("--fix");
        if (fileArgs.length) cmd.push(...fileArgs);
        else cmd.push(".", "--max-warnings=0");
        if (!runLinter("ESLint", cmd, projectRoot)) failures++;
    }

    if (available.prettier) {
        header("Prettier");
        const cmd = ["npx", "prettier"];
        if (fixFlag) cmd.push("--write");
        else cmd.push("--check");
        if (fileArgs.length) cmd.push(...fileArgs);
        else cmd.push(".");
        if (!runLinter("Prettier", cmd, projectRoot)) failures++;
    }

    if (available.ruff) {
        header("Ruff (Python)");
        const cmd = ["ruff", "check"];
        if (fixFlag) cmd.push("--fix");
        if (fileArgs.length) cmd.push(...fileArgs);
        else cmd.push(".");
        if (!runLinter("Ruff", cmd, projectRoot)) failures++;
    }

    if (available.flake8 && !available.ruff) {
        header("Flake8 (Python)");
        const cmd = ["flake8"];
        if (fileArgs.length) cmd.push(...fileArgs);
        else cmd.push(".");
        if (!runLinter("Flake8", cmd, projectRoot)) failures++;
    }

    if (fs.existsSync(path.join(projectRoot, "tsconfig.json"))) {
        header("TypeScript");
        if (!runLinter("TypeScript", ["npx", "tsc", "--noEmit"], projectRoot)) failures++;
    }

    console.log(`\n${BOLD}━━━ Lint Summary ━━━${RESET}`);
    if (failures === 0) {
        ok("All linters passed");
    } else {
        fail(`${failures} linter(s) reported issues`);
    }

    process.exit(failures > 0 ? 1 : 0);
}

if (require.main === module) {
    main();
}
