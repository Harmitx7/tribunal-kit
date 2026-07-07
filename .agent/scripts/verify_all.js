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

"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const {
  RED,
  GREEN,
  YELLOW,
  BOLD,
  DIM,
  CYAN,
  RESET,
  banner,
  sectionHeader,
  summaryTable,
  timer,
  formatMs,
} = require("./_colors");

const { walkDir, hasNpm } = require("./_utils");

// ── Results Tracking ────────────────────────────────────────────────────────

const RESULTS = [];

function trackOk(label, ms, note) {
  const timing = ms != null ? `${DIM}(${formatMs(ms)})${RESET}` : "";
  const noteStr = note ? `  ${DIM}${note}${RESET}` : "";
  console.log(`  ${GREEN}✅ ${label}${RESET} ${timing}${noteStr}`);
  RESULTS.push({ name: label, status: "pass", ms, note: note || "" });
}

function trackFail(label, ms, note) {
  const timing = ms != null ? `${DIM}(${formatMs(ms)})${RESET}` : "";
  const noteStr = note ? `\n     ${note}` : "";
  console.log(`  ${RED}❌ ${label}${RESET} ${timing}${noteStr}`);
  RESULTS.push({ name: label, status: "fail", ms, note: note || "" });
}

function trackSkip(label, reason) {
  console.log(`  ${YELLOW}⏭️  ${label} — ${reason}${RESET}`);
  RESULTS.push({ name: label, status: "skip", note: `skipped: ${reason}` });
}

// ── Command Runner ──────────────────────────────────────────────────────────

/**
 * Run a shell command and return true if it exits with code 0.
 */
function run(label, cmd, cwd) {
  const elapsed = timer();
  try {
    const isWindows = process.platform === "win32";

    execFileSync(cmd[0], cmd.slice(1), {
      cwd,
      stdio: "pipe",
      timeout: 120000,
      encoding: "utf8",
      shell: isWindows,
    });
    trackOk(label, elapsed());
    return true;
  } catch (err) {
    const ms = elapsed();
    if (err.code === "ENOENT") {
      trackSkip(label, "tool not installed — skipping");
      return true;
    }
    if (err.killed) {
      trackFail(label, ms, "timed out after 120s");
      return false;
    }
    const output = ((err.stdout || "") + (err.stderr || "")).trim();
    trackFail(label, ms, output ? output.slice(0, 500) : "non-zero exit code");
    return false;
  }
}

/**
 * Scan source files for obviously hardcoded credentials.
 * Uses shared walkDir from _utils.js to eliminate duplicated walker code.
 */
function scanSecrets(cwd) {
  const elapsed = timer();
  const patterns = [
    "password=",
    "secret=",
    "api_key=",
    "private_key=",
    "auth_token=",
  ];
  const found = [];

  const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".py"]);
  const files = walkDir(cwd, { extensions: sourceExtensions });

  for (const fullPath of files) {
    let content;
    try {
      content = fs.readFileSync(fullPath, "utf8");
    } catch {
      continue;
    }

    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const low = lines[i].toLowerCase().trim();
      const hasPattern = patterns.some((p) => low.includes(p));
      if (hasPattern && !low.startsWith("#") && low.includes("=")) {
        const rel = path.relative(cwd, fullPath);
        found.push(`${rel}:${i + 1}`);
      }
    }
  }

  const ms = elapsed();
  if (found.length > 0) {
    trackFail("Secret scan", ms, found.slice(0, 5).join("\n     "));
    return false;
  }
  trackOk(
    "Secret scan — no hardcoded credentials found",
    ms,
    `${files.length} files scanned`,
  );
  return true;
}

/**
 * Run all verification checks. Returns number of failures.
 */
