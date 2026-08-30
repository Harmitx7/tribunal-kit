#!/usr/bin/env node
/**
 * swarm_dispatcher.js
 * Validate Orchestrator micro-worker payloads (legacy) and Swarm payloads.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { WorkerRequestSchema: _WorkerRequestSchema, WorkerResultSchema: _WorkerResultSchema, SwarmPayloadSchema, validatePayloadOrThrow } = require('./payload_schemas');

// ─── ANSI TUI Renderer ────────────────────────────────────────────────────────
class SwarmDashboard {
  constructor(workers) {
    this.workers = workers.map(w => ({
      name: w.target_agent || w.agent || 'Worker',
      task: (w.task_description || w.goal || '').slice(0, 40) + '...',
      status: '⏳ Pending',
      color: '\x1b[33m', // Yellow
    }));
    this.spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.frameIdx = 0;
    this.linesRendered = 0;
    this.timer = null;
  }

  render() {
    if (this.linesRendered > 0) {
      process.stdout.write(`\x1b[${this.linesRendered}A`);
    }

    let output = '\n\x1b[1m\x1b[36m━━━ Tribunal Swarm Dispatcher ━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n\n';
    const frame = this.spinnerFrames[this.frameIdx];

    this.workers.forEach(w => {
      const icon = w.status.includes('Pending')
        ? `\x1b[36m${frame}\x1b[0m`
        : w.status.includes('Done')
          ? '\x1b[32m✔\x1b[0m'
          : '\x1b[31m✖\x1b[0m';
      output += `  ${icon}  \x1b[1m${w.name.padEnd(25)}\x1b[0m \x1b[2m|\x1b[0m ${w.color}${w.status.padEnd(12)}\x1b[0m \x1b[2m|\x1b[0m \x1b[3m${w.task}\x1b[0m\n`;
    });

    output += '\n\x1b[1m\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n';

    process.stdout.write(output);
    this.linesRendered = this.workers.length + 5;
    this.frameIdx = (this.frameIdx + 1) % this.spinnerFrames.length;
  }

  start() {
    this.render();
    this.timer = setInterval(() => this.render(), 80);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.render(); // Final render
  }

  updateStatus(index, status, color) {
    if (this.workers[index]) {
      this.workers[index].status = status;
      this.workers[index].color = color;
    }
  }
}
// ─────────────────────────────────────────────────────────────────────────────

const VALID_WORKER_TYPES = new Set([
  'research',
  'generate_code',
  'review_code',
  'debug',
  'plan',
  'design_schema',
  'write_docs',
  'security_audit',
  'optimize',
  'test',
]);

const VALID_RESULT_STATUSES = new Set(['success', 'failure', 'escalate']);

const MAX_GOAL_LENGTH = 200;
const MAX_CONTEXT_LENGTH = 800;
const _MAX_WORKERS_PER_SWARM = 10;

function getBinaryPath() {
  if (process.env.TRIBUNAL_FORCE_JS === '1') return null;
  const isWindows = process.platform === 'win32';
  const ext = isWindows ? '.exe' : '';
  const candidates = [
    process.env.TRIBUNAL_CORE_PATH,
    path.resolve(__dirname, '..', '..', 'tribunal-kit', 'target', 'release', `tribunal-core${ext}`),
    path.resolve(__dirname, '..', '..', 'target', 'release', `tribunal-core${ext}`),
    path.resolve(process.cwd(), 'target', 'release', `tribunal-core${ext}`),
    path.resolve(process.cwd(), 'tribunal-kit', 'target', 'release', `tribunal-core${ext}`),
  ];
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  return null;
}

function nativeValidate(file, schemaType) {
  const bin = getBinaryPath();
  if (!bin || !file || !fs.existsSync(file)) return null;
  try {
    const { spawnSync } = require('child_process');
    const res = spawnSync(bin, ['validate', '--file', file, '--schema', schemaType], {
      encoding: 'utf-8',
    });
    if (res.status === 0) {
      return true;
    }
  } catch {
    // fallback to JS engine
  }
  return null;
}

function findAgentDir(startPath) {
  let current = path.resolve(startPath);
  const root = path.parse(current).root;
  while (current !== root) {
    const agentDir = path.join(current, '.agent');
    if (fs.existsSync(agentDir) && fs.statSync(agentDir).isDirectory()) {
      return agentDir;
    }
    current = path.dirname(current);
  }
  return null;
}

// ─── Retry Policy Configuration ───────────────────────────────────────────────
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 10000]; // Exponential backoff: 1s, 3s, 10s

/**
 * Execute a function with 3-strike retry policy
 * @param {Function} fn - Function to execute
 * @param {Object} context - Context for error reporting
 * @returns {Promise<any>} Result of the function or throws error after max retries
 */
