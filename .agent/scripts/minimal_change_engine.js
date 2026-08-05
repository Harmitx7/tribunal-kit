#!/usr/bin/env node
/**
 * minimal_change_engine.js — Minimal Change Governance Engine for Tribunal-Kit
 * ==============================================================================
 * Stops AI coding agents from overengineering, creating unnecessary files,
 * introducing unneeded abstractions, adding unjustified dependencies, or
 * duplicating existing repository functionality.
 *
 * Core Principle & Evaluation Order:
 *   1. NO_CHANGE  — Requested behavior exists or no modification is justified
 *   2. REUSE       — Existing repository functionality solves the requirement
 *   3. CONFIGURE   — Configuration, flags, metadata, or existing APIs solve it
 *   4. DELETE      — Removing unnecessary code solves the underlying issue
 *   5. MODIFY      — Small modification to existing code solves the requirement
 *   6. EXTEND      — Existing architecture requires limited extension
 *   7. CREATE      — New implementation is justified (highest burden of proof)
 *
 * Capabilities:
 *   - Change Budget Estimation & Auditing
 *   - Minimality Score Calculation (0-100)
 *   - Complexity Flags Detection (14 Standardized Types)
 *   - Repository Capability & Symbol Search
 *   - Strictness Modes (relaxed | balanced | strict)
 *
 * Usage:
 *   node .agent/scripts/minimal_change_engine.js evaluate --task "add retry logic"
 *   node .agent/scripts/minimal_change_engine.js budget --spec spec.json
 *   node .agent/scripts/minimal_change_engine.js audit --diff diff.txt
 *   node .agent/scripts/minimal_change_engine.js search --query "fetchRetry"
 */

"use strict";

const fs = require("fs");
const path = require("path");

// ── Shared Utilities & Colors ────────────────────────────────────────────────
const { GREEN, YELLOW, CYAN, RED, BOLD, DIM, RESET } = require("./_colors");
const { findAgentDir, loadJson, walkDir, DEFAULT_SKIP_DIRS } = require("./_utils");

// ── Decision Order Hierarchy ─────────────────────────────────────────────────
const DECISION_HIERARCHY = [
  "NO_CHANGE",
  "REUSE",
  "CONFIGURE",
  "DELETE",
  "MODIFY",
  "EXTEND",
  "CREATE",
];

// ── 14 Standardized Complexity Flag Types ────────────────────────────────────
const COMPLEXITY_FLAG_TYPES = [
  "UNNECESSARY_ABSTRACTION",
  "DUPLICATE_FUNCTIONALITY",
  "DEPENDENCY_BLOAT",
  "FILE_PROLIFERATION",
  "PREMATURE_GENERALIZATION",
  "SCOPE_EXPANSION",
  "UNNECESSARY_REWRITE",
  "FRAMEWORK_REINVENTION",
  "STANDARD_LIBRARY_REINVENTION",
  "EXCESSIVE_BOILERPLATE",
  "SPECULATIVE_FEATURE",
  "UNJUSTIFIED_INFRASTRUCTURE",
  "UNNECESSARY_CONFIGURATION",
  "DEAD_CODE_INTRODUCTION",
];

// ── Strictness Configurations ────────────────────────────────────────────────
const STRICTNESS_CONFIGS = {
  relaxed: {
    max_files_added_warn: 4,
    max_deps_warn: 2,
    max_abstractions_warn: 3,
    min_score_pass: 60,
  },
  balanced: {
    max_files_added_warn: 2,
    max_deps_warn: 1,
    max_abstractions_warn: 1,
    min_score_pass: 75,
  },
  strict: {
    max_files_added_warn: 1,
    max_deps_warn: 0,
    max_abstractions_warn: 0,
    min_score_pass: 85,
  },
};

/**
 * Calculates Change Budget based on spec / file diff proposal.
 */
function calculateChangeBudget(proposal = {}) {
  return {
    files_added: proposal.files_added || 0,
    files_modified: proposal.files_modified || 0,
    files_deleted: proposal.files_deleted || 0,
    dependencies_added: proposal.dependencies_added || 0,
    dependencies_removed: proposal.dependencies_removed || 0,
    new_abstractions: proposal.new_abstractions || 0,
    public_api_changes: proposal.public_api_changes || 0,
    estimated_lines_added: proposal.estimated_lines_added || 0,
    estimated_lines_removed: proposal.estimated_lines_removed || 0,
  };
}

/**
 * Computes Minimality Score (0 to 100) based on proposed change footprint.
 */
