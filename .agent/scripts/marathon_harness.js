#!/usr/bin/env node
/**
 * marathon_harness.js — Long-Running Agent Harness for Tribunal Kit
 * ═══════════════════════════════════════════════════════════════════
 * Manages feature decomposition, progress tracking, and session handoffs
 * for multi-session agent workflows.
 *
 * Inspired by: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
 *
 * Usage:
 *   node .agent/scripts/marathon_harness.js init "Build a clone of claude.ai"
 *   node .agent/scripts/marathon_harness.js status
 *   node .agent/scripts/marathon_harness.js next
 *   node .agent/scripts/marathon_harness.js mark <id> pass|fail
 *   node .agent/scripts/marathon_harness.js log "Completed auth flow"
 *   node .agent/scripts/marathon_harness.js session-start
 *   node .agent/scripts/marathon_harness.js session-end "Summary of work done"
 *   node .agent/scripts/marathon_harness.js reset
 *   node .agent/scripts/marathon_harness.js add-feature "category" "description" "step1" "step2" ...
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const {
  GREEN,
  YELLOW,
  CYAN,
  RED,
  MAGENTA,
  BOLD,
  DIM,
  RESET,
  BOX,
  banner,
  ok,
  warn,
  info,
} = require("./_colors");

// ── Paths ────────────────────────────────────────────────────────────────────
const MARATHON_DIR = path.resolve(".agent", "history", "marathon");
const FEATURE_LIST_FILE = path.join(MARATHON_DIR, "feature_list.json");
const PROGRESS_FILE = path.join(MARATHON_DIR, "progress.json");
const ARCHIVE_DIR = path.join(MARATHON_DIR, "archive");

const VALID_COMMANDS = new Set([
  "init",
  "status",
  "next",
  "mark",
  "log",
  "session-start",
  "session-end",
  "reset",
  "add-feature",
  "distill",
]);

// ── Schema Defaults ──────────────────────────────────────────────────────────

/**
 * Create an empty feature list structure.
 * @param {string} spec - The original user specification
 * @returns {object}
 */
function createFeatureList(spec) {
  return {
    spec,
    createdAt: new Date().toISOString(),
    totalFeatures: 0,
    features: [],
  };
}

/**
 * Create an empty progress structure.
 * @param {string} spec - The original user specification
 * @returns {object}
 */
function createProgress(spec) {
  return {
    spec,
    startedAt: new Date().toISOString(),
    totalSessions: 0,
    sessions: [],
    log: [],
  };
}

// ── File I/O ─────────────────────────────────────────────────────────────────

/**
 * Read and parse a JSON file with schema validation.
 * @param {string} filePath
 * @returns {object|null}
 */
function readJSON(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content);
  } catch (e) {
    console.error(
      `${RED}Error reading ${path.basename(filePath)}: ${e.message}${RESET}`,
    );
    return null;
  }
}

/**
 * Write an object to a JSON file with pretty formatting.
 * @param {string} filePath
 * @param {object} data
 */
