'use strict';

/**
 * agent_runtime.js — Core Agent Execution Runtime & Policy Enforcer
 * =================================================================
 * Stage 2: Agent Runtime & Controlled Multi-Agent Orchestration
 *
 * Guarantees:
 * 1. Resolves canonical agent definitions through canonical_registry.js.
 * 2. Enforces agent lifecycle policies (experimental opt-in, deprecated redirects).
 * 3. Enforces strict input/output contract validation (AgentTask / AgentResult).
 * 4. Schedules provider execution via KernelScheduler with token & timeout governance.
 * 5. Injects execution output and findings into the shared EvidenceBus.
 * 6. Zero unapproved file writes: all write proposals route through ControlledWriteService
 *    and require human approval for protected/consequential state mutations.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { resolveAgent, getRepoRoot } = require('./canonical_registry');
const { stripFrontmatter } = require('./reviewer_registry');
const { validateAgentTask, parseRawAgentOutput } = require('./agent_contracts');
const { ProviderAdapter } = require('./provider_adapter');
const { KernelScheduler } = require('./kernel_scheduler');
const { EvidenceBus } = require('./evidence_bus');
const { ControlledWriteService } = require('./controlled_write_service');

function computeSha256(data) {
  return crypto
    .createHash('sha256')
    .update(data || '', 'utf8')
    .digest('hex');
}

class AgentRuntime {
  /**
   * @param {Object} [options]
   * @param {string} [options.repoRoot] - Root of repository
   * @param {ProviderAdapter} [options.provider] - Custom provider adapter
   * @param {KernelScheduler} [options.scheduler] - Custom kernel scheduler
   * @param {EvidenceBus} [options.evidenceBus] - Custom evidence bus
   * @param {ControlledWriteService} [options.writeService] - Custom controlled write service
   * @param {boolean} [options.enableExperimental=false] - Global experimental agent opt-in
   */
  constructor(options = {}) {
    this.repoRoot = getRepoRoot(options.repoRoot);
    this.provider = options.provider || new ProviderAdapter();
    this.scheduler = options.scheduler || new KernelScheduler();
    this.evidenceBus = options.evidenceBus || new EvidenceBus();
    const { ReviewExecutor } = require('./review_executor');
    this.writeService =
      options.writeService ||
      new ControlledWriteService({
        workspaceRoot: this.repoRoot,
        reviewExecutor: new ReviewExecutor({
          provider: this.provider,
          repoRoot: this.repoRoot,
        }),
      });
    this.enableExperimental = Boolean(options.enableExperimental);
  }

  /**
   * Loads persona instructions from disk.
   * @param {Object} spec - Canonical agent spec
   * @returns {string} Persona markdown instructions without frontmatter
   */
  loadPersonaInstructions(spec) {
    const filename = spec.file || `${spec.name}.md`;
    const fullPath = path.join(this.repoRoot, '.agent', 'agents', filename);

    if (fs.existsSync(fullPath)) {
      const raw = fs.readFileSync(fullPath, 'utf8');
      return stripFrontmatter(raw);
    }

    // Fallback persona prompt
    return `# Persona: ${spec.name}\n${spec.description || 'Specialist agent.'}`;
  }

  /**
   * Builds prompt sent to the LLM provider.
   * @private
   */
  _buildPrompt(task, spec, personaInstructions) {
    const contextStr =
      typeof task.context === 'object'
        ? JSON.stringify(task.context, null, 2)
        : String(task.context || '');

    const constraintsStr =
      Array.isArray(task.constraints) && task.constraints.length > 0
        ? task.constraints.map(c => `- ${c}`).join('\n')
        : 'None specified.';

    const skillsStr =
      Array.isArray(task.requiredSkills) && task.requiredSkills.length > 0
        ? task.requiredSkills.map(s => `- ${s}`).join('\n')
        : 'Standard capabilities.';

    return `### SYSTEM PERSONA & INSTRUCTIONS
You are "${spec.name}" (${spec.type || 'specialist'}).
${spec.description || ''}

${personaInstructions}

---
### TASK SPECIFICATION
- Task ID: ${task.taskId}
- Objective: ${task.objective}
- Risk Level: ${task.riskLevel || 'MEDIUM'}

### CONTEXT & INPUTS
${contextStr || '(No additional context provided)'}

### CONSTRAINTS
${constraintsStr}

### REQUIRED SKILLS
${skillsStr}

---
### OUTPUT REQUIREMENTS
You must reply with a single strictly valid JSON object conforming to the following structure:
{
  "status": "SUCCESS" | "FAILURE" | "ERROR",
  "summary": "Concise executive summary of your analysis or proposal",
  "findings": [
    {
      "findingId": "F-1",
      "category": "CORRECTNESS" | "SECURITY" | "PERFORMANCE" | "ARCHITECTURE" | "COMPLIANCE" | "STYLE" | "LOGIC" | "OTHER",
      "severity": "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      "description": "Specific issue description",
      "evidence": "Code or configuration snippet demonstrating the finding",
      "filePath": "relative/path/to/target/file.js",
      "lineRange": "10-25",
      "confidence": 0.95
    }
  ],
  "recommendations": [
    "Recommended remediation or next step"
  ],
  "writeProposals": [
    {
      "operation": "CREATE" | "MODIFY" | "DELETE",
      "path": "relative/path/to/file.ext",
      "content": "Proposed complete file content"
    }
  ],
  "artifacts": []
}

Do NOT wrap the JSON in commentary or conversational greetings. Output only valid JSON.`;
  }

  /**
   * Executes an AgentTask.
   *
   * @param {any} rawTask - Raw task definition validated against AgentTaskSchema
   * @param {Object} [options]
   * @param {string} [options.sessionId] - Evidence session ID
   * @param {boolean} [options.enableExperimental] - Experimental persona opt-in
   * @param {boolean} [options.disallowDeprecated=false] - Fail if deprecated agent requested
   * @param {AbortSignal} [options.signal] - Cancellation signal
   * @returns {Promise<import('zod').infer<typeof import('./agent_contracts').AgentResultSchema>>}
   */
  async executeTask(rawTask, options = {}) {
    const start = Date.now();
    const sessionId = options.sessionId || `sess_${crypto.randomBytes(6).toString('hex')}`;
    const signal = options.signal || null;
    const enableExperimental = options.enableExperimental ?? this.enableExperimental;

    // 1. Input Contract Validation
    let task;
    try {
      task = validateAgentTask(rawTask);
    } catch (valErr) {
      const durationMs = Date.now() - start;
      return {
        taskId: rawTask?.taskId || 'invalid_task',
        agentId: rawTask?.agentId || 'unknown_agent',
        status: 'ERROR',
        summary: `INPUT_VALIDATION_ERROR: ${valErr.message}`,
        findings: [],
        proposals: [],
        refactoringProposals: [],
        concurrencyFindings: [],
        writeProposals: [],
        evidence: [],
        artifacts: [],
        recommendations: [],
        errors: [valErr.message],
        provenance: {
          inputHash: computeSha256(JSON.stringify(rawTask || {})),
          outputHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          provider: 'none',
          model: 'none',
          durationMs,
          timestamp: Date.now(),
        },
        durationMs,
      };
    }

    const inputHash = computeSha256(JSON.stringify(task));

    // 2. Canonical Agent Resolution & Lifecycle Verification
    let spec;
    try {
      spec = resolveAgent(
        task.agentId,
        {
          enableExperimental,
          optIn: enableExperimental,
          allowDeprecated: Boolean(options.allowDeprecated),
        },
        this.repoRoot,
      );

      if (!spec) {
        throw new Error(
          `AGENT_NOT_FOUND: Agent '${task.agentId}' is not registered in canonical registry.`,
        );
      }

      if (spec.status === 'deprecated' && options.disallowDeprecated) {
        throw new Error(`DEPRECATED_AGENT_REJECTED: Agent '${task.agentId}' is deprecated.`);
      }
    } catch (agentErr) {
      const durationMs = Date.now() - start;
      return {
        taskId: task.taskId,
        agentId: task.agentId,
        status: 'ERROR',
        summary: agentErr.message,
        findings: [],
        proposals: [],
        refactoringProposals: [],
        concurrencyFindings: [],
        writeProposals: [],
        evidence: [],
        artifacts: [],
        recommendations: [],
        errors: [agentErr.message],
        provenance: {
          inputHash,
          outputHash: computeSha256(agentErr.message),
          provider: 'none',
          model: 'none',
          durationMs,
          timestamp: Date.now(),
        },
        durationMs,
      };
    }

    // 3. Load Persona Instructions & Build Prompt
    const personaInstructions = this.loadPersonaInstructions(spec);
    const prompt = this._buildPrompt(task, spec, personaInstructions);

    // 4. Resolve Provider & Model
    const model = task.model || spec.model || this.provider.defaultModel;
    const providerName = this.provider.provider;

    // 5. Dispatch via KernelScheduler
    let providerRes;
    try {
      providerRes = await this.scheduler.schedule(
        () =>
          this.provider.sendReviewPrompt({
            prompt,
            model,
            maxTokens: task.tokenBudget || 4096,
            timeoutMs: task.timeoutMs || 30000,
            signal,
          }),
        {
          taskId: task.taskId,
          provider: providerName,
          priority:
            task.riskLevel === 'CRITICAL'
              ? 'CRITICAL'
              : task.riskLevel === 'HIGH'
                ? 'HIGH'
                : 'MEDIUM',
          timeoutMs: task.timeoutMs,
          tokenBudget: task.tokenBudget,
          promptLength: prompt.length,
          signal,
        },
      );
    } catch (schedErr) {
      const durationMs = Date.now() - start;
      const status =
        schedErr.code === 'TASK_TIMEOUT'
          ? 'ERROR'
          : schedErr.code === 'TASK_ABORTED'
            ? 'CANCELLED'
            : schedErr.code === 'TOKEN_BUDGET_EXCEEDED'
              ? 'BLOCKED'
              : 'ERROR';

      return {
        taskId: task.taskId,
        agentId: spec.name,
        status,
        summary: `SCHEDULER_ERROR: ${schedErr.message}`,
        findings: [],
        proposals: [],
        refactoringProposals: [],
        concurrencyFindings: [],
        writeProposals: [],
        evidence: [],
        artifacts: [],
        recommendations: [],
        errors: [schedErr.message],
        provenance: {
          inputHash,
          outputHash: computeSha256(schedErr.message),
          provider: providerName,
          model,
          durationMs,
          timestamp: Date.now(),
        },
        durationMs,
      };
    }

    const durationMs = Date.now() - start;

    // Check provider level error
    if (providerRes.error) {
      return {
        taskId: task.taskId,
        agentId: spec.name,
        status: 'ERROR',
        summary: `PROVIDER_ERROR: ${providerRes.error}`,
        findings: [],
        proposals: [],
        refactoringProposals: [],
        concurrencyFindings: [],
        writeProposals: [],
        evidence: [],
        artifacts: [],
        recommendations: [],
        errors: [providerRes.error],
        provenance: {
          inputHash,
          outputHash: computeSha256(providerRes.error),
          provider: providerName,
          model,
          durationMs,
          timestamp: Date.now(),
        },
        durationMs,
      };
    }

    // 6. Validate & Normalize Output Schema
    const result = parseRawAgentOutput(providerRes.text, {
      taskId: task.taskId,
      agentId: spec.name,
      inputHash,
      provider: providerName,
      model,
      durationMs,
    });

    // 7. Controlled Write Service & Human Approval Enforcement
    let rawOutputObj = null;
    try {
      rawOutputObj =
        typeof providerRes.text === 'string' ? JSON.parse(providerRes.text) : providerRes.text;
    } catch (_) {
      // not direct JSON object, ignore
    }

    const proposedWrites = rawOutputObj?.writeProposals || rawOutputObj?.proposedChanges || [];
    if (Array.isArray(proposedWrites) && proposedWrites.length > 0) {
      try {
        const writeReq = {
          requestId: `wr_${crypto.randomBytes(6).toString('hex')}`,
          workspaceId: this.repoRoot,
          reason: `Agent ${spec.name} proposed modifications for task ${task.taskId}: ${task.objective}`,
          files: proposedWrites.map(pw => ({
            path: pw.path || pw.filePath,
            operation: (pw.operation || 'MODIFY').toUpperCase(),
            content: typeof pw.content === 'string' ? pw.content : '',
          })),
        };

        const writeOutcome = await this.writeService.requestWrite(writeReq);

        // Record write proposal in artifacts
        result.artifacts.push({
          type: 'CONTROLLED_WRITE_PROPOSAL',
          token: writeOutcome.token,
          transactionId: writeOutcome.transactionId,
          status: writeOutcome.status,
          verdict: writeOutcome.verdict,
          files: writeOutcome.files,
          requiresHumanApproval: writeOutcome.status === 'HUMAN_APPROVAL_REQUIRED',
        });

        if (writeOutcome.status === 'HUMAN_APPROVAL_REQUIRED') {
          result.recommendations.push(
            `HUMAN APPROVAL REQUIRED: Proposed modifications to [${writeOutcome.files.join(', ')}] are staged in transaction ${writeOutcome.transactionId} (Token: ${writeOutcome.token}).`,
          );
        } else if (writeOutcome.status === 'REJECTED') {
          result.errors.push(`WRITE_POLICY_REJECTED: AI governance rejected proposed writes.`);
        }
      } catch (writeErr) {
        result.errors.push(`CONTROLLED_WRITE_ERROR: ${writeErr.message}`);
      }
    }

    // 8. Shared Evidence Bus Ingestion
    const session = this.evidenceBus.createSession(sessionId);

    for (const finding of result.findings) {
      session.recordFinding(task, finding);
    }
    for (const artifact of result.artifacts) {
      session.recordArtifact(task, artifact);
    }
    session.recordMetric(task, 'durationMs', durationMs);
    if (typeof providerRes.totalTokens === 'number') {
      session.recordMetric(task, 'totalTokens', providerRes.totalTokens);
    }

    return result;
  }
}

module.exports = {
  AgentRuntime,
  computeSha256,
};
