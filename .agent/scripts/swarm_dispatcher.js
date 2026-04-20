#!/usr/bin/env node
/**
 * swarm_dispatcher.js
 * Validate Orchestrator micro-worker payloads (legacy) and Swarm payloads.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VALID_WORKER_TYPES = new Set([
    "research", "generate_code", "review_code", "debug",
    "plan", "design_schema", "write_docs", "security_audit",
    "optimize", "test"
]);

const VALID_RESULT_STATUSES = new Set(["success", "failure", "escalate"]);

const MAX_GOAL_LENGTH = 200;
const MAX_CONTEXT_LENGTH = 800;
const MAX_WORKERS_PER_SWARM = 5;

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

// ─── Legacy mode: validate orchestrator micro-worker payloads ──────────────────

function validatePayload(payloadData, workspaceRoot, agentsDir) {
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
                console.warn(`WARN: Worker ${i}: attached file '${f}' does not exist (might be a new file to create).`);
            }
        }
    }

    return allValid;
}

function buildWorkerPrompts(payloadData, workspaceRoot) {
    const prompts = [];
    let astContext = "";

    try {
        const res = execSync(`python -m code_review_graph review-delta`, { cwd: workspaceRoot, stdio: 'pipe' }).toString().trim();
        if (res) {
            astContext = `\n\n[AST Blast Radius Context]:\n${res}`;
        }
    } catch (e) {
        // ignore warning
    }

    const workers = payloadData.dispatch_micro_workers || [];
    for (const worker of workers) {
        const agent = worker.target_agent;
        const ctx = worker.context_summary || "";
        const task = worker.task_description || "";
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

// ─── Swarm mode: validate WorkerRequest / WorkerResult payloads ───────────────

function validateWorkerRequest(req, index, agentsDir) {
    const errors = [];

    const taskId = req.task_id;
    if (!taskId || typeof taskId !== 'string') {
        errors.push(`WorkerRequest[${index}]: 'task_id' must be a non-empty string.`);
    }

    const reqType = req.type;
    if (!VALID_WORKER_TYPES.has(reqType)) {
        errors.push(`WorkerRequest[${index}]: 'type' must be one of ${[...VALID_WORKER_TYPES].sort()}, got '${reqType}'.`);
    }

    const agent = req.agent;
    if (!agent || typeof agent !== 'string') {
        errors.push(`WorkerRequest[${index}]: 'agent' must be a non-empty string.`);
    } else {
        const agentFile = path.join(agentsDir, `${agent}.md`);
        if (!fs.existsSync(agentFile)) {
            errors.push(`WorkerRequest[${index}]: agent '${agent}' not found at ${agentFile}. Only agents that exist in .agent/agents/ are valid.`);
        }
    }

    const goal = req.goal;
    if (!goal || typeof goal !== 'string') {
        errors.push(`WorkerRequest[${index}]: 'goal' must be a non-empty string.`);
    } else if (goal.length > MAX_GOAL_LENGTH) {
        errors.push(`WorkerRequest[${index}]: 'goal' exceeds ${MAX_GOAL_LENGTH} characters (${goal.length} chars). Keep it to a single, focused sentence.`);
    }

    const context = req.context;
    if (!context || typeof context !== 'string') {
        errors.push(`WorkerRequest[${index}]: 'context' must be a non-empty string.`);
    } else if (context.length > MAX_CONTEXT_LENGTH) {
        errors.push(`WorkerRequest[${index}]: 'context' exceeds ${MAX_CONTEXT_LENGTH} characters (${context.length} chars). Trim to minimal required context only.`);
    }

    const maxRetries = req.max_retries;
    if (maxRetries !== undefined) {
        if (typeof maxRetries !== 'number' || !Number.isInteger(maxRetries) || maxRetries < 1 || maxRetries > 3) {
            errors.push(`WorkerRequest[${index}]: 'max_retries' must be an integer between 1 and 3, got '${maxRetries}'.`);
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
        errors.push(`WorkerResult[${index}]: 'status' must be one of ${[...VALID_RESULT_STATUSES].sort()}, got '${status}'.`);
    }

    const output = res.output;
    const error = res.error;
    if (status === "success" && !output) {
        errors.push(`WorkerResult[${index}]: 'output' is required when status is 'success'.`);
    }
    if ((status === "failure" || status === "escalate") && !error) {
        errors.push(`WorkerResult[${index}]: 'error' is required when status is '${status}'. Be specific — 'Something went wrong' is not acceptable.`);
    }

    const attempts = res.attempts;
    if (attempts !== undefined) {
        if (typeof attempts !== 'number' || !Number.isInteger(attempts) || attempts < 1) {
            errors.push(`WorkerResult[${index}]: 'attempts' must be an integer >= 1, got '${attempts}'.`);
        }
    }

    return errors;
}

function validateSwarmPayload(payloadData, agentsDir) {
    let items;
    if (typeof payloadData === 'object' && payloadData !== null) {
        if (Array.isArray(payloadData)) {
            items = payloadData;
        } else if (payloadData.workers && Array.isArray(payloadData.workers)) {
            items = payloadData.workers;
        } else {
            items = [payloadData];
        }
    } else {
        console.error("ERROR: Swarm payload must be a JSON object or array.");
        return false;
    }

    if (items.length > MAX_WORKERS_PER_SWARM) {
        console.error(`ERROR: Swarm payload contains ${items.length} workers, exceeding the maximum of ${MAX_WORKERS_PER_SWARM}.`);
        return false;
    }

    const allErrors = [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (typeof item !== 'object' || item === null) {
            allErrors.push(`Item[${i}]: must be a JSON object.`);
            continue;
        }

        let errors;
        if ("status" in item && "output" in item) {
            errors = validateWorkerResult(item, i);
        } else {
            errors = validateWorkerRequest(item, i, agentsDir);
        }

        allErrors.push(...errors);
    }

    if (allErrors.length > 0) {
        for (const err of allErrors) {
            console.error(`ERROR: ${err}`);
        }
        return false;
    }

    return true;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
    const args = process.argv.slice(2);
    let payload = null;
    let file = null;
    let workspace = ".";
    let mode = "legacy";

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
        } else if (arg === '-h' || arg === '--help') {
            console.log("Usage: swarm_dispatcher.js [--payload <json>] [--file <path>] [--workspace <dir>] [--mode legacy|swarm]");
            process.exit(0);
        }
    }

    if (!payload && !file) {
        console.error("ERROR: Must provide either --payload or --file");
        process.exit(1);
    }

    const workspaceRoot = path.resolve(workspace);
    const agentDir = findAgentDir(workspaceRoot);

    if (!agentDir) {
        console.error(`ERROR: Could not find .agent directory starting from ${workspaceRoot}`);
        process.exit(1);
    }

    const agentsDir = path.join(agentDir, "agents");
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

    if (mode === "swarm") {
        if (!validateSwarmPayload(payloadData, agentsDir)) {
            console.error("ERROR: Swarm payload validation failed.");
            process.exit(1);
        }

        let astContext = "";
        try {
            const res = execSync(`python -m code_review_graph review-delta`, { cwd: workspaceRoot, stdio: 'pipe' }).toString().trim();
            if (res) {
                astContext = `\n\n[AST Blast Radius Context]:\n${res}`;
            }
        } catch (e) {
            // ignore
        }

        if (astContext) {
            const items = (typeof payloadData === 'object' && payloadData !== null && payloadData.workers) 
                ? payloadData.workers 
                : (Array.isArray(payloadData) ? payloadData : [payloadData]);
                
            for (const item of items) {
                if (item && "context" in item) {
                    item.context += astContext;
                }
            }
        }

        console.log("INFO: Swarm payload validation successful.");
        if (astContext) {
            console.log("--- ENRICHED SWARM PAYLOAD ---");
            console.log(JSON.stringify(payloadData, null, 2));
        }
    } else {
        if (!validatePayload(payloadData, workspaceRoot, agentsDir)) {
            console.error("ERROR: Payload validation failed.");
            process.exit(1);
        }

        console.log("INFO: Payload validation successful.");
        const prompts = buildWorkerPrompts(payloadData, workspaceRoot);

        for (let i = 0; i < prompts.length; i++) {
            console.log(`\n[Worker ${i + 1} Ready]`);
            console.log(prompts[i]);
        }
    }
}

module.exports = { validateWorkerRequest, validateWorkerResult, validateSwarmPayload, validatePayload, findAgentDir };

if (require.main === module) {
    main();
}