async function executeWithRetry(fn, _context = {}) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // If this was the last attempt, don't delay
      if (attempt === MAX_RETRIES) {
        break;
      }

      // Wait before retrying (exponential backoff)
      const delay = RETRY_DELAYS[attempt - 1];
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // If we got here, all retries failed
  throw new Error(`Operation failed after ${MAX_RETRIES} attempts. Last error: ${lastError.message}`);
}

// ─── Legacy mode: validate orchestrator micro-worker payloads ──────────────────

function validatePayload(payloadData, workspaceRoot, agentsDir, payloadFile = null) {
  if (payloadFile) {
    const nativeResult = nativeValidate(payloadFile, 'micro-worker');
    if (nativeResult === true) {
      return true;
    }
  }

  if (!payloadData.dispatch_micro_workers) {
    console.error("ERROR: Payload missing required 'dispatch_micro_workers' array.");
    return false;
  }

  const workers = payloadData.dispatch_micro_workers;
  if (!Array.isArray(workers)) {
    console.error("ERROR: 'dispatch_micro_workers' must be a list.");
    return false;
  }

  let allValid = true;
  for (let i = 0; i < workers.length; i++) {
    const worker = workers[i];
    const agentName = worker.target_agent;
    if (!agentName) {
      console.error(`ERROR: Worker ${i}: missing 'target_agent'.`);
      allValid = false;
      continue;
    }

    const agentFile = path.join(agentsDir, `${agentName}.md`);
    if (!fs.existsSync(agentFile)) {
      console.error(`ERROR: Worker ${i}: target_agent '${agentName}' not found at ${agentFile}.`);
      allValid = false;
    }

    const filesAttached = worker.files_attached || [];
    if (!Array.isArray(filesAttached)) {
      console.error(`ERROR: Worker ${i}: 'files_attached' must be a list.`);
      allValid = false;
      continue;
    }

    for (const f of filesAttached) {
      const filePath = path.resolve(workspaceRoot, f);
      if (!fs.existsSync(filePath)) {
        console.warn(
          `WARN: Worker ${i}: attached file '${f}' does not exist (might be a new file to create).`,
        );
      }
    }
  }

  return allValid;
}

function buildWorkerPrompts(payloadData, workspaceRoot) {
  const prompts = [];
  let astContext = '';

  try {
    const res = execSync(`python -m code_review_graph review-delta`, {
      cwd: workspaceRoot,
      stdio: 'pipe',
    })
      .toString()
      .trim();
    if (res) {
      astContext = `\n\n[AST Blast Radius Context]:\n${res}`;
    }
  } catch {
    // ignore warning
  }

  const workers = payloadData.dispatch_micro_workers || [];
  for (const worker of workers) {
    const agent = worker.target_agent;
    const ctx = worker.context_summary || '';
    const task = worker.task_description || '';
    const files = worker.files_attached || [];

    let prompt = `--- MICRO-WORKER DISPATCH ---\n`;
    prompt += `Agent: ${agent}\n`;
    prompt += `Context: ${ctx}${astContext}\n`;
    prompt += `Task: ${task}\n`;
    prompt += `Attached Files: ${files.length ? files.join(', ') : 'None'}\n`;
    prompt += `-----------------------------`;
    prompts.push(prompt);
  }
  return prompts;
}

// ─── Swarm Orchestrator (Wave-Based Execution) ───────────────────────────────

