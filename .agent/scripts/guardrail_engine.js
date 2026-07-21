#!/usr/bin/env node
/**
 * guardrail_engine.js — Tribunal Kit Neurosymbolic Guardrail Engine
 * ==================================================================
 * A deterministic, zero-LLM-call validator that checks agent output
 * for phantom references, wrong counts, broken script extensions,
 * unresolved VERIFY tags, and contradictory claims.
 *
 * Runs sub-millisecond. Pure Node.js. No external dependencies.
 *
 * This is a NEUROSYMBOLIC layer — it enforces hard rules that no
 * amount of prompt engineering can guarantee. The LLM can hallucinate
 * freely; this engine catches structural errors before they reach disk.
 *
 * Usage:
 *   node .agent/scripts/guardrail_engine.js --file output.md
 *   node .agent/scripts/guardrail_engine.js --scan           → scan all .agent/ files
 *   node .agent/scripts/guardrail_engine.js --fix output.md  → auto-fix simple violations
 *
 * API:
 *   const { validate } = require('./guardrail_engine');
 *   const result = validate(text, manifest, options);
 */

"use strict";

const fs = require("fs");
const path = require("path");

// ── Rule Definitions ──────────────────────────────────────────────────────────

/**
 * Rule 1: file-exists
 * Checks that references to .agent/ files point to real files.
 */
function ruleFileExists(content, manifest, _ctx) {
  const violations = [];
  const refs = manifest.cross_references || [];

  const agentDir = path.join(_ctx.projectRoot, ".agent");
  const currentRelSource = _ctx.filePath ? path.relative(agentDir, _ctx.filePath).replace(/\\/g, "/") : null;

  // Check phantom references from the manifest
  const phantoms = refs.filter((r) => !r.exists && (!currentRelSource || r.source === currentRelSource));
  for (const p of phantoms) {
    violations.push({
      rule: "file-exists",
      severity: "critical",
      location: p.source,
      message: `Phantom reference: "${p.ref}" does not exist`,
      suggestion: null,
      autoFixable: false,
    });
  }

  return violations;
}

/**
 * Rule 2: script-extension
 * Catches .py references to scripts that are actually .js files.
 */
function ruleScriptExtension(content, manifest, _ctx) {
  const violations = [];
  const scriptFiles = manifest.scripts ? manifest.scripts.files : {};

  // Find all script references in the content
  const scriptRefRegex = /scripts\/([\w_-]+)\.(js|py)\b/g;
  let match;
  while ((match = scriptRefRegex.exec(content)) !== null) {
    const baseName = match[1];
    const referencedExt = match[2];
    const referencedFile = `${baseName}.${referencedExt}`;

    // Check if the referenced file exists
    if (scriptFiles[referencedFile]) continue; // exact match — fine

    // Check if the OTHER extension exists
    const altExt = referencedExt === "js" ? "py" : "js";
    const altFile = `${baseName}.${altExt}`;

    if (scriptFiles[altFile]) {
      violations.push({
        rule: "script-extension",
        severity: "warning",
        location: `content match: scripts/${referencedFile}`,
        message: `Script "scripts/${referencedFile}" does not exist, but "scripts/${altFile}" does`,
        suggestion: `Replace "scripts/${referencedFile}" with "scripts/${altFile}"`,
        autoFixable: true,
        fix: { find: `scripts/${referencedFile}`, replace: `scripts/${altFile}` },
      });
    }
  }

  return violations;
}

/**
 * Rule 3: reviewer-count
 * Validates that numeric claims about reviewer counts match the manifest.
 */
