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
  fail,
} = require("./_colors");

const { walkDir } = require("./_utils");

// ── Results Tracking ────────────────────────────────────────────────────────

const RESULTS = [];

function trackOk(label, ms) {
  const timing = ms != null ? `${DIM}(${formatMs(ms)})${RESET}` : "";
  console.log(`  ${GREEN}✅ ${label}${RESET} ${timing}`);
  RESULTS.push({ name: label, status: "pass", ms });
}

function trackFail(label, ms, note) {
  const timing = ms != null ? `${DIM}(${formatMs(ms)})${RESET}` : "";
  console.log(`  ${RED}❌ ${label}${RESET} ${timing}`);
  if (note) console.log(`    ${note.slice(0, 500)}`);
  RESULTS.push({ name: label, status: "fail", ms });
}

function trackSkip(label, reason) {
  console.log(`  ${YELLOW}⏭️  ${label} — ${reason}${RESET}`);
  RESULTS.push({ name: label, status: "skip" });
}

/**
 * Run a shell command and return true if it exits with code 0.
 * @param {string} label - Human-readable label for the check.
 * @param {string[]} cmd - Command and arguments array.
 * @param {string} cwd - Working directory.
 * @returns {boolean}
 */
function runCheck(label, cmd, cwd) {
  const elapsed = timer();
  try {
    execFileSync(cmd[0], cmd.slice(1), {
      cwd,
      stdio: "pipe",
      timeout: 60000,
      encoding: "utf8",
      shell: process.platform === "win32",
    });
    trackOk(`${label} passed`, elapsed());
    return true;
  } catch (err) {
    const ms = elapsed();
    if (err.code === "ENOENT") {
      trackSkip(label, "command not found (tool not installed)");
      return true; // Don't block on tools that aren't installed
    }
    if (err.killed) {
      trackFail(label, ms, "timed out after 60s");
      return false;
    }
    const output = ((err.stdout || "") + (err.stderr || "")).trim();
    trackFail(`${label} failed`, ms, output || "non-zero exit code");
    return false;
  }
}

/**
 * Scan for hardcoded secrets in source files.
 * Uses shared walkDir from _utils.js.
 * @param {string} projectRoot - Project root directory.
 * @returns {boolean} True if no secrets found.
 */
function checkSecrets(projectRoot) {
  const elapsed = timer();
  const dangerousPatterns = [
    "password=",
    "secret=",
    "api_key=",
    "apikey=",
    "auth_token=",
    "private_key=",
  ];
  let foundIssues = false;
  const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".py"]);

  const files = walkDir(projectRoot, { extensions: sourceExtensions });

  for (const fullPath of files) {
    // Skip .env files — they are allowed to contain secrets
    if (path.basename(fullPath).startsWith(".env")) continue;

    let content;
    try {
      content = fs.readFileSync(fullPath, "utf8");
    } catch {
      continue;
    }

    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase().trim();
      const hasPattern = dangerousPatterns.some((p) => lineLower.includes(p));
      if (hasPattern && lineLower.includes("=") && !lineLower.startsWith("#")) {
        const rel = path.relative(projectRoot, fullPath);
        fail(
          `Possible secret: ${rel}:${i + 1} → ${lines[i].trim().slice(0, 80)}`,
        );
        foundIssues = true;
      }
    }
  }

  const ms = elapsed();
  if (!foundIssues) {
    trackOk(`Secret scan — ${files.length} files clean`, ms);
  } else {
    trackFail("Secret scan — hardcoded credentials detected", ms);
  }
  return !foundIssues;
}

/**
 * Run all checklist tiers. Returns number of failures.
 * @param {string} projectRoot - Project root.
 * @param {string|null} url - URL for Lighthouse/E2E checks.
 * @param {string[]} skipTiers - Tiers to skip.
 * @returns {number}
 */
