#!/usr/bin/env node
/**
 * tribunal-kit CLI (alias: tk)
 *
 * Commands:
 *   init      — Install .agent/ into target project
 *   update    — Re-install to get latest changes
 *   status    — Check if .agent/ is installed
 *   learn     — Evolve project idioms based on git diffs
 *   case      — Manage Case Law precedents
 *   hook      — Install pre-push git hook
 *   uninstall — Remove .agent/ from project
 *
 * Usage:
 *   npx tribunal-kit init
 *   npx tribunal-kit init --force
 *   npx tribunal-kit init --path ./myapp
 *   npx tribunal-kit init --quiet
 *   npx tribunal-kit init --dry-run
 *   tribunal-kit update
 *   tribunal-kit status
 *   tribunal-kit uninstall
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const { execSync, spawn } = require("child_process");

/**
 * Safely run a Node.js script with arguments as an array.
 * No shell interpolation — immune to injection.
 */
function runScriptAsync(scriptPath, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      stdio: "inherit",
      ...options,
    });
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(`Script failed with exit code ${code}`));
      else resolve();
    });
    child.on("error", reject);
  });
}

const PKG = require(path.resolve(__dirname, "..", "package.json"));
const CURRENT_VERSION = PKG.version;

// ── Colors ───────────────────────────────────────────────
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[91m",
  green: "\x1b[92m",
  yellow: "\x1b[93m",
  blue: "\x1b[94m",
  magenta: "\x1b[95m",
  cyan: "\x1b[96m",
  white: "\x1b[97m",
  gray: "\x1b[90m",
  bgCyan: "\x1b[46m",
};

function colorize(color, text) {
  return `${C[color]}${text}${C.reset}`;
}

function c(color, text) {
  return `${C[color]}${text}${C.reset}`;
}
function bold(text) {
  return `${C.bold}${text}${C.reset}`;
}

// ── Logging ──────────────────────────────────────────────
let quiet = false;
let verbose = false;

function log(msg) {
  if (!quiet) console.log(msg);
}
function ok(msg) {
  if (!quiet) console.log(`  ${c("green", "✔")} ${msg}`);
}
function warn(msg) {
  if (!quiet) console.log(`  ${c("yellow", "⚠")}  ${msg}`);
}
function err(msg) {
  console.error(`  ${c("red", "✖")} ${msg}`);
}
function dim(msg) {
  if (!quiet) console.log(`  ${c("gray", msg)}`);
}
function dbg(msg) {
  if (verbose) console.log(`  ${c("gray", "⊡")} ${c("gray", msg)}`);
}

// ── Arg Parser ───────────────────────────────────────────
function parseArgs(argv) {
  const args = { command: null, flags: {} };
  const raw = argv.slice(2);

  // First non-flag arg is the command
  for (const arg of raw) {
    if (!arg.startsWith("--") && !args.command) {
      args.command = arg;
      continue;
    }
    if (arg === "--force") {
      args.flags.force = true;
      continue;
    }
    if (arg === "--quiet") {
      args.flags.quiet = true;
      continue;
    }
    if (arg === "--verbose") {
      args.flags.verbose = true;
      continue;
    }
    if (arg === "--dry-run") {
      args.flags.dryRun = true;
      continue;
    }
    if (arg === "--minimal") {
      args.flags.minimal = true;
      continue;
    }
    if (arg === "--token-optimized") {
      args.flags.tokenOptimized = true;
      continue;
    }
    if (arg === "--skip-update-check") {
      args.flags.skipUpdateCheck = true;
      continue;
    }
    if (arg === "--head") {
      args.flags.head = true;
      continue;
    }
    if (arg.startsWith("--path=")) {
      args.flags.path = arg.split("=").slice(1).join("=");
    }
    if (arg === "--path") {
      const idx = raw.indexOf("--path");
      const nextVal = raw[idx + 1];
      if (!nextVal || nextVal.startsWith("--")) {
        console.error(
          `  \x1b[91m✖ --path requires a directory argument\x1b[0m`,
        );
        process.exit(1);
      }
      args.flags.path = nextVal;
    }
    if (arg.startsWith("--branch=")) {
      args.flags.branch = arg.split("=").slice(1).join("=");
    }
  }

  return args;
}

// ── File Utilities ────────────────────────────────────────

// Core agents to install in --minimal mode
const CORE_AGENTS = new Set([
  "backend-specialist.md",
  "frontend-specialist.md",
  "database-architect.md",
  "debugger.md",
  "security-auditor.md",
  "logic-reviewer.md",
  "dependency-reviewer.md",
  "type-safety-reviewer.md",
  "performance-reviewer.md",
  "orchestrator.md",
  "explorer-agent.md",
  "project-planner.md",
  "test-engineer.md",
]);

// Core skills to install in --minimal mode
const CORE_SKILLS = new Set([
  "clean-code",
  "architecture",
  "testing-patterns",
  "systematic-debugging",
  "frontend-design",
  "database-design",
  "api-patterns",
  "nodejs-best-practices",
  "vulnerability-scanner",
  "typescript-advanced",
  "python-pro",
  "nextjs-react-expert",
  "react-specialist",
  "performance-profiling",
  "lint-and-validate",
]);

async function copyDir(src, dest, dryRun = false, filter = null) {
  if (!dryRun) {
    await fs.promises.mkdir(dest, { recursive: true });
  }

  const entries = await fs.promises.readdir(src, { withFileTypes: true });
  let count = 0;

  for (const entry of entries) {
    // Apply filter if provided (for --minimal mode)
    if (filter && !filter(entry.name, src)) {
      dbg(`  skip: ${entry.name}`);
      continue;
    }

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      count += await copyDir(srcPath, destPath, dryRun, filter);
    } else {
      if (!dryRun) {
        await fs.promises.copyFile(srcPath, destPath);
      }
      dbg(`  copy: ${entry.name}`);
      count++;
    }
  }

  return count;
}

async function countDir(dir) {
  let count = 0;
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) count += await countDir(path.join(dir, e.name));
    else count++;
  }
  return count;
}

// ── Version Check & Auto-Update ──────────────────────────

/**
 * Compare two semver strings. Returns:
 *   1 if a > b, -1 if a < b, 0 if equal.
 */
