#!/usr/bin/env node
/**
 * impact_classifier.js — Adaptive Governance Impact Classifier
 * ===============================================================
 * Analyzes diffs, file extensions, and structural changes to classify
 * tasks into Governance Impact Tiers (Tier 0 to Tier 3).
 *
 * Impact Tiers:
 *   Tier 0 (Fast-Pass):      Score < 0.15. Typo, pure CSS, markdown, comments, <10 lines.
 *                            0 LLM calls, 0 Socratic gate, <10ms execution.
 *   Tier 1 (Express Pass):   Score 0.15 - 0.35. Single file logic change.
 *                            1 domain specialist reviewer, 0 Socratic gate.
 *   Tier 2 (Targeted Audit): Score 0.35 - 0.70. Multi-file edits, non-critical domain logic.
 *                            2 reviewers, Socratic gate if ambiguity > 0.5.
 *   Tier 3 (Full Gauntlet):  Score > 0.70 or critical paths (auth, schema, security, payment).
 *                            Full multi-agent gauntlet + strict Human Gate.
 *
 * Usage:
 *   node .agent/scripts/impact_classifier.js --files "src/app.css" --diff "+color: red;"
 *   node .agent/scripts/impact_classifier.js --task "Fix typo in comment"
 */

"use strict";

const path = require("path");
const { parseArgs } = require("./_utils");

// Critical file patterns that automatically force Tier 3
const CRITICAL_PATTERNS = [
  /auth/i,
  /security/i,
  /payment/i,
  /billing/i,
  /schema/i,
  /migration/i,
  /permission/i,
  /jwt/i,
  /crypto/i,
  /secret/i,
  /eval/i
];

// Low-impact extensions / patterns for Tier 0
const FAST_PASS_EXTENSIONS = [".css", ".scss", ".less", ".md", ".txt", ".json", ".svg", ".png", ".jpg"];

/**
 * Classify impact based on files, diff content, and task description
 * @param {Object} opts - Options { files, diff, task, lineCount }
 * @returns {Object} Tier payload { tier, score, reasoning, maxReviewers, requireGate }
 */
function classifyImpact(opts = {}) {
  if (!opts || typeof opts !== "object") opts = {};
  const rawFiles = opts.files;
  const files = Array.isArray(rawFiles)
    ? rawFiles.filter(f => typeof f === "string" && f.length > 0)
    : (typeof rawFiles === "string" && rawFiles.length > 0 ? [rawFiles] : []);
  const diff = typeof opts.diff === "string" ? opts.diff : "";
  const task = typeof opts.task === "string" ? opts.task : "";
  const lineCount = typeof opts.lineCount === "number" && Number.isFinite(opts.lineCount) && opts.lineCount >= 0
    ? opts.lineCount
    : (diff.length > 0 ? diff.split("\n").length : 0);

  let score = 0.2; // Base baseline score
  const reasoning = [];

  // Check 1: Critical File Patterns
  const isCriticalFile = files.some(file => CRITICAL_PATTERNS.some(pat => pat.test(file)));
  const isCriticalTask = CRITICAL_PATTERNS.some(pat => pat.test(task));

  if (isCriticalFile || isCriticalTask) {
    score += 0.6;
    reasoning.push("Critical path detected (auth/security/schema/payment)");
  }

  // Check 2: File Extensions & Types
  if (files.length > 0) {
    const allFastPass = files.every(f => FAST_PASS_EXTENSIONS.includes(path.extname(f).toLowerCase()));
    if (allFastPass) {
      score -= 0.25;
      reasoning.push("All modified files are low-risk assets (styles/docs/assets)");
    }
  }

  // Check 3: Line Count & Diff Size
  if (lineCount <= 10) {
    score -= 0.15;
    reasoning.push("Small diff size (<= 10 lines)");
  } else if (lineCount > 100) {
    score += 0.3;
    reasoning.push("Large diff size (> 100 lines)");
  } else if (lineCount > 30) {
    score += 0.15;
    reasoning.push("Medium diff size (30-100 lines)");
  }

  // Check 4: Task Keywords
  const taskLower = task.toLowerCase();
  if (/typo|fix comment|format|lint|rename|css|style|docs|readme/i.test(taskLower)) {
    score -= 0.2;
    reasoning.push("Task signals simple edit or formatting");
  }
  if (/refactor|rewrite|architecture|redesign|migration|overhaul|security/i.test(taskLower)) {
    score += 0.35;
    reasoning.push("Task signals structural refactor or security review");
  }

  // Clamp score between 0.0 and 1.0
  score = Math.max(0.0, Math.min(1.0, score));

  // Determine Impact Tier
  let tier = 1;
  let maxReviewers = 1;
  let requireGate = false;

  if (score < 0.15 && !isCriticalFile && !isCriticalTask) {
    tier = 0;
    maxReviewers = 0;
    requireGate = false;
  } else if (score < 0.35 && !isCriticalFile && !isCriticalTask) {
    tier = 1;
    maxReviewers = 1;
    requireGate = false;
  } else if (score < 0.70 && !isCriticalFile) {
    tier = 2;
    maxReviewers = 2;
    requireGate = true; // Conditional gate
  } else {
    tier = 3;
    maxReviewers = 8;
    requireGate = true;
  }

  return {
    tier,
    score: parseFloat(score.toFixed(2)),
    maxReviewers,
    requireGate,
    reasoning,
    fastPass: tier === 0
  };
}

// Direct CLI Execution
if (require.main === module) {
  const args = parseArgs(process.argv);
  const files = args.files ? args.files.split(",") : [];
  const result = classifyImpact({
    files,
    diff: args.diff || "",
    task: args.task || "",
    lineCount: args.lines ? parseInt(args.lines, 10) : undefined
  });

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`\n━━━ Adaptive Governance Impact Tier ━━━━━━━━━━━━━`);
    console.log(`  Tier:         Tier ${result.tier} (${result.fastPass ? "FAST-PASS" : result.tier === 1 ? "EXPRESS" : result.tier === 2 ? "TARGETED" : "GAUNTLET"})`);
    console.log(`  Score:        ${result.score}`);
    console.log(`  Max Reviewers:${result.maxReviewers}`);
    console.log(`  Require Gate: ${result.requireGate}`);
    console.log(`  Reasoning:    ${result.reasoning.join(" | ") || "Baseline assessment"}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  }
}

module.exports = { classifyImpact };