function ruleReviewerCount(content, manifest, _ctx) {
  const violations = [];
  const actualCount = manifest.agents ? manifest.agents.reviewer_count : null;
  if (actualCount === null) return violations;

  const countRegex = /(\d+)[-\s]+(?:parallel\s+)?(?:reviewers?|agents?)/gi;
  let match;
  while ((match = countRegex.exec(content)) !== null) {
    const claimed = parseInt(match[1], 10);
    if (claimed < 3 || claimed > 500) continue; // Skip noise

    if (claimed !== actualCount) {
      violations.push({
        rule: "reviewer-count",
        severity: "warning",
        location: `content match: "${match[0]}"`,
        message: `Claims ${claimed} reviewers, but manifest reports ${actualCount}`,
        suggestion: `Replace "${match[0]}" with "${actualCount} reviewers"`,
        autoFixable: true,
        fix: { find: match[0], replace: match[0].replace(String(claimed), String(actualCount)) },
      });
    }
  }

  return violations;
}

/**
 * Rule 4: skill-exists
 * Validates that skill names referenced in routing tables exist.
 */
function ruleSkillExists(content, manifest, _ctx) {
  const violations = [];
  const skillNames = new Set(manifest.skills ? manifest.skills.names : []);
  if (skillNames.size === 0) return violations;

  // Look for backtick-quoted skill references that match the pattern
  const skillRefRegex = /`([\w-]+(?:-[\w-]+)*)`/g;
  let match;
  while ((match = skillRefRegex.exec(content)) !== null) {
    const name = match[1];

    // Only check names that look like skill names (contain a hyphen, not pure keywords)
    if (!name.includes("-")) continue;
    // Skip common non-skill patterns
    if (
      name.startsWith("--") ||
      name.endsWith(".md") ||
      name.endsWith(".js") ||
      name.endsWith(".ts") ||
      name.endsWith(".py") ||
      name.startsWith("npm-") ||
      name.startsWith("git-")
    ) {
      continue;
    }

    // Check if it could be a skill or agent name
    const agentNames = new Set(manifest.agents ? manifest.agents.all : []);
    const isKnownSkill = skillNames.has(name);
    const isKnownAgent = agentNames.has(name);

    // If it matches the naming pattern of skills/agents but doesn't exist as either
    if (!isKnownSkill && !isKnownAgent) {
      // Only flag if it looks like it's being used as a skill/agent reference
      // Check surrounding context for routing-table-like patterns
      const lineStart = content.lastIndexOf("\n", match.index) + 1;
      const lineEnd = content.indexOf("\n", match.index);
      const line = content.substring(lineStart, lineEnd === -1 ? content.length : lineEnd);

      // Flag only if the line looks like a routing/reference context
      if (
        /agent|skill|specialist|reviewer|route|domain/i.test(line) &&
        !/(example|e\.g\.|sample|template|placeholder)/i.test(line)
      ) {
        violations.push({
          rule: "skill-exists",
          severity: "info",
          location: `content match: \`${name}\``,
          message: `"${name}" is not a recognized skill or agent name`,
          suggestion: `Verify that "${name}" exists in .agent/skills/ or .agent/agents/`,
          autoFixable: false,
        });
      }
    }
  }

  return violations;
}

/**
 * Rule 5: agent-exists
 * Validates that agent names referenced exist as .md files.
 */
function ruleAgentExists(content, manifest, _ctx) {
  const violations = [];
  const agentNames = new Set(manifest.agents ? manifest.agents.all : []);
  if (agentNames.size === 0) return violations;

  // Look for agents/name.md references
  const agentRefRegex = /agents\/([\w-]+)\.md/g;
  let match;
  while ((match = agentRefRegex.exec(content)) !== null) {
    const name = match[1];
    if (!agentNames.has(name)) {
      violations.push({
        rule: "agent-exists",
        severity: "critical",
        location: `content match: agents/${name}.md`,
        message: `Agent "agents/${name}.md" is referenced but does not exist`,
        suggestion: null,
        autoFixable: false,
      });
    }
  }

  return violations;
}

/**
 * Rule 6: unresolved-verify
 * Blocks output that contains // VERIFY: tags (must be resolved before shipping).
 */