function calculateMinimalityScore(budget, classification, flags = []) {
  let score = 100;

  // Penalties for file proliferation
  if (budget.files_added > 0) {
    score -= budget.files_added * 8;
  }

  // Penalties for unnecessary dependencies
  if (budget.dependencies_added > 0) {
    score -= budget.dependencies_added * 15;
  }

  // Penalties for excessive new abstractions
  if (budget.new_abstractions > 0) {
    score -= budget.new_abstractions * 10;
  }

  // Penalties for massive line expansions
  if (budget.estimated_lines_added > 100) {
    score -= Math.floor((budget.estimated_lines_added - 100) / 20);
  }

  // Penalties for complexity flags based on severity
  flags.forEach((flag) => {
    if (flag.severity === "high" || flag.severity === "critical") {
      score -= 15;
    } else if (flag.severity === "medium") {
      score -= 8;
    } else {
      score -= 4;
    }
  });

  // Classification weighting: reward simpler classifications
  const classWeights = {
    NO_CHANGE: +10,
    REUSE: +15,
    CONFIGURE: +10,
    DELETE: +10,
    MODIFY: 0,
    EXTEND: -5,
    CREATE: -15,
  };

  score += classWeights[classification] || 0;

  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Detects potential complexity flags within a proposed change or spec.
 */
function detectComplexityFlags(proposal = {}, existingSymbols = [], mode = "balanced") {
  const flags = [];
  const limits = STRICTNESS_CONFIGS[mode] || STRICTNESS_CONFIGS.balanced;

  // Check 1: Dependency Bloat
  if (proposal.dependencies_added > limits.max_deps_warn) {
    flags.push({
      type: "DEPENDENCY_BLOAT",
      severity: proposal.dependencies_added > 1 ? "high" : "medium",
      evidence: `${proposal.dependencies_added} new dependency/dependencies proposed.`,
      location: proposal.target_file || "package.json",
      reason: "Adding dependencies increases security attack surface and maintenance overhead.",
      recommended_action: "Use standard library or existing codebase utilities.",
    });
  }

  // Check 2: File Proliferation
  if (proposal.files_added > limits.max_files_added_warn) {
    flags.push({
      type: "FILE_PROLIFERATION",
      severity: proposal.files_added > 3 ? "high" : "medium",
      evidence: `${proposal.files_added} new files proposed for creation.`,
      location: proposal.target_file || "workspace",
      reason: "Creating multiple new files increases architectural noise and fragmentation.",
      recommended_action: "Modify or extend existing files instead of creating new ones.",
    });
  }

  // Check 3: Unnecessary Abstraction
  if (proposal.new_abstractions > limits.max_abstractions_warn) {
    flags.push({
      type: "UNNECESSARY_ABSTRACTION",
      severity: "medium",
      evidence: `${proposal.new_abstractions} new abstraction layer(s) proposed.`,
      location: proposal.target_file || "codebase",
      reason: "Adding wrappers or single-consumer interfaces increases complexity without benefit.",
      recommended_action: "Implement concrete logic directly without extra abstraction.",
    });
  }

  // Check 4: Duplicate Functionality
  if (proposal.duplicate_candidates && proposal.duplicate_candidates.length > 0) {
    proposal.duplicate_candidates.forEach((cand) => {
      flags.push({
        type: "DUPLICATE_FUNCTIONALITY",
        severity: "high",
        evidence: `Existing equivalent symbol '${cand.name}' found in ${cand.file}`,
        location: cand.file,
        reason: "Duplicate functionality leads to fragmented state and maintenance confusion.",
        recommended_action: `Reuse '${cand.name}' from ${cand.file}`,
      });
    });
  }

  // Check 5: Framework/Stdlib Reinvention
  if (proposal.reinventing_stdlib) {
    flags.push({
      type: "STANDARD_LIBRARY_REINVENTION",
      severity: "medium",
      evidence: `Proposed custom utility '${proposal.reinventing_stdlib.name}'`,
      location: proposal.target_file || "utils",
      reason: "Language standard library already provides built-in methods for this.",
      recommended_action: `Use native JS/TS methods (e.g., Array.prototype, URL, crypto).`,
    });
  }

  return flags;
}

/**
 * Inspects repository files to search for symbols, utilities, exports, and config.
 */
function searchRepositoryForCapability(query, searchDir) {
  const matches = [];

  if (!query || typeof query !== "string") return matches;

  let agentDir = null;
  let current = path.resolve(searchDir || process.cwd());
  const rootPath = path.parse(current).root;
  while (current !== rootPath) {
    const candidate = path.join(current, ".agent");
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      agentDir = candidate;
      break;
    }
    current = path.dirname(current);
  }
  const repoRoot = agentDir ? path.dirname(agentDir) : (searchDir || process.cwd());

  const normalizedQuery = query.toLowerCase();
  const searchKeywords = normalizedQuery.split(/\s+/).filter((k) => k.length > 2);

  // Search package.json dependencies
  const pkgPath = path.join(repoRoot, "package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = loadJson(pkgPath);
    if (pkg) {
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };
      Object.keys(allDeps).forEach((dep) => {
        if (dep.toLowerCase().includes(normalizedQuery)) {
          matches.push({
            type: "dependency",
            name: dep,
            file: "package.json",
            snippet: `Version: ${allDeps[dep]}`,
          });
        }
      });
    }
  }

  // Helper: recursive file scanner
  function scan(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (DEFAULT_SKIP_DIRS.has(entry.name) || entry.name === "target") {
          continue;
        }
        scan(fullPath);
      } else if (entry.isFile() && /\.(js|ts|tsx|jsx|json|md)$/.test(entry.name)) {
        try {
          const content = fs.readFileSync(fullPath, "utf8");
          const lower = content.toLowerCase();

          const hasMatch = searchKeywords.some((kw) => lower.includes(kw));
          if (hasMatch) {
            const relPath = path.relative(repoRoot, fullPath);
            // Extract function/class exports
            const symbolRegex = /(?:export\s+(?:function|class|const|let|var|type|interface)|module\.exports\s*=)\s+([A-Za-z0-9_]+)/g;
            let m;
            while ((m = symbolRegex.exec(content)) !== null) {
              if (m[1].toLowerCase().includes(normalizedQuery)) {
                matches.push({
                  type: "symbol",
                  name: m[1],
                  file: relPath,
                  snippet: content.substring(Math.max(0, m.index - 40), m.index + 80).replace(/\n/g, " "),
                });
              }
            }
          }
        } catch {
          // Ignore unreadable files
        }
      }
    }
  }

  scan(repoRoot);
  return matches;
}

