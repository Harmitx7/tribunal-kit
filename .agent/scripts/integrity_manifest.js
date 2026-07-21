#!/usr/bin/env node
/**
 * integrity_manifest.js — Tribunal Kit Integrity Manifest Compiler
 * =================================================================
 * Crawls the entire .agent/ directory and generates a machine-readable
 * integrity_manifest.json — the single source of truth for every named
 * reference in the system.
 *
 * This manifest is consumed by:
 *   - guardrail_engine.js (deterministic validation)
 *   - verify_all.js (pre-deploy checks)
 *   - context_broker.js (context assembly)
 *
 * Usage:
 *   node .agent/scripts/integrity_manifest.js                → Generate manifest
 *   node .agent/scripts/integrity_manifest.js --output json   → Print to stdout
 *   node .agent/scripts/integrity_manifest.js --validate      → Generate + validate
 *
 * Zero external dependencies. Node.js stdlib only.
 */

"use strict";

const fs = require("fs");
const path = require("path");

// ── Constants ─────────────────────────────────────────────────────────────────

const AGENT_DIR_NAME = ".agent";

// ── YAML Frontmatter Parser (regex-based, zero deps) ─────────────────────────

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const yaml = {};
  const lines = match[1].split(/\r?\n/);
  for (const line of lines) {
    const kv = line.match(/^(\w[\w-]*):\s*(.+)$/);
    if (kv) {
      yaml[kv[1].trim()] = kv[2].trim();
    }
  }
  return yaml;
}

// ── Directory Helpers ─────────────────────────────────────────────────────────