function ruleUnresolvedVerify(content, _manifest, ctx) {
  const violations = [];
  
  // Skip this check for the internal .agent documentation files themselves
  // because they contain instructions ABOUT the VERIFY tag.
  if (ctx && ctx.filePath && ctx.filePath.includes(".agent") && ctx.filePath.endsWith(".md")) {
    return violations;
  }

  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const verifyMatch = lines[i].match(/\/\/\s*VERIFY:\s*(.+)/);
    if (verifyMatch) {
      violations.push({
        rule: "unresolved-verify",
        severity: "critical",
        location: `line ${i + 1}`,
        message: `Unresolved VERIFY tag: "${verifyMatch[1].trim()}"`,
        suggestion: "Resolve this verification before shipping",
        autoFixable: false,
      });
    }
  }

  return violations;
}

/**
 * Rule 7: numeric-consistency
 * Checks that numeric claims in the content are consistent with the manifest.
 */
function ruleNumericConsistency(content, manifest, _ctx) {
  const violations = [];
  const agentDir = _ctx && _ctx.projectRoot ? path.join(_ctx.projectRoot, ".agent") : "";
  const currentRelSource = _ctx && _ctx.filePath ? path.relative(agentDir, _ctx.filePath).replace(/\\/g, "/") : null;

  const invalidClaims = (manifest.numeric_claims || []).filter(
    (c) => !c.valid && (!currentRelSource || c.source.startsWith(currentRelSource + ":")),
  );

  for (const claim of invalidClaims) {
    violations.push({
      rule: "numeric-consistency",
      severity: "warning",
      location: claim.source,
      message: `Claims "${claim.claim}" but actual count is ${claim.actual}`,
      suggestion: `Update to "${claim.actual} ${claim.claim.replace(/\d+\s*/, "")}"`,
      autoFixable: true,
      fix: {
        find: claim.claim,
        replace: `${claim.actual} ${claim.claim.replace(/\d+\s*/, "")}`,
      },
    });
  }

  return violations;
}

/**
 * Rule 8: import-phantom
 * Checks for import/require statements referencing packages not in package.json.
 */
function ruleImportPhantom(content, _manifest, ctx) {
  const violations = [];
  const projectRoot = ctx.projectRoot;
  const filePath = ctx.filePath || "";

  // Only check Javascript/Typescript files for phantom imports
  if (!filePath.endsWith(".js") && !filePath.endsWith(".ts")) return violations;

  // Load package.json dependencies
  let deps = new Set();
  try {
    const pkgPath = path.join(projectRoot, "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
        ...(pkg.peerDependencies || {}),
        ...(pkg.optionalDependencies || {}),
      };
      deps = new Set(Object.keys(allDeps));
    }
  } catch {
    return violations; // Can't check without package.json
  }

  if (deps.size === 0) return violations;

  // Node.js built-in modules
  const builtins = new Set([
    "assert", "buffer", "child_process", "cluster", "console", "constants",
    "crypto", "dgram", "dns", "domain", "events", "fs", "http", "http2",
    "https", "module", "net", "os", "path", "perf_hooks", "process",
    "punycode", "querystring", "readline", "repl", "stream", "string_decoder",
    "sys", "timers", "tls", "trace_events", "tty", "url", "util", "v8",
    "vm", "wasi", "worker_threads", "zlib", "node:fs", "node:path",
    "node:crypto", "node:http", "node:https", "node:url", "node:util",
    "node:os", "node:child_process", "node:stream", "node:events",
    "node:buffer", "node:net", "node:tls", "node:worker_threads",
    "node:readline", "node:zlib", "node:querystring", "node:assert",
    "node:test",
  ]);

  // Find require() and import statements for external packages
  const requireRegex = /require\s*\(\s*['"]([^'"./][^'"]*)['"]\s*\)/g;
  const importRegex = /import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"./][^'"]*)['"]/g;

  const checkPackage = (regex) => {
    let match;
    while ((match = regex.exec(content)) !== null) {
      const pkg = match[1];
      // Extract the package name (handle scoped packages like @scope/name)
      const pkgName = pkg.startsWith("@")
        ? pkg.split("/").slice(0, 2).join("/")
        : pkg.split("/")[0];

      if (!builtins.has(pkgName) && !deps.has(pkgName)) {
        violations.push({
          rule: "import-phantom",
          severity: "info",
          location: `content match: "${match[0]}"`,
          message: `Package "${pkgName}" is not in package.json`,
          suggestion: `Verify "${pkgName}" is installed or add it to dependencies`,
          autoFixable: false,
        });
      }
    }
  };

  checkPackage(requireRegex);
  checkPackage(importRegex);

  return violations;
}