function writeJSON(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Ensure the marathon directory exists.
 */
function ensureDir() {
  fs.mkdirSync(MARATHON_DIR, { recursive: true });
}

/**
 * Check if a marathon is currently active.
 * @returns {boolean}
 */
function isActive() {
  return fs.existsSync(FEATURE_LIST_FILE) && fs.existsSync(PROGRESS_FILE);
}

// ── Git Helpers ──────────────────────────────────────────────────────────────

/**
 * Get recent git log entries.
 * @param {number} count
 * @returns {string[]}
 */
function getGitLog(count = 20) {
  try {
    const output = execSync(`git log --oneline -${count}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return output.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Get current git branch name.
 * @returns {string}
 */
function getGitBranch() {
  try {
    return execSync("git branch --show-current", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return "unknown";
  }
}

// ── Progress Helpers ─────────────────────────────────────────────────────────

/**
 * Count passing features and blocked features.
 * @param {object} featureList
 * @returns {{ total: number, passing: number, failing: number, blocked: number }}
 */
function countFeatures(featureList) {
  const features = featureList.features || [];
  const total = features.length;
  const passing = features.filter((f) => f.passes === true).length;
  let blocked = 0;

  features.forEach((f) => {
    if (!f.passes && f.dependencies && f.dependencies.length > 0) {
      const allPassed = f.dependencies.every((depId) => {
        const dep = features.find((d) => d.id === depId);
        return dep && dep.passes === true;
      });
      if (!allPassed) blocked++;
    }
  });

  return { total, passing, failing: total - passing, blocked };
}

/**
 * Get the next unfinished, unblocked feature.
 * @param {object} featureList
 * @returns {object|null}
 */
function getNextFeature(featureList) {
  const features = featureList.features || [];
  return (
    features.find((f) => {
      if (f.passes === true) return false;

      // Check dependencies (DAG)
      if (f.dependencies && f.dependencies.length > 0) {
        const allPassed = f.dependencies.every((depId) => {
          const dep = features.find((d) => d.id === depId);
          return dep && dep.passes === true;
        });
        if (!allPassed) return false; // Feature is blocked
      }

      return true;
    }) || null
  );
}

/**
 * Build a progress bar string.
 * @param {number} current
 * @param {number} total
 * @param {number} width
 * @returns {string}
 */
function progressBar(current, total, width = 30) {
  if (total === 0) return `${DIM}[${"░".repeat(width)}]${RESET} 0%`;
  const pct = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * width);
  const empty = width - filled;

  let color = RED;
  if (pct >= 75) color = GREEN;
  else if (pct >= 40) color = YELLOW;
  else if (pct >= 15) color = CYAN;

  return `${color}[${"█".repeat(filled)}${"░".repeat(empty)}]${RESET} ${BOLD}${pct}%${RESET}`;
}

// ── Commands ─────────────────────────────────────────────────────────────────

/**
 * Initialize a new marathon.
 * @param {string} spec
 */
function cmdInit(spec) {
  if (isActive()) {
    console.error(`${RED}❌ A marathon is already active.${RESET}`);
    console.error(
      `   Use ${CYAN}reset${RESET} to archive it first, or ${CYAN}status${RESET} to view progress.`,
    );
    process.exit(1);
  }

  if (!spec) {
    console.error(
      `${RED}❌ Spec required. Usage: marathon_harness.js init "Build a todo app"${RESET}`,
    );
    process.exit(1);
  }

  ensureDir();

  const featureList = createFeatureList(spec);
  const progress = createProgress(spec);

  writeJSON(FEATURE_LIST_FILE, featureList);
  writeJSON(PROGRESS_FILE, progress);

  console.log(banner("marathon_harness.js", { Mode: "INIT" }));
  console.log();
  ok(`Marathon initialized for: ${BOLD}${spec}${RESET}`);
  console.log();
  info("Next steps for the agent:");
  console.log(
    `  ${DIM}1.${RESET} Decompose the spec into 30-200 atomic features`,
  );
  console.log(
    `  ${DIM}2.${RESET} Add each feature with: ${CYAN}add-feature "category" "description" "step1" "step2" ...${RESET}`,
  );
  console.log(
    `  ${DIM}3.${RESET} Make an initial git commit: ${CYAN}git commit -m "marathon: initial scaffold"${RESET}`,
  );
  console.log(
    `  ${DIM}4.${RESET} Start the first session: ${CYAN}session-start${RESET}`,
  );
  console.log();
  console.log(`  ${DIM}State directory: ${MARATHON_DIR}${RESET}`);
  console.log();
}

/**
 * Add a feature to the feature list.
 * @param {string} category
 * @param {string} description
 * @param {string[]} steps
 * @param {number[]} deps
 */
function cmdAddFeature(category, description, steps, deps = []) {
  if (!isActive()) {
    console.error(
      `${RED}❌ No active marathon. Run ${CYAN}init${RED} first.${RESET}`,
    );
    process.exit(1);
  }

  if (!category || !description) {
    console.error(
      `${RED}❌ Usage: add-feature "category" "description" "step1" "step2" ...${RESET}`,
    );
    process.exit(1);
  }

  const featureList = readJSON(FEATURE_LIST_FILE);
  if (!featureList) process.exit(1);

  const newId =
    featureList.features.length > 0
      ? Math.max(...featureList.features.map((f) => f.id)) + 1
      : 1;

  const feature = {
    id: newId,
    category: category.toLowerCase(),
    description,
    steps: steps.length > 0 ? steps : ["Implement and verify"],
    dependencies: deps,
    attempts: 0,
    failureReasons: [],
    passes: false,
    sessionCompleted: null,
  };

  featureList.features.push(feature);
  featureList.totalFeatures = featureList.features.length;

  writeJSON(FEATURE_LIST_FILE, featureList);

  console.log(
    `  ${GREEN}+${RESET} Feature ${BOLD}#${newId}${RESET} [${MAGENTA}${category}${RESET}]: ${description}`,
  );
}

/**
 * Show the marathon status dashboard.
 */
function cmdStatus() {
  if (!isActive()) {
    console.log(
      `${YELLOW}No active marathon.${RESET} Start one with: ${CYAN}marathon_harness.js init "spec"${RESET}`,
    );
    return;
  }

  const featureList = readJSON(FEATURE_LIST_FILE);
  const progress = readJSON(PROGRESS_FILE);
  if (!featureList || !progress) return;

  const { total, passing, blocked } = countFeatures(featureList);
  const nextFeature = getNextFeature(featureList);
  const sessions = progress.sessions || [];
  const lastSession = sessions[sessions.length - 1] || null;

  console.log(banner("marathon_harness.js", { Mode: "STATUS" }));
  console.log();

  // ── Spec ──
  console.log(`  ${BOLD}Spec:${RESET} ${featureList.spec}`);
  console.log(`  ${DIM}Started: ${featureList.createdAt.slice(0, 16)}${RESET}`);
  console.log();

  // ── Progress Bar ──
  const blockedInfo =
    blocked > 0 ? ` (${YELLOW}${blocked} blocked${RESET})` : "";
  console.log(
    `  ${BOLD}Progress:${RESET} ${progressBar(passing, total)}  ${GREEN}${passing}${RESET}/${total} features${blockedInfo}`,
  );
  console.log();

  // ── Category Breakdown ──
  const categories = {};
  for (const f of featureList.features) {
    const cat = f.category || "uncategorized";
    if (!categories[cat]) categories[cat] = { total: 0, passing: 0 };
    categories[cat].total++;
    if (f.passes) categories[cat].passing++;
  }

  if (Object.keys(categories).length > 0) {
    console.log(`  ${BOLD}By Category:${RESET}`);
    for (const [cat, counts] of Object.entries(categories)) {
      const catPct =
        counts.total > 0
          ? Math.round((counts.passing / counts.total) * 100)
          : 0;
      const catColor = catPct === 100 ? GREEN : catPct >= 50 ? YELLOW : RED;
      console.log(
        `    ${MAGENTA}${cat.padEnd(18)}${RESET} ${catColor}${counts.passing}/${counts.total}${RESET} (${catPct}%)`,
      );
    }
    console.log();
  }

  // ── Sessions ──
  console.log(`  ${BOLD}Sessions:${RESET} ${sessions.length} completed`);
  if (lastSession) {
    console.log(
      `    ${DIM}Last session:${RESET} #${lastSession.session} — ${lastSession.endedAt?.slice(0, 16) || "in progress"}`,
    );
    if (lastSession.notes) {
      console.log(`    ${DIM}Notes:${RESET} ${lastSession.notes.slice(0, 80)}`);
    }
    if (lastSession.featuresAtEnd) {
      const delta =
        lastSession.featuresAtEnd.passing -
        (lastSession.featuresAtStart?.passing || 0);
      console.log(
        `    ${DIM}Features completed:${RESET} ${GREEN}+${delta}${RESET}`,
      );
    }
  }
  console.log();

  // ── Next Feature ──
  if (nextFeature) {
    console.log(
      `  ${BOLD}Next Feature:${RESET} ${CYAN}#${nextFeature.id}${RESET} [${MAGENTA}${nextFeature.category}${RESET}]`,
    );
    console.log(`    ${nextFeature.description}`);
    if (nextFeature.steps && nextFeature.steps.length > 0) {
      console.log(`    ${DIM}Steps:${RESET}`);
      for (const step of nextFeature.steps) {
        console.log(`      ${DIM}${BOX.bulletEmpty}${RESET} ${step}`);
      }
    }
  } else if (total > 0) {
    console.log(
      `  ${GREEN}${BOLD}🎉 All ${total} features are passing!${RESET}`,
    );
  }
  console.log();

  // ── Git ──
  const branch = getGitBranch();
  const recentCommits = getGitLog(5);
  if (recentCommits.length > 0) {
    console.log(`  ${BOLD}Git:${RESET} ${DIM}branch: ${branch}${RESET}`);
    for (const commit of recentCommits.slice(0, 3)) {
      console.log(`    ${DIM}${commit}${RESET}`);
    }
  }
  console.log();
}

/**
 * Show the next unfinished feature.
 */
function cmdNext() {
  if (!isActive()) {
    console.error(`${RED}❌ No active marathon.${RESET}`);
    process.exit(1);
  }

  const featureList = readJSON(FEATURE_LIST_FILE);
  if (!featureList) process.exit(1);

  const { total, passing } = countFeatures(featureList);
  const nextFeature = getNextFeature(featureList);

  if (!nextFeature) {
    if (passing === total) {
      console.log(
        `${GREEN}${BOLD}🎉 All ${total} features are passing! Marathon complete.${RESET}`,
      );
    } else {
      console.log(
        `${RED}${BOLD}⚠️ Deadlock detected: ${total - passing} features remain, but all are blocked by failing dependencies.${RESET}`,
      );
      console.log(
        `   ${DIM}Check 'status' and use 'mark <id> pass' to resolve dependencies.${RESET}`,
      );
    }
    return;
  }

  console.log(
    `\n  ${BOLD}Progress:${RESET} ${progressBar(passing, total)}  ${GREEN}${passing}${RESET}/${total}`,
  );
  console.log();
  console.log(
    `  ${BOLD}Next Feature:${RESET} ${CYAN}#${nextFeature.id}${RESET} [${MAGENTA}${nextFeature.category}${RESET}]`,
  );
  console.log(`  ${nextFeature.description}`);
  console.log();

  if (nextFeature.steps && nextFeature.steps.length > 0) {
    console.log(`  ${BOLD}Steps:${RESET}`);
    for (const step of nextFeature.steps) {
      console.log(`    ${BOX.bulletEmpty} ${step}`);
    }
    console.log();
  }

  if (nextFeature.failureReasons && nextFeature.failureReasons.length > 0) {
    console.log(
      `  ${RED}${BOLD}Previous Failures (${nextFeature.attempts} attempts):${RESET}`,
    );
    for (const reason of nextFeature.failureReasons) {
      console.log(`    ${DIM}* ${reason}${RESET}`);
    }
    console.log();
  }

  console.log(
    `  ${DIM}When done: marathon_harness.js mark ${nextFeature.id} pass${RESET}`,
  );
  console.log();
}

/**
 * Mark a feature as passing or failing.
 * @param {number} id
 * @param {string} verdict - 'pass' or 'fail'
 * @param {string} [reason] - Reason for failure
 */
function cmdMark(id, verdict, reason) {
  if (!isActive()) {
    console.error(`${RED}❌ No active marathon.${RESET}`);
    process.exit(1);
  }

  const validVerdicts = ["pass", "fail"];
  if (!validVerdicts.includes(verdict)) {
    console.error(
      `${RED}❌ Invalid verdict "${verdict}". Use: pass | fail${RESET}`,
    );
    process.exit(1);
  }

  const featureList = readJSON(FEATURE_LIST_FILE);
  if (!featureList) process.exit(1);

  const feature = featureList.features.find((f) => f.id === id);
  if (!feature) {
    console.error(
      `${RED}❌ Feature #${id} not found. Valid IDs: 1-${featureList.features.length}${RESET}`,
    );
    process.exit(1);
  }

  const newPasses = verdict === "pass";
  const oldPasses = feature.passes;

  // Guard: don't allow editing description or steps
  feature.passes = newPasses;
  feature.sessionCompleted = newPasses ? new Date().toISOString() : null;

  if (!newPasses) {
    feature.attempts = (feature.attempts || 0) + 1;
    if (reason) {
      if (!feature.failureReasons) feature.failureReasons = [];
      feature.failureReasons.push(`Attempt ${feature.attempts}: ${reason}`);
    }
  }

  writeJSON(FEATURE_LIST_FILE, featureList);

  const { total, passing } = countFeatures(featureList);

  if (newPasses && !oldPasses) {
    ok(`Feature #${id} marked as ${GREEN}PASSING${RESET}`);
  } else if (!newPasses && oldPasses) {
    warn(`Feature #${id} marked as ${RED}FAILING${RESET}`);
  } else {
    info(
      `Feature #${id} unchanged (already ${newPasses ? "passing" : "failing"})`,
    );
  }

  console.log(`  ${DIM}${feature.description}${RESET}`);
  console.log(
    `  ${progressBar(passing, total)}  ${GREEN}${passing}${RESET}/${total}`,
  );
  console.log();
}

/**
 * Add a timestamped log entry.
 * @param {string} message
 */
function cmdLog(message) {
  if (!isActive()) {
    console.error(`${RED}❌ No active marathon.${RESET}`);
    process.exit(1);
  }

  if (!message) {
    console.error(
      `${RED}❌ Message required. Usage: log "Your progress note"${RESET}`,
    );
    process.exit(1);
  }

  const progress = readJSON(PROGRESS_FILE);
  if (!progress) process.exit(1);

  if (!progress.log) progress.log = [];
  progress.log.push({
    timestamp: new Date().toISOString(),
    message,
  });

  writeJSON(PROGRESS_FILE, progress);
  ok(`Logged: ${message}`);
}

/**
 * Distill a lesson learned into memory context.
 * @param {string} lesson
 */
function cmdDistill(lesson) {
  if (!isActive()) {
    console.error(`${RED}❌ No active marathon.${RESET}`);
    process.exit(1);
  }

  if (!lesson) {
    console.error(
      `${RED}❌ Lesson required. Usage: distill "Your architectural lesson"${RESET}`,
    );
    process.exit(1);
  }

  ensureDir();
  const DISTILL_FILE = path.join(MARATHON_DIR, "distilled_context.md");
  const timestamp = new Date().toISOString().slice(0, 16);
  const entry = `- [${timestamp}] ${lesson}\n`;

  fs.appendFileSync(DISTILL_FILE, entry, "utf8");
  ok(`Distilled memory saved: ${lesson}`);
}

/**
 * Start a new session — reads state, shows bearings.
 */
function cmdSessionStart() {
  if (!isActive()) {
    console.error(`${RED}❌ No active marathon.${RESET}`);
    process.exit(1);
  }

  const featureList = readJSON(FEATURE_LIST_FILE);
  const progress = readJSON(PROGRESS_FILE);
  if (!featureList || !progress) process.exit(1);

  const sessionNum = progress.sessions.length + 1;
  const { total, passing } = countFeatures(featureList);
  const nextFeature = getNextFeature(featureList);

  // Record session start
  const session = {
    session: sessionNum,
    startedAt: new Date().toISOString(),
    endedAt: null,
    featuresAtStart: { total, passing },
    featuresAtEnd: null,
    featuresCompleted: [],
    notes: null,
    gitCommits: [],
  };

  progress.sessions.push(session);
  progress.totalSessions = progress.sessions.length;
  writeJSON(PROGRESS_FILE, progress);

  // Display bearings
  console.log(
    banner("marathon_harness.js", {
      Mode: "SESSION START",
      Session: `#${sessionNum}`,
    }),
  );
  console.log();

  // ── Spec ──
  console.log(`  ${BOLD}Spec:${RESET} ${featureList.spec}`);
  console.log(
    `  ${BOLD}Progress:${RESET} ${progressBar(passing, total)}  ${GREEN}${passing}${RESET}/${total}`,
  );
  console.log();

  // ── Recent git commits ──
  const commits = getGitLog(10);
  if (commits.length > 0) {
    console.log(`  ${BOLD}Recent Commits:${RESET}`);
    for (const commit of commits.slice(0, 5)) {
      console.log(`    ${DIM}${commit}${RESET}`);
    }
    console.log();
  }

  // ── Last session notes ──
  if (progress.sessions.length > 1) {
    const prev = progress.sessions[progress.sessions.length - 2];
    if (prev && prev.notes) {
      console.log(`  ${BOLD}Last Session Notes:${RESET}`);
      console.log(`    ${DIM}${prev.notes}${RESET}`);
      console.log();
    }
  }

  // ── Recent log entries ──
  const recentLogs = (progress.log || []).slice(-3);
  if (recentLogs.length > 0) {
    console.log(`  ${BOLD}Recent Log:${RESET}`);
    for (const entry of recentLogs) {
      console.log(
        `    ${DIM}${entry.timestamp.slice(0, 16)}${RESET} ${entry.message}`,
      );
    }
    console.log();
  }

  // ── Next feature ──
  if (nextFeature) {
    console.log(
      `  ${BOLD}${CYAN}▸ Next Feature:${RESET} ${CYAN}#${nextFeature.id}${RESET} [${MAGENTA}${nextFeature.category}${RESET}]`,
    );
    console.log(`    ${nextFeature.description}`);
    if (nextFeature.steps && nextFeature.steps.length > 0) {
      for (const step of nextFeature.steps) {
        console.log(`      ${DIM}${BOX.bulletEmpty}${RESET} ${step}`);
      }
    }
  } else {
    if (passing === total) {
      console.log(
        `  ${GREEN}${BOLD}🎉 All features passing! Nothing to implement.${RESET}`,
      );
    } else {
      console.log(
        `  ${RED}${BOLD}⚠️ Deadlock: ${total - passing} features are blocked by failing dependencies.${RESET}`,
      );
    }
  }
  console.log();

  // ── Recommended actions ──
  console.log(`  ${BOLD}Recommended Actions:${RESET}`);
  console.log(
    `    ${DIM}1.${RESET} Start dev server (if applicable): ${CYAN}node .agent/scripts/auto_preview.js start${RESET}`,
  );
  console.log(
    `    ${DIM}2.${RESET} Smoke test the app to verify it's not broken`,
  );
  console.log(`    ${DIM}3.${RESET} Implement the next feature shown above`);
  console.log(
    `    ${DIM}4.${RESET} Test, mark as passing, commit, then pick next feature`,
  );
  console.log();
}

/**
 * End the current session — records summary.
 * @param {string} summary
 */
function cmdSessionEnd(summary) {
  if (!isActive()) {
    console.error(`${RED}❌ No active marathon.${RESET}`);
    process.exit(1);
  }

  const featureList = readJSON(FEATURE_LIST_FILE);
  const progress = readJSON(PROGRESS_FILE);
  if (!featureList || !progress) process.exit(1);

  const sessions = progress.sessions || [];
  if (sessions.length === 0) {
    console.error(
      `${RED}❌ No active session. Run ${CYAN}session-start${RED} first.${RESET}`,
    );
    process.exit(1);
  }

  const currentSession = sessions[sessions.length - 1];
  const { total, passing } = countFeatures(featureList);

  // Calculate features completed during this session
  const startPassing = currentSession.featuresAtStart?.passing || 0;
  const completedThisSession = passing - startPassing;

  // Find which features were completed (have sessionCompleted in this session range)
  const sessionStartTime = currentSession.startedAt;
  const completedIds = featureList.features
    .filter(
      (f) =>
        f.passes &&
        f.sessionCompleted &&
        f.sessionCompleted >= sessionStartTime,
    )
    .map((f) => f.id);

  // Get git commits since session start
  let sessionCommits = [];
  try {
    const since = currentSession.startedAt;
    const output = execSync(`git log --oneline --since="${since}"`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    sessionCommits = output
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((l) => l.split(" ")[0]);
  } catch {
    // Git not available or no commits
  }

  // Update session record
  currentSession.endedAt = new Date().toISOString();
  currentSession.featuresAtEnd = { total, passing };
  currentSession.featuresCompleted = completedIds;
  currentSession.notes =
    summary ||
    `Session ${currentSession.session}: ${completedThisSession} features completed`;
  currentSession.gitCommits = sessionCommits;

  writeJSON(PROGRESS_FILE, progress);

  // Display summary
  console.log(
    banner("marathon_harness.js", {
      Mode: "SESSION END",
      Session: `#${currentSession.session}`,
    }),
  );
  console.log();

  console.log(`  ${BOLD}Session #${currentSession.session} Summary:${RESET}`);
  console.log(`    Started:  ${currentSession.startedAt.slice(0, 16)}`);
  console.log(`    Ended:    ${currentSession.endedAt.slice(0, 16)}`);
  console.log(
    `    Features: ${GREEN}+${completedThisSession}${RESET} completed (${completedIds.map((id) => `#${id}`).join(", ") || "none"})`,
  );
  console.log(`    Commits:  ${sessionCommits.length}`);
  if (summary) {
    console.log(`    Notes:    ${summary}`);
  }
  console.log();

  console.log(
    `  ${BOLD}Overall Progress:${RESET} ${progressBar(passing, total)}  ${GREEN}${passing}${RESET}/${total}`,
  );
  console.log();

  const remaining = total - passing;
  if (remaining > 0) {
    const avgPerSession =
      sessions.length > 0
        ? Math.max(1, Math.round(passing / sessions.length))
        : 1;
    const estRemaining = Math.ceil(remaining / avgPerSession);
    console.log(
      `  ${DIM}Estimated sessions remaining: ~${estRemaining} (avg ${avgPerSession} features/session)${RESET}`,
    );
  } else {
    console.log(
      `  ${GREEN}${BOLD}🎉 Marathon complete! All features passing.${RESET}`,
    );
  }
  console.log();
}

/**
 * Archive the current marathon and reset.
 */
function cmdReset() {
  if (!isActive()) {
    console.log(`${YELLOW}No active marathon to reset.${RESET}`);
    return;
  }

  const featureList = readJSON(FEATURE_LIST_FILE);
  const { total, passing } = featureList
    ? countFeatures(featureList)
    : { total: 0, passing: 0 };

  // Archive current state
  const archiveTimestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  const archivePath = path.join(ARCHIVE_DIR, archiveTimestamp);
  fs.mkdirSync(archivePath, { recursive: true });

  if (fs.existsSync(FEATURE_LIST_FILE)) {
    fs.cpSync(FEATURE_LIST_FILE, path.join(archivePath, "feature_list.json"));
  }
  if (fs.existsSync(PROGRESS_FILE)) {
    fs.cpSync(PROGRESS_FILE, path.join(archivePath, "progress.json"));
  }

  // Remove current state files
  if (fs.existsSync(FEATURE_LIST_FILE)) fs.unlinkSync(FEATURE_LIST_FILE);
  if (fs.existsSync(PROGRESS_FILE)) fs.unlinkSync(PROGRESS_FILE);

  ok(`Marathon archived to: ${archivePath}`);
  console.log(
    `  ${DIM}Progress at archive: ${passing}/${total} features passing${RESET}`,
  );
  console.log(
    `  ${DIM}Start a new marathon with: marathon_harness.js init "new spec"${RESET}`,
  );
  console.log();
}

// ── Help ─────────────────────────────────────────────────────────────────────

function showHelp() {
  console.log(banner("marathon_harness.js", { Mode: "HELP" }));
  console.log();
  console.log(`  ${BOLD}Long-Running Agent Harness${RESET}`);
  console.log(
    `  ${DIM}Tracks features, progress, and sessions for multi-session agent workflows.${RESET}`,
  );
  console.log();

  const cmd = (name, desc) =>
    console.log(`  ${CYAN}${name.padEnd(16)}${RESET} ${desc}`);

  cmd('init "spec"', "Start a new marathon with the given specification");
  cmd("status", "Show progress dashboard");
  cmd("next", "Show the next unfinished feature");
  cmd("mark <id> pass", "Mark a feature as passing");
  cmd("mark <id> fail", 'Mark a feature as failing (optional: "reason")');
  cmd('log "note"', "Add a timestamped progress note");
  cmd('distill "rule"', "Save an architectural rule or lesson to memory");
  cmd(
    "session-start",
    "Begin a new work session (reads state, shows bearings)",
  );
  cmd("session-end", "End session with optional summary");
  cmd(
    "add-feature",
    "Add a feature (supports --deps=1,2,3 for DAG dependencies)",
  );
  cmd("reset", "Archive current marathon and start fresh");
  console.log();
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);

  if (
    args.length === 0 ||
    args[0] === "help" ||
    args[0] === "--help" ||
    args[0] === "-h"
  ) {
    showHelp();
    return;
  }

  const cmd = args[0].toLowerCase();

  if (!VALID_COMMANDS.has(cmd)) {
    console.error(`${RED}Unknown command: "${cmd}"${RESET}`);
    console.error(`Valid commands: ${[...VALID_COMMANDS].sort().join(", ")}`);
    process.exit(1);
  }

  switch (cmd) {
    case "init": {
      const spec = args.slice(1).join(" ").trim();
      cmdInit(spec);
      break;
    }
    case "status":
      cmdStatus();
      break;
    case "next":
      cmdNext();
      break;
    case "mark": {
      const id = parseInt(args[1], 10);
      const verdict = (args[2] || "").toLowerCase();
      const reason = args.slice(3).join(" ").trim();
      if (isNaN(id)) {
        console.error(
          `${RED}❌ Feature ID required. Usage: mark <id> pass|fail "reason"${RESET}`,
        );
        process.exit(1);
      }
      cmdMark(id, verdict, reason);
      break;
    }
    case "log": {
      const message = args.slice(1).join(" ").trim();
      cmdLog(message);
      break;
    }
    case "session-start":
      cmdSessionStart();
      break;
    case "session-end": {
      const summary = args.slice(1).join(" ").trim() || null;
      cmdSessionEnd(summary);
      break;
    }
    case "add-feature": {
      const category = args[1] || "";
      const description = args[2] || "";
      let steps = args.slice(3);
      let deps = [];

      steps = steps.filter((step) => {
        if (step.startsWith("--deps=")) {
          deps = step
            .replace("--deps=", "")
            .split(",")
            .map(Number)
            .filter((n) => !isNaN(n));
          return false;
        }
        return true;
      });

      cmdAddFeature(category, description, steps, deps);
      break;
    }
    case "distill": {
      const lesson = args.slice(1).join(" ").trim();
      cmdDistill(lesson);
      break;
    }
    case "reset":
      cmdReset();
      break;
    default:
      showHelp();
  }
}

if (require.main === module) {
  main();
}
