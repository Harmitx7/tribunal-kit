'use strict';

const fs = require('fs');

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
  const file = getOption(args, ['--file', '-f']);
  const maxLines = parseMaxLines(getOption(args, ['--max-lines']));
  if (!file) return fail('Usage: tk min-context --file <path> [--max-lines <count>]');
  if (maxLines === undefined) return fail('--max-lines must be a non-negative integer.');

  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch (error) {
    return fail(`Failed to read file: ${error.message}`);
  }

  const originalLines = content.split(/\r?\n/).length;
  let lines = content
    .split(/\r?\n/)
    .map(line => line.trimEnd())
    .filter(line => line.trim());
  if (maxLines !== null) lines = lines.slice(0, maxLines);
  const result = {
    file,
    original_lines: originalLines,
    minified_lines: lines.length,
    lines_reduced: Math.max(0, originalLines - lines.length),
    minified: lines.join('\n'),
  };
  if (!quiet) console.error(`✓ Minified ${file}`);
  console.log(JSON.stringify(result));
  return true;
}

function cmdDagSchedule(processArgs, quiet = false) {
  const args = processArgs.slice(3);
  const rawTasks = getOption(args, ['--tasks', '-t']);
  if (!rawTasks) return fail("Usage: tk dag-schedule --tasks '<json-array>'");

  let tasks;
  try {
    tasks = JSON.parse(rawTasks);
  } catch (error) {
    return fail(`Failed to parse task JSON: ${error.message}`);
  }
  if (
    !Array.isArray(tasks) ||
    tasks.some(task => !task || typeof task.id !== 'string' || !task.id)
  ) {
    return fail('Each task must be an object with a non-empty id.');
  }

  const ids = new Set(tasks.map(task => task.id));
  const inDegree = new Map(tasks.map(task => [task.id, 0]));
  const dependents = new Map(tasks.map(task => [task.id, []]));
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
  let wave = [...inDegree.entries()]
    .filter(([, degree]) => degree === 0)
    .map(([id]) => id)
    .sort();
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
  if (!quiet && result.is_cyclic) console.error('⚠ Dependency cycle detected.');
  console.log(JSON.stringify(result));
  return result.success;
}

