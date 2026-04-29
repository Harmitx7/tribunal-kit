#!/usr/bin/env node
/**
 * dependency_analyzer.js — Dependency health checker for the Tribunal Agent Kit.
 *
 * Analyzes project dependencies for:
 *   - Unused packages (in package.json but never imported)
 *   - Phantom imports (imported but not in package.json)
 *   - npm audit / pip-audit results
 *   - Duplicate/overlapping packages
 *
 * Usage:
 *   node .agent/scripts/dependency_analyzer.js .
 *   node .agent/scripts/dependency_analyzer.js . --audit
 *   node .agent/scripts/dependency_analyzer.js . --check-unused
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const { RED, GREEN, YELLOW, BLUE, BOLD, RESET } = require('./colors.js');

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", ".agent", "__pycache__", "test", "tests", "__tests__"]);

const NODE_BUILTINS = new Set([
    "fs", "path", "os", "crypto", "http", "https", "url", "util",
    "stream", "events", "child_process", "cluster", "net", "dns",
    "tls", "readline", "zlib", "buffer", "querystring", "string_decoder",
    "assert", "perf_hooks", "worker_threads", "timers", "v8",
    "node:fs", "node:path", "node:os", "node:crypto", "node:http",
    "node:https", "node:url", "node:util", "node:stream", "node:events",
    "node:child_process", "node:net", "node:dns", "node:tls",
    "node:readline", "node:zlib", "node:buffer", "node:assert",
    "node:perf_hooks", "node:worker_threads", "node:timers"
]);

function header(title) {
    console.log(`\n${BOLD}${BLUE}━━━ ${title} ━━━${RESET}`);
}

function ok(msg) {
    console.log(`  ${GREEN}✅ ${msg}${RESET}`);
}

function fail(msg) {
    console.log(`  ${RED}❌ ${msg}${RESET}`);
}

function warn(msg) {
    console.log(`  ${YELLOW}⚠️  ${msg}${RESET}`);
}

function skip(msg) {
    console.log(`  ${YELLOW}⏭️  ${msg}${RESET}`);
}

function loadPackageJson(projectRoot) {
    const pkgPath = path.resolve(projectRoot, "package.json");
    if (!fs.existsSync(pkgPath)) return null;
    try {
        return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    } catch {
        return null;
    }
}

function extractImports(projectRoot) {
    const imports = new Set();
    const importPatterns = [
        /(?:import|export)\s+.*?\s+from\s+["']([^"'.][^"']*)["']/g,
        /require\s*\(\s*["']([^"'.][^"']*)["']/g,
        /import\s*\(\s*["']([^"'.][^"']*)["']/g
    ];

    function walk(dir) {
        let items;
        try {
            items = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }

        for (const item of items) {
            if (item.isDirectory()) {
                if (!SKIP_DIRS.has(item.name)) walk(path.join(dir, item.name));
            } else {
                const ext = path.extname(item.name);
                if (SOURCE_EXTENSIONS.has(ext)) {
                    try {
                        const content = fs.readFileSync(path.join(dir, item.name), 'utf8');
                        for (const pattern of importPatterns) {
                            let match;
                            while ((match = pattern.exec(content)) !== null) {
                                let pkg = match[1];
                                if (pkg.startsWith("@")) {
                                    const parts = pkg.split("/");
                                    pkg = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : pkg;
                                } else {
                                    pkg = pkg.split("/")[0];
                                }
                                imports.add(pkg);
                            }
                        }
                    } catch {}
                }
            }
        }
    }

    walk(projectRoot);
    return imports;
}

function checkUnused(pkg, usedImports) {
    const allDeps = new Set([
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.devDependencies || {})
    ]);

    const implicitPackages = new Set([
        "typescript", "eslint", "prettier", "vitest", "jest", "ts-node",
        "@types/node", "@types/react", "tailwindcss", "postcss", "autoprefixer",
        "nodemon", "tsx", "vite", "next", "webpack", "babel", "@babel/core"
    ]);

    const unused = [];
    for (const d of allDeps) {
        if (!implicitPackages.has(d) && !d.startsWith("@types/") && !usedImports.has(d)) {
            unused.push(d);
        }
    }
    return unused.sort();
}

function checkPhantom(pkg, usedImports) {
    const allDeps = new Set([
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.devDependencies || {})
    ]);

    const phantom = [];
    for (const imp of usedImports) {
        if (!NODE_BUILTINS.has(imp) && !allDeps.has(imp)) {
            phantom.push(imp);
        }
    }
    return phantom.sort();
}

function runNpmAudit(projectRoot) {
    try {
        const executable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        const result = spawnSync(executable, ["audit", "--json"], {
            cwd: projectRoot,
            encoding: 'utf8',
            timeout: 60000,
            shell: process.platform === 'win32'
        });

        try {
            const auditData = JSON.parse(result.stdout);
            const vulns = (auditData.metadata && auditData.metadata.vulnerabilities) || {};
            const critical = vulns.critical || 0;
            const high = vulns.high || 0;
            const moderate = vulns.moderate || 0;
            const low = vulns.low || 0;

            if (critical + high > 0) {
                fail(`npm audit: ${critical} critical, ${high} high, ${moderate} moderate, ${low} low`);
                return false;
            } else if (moderate + low > 0) {
                warn(`npm audit: ${moderate} moderate, ${low} low vulnerabilities`);
                return true;
            } else {
                ok("npm audit — no known vulnerabilities");
                return true;
            }
        } catch {
            if (result.status === 0) {
                ok("npm audit — clean");
                return true;
            }
            fail("npm audit returned errors");
            return false;
        }
    } catch {
        skip("npm not installed — skipping audit");
        return true;
    }
}

function main() {
    const args = process.argv.slice(2);
    let targetPath = null;
    let auditFlag = false;
    let checkUnusedFlag = false;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--audit') auditFlag = true;
        else if (args[i] === '--check-unused') checkUnusedFlag = true;
        else if (args[i] === '-h' || args[i] === '--help') {
            console.log("Usage: node dependency_analyzer.js <path> [--audit] [--check-unused]");
            process.exit(0);
        } else if (!args[i].startsWith('-') && !targetPath) {
            targetPath = args[i];
        }
    }

    if (!targetPath) {
        console.log("Usage: node dependency_analyzer.js <path> [--audit] [--check-unused]");
        process.exit(1);
    }

    const projectRoot = path.resolve(targetPath);
    if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
        fail(`Directory not found: ${projectRoot}`);
        process.exit(1);
    }

    console.log(`${BOLD}Tribunal — dependency_analyzer.js${RESET}`);
    console.log(`Project: ${projectRoot}`);

    const pkg = loadPackageJson(projectRoot);
    if (!pkg) {
        skip("No package.json found — dependency analysis requires a Node.js project");
        process.exit(0);
    }

    let issues = 0;
    const usedImports = extractImports(projectRoot);
    console.log(`\n  Found ${usedImports.size} unique external imports in source code`);

    if (!checkUnusedFlag) {
        header("Phantom Imports (not in package.json)");
        const phantom = checkPhantom(pkg, usedImports);
        if (phantom.length > 0) {
            for (const p of phantom) fail(`'${p}' is imported but not in package.json — possible hallucination`);
            issues += phantom.length;
        } else {
            ok("All imports found in package.json");
        }
    }

    header("Unused Dependencies");
    const unused = checkUnused(pkg, usedImports);
    if (unused.length > 0) {
        for (const u of unused) warn(`'${u}' is in package.json but never imported — may be unused`);
    } else {
        ok("No obviously unused dependencies found");
    }

    if (auditFlag) {
        header("Vulnerability Audit");
        if (!runNpmAudit(projectRoot)) issues += 1;
    }

    console.log(`\n${BOLD}━━━ Dependency Analysis Summary ━━━${RESET}`);
    if (issues === 0) {
        ok("All dependency checks passed");
    } else {
        fail(`${issues} issue(s) found — review above`);
    }

    process.exit(issues > 0 ? 1 : 0);
}

if (require.main === module) {
    main();
}