function runAll(projectRoot, url, skipTiers) {
  let failures = 0;
  RESULTS.length = 0;
  const totalTimer = timer();

  // Priority 1 — Security
  if (!skipTiers.includes("security")) {
    console.log(sectionHeader("Security — Secret Scan", 1));
    if (!checkSecrets(projectRoot)) failures++;
  } else {
    trackSkip("Security", "skipped by flag");
  }

  // Priority 2 — Lint
  if (!skipTiers.includes("lint")) {
    console.log(sectionHeader("Lint", 2));
    if (
      !runCheck(
        "ESLint",
        ["npx", "eslint", ".", "--max-warnings=0"],
        projectRoot,
      )
    )
      failures++;
    if (!runCheck("TypeScript", ["npx", "tsc", "--noEmit"], projectRoot))
      failures++;
  } else {
    trackSkip("Lint", "skipped by flag");
  }

  // Priority 3 — Schema
  if (!skipTiers.includes("schema")) {
    console.log(sectionHeader("Schema Validation", 3));
    trackSkip("Schema", "run manually if you have DB migrations");
  } else {
    trackSkip("Schema", "skipped by flag");
  }

  // Priority 4 — Tests
  if (!skipTiers.includes("tests")) {
    console.log(sectionHeader("Tests", 4));
    if (
      !runCheck(
        "Test suite",
        ["npm", "test", "--", "--passWithNoTests"],
        projectRoot,
      )
    )
      failures++;
  } else {
    trackSkip("Tests", "skipped by flag");
  }

  // Priority 5 — UX
  if (!skipTiers.includes("ux")) {
    console.log(sectionHeader("UX / Accessibility", 5));
    trackSkip("UX audit", "run /preview start then check with Lighthouse");
  } else {
    trackSkip("UX", "skipped by flag");
  }

  // Priority 6 — SEO
  if (!skipTiers.includes("seo")) {
    console.log(sectionHeader("SEO", 6));
    trackSkip("SEO check", "use /ui-ux-pro-max for SEO-sensitive pages");
  } else {
    trackSkip("SEO", "skipped by flag");
  }

  // Priority 7 — Lighthouse / E2E
  if (url && !skipTiers.includes("e2e")) {
    console.log(sectionHeader("Lighthouse / E2E", 7));
    if (!runCheck("Playwright E2E", ["npx", "playwright", "test"], projectRoot))
      failures++;
  } else if (!url) {
    trackSkip("E2E / Lighthouse", "pass --url to enable");
  }

  // ━━━ Summary ━━━
  const totalMs = totalTimer();
  console.log(`\n${BOLD}${CYAN}━━━ Checklist Summary ━━━${RESET}`);
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
      `${GREEN}${BOLD}  ✔ All checks passed — ready to proceed.${RESET}`,
    );
  } else {
    console.log(
      `${RED}${BOLD}  ✖ ${failures} tier(s) failed — fix critical issues before proceeding.${RESET}`,
    );
  }
  console.log();

  return failures;
}

/**
 * Parse CLI arguments manually (no external dependencies).
 */
function parseArgs(argv) {
  const args = { path: null, url: null, skip: [] };
  const raw = argv.slice(2);

  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === "--url" && raw[i + 1]) {
      args.url = raw[++i];
    } else if (raw[i] === "--skip" && raw[i + 1]) {
      args.skip = raw[++i]
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
    } else if (!raw[i].startsWith("--") && !args.path) {
      args.path = raw[i];
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);

  if (!args.path) {
    console.error(
      `Usage: node checklist.js <path> [--url <url>] [--skip security,lint,schema,tests,ux,seo,e2e]`,
    );
    process.exit(1);
  }

  const projectRoot = path.resolve(args.path);
  if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
    fail(`Directory not found: ${projectRoot}`);
    process.exit(1);
  }

  console.log(banner("checklist.js", { Project: projectRoot }));

  const failures = runAll(projectRoot, args.url, args.skip);
  process.exit(failures > 0 ? 1 : 0);
}

// ━━━ Exports for testing & programmatic use ━━━
module.exports = { runCheck, checkSecrets, runAll };

if (require.main === module) {
  main();
}