function cmdContextCompress(processArgs, quiet = false) {
  const args = processArgs.slice(3);
  const file = getOption(args, ['--file', '-f']);
  const maxLines = parseMaxLines(getOption(args, ['--max-lines']));
  if (!file) return fail('Usage: tk context-compress --file <path> [--max-lines <count>]');
  if (maxLines === undefined) return fail('--max-lines must be a non-negative integer.');

  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch (error) {
    return fail(`Failed to read file: ${error.message}`);
  }

  const codeFile = /\.(?:js|ts|rs|json)$/i.test(file);
  let lines = content.split(/\r?\n/).filter(line => {
    const trimmed = line.trim();
    return trimmed && (!codeFile || !trimmed.startsWith('//') || trimmed.includes('// VERIFY'));
  });
  if (maxLines !== null && lines.length > maxLines) {
    const omitted = lines.length - maxLines;
    lines = lines.slice(0, maxLines);
    lines.push(`// ... [Truncated ${omitted} lines for agent context optimization]`);
  }
  const compressedContent = lines.join('\n');
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
  const skillPath = getOption(args, ['--skill-path']);
  const rawEdits = getOption(args, ['--edits-json']);
  const parsedBudget = parseMaxLines(getOption(args, ['--budget']));
  const budget = parsedBudget ?? 4;
  if (!skillPath || !rawEdits)
    return fail(
      "Usage: tk optimize-step --skill-path <path> --edits-json '<json-array>' [--budget <count>]",
    );
  if (parsedBudget === undefined) return fail('--budget must be a non-negative integer.');

  let edits;
  try {
    edits = JSON.parse(rawEdits);
  } catch (error) {
    return fail(`Failed to parse edits JSON: ${error.message}`);
  }
  if (!Array.isArray(edits)) return fail('--edits-json must be a JSON array.');

  let text = fs.existsSync(skillPath) ? fs.readFileSync(skillPath, 'utf8') : '';
  const protectedStart = text.indexOf('<!-- SLOW_UPDATE_START -->');
  const protectedEnd = text.indexOf('<!-- SLOW_UPDATE_END -->');
  const isProtected = position =>
    protectedStart !== -1 &&
    protectedEnd !== -1 &&
    position >= protectedStart &&
    position < protectedEnd;
  const reports = [];
  let appliedCount = 0;
  const ranked = [...edits]
    .sort((left, right) => {
      const leftFailure = left.source_type === 'failure' ? 1 : 0;
      const rightFailure = right.source_type === 'failure' ? 1 : 0;
      return rightFailure - leftFailure || (right.support_count || 1) - (left.support_count || 1);
    })
    .slice(0, budget);

  for (const edit of ranked) {
    const operation = edit && edit.op;
    const target = edit && edit.target;
    const replacement = edit && edit.content;
    if (operation === 'append' && typeof replacement === 'string') {
      if (text.includes(replacement.trim())) reports.push('skip: append duplicate content');
      else {
        text = `${text}${text && !text.endsWith('\n') ? '\n' : ''}${replacement}\n`;
        appliedCount += 1;
        reports.push('applied: append content');
      }
    } else if (
      ['delete', 'replace', 'insert_after'].includes(operation) &&
      typeof target === 'string'
    ) {
      const position = text.indexOf(target);
      if (position === -1) reports.push(`skip: ${operation} target not found`);
      else if (isProtected(position))
        reports.push(`skip: ${operation} target is inside protected region`);
      else if (operation === 'delete') {
        text = text.replace(target, '');
        appliedCount += 1;
        reports.push('applied: deleted target');
      } else if (typeof replacement !== 'string')
        reports.push(`skip: ${operation} content missing`);
      else if (operation === 'replace') {
        text = text.replace(target, replacement);
        appliedCount += 1;
        reports.push('applied: replaced target');
      } else {
        const before = text.slice(0, position + target.length);
        const after = text.slice(position + target.length);
        text = `${before}${replacement.startsWith('\n') ? '' : '\n'}${replacement}${replacement.endsWith('\n') ? '' : '\n'}${after}`;
        appliedCount += 1;
        reports.push('applied: inserted content after target');
      }
    } else reports.push(`skip: unknown or invalid operation ${String(operation)}`);
  }

  if (appliedCount > 0) fs.writeFileSync(skillPath, text, 'utf8');
  const result = { success: true, applied_count: appliedCount, reports };
  if (!quiet) console.error(`✓ Applied ${appliedCount} bounded SkillOpt edit(s)`);
  console.log(JSON.stringify(result));
  return true;
}
const HIGH_RISK_PATTERNS =
  /\b(auth(?:entication|orization)?|login|sign-in|sso|oauth|identity|roles?|access-control|permissions?|ownership|admin|secrets?|credentials?|api keys?|signing-keys?|postgres|sql|schema|migration|transaction|pools?|database|db|containers?|privileges?|deployment|network polic(?:y|ies)|tls|certificates?|ci|redis|docker|passwords?|tokens?|jwt|rbac|infrastructure|provisioning|sessions?)\b/i;
const HIGH_RISK_EXTENSIONS = /\.(sql|prisma|tf|tofu)$/i;