// ── Rule Registry ─────────────────────────────────────────────────────────────

const RULES = {
  "file-exists": ruleFileExists,
  "script-extension": ruleScriptExtension,
  "reviewer-count": ruleReviewerCount,
  "skill-exists": ruleSkillExists,
  "agent-exists": ruleAgentExists,
  "unresolved-verify": ruleUnresolvedVerify,
  "numeric-consistency": ruleNumericConsistency,
  "import-phantom": ruleImportPhantom,
};

// ── Main Validate Function ────────────────────────────────────────────────────

/**
 * Validate content against the integrity manifest.
 *
 * @param {string} content - The text content to validate
 * @param {object} manifest - The integrity manifest (from integrity_manifest.js)
 * @param {object} options - Validation options
 * @param {string[]} options.rules - Which rules to run ('all' or specific names)
 * @param {boolean} options.autoFix - If true, returns auto-fixed content
 * @param {object} options.context - Additional context (projectRoot, etc.)
 * @returns {object} Validation result
 */
function validate(content, manifest, options = {}) {
  const {
    rules: ruleFilter = ["all"],
    autoFix = false,
    context = { projectRoot: process.cwd() },
  } = options;

  const activeRules =
    ruleFilter.includes("all")
      ? Object.entries(RULES)
      : Object.entries(RULES).filter(([name]) => ruleFilter.includes(name));

  const allViolations = [];

  for (const [_name, ruleFn] of activeRules) {
    try {
      const violations = ruleFn(content, manifest, context);
      allViolations.push(...violations);
    } catch (err) {
      allViolations.push({
        rule: _name,
        severity: "info",
        location: "engine",
        message: `Rule "${_name}" threw an error: ${err.message}`,
        suggestion: null,
        autoFixable: false,
      });
    }
  }

  // Apply auto-fixes if requested
  let autoFixedContent = null;
  if (autoFix) {
    autoFixedContent = content;
    const fixableViolations = allViolations.filter(
      (v) => v.autoFixable && v.fix,
    );
    for (const v of fixableViolations) {
      autoFixedContent = autoFixedContent.split(v.fix.find).join(v.fix.replace);
    }
  }

  // Compute pass/fail
  const hasCritical = allViolations.some((v) => v.severity === "critical");
  const hasWarning = allViolations.some((v) => v.severity === "warning");

  return {
    passed: !hasCritical,
    violations: allViolations,
    autoFixedContent,
    summary: hasCritical
      ? `REJECTED — ${allViolations.filter((v) => v.severity === "critical").length} critical violation(s)`
      : hasWarning
        ? `WARNING — ${allViolations.filter((v) => v.severity === "warning").length} warning(s), no critical issues`
        : allViolations.length > 0
          ? `PASSED — ${allViolations.length} informational note(s)`
          : "PASSED — clean, no violations",
  };
}

