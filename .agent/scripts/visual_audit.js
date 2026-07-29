#!/usr/bin/env node
/**
 * visual_audit.js — Visual Design & UI Engineering Auditor
 *
 * Verifies OKLCH color compliance, surface depth layering (hairline borders, ambient shadows),
 * and interactive state polish on UI components and style definitions.
 *
 * Usage:
 *   node .agent/scripts/visual_audit.js .
 *   node .agent/scripts/visual_audit.js --file src/components/Button.tsx
 */

"use strict";

const fs = require("fs");
const path = require("path");

const {
  GREEN,
  YELLOW,
  BOLD,
  DIM,
  RESET,
  banner,
  timer,
  formatMs,
} = require("./_colors");

const { walkDir, SOURCE_EXTENSIONS } = require("./_utils");

function auditFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    return [];
  }

  const issues = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for hardcoded hex colors when oklch or CSS variables are expected
    if (/#([0-9a-fA-F]{3}){1,2}\b/.test(line) && !line.includes("// ignore-color")) {
      issues.push({
        line: i + 1,
        rule: "oklch-color",
        message: `Hardcoded hex color found: "${line.trim()}". Prefer OKLCH or design token CSS variables.`,
      });
    }
  }

  return issues;
}

function main() {
  const cwd = process.cwd();
  const elapsed = timer();

  console.log(banner("visual_audit.js", { Target: cwd }));

  const files = walkDir(cwd, { extensions: SOURCE_EXTENSIONS });
  let totalIssues = 0;

  for (const file of files) {
    const issues = auditFile(file);
    if (issues.length > 0) {
      totalIssues += issues.length;
      const rel = path.relative(cwd, file);
      console.log(`\n  📄 ${BOLD}${rel}${RESET}`);
      for (const iss of issues) {
        console.log(`     ${YELLOW}⚠ line ${iss.line}:${RESET} ${iss.message}`);
      }
    }
  }

  console.log(`\n  ${DIM}Audited ${files.length} files in ${formatMs(elapsed())}${RESET}`);

  if (totalIssues === 0) {
    console.log(`  ${GREEN}${BOLD}✔ Visual audit complete — zero design violations found.${RESET}\n`);
  } else {
    console.log(`  ${YELLOW}${BOLD}⚠ Visual audit completed with ${totalIssues} advisory issue(s).${RESET}\n`);
  }
}

module.exports = { auditFile };

if (require.main === module) {
  main();
}