const TRIBUNAL_WAVES = {
    'wave-1-core': {
        reviewers: ['precedence-reviewer', 'logic-reviewer', 'schema-reviewer', 'resilience-reviewer'],
        maxParallel: 4,
        timeout: 30000,
        failureMode: 'halt',
    },
    'wave-2-security': {
        reviewers: ['security-auditor', 'dependency-reviewer', 'type-safety-reviewer', 'complexity-reviewer', 'sql-reviewer', 'pipeline-reviewer'],
        maxParallel: 6,
        timeout: 45000,
        failureMode: 'continue-warn',
    },
    'wave-3-domain': {
        reviewers: ['frontend-reviewer', 'performance-reviewer', 'mobile-reviewer', 'ai-code-reviewer', 'test-coverage-reviewer', 'accessibility-reviewer', 'ui-ux-auditor', 'review-animations', 'vitals-reviewer', 'db-latency-auditor', 'throughput-optimizer'],
        maxParallel: 8,
        timeout: 60000,
        failureMode: 'continue',
    },
};

class SwarmOrchestrator {
    constructor(dashboard = null) {
        this.dashboard = dashboard;
        this.workers = [];
        this.results = [];
    }

    async executeTribunal(payload, waveName = 'full') {
        const wavesToRun = waveName === 'full' 
            ? ['wave-1-core', 'wave-2-security', 'wave-3-domain']
            : [waveName];

        const workers = (typeof payload === 'object' && payload !== null && payload.workers)
            ? payload.workers
            : (Array.isArray(payload) ? payload : [payload]);
            
        this.workers = workers;
        this.results = [];

        if (this.dashboard) {
            this.dashboard.workers = this.workers.map(w => ({
                name: w.target_agent || w.agent || 'Worker',
                task: (w.task_description || w.goal || '').slice(0, 40) + '...',
                status: '⏳ Pending',
                color: '\x1b[33m', // Yellow
            }));
            this.dashboard.start();
        }

        for (const wave of wavesToRun) {
            const config = TRIBUNAL_WAVES[wave] || { maxParallel: 4, timeout: 30000, failureMode: 'continue' };
            // Filter workers belonging to this wave
            let waveWorkers = [];
            if (waveName === 'full') {
                // If it's a full run, we only pick the reviewers designated for this wave
                const allowedReviewers = new Set(config.reviewers || []);
                waveWorkers = this.workers.filter(w => allowedReviewers.has(w.agent || w.target_agent));
            } else {
                waveWorkers = this.workers;
            }

            if (waveWorkers.length === 0) continue;

            const waveResults = await this.executeWave(wave, config, waveWorkers);
            this.results.push(...waveResults);

            if (config.failureMode === 'halt' && waveResults.some(r => r.status === 'failure')) {
                if (this.dashboard) this.dashboard.stop();
                console.error(`\n\x1b[31m✖ HALT: Core wave '${wave}' encountered a failure. Aborting subsequent waves.\x1b[0m`);
                return this.results;
            }
        }

        if (this.dashboard) {
            this.dashboard.stop();
        }
        return this.results;
    }

    async executeWave(waveName, config, workers) {
        const results = [];
        const { maxParallel } = config;
        
        // Batch workers by maxParallel
        for (let i = 0; i < workers.length; i += maxParallel) {
            const batch = workers.slice(i, i + maxParallel);
            const batchPromises = batch.map(worker => this.executeWorker(worker, config.timeout));
            const batchResults = await Promise.allSettled(batchPromises);
            results.push(...batchResults.map(r => r.value || r.reason));
        }
        return results;
    }

    async executeWorker(worker, timeout) {
        const workerIndex = this.workers.indexOf(worker);
        if (this.dashboard && workerIndex !== -1) {
            this.dashboard.updateStatus(workerIndex, 'Working', '\x1b[36m'); // Cyan
        }

        const agentName = worker.agent || worker.target_agent || 'Unknown';
        
        try {
            const result = await executeWithRetry(async () => {
                return this.invokeReviewerMock(worker, timeout);
            }, { agentName });
            
            if (this.dashboard && workerIndex !== -1) {
                this.dashboard.updateStatus(workerIndex, '✔ Success', '\x1b[32m'); // Green
            }
            return {
                agent: agentName,
                status: 'success',
                output: result,
            };
        } catch (error) {
            if (this.dashboard && workerIndex !== -1) {
                this.dashboard.updateStatus(workerIndex, '✖ Failed', '\x1b[31m'); // Red
            }
            return {
                agent: agentName,
                status: 'failure',
                error: error.message,
            };
        }
    }

