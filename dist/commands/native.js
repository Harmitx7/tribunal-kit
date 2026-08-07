"use strict";

const fs = require("fs");

function getOption(args, names) {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    for (const name of names) {
      if (arg === name) return args[index + 1] || null;
      if (arg.startsWith(`${name}=`)) return arg.slice(name.length + 1);
    }
  }
  return null;
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
  return false;
}

function parseMaxLines(value) {
  if (value === null) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function cmdMinContext(processArgs, quiet = false) {
  const args = processArgs.slice(3);
  const file = getOption(args, ["--file", "-f"]);
  const maxLines = parseMaxLines(getOption(args, ["--max-lines"]));
  if (!file) return fail("Usage: tk min-context --file <path> [--max-lines <count>]");
  if (maxLines === undefined) return fail("--max-lines must be a non-negative integer.");

  let content;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch (error) {
    return fail(`Failed to read file: ${error.message}`);
  }

  const originalLines = content.split(/\r?\n/).length;
  let lines = content.split(/\r?\n/).map((line) => line.trimEnd()).filter((line) => line.trim());
  if (maxLines !== null) lines = lines.slice(0, maxLines);
  const result = {
    file,
    original_lines: originalLines,
    minified_lines: lines.length,
    lines_reduced: Math.max(0, originalLines - lines.length),
    minified: lines.join("\n"),
  };
  if (!quiet) console.error(`✓ Minified ${file}`);
  console.log(JSON.stringify(result));
  return true;
}

function cmdDagSchedule(processArgs, quiet = false) {
  const args = processArgs.slice(3);
  const rawTasks = getOption(args, ["--tasks", "-t"]);
  if (!rawTasks) return fail("Usage: tk dag-schedule --tasks '<json-array>'");

  let tasks;
  try {
    tasks = JSON.parse(rawTasks);
  } catch (error) {
    return fail(`Failed to parse task JSON: ${error.message}`);
  }
  if (!Array.isArray(tasks) || tasks.some((task) => !task || typeof task.id !== "string" || !task.id)) {
    return fail("Each task must be an object with a non-empty id.");
  }

  const ids = new Set(tasks.map((task) => task.id));
  const inDegree = new Map(tasks.map((task) => [task.id, 0]));
  const dependents = new Map(tasks.map((task) => [task.id, []]));
  for (const task of tasks) {
    const dependencies = Array.isArray(task.dependencies) ? task.dependencies : [];
    for (const dependency of dependencies) {
      if (ids.has(dependency)) {
        dependents.get(dependency).push(task.id);
        inDegree.set(task.id, inDegree.get(task.id) + 1);
      }
    }
  }

  const waves = [];
  let wave = [...inDegree.entries()].filter(([, degree]) => degree === 0).map(([id]) => id).sort();
  let processed = 0;
  while (wave.length > 0) {
    waves.push(wave);
    processed += wave.length;
    const next = [];
    for (const id of wave) {
      for (const dependent of dependents.get(id)) {
        const nextDegree = inDegree.get(dependent) - 1;
        inDegree.set(dependent, nextDegree);
        if (nextDegree === 0) next.push(dependent);
      }
    }
    wave = [...new Set(next)].sort();
  }

  const result = {
    success: processed === tasks.length,
    total_tasks: tasks.length,
    total_waves: waves.length,
    waves,
    is_cyclic: processed < tasks.length,
  };
  if (!quiet && result.is_cyclic) console.error("⚠ Dependency cycle detected.");
  console.log(JSON.stringify(result));
  return result.success;
}

function cmdContextCompress(processArgs, quiet = false) {
  const args = processArgs.slice(3);
  const file = getOption(args, ["--file", "-f"]);
  const maxLines = parseMaxLines(getOption(args, ["--max-lines"]));
  if (!file) return fail("Usage: tk context-compress --file <path> [--max-lines <count>]");
  if (maxLines === undefined) return fail("--max-lines must be a non-negative integer.");

  let content;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch (error) {
    return fail(`Failed to read file: ${error.message}`);
  }

  const codeFile = /\.(?:js|ts|rs|json)$/i.test(file);
  let lines = content.split(/\r?\n/).filter((line) => {
    const trimmed = line.trim();
    return trimmed && (!codeFile || !trimmed.startsWith("//") || trimmed.includes("// VERIFY"));
  });
  if (maxLines !== null && lines.length > maxLines) {
    const omitted = lines.length - maxLines;
    lines = lines.slice(0, maxLines);
    lines.push(`// ... [Truncated ${omitted} lines for agent context optimization]`);
  }
  const compressedContent = lines.join("\n");
  const originalBytes = Buffer.byteLength(content);
  const compressedBytes = Buffer.byteLength(compressedContent);
  const result = {
    success: true,
    original_bytes: originalBytes,
    compressed_bytes: compressedBytes,
    compression_ratio: originalBytes === 0 ? 1 : 1 - compressedBytes / originalBytes,
    compressed_content: compressedContent,
  };
  if (!quiet) console.error(`✓ Compressed ${file}`);
  console.log(JSON.stringify(result));
  return true;
}

function cmdOptimizeStep(processArgs, quiet = false) {
  const args = processArgs.slice(3);
  const skillPath = getOption(args, ["--skill-path"]);
  const rawEdits = getOption(args, ["--edits-json"]);
  const parsedBudget = parseMaxLines(getOption(args, ["--budget"]));
  const budget = parsedBudget ?? 4;
  if (!skillPath || !rawEdits) return fail("Usage: tk optimize-step --skill-path <path> --edits-json '<json-array>' [--budget <count>]");
  if (parsedBudget === undefined) return fail("--budget must be a non-negative integer.");

  let edits;
  try {
    edits = JSON.parse(rawEdits);
  } catch (error) {
    return fail(`Failed to parse edits JSON: ${error.message}`);
  }
  if (!Array.isArray(edits)) return fail("--edits-json must be a JSON array.");

  let text = fs.existsSync(skillPath) ? fs.readFileSync(skillPath, "utf8") : "";
  const protectedStart = text.indexOf("<!-- SLOW_UPDATE_START -->");
  const protectedEnd = text.indexOf("<!-- SLOW_UPDATE_END -->");
  const isProtected = (position) => protectedStart !== -1 && protectedEnd !== -1 && position >= protectedStart && position < protectedEnd;
  const reports = [];
  let appliedCount = 0;
  const ranked = [...edits].sort((left, right) => {
    const leftFailure = left.source_type === "failure" ? 1 : 0;
    const rightFailure = right.source_type === "failure" ? 1 : 0;
    return rightFailure - leftFailure || (right.support_count || 1) - (left.support_count || 1);
  }).slice(0, budget);

  for (const edit of ranked) {
    const operation = edit && edit.op;
    const target = edit && edit.target;
    const replacement = edit && edit.content;
    if (operation === "append" && typeof replacement === "string") {
      if (text.includes(replacement.trim())) reports.push("skip: append duplicate content");
      else {
        text = `${text}${text && !text.endsWith("\n") ? "\n" : ""}${replacement}\n`;
        appliedCount += 1;
        reports.push("applied: append content");
      }
    } else if (["delete", "replace", "insert_after"].includes(operation) && typeof target === "string") {
      const position = text.indexOf(target);
      if (position === -1) reports.push(`skip: ${operation} target not found`);
      else if (isProtected(position)) reports.push(`skip: ${operation} target is inside protected region`);
      else if (operation === "delete") {
        text = text.replace(target, "");
        appliedCount += 1;
        reports.push("applied: deleted target");
      } else if (typeof replacement !== "string") reports.push(`skip: ${operation} content missing`);
      else if (operation === "replace") {
        text = text.replace(target, replacement);
        appliedCount += 1;
        reports.push("applied: replaced target");
      } else {
        const before = text.slice(0, position + target.length);
        const after = text.slice(position + target.length);
        text = `${before}${replacement.startsWith("\n") ? "" : "\n"}${replacement}${replacement.endsWith("\n") ? "" : "\n"}${after}`;
        appliedCount += 1;
        reports.push("applied: inserted content after target");
      }
    } else reports.push(`skip: unknown or invalid operation ${String(operation)}`);
  }

  if (appliedCount > 0) fs.writeFileSync(skillPath, text, "utf8");
  const result = { success: true, applied_count: appliedCount, reports };
  if (!quiet) console.error(`✓ Applied ${appliedCount} bounded SkillOpt edit(s)`);
  console.log(JSON.stringify(result));
  return true;
}
function cmdImpactTier(processArgs, quiet = false) {
  const args = processArgs.slice(3);
  const files = getOption(args, ["--files"]) || "";
  const lines = parseInt(getOption(args, ["--lines"]) || "0", 10);
  const task = getOption(args, ["--task"]) || "";

  const fileList = files ? files.split(",").map(f => f.trim()).filter(Boolean) : [];
  const fileCount = fileList.length;

  // Tier classification heuristics (mirrors Rust ImpactTier logic)
  let tier = 0;
  if (fileCount === 0 && lines <= 5) tier = 0;
  else if (fileCount <= 1 && lines <= 50) tier = 1;
  else if (fileCount <= 5 && lines <= 200) tier = 2;
  else tier = 3;

  // Check for high-risk patterns that force Tier 3
  const highRiskPatterns = /\b(auth|migration|schema|security|password|token|jwt|rbac|permissions)\b/i;
  const highRiskExtensions = /\.(sql|prisma|tf|tofu)$/i;
  if (highRiskPatterns.test(task) || fileList.some(f => highRiskExtensions.test(f))) {
    tier = Math.max(tier, 3);
  }

  const tierNames = ["Fast-Pass", "Express Pass", "Targeted Audit", "Full Gauntlet"];
  const result = {
    tier,
    tier_name: tierNames[tier],
    file_count: fileCount,
    line_count: lines,
    socratic_gate: tier >= 3 ? "required" : tier >= 2 ? "conditional" : "bypass",
  };
  if (!quiet) console.error(`✓ Impact Tier: ${tier} (${tierNames[tier]})`);
  console.log(JSON.stringify(result));
  return true;
}

module.exports = {
  cmdMinContext,
  cmdDagSchedule,
  cmdContextCompress,
  cmdOptimizeStep,
  cmdImpactTier,
};