/**
 * Classifies an implementation proposal into the 7-level Decision Order.
 */
function classifyProposal(taskDescription, proposal = {}, repoMatches = []) {
  const filesAdded = proposal.files_added || 0;
  const filesModified = proposal.files_modified || 0;
  const filesDeleted = proposal.files_deleted || 0;
  const newAbstractions = proposal.new_abstractions || 0;
  const estimatedLinesAdded = proposal.estimated_lines_added || 0;

  if (repoMatches.length > 0 && filesAdded === 0) {
    return "REUSE";
  }

  if (filesAdded === 0 && filesModified === 0 && filesDeleted === 0) {
    return "NO_CHANGE";
  }

  if (proposal.is_config_only) {
    return "CONFIGURE";
  }

  if (filesDeleted > 0 && filesAdded === 0 && estimatedLinesAdded === 0) {
    return "DELETE";
  }

  if (filesAdded === 0 && filesModified <= 2 && newAbstractions === 0) {
    return "MODIFY";
  }

  if (filesAdded <= 2 && newAbstractions <= 1) {
    return "EXTEND";
  }

  return "CREATE";
}

/**
 * Evaluates an implementation proposal completely.
 */
function evaluateMinimalChange(taskDescription, proposal = {}, options = {}) {
  const mode = options.mode || "balanced";
  const searchDir = options.cwd || process.cwd();

  const budget = calculateChangeBudget(proposal);
  let repoMatches = [];
  try {
    repoMatches = searchRepositoryForCapability(taskDescription, searchDir);
  } catch {
    repoMatches = [];
  }
  const classification = classifyProposal(taskDescription, proposal, repoMatches);
  const flags = detectComplexityFlags(proposal, repoMatches, mode);
  const score = calculateMinimalityScore(budget, classification, flags);

  const reuseOpportunities = repoMatches.map(
    (m) => `Reuse existing ${m.type} '${m.name}' in ${m.file}`,
  );

  const recommendedReductions = [];
  if (budget.dependencies_added > 0) {
    recommendedReductions.push("Avoid introducing new npm dependencies; leverage existing utilities.");
  }
  if (budget.files_added > 1) {
    recommendedReductions.push("Combine proposed new files into existing module structure.");
  }
  if (budget.new_abstractions > 0) {
    recommendedReductions.push("Remove single-use interface/class abstractions.");
  }

  return {
    minimality_classification: classification,
    minimality_score: score,
    change_budget: budget,
    complexity_flags: flags,
    reuse_opportunities: reuseOpportunities,
    unnecessary_changes: flags.map((f) => f.evidence),
    recommended_reductions: recommendedReductions,
    decision_order: DECISION_HIERARCHY,
    passed: score >= (STRICTNESS_CONFIGS[mode]?.min_score_pass || 75),
  };
}

// ── CLI Main Entry Point ────────────────────────────────────────────────────
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || "evaluate";
  const taskArg = args.find((a) => a.startsWith("--task="))?.split("=")[1] || "Default Task";
  const modeArg = args.find((a) => a.startsWith("--mode="))?.split("=")[1] || "balanced";

  if (command === "evaluate" || command === "audit") {
    const result = evaluateMinimalChange(taskArg, { files_modified: 1, estimated_lines_added: 12 }, { mode: modeArg });
    console.log(JSON.stringify(result, null, 2));
  } else if (command === "search") {
    const matches = searchRepositoryForCapability(taskArg);
    console.log(JSON.stringify(matches, null, 2));
  } else {
    console.log(`Minimal Change Engine CLI — Mode: ${modeArg}`);
  }
}

module.exports = {
  DECISION_HIERARCHY,
  COMPLEXITY_FLAG_TYPES,
  STRICTNESS_CONFIGS,
  calculateChangeBudget,
  calculateMinimalityScore,
  detectComplexityFlags,
  searchRepositoryForCapability,
  classifyProposal,
  evaluateMinimalChange,
};
