"use strict";
/**
 * guardrail.js — CLI command handler for `tk guardrail`
 *
 * Validates .agent/ files against the integrity manifest using
 * the Neurosymbolic Guardrail Engine.
 *
 * Usage:
 *   tk guardrail                    → Scan all .agent/ files
 *   tk guardrail --file output.md   → Validate a specific file
 *   tk guardrail --fix              → Auto-fix simple violations
 *   tk guardrail --json             → Output as JSON
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmdGuardrail = cmdGuardrail;

const fs = require("fs");
const path = require("path");
const logger_1 = require("../utils/logger");

async function cmdGuardrail(flags, argv, quiet) {
  const projectRoot = flags.path || process.cwd();
  const agentDir = path.join(projectRoot, ".agent");

  if (!fs.existsSync(agentDir)) {
    (0, logger_1.err)("No .agent/ directory found. Run `tk init` first.");
    process.exit(1);
  }

  // Resolve script paths (installed vs local development)
  const scriptsDir = path.join(agentDir, "scripts");
  const manifestScript = path.join(scriptsDir, "integrity_manifest.js");
  const guardrailScript = path.join(scriptsDir, "guardrail_engine.js");

  if (!fs.existsSync(manifestScript)) {
    (0, logger_1.err)(
      "integrity_manifest.js not found in .agent/scripts/. Your installation may be outdated — run `tk update`.",
    );
    process.exit(1);
  }

  if (!fs.existsSync(guardrailScript)) {
    (0, logger_1.err)(
      "guardrail_engine.js not found in .agent/scripts/. Your installation may be outdated — run `tk update`.",
    );
    process.exit(1);
  }

  // Step 1: Generate manifest
  if (!quiet) {
    (0, logger_1.log)(
      `  ${(0, logger_1.c)("cyan", "◆")} Generating integrity manifest...`,
    );
  }

  const { generateManifest, saveManifest } = require(manifestScript);
  const manifest = generateManifest(projectRoot);

  if (manifest.error) {
    (0, logger_1.err)(manifest.error);
    process.exit(1);
  }

  // Save manifest for future use
  saveManifest(manifest, projectRoot);

  // Step 2: Determine files to validate
  const { validate } = require(guardrailScript);
  const fileArg = extractFileArg(argv);
  const fixMode = flags.write || argv.includes("--fix");
  const jsonMode = argv.includes("--json");

  let filesToCheck = [];

  if (fileArg) {
    const resolved = path.resolve(fileArg);
    if (!fs.existsSync(resolved)) {
      (0, logger_1.err)(`File not found: ${fileArg}`);
      process.exit(1);
    }
    filesToCheck.push(resolved);
  } else {
    // Scan all .agent/ markdown files
    filesToCheck = walkAgentFiles(agentDir);
  }

  if (!quiet) {
    (0, logger_1.log)(
      `  ${(0, logger_1.c)("cyan", "◆")} Scanning ${filesToCheck.length} files...`,
    );
  }

  // Step 3: Run guardrail engine
  let totalViolations = 0;
  let totalCritical = 0;
  let totalAutoFixed = 0;
  const allResults = [];

  for (const file of filesToCheck) {
    const content = fs.readFileSync(file, "utf8");
    const result = validate(content, manifest, {
      autoFix: fixMode,
      context: { projectRoot, filePath: file },
    });

    if (result.violations.length > 0) {
      totalViolations += result.violations.length;
      totalCritical += result.violations.filter(
        (v) => v.severity === "critical",
      ).length;

      allResults.push({
        file: path.relative(projectRoot, file),
        ...result,
      });

      // Apply auto-fix
      if (
        fixMode &&
        result.autoFixedContent &&
        result.autoFixedContent !== content
      ) {
        fs.writeFileSync(file, result.autoFixedContent, "utf8");
        totalAutoFixed++;
      }
    }
  }

  // Step 4: Output results
  if (jsonMode) {
    console.log(
      JSON.stringify(
        {
          manifest_summary: {
            agents: manifest.agents.total,
            reviewers: manifest.agents.reviewer_count,
            skills: manifest.skills.total,
            scripts: manifest.scripts.total,
            workflows: manifest.workflows.total,
          },
          files_scanned: filesToCheck.length,
          total_violations: totalViolations,
          critical_violations: totalCritical,
          auto_fixed: totalAutoFixed,
          results: allResults,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (quiet) {
    process.exit(totalCritical > 0 ? 1 : 0);
    return;
  }

  // Human-readable output
  console.log();
  console.log(
    `  ${(0, logger_1.c)("cyan", "🛡️")}  ${(0, logger_1.bold)("Guardrail Validation Report")}`,
  );
  console.log(`  ${(0, logger_1.c)("gray", "─".repeat(40))}`);
  console.log(
    `  Agents:       ${(0, logger_1.c)("white", String(manifest.agents.total))} (${manifest.agents.reviewer_count} reviewers)`,
  );
  console.log(
    `  Skills:       ${(0, logger_1.c)("white", String(manifest.skills.total))}`,
  );
  console.log(
    `  Scripts:      ${(0, logger_1.c)("white", String(manifest.scripts.total))}`,
  );
  console.log(
    `  Workflows:    ${(0, logger_1.c)("white", String(manifest.workflows.total))}`,
  );
  console.log(`  ${(0, logger_1.c)("gray", "─".repeat(40))}`);
  console.log(
    `  Files scanned: ${(0, logger_1.c)("white", String(filesToCheck.length))}`,
  );
  console.log(
    `  Violations:    ${totalViolations > 0 ? (0, logger_1.c)("yellow", String(totalViolations)) : (0, logger_1.c)("green", "0")}`,
  );
  console.log(
    `  Critical:      ${totalCritical > 0 ? (0, logger_1.c)("red", String(totalCritical)) : (0, logger_1.c)("green", "0")}`,
  );

  if (fixMode && totalAutoFixed > 0) {
    console.log(
      `  Auto-fixed:    ${(0, logger_1.c)("green", String(totalAutoFixed))}`,
    );
  }

  console.log(`  ${(0, logger_1.c)("gray", "─".repeat(40))}`);

  // Show violations
  for (const result of allResults) {
    console.log(
      `\n  📄 ${(0, logger_1.c)("cyan", result.file)} — ${result.summary}`,
    );
    for (const v of result.violations) {
      const icon =
        v.severity === "critical"
          ? (0, logger_1.c)("red", "●")
          : v.severity === "warning"
            ? (0, logger_1.c)("yellow", "●")
            : (0, logger_1.c)("blue", "●");
      console.log(
        `     ${icon} [${(0, logger_1.c)("gray", v.rule)}] ${v.message}`,
      );
      if (v.suggestion) {
        console.log(
          `        ${(0, logger_1.c)("gray", "💡")} ${(0, logger_1.c)("gray", v.suggestion)}`,
        );
      }
    }
  }

  if (totalViolations === 0) {
    console.log(
      `\n  ${(0, logger_1.c)("green", "✅")} All files clean. Zero phantom references. Zero count mismatches.`,
    );
  }

  console.log();
  process.exit(totalCritical > 0 ? 1 : 0);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractFileArg(argv) {
  const raw = argv.slice(2);
  const fileIdx = raw.indexOf("--file");
  if (fileIdx !== -1 && raw[fileIdx + 1]) {
    return raw[fileIdx + 1];
  }
  // Also check for positional arg after 'guardrail'
  for (const arg of raw) {
    if (arg === "guardrail" || arg.startsWith("--")) continue;
    if (fs.existsSync(arg)) return arg;
  }
  return null;
}

function walkAgentFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;

  try {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      if (
        ["node_modules", ".git", "history", ".backups", ".shared"].includes(
          entry,
        )
      ) {
        continue;
      }
      const fullPath = path.join(dir, entry);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walkAgentFiles(fullPath, fileList);
        } else if (entry.endsWith(".md") || entry.endsWith(".json")) {
          fileList.push(fullPath);
        }
      } catch {
        // Skip
      }
    }
  } catch {
    // Skip
  }

  return fileList;
}
