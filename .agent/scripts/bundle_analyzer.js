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

"use strict";

const fs = require("fs");
const path = require("path");

const {
  YELLOW,
  BOLD,
  DIM,
  CYAN,
  RESET,
  banner,
  sectionHeader,
  timer,
  formatMs,
  ok,
  fail,
  warn,
  skip,
} = require("./_colors");

const { loadJson, runCommand } = require("./_utils");

const HEAVY_PACKAGES = {
  moment: "Use date-fns or dayjs instead (~2KB vs ~230KB)",
  lodash: "Import specific functions: lodash/debounce instead of full lodash",
  rxjs: "Import specific operators to enable tree-shaking",
  "aws-sdk": "Use @aws-sdk/client-* v3 modular imports",
  firebase: "Use modular imports: firebase/auth, firebase/firestore",
  "chart.js": "Register only needed components",
  three: "Import specific modules from three/examples/jsm/",
  "@mui/material": "Ensure babel-plugin-import or modular imports",
  "@mui/icons-material": "Import specific icons, never the barrel",
  antd: "Use modular imports with babel-plugin-import",
};

function formatSize(sizeBytes) {
  if (sizeBytes < 1024) return `${sizeBytes}B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)}KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)}MB`;
}

function detectBundler(projectRoot) {
  const pkg = loadJson(path.join(projectRoot, "package.json"));
  if (!pkg) return null;

  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

  if (deps.vite) return "vite";
  if (deps.next) return "next";
  if (deps.webpack) return "webpack";

  if (
    fs.existsSync(path.join(projectRoot, "webpack.config.js")) ||
    fs.existsSync(path.join(projectRoot, "webpack.config.ts"))
  ) {
    return "webpack";
  }

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

/**
 * Analyze dist directory. Uses inline walker (not shared _utils.walkDir)
 * because it needs to collect file sizes and totals in one pass.
 */
function analyzeDist(distDir) {
  const files = [];
  let total = 0;

  function _walk(dir) {
    let items;
    try {
      items = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const item of items) {
      const fpath = path.join(dir, item.name);
      if (item.isDirectory()) {
        _walk(fpath);
      } else {
        const size = fs.statSync(fpath).size;
        total += size;
        files.push([path.relative(distDir, fpath), size]);
      }
    }
  }

  _walk(distDir);
  files.sort((a, b) => b[1] - a[1]);
  return { total, files };
}

function checkHeavyDependencies(projectRoot) {
  const pkg = loadJson(path.join(projectRoot, "package.json"));
  if (!pkg) return [];

  const deps = Object.keys(pkg.dependencies || {});
  const found = [];

  for (const [pkgName, suggestion] of Object.entries(HEAVY_PACKAGES)) {
    if (deps.includes(pkgName)) {
      found.push([pkgName, suggestion]);
    }
  }
  return found;
}

function runBuild(projectRoot) {
  const pkg = loadJson(path.join(projectRoot, "package.json"));
  if (pkg && (!pkg.scripts || !pkg.scripts.build)) {
    skip("No 'build' script found in package.json");
    return true;
  }

  const elapsed = timer();
  const result = runCommand("npm", ["run", "build"], {
    cwd: projectRoot,
    timeout: 300000,
  });

  const ms = elapsed();
  if (result.ok) {
    ok(`Build completed successfully ${DIM}(${formatMs(ms)})${RESET}`);
    return true;
  }

  fail(`Build failed ${DIM}(${formatMs(ms)})${RESET}`);
  const output = (result.stdout + "\n" + result.stderr).trim();
  if (output) {
    for (const line of output.split("\n").slice(0, 10)) {
      console.log(`    ${line}`);
    }
  }
  return false;
}

function main() {
  const args = process.argv.slice(2);

  let targetPath = null;
  let buildFlag = false;
  let threshold = 250;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--build") buildFlag = true;
    else if (args[i] === "--threshold" && i + 1 < args.length) {
      threshold = parseInt(args[++i], 10);
    } else if (args[i] === "-h" || args[i] === "--help") {
      console.log(
        "Usage: node bundle_analyzer.js <path> [--build] [--threshold <kb>]",
      );
      process.exit(0);
    } else if (args[i].startsWith("-")) {
      console.log(
        "Usage: node bundle_analyzer.js <path> [--build] [--threshold <kb>]",
      );
      process.exit(1);
    } else if (!targetPath) {
      targetPath = args[i];
    }
  }

  if (!targetPath) {
    console.log(
      "Usage: node bundle_analyzer.js <path> [--build] [--threshold <kb>]",
    );
    process.exit(1);
  }

  const projectRoot = path.resolve(targetPath);
  if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
    fail(`Directory not found: ${projectRoot}`);
    process.exit(1);
  }

  const bundler = detectBundler(projectRoot);
  console.log(
    banner("bundle_analyzer.js", {
      Project: projectRoot,
      Bundler: bundler || "auto-detect",
      Threshold: `${threshold}KB`,
    }),
  );

  if (buildFlag) {
    console.log(sectionHeader("Building Project"));
    if (!runBuild(projectRoot)) {
      process.exit(1);
    }
  }

  const distDir = findDistDir(projectRoot);
  const heavy = checkHeavyDependencies(projectRoot);

  // PERFORMANCE FIX: Cache analyzeDist result — was called TWICE before
  let distResult = null;

  if (!distDir) {
    skip("No build output directory found (dist/, build/, .next/, out/)");
    skip("Run with --build to create a build first, or build manually");
  } else {
    console.log(
      sectionHeader(
        `Bundle Size Analysis (${path.relative(projectRoot, distDir)}/)`,
      ),
    );
    distResult = analyzeDist(distDir);
    console.log(
      `\n  Total bundle size: ${BOLD}${formatSize(distResult.total)}${RESET}`,
    );

    const thresholdBytes = threshold * 1024;
    console.log(`\n  ${BOLD}Top files by size:${RESET}`);
    let count = 0;
    for (const [filepath, size] of distResult.files) {
      if (count++ >= 10) break;
      const sizeStr = formatSize(size).padStart(10, " ");
      if (size > thresholdBytes) {
        warn(`${sizeStr}  ${filepath}`);
      } else {
        console.log(`      ${sizeStr}  ${filepath}`);
      }
    }

    const largeJs = distResult.files.filter(
      ([f, s]) =>
        (f.endsWith(".js") || f.endsWith(".mjs")) && s > thresholdBytes,
    );
    if (largeJs.length > 0) {
      console.log(
        `\n  ${YELLOW}${largeJs.length} JS file(s) exceed ${threshold}KB threshold${RESET}`,
      );
    }
  }

  console.log(sectionHeader("Dependency Weight Check"));
  if (heavy.length > 0) {
    for (const [pkgName, suggestion] of heavy) {
      warn(`'${pkgName}' is a heavy dependency`);
      console.log(`      → ${suggestion}`);
    }
  } else {
    ok("No known-heavy packages detected");
  }

  // ━━━ Summary ━━━ (reuses cached distResult instead of re-scanning)
  console.log(`\n${BOLD}${CYAN}━━━ Bundle Analysis Summary ━━━${RESET}`);
  if (distResult) {
    const sizeStr = formatSize(distResult.total);
    if (distResult.total > 5 * 1024 * 1024) {
      fail(`Total bundle: ${sizeStr} — consider code splitting`);
    } else if (distResult.total > 2 * 1024 * 1024) {
      warn(`Total bundle: ${sizeStr} — review for optimization opportunities`);
    } else {
      ok(`Total bundle: ${sizeStr}`);
    }
  }

  if (heavy.length > 0) {
    warn(`${heavy.length} heavy dependency suggestion(s) — see above`);
  } else if (distResult && heavy.length === 0) {
    ok("No optimization suggestions");
  }
  console.log();
}

if (require.main === module) {
  main();
}
