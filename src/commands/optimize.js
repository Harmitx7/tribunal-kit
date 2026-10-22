'use strict';
const __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.cmdOptimizeSkill = cmdOptimizeSkill;

const fs = __importDefault(require('fs'));
const path = __importDefault(require('path'));
const os = __importDefault(require('os'));
const https = __importDefault(require('https'));
const { execFileSync, spawnSync } = require('child_process');
const logger = require('../utils/logger');
const helpers = require('../utils/helpers');
const { WorktreeSandbox } = require('../evaluation/worktree_sandbox');
const {
  createEvolutionProposal,
  saveEvolutionProposal,
  approveEvolutionProposal,
} = require('../evolution/engine');
const {
  recordRejection,
  loadRejections,
  formatNegativeConstraints,
  isPreviouslyRejected,
} = require('../evolution/negative_memory');
const { parseCommandLine } = require('../evolution/coevolution_orchestrator');

function shouldRunInShell(cmd) {
  if (process.platform !== 'win32') return false;
  const lower = (cmd || '').toLowerCase();
  return lower === 'npm' || lower === 'npx' || lower.endsWith('.cmd') || lower.endsWith('.bat');
}

// ── LLM Helpers ──────────────────────────────────────────────────────────────
function detectLlmProvider() {
  if (process.env.ANTHROPIC_API_KEY)
    return { provider: 'anthropic', key: process.env.ANTHROPIC_API_KEY };
  if (process.env.OPENAI_API_KEY) return { provider: 'openai', key: process.env.OPENAI_API_KEY };
  if (process.env.GEMINI_API_KEY) return { provider: 'gemini', key: process.env.GEMINI_API_KEY };
  return null;
}

function httpsPost(hostname, apiPath, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      {
        method: 'POST',
        hostname,
        path: apiPath,
        headers: { ...headers, 'Content-Length': Buffer.byteLength(data) },
      },
      res => {
        let raw = '';
        res.on('data', c => {
          raw += c;
        });
        res.on('end', () => resolve(raw));
        res.on('error', reject);
      },
    );
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error('LLM API timeout'));
    });
    req.write(data);
    req.end();
  });
}