function safeReaddir(dir) {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

function safeReadFile(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

// ── Agent Crawler ─────────────────────────────────────────────────────────────

function crawlAgents(agentDir) {
  const agentsDir = path.join(agentDir, "agents");
  const files = safeReaddir(agentsDir).filter((f) => f.endsWith(".md"));

  const reviewers = [];
  const specialists = [];
  const allAgents = [];

  for (const file of files) {
    const name = file.replace(/\.md$/, "");
    allAgents.push(name);

    // Classify: reviewer if name contains "reviewer", "auditor", or "tester"
    // or if frontmatter has role: reviewer
    const content = safeReadFile(path.join(agentsDir, file));
    const fm = parseFrontmatter(content);
    const isReviewer =
      /reviewer|auditor|tester/i.test(name) ||
      (fm.role && /reviewer/i.test(fm.role));

    if (isReviewer) {
      reviewers.push(name);
    } else {
      specialists.push(name);
    }
  }

  return {
    total: allAgents.length,
    reviewers: reviewers.sort(),
    specialists: specialists.sort(),
    reviewer_count: reviewers.length,
    all: allAgents.sort(),
  };
}

// ── Skill Crawler ─────────────────────────────────────────────────────────────

function crawlSkills(agentDir) {
  const skillsDir = path.join(agentDir, "skills");
  const entries = safeReaddir(skillsDir);
  const names = [];

  for (const entry of entries) {
    const skillPath = path.join(skillsDir, entry, "SKILL.md");
    if (fs.existsSync(skillPath)) {
      const content = safeReadFile(skillPath);
      const fm = parseFrontmatter(content);
      names.push(fm.name || entry);
    }
  }

  return {
    total: names.length,
    names: names.sort(),
  };
}

// ── Script Crawler ────────────────────────────────────────────────────────────

function crawlScripts(agentDir) {
  const scriptsDir = path.join(agentDir, "scripts");
  const files = safeReaddir(scriptsDir).filter(
    (f) => f.endsWith(".js") || f.endsWith(".py"),
  );

  const fileMap = {};
  for (const file of files) {
    const relPath = path.join(AGENT_DIR_NAME, "scripts", file);
    fileMap[file] = relPath.replace(/\\/g, "/");
  }

  return {
    total: files.length,
    files: fileMap,
  };
}

// ── Workflow Crawler ──────────────────────────────────────────────────────────

function crawlWorkflows(agentDir) {
  const workflowsDir = path.join(agentDir, "workflows");
  const files = safeReaddir(workflowsDir).filter((f) => f.endsWith(".md"));
  const names = files.map((f) => f.replace(/\.md$/, ""));

  return {
    total: names.length,
    names: names.sort(),
  };
}

// ── Cross-Reference Extractor ─────────────────────────────────────────────────

/**
 * Scans a file's content for references to other .agent/ assets.
 * Patterns detected:
 *   - agents/X.md, agents/X
 *   - skills/X/SKILL.md, skill name references
 *   - scripts/X.js, scripts/X.py
 *   - workflows/X.md
 *   - node .agent/scripts/X
 */
function extractCrossReferences(filePath, content, agentDir) {
  const refs = [];
  const relSource = path.relative(agentDir, filePath).replace(/\\/g, "/");

  // Agent references: agents/name.md or `agent-name`
  const agentRefRegex =
    /(?:agents\/)([\w-]+)(?:\.md)?/g;
  let m;
  while ((m = agentRefRegex.exec(content)) !== null) {
    const refFile = `agents/${m[1]}.md`;
    const fullPath = path.join(agentDir, refFile);
    refs.push({
      source: relSource,
      ref: refFile,
      exists: fs.existsSync(fullPath),
      type: "agent",
    });
  }

  // Script references: scripts/name.js or scripts/name.py
  const scriptRefRegex =
    /(?:scripts\/)([\w_-]+)\.(js|py)/g;
  while ((m = scriptRefRegex.exec(content)) !== null) {
    const refFile = `scripts/${m[1]}.${m[2]}`;
    const fullPath = path.join(agentDir, refFile);
    refs.push({
      source: relSource,
      ref: refFile,
      exists: fs.existsSync(fullPath),
      type: "script",
    });
  }

  // Workflow references: workflows/name.md
  const workflowRefRegex = /(?:workflows\/)([\w-]+)(?:\.md)?/g;
  while ((m = workflowRefRegex.exec(content)) !== null) {
    const precedingText = content.substring(Math.max(0, m.index - 100), m.index);
    if (precedingText.includes(".github/") || precedingText.includes("github.com/")) {
      continue;
    }
    const refFile = `workflows/${m[1]}.md`;
    const fullPath = path.join(agentDir, refFile);
    refs.push({
      source: relSource,
      ref: refFile,
      exists: fs.existsSync(fullPath),
      type: "workflow",
    });
  }

  // Deduplicate
  const seen = new Set();
  return refs.filter((r) => {
    const key = `${r.source}→${r.ref}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Numeric Claim Extractor ───────────────────────────────────────────────────

/**
 * Finds numeric claims about asset counts in a file.
 * Patterns: "N reviewers", "N agents", "N skills", "N workflows", "N scripts"
 */
function extractNumericClaims(filePath, content, agentDir, actualCounts) {
  const claims = [];
  const relSource = path.relative(agentDir, filePath).replace(/\\/g, "/");
  const lines = content.split(/\r?\n/);

  const claimPatterns = [
    { regex: /(\d+)[-\s]+(?:parallel\s+)?(?:reviewers?|agents?)/gi, entity: "reviewers" },
    { regex: /(\d+)\s*(?:specialist\s+)?agents?\b/gi, entity: "agents" },
    { regex: /(\d+)\s*(?:modular\s+)?skills?\b/gi, entity: "skills" },
    { regex: /(\d+)\s*(?:slash\s+)?workflows?\b/gi, entity: "workflows" },
    { regex: /(\d+)\s*(?:JS\s+)?scripts?\b/gi, entity: "scripts" },
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { regex, entity } of claimPatterns) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(line)) !== null) {
        const claimed = parseInt(match[1], 10);
        // Skip tiny numbers (likely not count claims) and very large numbers
        if (claimed < 3 || claimed > 500) continue;

        const actual = actualCounts[entity];
        if (actual !== undefined) {
          claims.push({
            source: `${relSource}:L${i + 1}`,
            claim: `${claimed} ${entity}`,
            actual,
            valid: claimed === actual,
          });
        }
      }
    }
  }

  return claims;
}

// ── File Walker ───────────────────────────────────────────────────────────────

function walkMdFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;

  const entries = safeReaddir(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        // Skip node_modules, .git, history, .backups, .shared
        if (
          ["node_modules", ".git", "history", ".backups", ".shared"].includes(
            entry,
          )
        ) {
          continue;
        }
        walkMdFiles(fullPath, fileList);
      } else if (entry.endsWith(".md") || entry.endsWith(".json")) {
        if (entry.startsWith("http") || entry.startsWith("#") || entry.startsWith("https://github.com/")) {
          continue;
        }
        fileList.push(fullPath);
      }
    } catch {
      // Skip files we can't stat
    }
  }
  return fileList;
}

// ── Main: Generate Manifest ───────────────────────────────────────────────────

function generateManifest(projectRoot) {
  const agentDir = path.join(projectRoot, AGENT_DIR_NAME);

  if (!fs.existsSync(agentDir)) {
    return {
      error: `No ${AGENT_DIR_NAME}/ directory found at ${projectRoot}`,
    };
  }

  // Phase 1: Crawl all entity types
  const agents = crawlAgents(agentDir);
  const skills = crawlSkills(agentDir);
  const scripts = crawlScripts(agentDir);
  const workflows = crawlWorkflows(agentDir);

  // Phase 2: Extract cross-references from all markdown files
  const allFiles = walkMdFiles(agentDir);
  const allRefs = [];
  const allClaims = [];

  const actualCounts = {
    reviewers: agents.reviewer_count,
    agents: agents.total,
    skills: skills.total,
    workflows: workflows.total,
    scripts: scripts.total,
  };

  for (const file of allFiles) {
    const content = safeReadFile(file);
    if (!content) continue;

    const refs = extractCrossReferences(file, content, agentDir);
    allRefs.push(...refs);

    const claims = extractNumericClaims(file, content, agentDir, actualCounts);
    allClaims.push(...claims);
  }

  // Phase 3: Deduplicate cross-references
  const seenRefs = new Set();
  const uniqueRefs = allRefs.filter((r) => {
    const key = `${r.source}→${r.ref}`;
    if (seenRefs.has(key)) return false;
    seenRefs.add(key);
    return true;
  });

  // Phase 4: Build manifest
  let version = "unknown";
  try {
    const pkg = JSON.parse(
      safeReadFile(path.join(projectRoot, "package.json")) || "{}",
    );
    version = pkg.version || "unknown";
  } catch {
    // Ignore
  }

  const manifest = {
    version,
    generated_at: new Date().toISOString(),
    agents,
    skills,
    scripts,
    workflows,
    cross_references: uniqueRefs,
    numeric_claims: allClaims,
    integrity: {
      phantom_references: uniqueRefs.filter((r) => !r.exists).length,
      invalid_claims: allClaims.filter((c) => !c.valid).length,
      total_references: uniqueRefs.length,
      total_claims: allClaims.length,
    },
  };

  return manifest;
}

// ── Persist Manifest ──────────────────────────────────────────────────────────

function saveManifest(manifest, projectRoot) {
  const historyDir = path.join(projectRoot, AGENT_DIR_NAME, "history");
  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true });
  }

  const outputPath = path.join(historyDir, "integrity_manifest.json");
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), "utf8");
  return outputPath;
}

// ── CLI Entry Point ───────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const projectRoot = process.cwd();
  const outputJson = args.includes("--output") && args.includes("json");
  const validateOnly = args.includes("--validate");

  const manifest = generateManifest(projectRoot);

  if (manifest.error) {
    console.error(`❌ ${manifest.error}`);
    process.exit(1);
  }

  if (outputJson) {
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }

  // Save to disk
  const outputPath = saveManifest(manifest, projectRoot);

  // Print summary
  const { integrity } = manifest;
  console.log(`\n🛡️  Integrity Manifest Generated`);
  console.log(`   Path: ${outputPath}`);
  console.log(`   ─────────────────────────────────`);
  console.log(`   Agents:      ${manifest.agents.total} (${manifest.agents.reviewer_count} reviewers)`);
  console.log(`   Skills:      ${manifest.skills.total}`);
  console.log(`   Scripts:     ${manifest.scripts.total}`);
  console.log(`   Workflows:   ${manifest.workflows.total}`);
  console.log(`   References:  ${integrity.total_references}`);
  console.log(`   Claims:      ${integrity.total_claims}`);
  console.log(`   ─────────────────────────────────`);

  if (integrity.phantom_references > 0) {
    console.log(`   ⚠️  Phantom references: ${integrity.phantom_references}`);
    const phantoms = manifest.cross_references.filter((r) => !r.exists);
    for (const p of phantoms) {
      console.log(`      ❌ ${p.source} → ${p.ref}`);
    }
  }

  if (integrity.invalid_claims > 0) {
    console.log(`   ⚠️  Invalid claims: ${integrity.invalid_claims}`);
    const invalid = manifest.numeric_claims.filter((c) => !c.valid);
    for (const c of invalid) {
      console.log(`      ❌ ${c.source}: says "${c.claim}" but actual is ${c.actual}`);
    }
  }

  if (
    integrity.phantom_references === 0 &&
    integrity.invalid_claims === 0
  ) {
    console.log(`   ✅ All references valid. All claims accurate.`);
  }

  console.log();

  if (validateOnly) {
    const exitCode =
      integrity.phantom_references > 0 || integrity.invalid_claims > 0 ? 1 : 0;
    process.exit(exitCode);
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  generateManifest,
  saveManifest,
  parseFrontmatter,
  crawlAgents,
  crawlSkills,
  crawlScripts,
  crawlWorkflows,
  extractCrossReferences,
  extractNumericClaims,
};

if (require.main === module) {
  main();
}