// ── CLI Entry Point ───────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);

  const fileIdx = args.indexOf("--file");
  const scanMode = args.includes("--scan");
  const fixMode = args.includes("--fix");
  const jsonMode = args.includes("--json");

  // Load or generate manifest
  const projectRoot = process.cwd();
  let manifest;

  const manifestPath = path.join(
    projectRoot,
    ".agent",
    "history",
    "integrity_manifest.json",
  );

  if (false && fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } else {
    // Generate on the fly
    try {
      const { generateManifest } = require("./integrity_manifest");
      manifest = generateManifest(projectRoot);
    } catch {
      console.error("❌ Cannot load or generate integrity manifest.");
      console.error(
        "   Run: node .agent/scripts/integrity_manifest.js first.",
      );
      process.exit(1);
    }
  }

  if (manifest.error) {
    console.error(`❌ ${manifest.error}`);
    process.exit(1);
  }

  // Determine what to validate
  let filesToCheck = [];

  if (fileIdx !== -1 && args[fileIdx + 1]) {
    filesToCheck.push(path.resolve(args[fileIdx + 1]));
  } else if (fixMode && args[0] && !args[0].startsWith("--")) {
    filesToCheck.push(path.resolve(args[0]));
  } else if (scanMode) {
    // Scan all .agent/ markdown files
    const agentDir = path.join(projectRoot, ".agent");
    filesToCheck = walkAgentFiles(agentDir);
  } else {
    console.log("Usage:");
    console.log(
      "  node .agent/scripts/guardrail_engine.js --file <path>   Validate a file",
    );
    console.log(
      "  node .agent/scripts/guardrail_engine.js --scan           Scan all .agent/ files",
    );
    console.log(
      "  node .agent/scripts/guardrail_engine.js --fix <path>    Auto-fix a file",
    );
    process.exit(0);
  }

  // Run validation
  let totalViolations = 0;
  let totalCritical = 0;
  const allResults = [];

  for (const file of filesToCheck) {
    if (!fs.existsSync(file)) {
      console.error(`⚠️  File not found: ${file}`);
      continue;
    }

    const content = fs.readFileSync(file, "utf8");
    const result = validate(content, manifest, {
      autoFix: fixMode,
      context: { projectRoot },
    });

    totalViolations += result.violations.length;
    totalCritical += result.violations.filter(
      (v) => v.severity === "critical",
    ).length;

    if (result.violations.length > 0) {
      allResults.push({
        file: path.relative(projectRoot, file),
        ...result,
      });
    }

    // Apply auto-fix
    if (fixMode && result.autoFixedContent && result.autoFixedContent !== content) {
      fs.writeFileSync(file, result.autoFixedContent, "utf8");
      console.log(
        `  ✅ Auto-fixed: ${path.relative(projectRoot, file)}`,
      );
    }
  }

  if (jsonMode) {
    console.log(JSON.stringify(allResults, null, 2));
    return;
  }

  // Human-readable output
  console.log(`\n🛡️  Guardrail Engine — Validation Report`);
  console.log(`   ─────────────────────────────────`);
  console.log(`   Files scanned:  ${filesToCheck.length}`);
  console.log(`   Violations:     ${totalViolations}`);
  console.log(`   Critical:       ${totalCritical}`);
  console.log(`   ─────────────────────────────────`);

  for (const result of allResults) {
    console.log(`\n   📄 ${result.file} — ${result.summary}`);
    for (const v of result.violations) {
      const icon =
        v.severity === "critical"
          ? "🔴"
          : v.severity === "warning"
            ? "🟡"
            : "🔵";
      console.log(`      ${icon} [${v.rule}] ${v.message}`);
      if (v.suggestion) {
        console.log(`         💡 ${v.suggestion}`);
      }
    }
  }

  if (totalViolations === 0) {
    console.log(`\n   ✅ All files clean. No violations detected.`);
  }

  console.log();
  process.exit(totalCritical > 0 ? 1 : 0);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function walkAgentFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;

  try {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      if (
        ["node_modules", ".git", "history", ".backups", ".shared"].includes(
          entry,
        )
      ) {
        continue;
      }

      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walkAgentFiles(fullPath, fileList);
        } else if (entry.endsWith(".md") || entry.endsWith(".json") || entry.endsWith(".js") || entry.endsWith(".py")) {
          fileList.push(fullPath);
        }
      } catch {
        // Skip files we can't stat
      }
    }
  } catch {
    // Skip dirs we can't read
  }

  return fileList;
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  validate,
  RULES,
  ruleFileExists,
  ruleScriptExtension,
  ruleReviewerCount,
  ruleSkillExists,
  ruleAgentExists,
  ruleUnresolvedVerify,
  ruleNumericConsistency,
  ruleImportPhantom,
};

if (require.main === module) {
  main();
}