async function callLlmApi(prompt, provider, apiKey) {
  try {
    if (provider === 'anthropic') {
      const raw = await httpsPost(
        'api.anthropic.com',
        '/v1/messages',
        {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        {
          model: 'claude-3-5-sonnet-latest',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        },
      );
      const json = JSON.parse(raw);
      return json?.content?.[0]?.text ?? null;
    }

    if (provider === 'openai') {
      const raw = await httpsPost(
        'api.openai.com',
        '/v1/chat/completions',
        {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        {
          model: 'gpt-4o-mini',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
        },
      );
      const json = JSON.parse(raw);
      return json?.choices?.[0]?.message?.content ?? null;
    }

    if (provider === 'gemini') {
      const raw = await httpsPost(
        'generativelanguage.googleapis.com',
        `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        { 'Content-Type': 'application/json' },
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1024, temperature: 0.1 },
        },
      );
      const json = JSON.parse(raw);
      return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    }
  } catch (e) {
    logger.err(`LLM API Call failed: ${e.message}`);
    return null;
  }
  return null;
}

// ── Core Binary Resolver ─────────────────────────────────────────────────────
function getCoreBinaryPath(targetDir) {
  const isWindows = os.default.platform() === 'win32';
  const ext = isWindows ? '.exe' : '';

  // Dev build target checks
  const devPath = path.default.resolve(targetDir, 'target', 'release', `tribunal-core${ext}`);
  if (fs.default.existsSync(devPath)) return devPath;

  const debugPath = path.default.resolve(targetDir, 'target', 'debug', `tribunal-core${ext}`);
  if (fs.default.existsSync(debugPath)) return debugPath;

  // Production npm package checks
  const pkgName = `@tribunal-kit/core-${os.default.platform()}-${os.default.arch()}`;
  try {
    const pkgPath = require.resolve(`${pkgName}/package.json`);
    const binPath = path.default.resolve(path.default.dirname(pkgPath), `bin/tribunal-core${ext}`);
    if (fs.default.existsSync(binPath)) return binPath;
  } catch {}

  return null;
}

// ── Main Optimizer Command ───────────────────────────────────────────────────
async function cmdOptimizeSkill(flags, processArgs, quiet = false) {
  const targetDir = flags.path ? path.default.resolve(flags.path) : process.cwd();
  const agentDest = path.default.join(targetDir, '.agent');

  if (!fs.default.existsSync(agentDest)) {
    logger.err('.agent/ not found. Run: npx tribunal-kit init');
    process.exit(1);
  }

  helpers.banner(quiet);

  // Detect LLM Credentials
  const llm = detectLlmProvider();
  if (!llm) {
    logger.err(
      'No LLM API Key detected in environment. Please set GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY.',
    );
    process.exit(1);
  }

  // Resolve Core Binary
  const binPath = getCoreBinaryPath(targetDir);
  if (!binPath) {
    logger.err(
      "tribunal-core binary not found. Run 'cargo build --release' or install the core package.",
    );
    process.exit(1);
  }

  // Parse loop parameters
  const skillName = flags.target || 'project-idioms';
  const skillPath = path.default.join(agentDest, 'skills', skillName, 'SKILL.md');

  if (!fs.default.existsSync(skillPath)) {
    logger.err(`Target skill file not found: ${skillPath}`);
    process.exit(1);
  }

  // Find the harness command
  const positionalArgs = processArgs.slice(3).filter(arg => !arg.startsWith('--'));
  if (positionalArgs.length === 0) {
    logger.err(
      'Harness command is required. Usage: tk optimize-skill --target <skill-name> "<harness-command>"',
    );
    process.exit(1);
  }
  const harnessCmd = positionalArgs[0];

  const epochs = Number(flags.epochs) || 4;
  const editBudget = Number(flags.budget) || 4;

  logger.log(
    `  ${logger.c('cyan', '⊘')} Starting SkillOpt loop for skill: ${logger.bold(skillName)}`,
  );
  logger.log(`  ${logger.c('cyan', '⊘')} Harness: "${logger.bold(harnessCmd)}"`);
  logger.log(`  ${logger.c('cyan', '⊘')} Provider: ${logger.bold(llm.provider)}`);
  console.log();

  let bestScore = 0.0;
  let bestFitness = 0.0;
  let currentSkillText = fs.default.readFileSync(skillPath, 'utf8');
  let stagedProposal = null;

  let sandbox = null;
  let runDir = targetDir;
  let runSkillPath = skillPath;

  const useSandbox = flags.sandbox === true || (flags.sandbox !== false && !flags['no-sandbox']);

  if (useSandbox) {
    logger.log(`  ${logger.c('cyan', '⊘')} Initializing ephemeral WorktreeSandbox...`);
    sandbox = new WorktreeSandbox({ repoRoot: targetDir });
    await sandbox.create();
    runDir = sandbox.worktreePath;
    runSkillPath = path.default.join(runDir, '.agent', 'skills', skillName, 'SKILL.md');
    logger.log(`  ${logger.c('green', '✔')} Sandbox active: ${logger.bold(sandbox.branch)}`);
  }

  try {
    for (let epoch = 1; epoch <= epochs; epoch++) {
      logger.log(`  ${logger.c('cyan', '▶')} ${logger.bold(`Epoch ${epoch}/${epochs}`)}`);

      // 1. Run Rollout Harness
      logger.log(`    ${logger.c('gray', '●')} Running rollout batch execution...`);
      let rolloutLogs = '';
      let rolloutSuccess = true;
      try {
        const args = parseCommandLine(harnessCmd);
        if (args.length > 0) {
          const cmd = args.shift();
          rolloutLogs = execFileSync(cmd, args, { encoding: 'utf8', cwd: runDir, stdio: 'pipe', shell: shouldRunInShell(cmd) });
        }
      } catch (e) {
        rolloutLogs = (e.stdout || '') + '\n' + (e.stderr || '') + '\n' + (e.message || '');
        rolloutSuccess = false;
      }

      logger.log(
        `    ${logger.c('gray', '●')} Rollout score: ${rolloutSuccess ? logger.c('green', '1.0') : logger.c('red', '0.0')}`,
      );

      // Load past rejections for negative constraints
      const rejections = loadRejections(agentDest, skillName);
      const negativePrompt = formatNegativeConstraints(rejections, 5);

      // 2. Call LLM for Patch Proposals
      logger.log(`    ${logger.c('gray', '●')} Requesting optimizer reflections from LLM...`);
      const reflectionPrompt = `
You are a SkillOpt text-space optimizer coach.
Analyze the following rollout run logs and current skill document, then propose bounded add/delete/replace/insert_after edits.
The goal is to fix failure patterns and make the procedural memory rules clearer and more robust.

Current Skill Content:
"""
${currentSkillText}
"""

Rollout Logs:
${rolloutLogs.slice(-4000)}

${negativePrompt ? `${negativePrompt}\n` : ''}
Output ONLY a JSON array containing proposed edits. No markdown formatting, no explanation.
Each edit must follow this schema:
[
  {
    "op": "append" | "insert_after" | "replace" | "delete",
    "target": "<exact text match to replace/insert_after/delete, leave null for append>",
    "content": "<exact markdown/rules to add, replace, or insert>",
    "support_count": 1,
    "source_type": "${rolloutSuccess ? 'success' : 'failure'}"
  }
]
`;

      const llmResponse = await callLlmApi(reflectionPrompt, llm.provider, llm.key);
      if (!llmResponse) {
        logger.warn('    ⚠️ LLM returned empty response. Skipping epoch step.');
        continue;
      }

      // Clean LLM JSON response from markdown wrappers if present
      let cleanedJson = llmResponse.trim();
      if (cleanedJson.startsWith('```json')) {
        cleanedJson = cleanedJson
          .replace(/^```json/, '')
          .replace(/```$/, '')
          .trim();
      } else if (cleanedJson.startsWith('```')) {
        cleanedJson = cleanedJson.replace(/^```/, '').replace(/```$/, '').trim();
      }

      let parsedEdits = [];
      try {
        parsedEdits = JSON.parse(cleanedJson);
        if (!Array.isArray(parsedEdits)) parsedEdits = [parsedEdits];
      } catch {
        logger.warn('    ⚠️ Failed to parse LLM edits as JSON. Skipping epoch step.');
        continue;
      }

      // Filter against Negative CBR Memory to suppress oscillation
      const validEdits = [];
      for (const edit of parsedEdits) {
        const rejCheck = isPreviouslyRejected(edit, rejections);
        if (rejCheck.rejected) {
          logger.warn(
            `    ⚠️ Oscillation suppressed: proposed edit previously rejected (${rejCheck.matchType} match - ${rejCheck.reason}).`,
          );
        } else {
          validEdits.push(edit);
        }
      }

      if (validEdits.length === 0) {
        logger.log(
          `    ${logger.c('yellow', '●')} All candidate edits were filtered by Negative Memory.`,
        );
        continue;
      }

      const filteredJson = JSON.stringify(validEdits);

      // 3. Invoke Rust binary for optimizing step
      logger.log(`    ${logger.c('gray', '●')} Merging and applying bounded edits via Rust Core...`);
      let optResultStr = '';
      try {
        const tempFile = path.default.join(os.default.tmpdir(), `edits-${Date.now()}.json`);
        fs.default.writeFileSync(tempFile, filteredJson, 'utf8');

        const result = spawnSync(
          binPath,
          [
            'optimize-step',
            '--skill-path',
            runSkillPath,
            '--edits-json',
            filteredJson,
            '--budget',
            String(editBudget),
          ],
          { encoding: 'utf8', cwd: runDir, stdio: 'pipe' },
        );

        if (result.error) {
          throw result.error;
        }
        optResultStr = result.stdout || '';

        try {
          fs.default.unlinkSync(tempFile);
        } catch {}
      } catch (e) {
        logger.err(`    ✖ Rust Core optimization failed: ${e.message}`);
        continue;
      }

      let optReport;
      try {
        optReport = JSON.parse(optResultStr.trim());
      } catch {
        logger.err('    ✖ Failed to parse optimizer report from Rust Core.');
        continue;
      }

      if (optReport.applied_count === 0) {
        logger.log(
          `    ${logger.c('yellow', '●')} No edits applied (deduplicated or target not found).`,
        );
        continue;
      }

      logger.log(`    ${logger.c('green', '●')} Applied ${optReport.applied_count} edits to skill.`);

      // 4. Run Validation Harness
      logger.log(
        `    ${logger.c('gray', '●')} Evaluating candidate skill against validation split...`,
      );
      let valSuccess = true;
      try {
        const args = parseCommandLine(harnessCmd);
        if (args.length > 0) {
          const cmd = args.shift();
          execFileSync(cmd, args, { encoding: 'utf8', cwd: runDir, stdio: 'pipe', shell: shouldRunInShell(cmd) });
        }
      } catch {
        valSuccess = false;
      }

      const candidateScore = valSuccess ? 1.0 : 0.0;
      const finalFitness =
        typeof optReport.final_fitness === 'number' ? optReport.final_fitness : 0.0;

      // 5. Multi-Objective Validation Gate
      const scoreImproved =
        candidateScore > bestScore || (candidateScore === 1.0 && bestScore === 0.0);
      const fitnessAcceptable = finalFitness >= bestFitness;

      if (scoreImproved && fitnessAcceptable) {
        logger.ok(
          `    ✔ Gate Accepted! Score: ${logger.c('green', String(candidateScore))} | Fitness: ${logger.c('green', finalFitness.toFixed(3))}`,
        );
        bestScore = candidateScore;
        bestFitness = finalFitness;
        currentSkillText = fs.default.readFileSync(runSkillPath, 'utf8');

        // Create and persist certified EvolutionProposal
        const relSkillPath = path.default.relative(agentDest, skillPath).replace(/\\/g, '/');
        const proposal = createEvolutionProposal({
          target: 'skill-instructions',
          currentBehavior: `Skill ${skillName} prior to epoch ${epoch} optimization`,
          observedEvidence: `Harness "${harnessCmd}" passed with score ${candidateScore.toFixed(2)} and composite fitness ${finalFitness.toFixed(3)}`,
          proposedChange: currentSkillText,
          expectedEffect: `Optimized procedural instructions for ${skillName} (${optReport.applied_count} edits applied)`,
          risk: 'LOW',
          testsRequired: [harnessCmd],
          regressionRequirements: ['Existing regression tests continue to pass'],
          evidenceType: 'DETERMINISTIC_TELEMETRY',
          targetFile: relSkillPath,
        });

        try {
          saveEvolutionProposal(proposal, agentDest, { throwOnDuplicate: false });
          stagedProposal = proposal;
        } catch (err) {
          logger.warn(`    ⚠️ Failed to save evolution proposal: ${err.message}`);
        }
      } else {
        const rejectReason = !scoreImproved
          ? `Score (${candidateScore}) <= Best (${bestScore})`
          : `Fitness (${finalFitness.toFixed(3)}) < Best (${bestFitness.toFixed(3)})`;
        logger.warn(`    ⚠️ Gate Rejected. ${rejectReason}. Reverting edits.`);
        fs.default.writeFileSync(runSkillPath, currentSkillText, 'utf8');

        // Record rejection in Negative CBR Memory
        recordRejection(agentDest, skillName, epoch, validEdits, rejectReason);
      }
      console.log();
    }

    if (bestScore > 0 && stagedProposal) {
      if (flags.autoPromote) {
        approveEvolutionProposal(stagedProposal.proposal_id, 'AutoPromote CI Gate', agentDest);
        fs.default.writeFileSync(skillPath, currentSkillText, 'utf8');
        logger.ok(`  ${logger.c('green', '✔')} Auto-promoted certified skill to ${skillPath}`);
      } else {
        logger.log(
          `  ${logger.c('yellow', '⚡')} Evolution proposal staged: ${logger.bold(stagedProposal.proposal_id)}`,
        );
        logger.log(
          `  ${logger.c('gray', '●')} Human Gate active: Workspace skill unchanged. To approve and apply:`,
        );
        logger.log(
          `    ${logger.c('white', `npx tribunal-kit learn --approve ${stagedProposal.proposal_id}`)}`,
        );
      }
    }
  } finally {
    if (sandbox) {
      await sandbox.destroy();
      logger.log(`  ${logger.c('gray', '●')} Ephemeral WorktreeSandbox cleaned up.`);
    }
  }

  logger.ok(
    `🎉 SkillOpt training complete. Best validation score: ${logger.c('green', String(bestScore))}`,
  );
  console.log();
}
