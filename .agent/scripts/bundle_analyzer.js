#!/usr/bin/env node
/**
 * bundle_analyzer.js — JS/TS bundle size analyzer for the Tribunal Agent Kit.
 *
 * Analyzes build output for:
 *   - Total bundle size
 *   - Largest files in dist/
 *   - Suggested tree-shaking opportunities
 *   - Bundler-specific analysis (Vite / Webpack)
 *
 * Usage:
 *   node .agent/scripts/bundle_analyzer.js .
 *   node .agent/scripts/bundle_analyzer.js . --build
 *   node .agent/scripts/bundle_analyzer.js . --threshold 500
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const { RED, GREEN, YELLOW, BLUE, BOLD, RESET } = require('./colors.js');

const HEAVY_PACKAGES = {
    "moment": "Use date-fns or dayjs instead (~2KB vs ~230KB)",
    "lodash": "Import specific functions: lodash/debounce instead of full lodash",
    "rxjs": "Import specific operators to enable tree-shaking",
    "aws-sdk": "Use @aws-sdk/client-* v3 modular imports",
    "firebase": "Use modular imports: firebase/auth, firebase/firestore",
    "chart.js": "Register only needed components",
    "three": "Import specific modules from three/examples/jsm/",
    "@mui/material": "Ensure babel-plugin-import or modular imports",
    "@mui/icons-material": "Import specific icons, never the barrel",
    "antd": "Use modular imports with babel-plugin-import",
};

function header(title) {
    console.log(`\n${BOLD}${BLUE}━━━ ${title} ━━━${RESET}`);
}

function ok(msg) {
    console.log(`  ${GREEN}✅ ${msg}${RESET}`);
}

function failPrint(msg) {
    console.log(`  ${RED}❌ ${msg}${RESET}`);
}

function warn(msg) {
    console.log(`  ${YELLOW}⚠️  ${msg}${RESET}`);
}

function skip(msg) {
    console.log(`  ${YELLOW}⏭️  ${msg}${RESET}`);
}

function formatSize(sizeBytes) {
    if (sizeBytes < 1024) return `${sizeBytes}B`;
    if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)}KB`;
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)}MB`;
}

function detectBundler(projectRoot) {
    const pkgPath = path.join(projectRoot, "package.json");
    if (!fs.existsSync(pkgPath)) return null;

    try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

        if (deps.vite) return "vite";
        if (deps.next) return "next";
        if (deps.webpack) return "webpack";
        
        if (fs.existsSync(path.join(projectRoot, "webpack.config.js")) || 
            fs.existsSync(path.join(projectRoot, "webpack.config.ts"))) {
            return "webpack";
        }
    } catch {}

    return null;
}

function findDistDir(projectRoot) {
    const candidates = ["dist", "build", ".next", "out", "public/build"];
    for (const c of candidates) {
        const d = path.join(projectRoot, c);
        if (fs.existsSync(d) && fs.statSync(d).isDirectory()) return d;
    }
    return null;
}

function analyzeDist(distDir, thresholdKb) {
    const files = [];
    let total = 0;

    function walkDir(dir) {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
            const fpath = path.join(dir, item.name);
            if (item.isDirectory()) {
                walkDir(fpath);
            } else {
                const size = fs.statSync(fpath).size;
                total += size;
                files.push([path.relative(distDir, fpath), size]);
            }
        }
    }

    try {
        walkDir(distDir);
    } catch {}

    files.sort((a, b) => b[1] - a[1]);
    return { total, files };
}

function checkHeavyDependencies(projectRoot) {
    const pkgPath = path.join(projectRoot, "package.json");
    if (!fs.existsSync(pkgPath)) return [];

    try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const deps = Object.keys(pkg.dependencies || {});
        const found = [];
        
        for (const [pkgName, suggestion] of Object.entries(HEAVY_PACKAGES)) {
            if (deps.includes(pkgName)) {
                found.push([pkgName, suggestion]);
            }
        }
        return found;
    } catch {
        return [];
    }
}

function runBuild(projectRoot) {
    const pkgPath = path.join(projectRoot, "package.json");
    if (fs.existsSync(pkgPath)) {
        try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            if (!pkg.scripts || !pkg.scripts.build) {
                skip("No 'build' script found in package.json");
                return true;
            }
        } catch {}
    }

    try {
        const executable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        const result = spawnSync(executable, ["run", "build"], {
            cwd: projectRoot,
            encoding: 'utf8',
            timeout: 300000,
            shell: process.platform === 'win32'
        });

        if (result.status === 0) {
            ok("Build completed successfully");
            return true;
        }

        failPrint("Build failed");
        if (result.error) {
            console.log(`    Error: ${result.error.message}`);
        }
        const out = result.stdout ? result.stdout.toString() : '';
        const err = result.stderr ? result.stderr.toString() : '';
        const output = (out + "\n" + err).trim();
        if (output) {
            for (const line of output.split("\n").slice(0, 10)) {
                console.log(`    ${line}`);
            }
        }
        return false;
    } catch (e) {
        failPrint(`Execution error: ${e.message}`);
        return false;
    }
}

function main() {
    const args = process.argv.slice(2);
    
    let targetPath = null;
    let buildFlag = false;
    let threshold = 250;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--build') buildFlag = true;
        else if (args[i] === '--threshold' && i + 1 < args.length) {
            threshold = parseInt(args[++i], 10);
        } else if (args[i].startsWith('-')) {
            console.log("Usage: node bundle_analyzer.js <path> [--build] [--threshold <kb>]");
            process.exit(1);
        } else if (!targetPath) {
            targetPath = args[i];
        }
    }

    if (!targetPath) {
        console.log("Usage: node bundle_analyzer.js <path> [--build] [--threshold <kb>]");
        process.exit(1);
    }

    const projectRoot = path.resolve(targetPath);
    if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
        failPrint(`Directory not found: ${projectRoot}`);
        process.exit(1);
    }

    console.log(`${BOLD}Tribunal — bundle_analyzer.js${RESET}`);
    console.log(`Project: ${projectRoot}`);

    const bundler = detectBundler(projectRoot);
    if (bundler) console.log(`  Bundler: ${bundler}`);

    if (buildFlag) {
        header("Building project");
        if (!runBuild(projectRoot)) {
            process.exit(1);
        }
    }

    const distDir = findDistDir(projectRoot);
    const heavy = checkHeavyDependencies(projectRoot);

    if (!distDir) {
        skip("No build output directory found (dist/, build/, .next/, out/)");
        skip("Run with --build to create a build first, or build manually");
    } else {
        header(`Bundle Size Analysis (${path.relative(projectRoot, distDir)}/)`);
        const { total, files } = analyzeDist(distDir, threshold);
        console.log(`\n  Total bundle size: ${BOLD}${formatSize(total)}${RESET}`);

        const thresholdBytes = threshold * 1024;
        console.log(`\n  ${BOLD}Top files by size:${RESET}`);
        let count = 0;
        for (const [filepath, size] of files) {
            if (count++ >= 10) break;
            const sizeStr = formatSize(size).padStart(10, ' ');
            if (size > thresholdBytes) {
                warn(`${sizeStr}  ${filepath}`);
            } else {
                console.log(`      ${sizeStr}  ${filepath}`);
            }
        }

        const largeJs = files.filter(([f, s]) => (f.endsWith('.js') || f.endsWith('.mjs')) && s > thresholdBytes);
        if (largeJs.length > 0) {
            console.log(`\n  ${YELLOW}${largeJs.length} JS file(s) exceed ${threshold}KB threshold${RESET}`);
        }
    }

    header("Dependency Weight Check");
    if (heavy.length > 0) {
        for (const [pkgName, suggestion] of heavy) {
            warn(`'${pkgName}' is a heavy dependency`);
            console.log(`      → ${suggestion}`);
        }
    } else {
        ok("No known-heavy packages detected");
    }

    console.log(`\n${BOLD}━━━ Bundle Analysis Summary ━━━${RESET}`);
    if (distDir) {
        const { total } = analyzeDist(distDir, threshold);
        const sizeStr = formatSize(total);
        if (total > 5 * 1024 * 1024) {
            failPrint(`Total bundle: ${sizeStr} — consider code splitting`);
        } else if (total > 2 * 1024 * 1024) {
            warn(`Total bundle: ${sizeStr} — review for optimization opportunities`);
        } else {
            ok(`Total bundle: ${sizeStr}`);
        }
    }

    if (heavy.length > 0) {
        warn(`${heavy.length} heavy dependency suggestion(s) — see above`);
    } else if (distDir && heavy.length === 0) {
        ok("No optimization suggestions");
    }
}

if (require.main === module) {
    main();
}