function compareSemver(a, b) {
  const pa = a.replace(/^v/, "").split(".").map(Number);
  const pb = b.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

/**
 * Fetch the latest version from npm registry.
 * Returns the version string (e.g. '4.0.0') or null on failure.
 */
function fetchLatestVersion() {
  return new Promise((resolve) => {
    const req = https.get(
      "https://registry.npmjs.org/tribunal-kit/latest",
      {
        headers: {
          Accept: "application/json",
          "User-Agent": `tribunal-kit/${CURRENT_VERSION}`,
        },
        timeout: 5000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            const version = json.version || null;
            resolve(version);
          } catch {
            resolve(null);
          }
        });
      },
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * Check for a newer version and re-invoke with @latest if found.
 * Uses TK_SKIP_UPDATE_CHECK env var as recursion guard.
 * Returns true if a re-invoke happened (caller should exit), false otherwise.
 */
async function autoUpdateCheck(originalArgs) {
  // Recursion guard: if we're already a re-invoked process, skip
  if (process.env.TK_SKIP_UPDATE_CHECK === "1") {
    return false;
  }

  log("  Checking for updates...");
  const latestVersion = await fetchLatestVersion();

  if (!latestVersion) {
    // Network fail — proceed silently with current version
    return false;
  }

  if (compareSemver(latestVersion, CURRENT_VERSION) <= 0) {
    // Already up to date
    dim(`Version ${CURRENT_VERSION} is up to date.`);
    return false;
  }

  // Newer version available — re-invoke
  log("");
  log(
    colorize(
      "cyan",
      `  ⬆ New version available: ${colorize("bold", CURRENT_VERSION)} → ${colorize("bold", latestVersion)}`,
    ),
  );
  log(colorize("gray", "  Re-invoking with latest version..."));
  log("");

  try {
    // Build the command pulling from npm registry
    const args = originalArgs.join(" ");
    const cmd = `npx -y tribunal-kit@${latestVersion} ${args}`;

    execSync(cmd, {
      stdio: "inherit",
      env: { ...process.env, TK_SKIP_UPDATE_CHECK: "1" },
    });
    return true; // Re-invoke succeeded, caller should exit
  } catch (e) {
    warn(`Auto-update failed: ${e.message}`);
    warn("Continuing with current version...");
    return false; // Fall through to current version
  }
}

// ── Kit Source Location ───────────────────────────────────
function getKitAgent() {
  // When installed via npm, the .agent/ folder is next to this script's package
  const kitRoot = path.resolve(__dirname, "..");
  const agentDir = path.join(kitRoot, ".agent");

  if (!fs.existsSync(agentDir)) {
    err(`Kit .agent/ folder not found at: ${agentDir}`);
    err("The package may be corrupted. Try: npm install -g tribunal-kit");
    process.exit(1);
  }

  return agentDir;
}

// ── Self-Install Guard ────────────────────────────────────
/**
 * Returns true if the target directory IS the tribunal-kit package itself.
 * This prevents `init --force` / `update` from deleting the package's own files
 * when run from inside the project directory.
 */
function isSelfInstall(targetDir) {
  const kitRoot = path.resolve(__dirname, "..");
  const resolvedTarget = path.resolve(targetDir);

  // Direct path match
  if (resolvedTarget === kitRoot) return true;

  // Check if the target's package.json is this package
  const targetPkg = path.join(resolvedTarget, "package.json");
  if (fs.existsSync(targetPkg)) {
    try {
      const targetName = JSON.parse(fs.readFileSync(targetPkg, "utf8")).name;
      if (targetName === PKG.name) return true;
    } catch {
      // Unreadable package.json — not a match
    }
  }

  return false;
}

// ── Banner ────────────────────────────────────────────────
function banner() {
  if (quiet) return;
  // Big ASCII art (TRIBUNAL-KIT)
  const art = String.raw`
████████╗██████╗ ██╗██████╗ ██╗   ██╗███╗   ██╗ █████╗ ██╗      ██╗  ██╗██╗████████╗
╚══██╔══╝██╔══██╗██║██╔══██╗██║   ██║████╗  ██║██╔══██╗██║      ██║ ██╔╝██║╚══██╔══╝
   ██║   ██████╔╝██║██████╔╝██║   ██║██╔██╗ ██║███████║██║█████╗█████╔╝ ██║   ██║   
   ██║   ██╔══██╗██║██╔══██╗██║   ██║██║╚██╗██║██╔══██║██║╚════╝██╔═██╗ ██║   ██║   
   ██║   ██║  ██║██║██████╔╝╚██████╔╝██║ ╚████║██║  ██║███████╗ ██║  ██╗██║   ██║   
   ╚═╝   ╚═╝  ╚═╝╚═╝╚═════╝  ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝ ╚═╝  ╚═╝╚═╝   ╚═╝   `
    .split("\n")
    .filter(Boolean);
  console.log();
  const _maxLen = Math.max(...art.map((line) => line.length));
  for (const line of art) {
    let gradientLine = "  " + C.bold;
    for (let i = 0; i < line.length; i++) {
      gradientLine += `\x1b[38;2;255;22;55m${line[i]}`;
    }
    gradientLine += C.reset;
    log(gradientLine);
  }
  console.log();
  // Subtitle strip
  const W = 84;
  const sub = "Anti-Hallucination Agent System";
  const sp = Math.max(0, W - sub.length);
  const centred =
    " ".repeat(Math.floor(sp / 2)) + sub + " ".repeat(Math.ceil(sp / 2));
  const RED_ANSI = "\x1b[38;2;255;22;55m";
  console.log(`  ${RED_ANSI}╔${"═".repeat(W)}╗${C.reset}`);
  console.log(
    `  ${RED_ANSI}║${C.reset}${c("gray", centred)}${RED_ANSI}║${C.reset}`,
  );
  console.log(`  ${RED_ANSI}╚${"═".repeat(W)}╝${C.reset}`);
  console.log();
}

// ── Commands ──────────────────────────────────────────────
async function cmdInit(flags) {
  const agentSrc = getKitAgent();
  const targetDir = flags.path ? path.resolve(flags.path) : process.cwd();
  const agentDest = path.join(targetDir, ".agent");
  const dryRun = flags.dryRun || false;

  // ── Self-install guard ──────────────────────────────────
  if (isSelfInstall(targetDir)) {
    err("Cannot run init/update inside the tribunal-kit package itself.");
    err(`Target: ${targetDir}`);
    err(`Package: ${path.resolve(__dirname, "..")}`);
    console.log();
    dim("This command is designed to install .agent/ into OTHER projects.");
    dim("Run it from the root of the project you want to set up:");
    dim("  cd /path/to/your-project");
    dim("  npx tribunal-kit init");
    console.log();
    process.exit(1);
  }
  // ────────────────────────────────────────────────────────

  // ── Backup / Cleanup ────────────────────────────────────
  if (!dryRun && fs.existsSync(agentDest) && flags.force) {
    // Backup the existing subdirectories before overwriting
    const backupDir = path.join(agentDest, ".backups", `backup-${Date.now()}`);
    fs.mkdirSync(backupDir, { recursive: true });

    const subdirs = [
      "agents",
      "workflows",
      "skills",
      "scripts",
      ".shared",
      "rules",
    ];
    for (const sub of subdirs) {
      const subPath = path.join(agentDest, sub);
      if (fs.existsSync(subPath)) {
        // Copy to backup dir
        await copyDir(subPath, path.join(backupDir, sub), false);
        // Removed aggressive deletion so user custom files persist
      }
    }
    log(
      `  ${c("gray", "✦ Backed up existing configurations to .agent/.backups/")}`,
    );
  }
  // ────────────────────────────────────────────────────────

  banner();

  if (dryRun) {
    log(colorize("yellow", "  DRY RUN — no files will be written"));
    console.log();
  }

  // Check target exists
  if (!fs.existsSync(targetDir)) {
    err(`Target directory not found: ${targetDir}`);
    process.exit(1);
  }

  // Check if .agent already exists
  if (fs.existsSync(agentDest) && !flags.force) {
    warn(".agent/ already exists in this project.");
    log(
      `  ${c("gray", "▸")} To refresh or update it, run: ${colorize("white", "tribunal-kit init --force")}`,
    );
    log(
      `  ${c("gray", "▸")} Or check status with:    ${colorize("cyan", "tribunal-kit status")}`,
    );
    console.log();
    process.exit(0);
  }

  // Ensure history dirs exist (Case Law + Skill Evolution)
  if (!dryRun) {
    const caseDir = path.join(agentDest, "history", "case-law", "cases");
    const evoDir = path.join(agentDest, "history", "skill-evolution");
    fs.mkdirSync(caseDir, { recursive: true });
    fs.mkdirSync(evoDir, { recursive: true });
    const gkCase = path.join(caseDir, ".gitkeep");
    const gkEvo = path.join(evoDir, ".gitkeep");
    if (!fs.existsSync(gkCase)) fs.writeFileSync(gkCase, "");
    if (!fs.existsSync(gkEvo)) fs.writeFileSync(gkEvo, "");
  }

  // Count what we're installing
  const isMinimal = flags.minimal || false;
  if (isMinimal) {
    log(
      `  ${c("yellow", "⚡")} ${bold("Minimal mode")} — installing core agents and skills only`,
    );
    console.log();
  }
  const totalFiles = await countDir(agentSrc);
  dbg(`Source: ${agentSrc}`);
  dbg(`Target: ${agentDest}`);
  dbg(`Total source files: ${totalFiles}`);
  log(
    `  ${c("gray", "▸")} Scanning ${c("white", String(totalFiles))} files  ${c("gray", "→")}  ${c("gray", agentDest)}`,
  );

  try {
    // Build filter for --minimal mode
    const minimalFilter = isMinimal
      ? (name, parentDir) => {
          const parentName = path.basename(parentDir);
          if (parentName === "agents") return CORE_AGENTS.has(name);
          if (parentName === "skills") return CORE_SKILLS.has(name);
          return true; // everything else passes
        }
      : null;

    const copied = await copyDir(agentSrc, agentDest, dryRun, minimalFilter);

    console.log();
    if (dryRun) {
      ok(
        `${bold("DRY RUN")} complete — would install ${c("cyan", String(copied))} files`,
      );
      dim(`Target: ${agentDest}`);
    } else {
      // ── Success card — W=62, rows padded by plain-text length ──
      const W = 62;
      const agentsCount = fs.readdirSync(path.join(agentDest, "agents")).length;
      const workflowsCount = fs.readdirSync(
        path.join(agentDest, "workflows"),
      ).length;
      const skillsCount = fs.readdirSync(path.join(agentDest, "skills")).length;
      const scriptsCount = fs.readdirSync(
        path.join(agentDest, "scripts"),
      ).length;

      // Stat rows: compute trailing spaces from plain text so right ║ aligns
      const statRow = (icon, label, val, col) => {
        // emoji JS .length===2 == terminal display width 2 ✓
        const plain = `  ${icon}  ${label.padEnd(10)}${String(val).padStart(3)} installed`;
        const trail = " ".repeat(Math.max(0, W - plain.length));
        return `  ${c("cyan", "║")}  ${icon}  ${c("white", label.padEnd(10))}${c(col, String(val).padStart(3))} ${c("gray", "installed")}${trail}${c("cyan", "║")}`;
      };
      // Plain-text rows (header / blank)
      const plainRow = (text, wrapFn) => {
        const trail = " ".repeat(Math.max(0, W - text.length));
        return `  ${c("cyan", "║")}${wrapFn(text)}${trail}${c("cyan", "║")}`;
      };
      // Next-step rows: fixed cmd column + description
      const stepRow = (cmd, desc) => {
        const plain = `  ${cmd.padEnd(16)}${desc}`;
        const trail = " ".repeat(Math.max(0, W - plain.length));
        return `  ${c("cyan", "║")}  ${c("white", cmd.padEnd(16))}${c("gray", desc)}${trail}${c("cyan", "║")}`;
      };

      console.log(
        `  ${c("green", "✔")} ${bold(c("green", "Installation complete"))} ${c("gray", "—")} ${c("white", String(copied))} files`,
      );
      console.log(`  ${c("gray", "  ╰─")} ${c("gray", agentDest)}`);
      console.log();
      console.log(`  ${c("cyan", "╔" + "═".repeat(W) + "╗")}`);
      console.log(
        plainRow(`  What's inside:`, (s) => c("bold", c("white", s))),
      );
      console.log(`  ${c("cyan", "╠" + "═".repeat(W) + "╣")}`);
      console.log(statRow("🤖", "Agents", agentsCount, "magenta"));
      console.log(statRow("⚡", "Workflows", workflowsCount, "yellow"));
      console.log(statRow("🧠", "Skills", skillsCount, "blue"));
      console.log(statRow("🔧", "Scripts", scriptsCount, "green"));
      console.log(`  ${c("cyan", "╠" + "═".repeat(W) + "╣")}`);
      console.log(plainRow("", () => ""));
      console.log(plainRow(`  Next steps:`, (s) => c("gray", s)));
      console.log(
        stepRow("/generate", "Generate code with anti-hallucination"),
      );
      console.log(stepRow("/review", "Audit existing code for issues"));
      console.log(
        stepRow("/tribunal-full", "Run all 16 reviewers in parallel"),
      );
      console.log(plainRow("", () => ""));
      console.log(`  ${c("cyan", "╚" + "═".repeat(W) + "╝")}`);
      console.log();
      log(`  ${c("gray", "✦ Updating .gitignore...")}`);
      await updateGitignore(targetDir, dryRun);
      log(`  ${c("gray", "✦ Generating IDE bridge files...")}`);
      await generateIDEBridges(targetDir, agentDest, dryRun, flags.tokenOptimized || false);
    }

    console.log();
  } catch (e) {
    err(`Failed to install: ${e.message}`);
    process.exit(1);
  }
}

// ── Gitignore Management ──────────────────────────────────
async function updateGitignore(targetDir, dryRun = false) {
  if (dryRun) return;
  const gitignorePath = path.join(targetDir, ".gitignore");
  const entries = [".agent/.backups/", ".agent/history/"];
  let content = "";
  try {
    content = await fs.promises.readFile(gitignorePath, "utf8");
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
  let appended = false;
  for (const entry of entries) {
    if (!content.includes(entry)) {
      content +=
        (content.length > 0 && !content.endsWith("\n") ? "\n" : "") +
        entry +
        "\n";
      appended = true;
    }
  }
  if (appended) {
    await fs.promises.writeFile(gitignorePath, content, "utf8");
    dbg("  Updated .gitignore");
  }
}

// ── IDE Bridge Files ──────────────────────────────────────
// Each AI IDE reads rules from a different location.
// We generate bridge files that point each IDE at .agent/
async function generateIDEBridges(targetDir, agentDest, dryRun = false, tokenOptimized = false) {
  const rulesFile = path.join(agentDest, "rules", "GEMINI.md");
  let rulesContent = "";
  try {
    rulesContent = await fs.promises.readFile(rulesFile, "utf8");
  } catch {
    // rules file doesn't exist
  }

  let rulesToInject = rulesContent;
  if (tokenOptimized) {
    rulesToInject = `---
trigger: always_on
---

# Tribunal Kit — Token-Optimized Mode

You are running under Tribunal Kit in token-optimized mode. To minimize prompt token usage by 85% and avoid context poisoning:

1. **Get Sparse Context**: Call the \`get_sparse_context\` tool on the \`tribunal-kit\` MCP server at the start of any feature build, bug fix, or refactor. Pass the active task description and files to retrieve a dynamically tailored, minified ruleset.
2. **Dynamic Rule Enforcements**: Follow all rules returned by the MCP context tool. Do NOT load full raw markdown files from \`.agent/\` to prevent context bloat.
3. **Verify Precedents**: Search historical rejections using \`search_case_law\` before editing code.

## Critical Core Constraints
- Parameterize all SQL queries.
- Keep secrets in environment variables.
- Run tests with \`npm test\` after any changes.
`;
  }

  // Helper: write a bridge file or merge it if it exists
  const writeBridge = async (filePath, content, label, isJson = false) => {
    if (dryRun) {
      dbg(`  would create/update: ${filePath}`);
      return;
    }
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });

    try {
      const existingContent = await fs.promises.readFile(filePath, "utf8");
      if (isJson) {
        try {
          const existingData = JSON.parse(existingContent);
          const newData = JSON.parse(content);

          if (!existingData.rules) existingData.rules = [];
          const rulePath = newData.rules[0].path;
          
          // Clear both standard and optimized paths to prevent duplicates/stale paths
          existingData.rules = existingData.rules.filter(
            (r) => r.path !== "GEMINI.md" && r.path !== "../.agent/rules/GEMINI.md"
          );
          existingData.rules.push(newData.rules[0]);

          existingData.agents = { ...existingData.agents, ...newData.agents };
          existingData.skills = { ...existingData.skills, ...newData.skills };
          existingData.workflows = {
            ...existingData.workflows,
            ...newData.workflows,
          };

          await fs.promises.writeFile(
            filePath,
            JSON.stringify(existingData, null, 2) + "\n",
            "utf8",
          );
          ok(
            `${label} (merged) → ${c("gray", path.relative(targetDir, filePath))}`,
          );
        } catch (e) {
          warn(`Failed to merge ${label}: ${e.message}`);
        }
      } else {
        if (
          !existingContent.includes("Tribunal Kit") &&
          (!rulesToInject ||
            !existingContent.includes(rulesToInject.slice(0, 50)))
        ) {
          await fs.promises.appendFile(filePath, "\n" + content, "utf8");
          ok(
            `${label} (appended) → ${c("gray", path.relative(targetDir, filePath))}`,
          );
        } else {
          dbg(`  skip (rules exist): ${path.basename(filePath)}`);
        }
      }
    } catch (err) {
      if (err.code === "ENOENT") {
        await fs.promises.writeFile(filePath, content, "utf8");
        ok(`${label} → ${c("gray", path.relative(targetDir, filePath))}`);
      }
    }
  };

  // ── 1. Cursor (.cursorrules) ──────────────────────────
  const cursorRules = `# Tribunal Kit — Cursor Bridge
# Auto-generated by tribunal-kit init. Do not edit manually.
# Source: .agent/rules/GEMINI.md (Optimized)

${rulesToInject}
`;
  await writeBridge(
    path.join(targetDir, ".cursorrules"),
    cursorRules,
    "Cursor",
  );

  // ── 2. Windsurf (.windsurfrules) ─────────────────────
  const windsurfRules = `# Tribunal Kit — Windsurf Bridge
# Auto-generated by tribunal-kit init. Do not edit manually.
# Source: .agent/rules/GEMINI.md (Optimized)

${rulesToInject}
`;
  await writeBridge(
    path.join(targetDir, ".windsurfrules"),
    windsurfRules,
    "Windsurf",
  );

  // ── 3. Gemini / Antigravity (.gemini/settings.json) ──
  const geminiRulesPath = tokenOptimized ? "GEMINI.md" : "../.agent/rules/GEMINI.md";
  const geminiSettings =
    JSON.stringify(
      {
        rules: [{ path: geminiRulesPath, trigger: "always_on" }],
        agents: { directory: "../.agent/agents" },
        skills: { directory: "../.agent/skills" },
        workflows: { directory: "../.agent/workflows" },
      },
      null,
      2,
    ) + "\n";
  await writeBridge(
    path.join(targetDir, ".gemini", "settings.json"),
    geminiSettings,
    "Gemini/Antigravity",
    true,
  );

  // ── Also create .gemini/GEMINI.md as a direct rules file ──
  const geminiRulesBridge = `---
trigger: always_on
---

# Tribunal Kit — Gemini Bridge
# Auto-generated by tribunal-kit init.
# Full rules: .agent/rules/GEMINI.md

${rulesToInject}
`;
  await writeBridge(
    path.join(targetDir, ".gemini", "GEMINI.md"),
    geminiRulesBridge,
    "Gemini rules",
  );

  // ── 4. GitHub Copilot (.github/copilot-instructions.md) ──
  const copilotInstructions = `# Tribunal Kit — Copilot Bridge
# Auto-generated by tribunal-kit init. Do not edit manually.
# Source: .agent/rules/GEMINI.md (Optimized)

${rulesToInject}
`;
  await writeBridge(
    path.join(targetDir, ".github", "copilot-instructions.md"),
    copilotInstructions,
    "GitHub Copilot",
  );

  // ── 5. Claude (.claude/CLAUDE.md) ─────────────────────
  const claudeRules = `# Tribunal Kit — Claude Bridge
# Auto-generated by tribunal-kit init. Do not edit manually.
# Source: .agent/rules/GEMINI.md (Optimized)

${rulesToInject}
`;
  await writeBridge(
    path.join(targetDir, ".claude", "CLAUDE.md"),
    claudeRules,
    "Claude",
  );

  console.log();
}

async function cmdSync() {
  console.log(`\n╭─ ${c("bold", "Tribunal IDE Sync")} ──────────────────`);
  console.log("│");
  console.log(`│  ${c("gray", "✦ Regenerating IDE bridge files...")}`);
  const cwd = process.cwd();
  const agentDest = path.join(cwd, ".agent");
  if (!fs.existsSync(agentDest)) {
    console.error(`│  ${c("red", "✖ Error: .agent/ directory not found.")}`);
    console.error(`│  ${c("gray", "Run `tk init` first.")}`);
    process.exit(1);
  }
  await generateIDEBridges(cwd, agentDest, false);
  console.log(`│  ${c("green", "✔ Sync complete.")}`);
  console.log("╰────────────────────────────────────────\n");
}

async function cmdUpdate(flags) {
  // ── Self-install guard (early, before banner) ───────────
  const targetDir = flags.path ? path.resolve(flags.path) : process.cwd();
  if (isSelfInstall(targetDir)) {
    err("Cannot run update inside the tribunal-kit package itself.");
    err(`Target: ${targetDir}`);
    console.log();
    dim("This command is designed to update .agent/ in OTHER projects.");
    dim("Run it from the root of the project you want to update:");
    dim("  cd /path/to/your-project");
    dim("  npx tribunal-kit update");
    console.log();
    process.exit(1);
  }
  // ────────────────────────────────────────────────────────

  // Update = init with --force
  flags.force = true;
  if (!quiet) {
    log(
      `  ${c("cyan", "↻")} ${bold("Updating")} ${c("white", ".agent/")} to latest version...`,
    );
    console.log();
  }
  await cmdInit(flags);
}

async function cmdLearn(flags) {
  const targetDir = flags.path ? path.resolve(flags.path) : process.cwd();
  const agentDest = path.join(targetDir, ".agent");

  if (!fs.existsSync(agentDest)) {
    err(".agent/ not found. Run: npx tribunal-kit init");
    process.exit(1);
  }

  banner();

  const W = 62;
  const title = "  Tribunal Learn — Supreme Court Mode";
  const trail = " ".repeat(Math.max(0, W - title.length));
  console.log(`  ${c("cyan", "\u2554" + "\u2550".repeat(W) + "\u2557")}`);
  console.log(
    `  ${c("cyan", "\u2551")}${c("bold", c("white", title))}${trail}${c("cyan", "\u2551")}`,
  );
  console.log(`  ${c("cyan", "\u255a" + "\u2550".repeat(W) + "\u255d")}`);
  console.log();

  const evoArgs = ["digest"];
  if (flags.dryRun) evoArgs.push("--dry-run");
  if (flags.head) evoArgs.push("--head");

  // Phase 1: Skill Evolution
  log(
    `  ${c("cyan", "\u229b")} ${bold("Phase 1")} \u2014 Skill Evolution Forge (auto-generating project idioms)`,
  );
  const evoScript = path.join(agentDest, "scripts", "skill_evolution.js");
  if (!fs.existsSync(evoScript)) {
    warn("skill_evolution.js not found \u2014 run: npx tribunal-kit update");
  } else {
    try {
      await runScriptAsync(evoScript, evoArgs, { cwd: targetDir });
    } catch (e) {
      warn(`Skill Evolution error: ${e.message}`);
    }
  }

  console.log();

  // Phase 2: Case Law prompt
  log(
    `  ${c("cyan", "\u229b")} ${bold("Phase 2")} \u2014 Case Law Engine (building precedence record)`,
  );
  console.log();
  log(`  ${c("gray", "\u25b8")} Record a new rejection precedent:`);
  log(`    ${c("white", "npx tribunal-kit case add")}`);
  console.log();
  log(`  ${c("gray", "\u25b8")} Search existing case law:`);
  log(`    ${c("white", 'npx tribunal-kit case search "your query"')}`);
  console.log();
  log(
    `  ${c("green", "\u2714")} ${bold("Learn cycle complete.")} Your Tribunal grows smarter with every commit.`,
  );
  console.log();
}

// ── Async Main Wrapper ───────────────────────────────────
async function runWithUpdateCheck(command, flags) {
  const shouldSkip =
    flags.skipUpdateCheck || process.env.TK_SKIP_UPDATE_CHECK === "1";

  if (!shouldSkip && (command === "init" || command === "update")) {
    // Pass through the original args (minus the node/script path)
    const originalArgs = process.argv.slice(2);
    const didReInvoke = await autoUpdateCheck(originalArgs);
    if (didReInvoke) {
      process.exit(0); // Latest version handled it
    }
  }

  // Proceed with current version
  switch (command) {
    case "init":
      await cmdInit(flags);
      break;
    case "update":
      await cmdUpdate(flags);
      break;
    case "status":
      cmdStatus(flags);
      break;
    case "learn":
      await cmdLearn(flags);
      break;
    case "case":
      await cmdCase(flags);
      break;
    case "hook":
      cmdHook(flags);
      break;
    case "graph":
      await cmdGraph(flags);
      break;
    case "mutate":
      await cmdMutate(flags);
      break;
    case "context":
      cmdContext(flags);
      break;
    case "sync":
      await cmdSync();
      break;
    case "marathon":
      await cmdMarathon(flags);
      break;
    case "uninstall":
      cmdUninstall(flags);
      break;
    case "help":
    case "--help":
    case "-h":
    case null:
      cmdHelp();
      break;
    default:
      err(`Unknown command: "${command}"`);
      console.log();
      dim("Run tribunal-kit --help for usage");
      process.exit(1);
  }
}

async function cmdCase(flags) {
  const targetDir = flags.path ? path.resolve(flags.path) : process.cwd();
  const agentDest = path.join(targetDir, ".agent");

  if (!fs.existsSync(agentDest)) {
    err(".agent/ not found. Run: npx tribunal-kit init");
    process.exit(1);
  }

  const args = process.argv.slice(3);
  if (
    args.length === 0 ||
    args[0] === "help" ||
    args[0] === "--help" ||
    args[0] === "-h"
  ) {
    banner();
    log(`  ${c("cyan", "\u2554" + "\u2550".repeat(60) + "\u2557")}`);
    log(
      `  ${c("cyan", "\u2551")}${c("bold", c("white", "  Tribunal Case Law Engine \u2014 Supreme Court             "))}${c("cyan", "\u2551")}`,
    );
    log(`  ${c("cyan", "\u255a" + "\u2550".repeat(60) + "\u255d")}`);
    console.log();
    log(
      `  ${c("cyan", "add".padEnd(10))}  ${c("gray", "Record a new Case Law rejection pattern")}`,
    );
    log(
      `  ${c("cyan", "search".padEnd(10))}  ${c("gray", 'Search existing cases (e.g., search "query")')}`,
    );
    log(
      `  ${c("cyan", "list".padEnd(10))}  ${c("gray", "List all recorded case law")}`,
    );
    log(
      `  ${c("cyan", "show".padEnd(10))}  ${c("gray", "Show full diff for a case (e.g., show --id 1)")}`,
    );
    log(
      `  ${c("cyan", "stats".padEnd(10))}  ${c("gray", "Show case law stats by domain/verdict")}`,
    );
    log(
      `  ${c("cyan", "export".padEnd(10))}  ${c("gray", "Export all cases to Markdown")}`,
    );
    log(
      `  ${c("cyan", "overrule".padEnd(10))}  ${c("gray", "Overrule a past precedent (e.g., overrule --id 1)")}`,
    );
    console.log();
    process.exit(1);
  }

  const caseLawScript = path.join(agentDest, "scripts", "case_law_manager.js");

  // Make shorthand aliases for the subcommand (first arg only)
  const caseArgs = [...args];
  if (caseArgs[0] === "add") caseArgs[0] = "add-case";
  if (caseArgs[0] === "search") caseArgs[0] = "search-cases";

  try {
    await runScriptAsync(caseLawScript, caseArgs, { cwd: targetDir });
  } catch {
    process.exit(1); // Script already prints errors
  }
}

async function cmdGraph(flags) {
  const targetDir = flags.path ? path.resolve(flags.path) : process.cwd();
  const agentDest = path.join(targetDir, ".agent");

  if (!fs.existsSync(agentDest)) {
    err(".agent/ not found. Run: npx tribunal-kit init");
    process.exit(1);
  }

  banner();
  const builderScript = path.join(agentDest, "scripts", "graph_builder.js");
  const visualizerScript = path.join(
    agentDest,
    "scripts",
    "graph_visualizer.js",
  );
  const htmlFile = path.join(
    agentDest,
    "history",
    "architecture-explorer.html",
  );

  try {
    await runScriptAsync(builderScript, [], { cwd: targetDir });
    await runScriptAsync(visualizerScript, [], { cwd: targetDir });

    log(`  ${c("cyan", "▸")} Opening visualizer in browser...`);
    // Open browser safely without shell interpolation
    const { opener, openerArgs } = (() => {
      if (process.platform === "win32")
        return { opener: "cmd", openerArgs: ["/c", "start", "", htmlFile] };
      if (process.platform === "darwin")
        return { opener: "open", openerArgs: [htmlFile] };
      return { opener: "xdg-open", openerArgs: [htmlFile] };
    })();
    spawn(opener, openerArgs, { stdio: "ignore", detached: true }).unref();
  } catch (e) {
    err(`Graph generation failed: ${e.message}`);
    process.exit(1);
  }
}

function cmdHook(flags) {
  const targetDir = flags.path ? path.resolve(flags.path) : process.cwd();
  const gitDir = path.join(targetDir, ".git");

  if (!fs.existsSync(gitDir)) {
    err("Not a git repository. Cannot install git hooks here.");
    process.exit(1);
  }

  const hooksDir = path.join(gitDir, "hooks");
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  const prePushPath = path.join(hooksDir, "pre-push");
  const hookScript = `#!/bin/sh\n# Supreme Court - Auto Learn on Push\necho "⚖️  Tribunal Supreme Court: Evolving Skills..."\nnpx tribunal-kit learn --head\necho "✦ Synchronizing IDE bridges..."\nnpx tribunal-kit sync\n`;

  fs.writeFileSync(prePushPath, hookScript, { mode: 0o755 });

  console.log();
  log(`  ${c("green", "✔")} Installed pre-push git hook.`);
  log(
    `  ${c("gray", "▸")} Skill Evolution and IDE Sync will now run automatically every time you git push.`,
  );
  console.log();
}

async function cmdMutate(flags) {
  const targetDir = flags.path ? path.resolve(flags.path) : process.cwd();
  const agentDest = path.join(targetDir, ".agent");

  if (!fs.existsSync(agentDest)) {
    err(".agent/ not found. Run: npx tribunal-kit init");
    process.exit(1);
  }

  const args = process.argv.slice(3);
  if (args.length < 2) {
    err("Usage: npx tribunal-kit mutate <target_file> <test_command>");
    process.exit(1);
  }

  const mutateScript = path.join(agentDest, "scripts", "mutation_runner.js");
  try {
    await runScriptAsync(mutateScript, args, { cwd: targetDir });
  } catch {
    process.exit(1);
  }
}

function cmdUninstall(flags) {
  const targetDir = flags.path ? path.resolve(flags.path) : process.cwd();
  const agentDest = path.join(targetDir, ".agent");

  banner();

  if (!fs.existsSync(agentDest)) {
    log(
      `  ${c("yellow", "⚠")} ${bold(".agent/")} is not installed in this project.`,
    );
    console.log();
    return;
  }

  if (flags.dryRun) {
    log(colorize("yellow", "  DRY RUN — would remove:"));
    log(`  ${c("gray", "  ╰─")} ${agentDest}`);
    console.log();
    return;
  }

  try {
    fs.rmSync(agentDest, { recursive: true, force: true });
    log(
      `  ${c("green", "✔")} ${bold(".agent/")} has been removed from this project.`,
    );
    console.log();
    log(
      `  ${c("gray", "▸")} To reinstall: ${c("cyan", "npx tribunal-kit init")}`,
    );
    console.log();
  } catch (e) {
    err(`Failed to remove .agent/: ${e.message}`);
    process.exit(1);
  }
}

function cmdStatus(flags) {
  const targetDir = flags.path ? path.resolve(flags.path) : process.cwd();
  const agentDest = path.join(targetDir, ".agent");

  banner();

  if (!fs.existsSync(agentDest)) {
    log(`  ${c("red", "✖")} ${bold("Not installed")} in this project`);
    console.log();
    log(`  ${c("gray", "Run:")} ${c("cyan", "npx tribunal-kit init")}`);
    console.log();
    return;
  }

  log(
    `  ${c("green", "✔")} ${bold(c("green", "Installed"))}  ${c("gray", "→")}  ${c("gray", agentDest)}`,
  );
  console.log();

  const icons = { agents: "🤖", workflows: "⚡", skills: "🧠", scripts: "🔧" };
  const colors = {
    agents: "magenta",
    workflows: "yellow",
    skills: "blue",
    scripts: "green",
  };
  const subdirs = ["agents", "workflows", "skills", "scripts"];
  for (const sub of subdirs) {
    const subPath = path.join(agentDest, sub);
    if (fs.existsSync(subPath)) {
      const count = fs
        .readdirSync(subPath)
        .filter(
          (f) => !fs.statSync(path.join(subPath, f)).isDirectory(),
        ).length;
      log(
        `  ${icons[sub]}  ${c(colors[sub], sub.padEnd(12))}${c("white", String(count).padStart(3))} files`,
      );
    }
  }
  console.log();
}

function cmdHelp() {
  banner();
  const cmd = (name, desc) =>
    `  ${c("cyan", name.padEnd(10))}  ${c("gray", desc)}`;
  const opt = (flag, desc) =>
    `  ${c("yellow", flag.padEnd(22))}  ${c("gray", desc)}`;
  const ex = (s) => `  ${c("gray", "▸")} ${c("white", s)}`;

  log(bold("  Commands"));
  log(`  ${c("gray", "─".repeat(40))}`);
  log(cmd("init", "Install .agent/ into current project"));
  log(cmd("update", "Re-install to get latest version"));
  log(cmd("status", "Check if .agent/ is installed"));
  log(cmd("learn", "Evolve project idioms based on git diffs"));
  log(
    cmd(
      "case",
      "Manage Case Law precedents (add, search, list, show, stats, overrule)",
    ),
  );
  log(cmd("graph", "Build and visualize the architecture graph"));
  log(cmd("mutate", "Run the Mutation Engine to test test-suite reliability"));
  log(
    cmd("context", "Retrieve a highly-optimized Context Snapshot for a file"),
  );
  log(cmd("sync", "Synchronize IDE bridge files with current rules"));
  log(cmd("marathon", "Long-running agent harness (init, status, next, mark)"));
  log(cmd("hook", "Install pre-push git hook for auto-learning"));
  log(cmd("uninstall", "Remove .agent/ folder from project"));
  console.log();
  log(bold("  Options"));
  log(`  ${c("gray", "─".repeat(40))}`);
  log(opt("--force", "Overwrite existing .agent/ folder"));
  log(opt("--path <dir>", "Install in specific directory"));
  log(opt("--quiet", "Suppress all output"));
  log(opt("--verbose", "Show detailed debug logging"));
  log(opt("--dry-run", "Preview actions without executing"));
  log(opt("--minimal", "Install core agents/skills only (~13 agents)"));
  log(opt("--skip-update-check", "Skip auto-update version check"));
  log(opt("--head", "(learn) Diff against last commit instead of staged"));
  console.log();
  log(bold("  Aliases"));
  log(`  ${c("gray", "─".repeat(40))}`);
  log(
    `  ${c("cyan", "tk")}  ${c("gray", "Shorthand for tribunal-kit (e.g., tk init, tk status)")}`,
  );
  console.log();
  log(bold("  Examples"));
  log(`  ${c("gray", "─".repeat(40))}`);
  log(ex("npx tribunal-kit init"));
  log(ex("tk init --force"));
  log(ex("tk init --path ./my-app"));
  log(ex("npx tribunal-kit init --dry-run"));
  log(ex("tk update"));
  log(ex("tk status"));
  log(ex("tk learn"));
  log(ex("tk learn --dry-run"));
  log(ex("tk learn --head"));
  log(ex("tk case add"));
  log(ex('tk case search "useEffect"'));
  log(ex("tk case list"));
  log(ex("tk case show --id 1"));
  log(ex("tk case stats"));
  log(ex("tk case export"));
  log(ex("tk case overrule --id 1"));
  log(ex("tk graph"));
  log(ex('tk mutate src/utils.js "npm test"'));
  log(ex('tk marathon init "Build a todo app"'));
  log(ex("tk marathon status"));
  log(ex("tk marathon next"));
  log(ex("tk marathon mark 5 pass"));
  log(ex("tk hook"));
  log(ex("tk uninstall"));
  console.log();
}

async function cmdMarathon(flags) {
  const targetDir = flags.path ? path.resolve(flags.path) : process.cwd();
  const agentDest = path.join(targetDir, ".agent");

  if (!fs.existsSync(agentDest)) {
    err(".agent/ not found. Run: npx tribunal-kit init");
    process.exit(1);
  }

  const args = process.argv.slice(3);
  if (
    args.length === 0 ||
    args[0] === "help" ||
    args[0] === "--help" ||
    args[0] === "-h"
  ) {
    banner();
    log(`  ${c("cyan", "╔" + "═".repeat(60) + "╗")}`);
    log(
      `  ${c("cyan", "║")}${c("bold", c("white", "  Marathon — Long-Running Agent Harness                  "))}${c("cyan", "║")}`,
    );
    log(`  ${c("cyan", "╚" + "═".repeat(60) + "╝")}`);
    console.log();
    log(
      `  ${c("cyan", "init".padEnd(16))}  ${c("gray", 'Start a new marathon (init "spec")')}`,
    );
    log(
      `  ${c("cyan", "status".padEnd(16))}  ${c("gray", "Show progress dashboard")}`,
    );
    log(
      `  ${c("cyan", "next".padEnd(16))}  ${c("gray", "Show next unfinished feature")}`,
    );
    log(
      `  ${c("cyan", "mark".padEnd(16))}  ${c("gray", "Mark feature pass/fail (mark <id> pass)")}`,
    );
    log(
      `  ${c("cyan", "log".padEnd(16))}  ${c("gray", "Add a progress note")}`,
    );
    log(
      `  ${c("cyan", "session-start".padEnd(16))}  ${c("gray", "Begin a new work session")}`,
    );
    log(
      `  ${c("cyan", "session-end".padEnd(16))}  ${c("gray", "End session with summary")}`,
    );
    log(
      `  ${c("cyan", "add-feature".padEnd(16))}  ${c("gray", 'Add feature: "category" "desc" "step1" ...')}`,
    );
    log(
      `  ${c("cyan", "reset".padEnd(16))}  ${c("gray", "Archive and start fresh")}`,
    );
    console.log();
    return;
  }

  const marathonScript = path.join(agentDest, "scripts", "marathon_harness.js");
  try {
    await runScriptAsync(marathonScript, args, { cwd: targetDir });
  } catch {
    process.exit(1);
  }
}

function cmdContext(flags) {
  const targetDir = flags.path ? path.resolve(flags.path) : process.cwd();
  const agentDest = path.join(targetDir, ".agent");

  if (!fs.existsSync(agentDest)) {
    err(".agent/ not found. Run: npx tribunal-kit init");
    process.exit(1);
  }

  const args = process.argv.slice(3);
  if (args.length === 0 || args[0] === "help" || args[0] === "--help") {
    console.error("Usage: npx tribunal-kit context <target_file>");
    process.exit(1);
  }

  const targetFile = args[0].replace(/\\/g, "/");
  const snapshotName = targetFile.replace(/[\\\/]/g, "__") + ".json";
  const snapshotPath = require("path").join(
    agentDest,
    "history",
    "snapshots",
    snapshotName,
  );

  if (!require("fs").existsSync(snapshotPath)) {
    console.error(
      "  \x1b[91m✖\x1b[0m Context Snapshot not found for: " + targetFile,
    );
    console.log("    Run: npx tribunal-kit graph  (to generate snapshots)");
    process.exit(1);
  }

  try {
    const snapshot = JSON.parse(
      require("fs").readFileSync(snapshotPath, "utf8"),
    );

    console.log("\n# Context Snapshot: " + snapshot.file);
    process.stdout.write(
      "> Size Estimate: " + (snapshot["estimatedTokens"] || "Unknown") + "\n",
    );
    console.log(
      "> Risk Score: " +
        snapshot.riskScore +
        " (Blast Radius: " +
        snapshot.blastRadius +
        ")\n",
    );

    if (Object.keys(snapshot.imports).length > 0) {
      console.log("## Imports");
      for (const [imp, exports] of Object.entries(snapshot.imports)) {
        if (exports && exports.length > 0) {
          console.log("- `" + imp + "` (exports: " + exports.join(", ") + ")");
        } else {
          console.log("- `" + imp + "`");
        }
      }
      console.log();
    }

    if (snapshot.dependents && snapshot.dependents.length > 0) {
      console.log("## Dependents");
      for (const dep of snapshot.dependents) {
        console.log("- `" + dep + "`");
      }
      console.log();
    }

    console.log("## Source Code");
    console.log("```javascript\n" + snapshot.content + "\n```\n");
  } catch (e) {
    console.error("Failed to read snapshot: " + e.message);
    process.exit(1);
  }
}

// ── Main ──────────────────────────────────────────────────
if (require.main === module) {
  const { command, flags } = parseArgs(process.argv);

  if (flags.quiet) quiet = true;
  if (flags.verbose) verbose = true;

  runWithUpdateCheck(command, flags);
}

// -- Exports (for testing) -- do not remove
if (require.main !== module) {
  module.exports = {
    parseArgs,
    compareSemver,
    copyDir,
    countDir,
    isSelfInstall,
    CORE_AGENTS,
    CORE_SKILLS,
    generateIDEBridges,
    cmdMarathon,
  };
}