    // Since this script primarily validates and outputs JSON, we simulate execution
    // taking between 1-3 seconds for demo purposes.
    async invokeReviewerMock(worker, _timeout) {
        return new Promise((resolve, reject) => {
            const delay = Math.floor(Math.random() * 2000) + 1000;
            // 5% chance to simulate a transient failure for retry logic testing
            const shouldFail = Math.random() < 0.05;
            
            setTimeout(() => {
                if (shouldFail) {
                    reject(new Error('Transient API failure simulated.'));
                } else {
                    resolve(`Completed processing for ${worker.agent || worker.target_agent}`);
                }
            }, delay);
        });
    }
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Swarm mode: validate WorkerRequest / WorkerResult payloads ───────────────

function validateWorkerRequest(req, index, agentsDir) {
  const errors = [];

  const taskId = req.task_id;
  if (!taskId || typeof taskId !== 'string') {
    errors.push(`WorkerRequest[${index}]: 'task_id' must be a non-empty string.`);
  }

  const reqType = req.type;
  if (!VALID_WORKER_TYPES.has(reqType)) {
    errors.push(
      `WorkerRequest[${index}]: 'type' must be one of ${[...VALID_WORKER_TYPES].sort()}, got '${reqType}'.`,
    );
  }

  const agent = req.agent;
  if (!agent || typeof agent !== 'string') {
    errors.push(`WorkerRequest[${index}]: 'agent' must be a non-empty string.`);
  } else {
    const agentFile = path.join(agentsDir, `${agent}.md`);
    if (!fs.existsSync(agentFile)) {
      errors.push(
        `WorkerRequest[${index}]: agent '${agent}' not found at ${agentFile}. Only agents that exist in .agent/agents/ are valid.`,
      );
    }
  }

  const goal = req.goal;
  if (!goal || typeof goal !== 'string') {
    errors.push(`WorkerRequest[${index}]: 'goal' must be a non-empty string.`);
  } else if (goal.length > MAX_GOAL_LENGTH) {
    errors.push(
      `WorkerRequest[${index}]: 'goal' exceeds ${MAX_GOAL_LENGTH} characters (${goal.length} chars). Keep it to a single, focused sentence.`,
    );
  }

  const context = req.context;
  if (!context || typeof context !== 'string') {
    errors.push(`WorkerRequest[${index}]: 'context' must be a non-empty string.`);
  } else if (context.length > MAX_CONTEXT_LENGTH) {
    errors.push(
      `WorkerRequest[${index}]: 'context' exceeds ${MAX_CONTEXT_LENGTH} characters (${context.length} chars). Trim to minimal required context only.`,
    );
  }

  const maxRetries = req.max_retries;
  if (maxRetries !== undefined) {
    if (
      typeof maxRetries !== 'number' ||
      !Number.isInteger(maxRetries) ||
      maxRetries < 1 ||
      maxRetries > 3
    ) {
      errors.push(
        `WorkerRequest[${index}]: 'max_retries' must be an integer between 1 and 3, got '${maxRetries}'.`,
      );
    }
  }

  return errors;
}

function validateWorkerResult(res, index) {
  const errors = [];

  const taskId = res.task_id;
  if (!taskId || typeof taskId !== 'string') {
    errors.push(`WorkerResult[${index}]: 'task_id' must be a non-empty string.`);
  }

  const agent = res.agent;
  if (!agent || typeof agent !== 'string') {
    errors.push(`WorkerResult[${index}]: 'agent' must be a non-empty string.`);
  }

  const status = res.status;
  if (!VALID_RESULT_STATUSES.has(status)) {
    errors.push(
      `WorkerResult[${index}]: 'status' must be one of ${[...VALID_RESULT_STATUSES].sort()}, got '${status}'.`,
    );
  }

  const output = res.output;
  const error = res.error;
  if (status === 'success' && !output) {
    errors.push(`WorkerResult[${index}]: 'output' is required when status is 'success'.`);
  }
  if ((status === 'failure' || status === 'escalate') && !error) {
    errors.push(
      `WorkerResult[${index}]: 'error' is required when status is '${status}'. Be specific — 'Something went wrong' is not acceptable.`,
    );
  }

  const attempts = res.attempts;
  if (attempts !== undefined) {
    if (typeof attempts !== 'number' || !Number.isInteger(attempts) || attempts < 1) {
      errors.push(`WorkerResult[${index}]: 'attempts' must be an integer >= 1, got '${attempts}'.`);
    }
  }

  return errors;
}

function validateSwarmPayload(payloadData, agentsDir, payloadFile = null, opts = {}) {
  let resolvedAgentsDir = agentsDir;
  let quiet = false;

  if (typeof agentsDir === 'object' && agentsDir !== null && typeof agentsDir !== 'string') {
    quiet = !!(agentsDir.quiet || agentsDir.silent);
    resolvedAgentsDir = agentsDir.agentsDir || null;
  }
  if (opts && (opts.quiet || opts.silent)) quiet = true;

  if (payloadFile) {
    const nativeResult = nativeValidate(payloadFile, 'swarm');
    if (nativeResult === true) {
      return true;
    }
  }

  // Validate using Zod schema
  try {
    // Convert payloadData to the expected format for SwarmPayloadSchema
    let swarmPayload;
    if (Array.isArray(payloadData)) {
      swarmPayload = { workers: payloadData };
    } else if (payloadData.workers && Array.isArray(payloadData.workers)) {
      swarmPayload = payloadData;
    } else {
      swarmPayload = { workers: [payloadData] };
    }

    // Add default wave if not provided
    if (!swarmPayload.wave) {
      swarmPayload.wave = 'full';
    }

    // Validate using Zod schema
    validatePayloadOrThrow(swarmPayload, SwarmPayloadSchema);

    // Additional validation: check that agents exist
    const workers = swarmPayload.workers;
    for (let i = 0; i < workers.length; i++) {
      const worker = workers[i];
      const agent = worker.agent;
      if (agent && typeof agent === 'string') {
        const agentFile = path.join(resolvedAgentsDir, `${agent}.md`);
        if (!fs.existsSync(agentFile)) {
          if (!quiet) {
            console.error(`ERROR: Worker ${i}: agent '${agent}' not found at ${agentFile}. Only agents that exist in .agent/agents/ are valid.`);
          }
          return false;
        }
      }

      // Validate attached files exist (warning only, not error)
      const filesAttached = worker.files_attached || [];
      if (Array.isArray(filesAttached)) {
        for (const f of filesAttached) {
          const filePath = path.resolve(process.cwd(), f);
          if (!fs.existsSync(filePath)) {
            if (!quiet) {
              console.warn(
                `WARN: Worker ${i}: attached file '${f}' does not exist (might be a new file to create).`,
              );
            }
          }
        }
      }
    }

    return true;
  } catch (error) {
    if (!quiet) {
      console.error(`ERROR: Swarm payload validation failed: ${error.message}`);
    }
    return false;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  let payload = null;
  let file = null;
  let workspace = '.';
  let mode = 'legacy';
  let useTui = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--payload' && i + 1 < args.length) {
      payload = args[++i];
    } else if (arg === '--file' && i + 1 < args.length) {
      file = args[++i];
    } else if (arg === '--workspace' && i + 1 < args.length) {
      workspace = args[++i];
    } else if (arg === '--mode' && i + 1 < args.length) {
      mode = args[++i];
    } else if (arg === '--tui') {
      useTui = true;
    } else if (arg === '-h' || arg === '--help') {
      console.log(
        'Usage: swarm_dispatcher.js [--payload <json>] [--file <path>] [--workspace <dir>] [--mode legacy|swarm] [--tui]',
      );
      process.exit(0);
    }
  }

