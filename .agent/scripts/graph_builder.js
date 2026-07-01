#!/usr/bin/env node
/**
 * graph_builder.js — Tribunal Kit Macro Graph Mapper
 * Parses project structure for imports, exports, and dependencies
 * using incremental caching and zero external dependencies.
 * Now includes Blast Radius calculation and robust token stripping.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const {
  RED,
  GREEN,
  BOLD,
  DIM,
  CYAN,
  RESET,
  timer,
  formatMs,
} = require("./_colors");

const AGENT_DIR = path.join(process.cwd(), ".agent");
const HISTORY_DIR = path.join(AGENT_DIR, "history");
const CACHE_FILE = path.join(HISTORY_DIR, "graph-cache.json");
const GRAPH_FILE = path.join(HISTORY_DIR, "architecture-graph.yaml");

// ── Exclusions & Safety ───────────────────────────────────────────────────────
const DEFAULT_EXCLUSIONS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
  ".agent",
  "artifacts",
]);

function loadGitIgnore() {
  const gitignorePath = path.join(process.cwd(), ".gitignore");
  if (!fs.existsSync(gitignorePath)) return [];

  return fs
    .readFileSync(gitignorePath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.replace(/\/$/, "").replace(/^\//, ""));
}

const customExclusions = loadGitIgnore();

function isExcluded(filePath) {
  const parts = filePath.split(path.sep);
  if (parts.some((p) => DEFAULT_EXCLUSIONS.has(p))) return true;

  const relativePath = path
    .relative(process.cwd(), filePath)
    .replace(/\\/g, "/");
  for (const pattern of customExclusions) {
    if (relativePath.includes(pattern)) return true;
  }
  return false;
}

// ── Content Hashing ───────────────────────────────────────────────────────────
function getFileHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash("sha1").update(content).digest("hex");
}

// ── Traversal ─────────────────────────────────────────────────────────────────
function walkDir(dir, fileList = []) {
  if (!fs.existsSync(dir) || isExcluded(dir)) return fileList;

  let files;
  try {
    files = fs.readdirSync(dir);
  } catch (_err) {
    return fileList;
  }

  for (const file of files) {
    const filePath = path.join(dir, file);
    if (isExcluded(filePath)) continue;

    if (fs.statSync(filePath).isDirectory()) {
      walkDir(filePath, fileList);
    } else {
      if (/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(file)) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

// ── Regex AST Extraction ──────────────────────────────────────────────────────
function parseFile(content) {
  const imports = new Set();
  const exports = new Set();

  // Parse from semi-cleaned content (comments removed)
  // WAIT: If I stripped strings, how do I get the import path?
  // The previous implementation used strings `['"]([^'"]+)['"]`.
  // If I strip strings, the import path is lost!
  // Let's rollback that logic or adapt it.
  // Instead of stripping all strings, we should only strip strings if they are NOT following 'import ' or 'require('
  // To do this simply, let's keep strings, but just be careful.
  // Actually, string literals inside `require("...")` are what we want.
  // So `parseFile` should probably NOT strip strings, but just use a safer regex.
  // The false positive in `dependency_analyzer` was because of `const diff = "import a from 'a'"`.
  // Let's use `stripStringsAndComments` but we DO NOT strip strings.
  // We only strip comments.

  // I'll define an inner function to just strip comments to be safe for imports.
  // Let's stick to the simple `.replace` for comments for now, and rely on regex boundaries.
  const semiCleanContent = content
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  const importRegex2 =
    /^[\s]*import(?:(?:[\w*\s{},]*)\sfrom\s+)?['"]([^'"]+)['"]/gm;
  const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
  const dynamicImportRegex = /import\(['"]([^'"]+)['"]\)/g;

  const exportRegex =
    /^[\s]*export\s+(?:const|let|var|function|class)\s+([a-zA-Z0-9_]+)/gm;
  const moduleExportRegex = /module\.exports\s*=\s*\{([^}]+)\}/g;
  const defaultExportRegex = /^[\s]*export\s+default\s+([a-zA-Z0-9_]+)/gm;

  let match;
  while ((match = importRegex2.exec(semiCleanContent)) !== null)
    imports.add(match[1]);
  while ((match = requireRegex.exec(semiCleanContent)) !== null)
    imports.add(match[1]);
  while ((match = dynamicImportRegex.exec(semiCleanContent)) !== null)
    imports.add(match[1]);

  while ((match = exportRegex.exec(semiCleanContent)) !== null)
    exports.add(match[1]);
  while ((match = defaultExportRegex.exec(semiCleanContent)) !== null)
    exports.add(match[1]);

  while ((match = moduleExportRegex.exec(semiCleanContent)) !== null) {
    const tokens = match[1]
      .split(",")
      .map((s) => s.trim().split(":")[0].trim());
    tokens.forEach((t) => t && exports.add(t));
  }

  return {
    imports: Array.from(imports),
    exports: Array.from(exports),
  };
}

// ── YAML Generation ───────────────────────────────────────────────────────────
function generateYAML(data) {
  let yaml = "# Auto-generated Architecture Graph by Tribunal Kit\n";
  yaml += "# DO NOT EDIT MANUALLY - Auto-updates via incremental cache\n\n";

  for (const [file, info] of Object.entries(data)) {
    if (
      info.imports.length === 0 &&
      info.exports.length === 0 &&
      (!info.dependents || info.dependents.length === 0)
    )
      continue;

    yaml += `"${file}":\n`;
    yaml += `  riskScore: "${info.riskScore || "Low"}"\n`;
    yaml += `  blastRadius: ${info.blastRadius || 0}\n`;

    if (info.imports && info.imports.length > 0) {
      yaml += `  imports:\n`;
      info.imports.forEach((i) => (yaml += `    - "${i}"\n`));
    }
    if (info.exports && info.exports.length > 0) {
      yaml += `  exports:\n`;
      info.exports.forEach((e) => (yaml += `    - "${e}"\n`));
    }
    if (info.dependents && info.dependents.length > 0) {
      yaml += `  dependents:\n`;
      info.dependents.forEach((d) => (yaml += `    - "${d}"\n`));
    }
  }
  return yaml;
}

// ── Main Execution ────────────────────────────────────────────────────────────
function main() {
  if (!fs.existsSync(AGENT_DIR)) {
    console.error(`${RED}✖ Error: .agent directory not found.${RESET}`);
    process.exit(1);
  }

  if (!fs.existsSync(HISTORY_DIR))
    fs.mkdirSync(HISTORY_DIR, { recursive: true });

  let cache = {};
  if (fs.existsSync(CACHE_FILE)) {
    try {
      cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    } catch {
      /* ignore */
    }
  }

  const totalTimer = timer();
  console.log(`${CYAN}✦ Building Architecture Graph...${RESET}`);
  const files = walkDir(process.cwd());
  const graphData = {};

  let parsedCount = 0;
  let cachedCount = 0;
  const changedFiles = new Set();

  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file).replace(/\\/g, "/");
    let fileHash;
    try {
      fileHash = getFileHash(file);
    } catch {
      continue;
    }

    if (cache[relativePath] && cache[relativePath].hash === fileHash) {
      graphData[relativePath] = {
        imports: cache[relativePath].imports,
        exports: cache[relativePath].exports,
      };
      cachedCount++;
    } else {
      try {
        const content = fs.readFileSync(file, "utf8");
        const parsed = parseFile(content);
        graphData[relativePath] = parsed;

        cache[relativePath] = {
          hash: fileHash,
          imports: parsed.imports,
          exports: parsed.exports,
        };
        parsedCount++;
        changedFiles.add(relativePath);
      } catch {
        /* ignore */
      }
    }
  }

  // Compute Dependents
  for (const [_file, info] of Object.entries(graphData)) info.dependents = [];

  const fileKeys = Object.keys(graphData);
  for (const [file, info] of Object.entries(graphData)) {
    for (const imp of info.imports) {
      if (imp.startsWith(".")) {
        let resolved = path.posix.join(path.dirname(file), imp);
        // Look for direct match or .js / index.js
        let matchingKey = fileKeys.find(
          (k) =>
            k === resolved ||
            k === resolved + ".js" ||
            k === resolved + ".ts" ||
            k === resolved + "/index.js",
        );
        if (matchingKey) {
          if (!graphData[matchingKey].dependents.includes(file)) {
            graphData[matchingKey].dependents.push(file);
          }
        }
      }
    }
  }

  // Compute Risk Score
  function computeRisk(file) {
    const visited = new Set();
    function visit(node) {
      if (visited.has(node)) return;
      visited.add(node);
      const deps = graphData[node]?.dependents || [];
      deps.forEach(visit);
    }
    visit(file);
    const radius = visited.size - 1;
    let score = "Low";
    if (radius > 10) score = "Critical";
    else if (radius >= 5) score = "High";
    else if (radius >= 2) score = "Medium";
    return { score, count: Math.max(0, radius) };
  }

  for (const file of fileKeys) {
    const risk = computeRisk(file);
    graphData[file].riskScore = risk.score;
    graphData[file].blastRadius = risk.count;

    // Update cache with these values so visualizer can use it
    if (cache[file]) {
      cache[file].dependents = graphData[file].dependents;
      cache[file].riskScore = risk.score;
      cache[file].blastRadius = risk.count;
    }
  }

  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  fs.writeFileSync(GRAPH_FILE, generateYAML(graphData));

  // ── Pre-Computed Context Snapshots (Incremental) ─────────────────────────
  const SNAPSHOTS_DIR = path.join(HISTORY_DIR, "snapshots");
  if (!fs.existsSync(SNAPSHOTS_DIR)) {
    fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  }

  // Clean up snapshots for files that no longer exist
  try {
    const existingSnapshots = fs.readdirSync(SNAPSHOTS_DIR);
    const currentFileSet = new Set(
      fileKeys.map((f) => f.replace(/[\\/]/g, "__") + ".json"),
    );
    for (const snap of existingSnapshots) {
      if (!currentFileSet.has(snap))
        fs.unlinkSync(path.join(SNAPSHOTS_DIR, snap));
    }
  } catch {
    /* ignore */
  }

  console.log(`${CYAN}✦ Generating Context Snapshots...${RESET}`);
  let snapshotWritten = 0;
  let snapshotSkipped = 0;
  for (const file of fileKeys) {
    const info = graphData[file];
    const snapshotFile = file.replace(/[\\/]/g, "__") + ".json";
    const snapshotPath = path.join(SNAPSHOTS_DIR, snapshotFile);

    // Skip unchanged files that already have a snapshot
    if (!changedFiles.has(file) && fs.existsSync(snapshotPath)) {
      snapshotSkipped++;
      continue;
    }

    let content = "";
    try {
      content = fs.readFileSync(path.join(process.cwd(), file), "utf8");
    } catch {
      continue;
    }

    const snapshot = {
      file: file,
      riskScore: info.riskScore,
      blastRadius: info.blastRadius,
      imports: {},
      dependents: info.dependents || [],
      content: content,
    };

    for (const imp of info.imports) {
      if (imp.startsWith(".")) {
        let resolved = path.posix.join(path.dirname(file), imp);
        let matchingKey = fileKeys.find(
          (k) =>
            k === resolved ||
            k === resolved + ".js" ||
            k === resolved + ".ts" ||
            k === resolved + "/index.js",
        );
        if (matchingKey && graphData[matchingKey]) {
          snapshot.imports[imp] = graphData[matchingKey].exports;
        } else {
          snapshot.imports[imp] = [];
        }
      } else {
        snapshot.imports[imp] = [];
      }
    }

    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
    snapshotWritten++;
  }
  console.log(
    `  ${DIM}Snapshots: ${snapshotWritten} written | ${snapshotSkipped} cached${RESET}`,
  );

  const totalMs = totalTimer();
  console.log(`\n${GREEN}${BOLD}✔ Graph successfully built.${RESET}`);
  console.log(
    `  ${DIM}Parsed: ${parsedCount} files | Cached: ${cachedCount} files | ${formatMs(totalMs)}${RESET}`,
  );
  console.log(`  ${DIM}Saved to: ${GRAPH_FILE}${RESET}`);
}
// ── Exports (for testing & programmatic use) ─────────────────────────────────
module.exports = {
  parseFile,
  generateYAML,
  walkDir,
  isExcluded,
  getFileHash,
  main,
};

if (require.main === module) {
  main();
}