function resolveMonotonicImpactTier(options = {}) {
  const opts = options && typeof options === 'object' ? options : {};
  const rawFiles = opts.files;
  const files = Array.isArray(rawFiles)
    ? rawFiles.filter(Boolean)
    : typeof rawFiles === 'string' && rawFiles.length > 0
      ? rawFiles
          .split(',')
          .map(f => f.trim())
          .filter(Boolean)
      : [];
  const lines =
    typeof opts.lines === 'number' && !isNaN(opts.lines)
      ? opts.lines
      : parseInt(opts.lines, 10) || 0;
  const task = typeof opts.task === 'string' ? opts.task : '';
  const diff = typeof opts.diff === 'string' ? opts.diff : '';
  const layaTier = opts.layaTier;

  const fileCount = files.length;

  // 1. Base tier from change volume
  const isFastPass =
    fileCount <= 2 &&
    lines <= 10 &&
    files.length > 0 &&
    files.every(f => /\.(css|scss|less|md|txt|svg|png|jpg)$/i.test(f));

  let baseTier = 0;
  if (isFastPass || (fileCount === 0 && lines <= 5)) baseTier = 0;
  else if (fileCount <= 1 && lines <= 50) baseTier = 1;
  else if (fileCount <= 5 && lines <= 200) baseTier = 2;
  else baseTier = 3;

  // 2. Concrete risk evidence analysis
  const isPureDocFiles =
    fileCount > 0 &&
    files.every(f => /\.(md|txt|markdown|rst|adoc)$/i.test(f) || f.includes('docs/'));

  // Concrete secret or code patterns that make even documentation dangerous
  const secretOrExecPatterns =
    /(?:-----BEGIN [A-Z ]+KEY-----|eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+|(?:api[_-]?key|secret|password|bearer|auth[_-]?token)\s*[:=]\s*['"][^'"]{6,}['"])/i;

  const diffHasCode =
    /^\+[ \t]*(?:const|let|var|function|def|import|require|class|export|db\.|SELECT|UPDATE|DELETE|INSERT|jwt\.|auth\.)/im.test(
      diff,
    );
  const diffMatchesHighRiskCode = diffHasCode && HIGH_RISK_PATTERNS.test(diff);

  const diffHasHighRisk =
    HIGH_RISK_EXTENSIONS.test(diff) ||
    diffMatchesHighRiskCode ||
    (!isPureDocFiles && HIGH_RISK_PATTERNS.test(diff)) ||
    secretOrExecPatterns.test(diff);

  const fileHasHighRisk = files.some(
    f =>
      HIGH_RISK_EXTENSIONS.test(f) ||
      (!isPureDocFiles && HIGH_RISK_PATTERNS.test(f)) ||
      f.includes('docker') ||
      f.includes('.github/'),
  );

  let riskEvidenceTier = 0;
  if (diffHasHighRisk || fileHasHighRisk) {
    riskEvidenceTier = 3;
  } else if (!isPureDocFiles && HIGH_RISK_PATTERNS.test(task + ' ' + files.join(' '))) {
    riskEvidenceTier = 3;
  }

  // 3. Negative controls (Documentation changes)
  // A doc change remains low risk (Tier 0) UNLESS concrete high-risk implementation evidence exists in files or diff
  if (isPureDocFiles && !diffHasHighRisk && !fileHasHighRisk) {
    return 0;
  }

  // 4. Ambiguity tier: short vague tasks (<= 2 words) touching non-doc code files
  let ambiguityTier = 0;
  const wordCount = task.trim().length > 0 ? task.trim().split(/\s+/).length : 0;
  if (wordCount > 0 && wordCount <= 2 && fileCount > 0 && !isPureDocFiles) {
    ambiguityTier = 2;
  }

  // 5. Monotonic aggregation: finalTier = max(baseTier, layaTier, riskEvidenceTier, ambiguityTier)
  const candidateTiers = [baseTier, riskEvidenceTier, ambiguityTier];
  if (typeof layaTier === 'number' && !isNaN(layaTier) && layaTier >= 0 && layaTier <= 3) {
    candidateTiers.push(layaTier);
  }

  return Math.max(...candidateTiers);
}

async function cmdImpactTier(processArgs, quiet = false) {
  const args = processArgs.slice(3);
  const files = getOption(args, ['--files']) || '';
  const lines = parseInt(getOption(args, ['--lines']) || '0', 10);
  const task = getOption(args, ['--task']) || '';
  const diff = getOption(args, ['--diff']) || '';

  const fileList = files
    ? files
        .split(',')
        .map(f => f.trim())
        .filter(Boolean)
    : [];

  let layaTier = null;
  let providerUsed = null;

  // -- LAYA SYSTEM-1 INTERCEPTION --
  try {
    const { System1Provider } = require('../system1/provider');
    const provider = new System1Provider();
    if (provider.isAvailable()) {
      if (process.env.TK_VERBOSE || process.env.VERBOSE) {
        console.error(
          `\x1b[90m⚡ System-1 Laya active. Routing impact classification to local ONNX model...\x1b[0m`,
        );
      }
      layaTier = await provider.classifyImpact(fileList, task);
      providerUsed = 'laya';
    }
  } catch (err) {
    if (process.env.TK_VERBOSE || process.env.VERBOSE) {
      console.error(
        `\x1b[93m⚠ Laya System-1 failure: ${err.message}. Falling back to deterministic heuristic.\x1b[0m`,
      );
    }
  }
  // -- END LAYA INTERCEPTION --

  const finalTier = resolveMonotonicImpactTier({
    files: fileList,
    lines,
    task,
    diff,
    layaTier,
  });

  const tierNames = ['Fast-Pass', 'Express Pass', 'Targeted Audit', 'Full Gauntlet'];
  const result = {
    tier: finalTier,
    tier_name: tierNames[finalTier],
    file_count: fileList.length,
    line_count: lines,
    socratic_gate: finalTier >= 3 ? 'required' : finalTier >= 2 ? 'conditional' : 'bypass',
  };

  if (providerUsed === 'laya') {
    result._provider = 'laya';
  }

  if (!quiet) {
    const providerTag = providerUsed ? ` [${providerUsed}]` : '';
    console.error(`✓ Impact Tier: ${finalTier} (${tierNames[finalTier]})${providerTag}`);
  }
  console.log(JSON.stringify(result));
  return true;
}

module.exports = {
  cmdMinContext,
  cmdDagSchedule,
  cmdContextCompress,
  cmdOptimizeStep,
  cmdImpactTier,
  resolveMonotonicImpactTier,
  HIGH_RISK_PATTERNS,
  HIGH_RISK_EXTENSIONS,
};
