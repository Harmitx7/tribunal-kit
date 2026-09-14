"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { c, err, log } = require("../utils/logger");

function getOption(args, names) {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    for (const name of names) {
      if (arg === name) return args[i + 1] || null;
      if (arg.startsWith(`${name}=`)) return arg.slice(name.length + 1);
    }
  }
  return null;
}

function findRepoRoot() {
  try {
    const gitRoot = execSync("git rev-parse --show-toplevel", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (gitRoot && fs.existsSync(gitRoot)) {
      return gitRoot;
    }
  } catch {
    // Ignore git error and fallback to directory walk
  }

  let current = process.cwd();
  while (true) {
    if (fs.existsSync(path.join(current, ".git"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}

function sddWorkspace(planFile) {
  if (!planFile) {
    throw new Error("Missing required argument: --plan <plan_file>");
  }
  const resolvedPlan = path.resolve(process.cwd(), planFile);
  if (!fs.existsSync(resolvedPlan)) {
    throw new Error(`Plan file not found: ${planFile}`);
  }

  const fileStem = path.parse(resolvedPlan).name;
  const repoRoot = findRepoRoot();
  const base = path.join(repoRoot, ".tribunal", "sdd");
  const workspace = path.join(base, fileStem);

  fs.mkdirSync(workspace, { recursive: true });

  const gitignorePath = path.join(base, ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, "*\n", "utf8");
  }

  return workspace;
}

function sddBrief(planFile, taskNum, outFile) {
  if (!planFile) throw new Error("Missing required argument: --plan <plan_file>");
  if (taskNum === null || taskNum === undefined || isNaN(taskNum)) {
    throw new Error("Missing required argument: --task <number>");
  }

  const resolvedPlan = path.resolve(process.cwd(), planFile);
  if (!fs.existsSync(resolvedPlan)) {
    throw new Error(`Plan file not found: ${planFile}`);
  }

  const content = fs.readFileSync(resolvedPlan, "utf8");
  const lines = content.split(/\r?\n/);

  let targetOut;
  if (outFile) {
    targetOut = path.resolve(process.cwd(), outFile);
  } else {
    const ws = sddWorkspace(planFile);
    targetOut = path.join(ws, `task-${taskNum}-brief.md`);
  }

  let inTargetTask = false;
  let inCodeBlock = false;
  const extractedLines = [];

  const targetPrefix = `Task ${taskNum}`;
  const targetPrefixColon = `Task ${taskNum}:`;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
    }

    if (!inCodeBlock && trimmed.startsWith("#")) {
      const headingText = trimmed.replace(/^#+\s*/, "").trim();
      if (
        headingText.startsWith(targetPrefixColon) ||
        headingText.startsWith(targetPrefix) ||
        headingText === targetPrefix
      ) {
        inTargetTask = true;
        extractedLines.push(line);
        continue;
      } else if (inTargetTask && headingText.toLowerCase().startsWith("task ")) {
        break;
      }
    }

    if (inTargetTask) {
      extractedLines.push(line);
    }
  }

  if (extractedLines.length === 0) {
    throw new Error(`Task ${taskNum} not found in ${planFile} (no heading matching 'Task ${taskNum}')`);
  }

  const briefContent = extractedLines.join("\n") + "\n";
  fs.mkdirSync(path.dirname(targetOut), { recursive: true });
  fs.writeFileSync(targetOut, briefContent, "utf8");

  return targetOut;
}

function sddDiff(planFile, base, head, outFile) {
  if (!planFile) throw new Error("Missing required argument: --plan <plan_file>");
  if (!base) throw new Error("Missing required argument: --base <revision>");
  if (!head) throw new Error("Missing required argument: --head <revision>");

  try {
    execSync(`git rev-parse --verify --quiet "${base}"`, { stdio: "ignore" });
  } catch {
    throw new Error(`Invalid BASE git revision: ${base}`);
  }

  try {
    execSync(`git rev-parse --verify --quiet "${head}"`, { stdio: "ignore" });
  } catch {
    throw new Error(`Invalid HEAD git revision: ${head}`);
  }

  let targetOut;
  if (outFile) {
    targetOut = path.resolve(process.cwd(), outFile);
  } else {
    const ws = sddWorkspace(planFile);
    const shortBase = base.length > 7 ? base.slice(0, 7) : base;
    const shortHead = head.length > 7 ? head.slice(0, 7) : head;
    targetOut = path.join(ws, `review-${shortBase}..${shortHead}.diff`);
  }

  const diffContent = execSync(`git diff "${base}..${head}"`, {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });

  fs.mkdirSync(path.dirname(targetOut), { recursive: true });
  fs.writeFileSync(targetOut, diffContent, "utf8");

  return targetOut;
}

async function cmdSdd(flags, processArgs, quiet = false) {
  const args = processArgs.slice(3);
  const subcommand = args.find((a) => !a.startsWith("-")) || "help";

  if (subcommand === "help" || subcommand === "--help" || subcommand === "-h") {
    if (!quiet) {
      log(c("cyan", "  Subagent-Driven Development (SDD) — Commands"));
      log(`  ${c("gray", "─".repeat(45))}`);
      log(`  ${c("cyan", "sdd workspace".padEnd(20))} ${c("gray", "Ensure plan-scoped workspace (.tribunal/sdd/<slug>)")}`);
      log(`  ${c("cyan", "sdd brief".padEnd(20))} ${c("gray", "Extract task brief out-of-band (--plan, --task, [--out])")}`);
      log(`  ${c("cyan", "sdd diff".padEnd(20))} ${c("gray", "Generate diff package (--plan, --base, --head, [--out])")}`);
    }
    return;
  }

  const planArg = getOption(args, ["--plan", "-p"]) || args[1];
  const outArg = getOption(args, ["--out", "-o"]);

  try {
    if (subcommand === "workspace") {
      const ws = sddWorkspace(planArg);
      if (!quiet) log(c("green", `✔ SDD Workspace: ${ws}`));
      else console.log(ws);
      return;
    }

    if (subcommand === "brief") {
      const taskRaw = getOption(args, ["--task", "-t"]);
      const taskNum = taskRaw ? parseInt(taskRaw, 10) : null;
      const briefPath = sddBrief(planArg, taskNum, outArg);
      if (!quiet) log(c("green", `✔ SDD Task Brief: ${briefPath}`));
      else console.log(briefPath);
      return;
    }

    if (subcommand === "diff") {
      const base = getOption(args, ["--base"]);
      const head = getOption(args, ["--head"]);
      const diffPath = sddDiff(planArg, base, head, outArg);
      if (!quiet) log(c("green", `✔ SDD Diff Package: ${diffPath}`));
      else console.log(diffPath);
      return;
    }

    err(`Unknown SDD subcommand: "${subcommand}"`);
    process.exit(1);
  } catch (error) {
    err(error.message);
    process.exit(1);
  }
}

module.exports = {
  cmdSdd,
  sddWorkspace,
  sddBrief,
  sddDiff,
};