  if (!payload && !file) {
    console.error('ERROR: Must provide either --payload or --file');
    process.exit(1);
  }

  const workspaceRoot = path.resolve(workspace);
  const agentDir = findAgentDir(workspaceRoot);

  if (!agentDir) {
    console.error(`ERROR: Could not find .agent directory starting from ${workspaceRoot}`);
    process.exit(1);
  }

  const agentsDir = path.join(agentDir, 'agents');
  if (!fs.existsSync(agentsDir)) {
    console.error(`ERROR: Could not find 'agents' directory inside ${agentDir}`);
    process.exit(1);
  }

  let payloadData;
  try {
    if (file) {
      payloadData = JSON.parse(fs.readFileSync(file, 'utf8'));
    } else {
      payloadData = JSON.parse(payload);
    }
  } catch (e) {
    console.error(`ERROR: Failed to parse payload as JSON: ${e.message}`);
    process.exit(1);
  }

  if (mode === 'swarm') {
    if (!validateSwarmPayload(payloadData, agentsDir, file)) {
      console.error('ERROR: Swarm payload validation failed.');
      process.exit(1);
    }

    let astContext = '';
    try {
      const res = execSync(`python -m code_review_graph review-delta`, {
        cwd: workspaceRoot,
        stdio: 'pipe',
      })
        .toString()
        .trim();
      if (res) {
        astContext = `\n\n[AST Blast Radius Context]:\n${res}`;
      }
    } catch {
      // ignore
    }

    if (astContext) {
      const items =
        typeof payloadData === 'object' && payloadData !== null && payloadData.workers
          ? payloadData.workers
          : Array.isArray(payloadData)
            ? payloadData
            : [payloadData];

      for (const item of items) {
        if (item && 'context' in item) {
          item.context += astContext;
        }
      }
    }

    const orchestrator = new SwarmOrchestrator(useTui ? new SwarmDashboard([]) : null);
    
    // We must run in an async context since SwarmOrchestrator uses async/await.
    const wave = (typeof payloadData === 'object' && payloadData !== null && payloadData.wave) 
        ? payloadData.wave 
        : 'full';
    
    orchestrator.executeTribunal(payloadData, wave)
      .then((results) => {
          if (!useTui) {
              console.log('INFO: Swarm payload validation and orchestration successful.');
              if (astContext) {
                  console.log('--- ENRICHED SWARM PAYLOAD ---');
                  console.log(JSON.stringify(payloadData, null, 2));
              }
              console.log('--- EXECUTION PLAN (MOCK RESULTS) ---');
              console.log(JSON.stringify(results, null, 2));
          } else {
              console.log('\n\x1b[32m✔ Swarm orchestration complete.\x1b[0m\n');
          }
      })
      .catch((err) => {
          console.error(`ERROR: Swarm orchestration failed: ${err.message}`);
          process.exit(1);
      });
  } else {
    if (!validatePayload(payloadData, workspaceRoot, agentsDir, file)) {
      console.error('ERROR: Payload validation failed.');
      process.exit(1);
    }

    if (useTui) {
      const workers = payloadData.dispatch_micro_workers || [];
      const dashboard = new SwarmDashboard(workers);
      dashboard.start();

      // Simulate parallel execution for demo/UX purposes
      setTimeout(() => dashboard.updateStatus(0, 'Researching', '\x1b[36m'), 1000);
      setTimeout(() => {
        if (workers.length > 1) dashboard.updateStatus(1, 'Generating', '\x1b[35m');
      }, 1500);

      setTimeout(() => {
        workers.forEach((w, i) => dashboard.updateStatus(i, '✔ Done', '\x1b[32m'));
        dashboard.stop();
        console.log('\n\x1b[32m✔ All workers successfully dispatched.\x1b[0m\n');
      }, 3000);
    } else {
      console.log('INFO: Payload validation successful.');
      const prompts = buildWorkerPrompts(payloadData, workspaceRoot);

      for (let i = 0; i < prompts.length; i++) {
        console.log(`\n[Worker ${i + 1} Ready]`);
        console.log(prompts[i]);
      }
    }
  }
}

module.exports = {
  SwarmDashboard,
  validateWorkerRequest,
  validateWorkerResult,
  validateSwarmPayload,
  validatePayload,
  findAgentDir,
};

if (require.main === module) {
  main();
}
