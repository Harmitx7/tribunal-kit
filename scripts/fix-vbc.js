#!/usr/bin/env node
/**
 * fix-vbc.js — Batch appends missing VBC Protocol and Pre-Flight sections
 * to all SKILL.md files in .agent/skills/ that are failing validation.
 *
 * Run: node scripts/fix-vbc.js
 * Dry-run: node scripts/fix-vbc.js --dry-run
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(ROOT, ".agent", "skills");
const DRY_RUN = process.argv.includes("--dry-run");

const PRE_FLIGHT_BLOCK = `
### ✅ Pre-Flight Self-Audit

\`\`\`
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
\`\`\`
`;

const VBC_BLOCK = `
### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
`;

let fixedCount = 0;
let skippedCount = 0;
let errorCount = 0;

const skillDirs = fs.readdirSync(SKILLS_DIR).filter((d) => {
  return fs.statSync(path.join(SKILLS_DIR, d)).isDirectory();
});

for (const dir of skillDirs) {
  const skillPath = path.join(SKILLS_DIR, dir, "SKILL.md");
  if (!fs.existsSync(skillPath)) continue;

  let content;
  try {
    content = fs.readFileSync(skillPath, "utf8");
  } catch (e) {
    console.error(`  ❌ Failed to read: ${dir}/SKILL.md — ${e.message}`);
    errorCount++;
    continue;
  }

  const hasPreFlight =
    content.includes("Pre-Flight Checklist") || content.includes("Pre-Flight");
  const hasVBC =
    content.includes("VBC Protocol") || content.includes("VBC");

  if (hasPreFlight && hasVBC) {
    skippedCount++;
    continue;
  }

  let appendText = "";

  if (!hasPreFlight) {
    appendText += PRE_FLIGHT_BLOCK;
    console.log(`  🔧 ${dir}/SKILL.md — appending Pre-Flight Self-Audit`);
  }

  if (!hasVBC) {
    appendText += VBC_BLOCK;
    console.log(`  🔧 ${dir}/SKILL.md — appending VBC Protocol`);
  }

  if (DRY_RUN) {
    console.log(`  [DRY-RUN] Would append to ${dir}/SKILL.md`);
  } else {
    try {
      fs.appendFileSync(skillPath, appendText, "utf8");
      fixedCount++;
    } catch (e) {
      console.error(`  ❌ Failed to write: ${dir}/SKILL.md — ${e.message}`);
      errorCount++;
    }
  }
}

console.log(`\n━━━ VBC Fix Summary ━━━━━━━━━━━━━━━━━━━━━`);
console.log(`  Fixed:   ${fixedCount}`);
console.log(`  Skipped: ${skippedCount} (already compliant)`);
console.log(`  Errors:  ${errorCount}`);
console.log(`  Mode:    ${DRY_RUN ? "DRY-RUN (no changes)" : "LIVE"}`);
console.log();