function verifyAll(cwd, skipped) {
  let failures = 0;
  RESULTS.length = 0; // Reset for clean runs (prevents accumulation in tests)
  const totalTimer = timer();

  console.log(sectionHeader("Secret Scan", 1));
  if (!skipped.includes("secrets")) {
    if (!scanSecrets(cwd)) failures++;
  } else {
    trackSkip("Secret scan", "skipped by flag");
  }

  console.log(sectionHeader("TypeScript", 2));
  if (!skipped.includes("typescript")) {
    if (hasNpm(cwd)) {
      if (!run("tsc --noEmit", ["npx", "tsc", "--noEmit"], cwd)) failures++;
    } else {
      trackSkip("TypeScript", "no package.json found in project");
    }
  } else {
    trackSkip("TypeScript", "skipped by flag");
  }

  console.log(sectionHeader("ESLint", 3));
  if (!skipped.includes("lint")) {
    if (hasNpm(cwd)) {
      if (!run("ESLint", ["npx", "eslint", ".", "--max-warnings=0"], cwd))
        failures++;
    } else {
      trackSkip("ESLint", "no package.json found in project");
    }
  } else {
    trackSkip("ESLint", "skipped by flag");
  }

  console.log(sectionHeader("Unit Tests", 4));
  if (!skipped.includes("tests")) {
    if (hasNpm(cwd)) {
      if (!run("Test suite", ["npm", "test", "--", "--passWithNoTests"], cwd))
        failures++;
    } else {
      trackSkip("Tests", "no package.json found in project");
    }
  } else {
    trackSkip("Tests", "skipped by flag");
  }

  console.log(sectionHeader("Build", 5));
  if (!skipped.includes("build")) {
    if (hasNpm(cwd)) {
      if (!run("npm run build", ["npm", "run", "build"], cwd)) failures++;
    } else {
      trackSkip("Build", "no package.json found in project");
    }
  } else {
    trackSkip("Build", "skipped by flag");
  }

  console.log(sectionHeader("Dependency Audit", 6));
  if (!skipped.includes("deps")) {
    if (hasNpm(cwd)) {
      if (!run("npm audit", ["npm", "audit", "--audit-level=high"], cwd))
        failures++;
    } else {
      trackSkip("Dependency audit", "no package.json found in project");
    }
  } else {
    trackSkip("Dependency audit", "skipped by flag");
  }

  // ━━━ Summary Table ━━━
  const totalMs = totalTimer();
  console.log(`\n${BOLD}${CYAN}━━━ Verification Summary ━━━${RESET}`);
  summaryTable(RESULTS);

  const passCount = RESULTS.filter((r) => r.status === "pass").length;
  const failCount = RESULTS.filter((r) => r.status === "fail").length;
  const skipCount = RESULTS.filter((r) => r.status === "skip").length;

  console.log(
    `\n  ${DIM}Total: ${RESULTS.length} checks in ${formatMs(totalMs)}${RESET}`,
  );
  console.log(
    `  ${GREEN}${passCount} passed${RESET}  ${failCount > 0 ? `${RED}${failCount} failed${RESET}  ` : ""}${skipCount > 0 ? `${YELLOW}${skipCount} skipped${RESET}` : ""}`,
  );

  console.log();
  if (failures === 0) {
    console.log(
      `${GREEN}${BOLD}  ✔ All checks passed — safe to deploy.${RESET}`,
    );
  } else {
    console.log(
      `${RED}${BOLD}  ✖ ${failures} check(s) failed — fix before deploying.${RESET}`,
    );
  }
  console.log();

  return failures;
}

/**
 * Parse CLI arguments manually (no external dependencies).
 */
function parseArgs(argv) {
  const args = { skip: [] };
  const raw = argv.slice(2);

  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === "--skip" && raw[i + 1]) {
      args.skip = raw[++i]
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  const cwd = process.cwd();

  console.log(banner("verify_all.js", { Project: cwd }));

  const failures = verifyAll(cwd, args.skip);
  process.exit(failures > 0 ? 1 : 0);
}

// ━━━ Exports for testing & programmatic use ━━━
module.exports = { verifyAll, scanSecrets, hasNpm };

if (require.main === module) {
  main();
}
