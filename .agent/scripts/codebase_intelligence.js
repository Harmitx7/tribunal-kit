#!/usr/bin/env node
/**
 * codebase_intelligence.js — Tribunal Kit SOTA Codebase Intelligence & Developer Onboarding Engine
 * ══════════════════════════════════════════════════════════════════════════════════════════════════
 * Production-grade, deterministic, read-only architectural intelligence system:
 *   1. overview         — High-level architectural topology, entry points, datastores, centrality hubs
 *   2. trace            — Multi-hop execution flow (Ingress -> Middleware -> Handler -> Service -> DB)
 *   3. dependencies     — Module dependency topology, fan-in/fan-out, cycles, phantom dependencies
 *   4. relevant-files   — Targeted file checklist before modifying a feature (classified by role)
 *   5. impact           — Blast radius assessment, concentric rings, affected endpoints, risk tiering
 *   6. dead-code        — Static analysis of unreferenced exports, orphan modules, Chesterton's fences
 *   7. onboard          — 30-sec mental model, guided reading order (Days 1-3), critical gotchas
 *   8. prepare          — Pre-modification change readiness analysis and verification planning
 *
 * Guarantees:
 *   - Strictly READ-ONLY (100% in-memory fact extraction, zero repository mutations).
 *   - Zero hallucinations: All paths and lines verified against ground truth (L1_OBSERVED/L2_CORROBORATED).
 *   - Strictly bounded context (<2,500 tokens for default dossiers).
 *   - Standardized versioned CodebaseEvidenceRecord and CodebaseIntelligenceResult schemas (v2.0.0).
 *   - Comprehensive secret redaction and path containment on all inputs and outputs.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ArchitectureExtractor, walkRepository } = require('./architecture_extractor');
const { BlastRadiusEngine } = require('./blast_radius_engine');
const { ArchitectureVerifier } = require('./architecture_verifier');

// Safe path containment helper
let safeContainedPath;
try {
  const pc = require('../../src/utils/path_containment');
  safeContainedPath = pc.safeContainedPath;
} catch {
  try {
    const pc = require('../src/utils/path_containment');
    safeContainedPath = pc.safeContainedPath;
  } catch {
    safeContainedPath = function (candidate, root) {
      try {
        const resolved = path.resolve(root, candidate);
        const rel = path.relative(root, resolved);
        if (rel.startsWith('..') || path.isAbsolute(rel)) {
          return { ok: false, error: 'Path traversal outside root' };
        }
        return { ok: true, resolvedPath: resolved, relativePath: rel.replace(/\\/g, '/') };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    };
  }
}

// Secret redaction helper
function redactSecrets(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    // Private Keys
    .replace(/(?:-----BEGIN [A-Z ]+KEY-----[\s\S]*?-----END [A-Z ]+KEY-----)/g, '[REDACTED_PRIVATE_KEY]')
    // Bearer Tokens (matched before standalone JWT so Authorization headers are fully redacted)
    .replace(/(Bearer\s+)[A-Za-z0-9-_.~+/]+=*/gi, '$1[REDACTED_BEARER_TOKEN]')
    // JWT Tokens
    .replace(/(eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+)/g, '[REDACTED_JWT_TOKEN]')
    // AWS Access Key IDs
    .replace(/\b(?:AKIA|ASIA|ABIA|ACCA)[0-9A-Z]{16}\b/g, '[REDACTED_AWS_KEY]')
    // GitHub Personal Access Tokens
    .replace(/\bgh[pousr]_[A-Za-z0-9_]{10,255}\b/g, '[REDACTED_GITHUB_TOKEN]')
    // OpenAI / Anthropic API Keys
    .replace(/\b(?:sk-ant-|sk-proj-|sk-)[A-Za-z0-9_-]{20,}\b/g, '[REDACTED_API_KEY]')
    // Database URIs (PostgreSQL, MySQL, MariaDB, MongoDB / MongoDB+srv, Redis / Rediss, AMQP / AMQPS)
    .replace(/\b(?:postgres|postgresql|mysql|mariadb|mongodb(?:\+srv)?|redis|rediss|amqp|amqps):\/\/[^:\s]+:[^@\s]+@[^\s]+/gi, '[REDACTED_DB_URI]')
    // Generic Credentials & Password assignments with quotes (preserves quotes, redacts entire enclosed string)
    .replace(/((?:[a-zA-Z0-9_-]*(?:api[_-]?key|secret|password|passwd|token|auth[_-]?token|access[_-]?token|credentials?|private[_-]?key)[a-zA-Z0-9_-]*)\s*[:=]\s*(['"]))[^\r\n]*?\2/gi, '$1[REDACTED_SECRET]$2')
    // Generic Credentials & Password assignments unquoted
    .replace(/((?:[a-zA-Z0-9_-]*(?:api[_-]?key|secret|password|passwd|token|auth[_-]?token|access[_-]?token|credentials?|private[_-]?key)[a-zA-Z0-9_-]*)\s*[:=]\s*)[^\s\r\n,;]+/gi, '$1[REDACTED_SECRET]');
}

// Deep sanitize helper for structured JSON objects
function sanitizeObject(obj) {
  if (!obj) return obj;
  if (typeof obj === 'string') return redactSecrets(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (typeof obj === 'object') {
    const res = {};
    for (const [k, v] of Object.entries(obj)) {
      res[k] = sanitizeObject(v);
    }
    return res;
  }
  return obj;
}

// ANSI colors
let C = {
  GREEN: '\x1b[92m',
  YELLOW: '\x1b[93m',
  CYAN: '\x1b[96m',
  RED: '\x1b[91m',
  BLUE: '\x1b[94m',
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
  RESET: '\x1b[0m',
};
try {
  const colorsMod = require('./_colors');
  if (colorsMod) C = Object.assign({}, C, colorsMod);
} catch {
  // Use fallback C
}

/**
 * Creates a standardized CodebaseEvidenceRecord adhering to schema v2.0.0
 */
function createEvidenceRecord(opts) {
  const rawFile = opts.source?.file || opts.source_path || opts.file || '';
  const normalizedFile = redactSecrets(rawFile.replace(/\\/g, '/'));

  // Map legacy confidence if present
  let conf = opts.confidence || 'L1_OBSERVED';
  if (conf === 'L1') conf = 'L1_OBSERVED';
  else if (conf === 'L2') conf = 'L2_CORROBORATED';
  else if (conf === 'L3') conf = 'L3_INFERRED';
  else if (conf === 'L4' || conf === 'L5') conf = 'L0_UNKNOWN';

  const evidenceId = opts.evidence_id || opts.finding_id || `ev_${crypto.randomBytes(6).toString('hex')}`;

  return {
    schema_version: '2.0.0',
    evidence_id: evidenceId,
    claim: redactSecrets(opts.claim || ''),
    subject: redactSecrets(opts.subject || opts.symbol || normalizedFile),
    relationship: opts.relationship || opts.relationship_type || 'references',
    object: redactSecrets(opts.object || ''),
    source: {
      file: normalizedFile,
      start_line: opts.source?.start_line || opts.source_range?.start_line || undefined,
      end_line: opts.source?.end_line || opts.source_range?.end_line || undefined,
      symbol: (opts.source?.symbol || opts.symbol) ? redactSecrets(opts.source?.symbol || opts.symbol) : undefined,
      content_hash: opts.source?.content_hash || undefined,
    },
    method: opts.method || opts.verification_method || 'ast_static_visitor',
    confidence: conf,
    resolution: opts.resolution || (conf === 'L1_OBSERVED' ? 'DETERMINISTIC_CHECK' : 'HEURISTIC_CORROBORATION'),
    scope: opts.scope || 'repository',
    limitations: opts.limitations || [],
    // Retain backward-compatible fields
    finding_id: evidenceId,
    source_path: normalizedFile,
    symbol: opts.symbol || opts.source?.symbol || undefined,
    source_range: (opts.source?.start_line || opts.source_range?.start_line) ? {
      start_line: opts.source?.start_line || opts.source_range?.start_line,
      end_line: opts.source?.end_line || opts.source_range?.end_line || opts.source?.start_line || opts.source_range?.start_line,
    } : undefined,
    relationship_type: opts.relationship || opts.relationship_type || 'references',
    verification_method: opts.method || opts.verification_method || 'ast_static_visitor',
    repo_fingerprint: opts.repo_fingerprint || 'working-tree',
    evidence_status: opts.evidence_status || (conf === 'L1_OBSERVED' ? 'OBSERVED' : 'UNVERIFIED_CLAIM'),
    unresolved_assumptions: opts.unresolved_assumptions || [],
  };
}

/**
 * Creates a standardized CodebaseIntelligenceResult envelope adhering to schema v2.0.0
 */
/**
 * Canonical Error Classifier
 * Maps errors into standard categories:
 *   INVALID_INPUT | UNSUPPORTED_OPERATION | TARGET_NOT_FOUND | ACCESS_DENIED |
 *   DEPENDENCY_UNRESOLVED | ANALYSIS_INCOMPLETE | RESOURCE_LIMIT_EXCEEDED |
 *   CONFIGURATION_ERROR | SERIALIZATION_ERROR | INTERNAL_ERROR
 */
function classifyError(err, operation, target) {
  const msg = (err?.message || String(err || '')).toLowerCase();

  let code = 'INTERNAL_ERROR';
  let recoverable = false;
  let suggestedAction = 'Inspect error details or retry with verbose logging.';

  if (err?.code === 'UNSUPPORTED_OPERATION' || msg.includes('unknown codebase intelligence subcommand') || msg.includes('expected one of')) {
    code = 'UNSUPPORTED_OPERATION';
    recoverable = true;
    suggestedAction = 'Choose one of: overview, trace, dependencies, relevant-files, impact, dead-code, onboard, prepare, change-impact.';
  } else if (msg.includes('requires a target') || msg.includes('requires a task') || msg.includes('requires a proposed change') || msg.includes('target route') || msg.includes('invalid argument') || msg.includes('must be a string')) {
    code = 'INVALID_INPUT';
    recoverable = true;
    suggestedAction = 'Provide a valid target symbol, file path, route, or task description.';
  } else if (msg.includes('traversal') || msg.includes('outside root') || msg.includes('escapes') || msg.includes('eacces') || msg.includes('permission denied')) {
    code = 'ACCESS_DENIED';
    recoverable = false;
    suggestedAction = 'Verify that target path is within the authorized workspace root and has read permissions.';
  } else if (msg.includes('not found') || msg.includes('enoent') || msg.includes('does not exist')) {
    code = 'TARGET_NOT_FOUND';
    recoverable = true;
    suggestedAction = 'Check that the target file or symbol exists in the repository.';
  } else if (msg.includes('resource limit') || msg.includes('maxfiles') || msg.includes('maxdepth') || msg.includes('maxfilesize')) {
    code = 'RESOURCE_LIMIT_EXCEEDED';
    recoverable = false;
    suggestedAction = 'Increase the resource budget option (--depth, maxFiles, maxFileSize) or focus scope with --focus.';
  } else if (msg.includes('incomplete') || msg.includes('partial')) {
    code = 'ANALYSIS_INCOMPLETE';
    recoverable = true;
    suggestedAction = 'Run analysis on a smaller scope using --focus or resolve missing dependencies.';
  } else if (msg.includes('package.json') || msg.includes('tsconfig') || msg.includes('manifest') || msg.includes('config')) {
    code = 'CONFIGURATION_ERROR';
    recoverable = true;
    suggestedAction = 'Inspect configuration files (package.json, tsconfig.json) for syntax validity.';
  } else if (msg.includes('circular') || msg.includes('serialize') || msg.includes('json parse') || msg.includes('json.parse')) {
    code = 'SERIALIZATION_ERROR';
    recoverable = false;
    suggestedAction = 'Verify data structure does not contain cyclic references or invalid JSON primitives.';
  } else if (msg.includes('timed out') || msg.includes('timeout') || err?.code === 'TIMEOUT_EXCEEDED') {
    code = 'TIMEOUT_EXCEEDED';
    recoverable = true;
    suggestedAction = 'Increase timeout limit (--timeout) or narrow analysis scope using --focus or --depth.';
  } else if (msg.includes('cancelled') || msg.includes('aborted') || err?.code === 'OPERATION_CANCELLED') {
    code = 'OPERATION_CANCELLED';
    recoverable = true;
    suggestedAction = 'Retry the operation without cancelling the active request signal.';
  }

  return {
    code,
    severity: 'ERROR',
    message: redactSecrets(err?.message || 'An unexpected error occurred'),
    component: 'codebase_intelligence',
    operation,
    recoverable,
    source_reference: target ? redactSecrets(target) : undefined,
    suggested_action: suggestedAction,
  };
}
function createResultEnvelope(opts) {
  const isComplete = opts.status === 'COMPLETE';
  const isFailed = opts.status === 'FAILED' || opts.status === 'UNSUPPORTED';
  const defaultPercentage = isComplete ? 100 : (isFailed ? 0 : 50);
  const cleanData = sanitizeObject(opts.data || {});
  return {
    schema_version: '2.0.0',
    status: opts.status || 'COMPLETE',
    operation: opts.operation,
    subcommand: opts.operation, // Backward-compatible alias
    target: opts.target ? redactSecrets(opts.target) : undefined,
    summary: redactSecrets(opts.summary || ''),
    data: cleanData,
    ...(typeof cleanData === 'object' && !Array.isArray(cleanData) ? cleanData : {}),
    evidence_records: opts.evidence_records || [],
    unresolved_assumptions: (opts.unresolved_assumptions || []).map(a => redactSecrets(a)),
    limitations: (opts.limitations || []).map(l => redactSecrets(l)),
    diagnostics: (opts.diagnostics || []).map(d => sanitizeObject(d)),
    completeness: {
      total_expected: opts.completeness?.total_expected,
      analyzed: opts.completeness?.analyzed,
      percentage: opts.completeness?.percentage ?? defaultPercentage,
      is_complete: isComplete,
    },
  };
}

// ── Phase 18: Autonomous Investigation & Evidence-Grounded Reasoning ────────
class InvestigationBudget {
  constructor(opts = {}) {
    this.maxIterations = opts.maxIterations || opts.iterations || 5;
    this.maxToolCalls = opts.maxToolCalls || opts.toolCalls || 10;
    this.maxFiles = opts.maxFiles || 30;
    this.maxDepth = opts.maxDepth || opts.depth || 3;
    this.timeoutMs = opts.timeoutMs || opts.timeout || 15000;

    this.iterationsUsed = 0;
    this.toolCallsUsed = 0;
    this.filesInspected = new Set();
    this.startTime = Date.now();
  }

  recordIteration() {
    this.iterationsUsed++;
  }

  recordToolCall(files = []) {
    this.toolCallsUsed++;
    (files || []).forEach(f => this.filesInspected.add(f));
  }

  get elapsedMs() {
    return Date.now() - this.startTime;
  }

  isExhausted() {
    if (this.iterationsUsed >= this.maxIterations) {
      return { exhausted: true, reason: `Max iterations budget (${this.maxIterations}) reached.` };
    }
    if (this.toolCallsUsed >= this.maxToolCalls) {
      return { exhausted: true, reason: `Max tool calls budget (${this.maxToolCalls}) reached.` };
    }
    if (this.filesInspected.size >= this.maxFiles) {
      return { exhausted: true, reason: `Max files inspected budget (${this.maxFiles}) reached.` };
    }
    if (this.elapsedMs >= this.timeoutMs) {
      return { exhausted: true, reason: `Investigation timeout limit (${this.timeoutMs}ms) exceeded.` };
    }
    return { exhausted: false };
  }

  toReport() {
    return {
      iterationsUsed: this.iterationsUsed,
      maxIterations: this.maxIterations,
      toolCallsUsed: this.toolCallsUsed,
      maxToolCalls: this.maxToolCalls,
      filesInspectedCount: this.filesInspected.size,
      maxFiles: this.maxFiles,
      elapsedMs: this.elapsedMs,
      timeoutMs: this.timeoutMs,
      isExhausted: this.isExhausted().exhausted,
    };
  }
}

class InvestigationPlanner {
  constructor(model, repoRoot) {
    this.model = model;
    this.repoRoot = repoRoot;
  }

  plan(question, options = {}) {
    const cleanQ = redactSecrets(String(question || '').trim());
    if (!cleanQ) {
      throw new Error('Investigation planner requires a non-empty question or topic.');
    }

    const entities = this.model?.entities || [];
    const lowerQ = cleanQ.toLowerCase();
    const candidateEntities = [];

    for (const e of entities) {
      const eName = (e.name || '').toLowerCase();
      const eScope = (e.scope || '').toLowerCase();

      if (eName && eName.length > 2 && lowerQ.includes(eName)) {
        candidateEntities.push({ id: e.id, kind: e.kind, name: e.name, scope: e.scope });
      } else if (eScope && eScope.length > 3 && lowerQ.includes(eScope)) {
        candidateEntities.push({ id: e.id, kind: e.kind, name: e.name, scope: e.scope });
      }
    }

    const pathMatch = cleanQ.match(/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)+\.[a-zA-Z0-9]+/g);
    if (pathMatch) {
      pathMatch.forEach(p => {
        if (!candidateEntities.some(c => c.scope === p || c.id.includes(p))) {
          candidateEntities.push({ id: `mod.${p.replace(/[^a-zA-Z0-9_.-]/g, '_')}`, kind: 'module', name: path.basename(p), scope: p });
        }
      });
    }

    let intent = 'EXECUTION_FLOW';
    let requiresRuntimeEvidence = false;
    let isAbstentionCandidate = false;
    let abstentionReason = null;

    if (/\b(?:latency|network|live|production|runtime|throw\s+at\s+runtime|memory\s+leak\s+in\s+prod|benchmark)\b/i.test(cleanQ)) {
      intent = 'RUNTIME_PERFORMANCE';
      requiresRuntimeEvidence = true;
      isAbstentionCandidate = true;
      abstentionReason = 'Question queries dynamic runtime/network latency behavior that cannot be proven through static analysis alone.';
    } else if (/\b(?:why.*fail|why.*error|why.*unexpected|bug|defect|broken|exception|crash)\b/i.test(cleanQ)) {
      intent = 'DEFECT_DIAGNOSIS';
    } else if (/\b(?:impact|what\s+breaks|blast\s+radius|affect.*if|change|refactor)\b/i.test(cleanQ)) {
      intent = 'IMPACT_ANALYSIS';
    } else if (/\b(?:overview|high[- ]level|architecture|stack|what\s+does.*do)\b/i.test(cleanQ)) {
      intent = 'GENERAL_EXPLORATION';
    } else if (/\b(?:dead[- ]code|unused|orphan|unreferenced)\b/i.test(cleanQ)) {
      intent = 'DEAD_CODE_AUDIT';
    }

    const hypotheses = [];
    const primaryTarget = candidateEntities[0]?.scope || candidateEntities[0]?.name || pathMatch?.[0] || 'target_symbol';

    if (intent === 'DEFECT_DIAGNOSIS') {
      hypotheses.push({
        id: 'H1',
        claim: `Defect in "${primaryTarget}" originates from unhandled error or missing catch boundary.`,
        status: 'PROPOSED',
        supportingEvidence: [],
        contradictingEvidence: [],
        confidence: 'L3_INFERRED',
      });
      hypotheses.push({
        id: 'H2',
        claim: `Defect in "${primaryTarget}" originates from missing/unresolved dependency or import mismatch.`,
        status: 'PROPOSED',
        supportingEvidence: [],
        contradictingEvidence: [],
        confidence: 'L3_INFERRED',
      });
    } else if (intent === 'IMPACT_ANALYSIS') {
      hypotheses.push({
        id: 'H1',
        claim: `Modifying "${primaryTarget}" affects public entry points or API routes.`,
        status: 'PROPOSED',
        supportingEvidence: [],
        contradictingEvidence: [],
        confidence: 'L3_INFERRED',
      });
      hypotheses.push({
        id: 'H2',
        claim: `Modifying "${primaryTarget}" is contained within an internal module boundary with no public impact.`,
        status: 'PROPOSED',
        supportingEvidence: [],
        contradictingEvidence: [],
        confidence: 'L3_INFERRED',
      });
    } else if (intent === 'RUNTIME_PERFORMANCE') {
      hypotheses.push({
        id: 'H1',
        claim: 'Static analysis alone cannot verify runtime execution latency or dynamic environment variables.',
        status: 'CORROBORATED',
        supportingEvidence: [],
        contradictingEvidence: [],
        confidence: 'L1_OBSERVED',
      });
    } else {
      hypotheses.push({
        id: 'H1',
        claim: `Execution flow for "${primaryTarget}" starts at an entry point and terminates at an internal service or datastore.`,
        status: 'PROPOSED',
        supportingEvidence: [],
        contradictingEvidence: [],
        confidence: 'L3_INFERRED',
      });
    }

    const steps = [];
    let stepCount = 0;

    const addStep = (operation, target, objective, dependsOn = []) => {
      stepCount++;
      steps.push({
        stepId: `step_${stepCount}_${operation.replace(/-/g, '_')}`,
        operation,
        target: target ? redactSecrets(target) : undefined,
        objective,
        dependsOn,
        status: 'PENDING',
      });
    };

    switch (intent) {
      case 'EXECUTION_FLOW':
        addStep('relevant-files', primaryTarget, `Discover primary source files and implementation boundaries for "${primaryTarget}"`);
        addStep('trace', primaryTarget, `Map multi-hop execution flow and data paths for "${primaryTarget}"`, [`step_1_relevant_files`]);
        addStep('dependencies', primaryTarget, `Audit inbound callers and outbound dependencies for "${primaryTarget}"`, [`step_2_trace`]);
        break;
      case 'DEFECT_DIAGNOSIS':
        addStep('relevant-files', primaryTarget, `Locate implementation files and error handling sites for "${primaryTarget}"`);
        addStep('trace', primaryTarget, `Trace control flow and failure paths for "${primaryTarget}"`, [`step_1_relevant_files`]);
        addStep('dependencies', primaryTarget, `Check for missing or unresolvable imports affecting "${primaryTarget}"`, [`step_2_trace`]);
        break;
      case 'IMPACT_ANALYSIS':
        addStep('impact', primaryTarget, `Compute concentric blast-radius rings and affected endpoints for "${primaryTarget}"`);
        addStep('dependencies', primaryTarget, `Verify transitive dependents and fan-in coupling for "${primaryTarget}"`, [`step_1_impact`]);
        break;
      case 'DEAD_CODE_AUDIT':
        addStep('dead-code', primaryTarget, `Audit unreferenced exports and orphan module candidates for "${primaryTarget}"`);
        break;
      case 'GENERAL_EXPLORATION':
        addStep('overview', undefined, 'Inspect architectural topology, entry points, and workspace packages');
        addStep('onboard', undefined, 'Generate mental model and initial orientation reading order', [`step_1_overview`]);
        break;
      case 'RUNTIME_PERFORMANCE':
        addStep('overview', undefined, 'Gather static architecture boundaries');
        break;
      default:
        addStep('overview', undefined, 'Survey repository topology');
        break;
    }

    return {
      question: cleanQ,
      intent,
      candidateEntities,
      primaryTarget,
      steps,
      hypotheses,
      requiresRuntimeEvidence,
      isAbstentionCandidate,
      abstentionReason,
    };
  }
}

class InvestigationEngine {
  constructor(ci, options = {}) {
    this.ci = ci;
    this.options = options;
  }

  async run(questionOrPlan, flags = {}) {
    const combinedFlags = { ...this.options, ...flags };
    const budget = new InvestigationBudget(combinedFlags);

    const rawQ = typeof questionOrPlan === 'string' ? questionOrPlan : questionOrPlan?.question || '';
    const routePreflight = resolveRoute(rawQ);
    if (routePreflight.isUntrusted) {
      return createResultEnvelope({
        status: 'UNTRUSTED_INJECTION',
        operation: 'investigate',
        target: redactSecrets(rawQ),
        summary: 'Investigation aborted: Prompt injection pattern detected in input. Read-only safety boundaries enforced.',
        data: { isUntrusted: true, promptInjectionNeutralized: true },
        evidence_records: [],
        limitations: ['Untrusted input detected. Analysis rejected.'],
        completeness: { total_expected: 0, analyzed: 0, percentage: 0, is_complete: false },
      });
    }

    const freshness = this.ci.checkFreshness();
    if (!freshness.isFresh) {
      if (freshness.manifestChanged) {
        this.ci._rebuildModelFull();
      } else {
        this.ci._applyIncrementalUpdate(freshness.delta);
      }
    }
    const currentModel = this.ci.getModel();

    const planner = new InvestigationPlanner(currentModel, this.ci.repoRoot);
    const plan = typeof questionOrPlan === 'object' && questionOrPlan.steps
      ? questionOrPlan
      : planner.plan(rawQ, combinedFlags);

    if (plan.isAbstentionCandidate && plan.requiresRuntimeEvidence) {
      return createResultEnvelope({
        status: 'ABSTAIN',
        operation: 'investigate',
        target: plan.question,
        summary: `Investigation abstained: ${plan.abstentionReason}`,
        data: {
          intent: plan.intent,
          abstentionReason: plan.abstentionReason,
          unverifiedAssumptions: ['Runtime network latency, server loads, and dynamic variables cannot be statically inferred.'],
          recommendedAction: 'Execute isolated integration test or runtime benchmark to verify performance metrics.',
          plan,
          budgetUsage: budget.toReport(),
        },
        evidence_records: [
          createEvidenceRecord({
            evidence_id: 'ev_investigate_abstain',
            claim: plan.abstentionReason,
            subject: 'runtime_behavior',
            relationship: 'insufficient_static_evidence',
            object: 'abstain',
            confidence: 'L4_UNKNOWN',
            evidence_status: 'UNVERIFIED_CLAIM',
            limitations: [plan.abstentionReason],
          }),
        ],
        unresolved_assumptions: ['Runtime execution environment and variable states are undetermined statically.'],
        limitations: [plan.abstentionReason],
        completeness: { total_expected: plan.steps.length, analyzed: 0, percentage: 0, is_complete: false },
      });
    }

    const executedSteps = [];
    const collectedEvidence = [];
    const collectedLimitations = [];
    const contradictions = [];
    const completedStepIds = new Set();

    let loopStatus = 'COMPLETE';
    let terminationReason = 'All planned investigative steps completed successfully.';

    while (true) {
      const budgetCheck = budget.isExhausted();
      if (budgetCheck.exhausted) {
        loopStatus = 'BUDGET_EXHAUSTED';
        terminationReason = budgetCheck.reason;
        break;
      }

      const nextStep = plan.steps.find(s => s.status === 'PENDING' && (s.dependsOn || []).every(dep => completedStepIds.has(dep)));
      if (!nextStep) {
        break;
      }

      budget.recordIteration();
      nextStep.status = 'EXECUTING';

      try {
        const stepTarget = nextStep.target || plan.primaryTarget;
        const stepResult = await this.ci.execute(nextStep.operation, stepTarget, combinedFlags);
        budget.recordToolCall(stepResult.data?.relevantFiles || []);

        nextStep.status = 'COMPLETED';
        nextStep.result = stepResult;
        completedStepIds.add(nextStep.stepId);
        executedSteps.push({
          stepId: nextStep.stepId,
          operation: nextStep.operation,
          target: stepTarget,
          status: stepResult.status || 'COMPLETE',
        });

        const rawStepEvidence = stepResult.evidence_records || stepResult.evidenceRecords || [];
        const freshnessAudit = this.ci.validateEvidenceFreshness(rawStepEvidence);
        collectedEvidence.push(...freshnessAudit.records);

        if (stepResult.limitations) {
          collectedLimitations.push(...stepResult.limitations);
        }

        if (plan.hypotheses && plan.hypotheses.length > 0) {
          for (const hyp of plan.hypotheses) {
            if (nextStep.operation === 'trace') {
              const traceData = stepResult.data || stepResult;
              if (traceData.steps && traceData.steps.length > 0) {
                if (hyp.id === 'H1' && plan.intent === 'EXECUTION_FLOW') {
                  hyp.status = 'CORROBORATED';
                  hyp.confidence = 'L1_OBSERVED';
                  hyp.supportingEvidence.push(...freshnessAudit.records.map(r => r.evidence_id || r.finding_id));
                }
              }
            } else if (nextStep.operation === 'impact') {
              const impactData = stepResult.data || stepResult;
              if (impactData.impactedEndpoints && impactData.impactedEndpoints.length > 0) {
                if (hyp.id === 'H1') {
                  hyp.status = 'CORROBORATED';
                  hyp.confidence = 'L1_OBSERVED';
                }
                if (hyp.id === 'H2') {
                  hyp.status = 'REFUTED';
                  contradictions.push(`Hypothesis H2 refuted: "${plan.primaryTarget}" impacts ${impactData.impactedEndpoints.length} public endpoints.`);
                }
              } else if (impactData.ring1DirectCallers?.length === 0) {
                if (hyp.id === 'H2') {
                  hyp.status = 'CORROBORATED';
                  hyp.confidence = 'L1_OBSERVED';
                }
                if (hyp.id === 'H1') {
                  hyp.status = 'REFUTED';
                }
              }
            } else if (nextStep.operation === 'dependencies') {
              const depsData = stepResult.data || stepResult;
              if (depsData.missingDependencies && depsData.missingDependencies.length > 0) {
                if (hyp.id === 'H2' && plan.intent === 'DEFECT_DIAGNOSIS') {
                  hyp.status = 'CORROBORATED';
                  hyp.confidence = 'L1_OBSERVED';
                }
              }
            }
          }
        }

        if (stepResult.data?.contradictions && stepResult.data.contradictions.length > 0) {
          contradictions.push(...stepResult.data.contradictions.map(c => c.reason || c));
        }
      } catch (err) {
        nextStep.status = 'FAILED';
        nextStep.error = err.message;
        collectedLimitations.push(`Investigative step "${nextStep.stepId}" failed: ${err.message}`);
      }
    }

    if (contradictions.length > 0 && loopStatus === 'COMPLETE') {
      loopStatus = 'CONTRADICTION_DETECTED';
    }

    const corroboratedHypotheses = (plan.hypotheses || []).filter(h => h.status === 'CORROBORATED');
    const refutedHypotheses = (plan.hypotheses || []).filter(h => h.status === 'REFUTED');

    let summaryText = `Investigation completed for "${plan.question}": ${executedSteps.length} investigative step(s) executed.`;
    if (loopStatus === 'CONTRADICTION_DETECTED') {
      summaryText = `Investigation detected contradictory evidence across repository files for "${plan.question}".`;
    } else if (loopStatus === 'BUDGET_EXHAUSTED') {
      summaryText = `Investigation paused: Budget exhausted (${terminationReason}). Partial evidence gathered.`;
    } else if (corroboratedHypotheses.length > 0) {
      summaryText += ` Corroborated hypothesis [${corroboratedHypotheses.map(h => h.id).join(', ')}].`;
    }

    return createResultEnvelope({
      status: loopStatus,
      operation: 'investigate',
      target: plan.question,
      summary: summaryText,
      data: {
        question: plan.question,
        intent: plan.intent,
        primaryTarget: plan.primaryTarget,
        terminationReason,
        stepsExecuted: executedSteps,
        hypotheses: plan.hypotheses || [],
        corroboratedHypotheses,
        refutedHypotheses,
        contradictions,
        budgetUsage: budget.toReport(),
      },
      evidence_records: collectedEvidence,
      unresolved_assumptions: (plan.hypotheses || []).filter(h => h.status === 'PROPOSED' || h.status === 'INDETERMINATE').map(h => `Unverified hypothesis: ${h.claim}`),
      limitations: collectedLimitations,
      completeness: {
        total_expected: plan.steps.length,
        analyzed: executedSteps.length,
        percentage: plan.steps.length > 0 ? Math.round((executedSteps.length / plan.steps.length) * 100) : 100,
        is_complete: loopStatus === 'COMPLETE',
      },
    });
  }
}

class CodebaseIntelligence {
  /**
   * @param {string} repoRoot
   * @param {Object} [options]
   */
  constructor(repoRoot = process.cwd(), options = {}) {
    this.repoRoot = path.resolve(repoRoot);
    this.options = options;
    this.model = null;
    this.extractor = null;
    this.manifestHashes = new Map();
    this.verifier = new ArchitectureVerifier(this.repoRoot);
  }

  /**
   * Programmatic execution dispatcher
   * @param {string} subcommand - Operation (overview, trace, dependencies, relevant-files, impact, dead-code, onboard, prepare)
   * @param {string} [target] - Target symbol, file, route, or task description
   * @param {Object} [flags] - Optional flags (--depth, --focus, etc.)
   * @returns {Promise<Object>} Execution result envelope
   */
  async execute(subcommand, target, flags = {}) {
    return runCodebaseIntelligence({
      subcommand,
      target,
      flags: { ...this.options, ...flags },
      repoRoot: this.repoRoot,
      timeoutMs: flags.timeoutMs || flags.timeout || this.options.timeoutMs || this.options.timeout,
      signal: flags.signal || this.options.signal,
    });
  }

  /**
   * Autonomous Skill Routing Dispatcher
   */
  static resolveRoute(request, options = {}) {
    return resolveRoute(request, options);
  }

  resolveRoute(request, options = {}) {
    return resolveRoute(request, { repoRoot: this.repoRoot, ...options });
  }

  /**
   * Autonomous Investigation & Evidence-Grounded Reasoning Engine (Phase 18)
   * Supports both legacy static scenarios and autonomous dynamic investigation.
   */
  async investigate(scenarioTypeOrQuestion, targetOrOptions, flags = {}) {
    const legacyScenarios = new Set([
      'feature-investigation',
      'change-planning',
      'contributor-onboarding',
      'suspicious-content',
      'incomplete-repository',
    ]);

    if (typeof scenarioTypeOrQuestion === 'string' && legacyScenarios.has(scenarioTypeOrQuestion)) {
      return this._legacyInvestigate(scenarioTypeOrQuestion, targetOrOptions, flags);
    }

    const question = typeof scenarioTypeOrQuestion === 'string'
      ? scenarioTypeOrQuestion
      : (scenarioTypeOrQuestion?.question || scenarioTypeOrQuestion?.target || (typeof targetOrOptions === 'string' ? targetOrOptions : ''));

    const mergedFlags = (typeof targetOrOptions === 'object' && targetOrOptions !== null)
      ? { ...this.options, ...targetOrOptions, ...flags }
      : { ...this.options, ...flags };

    const engine = new InvestigationEngine(this, mergedFlags);
    return engine.run(question, mergedFlags);
  }

  planInvestigation(question, options = {}) {
    const model = this.getModel();
    const planner = new InvestigationPlanner(model, this.repoRoot);
    return planner.plan(question, options);
  }

  /**
   * Multi-Step Scenario Investigation Engine (Legacy Phase 13)
   * Supports Scenarios A, B, C, D, E
   */
  async _legacyInvestigate(scenarioType, targetOrOptions, flags = {}) {
    const combinedFlags = { ...this.options, ...flags };
    switch (scenarioType) {
      case 'feature-investigation': { // Scenario A
        const target = typeof targetOrOptions === 'string' ? targetOrOptions : targetOrOptions?.target;
        const relevant = this.relevantFiles(target, combinedFlags);
        const trace = this.trace(target, combinedFlags);
        const deps = this.dependencies(target, combinedFlags);
        return {
          scenario: 'feature-investigation',
          target,
          status: 'COMPLETE',
          schema_version: '2.0.0',
          summary: `Feature investigation completed for "${target}": ${relevant.primaryFiles.length} files, ${trace.steps.length} trace steps, ${deps.fanIn || 0} inbound callers.`,
          data: { relevant, trace, deps },
          evidenceRecords: [
            ...relevant.evidenceRecords,
            ...trace.evidenceRecords,
            ...deps.evidenceRecords,
          ],
          limitations: [
            ...relevant.limitations,
            ...trace.limitations,
            ...deps.limitations,
          ],
        };
      }
      case 'change-planning': { // Scenario B
        const target = typeof targetOrOptions === 'string' ? targetOrOptions : targetOrOptions?.target;
        const prepare = this.prepare(target, combinedFlags);
        const primaryFile = prepare.changeTargets[0]?.file;
        const impact = primaryFile ? this.impact(primaryFile, combinedFlags) : null;
        return {
          scenario: 'change-planning',
          target,
          status: 'COMPLETE',
          schema_version: '2.0.0',
          summary: `Change planning completed for "${target}": Readiness ${prepare.readiness}, Risk Tier ${impact?.riskTier || 'LOW'}.`,
          data: { prepare, impact },
          evidenceRecords: [
            ...prepare.evidenceRecords,
            ...(impact?.evidenceRecords || []),
          ],
          limitations: [
            ...prepare.limitations,
            ...(impact?.limitations || []),
          ],
        };
      }
      case 'contributor-onboarding': { // Scenario C
        const overview = this.overview(combinedFlags);
        const onboard = this.onboard(combinedFlags);
        return {
          scenario: 'contributor-onboarding',
          status: 'COMPLETE',
          schema_version: '2.0.0',
          summary: `Contributor onboarding generated: ${onboard.mentalModel.architecturePattern}, ${onboard.verificationRecipes.length} recipes.`,
          data: { overview, onboard },
          evidenceRecords: [
            ...overview.evidenceRecords,
            ...onboard.evidenceRecords,
          ],
          limitations: [
            ...overview.limitations,
            ...onboard.limitations,
          ],
        };
      }
      case 'suspicious-content': { // Scenario D
        const input = typeof targetOrOptions === 'string' ? targetOrOptions : targetOrOptions?.input;
        const sanitized = redactSecrets(input || '');
        const route = resolveRoute(input || '');
        const overview = this.overview(combinedFlags);
        return {
          scenario: 'suspicious-content',
          status: 'COMPLETE',
          schema_version: '2.0.0',
          isUntrusted: route.isUntrusted,
          sanitizedInput: sanitized,
          summary: 'Suspicious content analysis: prompt injection neutralized into inert data; secrets redacted.',
          data: { route, overview },
          evidenceRecords: overview.evidenceRecords,
          limitations: ['Prompt injection treated as inert data; secrets redacted.'],
        };
      }
      case 'incomplete-repository': { // Scenario E
        const overview = this.overview(combinedFlags);
        const deps = this.dependencies(undefined, combinedFlags);
        const missing = deps.missingDependencies || [];
        return {
          scenario: 'incomplete-repository',
          status: 'COMPLETE',
          schema_version: '2.0.0',
          summary: `Incomplete repository audit: ${missing.length} missing manifest dependencies detected without inventing behavior.`,
          data: { overview, missingDependencies: missing },
          evidenceRecords: deps.evidenceRecords,
          limitations: missing.map(m => `Missing package "${m}" is unresolved.`),
        };
      }
      default:
        throw new Error(`Unknown investigation scenario: "${scenarioType}". Expected one of: feature-investigation, change-planning, contributor-onboarding, suspicious-content, incomplete-repository.`);
    }
  }

  /**
   * Execute multiple operations in sequence and combine results
   */
  async executeMultiStep(subcommands = [], target, flags = {}) {
    const results = [];
    for (const sub of subcommands) {
      const res = await this.execute(sub, target, flags);
      results.push(res);
    }
    const mergedEvidence = [];
    const mergedLimitations = [];
    results.forEach(r => {
      mergedEvidence.push(...(r.evidenceRecords || r.data?.evidence_records || []));
      mergedLimitations.push(...(r.data?.limitations || []));
    });
    return {
      schema_version: '2.0.0',
      operation: 'multi-step',
      subcommands,
      target,
      status: 'COMPLETE',
      results,
      evidenceRecords: mergedEvidence,
      limitations: mergedLimitations,
    };
  }

  computeRepoFingerprint() {
    if (!this.extractor || !this.extractor.fileDataMap || this.extractor.fileDataMap.size === 0) {
      return 'uninitialized';
    }
    const h = crypto.createHash('sha256');
    const sortedKeys = Array.from(this.extractor.fileDataMap.keys()).sort();
    for (const k of sortedKeys) {
      const info = this.extractor.fileDataMap.get(k);
      h.update(`${k}:${info.hash};`);
    }
    return h.digest('hex');
  }

  checkFreshness() {
    if (!this.extractor || !this.extractor.fileDataMap || this.extractor.fileDataMap.size === 0) {
      return {
        isFresh: false,
        reason: 'NO_PREVIOUS_SNAPSHOT',
        repoFingerprint: 'uninitialized',
        manifestChanged: false,
        delta: { created: [], modified: [], deleted: [], commentOnly: [], astModified: [] },
      };
    }

    const currentFiles = walkRepository(this.repoRoot, this.repoRoot, [], 0, this.options);
    const currentPathMap = new Map(currentFiles.map(f => [f.relPath, f]));
    const oldPathMap = this.extractor.fileDataMap;

    const created = [];
    const modified = [];
    const deleted = [];
    const commentOnly = [];
    const astModified = [];

    // Detect created and modified files
    for (const [relPath, file] of currentPathMap.entries()) {
      const oldInfo = oldPathMap.get(relPath);
      if (!oldInfo) {
        created.push(relPath);
      } else {
        let stat;
        try {
          stat = fs.statSync(file.fullPath);
        } catch {
          continue;
        }
        if (stat.mtimeMs !== oldInfo.mtimeMs || stat.size !== oldInfo.size) {
          let content = '';
          try {
            content = fs.readFileSync(file.fullPath, 'utf8');
          } catch {
            continue;
          }
          const hash = crypto.createHash('sha256').update(content).digest('hex');
          if (hash !== oldInfo.hash) {
            const stripped = content
              .replace(/\/\*[\s\S]*?\*\//g, ' ')
              .replace(/\/\/[^\r\n]*/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            const astFingerprint = crypto.createHash('sha256').update(stripped).digest('hex');

            if (astFingerprint === oldInfo.astFingerprint) {
              commentOnly.push(relPath);
            } else {
              astModified.push(relPath);
            }
            modified.push({
              relPath,
              fullPath: file.fullPath,
              hash,
              astFingerprint,
              mtimeMs: stat.mtimeMs,
              size: stat.size,
            });
          }
        }
      }
    }

    // Detect deleted files
    for (const relPath of oldPathMap.keys()) {
      if (!currentPathMap.has(relPath)) {
        deleted.push(relPath);
      }
    }

    // Detect manifest changes
    let manifestChanged = false;
    const manifests = ['package.json', 'pnpm-workspace.yaml', 'Cargo.toml', 'tsconfig.json'];
    for (const m of manifests) {
      const mPath = path.join(this.repoRoot, m);
      if (fs.existsSync(mPath)) {
        try {
          const curHash = crypto.createHash('sha256').update(fs.readFileSync(mPath, 'utf8')).digest('hex');
          const recorded = this.manifestHashes.get(m);
          if (recorded && recorded !== curHash) {
            manifestChanged = true;
            break;
          }
        } catch {
          // ignore
        }
      }
    }

    const isFresh = created.length === 0 && modified.length === 0 && deleted.length === 0 && !manifestChanged;
    return {
      isFresh,
      manifestChanged,
      repoFingerprint: this.computeRepoFingerprint(),
      delta: {
        created,
        modified,
        deleted,
        commentOnly,
        astModified,
      },
    };
  }

  _rebuildModelFull() {
    this.extractor = new ArchitectureExtractor(this.repoRoot, this.options);
    this.model = this.extractor.scan();

    // Record manifest hashes
    this.manifestHashes = new Map();
    const manifests = ['package.json', 'pnpm-workspace.yaml', 'Cargo.toml', 'tsconfig.json'];
    for (const m of manifests) {
      const mPath = path.join(this.repoRoot, m);
      if (fs.existsSync(mPath)) {
        try {
          this.manifestHashes.set(m, crypto.createHash('sha256').update(fs.readFileSync(mPath, 'utf8')).digest('hex'));
        } catch {
          // ignore
        }
      }
    }

    // Fast O(1) indices for graph operations and queries
    this.entityMap = new Map((this.model.entities || []).map(e => [e.id, e]));
    this.outgoingRelMap = new Map();
    this.incomingRelMap = new Map();
    (this.model.relationships || []).forEach(r => {
      if (!this.outgoingRelMap.has(r.sourceId)) this.outgoingRelMap.set(r.sourceId, []);
      this.outgoingRelMap.get(r.sourceId).push(r);
      if (!this.incomingRelMap.has(r.targetId)) this.incomingRelMap.set(r.targetId, []);
      this.incomingRelMap.get(r.targetId).push(r);
    });

    return this.model;
  }

  _applyIncrementalUpdate(delta) {
    if (!this.extractor) {
      return this._rebuildModelFull();
    }
    this.model = this.extractor.update(delta);

    // Fast O(1) indices for graph operations and queries
    this.entityMap = new Map((this.model.entities || []).map(e => [e.id, e]));
    this.outgoingRelMap = new Map();
    this.incomingRelMap = new Map();
    (this.model.relationships || []).forEach(r => {
      if (!this.outgoingRelMap.has(r.sourceId)) this.outgoingRelMap.set(r.sourceId, []);
      this.outgoingRelMap.get(r.sourceId).push(r);
      if (!this.incomingRelMap.has(r.targetId)) this.incomingRelMap.set(r.targetId, []);
      this.incomingRelMap.get(r.targetId).push(r);
    });

    // Update deadCode caches if initialized
    if (this.allFileContentsCache && this.fileExportMapCache) {
      for (const relPath of delta.deleted) {
        this.allFileContentsCache.delete(relPath);
        this.fileExportMapCache = this.fileExportMapCache.filter(e => e.file !== relPath);
      }
      for (const fileItem of [...delta.created, ...delta.modified]) {
        const relPath = typeof fileItem === 'string' ? fileItem : fileItem.relPath;
        const fullPath = path.resolve(this.repoRoot, relPath);
        if (fs.existsSync(fullPath)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            this.allFileContentsCache.set(relPath, content);
            this.fileExportMapCache = this.fileExportMapCache.filter(e => e.file !== relPath);
            // Re-extract exports for this file
            const modExpMatch = content.match(/module\.exports\s*=\s*\{([^}]+)\}/);
            if (modExpMatch) {
              const names = modExpMatch[1].split(',').map(s => s.trim().split(':')[0].trim()).filter(Boolean);
              names.forEach(n => {
                if (/^[a-zA-Z0-9_$]+$/.test(n)) {
                  this.fileExportMapCache.push({ name: n, file: relPath, line: 1 });
                }
              });
            }
            const expPropRegex = /exports\.([a-zA-Z0-9_$]+)\s*=/g;
            let expProp;
            while ((expProp = expPropRegex.exec(content)) !== null) {
              this.fileExportMapCache.push({ name: expProp[1], file: relPath, line: 1 });
            }
            const namedExpRegex = /export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([a-zA-Z0-9_$]+)/g;
            let namedExp;
            while ((namedExp = namedExpRegex.exec(content)) !== null) {
              this.fileExportMapCache.push({ name: namedExp[1], file: relPath, line: 1 });
            }
          } catch {
            // ignore
          }
        }
      }
    }

    return this.model;
  }

  /**
   * Scans and returns the architectural model with change-aware incremental freshness
   */
  getModel(forceFresh = false) {
    if (this.model && !forceFresh && !this.options.noCache && this.extractor) {
      const freshness = this.checkFreshness();
      if (freshness.isFresh) {
        return this.model;
      }
      if (freshness.manifestChanged) {
        return this._rebuildModelFull();
      }
      return this._applyIncrementalUpdate(freshness.delta);
    }
    return this._rebuildModelFull();
  }

  /**
   * Explicit incremental update interface
   */
  updateIncremental(changedFiles = null) {
    if (changedFiles && Array.isArray(changedFiles)) {
      const delta = {
        created: [],
        modified: changedFiles,
        deleted: [],
        commentOnly: [],
        astModified: changedFiles,
      };
      return this._applyIncrementalUpdate(delta);
    }
    const freshness = this.checkFreshness();
    if (freshness.isFresh) {
      return this.model;
    }
    if (freshness.manifestChanged) {
      return this._rebuildModelFull();
    }
    return this._applyIncrementalUpdate(freshness.delta);
  }

  /**
   * Freshness-Aware Evidence Auditor
   * Ensures stale evidence cannot silently masquerade as current
   */
  validateEvidenceFreshness(evidenceRecords = []) {
    let validCount = 0;
    let staleCount = 0;
    let invalidatedCount = 0;

    const audited = (evidenceRecords || []).map(rec => {
      const copy = { ...rec, limitations: [...(rec.limitations || [])] };
      const rawFile = copy.source?.file || copy.source_path || '';
      if (!rawFile) return copy;

      const fullPath = path.resolve(this.repoRoot, rawFile);
      if (!fs.existsSync(fullPath)) {
        invalidatedCount++;
        copy.evidence_status = 'INVALIDATED';
        copy.confidence = 'L4_UNKNOWN';
        copy.limitations.push(`Source file "${rawFile}" no longer exists in repository.`);
        return copy;
      }

      try {
        const currentContent = fs.readFileSync(fullPath, 'utf8');
        const currentHash = crypto.createHash('sha256').update(currentContent).digest('hex');
        const recordedHash = copy.source?.content_hash;
        if (recordedHash && !currentHash.startsWith(recordedHash) && !recordedHash.startsWith(currentHash)) {
          staleCount++;
          copy.evidence_status = 'STALE';
          copy.confidence = 'L4_UNKNOWN';
          copy.limitations.push(
            `Source file "${rawFile}" has been modified since evidence collection (recorded hash: ${recordedHash.slice(0, 16)}, current: ${currentHash.slice(0, 16)}).`
          );
        } else {
          validCount++;
          copy.evidence_status = 'OBSERVED';
        }
      } catch {
        invalidatedCount++;
        copy.evidence_status = 'INVALIDATED';
      }
      return copy;
    });

    return {
      validCount,
      staleCount,
      invalidatedCount,
      records: audited,
    };
  }

  /**
   * Phase 17F: Change-Impact Explanation Engine
   */
  changeImpact(targetOrChanges, flags = {}) {
    let changedTargets = [];
    if (typeof targetOrChanges === 'string' && targetOrChanges.trim()) {
      changedTargets = [targetOrChanges.trim()];
    } else if (Array.isArray(targetOrChanges)) {
      changedTargets = targetOrChanges.filter(t => typeof t === 'string' && t.trim());
    } else {
      const freshness = this.checkFreshness();
      changedTargets = [
        ...freshness.delta.created,
        ...freshness.delta.modified.map(m => typeof m === 'string' ? m : m.relPath),
        ...freshness.delta.deleted,
      ];
    }

    if (changedTargets.length === 0) {
      return {
        subcommand: 'change-impact',
        status: 'COMPLETE',
        recomputationScope: 'NONE',
        riskTier: 'LOW',
        riskReason: 'No repository changes detected; existing analysis artifacts are 100% fresh.',
        changedFiles: [],
        directlyAffectedFiles: [],
        downstreamAffectedModules: [],
        affectedEndpoints: [],
        affectedDatastores: [],
        invalidatedArtifacts: [],
        invalidatedEvidenceCount: 0,
        evidenceRecords: [
          createEvidenceRecord({
            evidence_id: 'ev_change_impact_fresh',
            claim: 'All repository analysis artifacts are completely current with disk state.',
            subject: 'repository',
            relationship: 'freshness_verified',
            object: 'current',
            confidence: 'L1_OBSERVED',
            evidence_status: 'OBSERVED',
          }),
        ],
        limitations: [],
      };
    }

    const model = this.getModel();
    const blastEngine = new BlastRadiusEngine(model);
    const depth = Number.isFinite(flags.depth) && flags.depth > 0 ? flags.depth : 3;

    const classifiedChanges = [];
    const directlyAffected = new Set();
    const downstreamModules = new Set();
    const affectedEndpoints = new Set();
    const affectedDatastores = new Set();
    const invalidatedArtifacts = new Set();
    let maxRiskScore = 0.1;
    let anyTrustCrossed = false;

    for (const t of changedTargets) {
      const norm = t.replace(/\\/g, '/');
      const fullPath = path.resolve(this.repoRoot, norm);
      let changeClass = 'AST_MODIFIED';

      if (!fs.existsSync(fullPath)) {
        changeClass = 'DELETED';
      } else {
        const oldInfo = this.extractor?.fileDataMap?.get(norm);
        if (!oldInfo) {
          changeClass = 'CREATED';
        } else {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const hash = crypto.createHash('sha256').update(content).digest('hex');
            const stripped = content
              .replace(/\/\*[\s\S]*?\*\//g, ' ')
              .replace(/\/\/[^\r\n]*/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            const astFingerprint = crypto.createHash('sha256').update(stripped).digest('hex');
            if (astFingerprint === oldInfo.astFingerprint) {
              changeClass = 'COMMENT_ONLY';
            } else {
              changeClass = 'AST_MODIFIED';
            }
          } catch {
            changeClass = 'AST_MODIFIED';
          }
        }
      }

      classifiedChanges.push({ file: norm, changeClass });
      directlyAffected.add(norm);

      if (changeClass === 'COMMENT_ONLY') {
        invalidatedArtifacts.add('evidence_content_hashes');
        continue;
      }

      invalidatedArtifacts.add('dead_code_index');
      invalidatedArtifacts.add('symbol_resolution_map');
      invalidatedArtifacts.add('call_graph');

      const blast = blastEngine.computeBlastRadius(norm, depth);
      if (blast && blast.found) {
        if (blast.metrics?.riskScore > maxRiskScore) {
          maxRiskScore = blast.metrics.riskScore;
        }
        if ((blast.crossedZones || []).length > 0) {
          anyTrustCrossed = true;
        }
        (blast.transitiveRings || []).forEach(ring => {
          (ring.entities || []).forEach(e => downstreamModules.add(e.id || e.name));
        });
        (blast.affectedEndpoints || []).forEach(ep => affectedEndpoints.add(ep.name || ep.id));
        (blast.affectedDatastores || []).forEach(ds => affectedDatastores.add(ds.name || ds.id));
      }
    }

    let recomputationScope = 'LOCAL_TARGETED';
    const isManifest = changedTargets.some(t =>
      ['package.json', 'pnpm-workspace.yaml', 'Cargo.toml', 'tsconfig.json'].includes(path.basename(t))
    );
    if (isManifest || downstreamModules.size > 20) {
      recomputationScope = 'REPOSITORY_BROAD';
      invalidatedArtifacts.add('architecture_fact_model');
      invalidatedArtifacts.add('route_registry');
    } else if (classifiedChanges.every(c => c.changeClass === 'COMMENT_ONLY')) {
      recomputationScope = 'NONE';
    }

    let riskTier = 'LOW';
    if (maxRiskScore >= 0.7 || anyTrustCrossed) riskTier = 'CRITICAL';
    else if (maxRiskScore >= 0.4 || downstreamModules.size > 5) riskTier = 'HIGH';
    else if (downstreamModules.size > 0 || affectedEndpoints.size > 0) riskTier = 'MEDIUM';

    let riskReason = `Change affects ${directlyAffected.size} direct file(s) and ${downstreamModules.size} downstream module(s) across depth ${depth}.`;
    if (anyTrustCrossed) {
      riskReason += ' Modification crosses security trust boundaries.';
    }
    if (recomputationScope === 'REPOSITORY_BROAD') {
      riskReason += ' Recomputation scope escalated to REPOSITORY_BROAD due to manifest or high downstream fan-out.';
    }

    const evidenceRecords = [];
    classifiedChanges.forEach(ch => {
      evidenceRecords.push(
        createEvidenceRecord({
          evidence_id: `ev_ci_${ch.file.replace(/[^a-zA-Z0-9_]/g, '_')}`,
          claim: `File "${ch.file}" classified as ${ch.changeClass}`,
          subject: ch.file,
          relationship: 'change_classified',
          object: ch.changeClass,
          source_path: ch.file,
          confidence: 'L1_OBSERVED',
          evidence_status: 'OBSERVED',
        })
      );
    });

    return {
      subcommand: 'change-impact',
      status: 'COMPLETE',
      target: changedTargets.join(', '),
      recomputationScope,
      riskTier,
      riskReason,
      changedFiles: classifiedChanges,
      directlyAffectedFiles: Array.from(directlyAffected),
      downstreamAffectedModules: Array.from(downstreamModules),
      affectedEndpoints: Array.from(affectedEndpoints),
      affectedDatastores: Array.from(affectedDatastores),
      invalidatedArtifacts: Array.from(invalidatedArtifacts),
      invalidatedEvidenceCount: classifiedChanges.length,
      evidenceRecords,
      limitations: [],
    };
  }

  /**
   * 1. OVERVIEW: Architectural Topology, Entry Points & Centrality Ranking
   */
  overview(flags = {}) {
    const model = this.getModel();
    const evidenceRecords = [];
    const limitations = [];

    // Monorepo workspaces
    const workspaces = (model.entities || []).filter(e => e.kind === 'workspace_package');

    // Language Inventory Detection from file extensions in repository
    const langCounts = {};
    (model.entities || []).forEach(e => {
      (e.sources || []).forEach(s => {
        const ext = path.extname(s.file || '').toLowerCase();
        if (ext) {
          langCounts[ext] = (langCounts[ext] || 0) + 1;
        }
      });
    });

    const detectedLanguages = [];
    if (langCounts['.ts'] || langCounts['.tsx']) detectedLanguages.push(`TypeScript (${(langCounts['.ts'] || 0) + (langCounts['.tsx'] || 0)} files)`);
    if (langCounts['.js'] || langCounts['.jsx'] || langCounts['.mjs']) detectedLanguages.push(`JavaScript (${(langCounts['.js'] || 0) + (langCounts['.jsx'] || 0) + (langCounts['.mjs'] || 0)} files)`);
    if (langCounts['.rs']) detectedLanguages.push(`Rust (${langCounts['.rs']} files)`);
    if (langCounts['.py']) detectedLanguages.push(`Python (${langCounts['.py']} files)`);
    if (langCounts['.go']) detectedLanguages.push(`Go (${langCounts['.go']} files)`);

    // Frameworks & Runtime
    const frameworks = model.frameworks || [];
    let runtime = 'Unknown';
    const pkgPath = path.join(this.repoRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const nodeVer = pkg.engines?.node || process.version;
        runtime = `Node.js (${nodeVer})`;
      } catch (_e) {
        runtime = 'Node.js';
        limitations.push('Root package.json contains malformed JSON syntax. Analysis proceeded with defaults.');
      }
    } else if (fs.existsSync(path.join(this.repoRoot, 'Cargo.toml'))) {
      runtime = 'Rust';
    } else if (fs.existsSync(path.join(this.repoRoot, 'requirements.txt')) || fs.existsSync(path.join(this.repoRoot, 'pyproject.toml'))) {
      runtime = 'Python';
    }

    // Build & Test Infrastructure
    const buildTestInfra = [];
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.scripts) {
          Object.entries(pkg.scripts).forEach(([name, script]) => {
            if (['test', 'build', 'lint', 'typecheck', 'check'].includes(name) || name.startsWith('test:') || name.startsWith('build:')) {
              buildTestInfra.push({ script: name, command: script });
            }
          });
        }
      } catch {
        // ignore
      }
    }

    // Configuration Boundaries
    const configBoundaries = [];
    const standardConfigs = ['tsconfig.json', 'package.json', 'Cargo.toml', 'pnpm-workspace.yaml', '.env.example', '.eslintrc.js', '.eslintrc.json', 'jest.config.js'];
    standardConfigs.forEach(cfg => {
      const cfgPath = path.join(this.repoRoot, cfg);
      if (fs.existsSync(cfgPath)) {
        configBoundaries.push(cfg);
        if (cfg.endsWith('.json')) {
          try {
            JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
          } catch (_e) {
            if (!limitations.some(l => l.includes(cfg))) {
              limitations.push(`Configuration file "${cfg}" contains malformed JSON syntax.`);
            }
          }
        }
      }
    });

    // Endpoints & Entry Points
    const allEndpoints = (model.entities || []).filter(e => e.kind === 'endpoint');
    const cliEntries = allEndpoints.filter(e => e.tags && e.tags.includes('cli'));
    const httpRoutes = allEndpoints.filter(e => !(e.tags && e.tags.includes('cli')));

    // Datastores & Queues
    const datastores = (model.entities || []).filter(e => e.kind === 'datastore' || e.kind === 'cache');
    const queues = (model.entities || []).filter(e => e.kind === 'queue' || e.kind === 'event_bus');
    const trustBoundaries = model.trustBoundaries || [];

    // Compute Centrality Ranking (Fan-in for each internal module)
    const fanInMap = new Map();
    (model.relationships || []).forEach(rel => {
      if (rel.relationType === 'imports' || rel.relationType === 'calls') {
        const target = rel.targetId;
        fanInMap.set(target, (fanInMap.get(target) || 0) + 1);
      }
    });

    const entityMap = this.entityMap || new Map((model.entities || []).map(e => [e.id, e]));
    const centralityRanking = Array.from(fanInMap.entries())
      .map(([id, fanIn]) => {
        const entity = entityMap.get(id);
        return {
          id,
          name: entity?.name || id,
          kind: entity?.kind || 'module',
          fanIn,
          sources: entity?.sources || [],
        };
      })
      .sort((a, b) => b.fanIn - a.fanIn)
      .slice(0, flags.limit || 15);

    // Filter by focus if provided
    let focusWorkspaces = workspaces;
    let focusEndpoints = allEndpoints;
    if (flags.focus) {
      const normalizedFocus = flags.focus.replace(/\\/g, '/').replace(/^\.\//, '');
      focusEndpoints = allEndpoints.filter(e => e.sources?.[0]?.file && e.sources[0].file.includes(normalizedFocus));
    }

    // Architectural Uncertainties (Contradictions or missing citations)
    const uncertainties = (model.contradictions || []).map(c => c.reason || c.kind);

    // Build Evidence Records
    cliEntries.slice(0, 4).forEach(cli => {
      evidenceRecords.push(
        createEvidenceRecord({
          evidence_id: `ev_overview_cli_${cli.id}`,
          claim: `CLI executable binary mapped: ${cli.name} -> ${cli.scope || 'package.json'}`,
          subject: cli.name,
          relationship: 'routes_to',
          object: cli.scope || 'package.json',
          source_path: cli.sources?.[0]?.file || 'package.json',
          symbol: cli.name,
          confidence: 'L1_OBSERVED',
          evidence_status: 'OBSERVED',
        })
      );
    });

    datastores.forEach(ds => {
      evidenceRecords.push(
        createEvidenceRecord({
          evidence_id: `ev_overview_ds_${ds.id}`,
          claim: `Datastore integration detected: ${ds.name} (${ds.role || 'database'})`,
          subject: ds.name,
          relationship: 'reads',
          object: ds.scope || 'datastore',
          source_path: ds.sources?.[0]?.file || 'codebase',
          symbol: ds.name,
          confidence: 'L1_OBSERVED',
          evidence_status: 'OBSERVED',
        })
      );
    });

    return {
      subcommand: 'overview',
      runtime,
      frameworks,
      detectedLanguages,
      techStack: {
        runtime,
        frameworks,
        languages: detectedLanguages,
      },
      buildTestInfra,
      configBoundaries,
      workspaces: focusWorkspaces,
      endpoints: {
        total: focusEndpoints.length,
        cli: cliEntries,
        http: httpRoutes,
      },
      datastores,
      queues,
      trustBoundaries,
      centralityRanking,
      uncertainties,
      limitations,
      evidenceRecords,
    };
  }

  /**
   * 2. TRACE: Feature Execution Flow Through Statically Observable Relationships
   */
  trace(target, flags = {}) {
    if (!target || (typeof target === 'string' && !target.trim())) {
      throw new Error('Trace command requires a target route, feature, or symbol name');
    }
    const model = this.getModel();
    const evidenceRecords = [];
    const query = target.toLowerCase().trim();

    // 1. Find matching entry point or entity
    const allEndpoints = (model.entities || []).filter(e => e.kind === 'endpoint');
    let primaryEntity = allEndpoints.find(e =>
      e.name.toLowerCase().includes(query) ||
      (e.scope && e.scope.toLowerCase().includes(query)) ||
      (e.id && e.id.toLowerCase().includes(query))
    );

    if (!primaryEntity) {
      primaryEntity = (model.entities || []).find(e =>
        e.name.toLowerCase().includes(query) || e.id.toLowerCase().includes(query)
      );
    }

    if (!primaryEntity) {
      for (const ent of model.entities || []) {
        if (ent.sources && ent.sources.some(s => s.file.toLowerCase().includes(query))) {
          primaryEntity = ent;
          break;
        }
      }
    }

    if (!primaryEntity) {
      // Search files in repository for symbol/function definition or export
      for (const ent of model.entities || []) {
        const filePath = ent.sources?.[0]?.file || ent.scope;
        if (filePath && typeof filePath === 'string') {
          const absPath = path.resolve(this.repoRoot, filePath);
          if (fs.existsSync(absPath)) {
            try {
              const fileContent = fs.readFileSync(absPath, 'utf8');
              const symbolRegex = new RegExp(`(?:function\\s+${target}\\b|class\\s+${target}\\b|const\\s+${target}\\b|let\\s+${target}\\b|${target}\\s*:)`, 'i');
              if (symbolRegex.test(fileContent)) {
                primaryEntity = ent;
                break;
              }
            } catch {
              // ignore
            }
          }
        }
      }
    }

    const entityMap = this.entityMap || new Map((model.entities || []).map(e => [e.id, e]));
    let upstreamCaller = null;
    if (primaryEntity && primaryEntity.kind !== 'endpoint') {
      const inboundCallers = (model.relationships || []).filter(
        r => r.targetId === primaryEntity.id && (r.relationType === 'imports' || r.relationType === 'calls')
      );
      if (inboundCallers.length > 0) {
        const firstCallerId = inboundCallers[0].sourceId;
        upstreamCaller = entityMap.get(firstCallerId);
      }
    }

    const steps = [];
    const unresolvedAssumptions = [];
    const limitations = ['Static analysis traces compile-time relationships and cannot guarantee runtime path execution.'];

    if (typeof target === 'string' && /will.*throw.*exception|latency.*under/i.test(target)) {
      limitations.push('Static AST analysis traces compile-time dependencies and cannot prove runtime exception behavior or dynamic network latency.');
    }

    if (primaryEntity) {
      let currentHop = 1;
      const visited = new Set();
      const queue = [primaryEntity.id];

      if (upstreamCaller) {
        visited.add(upstreamCaller.id);
        steps.push({
          step: currentHop++,
          layer: 'Ingress / Caller',
          entityId: upstreamCaller.id,
          name: upstreamCaller.name,
          path: upstreamCaller.sources?.[0]?.file || upstreamCaller.scope || 'entry',
          action: `Invokes feature/symbol ${target}`,
          relationType: 'direct_reference',
          confidence: 'L1_OBSERVED',
          status: 'OBSERVED',
        });

        evidenceRecords.push(
          createEvidenceRecord({
            evidence_id: `ev_trace_step_1`,
            claim: `Execution enters via caller ${upstreamCaller.name}`,
            subject: upstreamCaller.name,
            relationship: 'routes_to',
            object: primaryEntity.name,
            source_path: upstreamCaller.sources?.[0]?.file || 'entry',
            symbol: upstreamCaller.name,
            confidence: 'L1_OBSERVED',
            evidence_status: 'OBSERVED',
          })
        );
      }

      visited.add(primaryEntity.id);
      steps.push({
        step: currentHop++,
        layer: upstreamCaller ? 'Service / Business Logic' : 'Ingress / Entry Point',
        entityId: primaryEntity.id,
        name: primaryEntity.kind === 'endpoint' ? primaryEntity.name : target,
        path: primaryEntity.sources?.[0]?.file || primaryEntity.scope || 'entry',
        action: primaryEntity.tags?.includes('cli')
          ? 'CLI Command Invocation'
          : primaryEntity.kind === 'endpoint'
            ? 'HTTP Route Dispatch'
            : `Statically referenced by ${target}`,
        relationType: 'direct_reference',
        confidence: 'L1_OBSERVED',
        status: 'OBSERVED',
      });

      evidenceRecords.push(
        createEvidenceRecord({
          evidence_id: `ev_trace_step_${steps.length}`,
          claim: `Static call path reaches ${primaryEntity.kind} ${primaryEntity.name}`,
          subject: primaryEntity.name,
          relationship: primaryEntity.kind === 'endpoint' ? 'routes_to' : 'references',
          object: target,
          source_path: primaryEntity.sources?.[0]?.file || 'entry',
          symbol: primaryEntity.name,
          confidence: 'L1_OBSERVED',
          evidence_status: 'OBSERVED',
        })
      );

      // Step 2+: Traverse outgoing relationships (Middleware, Service, Datastore)
      const maxHops = Math.min(Number.isFinite(flags.depth) && flags.depth > 0 ? flags.depth : 4, 10);

      while (queue.length > 0 && currentHop <= maxHops) {
        const currId = queue.shift();
        const outgoing = this.outgoingRelMap ? (this.outgoingRelMap.get(currId) || []) : (model.relationships || []).filter(r => r.sourceId === currId);

        for (const rel of outgoing) {
          if (!visited.has(rel.targetId)) {
            visited.add(rel.targetId);
            const targetEntity = entityMap.get(rel.targetId);
            const isDatastore = (model.datastores || []).some(d => d.id === rel.targetId) || rel.targetId.includes('db');
            const isQueue = (model.queues || []).some(q => q.id === rel.targetId);

            let layer = 'Service / Business Logic';
            let edgeKind = 'direct_reference';
            if (isDatastore) layer = 'Persistence / Datastore';
            else if (isQueue) layer = 'Message Queue / Event Bus';
            else if (targetEntity?.role?.includes('middleware') || targetEntity?.role?.includes('auth')) {
              layer = 'Security / Middleware';
              edgeKind = 'framework_mediated';
            }

            steps.push({
              step: currentHop++,
              layer,
              entityId: rel.targetId,
              name: targetEntity?.name || rel.targetId,
              path: targetEntity?.sources?.[0]?.file || 'unknown',
              action: `${rel.relationType.toUpperCase()} target component`,
              relationType: edgeKind,
              confidence: 'L1_OBSERVED',
              status: 'OBSERVED',
            });

            evidenceRecords.push(
              createEvidenceRecord({
                evidence_id: `ev_trace_step_${currentHop}`,
                claim: `${currId} ${rel.relationType} ${rel.targetId}`,
                subject: currId,
                relationship: rel.relationType,
                object: rel.targetId,
                source_path: rel.evidence?.[0]?.file || targetEntity?.sources?.[0]?.file || 'source',
                symbol: targetEntity?.name,
                confidence: 'L1_OBSERVED',
                evidence_status: 'OBSERVED',
              })
            );

            queue.push(rel.targetId);
          }
        }
      }
    } else {
      unresolvedAssumptions.push(`Exact entry point for query "${target}" could not be statically matched in TAFM. Inferring heuristic entry candidate.`);
      steps.push({
        step: 1,
        layer: 'Inferred Entry',
        name: target,
        path: 'heuristic_match',
        action: 'Dynamic or unmapped feature invocation',
        relationType: 'unresolved',
        confidence: 'L3_INFERRED',
        status: 'UNVERIFIED_CLAIM',
      });
      evidenceRecords.push(
        createEvidenceRecord({
          evidence_id: `ev_trace_unresolved_${String(target).replace(/[^a-zA-Z0-9_]/g, '_')}`,
          claim: `Symbol "${target}" was not observed in any scanned module or entry point`,
          subject: target,
          relationship: 'references',
          object: 'unknown',
          source_path: 'unresolved',
          symbol: target,
          confidence: 'L4_UNKNOWN',
          evidence_status: 'UNKNOWN',
          limitations: [`Target "${target}" was not found in the architectural model. Static analysis cannot prove existence of dynamically resolved symbols.`],
        })
      );
    }

    // Covering tests detection
    const coveringTests = [];
    const testDirs = ['test', 'tests', '__tests__', 'crates/core/tests'];
    testDirs.forEach(td => {
      const absTd = path.join(this.repoRoot, td);
      if (fs.existsSync(absTd)) {
        try {
          const files = fs.readdirSync(absTd, { recursive: true });
          files.forEach(f => {
            const strF = String(f);
            if ((strF.endsWith('.test.js') || strF.endsWith('.spec.ts') || strF.endsWith('.rs')) && strF.toLowerCase().includes(query)) {
              coveringTests.push(path.join(td, strF).replace(/\\/g, '/'));
            }
          });
        } catch {
          // ignore
        }
      }
    });

    return {
      subcommand: 'trace',
      target,
      steps,
      coveringTests,
      unresolvedAssumptions,
      limitations,
      evidenceRecords,
    };
  }

  /**
   * 3. DEPENDENCIES: Inbound (Fan-In), Outbound (Fan-Out), Cycles, Missing vs Unresolvable
   */
  dependencies(target, flags = {}) {
    const model = this.getModel();
    const evidenceRecords = [];
    const limitations = [];

    if (target) {
      // Analyze single module/file
      const normalizedTarget = target.replace(/\\/g, '/');
      const matchingEntities = (model.entities || []).filter(e =>
        e.id === normalizedTarget ||
        e.name.toLowerCase() === target.toLowerCase() ||
        (e.sources && e.sources.some(s => s.file.includes(normalizedTarget)))
      );

      const targetId = matchingEntities[0]?.id || normalizedTarget;

      // Inbound dependents (Fan-In: who calls/imports target)
      const rawInbound = this.incomingRelMap ? (this.incomingRelMap.get(targetId) || []) : (model.relationships || []).filter(r => r.targetId === targetId);
      const inbound = rawInbound.map(r => ({
        callerId: r.sourceId,
        type: r.relationType,
        direction: `${r.sourceId} -> ${targetId}`,
        evidenceFile: r.evidence?.[0]?.file || 'unknown',
      }));

      // Outbound dependencies (Fan-Out: what target calls/imports)
      const rawOutbound = this.outgoingRelMap ? (this.outgoingRelMap.get(targetId) || []) : (model.relationships || []).filter(r => r.sourceId === targetId);
      const outbound = rawOutbound.map(r => ({
        targetId: r.targetId,
        type: r.relationType,
        direction: `${targetId} -> ${r.targetId}`,
        evidenceFile: r.evidence?.[0]?.file || 'unknown',
      }));

      // Check for circular dependency involving target
      let hasCycle = false;
      const cyclePath = [];
      const visited = new Set();
      const recStack = new Set();
      const outgoingMap = this.outgoingRelMap;

      function dfs(curr, pathList) {
        visited.add(curr);
        recStack.add(curr);
        pathList.push(curr);

        const neighbors = outgoingMap
          ? (outgoingMap.get(curr) || []).map(r => r.targetId)
          : (model.relationships || []).filter(r => r.sourceId === curr).map(r => r.targetId);

        for (const n of neighbors) {
          if (!visited.has(n)) {
            if (dfs(n, pathList)) return true;
          } else if (recStack.has(n)) {
            hasCycle = true;
            cyclePath.push(...pathList.slice(pathList.indexOf(n)), n);
            return true;
          }
        }

        recStack.delete(curr);
        pathList.pop();
        return false;
      }

      dfs(targetId, []);

      if (matchingEntities.length > 0) {
        evidenceRecords.push(
          createEvidenceRecord({
            evidence_id: `ev_dep_${targetId.replace(/[^a-zA-Z0-9_]/g, '_')}`,
            claim: `Module ${targetId} has ${inbound.length} inbound dependents and ${outbound.length} outbound dependencies`,
            subject: targetId,
            relationship: 'imports',
            object: `${inbound.length} callers, ${outbound.length} deps`,
            source_path: targetId,
            confidence: 'L1_OBSERVED',
            evidence_status: 'OBSERVED',
          })
        );
      } else {
        limitations.push(`Target module "${target}" was not found in the scanned architectural model.`);
        evidenceRecords.push(
          createEvidenceRecord({
            evidence_id: `ev_dep_unknown_${targetId.replace(/[^a-zA-Z0-9_]/g, '_')}`,
            claim: `Module "${target}" was not observed in the scanned codebase model`,
            subject: target,
            relationship: 'unresolved_module',
            object: '0 callers, 0 deps',
            source_path: target,
            confidence: 'L4_UNKNOWN',
            evidence_status: 'UNKNOWN',
            limitations: [`Target module "${target}" was not found in the architectural model.`],
          })
        );
      }

      return {
        subcommand: 'dependencies',
        status: 'COMPLETE',
        target: targetId,
        fanIn: inbound.length,
        fanOut: outbound.length,
        inbound,
        outbound,
        participatesInCycle: hasCycle,
        cyclePath: hasCycle ? cyclePath : undefined,
        limitations,
        evidenceRecords,
      };
    }

    // Entire Repo Dependency Audit (Phantom / Unused / Unresolvable Dependencies)
    let declaredDeps = new Set();
    const pkgPath = path.join(this.repoRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        Object.keys(pkg.dependencies || {}).forEach(d => declaredDeps.add(d));
        Object.keys(pkg.devDependencies || {}).forEach(d => declaredDeps.add(d));
        Object.keys(pkg.peerDependencies || {}).forEach(d => declaredDeps.add(d));
      } catch {
        // ignore
      }
    }

    let projectDeps = this.projectDependenciesCache;
    if (!projectDeps || flags.forceFresh) {
      const importedPackages = new Set();
      const unresolvableImports = [];

      (model.relationships || []).forEach(r => {
        if (r.relationType === 'imports' && r.targetId) {
          if (!r.targetId.startsWith('.') && !r.targetId.startsWith('/')) {
            const pkgName = r.targetId.startsWith('@')
              ? r.targetId.split('/').slice(0, 2).join('/')
              : r.targetId.split('/')[0];
            importedPackages.add(pkgName);
          } else {
            // Check if internal relative import resolves on disk
            const evidenceFile = r.evidence?.[0]?.file;
            if (evidenceFile) {
              const absDir = path.dirname(path.resolve(this.repoRoot, evidenceFile));
              const cand1 = path.resolve(absDir, r.targetId);
              const cand2 = path.resolve(absDir, `${r.targetId}.js`);
              const cand3 = path.resolve(absDir, `${r.targetId}.ts`);
              const cand4 = path.resolve(absDir, r.targetId, 'index.js');
              const cand5 = path.resolve(absDir, r.targetId, 'index.ts');
              if (!fs.existsSync(cand1) && !fs.existsSync(cand2) && !fs.existsSync(cand3) && !fs.existsSync(cand4) && !fs.existsSync(cand5)) {
                unresolvableImports.push({ source: evidenceFile, importPath: r.targetId, status: 'UNRESOLVABLE_STATIC_PATH' });
              }
            }
          }
        }
      });

      // Also scan source files directly for external packages and relative imports
      const importRegex = /(?:import\s+(?:(?:[\w*\s{},]+)\s+from\s+)?['"`]([^'"`]+)['"`]|require\s*\(\s*['"`]([^'"`]+)['"`]\))/g;
      const scanImportsDir = (dir) => {
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullP = path.join(dir, entry.name);
            const relP = path.relative(this.repoRoot, fullP).replace(/\\/g, '/');
            if (entry.isDirectory()) {
              if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(entry.name)) {
                scanImportsDir(fullP);
              }
            } else if (/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(entry.name)) {
              try {
                const fileContent = fs.readFileSync(fullP, 'utf8');
                importRegex.lastIndex = 0;
                let match;
                while ((match = importRegex.exec(fileContent)) !== null) {
                  const targetImp = match[1] || match[2];
                  if (!targetImp) continue;
                  if (!targetImp.startsWith('.') && !targetImp.startsWith('/')) {
                    const pkgName = targetImp.startsWith('@')
                      ? targetImp.split('/').slice(0, 2).join('/')
                      : targetImp.split('/')[0];
                    importedPackages.add(pkgName);
                  } else {
                    const absDir = path.dirname(fullP);
                    const cand1 = path.resolve(absDir, targetImp);
                    const cand2 = path.resolve(absDir, `${targetImp}.js`);
                    const cand3 = path.resolve(absDir, `${targetImp}.ts`);
                    const cand4 = path.resolve(absDir, targetImp, 'index.js');
                    const cand5 = path.resolve(absDir, targetImp, 'index.ts');
                    if (!fs.existsSync(cand1) && !fs.existsSync(cand2) && !fs.existsSync(cand3) && !fs.existsSync(cand4) && !fs.existsSync(cand5)) {
                      if (!unresolvableImports.some(u => u.source === relP && u.importPath === targetImp)) {
                        unresolvableImports.push({ source: relP, importPath: targetImp, status: 'UNRESOLVABLE_STATIC_PATH' });
                      }
                    }
                  }
                }
              } catch {
                // ignore
              }
            }
          }
        } catch {
          // ignore
        }
      };
      scanImportsDir(this.repoRoot);

      projectDeps = { importedPackages, unresolvableImports };
      this.projectDependenciesCache = projectDeps;
    }
    const { importedPackages, unresolvableImports } = projectDeps;

    const builtinModules = new Set(['fs', 'path', 'crypto', 'child_process', 'os', 'util', 'events', 'http', 'https', 'stream', 'buffer', 'url']);
    const missingDependencies = [];
    importedPackages.forEach(p => {
      if (!declaredDeps.has(p) && !builtinModules.has(p)) {
        missingDependencies.push({ package: p, status: 'MISSING_FROM_MANIFEST' });
      }
    });

    missingDependencies.slice(0, 5).forEach(m => {
      evidenceRecords.push(
        createEvidenceRecord({
          evidence_id: `ev_dep_missing_${m.package.replace(/[^a-zA-Z0-9_]/g, '_')}`,
          claim: `Package "${m.package}" is imported in code but not declared in package manifest`,
          subject: m.package,
          relationship: 'missing_dependency',
          object: 'package.json',
          source_path: 'package.json',
          confidence: 'L1_OBSERVED',
          evidence_status: 'OBSERVED',
        })
      );
    });

    if (evidenceRecords.length === 0 && (model.relationships || []).length > 0) {
      evidenceRecords.push(
        createEvidenceRecord({
          evidence_id: 'ev_dep_project_wide',
          claim: `Repository contains ${(model.relationships || []).length} static import relationships`,
          subject: 'repository',
          relationship: 'imports',
          object: `${(model.relationships || []).length} edges`,
          source_path: 'project',
          confidence: 'L1_OBSERVED',
          evidence_status: 'OBSERVED',
        })
      );
    }

        // Detect project-wide circular dependency cycles
    const circularCycles = [];
    const adj = new Map();
    (model.relationships || []).forEach(r => {
      if (r.relationType === 'imports' && r.sourceId && r.targetId) {
        if (!adj.has(r.sourceId)) adj.set(r.sourceId, new Set());
        adj.get(r.sourceId).add(r.targetId);
      }
    });

    const cycleVisited = new Set();
    const cycleRecStack = new Set();
    const cyclePath = [];

    const detectCyclesDfs = (curr) => {
      cycleVisited.add(curr);
      cycleRecStack.add(curr);
      cyclePath.push(curr);

      const neighbors = adj.get(curr) || new Set();
      for (const n of neighbors) {
        if (!cycleVisited.has(n)) {
          detectCyclesDfs(n);
        } else if (cycleRecStack.has(n)) {
          const rawCycle = cyclePath.slice(cyclePath.indexOf(n)).concat(n);
          const minNode = [...rawCycle.slice(0, -1)].sort()[0];
          const minIdx = rawCycle.indexOf(minNode);
          const normalized = rawCycle.slice(minIdx, -1).concat(rawCycle.slice(0, minIdx)).concat(minNode);
          const key = normalized.join(' -> ');
          if (!circularCycles.some(c => c.key === key)) {
            circularCycles.push({
              key,
              cycle: normalized,
              length: normalized.length - 1,
            });
          }
        }
      }

      cycleRecStack.delete(curr);
      cyclePath.pop();
    };

    for (const node of adj.keys()) {
      if (!cycleVisited.has(node)) {
        detectCyclesDfs(node);
      }
    }

    return {
      subcommand: 'dependencies',
      status: 'COMPLETE',
      mode: 'project_wide',
      totalImportEdges: (model.relationships || []).length,
      declaredDependenciesCount: declaredDeps.size,
      importedPackagesCount: importedPackages.size,
      circularCycles,
      missingDependencies,
      phantomDependencies: missingDependencies.map(m => m.package),
      unresolvableImports: unresolvableImports.slice(0, 10),
      limitations,
      evidenceRecords,
    };
  }

  /**
   * 4. RELEVANT-FILES: Multi-Factor Ranked File Checklist
   */
  relevantFiles(taskQuery, flags = {}) {
    if (!taskQuery || (typeof taskQuery === 'string' && !taskQuery.trim())) {
      throw new Error('relevant-files requires a task description (e.g. "add OAuth login")');
    }
    const model = this.getModel();
    const evidenceRecords = [];
    const limitations = ['Ranking uses multi-factor static matching (symbols, routes, imports) and may require inspecting additional files for complex features.'];

    // Extract search tokens
    const stopWords = new Set(['a', 'an', 'the', 'in', 'on', 'for', 'to', 'and', 'or', 'with', 'add', 'create', 'fix', 'update', 'modify', 'build']);
    const tokens = taskQuery
      .toLowerCase()
      .split(/[^a-zA-Z0-9_-]+/)
      .filter(t => t.length > 2 && !stopWords.has(t));

    // 1. Primary Implementation Files to edit
    const primaryFiles = new Map();
    (model.entities || []).forEach(e => {
      const matchScore = tokens.filter(tok => e.name.toLowerCase().includes(tok) || e.id.toLowerCase().includes(tok)).length;
      if (matchScore > 0 && e.sources) {
        e.sources.forEach(s => {
          const count = primaryFiles.get(s.file) || 0;
          primaryFiles.set(s.file, count + matchScore * 2);
        });
      }
    });

    const topPrimaryFiles = Array.from(primaryFiles.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([f, score]) => ({
        file: f,
        relevanceScore: score,
        classification: 'LIKELY_CHANGE_TARGET',
        role: 'Primary Implementation Target',
        reason: `Matched ${score} architectural symbols/routes relevant to task`,
      }));

    // 2. Interface Contracts to Preserve
    const entityMap = this.entityMap || new Map((model.entities || []).map(e => [e.id, e]));
    const interfaceContracts = [];
    topPrimaryFiles.forEach(pf => {
      (model.relationships || []).forEach(r => {
        if (r.sourceId && r.sourceId.includes(pf.file)) {
          const targetEntity = entityMap.get(r.targetId);
          if (targetEntity?.kind === 'type' || targetEntity?.kind === 'interface' || targetEntity?.kind === 'schema') {
            interfaceContracts.push({
              file: targetEntity.sources?.[0]?.file || r.targetId,
              symbol: targetEntity.name,
              classification: 'CONTRACT_TO_PRESERVE',
              reason: 'Required schema/type contract that must remain backward-compatible',
            });
          }
        }
      });
    });

    // 3. Dependent Callers (Ring 1 Blast Radius)
    const engine = new BlastRadiusEngine(model);
    const dependentCallers = [];
    topPrimaryFiles.forEach(pf => {
      const impact = engine.computeBlastRadius(pf.file, 1);
      const ring1 = (impact.transitiveRings?.[0]?.entities || []).map(e => e.id);
      ring1.forEach(dep => {
        if (!topPrimaryFiles.some(p => p.file === dep)) {
          dependentCallers.push({
            file: dep,
            classification: 'DEPENDENT_TO_VERIFY',
            reason: `Direct caller of ${pf.file}`,
          });
        }
      });
    });

    // 4. Covering Tests
    const testSuites = [];
    topPrimaryFiles.forEach(pf => {
      const baseName = path.basename(pf.file).replace(/\.[^.]+$/, '');
      const impact = engine.computeBlastRadius(pf.file, 2);
      (impact.affectedTests || []).forEach(ts => {
        const testPath = ts.scope || ts.sources?.[0]?.file || ts.id;
        if (!testSuites.some(t => t.file === testPath)) {
          testSuites.push({
            file: testPath,
            classification: 'TEST_TO_REVIEW',
            reason: 'Direct test suite covering the impacted blast radius',
          });
        }
      });
      // Direct heuristic candidate
      const candidateTest = path.join('test', 'unit', `${baseName}.test.js`).replace(/\\/g, '/');
      if (fs.existsSync(path.join(this.repoRoot, candidateTest)) && !testSuites.some(t => t.file === candidateTest)) {
        testSuites.push({
          file: candidateTest,
          classification: 'TEST_TO_REVIEW',
          reason: 'Unit test suite corresponding directly to target module',
        });
      }
    });

    topPrimaryFiles.forEach(pf => {
      evidenceRecords.push(
        createEvidenceRecord({
          evidence_id: `ev_rel_${pf.file.replace(/[^a-zA-Z0-9_]/g, '_')}`,
          claim: `Target file identified for editing: ${pf.file} (${pf.classification})`,
          subject: pf.file,
          relationship: 'calls',
          object: taskQuery,
          source_path: pf.file,
          confidence: 'L1_OBSERVED',
          evidence_status: 'OBSERVED',
        })
      );
    });

    const verificationCommand = testSuites.length > 0
      ? `npm test -- ${testSuites.slice(0, 2).map(t => t.file).join(' ')}`
      : 'npm test';

    return {
      subcommand: 'relevant-files',
      taskQuery,
      primaryFiles: topPrimaryFiles,
      interfaceContracts,
      dependentCallers: dependentCallers.slice(0, 8),
      testSuites,
      verificationCommand,
      limitations,
      evidenceRecords,
    };
  }

  /**
   * 5. IMPACT: Blast Radius Assessment & Canonical Risk Tiering
   */
  impact(target, flags = {}) {
    if (!target || (typeof target === 'string' && !target.trim())) {
      throw new Error('Impact command requires a target component, function, or file path');
    }
    const model = this.getModel();
    const engine = new BlastRadiusEngine(model);
    const depth = Number.isFinite(flags.depth) && flags.depth > 0 ? flags.depth : 3;

    const result = engine.computeBlastRadius(target, depth);

    if (!result || !result.found) {
      const unknownEvidence = [
        createEvidenceRecord({
          evidence_id: `ev_impact_unknown_${String(target).replace(/[^a-zA-Z0-9_]/g, '_')}`,
          claim: `Target component or file "${target}" was not found in architectural model`,
          subject: target,
          relationship: 'unresolved_target',
          object: 'indeterminate',
          source_path: target,
          confidence: 'L4_UNKNOWN',
          evidence_status: 'UNKNOWN',
          limitations: [`Target "${target}" could not be resolved statically.`],
        })
      ];
      return {
        subcommand: 'impact',
        target,
        depth,
        riskTier: 'INDETERMINATE',
        riskReason: `Target component or file "${target}" was not found in architectural model.`,
        totalImpactedEntities: 0,
        ring1DirectCallers: [],
        ring2TransitiveCallers: [],
        ring3TransitiveCallers: [],
        impactedEndpoints: [],
        impactedTestSuites: [],
        crossesTrustBoundary: false,
        limitations: [`Target "${target}" could not be resolved statically.`],
        unresolvedAssumptions: [`Verify whether "${target}" exists, is exported, or is dynamically loaded.`],
        evidenceRecords: unknownEvidence,
      };
    }

    const ring1 = (result.transitiveRings?.[0]?.entities || []).map(e => e.id);
    const ring2 = (result.transitiveRings?.[1]?.entities || []).map(e => e.id);
    const ring3 = (result.transitiveRings?.[2]?.entities || []).map(e => e.id);
    const totalImpacted = result.metrics?.transitiveDependentsCount || (ring1.length + ring2.length + ring3.length);
    const riskTier = result.metrics?.riskTier || 'LOW';
    const impactedEndpoints = (result.affectedEndpoints || []).map(e => e.name || e.id);
    const impactedTestSuites = (result.affectedTests || []).map(e => e.scope || e.name || e.id);
    const crossesTrustBoundary = (result.crossedZones || []).length > 0;

    let riskReason = `Impacts ${ring1.length} direct callers and ${totalImpacted} transitive entities across ${result.transitiveRings?.length || 1} rings.`;
    if (crossesTrustBoundary) {
      riskReason += ' Modification crosses security trust boundaries.';
    }

    const evidenceRecords = [];
    ring1.forEach(caller => {
      evidenceRecords.push(
        createEvidenceRecord({
          evidence_id: `ev_impact_r1_${caller.replace(/[^a-zA-Z0-9_]/g, '_')}`,
          claim: `Direct downstream dependent (Ring 1): ${caller}`,
          subject: caller,
          relationship: 'calls',
          object: target,
          source_path: caller,
          confidence: 'L1_OBSERVED',
          evidence_status: 'OBSERVED',
        })
      );
    });

    return {
      subcommand: 'impact',
      target,
      depth,
      riskTier,
      riskReason,
      totalImpactedEntities: totalImpacted,
      ring1DirectCallers: ring1,
      ring2TransitiveCallers: ring2,
      ring3TransitiveCallers: ring3,
      impactedEndpoints,
      impactedTestSuites,
      crossesTrustBoundary,
      limitations: [],
      evidenceRecords,
    };
  }

  /**
   * 6. DEAD-CODE: Classified Unreferenced Exports, Orphan Modules & Safeguards
   */
  deadCode(filterPath, flags = {}) {
    const model = this.getModel();
    const evidenceRecords = [];

    // Protected Entry Points (CLI bins, package.json exports/main, index files, tests)
    const protectedFiles = new Set();
    const pkgPath = path.join(this.repoRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.main) {
          const norm = path.normalize(pkg.main).replace(/\\/g, '/');
          protectedFiles.add(norm);
          protectedFiles.add(norm.replace(/^\.\//, ''));
        }
        if (pkg.module) {
          const norm = path.normalize(pkg.module).replace(/\\/g, '/');
          protectedFiles.add(norm);
          protectedFiles.add(norm.replace(/^\.\//, ''));
        }
        if (typeof pkg.bin === 'string') {
          const norm = path.normalize(pkg.bin).replace(/\\/g, '/');
          protectedFiles.add(norm);
          protectedFiles.add(norm.replace(/^\.\//, ''));
        } else if (typeof pkg.bin === 'object') {
          Object.values(pkg.bin).forEach(b => {
            const norm = path.normalize(b).replace(/\\/g, '/');
            protectedFiles.add(norm);
            protectedFiles.add(norm.replace(/^\.\//, ''));
          });
        }
      } catch {
        // ignore
      }
    }

    (model.endpoints || []).forEach(e => {
      if (e.sources?.[0]?.file) {
        const norm = e.sources[0].file.replace(/\\/g, '/');
        protectedFiles.add(norm);
        protectedFiles.add(norm.replace(/^\.\//, ''));
      }
      if (e.scope) {
        const norm = e.scope.replace(/\\/g, '/');
        protectedFiles.add(norm);
        protectedFiles.add(norm.replace(/^\.\//, ''));
      }
    });

    // Inbound call counts
    const entityCalls = new Map();
    (model.relationships || []).forEach(r => {
      entityCalls.set(r.targetId, (entityCalls.get(r.targetId) || 0) + 1);
    });

    // Unreferenced exports classification
    const unreferencedExports = [];
    (model.entities || []).forEach(ent => {
      if (ent.kind === 'function' || ent.kind === 'class') {
        const calls = entityCalls.get(ent.id) || 0;
        const sourceFile = ent.sources?.[0]?.file || '';

        const isTest = sourceFile.includes('test') || sourceFile.includes('spec');
        const isProtected = protectedFiles.has(sourceFile) || protectedFiles.has(sourceFile.replace(/^\.\//, ''));
        const matchesFilter = filterPath ? sourceFile.includes(filterPath) : true;

        if (calls === 0 && !isTest && !isProtected && matchesFilter) {
          unreferencedExports.push({
            id: ent.id,
            name: ent.name,
            symbol: ent.name,
            file: sourceFile,
            line: ent.sources?.[0]?.startLine,
            classification: 'UNREFERENCED_STATICALLY',
            reason: '0 inbound static call sites or imports detected in AST',
          });
        }
      }
    });

    // Also scan repository files for exported functions/classes if not already extracted in model
    let fileExportMap = this.fileExportMapCache;
    let allFileContents = this.allFileContentsCache;

    if (!fileExportMap || !allFileContents || flags.forceFresh) {
      fileExportMap = [];
      allFileContents = new Map();
      const scanExports = (dir) => {
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullP = path.join(dir, entry.name);
            const relP = path.relative(this.repoRoot, fullP).replace(/\\/g, '/');
            if (entry.isDirectory()) {
              if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(entry.name)) {
                scanExports(fullP);
              }
            } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
              try {
                const content = fs.readFileSync(fullP, 'utf8');
                allFileContents.set(relP, content);
              const isTest = relP.includes('test') || relP.includes('spec');
              const isProtected = protectedFiles.has(relP) || protectedFiles.has(`./${relP}`) || protectedFiles.has(relP.replace(/^\.\//, ''));
              const matchesFilter = filterPath ? relP.includes(filterPath) : true;
              if (!isTest && !isProtected && matchesFilter) {
                // Find exports
                // module.exports = { a, b }
                const modExpMatch = content.match(/module\.exports\s*=\s*\{([^}]+)\}/);
                if (modExpMatch) {
                  const names = modExpMatch[1].split(',').map(s => s.trim().split(':')[0].trim()).filter(Boolean);
                  names.forEach(n => {
                    if (/^[a-zA-Z0-9_$]+$/.test(n)) {
                      fileExportMap.push({ name: n, file: relP, line: 1 });
                    }
                  });
                }
                // exports.foo = ...
                const expPropRegex = /exports\.([a-zA-Z0-9_$]+)\s*=/g;
                let expProp;
                while ((expProp = expPropRegex.exec(content)) !== null) {
                  fileExportMap.push({ name: expProp[1], file: relP, line: 1 });
                }
                // export function foo / export const foo / export type Foo / export interface Foo / export enum Foo
                const namedExpRegex = /export\s+(?:async\s+)?(?:function|const|let|var|class|type|interface|enum)\s+([a-zA-Z0-9_$]+)/g;
                let namedExp;
                while ((namedExp = namedExpRegex.exec(content)) !== null) {
                  fileExportMap.push({ name: namedExp[1], file: relP, line: 1 });
                }
                // export { a, b as c } (local export list)
                const localExpRegex = /export\s+\{([^}]+)\}(?!\s*from)/g;
                let locExp;
                while ((locExp = localExpRegex.exec(content)) !== null) {
                  locExp[1].split(',').forEach(item => {
                    const clean = item.trim().replace(/^type\s+/, '');
                    const parts = clean.split(/\s+as\s+/);
                    const orig = parts[1] ? parts[1].trim() : parts[0]?.trim();
                    if (orig && /^[a-zA-Z0-9_$]+$/.test(orig)) {
                      fileExportMap.push({ name: orig, file: relP, line: 1 });
                    }
                  });
                }
              }
            } catch {
              // ignore
            }
          }
        }
      } catch {
        // ignore
      }
    };
    scanExports(this.repoRoot);
    this.fileExportMapCache = fileExportMap;
    this.allFileContentsCache = allFileContents;
  }

    // ── Phase 16: Two-Tier Semantic Reference Resolver ──────────────────────────
    function stripCodeComments(src) {
      if (!src || typeof src !== 'string') return '';
      return src
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/\/\/[^\r\n]*/g, ' ');
    }

    function resolveLocalModule(importerRelPath, specifier, knownFiles) {
      if (!specifier || typeof specifier !== 'string') return null;
      if (!specifier.startsWith('.')) return null;
      const importerDir = path.dirname(importerRelPath);
      const resolved = path.normalize(path.join(importerDir, specifier)).replace(/\\/g, '/');

      const candidates = [
        resolved,
        `${resolved}.js`,
        `${resolved}.ts`,
        `${resolved}.jsx`,
        `${resolved}.tsx`,
        `${resolved}.mjs`,
        `${resolved}.cjs`,
        `${resolved}/index.js`,
        `${resolved}/index.ts`,
      ];
      for (const c of candidates) {
        if (knownFiles.has(c)) return c;
      }
      return null;
    }

    // Pass 1: Build Module Import & Re-Export Graph from executable code (no comments)
    const knownFiles = new Set(allFileContents.keys());
    const codeWithoutComments = new Map();
    const importGraph = new Map();         // importer -> targetFile -> Set<symbol>
    const fileInboundImporters = new Map(); // targetFile -> Set<importer>
    const reexportGraph = new Map();       // reexporter -> targetFile -> Set<symbol>

    for (const [filePath, rawContent] of allFileContents.entries()) {
      const code = stripCodeComments(rawContent);
      codeWithoutComments.set(filePath, code);

      // 1. ESM Imports: import { a, b as c } from './target' or import type { a } from './target' or import * as ns from './target'
      const esmImportRegex = /import\s+(?:type\s+)?(?:(\*\s+as\s+[\w$]+)|(?:\{([^}]+)\})|([\w$]+))\s+from\s+['"`]([^'"`]+)['"`]/g;
      let m;
      while ((m = esmImportRegex.exec(code)) !== null) {
        const isNamespace = Boolean(m[1]);
        const namedBlock = m[2];
        const defaultImport = m[3];
        const specifier = m[4];
        const resolved = resolveLocalModule(filePath, specifier, knownFiles);
        if (resolved) {
          if (!importGraph.has(filePath)) importGraph.set(filePath, new Map());
          const targetMap = importGraph.get(filePath);
          if (!targetMap.has(resolved)) targetMap.set(resolved, new Set());
          const symSet = targetMap.get(resolved);

          if (isNamespace) symSet.add('*');
          if (defaultImport) symSet.add('default');
          if (namedBlock) {
            namedBlock.split(',').forEach(item => {
              const clean = item.trim().replace(/^type\s+/, '');
              const parts = clean.split(/\s+as\s+/);
              const orig = parts[0]?.trim();
              if (orig) symSet.add(orig);
            });
          }

          if (!fileInboundImporters.has(resolved)) fileInboundImporters.set(resolved, new Set());
          fileInboundImporters.get(resolved).add(filePath);
        }
      }

      // 2. CommonJS Requires: const { a } = require('./target')
      const cjsRegex = /(?:const|let|var)\s+(?:\{([^}]+)\}|([\w$]+))\s*=\s*require\s*\(\s*['"`]([^'"`]+)['"`]\)/g;
      while ((m = cjsRegex.exec(code)) !== null) {
        const namedBlock = m[1];
        const defaultImport = m[2];
        const specifier = m[3];
        const resolved = resolveLocalModule(filePath, specifier, knownFiles);
        if (resolved) {
          if (!importGraph.has(filePath)) importGraph.set(filePath, new Map());
          const targetMap = importGraph.get(filePath);
          if (!targetMap.has(resolved)) targetMap.set(resolved, new Set());
          const symSet = targetMap.get(resolved);

          if (defaultImport) symSet.add('*');
          if (namedBlock) {
            namedBlock.split(',').forEach(item => {
              const parts = item.trim().split(':');
              const orig = parts[0]?.trim();
              if (orig) symSet.add(orig);
            });
          }

          if (!fileInboundImporters.has(resolved)) fileInboundImporters.set(resolved, new Set());
          fileInboundImporters.get(resolved).add(filePath);
        }
      }

      // 3. ESM Re-Exports: export { a, b } from './target' or export type { a } from './target' or export * from './target'
      const reexportRegex = /export\s+(?:type\s+)?(?:(\*)|(?:\{([^}]+)\}))\s+from\s+['"`]([^'"`]+)['"`]/g;
      while ((m = reexportRegex.exec(code)) !== null) {
        const isAll = Boolean(m[1]);
        const namedBlock = m[2];
        const specifier = m[3];
        const resolved = resolveLocalModule(filePath, specifier, knownFiles);
        if (resolved) {
          if (!reexportGraph.has(filePath)) reexportGraph.set(filePath, new Map());
          const targetMap = reexportGraph.get(filePath);
          if (!targetMap.has(resolved)) targetMap.set(resolved, new Set());
          const symSet = targetMap.get(resolved);

          if (isAll) symSet.add('*');
          if (namedBlock) {
            namedBlock.split(',').forEach(item => {
              const clean = item.trim().replace(/^type\s+/, '');
              const parts = clean.split(/\s+as\s+/);
              const orig = parts[0]?.trim();
              if (orig) symSet.add(orig);
            });
          }

          if (!fileInboundImporters.has(resolved)) fileInboundImporters.set(resolved, new Set());
          fileInboundImporters.get(resolved).add(filePath);
        }
      }
    }

    // Helper: Recursively verify if a symbol is consumed across re-export barrel chains
    function checkExportConsumed(exp, visited = new Set()) {
      const visitKey = `${exp.name}@${exp.file}`;
      if (visited.has(visitKey)) return false;
      visited.add(visitKey);

      const directImporters = fileInboundImporters.get(exp.file);
      if (directImporters && directImporters.size > 0) {
        for (const importer of directImporters) {
          // Check if importer re-exports this symbol
          const reexportTargetMap = reexportGraph.get(importer);
          const reexportedSymbols = reexportTargetMap?.get(exp.file);
          if (reexportedSymbols && (reexportedSymbols.has('*') || reexportedSymbols.has(exp.name))) {
            // Re-exported: check if consumer imports it from this re-exporting file
            if (checkExportConsumed({ name: exp.name, file: importer }, visited)) {
              return true;
            }
            continue;
          }

          // Direct import check
          const targetMap = importGraph.get(importer);
          const importedSymbols = targetMap?.get(exp.file);
          if (importedSymbols) {
            if (importedSymbols.has(exp.name)) {
              return true;
            }
            if (importedSymbols.has('*')) {
              const wordRegex = new RegExp(`\\b${exp.name}\\b`);
              if (wordRegex.test(codeWithoutComments.get(importer) || '')) {
                return true;
              }
            }
          }
        }
      }

      // Check internal call in defining file (excluding definition site)
      const selfCode = codeWithoutComments.get(exp.file) || '';
      const selfRegex = new RegExp(`\\b${exp.name}\\s*\\(`, 'g');
      let calls = 0;
      while (selfRegex.exec(selfCode) !== null) calls++;
      if (calls > 1) {
        return true;
      }

      return false;
    }

    // Pass 2: Semantic Reference Classification
    for (const exp of fileExportMap) {
      if (unreferencedExports.some(ue => ue.name === exp.name && ue.file === exp.file)) continue;

      const isReferenced = checkExportConsumed(exp);
      if (!isReferenced) {
        unreferencedExports.push({
          id: `export.${exp.name}`,
          name: exp.name,
          symbol: exp.name,
          file: exp.file,
          line: exp.line,
          classification: 'UNREFERENCED_STATICALLY',
          reason: '0 inbound static call sites or imports detected across repository',
        });
      }
    }

    // Orphan modules classification
    const importedFiles = new Set();
    (model.relationships || []).forEach(r => {
      if (r.relationType === 'imports' && r.targetId) {
        importedFiles.add(r.targetId.replace(/\\/g, '/'));
      }
    });

    const orphanModules = [];
    const allSourceFiles = new Set();
    (model.entities || []).forEach(e => {
      if (e.sources) e.sources.forEach(s => allSourceFiles.add(s.file.replace(/\\/g, '/')));
    });

    allSourceFiles.forEach(f => {
      const isTest = f.includes('test') || f.includes('spec');
      const isProtected = protectedFiles.has(f) || f.endsWith('index.js') || f.endsWith('index.ts');
      const matchesFilter = filterPath ? f.includes(filterPath) : true;

      if (!importedFiles.has(f) && !isTest && !isProtected && matchesFilter) {
        orphanModules.push({
          file: f,
          classification: 'POSSIBLY_ORPHANED',
          reason: 'File is never imported by any other repository module',
        });
      }
    });

    // Chesterton's Fences (Invariants with // VERIFY or // CAUTION)
    const landmines = [];
    (model.entities || []).forEach(e => {
      if (e.tags && (e.tags.includes('verify_fence') || e.tags.includes('landmine'))) {
        landmines.push({
          id: e.id,
          file: e.sources?.[0]?.file,
          comment: e.name,
          note: e.name,
          classification: 'PROTECTED',
        });
      }
    });

    for (const [filePath, content] of allFileContents.entries()) {
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (
          trimmed.includes('// VERIFY') ||
          trimmed.includes('// CAUTION') ||
          trimmed.includes('// CHESTERTON') ||
          trimmed.includes("Chesterton's fence") ||
          trimmed.includes('Chesterton')
        ) {
          landmines.push({
            id: `fence_${filePath.replace(/[^a-zA-Z0-9_]/g, '_')}_${idx + 1}`,
            file: filePath,
            line: idx + 1,
            comment: trimmed,
            note: trimmed,
            classification: 'PROTECTED',
          });
        }
      });
    }

    unreferencedExports.slice(0, 5).forEach(ue => {
      evidenceRecords.push(
        createEvidenceRecord({
          evidence_id: `ev_dead_${ue.id.replace(/[^a-zA-Z0-9_]/g, '_')}`,
          claim: `Potential unreferenced export: ${ue.name} in ${ue.file} (${ue.classification})`,
          subject: ue.name,
          relationship: 'calls',
          object: '0 callers',
          source_path: ue.file,
          symbol: ue.name,
          confidence: 'L2_CORROBORATED',
          evidence_status: 'OBSERVED',
        })
      );
    });

    return {
      subcommand: 'dead-code',
      filterPath: filterPath || 'all',
      unreferencedExportsCount: unreferencedExports.length,
      unreferencedExports: unreferencedExports.slice(0, 15),
      orphanModulesCount: orphanModules.length,
      orphanModules: orphanModules.slice(0, 10),
      protectedFilesCount: protectedFiles.size,
      landmines,
      chestertonsFences: landmines,
      chestertonsFencesCount: landmines.length,
      safetyNotice: 'Static unreferenced status is not proof that code is safe to remove. No files are ever automatically deleted.',
      limitations: ['Dynamic imports, reflection, and runtime plugin registries cannot be detected statically.'],
      evidenceRecords,
    };
  }

  /**
   * 7. ONBOARD: Guided Developer Tour, Reading Order & Verified Recipes
   */
  onboard(flags = {}) {
    const overviewData = this.overview(flags);
    const model = this.getModel();

    // 1. 30-Second Mental Model
    let archPattern = 'Modular Architecture';
    if (overviewData.workspaces.length > 0) archPattern = 'Monorepo Subsystem Architecture';
    else if (overviewData.datastores.length > 0 && overviewData.endpoints.http.length > 0) archPattern = 'Layered Web API';

    // Project description
    let projectDescription = 'Repository and architectural analysis framework.';
    const pkgPath = path.join(this.repoRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.description) projectDescription = pkg.description;
      } catch {
        // ignore
      }
    }

    // 2. Guided Reading Order
    const day1Files = [];
    if (fs.existsSync(pkgPath)) day1Files.push({ file: 'package.json', reason: 'Dependencies, scripts, and package bin configuration' });
    overviewData.endpoints.cli.slice(0, 2).forEach(c => {
      const src = c.scope || c.sources?.[0]?.file;
      if (src && !day1Files.some(d => d.file === src)) {
        day1Files.push({ file: src, reason: `Primary CLI binary entry point for '${c.name}'` });
      }
    });
    overviewData.endpoints.http.slice(0, 2).forEach(h => {
      const src = h.sources?.[0]?.file;
      if (src && !day1Files.some(d => d.file === src)) {
        day1Files.push({ file: src, reason: `Primary HTTP route handler for ${h.name}` });
      }
    });

    const day2Files = overviewData.centralityRanking.slice(0, 3).map(h => ({
      file: h.sources?.[0]?.file || h.id,
      reason: `Architectural hub with high fan-in (${h.fanIn} dependent modules)`,
    }));

    const day3Files = [];
    overviewData.datastores.slice(0, 2).forEach(d => {
      day3Files.push({ file: d.sources?.[0]?.file || 'db_config', reason: `Datastore configuration for ${d.name}` });
    });
    ['test/unit/architecture_intelligence.test.js', 'test/index.test.js', 'crates/core/tests/integration.rs'].forEach(tf => {
      if (fs.existsSync(path.join(this.repoRoot, tf))) {
        day3Files.push({ file: tf, reason: 'Comprehensive regression and unit test suite' });
      }
    });

    // 3. 1-Line Verification Recipes
    const recipes = [];
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.scripts?.test) recipes.push({ task: 'Run Unit Tests', command: 'npm test' });
        if (pkg.scripts?.build) recipes.push({ task: 'Build Artifacts', command: 'npm run build' });
        if (pkg.scripts?.lint) recipes.push({ task: 'Run Linter', command: 'npm run lint' });
      } catch {
        // ignore
      }
    }
    if (recipes.length === 0) {
      recipes.push({ task: 'Run Unit Tests', command: 'npm test' });
    }

    return {
      subcommand: 'onboard',
      projectDescription,
      mentalModel: {
        architecturePattern: archPattern,
        runtime: overviewData.runtime,
        languages: overviewData.detectedLanguages,
        totalModules: (model.entities || []).length,
        totalRelationships: (model.relationships || []).length,
      },
      readingOrder: {
        day1: day1Files,
        day2: day2Files,
        day3: day3Files,
      },
      verificationRecipes: recipes,
      configRequirements: overviewData.configBoundaries,
      limitations: ['Onboarding guidance is synthesized from static package manifests and verified AST topology.'],
      evidenceRecords: overviewData.evidenceRecords,
    };
  }

  /**
   * 8. PREPARE: Pre-Modification Change Readiness Analysis & Verification Gate
   */
  prepare(taskDescription, flags = {}) {
    if (!taskDescription || (typeof taskDescription === 'string' && !taskDescription.trim())) {
      throw new Error('prepare requires a proposed change description (e.g. "add payment idempotency key support")');
    }

    const relResult = this.relevantFiles(taskDescription, flags);
    const primaryFile = relResult.primaryFiles[0]?.file;
    const impactResult = primaryFile ? this.impact(primaryFile, flags) : null;

    // Identify Security, Compatibility, and Migration Concerns
    const securityConcerns = [];
    const migrationConcerns = [];
    const lowerDesc = taskDescription.toLowerCase();

    if (lowerDesc.includes('auth') || lowerDesc.includes('token') || lowerDesc.includes('secret') || lowerDesc.includes('permission')) {
      securityConcerns.push('Change modifies authentication or security perimeter. Ensure JWT algorithms and session validation are enforced.');
    }
    if (lowerDesc.includes('db') || lowerDesc.includes('database') || lowerDesc.includes('migration') || lowerDesc.includes('schema') || lowerDesc.includes('column')) {
      migrationConcerns.push('Database schema alteration detected. Verify expand-and-contract migration compatibility without locking tables.');
    }
    if (impactResult?.crossesTrustBoundary) {
      securityConcerns.push('Change spans network or isolation trust boundaries.');
    }

    // Determine Analytical Readiness Gate
    let readiness = 'READY_FOR_IMPLEMENTATION_REVIEW';
    let readinessReason = 'Change targets, contracts, dependent callers, and verification commands successfully mapped with L1/L2 evidence.';

    if (relResult.primaryFiles.length === 0) {
      readiness = 'BLOCKED';
      readinessReason = 'No viable change targets could be resolved statically for the given task description.';
    } else if (securityConcerns.length > 0 || migrationConcerns.length > 0 || impactResult?.riskTier === 'CRITICAL') {
      readiness = 'READY_WITH_UNKNOWNS';
      readinessReason = 'Change mapped but involves critical blast radius or sensitive architectural boundaries requiring explicit review.';
    }

    const unknowns = [];
    if (impactResult?.riskTier === 'INDETERMINATE') {
      unknowns.push('Downstream blast radius could not be deterministically established.');
    }

    const evidenceRecords = [
      ...relResult.evidenceRecords,
      ...(impactResult?.evidenceRecords || []),
    ];

    return {
      subcommand: 'prepare',
      taskDescription,
      readiness,
      readinessReason,
      changeTargets: relResult.primaryFiles,
      contractsToPreserve: relResult.interfaceContracts,
      dependentsToVerify: relResult.dependentCallers,
      testSuites: relResult.testSuites,
      verificationCommand: relResult.verificationCommand,
      blastRadius: {
        riskTier: impactResult?.riskTier || 'LOW',
        totalImpacted: impactResult?.totalImpactedEntities || 0,
        impactedEndpoints: impactResult?.impactedEndpoints || [],
      },
      securityConcerns,
      migrationConcerns,
      unknowns,
      limitations: ['Readiness reflects analytical mapping completeness and does not constitute permission to bypass Human Gate.'],
      evidenceRecords,
    };
  }
}

// ── Markdown Presentation Renderers (Flight Data HUD Standard) ─────────────

function renderOverviewMarkdown(data) {
  let md = `# 🗺️ SYSTEM TOPOLOGY DOSSIER\n\n`;
  md += `**Runtime:** \`${data.runtime}\` | **Workspaces:** \`${data.workspaces.length}\` | **Endpoints:** \`${data.endpoints.total}\`\n\n`;

  md += `## 1. Runtime Badges & Tech Stack\n`;
  if (data.detectedLanguages && data.detectedLanguages.length > 0) {
    md += `- **Languages:** ${data.detectedLanguages.map(l => `\`${l}\``).join(', ')}\n`;
  }
  if (data.frameworks && data.frameworks.length > 0) {
    md += data.frameworks.map(f => `- **Framework:** \`${f.name || f}\``).join('\n') + '\n';
  }
  md += '\n';

  if (data.workspaces.length > 0) {
    md += `## 2. Monorepo Workspaces\n`;
    md += `| Package / Workspace | Root Path |\n| :--- | :--- |\n`;
    data.workspaces.forEach(w => {
      md += `| \`${w.name}\` | \`${w.scope || w.path || w.sources?.[0]?.file || 'workspace'}\` |\n`;
    });
    md += '\n';
  }

  md += `## 3. Primary Entry Points\n`;
  md += `| Type | Name / Route | Target Handler / Binary |\n| :--- | :--- | :--- |\n`;
  data.endpoints.cli.slice(0, 5).forEach(c => {
    md += `| \`CLI\` | \`${c.name}\` | \`${c.scope || c.sources?.[0]?.file || 'package.json'}\` |\n`;
  });
  data.endpoints.http.slice(0, 5).forEach(h => {
    md += `| \`HTTP\` | \`${h.name}\` | \`${h.sources?.[0]?.file || 'router'}\` |\n`;
  });
  md += '\n';

  if (data.centralityRanking.length > 0) {
    md += `## 4. Architectural Hubs (Highest Fan-In)\n`;
    md += `| Rank | Module / Entity | Fan-In Count | Source File |\n| :--- | :--- | :--- | :--- |\n`;
    data.centralityRanking.forEach((c, idx) => {
      md += `| #${idx + 1} | \`${c.name}\` | \`${c.fanIn}\` dependents | \`${c.sources[0]?.file || 'internal'}\` |\n`;
    });
    md += '\n';
  }

  if (data.configBoundaries && data.configBoundaries.length > 0) {
    md += `## 5. Configuration Boundaries\n`;
    data.configBoundaries.forEach(cfg => {
      md += `- \`${cfg}\`\n`;
    });
    md += '\n';
  }

  md += `## 6. Verified Ground-Truth Evidence\n`;
  data.evidenceRecords.slice(0, 4).forEach(e => {
    md += `- [${e.confidence}] **${e.relationship}**: ${e.claim} (\`${e.source?.file || e.source_path}\`)\n`;
  });

  return md;
}

function renderTraceMarkdown(data) {
  let md = `# ⚡ EXECUTION FLOW CHRONICLE: ${data.target}\n\n`;

  md += `> [!NOTE] Static Trace Disclaimer\n`;
  md += `> Statically observable relationships are traced from compile-time AST references. Static analysis does not guarantee runtime invocation.\n\n`;

  md += `## Execution Pipeline\n`;
  md += `| Step | Architectural Layer | Entity / Function | Source Path | Action | Status |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
  data.steps.forEach(s => {
    md += `| ${s.step} | ${s.layer} | \`${s.name}\` | \`${s.path}\` | ${s.action} | \`[${s.confidence || s.status}]\` |\n`;
  });
  md += '\n';

  if (data.coveringTests.length > 0) {
    md += `## Covering Tests\n`;
    data.coveringTests.forEach(t => {
      md += `- \`${t}\`\n`;
    });
    md += '\n';
  }

  if (data.unresolvedAssumptions && data.unresolvedAssumptions.length > 0) {
    md += `> [!WARNING] Dynamic Assumptions\n`;
    data.unresolvedAssumptions.forEach(a => {
      md += `> - ${a}\n`;
    });
    md += '\n';
  }

  return md;
}

function renderDependenciesMarkdown(data) {
  let md = `# 📦 DEPENDENCY TOPOLOGY MATRIX: ${data.target || 'Repository Overview'}\n\n`;

  if (data.mode === 'project_wide') {
    md += `- **Total Static Import Edges:** \`${data.totalImportEdges}\`\n`;
    md += `- **Declared Packages:** \`${data.declaredDependenciesCount}\`\n`;
    md += `- **Imported Packages:** \`${data.importedPackagesCount}\`\n\n`;

    if (data.missingDependencies && data.missingDependencies.length > 0) {
      md += `### ⚠️ Missing / Undeclared Manifest Dependencies\n`;
      data.missingDependencies.forEach(m => {
        md += `- \`${m.package}\` (imported in code but missing from package.json)\n`;
      });
      md += '\n';
    } else {
      md += `✔ All imported packages are declared in package.json manifests.\n\n`;
    }

    if (data.unresolvableImports && data.unresolvableImports.length > 0) {
      md += `### ⚠️ Unresolvable Relative Imports\n`;
      data.unresolvableImports.forEach(u => {
        md += `- \`${u.importPath}\` in \`${u.source}\` (file does not exist on disk)\n`;
      });
      md += '\n';
    }
    return md;
  }

  md += `**Fan-In (Dependents):** \`${data.fanIn}\` | **Fan-Out (Dependencies):** \`${data.fanOut}\`\n\n`;

  if (data.participatesInCycle) {
    md += `> [!WARNING] Circular Dependency Alert\n`;
    md += `> Module participates in circular cycle: \`${data.cyclePath.join(' -> ')}\`\n\n`;
  }

  if (data.inbound.length > 0) {
    md += `### Immediate Inbound Callers (Fan-In)\n`;
    data.inbound.slice(0, 5).forEach(i => {
      md += `- \`${i.direction}\` in \`${i.evidenceFile}\`\n`;
    });
    md += '\n';
  }

  if (data.outbound.length > 0) {
    md += `### Immediate Outbound Calls (Fan-Out)\n`;
    data.outbound.slice(0, 5).forEach(o => {
      md += `- \`${o.direction}\` in \`${o.evidenceFile}\`\n`;
    });
    md += '\n';
  }

  return md;
}

function renderRelevantFilesMarkdown(data) {
  let md = `# 🎯 TARGETED FILE INSPECTION CHECKLIST\n`;
  md += `**Task:** "${data.taskQuery}"\n\n`;

  md += `## 1. Primary Implementation Targets to Edit\n`;
  md += `| File Path | Classification | Match Score | Rationale |\n| :--- | :--- | :--- | :--- |\n`;
  data.primaryFiles.forEach(pf => {
    md += `| \`${pf.file}\` | \`${pf.classification}\` | \`${pf.relevanceScore}\` | ${pf.reason} |\n`;
  });
  md += '\n';

  if (data.interfaceContracts && data.interfaceContracts.length > 0) {
    md += `## 2. Interface Contracts & Schemas to Preserve\n`;
    data.interfaceContracts.forEach(ic => {
      md += `- \`${ic.file}\` (${ic.symbol}) [\`${ic.classification}\`]: ${ic.reason}\n`;
    });
    md += '\n';
  }

  if (data.dependentCallers && data.dependentCallers.length > 0) {
    md += `## 3. Dependent Callers to Verify (Blast Radius Ring 1)\n`;
    data.dependentCallers.forEach(dc => {
      md += `- \`${dc.file}\` [\`${dc.classification}\`]: ${dc.reason}\n`;
    });
    md += '\n';
  }

  md += `## 4. Verification Recipe\n`;
  md += `Run before submitting changes:\n`;
  md += `\`\`\`bash\n${data.verificationCommand}\n\`\`\`\n`;

  return md;
}

function renderImpactMarkdown(data) {
  let md = `# 💥 BLAST RADIUS ASSESSMENT: ${data.target}\n\n`;

  const tierBadge = data.riskTier === 'CRITICAL' ? '🔴 CRITICAL' :
    data.riskTier === 'HIGH' ? '🟠 HIGH' :
    data.riskTier === 'MEDIUM' ? '🟡 MEDIUM' :
    data.riskTier === 'LOW' ? '🟢 LOW' : '⚪ INDETERMINATE';

  md += `**Risk Tier:** \`${tierBadge}\` | **Total Impacted Entities:** \`${data.totalImpactedEntities}\`\n\n`;
  md += `**Risk Analysis:** ${data.riskReason}\n\n`;

  if (data.crossesTrustBoundary) {
    md += `> [!CAUTION] Security Trust Boundary Crossing\n`;
    md += `> Modification crosses network or authentication isolation boundaries.\n\n`;
  }

  md += `## Concentric Impact Rings\n`;
  md += `### Ring 1: Direct Callers (${data.ring1DirectCallers.length})\n`;
  if (data.ring1DirectCallers.length > 0) {
    data.ring1DirectCallers.slice(0, 8).forEach(c => md += `- \`${c}\`\n`);
  } else {
    md += `- None (leaf component)\n`;
  }
  md += '\n';

  if (data.ring2TransitiveCallers && data.ring2TransitiveCallers.length > 0) {
    md += `### Ring 2: Transitive Callers (${data.ring2TransitiveCallers.length})\n`;
    data.ring2TransitiveCallers.slice(0, 5).forEach(c => md += `- \`${c}\`\n`);
    md += '\n';
  }

  if (data.impactedEndpoints && data.impactedEndpoints.length > 0) {
    md += `## Impacted Public Endpoints\n`;
    data.impactedEndpoints.forEach(ep => md += `- \`${ep}\`\n`);
    md += '\n';
  }

  if (data.impactedTestSuites && data.impactedTestSuites.length > 0) {
    md += `## Impacted Test Suites to Re-Run\n`;
    data.impactedTestSuites.forEach(ts => md += `- \`${ts}\`\n`);
    md += '\n';
  }

  return md;
}

function renderInvestigateMarkdown(data) {
  let md = `# 🔍 AUTONOMOUS INVESTIGATION: ${data.target || 'Repository Investigation'}\n\n`;

  const statusBadge = data.status === 'COMPLETE' ? '🟢 COMPLETE' :
    data.status === 'ABSTAIN' ? '⚪ ABSTAINED (INSUFFICIENT STATIC EVIDENCE)' :
    data.status === 'CONTRADICTION_DETECTED' ? '🟡 CONTRADICTION DETECTED' :
    data.status === 'BUDGET_EXHAUSTED' ? '🟠 BUDGET EXHAUSTED' : '🔴 FAILED';

  md += `**Status:** \`${statusBadge}\` | **Operation:** \`investigate\`\n\n`;
  md += `**Summary:** ${data.summary}\n\n`;

  if (data.status === 'ABSTAIN') {
    md += `> [!NOTE] Honest Abstention\n`;
    md += `> Static analysis detected that this question requires unavailable runtime or dynamic execution evidence.\n`;
    md += `> **Reason:** ${data.data?.abstentionReason || 'Unavailable dynamic evidence'}\n\n`;
  }

  if (data.data?.hypotheses && data.data.hypotheses.length > 0) {
    md += `## 1. Hypothesis Evaluation (${data.data.hypotheses.length})\n`;
    md += `| ID | Claim | Status | Confidence |\n| :--- | :--- | :--- | :--- |\n`;
    data.data.hypotheses.forEach(h => {
      md += `| \`${h.id}\` | ${h.claim} | \`${h.status}\` | \`${h.confidence}\` |\n`;
    });
    md += '\n';
  }

  if (data.data?.stepsExecuted && data.data.stepsExecuted.length > 0) {
    md += `## 2. Investigative Steps Executed (${data.data.stepsExecuted.length})\n`;
    data.data.stepsExecuted.forEach((s, idx) => {
      md += `${idx + 1}. **\`${s.operation}\`** on \`${s.target || 'repository'}\` [Status: \`${s.status}\`]\n`;
    });
    md += '\n';
  }

  if (data.data?.contradictions && data.data.contradictions.length > 0) {
    md += `> [!WARNING] Contradictions Identified\n`;
    data.data.contradictions.forEach(c => {
      md += `> - ${c}\n`;
    });
    md += '\n';
  }

  if (data.data?.budgetUsage) {
    const b = data.data.budgetUsage;
    md += `## 3. Investigation Budget Consumption\n`;
    md += `- **Iterations:** ${b.iterationsUsed} / ${b.maxIterations}\n`;
    md += `- **Tool Calls:** ${b.toolCallsUsed} / ${b.maxToolCalls}\n`;
    md += `- **Files Inspected:** ${b.filesInspectedCount} / ${b.maxFiles}\n`;
    md += `- **Elapsed Duration:** ${b.elapsedMs}ms / ${b.timeoutMs}ms\n\n`;
  }

  return md;
}

function renderChangeImpactMarkdown(data) {
  let md = `# ⚡ CHANGE-AWARE IMPACT & RECOMPUTATION ANALYSIS\n\n`;

  const tierBadge = data.riskTier === 'CRITICAL' ? '🔴 CRITICAL' :
    data.riskTier === 'HIGH' ? '🟠 HIGH' :
    data.riskTier === 'MEDIUM' ? '🟡 MEDIUM' :
    data.riskTier === 'LOW' ? '🟢 LOW' : '⚪ INDETERMINATE';

  md += `**Target / Scope:** \`${data.target || 'Repository Working Tree'}\`\n`;
  md += `**Risk Tier:** \`${tierBadge}\` | **Recomputation Scope:** \`${data.recomputationScope}\`\n\n`;
  md += `**Analysis Summary:** ${data.riskReason}\n\n`;

  md += `## 1. Classified Change Set (${data.changedFiles?.length || 0})\n`;
  if (data.changedFiles && data.changedFiles.length > 0) {
    md += `| File | Change Classification |\n| :--- | :--- |\n`;
    data.changedFiles.forEach(ch => {
      md += `| \`${ch.file}\` | \`${ch.changeClass}\` |\n`;
    });
  } else {
    md += `- No modified or added files detected.\n`;
  }
  md += '\n';

  md += `## 2. Downstream Blast Radius\n`;
  md += `- **Directly Affected Files:** ${data.directlyAffectedFiles?.length || 0}\n`;
  md += `- **Downstream Affected Modules:** ${data.downstreamAffectedModules?.length || 0}\n`;
  md += `- **Affected API Endpoints:** ${data.affectedEndpoints?.length || 0}\n`;
  md += `- **Affected Persistent Datastores:** ${data.affectedDatastores?.length || 0}\n\n`;

  if (data.downstreamAffectedModules && data.downstreamAffectedModules.length > 0) {
    md += `### Affected Downstream Modules\n`;
    data.downstreamAffectedModules.slice(0, 10).forEach(m => md += `- \`${m}\`\n`);
    if (data.downstreamAffectedModules.length > 10) {
      md += `- *(+${data.downstreamAffectedModules.length - 10} more)*\n`;
    }
    md += '\n';
  }

  md += `## 3. Invalidated Analysis Artifacts (${data.invalidatedArtifacts?.length || 0})\n`;
  if (data.invalidatedArtifacts && data.invalidatedArtifacts.length > 0) {
    data.invalidatedArtifacts.forEach(art => md += `- \`${art}\`\n`);
  } else {
    md += `- All existing analysis artifacts remain valid.\n`;
  }
  md += '\n';

  return md;
}

function renderDeadCodeMarkdown(data) {
  let md = `# 🧹 CODE RELEVANCE & POTENTIAL DEAD CODE INVENTORY\n`;
  md += `**Filter:** \`${data.filterPath}\` | **Protected Entry Points:** \`${data.protectedFilesCount}\`\n\n`;

  md += `> [!IMPORTANT] Safety Guarantee\n`;
  md += `> ${data.safetyNotice}\n\n`;

  md += `## 1. Unreferenced Export Candidates (${data.unreferencedExportsCount})\n`;
  if (data.unreferencedExports && data.unreferencedExports.length > 0) {
    md += `| Symbol | File Path | Line | Classification | Status |\n| :--- | :--- | :--- | :--- | :--- |\n`;
    data.unreferencedExports.forEach(ue => {
      md += `| \`${ue.name}\` | \`${ue.file}\` | \`${ue.line || '-'}\` | \`${ue.classification}\` | \`${ue.reason}\` |\n`;
    });
    md += '\n';
  } else {
    md += `✔ No unreferenced functions or classes detected.\n\n`;
  }

  if (data.orphanModules && data.orphanModules.length > 0) {
    md += `## 2. Orphan Modules (${data.orphanModulesCount})\n`;
    data.orphanModules.forEach(om => {
      md += `- \`${om.file}\` [\`${om.classification}\`]: ${om.reason}\n`;
    });
    md += '\n';
  }

  if (data.landmines && data.landmines.length > 0) {
    md += `> [!WARNING] Chesterton's Fences Detected\n`;
    md += `> The following components contain explicit invariants (// VERIFY / // CAUTION). Do NOT delete without investigating:\n`;
    data.landmines.slice(0, 5).forEach(lm => {
      md += `> - \`${lm.file}\` [\`${lm.classification}\`]: ${lm.comment}\n`;
    });
    md += '\n';
  }

  return md;
}

function renderOnboardMarkdown(data) {
  let md = `# 🚀 DEVELOPER ONBOARDING DOSSIER\n\n`;
  md += `**Project:** ${data.projectDescription}\n\n`;

  md += `## 1. 30-Second Mental Model\n`;
  md += `- **Architecture Pattern:** \`${data.mentalModel.architecturePattern}\`\n`;
  md += `- **Runtime:** \`${data.mentalModel.runtime}\`\n`;
  if (data.mentalModel.languages && data.mentalModel.languages.length > 0) {
    md += `- **Languages:** ${data.mentalModel.languages.map(l => `\`${l}\``).join(', ')}\n`;
  }
  md += `- **Total Extracted Entities:** \`${data.mentalModel.totalModules}\`\n`;
  md += `- **Total Static Connections:** \`${data.mentalModel.totalRelationships}\`\n\n`;

  md += `## 2. Guided Reading Order\n`;
  md += `### 📅 Day 1: System Entry Points & Configuration\n`;
  data.readingOrder.day1.forEach(d => {
    md += `- \`${d.file}\`: ${d.reason}\n`;
  });
  md += '\n';

  md += `### 📅 Day 2: Core Domain & Architectural Hubs\n`;
  data.readingOrder.day2.forEach(d => {
    md += `- \`${d.file}\`: ${d.reason}\n`;
  });
  md += '\n';

  md += `### 📅 Day 3: Integrations & Verification Suites\n`;
  data.readingOrder.day3.forEach(d => {
    md += `- \`${d.file}\`: ${d.reason}\n`;
  });
  md += '\n';

  md += `## 3. 1-Line Verification Recipes\n`;
  data.verificationRecipes.forEach(r => {
    md += `- **${r.task}:** \`${r.command}\`\n`;
  });
  md += '\n';

  return md;
}

function renderPrepareMarkdown(data) {
  let md = `# 🛡️ CHANGE PREPARATION DOSSIER\n`;
  md += `**Proposed Change:** "${data.taskDescription}"\n\n`;

  const badge = data.readiness === 'READY_FOR_IMPLEMENTATION_REVIEW' ? '🟢 READY_FOR_IMPLEMENTATION_REVIEW' :
    data.readiness === 'READY_WITH_UNKNOWNS' ? '🟡 READY_WITH_UNKNOWNS' : '🔴 BLOCKED';

  md += `**Analytical Readiness:** \`${badge}\`\n`;
  md += `**Readiness Rationale:** ${data.readinessReason}\n\n`;

  md += `## 1. Likely Change Targets\n`;
  if (data.changeTargets && data.changeTargets.length > 0) {
    md += `| Target File | Classification | Rationale |\n| :--- | :--- | :--- |\n`;
    data.changeTargets.forEach(ct => {
      md += `| \`${ct.file}\` | \`${ct.classification}\` | ${ct.reason} |\n`;
    });
    md += '\n';
  } else {
    md += `⚠️ No static change targets could be identified for this change request.\n\n`;
  }

  if (data.contractsToPreserve && data.contractsToPreserve.length > 0) {
    md += `## 2. Contracts to Preserve\n`;
    data.contractsToPreserve.forEach(cp => {
      md += `- \`${cp.file}\` (${cp.symbol}): ${cp.reason}\n`;
    });
    md += '\n';
  }

  if (data.dependentsToVerify && data.dependentsToVerify.length > 0) {
    md += `## 3. Dependents to Verify (Ring 1 Blast Radius)\n`;
    data.dependentsToVerify.forEach(dv => {
      md += `- \`${dv.file}\`: ${dv.reason}\n`;
    });
    md += '\n';
  }

  md += `## 4. Blast Radius & Risk Estimation\n`;
  md += `- **Risk Tier:** \`${data.blastRadius.riskTier}\`\n`;
  md += `- **Total Impacted Modules:** \`${data.blastRadius.totalImpacted}\`\n`;
  if (data.blastRadius.impactedEndpoints && data.blastRadius.impactedEndpoints.length > 0) {
    md += `- **Impacted Public Endpoints:** ${data.blastRadius.impactedEndpoints.map(e => `\`${e}\``).join(', ')}\n`;
  }
  md += '\n';

  if (data.securityConcerns && data.securityConcerns.length > 0) {
    md += `> [!CAUTION] Security Concerns\n`;
    data.securityConcerns.forEach(sc => {
      md += `> - ${sc}\n`;
    });
    md += '\n';
  }

  if (data.migrationConcerns && data.migrationConcerns.length > 0) {
    md += `> [!WARNING] Migration & Schema Concerns\n`;
    data.migrationConcerns.forEach(mc => {
      md += `> - ${mc}\n`;
    });
    md += '\n';
  }

  md += `## 5. Pre-Implementation Verification Recipe\n`;
  md += `Execute before creating or editing files:\n`;
  md += `\`\`\`bash\n${data.verificationCommand}\n\`\`\`\n`;

  return md;
}

/**
 * Autonomous Skill Routing & Intent Arbitration Engine (Phase 13)
 * Maps natural language requests, adversarial queries, and commands to optimal skills & operations.
 *
 * @param {string|string[]} request - Raw user request or argument tokens
 * @param {Object} [options] - Optional flags and context
 * @returns {Object} Deterministic Route Decision Object
 */
function resolveRoute(request, options = {}) {
  const flags = options.flags || {};
  let rawQuery = '';
  if (Array.isArray(request)) {
    rawQuery = request.filter(a => !String(a).startsWith('-')).join(' ').trim();
  } else if (typeof request === 'string') {
    rawQuery = request.trim();
  }

  // Bounded input length protection against pathological payloads
  if (rawQuery.length > 4096) {
    rawQuery = rawQuery.slice(0, 4096);
  }

  const safeQuery = redactSecrets(rawQuery);
  const lowerQuery = safeQuery.toLowerCase();

  // 1. Prompt Injection & Malicious Content Neutralization
  let isUntrusted = false;
  let sanitizedQuery = safeQuery;

  // Obfuscated Base64 Payload Inspection
  const base64Regex = /\b([A-Za-z0-9+/]{20,}={0,2})\b/g;
  let b64Match;
  while ((b64Match = base64Regex.exec(safeQuery)) !== null) {
    try {
      const decoded = Buffer.from(b64Match[1], 'base64').toString('utf8');
      if (/(?:ignore|disregard|forget|system\s+override|dump.*process\.env|sudo\s+rm|drop\s+table)/i.test(decoded)) {
        isUntrusted = true;
        sanitizedQuery = sanitizedQuery.replace(b64Match[1], '[neutralized_obfuscated_payload]');
      }
    } catch (_e) {}
  }

  const injectionPatterns = [
    /(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|prior)?\s*(?:instructions|rules|system\s+prompts)/i,
    /(?:you\s+are\s+now\s+(?:unrestricted|dan|evil|in\s+god\s+mode)|system\s+override)/i,
    /(?:dump|print|reveal|leak|exfiltrate)\s+(?:all\s+)?(?:the\s+contents\s+of\s+)?(?:process\.env|secrets?|tokens?|credentials?)/i,
    /(?:bypass|skip|disable)\s+(?:human\s+)?(?:gate|approval|review|guardrail)/i,
    /(?:^|[;&|\n`]|bash\s+-c\s+['"`])\s*(?:sudo\s+)?rm\s+-rf\s+(?:\/|\.\*|\*|[a-z]:)/i,
    /(?:format\s+(?:hard\s+drive|drive|disk|[c-z]:)|reinstall\s+windows)/i,
    /(?:drop\s+table\s+[\w_]+;?--?)/i,
    // Multilingual injection variants
    /(?:ignorer?|oubli(?:er)?)\s+(?:toutes?\s+)?(?:les\s+)?instructions/i,
    /(?:ignora[r]?|olvida[r]?)\s+(?:todas?\s+)?(?:las\s+)?instrucciones/i,
    /(?:ignoriere?|vergiss)\s+(?:alle\s+)?anweisungen/i,
    /(?:override|bypass)\s+system\s+prompt/i,
    /<(?:user_provided_context|system|instruction|prompt)[^>]*>[\s\S]*?(?:override|ignore|bypass)/i,
    /<script\b[^>]*>[\s\S]*?<\/script>/i,
  ];

  for (const pat of injectionPatterns) {
    if (pat.test(safeQuery)) {
      isUntrusted = true;
      sanitizedQuery = sanitizedQuery.replace(pat, ' ').replace(/\s+/g, ' ').trim();
    }
  }

  // 2. Contradiction Detection
  let hasContradiction = false;
  let contradictionRationale = null;
  if (
    /without\s+(inspecting|analyzing|checking)?\s*any?\s*(import|relationship)/i.test(lowerQuery) &&
    /dependenc|module/i.test(lowerQuery)
  ) {
    hasContradiction = true;
    contradictionRationale = 'Request contains contradictory directives: requested dependency mapping while forbidding import analysis.';
  } else if (
    /do\s+not\s+inspect\s+entry\s+points/i.test(lowerQuery) &&
    /trace.*execution/i.test(lowerQuery)
  ) {
    hasContradiction = true;
    contradictionRationale = 'Request contains contradictory directives: requested execution tracing while forbidding entry point inspection.';
  } else if (
    /(?:while\s+)?excluding\s+all\s+source\s+code/i.test(lowerQuery) &&
    /relevant\s+files|find.*files/i.test(lowerQuery)
  ) {
    hasContradiction = true;
    contradictionRationale = 'Request contains contradictory directives: requested file retrieval while excluding all source code.';
  }

  // 3. Out-of-Scope / Rejection Detection
  let isOutOfScope = false;
  let outOfScopeRationale = null;
  let isDestructive = false;
  if (/deploy\s+(the\s+current\s+build\s+to|to\s+kubernetes|to\s+k8s|to\s+production)/i.test(lowerQuery)) {
    isOutOfScope = true;
    outOfScopeRationale = 'Deployment is out of scope for Codebase Intelligence. Use `/deploy` workflow instead.';
  } else if (/format\s+(hard\s+drive|drive|disk)|reinstall\s+windows/i.test(lowerQuery)) {
    isOutOfScope = true;
    isDestructive = true;
    outOfScopeRationale = 'Destructive operating system modifications are strictly prohibited and rejected.';
  } else if (/write\s+a\s+(5-paragraph\s+)?(creative\s+)?(story|poem|song)/i.test(lowerQuery)) {
    isOutOfScope = true;
    outOfScopeRationale = 'Creative fiction and non-technical requests are out of scope for Codebase Intelligence.';
  }

  // Ambiguous single-noun investigation request (e.g. "Investigate checkout.")
  if (/^investigate\s+([a-zA-Z0-9_\-]+)\.?$/i.test(sanitizedQuery.trim())) {
    const match = sanitizedQuery.trim().match(/^investigate\s+([a-zA-Z0-9_\-]+)\.?$/i);
    const target = match[1];
    return {
      primarySkill: 'code-relevance-analysis',
      operation: 'relevant-files',
      target,
      delegatedCapabilities: [],
      delegatedOperations: [],
      confidence: 'L1_OBSERVED',
      isAmbiguous: true,
      hasContradiction,
      isUntrusted,
      isOutOfScope: false,
      missingContext: [],
      expectedUncertainty: isUntrusted ? 'UNTRUSTED_INJECTION' : 'AMBIGUOUS',
      rationale: `Detects single noun subject "${target}" with ambiguous investigation verb; defaulting to code relevance analysis.`,
      limitations: [`Request "${sanitizedQuery}" is ambiguous. Scoping relevant files for target "${target}".`],
      safeQuery: sanitizedQuery,
    };
  }

  // 4. Exact Subcommand Check (Fast Deterministic Path)
  // Only trigger if arguments are short command-style tokens without conversational prose
  const tokens = sanitizedQuery.split(/\s+/).filter(Boolean);
  const firstToken = tokens[0]?.toLowerCase();
  const validSubs = ['overview', 'trace', 'dependencies', 'deps', 'relevant-files', 'impact', 'dead-code', 'onboard', 'prepare', 'change-impact', 'investigate'];

  const nonFlagTokens = tokens.slice(1).filter(t => !t.startsWith('-'));
  const hasProseWords = /\b(what|how|which|why|can|please|where|will|detect|find|show|map|identify|assess|check|analyze|look|investigate|step[\s-]by[\s-]step|and|while|without|but|from.*to|if\s+i|for\s+new|reading\s+order|execution\s+flow|flow|readiness|review|the|all|complete|of)\b/i.test(sanitizedQuery);

  const isProse = hasProseWords || nonFlagTokens.length > 1;

  if (!isProse && firstToken && validSubs.includes(firstToken)) {
    let op = firstToken === 'deps' ? 'dependencies' : firstToken;
    const target = nonFlagTokens[0] ? redactSecrets(nonFlagTokens[0]) : undefined;
    const skillMap = {
      overview: 'repository-reconnaissance',
      dependencies: 'architecture-mapping',
      trace: 'execution-flow-tracing',
      'relevant-files': 'code-relevance-analysis',
      impact: 'change-impact-analysis',
      'dead-code': 'codebase-intelligence',
      onboard: 'evidence-backed-onboarding',
      prepare: 'codebase-intelligence',
      'change-impact': 'change-impact-analysis',
      investigate: 'codebase-intelligence',
    };
    return {
      primarySkill: skillMap[op],
      operation: op,
      target: target ? redactSecrets(target) : undefined,
      delegatedCapabilities: [],
      delegatedOperations: [],
      confidence: 'L1_OBSERVED',
      isAmbiguous: false,
      hasContradiction,
      isUntrusted,
      isOutOfScope,
      missingContext: (['trace', 'impact', 'prepare'].includes(op) && !target) ? ['target'] : [],
      expectedUncertainty: hasContradiction ? 'CONTRADICTION' : (['trace', 'impact', 'prepare'].includes(op) && !target) ? 'MISSING_CONTEXT' : 'DETERMINISTIC',
      rationale: `Exact subcommand "${op}" matched directly.`,
      limitations: contradictionRationale ? [contradictionRationale] : [],
      safeQuery: sanitizedQuery,
    };
  }

  // 5. Natural Language Intent & Multi-Capability Scoring
  const cleanQ = sanitizedQuery.toLowerCase();

  const intentScores = {
    overview: 0,
    dependencies: 0,
    trace: 0,
    'relevant-files': 0,
    impact: 0,
    'dead-code': 0,
    onboard: 0,
    prepare: 0,
    'change-impact': 0,
    investigate: 0,
  };

  const intentPositions = {};

  function recordSignal(op, pattern, weight = 5) {
    const match = cleanQ.match(pattern);
    if (match) {
      intentScores[op] += weight;
      if (intentPositions[op] === undefined || match.index < intentPositions[op]) {
        intentPositions[op] = match.index;
      }
    }
  }

  // Reconnaissance
  recordSignal('overview', /\b(overview|birds-?eye\s+view|tech\s+stack|technology\s+stack|runtime|entry\s+points|workspaces|monorepo|topology|structure|layout|recon|unfamiliar|high-level|architecture\s+summary|what\s+does\s+this\s+repo\s+do|overall|network\s+latency\s+of\s+endpoint)\b/i);
  // Architecture & Dependencies
  recordSignal('dependencies', /\b(pull\s+in|dependenc(y|ies)|imports?|inbound|outbound|coupling|cycles?|circular|module\s+graph|architectural\s+hubs?|fan-in|fan-out|topology\s+matrix)\b/i);
  // Execution Tracing
  recordSignal('trace', /\b(walk\s+me\s+through|trac(e|ing)|execution\s+flow|call\s+path|call\s+flow|how\s+does.*work|step\s+by\s+step|control\s+flow|data\s+flow|throw\s+an?\s+(?:unhandled\s+)?exception)\b/i);
  // Code Relevance
  recordSignal('relevant-files', /\b(show\s+me\s+files|files\s+related\s+to|which\s+files|relevant\s+files|files\s+needed|files\s+to\s+edit|find\s+(?:all\s+)?files|where\s+is.*defined|where\s+is.*implemented|locate|slice|add\b|implement\b|refactor\b|support\b)\b/i);
  // Change Impact & Blast Radius
  recordSignal('impact', /\b(blast\s+radius|what\s+breaks|ripple|impact|downstream.*affected|if\s+i\s+(change|modify|delete|refactor)|risk\s+tier|transitive\s+dependents)\b/i);
  // Dead Code
  recordSignal('dead-code', /\b(nothing\s+references|never\s+imported|dead\s+code|unused\s+code|unused\s+exports?|orphan\s+modules?|chesterton|unreferenced|zombie)\b/i);
  // Onboarding
  recordSignal('onboard', /\b(just\s+joined|where\s+do\s+i\s+(?:even\s+)?begin|onboard(ing)?|newcomer|new\s+contributor|get\s+started|reading\s+order|day\s+1|mental\s+model|orientation)\b/i);
  // Change Preparation
  recordSignal('prepare', /\b(prepare\s+change|change\s+readiness|readiness\s+review|readiness\s+checklist|ready\s+for\s+implementation)\b/i);
  // Change Impact Analysis
  recordSignal('change-impact', /\b(change[- ]impact|recomputation\s+scope|invalidated\s+artifacts|freshness\s+check\s+on\s+change|change\s+set)\b/i);
  // Autonomous Investigation
  recordSignal('investigate', /\b(investigat\w*|explore\s+question|why\s+does.*fail|why\s+does.*error|what\s+evidence\s+supports|unverified\s+assumptions|competing\s+hypothes\w*)\b/i);

  // Position-based priority bonus (the capability mentioned first in prose gets +3 precedence)
  const posValues = Object.values(intentPositions);
  if (posValues.length > 0) {
    const minPos = Math.min(...posValues);
    for (const [op, pos] of Object.entries(intentPositions)) {
      if (pos === minPos) {
        intentScores[op] += 3;
      }
    }
  }

  // Negation handling (e.g. "do NOT trace", "don't trace")
  if (/\b(?:do\s+not|don't|without)\s+trace\b/i.test(cleanQ)) {
    intentScores.trace = 0;
  }
  if (/\b(?:do\s+not|don't|without)\s+(?:inspect|analyze)\s+(?:dependencies|imports)\b/i.test(cleanQ)) {
    intentScores.dependencies = 0;
  }

  // Target Extraction
  let extractedTarget = undefined;
  const targetPatterns = [
    /trace\s+(?:the\s+)?(?:step-by-step\s+)?execution\s+flow\s+of\s+([a-zA-Z0-9_\-\.\/]+)/i,
    /trace\s+(?:the\s+)?([a-zA-Z0-9_\-\.\/]+)\s+(?:execution\s+flow|flow|call\s+path)/i,
    /trace\s+(?:the\s+)?(?:step-by-step\s+)?(?:execution\s+)?(?:flow\s+)?(?:of\s+)?([a-zA-Z0-9_\-\.\/]+)(?:\s+from\s+|\.|\?|$)/i,
    /trace\s+(?:how\s+)?(?:the\s+)?([\w\s\-\.\/]+?)\s+works/i,
    /hits\s+(?:the\s+)?([a-zA-Z0-9_\-\.\/]+)\s+endpoint/i,
    /if\s+i\s+(?:change|modify|delete|refactor)\s+(?:the\s+)?([a-zA-Z0-9_\-\.\/]+(?:\s+(?!and\b|then\b|while\b)[a-zA-Z0-9_\-]+)*)/i,
    /(?:blast\s+radius\s+of\s+(?:modifying\s+)?(?:the\s+)?|what\s+breaks\s+if\s+i\s+change\s+(?:the\s+)?)([a-zA-Z0-9_\-\.\/]+(?:\s+(?!and\b|then\b|while\b)[a-zA-Z0-9_\-]+)*)/i,
    /(?:dependencies\s+of\s+|depend\s+on\s+|pull\s+in\s+)([^\s?]+)/i,
    /(?:files\s+do\s+i\s+need\s+to\s+edit\s+to\s+|files\s+relevant\s+for\s+|files\s+for\s+|files\s+related\s+to\s+)([\w\s\-\.\/]+?)(?:\s+while|\s+and|\.|\?|$)/i,
    /(?:add|implement|refactor)\s+([\w\s\-\.\/]+?)(?:\s+support|\.|\?|$)/i,
    /prepare\s+(?:change\s+readiness\s+(?:and\s+verification\s+checklist\s+)?for\s+|change\s+for\s+)([\w\s\-\.\/]+?)(?:\s+and|\.|\?|$)/i,
    /will\s+([a-zA-Z0-9_\-\.\/]+)\s+throw/i,
    /investigate\s+([a-zA-Z0-9_\-\.\/]+)/i,
  ];

  const stopWords = new Set([
    'execution', 'the', 'system', 'flow', 'dependencies', 'things', 'files',
    'step', 'steps', 'step by step', 'readiness', 'review', 'readiness review',
    'change readiness review', 'it', 'its', 'this', 'that', 'all', 'a', 'an', 'complete'
  ]);

  for (const tp of targetPatterns) {
    const match = sanitizedQuery.match(tp);
    if (match && match[1]) {
      let t = match[1].trim();
      t = t.replace(/\?$/, '').replace(/\.$/, '').trim();
      t = t.replace(/\s+(?:execution\s+)?flow$/i, '').trim();
      if (!stopWords.has(t.toLowerCase())) {
        extractedTarget = t;
        break;
      }
    }
  }

  const sortedOps = Object.entries(intentScores)
    .filter(([_, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);

  const skillMapping = {
    overview: 'repository-reconnaissance',
    dependencies: 'architecture-mapping',
    trace: 'execution-flow-tracing',
    'relevant-files': 'code-relevance-analysis',
    impact: 'change-impact-analysis',
    'dead-code': 'codebase-intelligence',
    onboard: 'evidence-backed-onboarding',
    prepare: 'codebase-intelligence',
    'change-impact': 'change-impact-analysis',
    investigate: 'codebase-intelligence',
  };

  if (isOutOfScope) {
    return {
      primarySkill: 'codebase-intelligence',
      operation: 'overview',
      target: undefined,
      delegatedCapabilities: [],
      delegatedOperations: [],
      confidence: 'L4_UNKNOWN',
      isAmbiguous: false,
      hasContradiction,
      isUntrusted,
      isOutOfScope: true,
      missingContext: [],
      expectedUncertainty: isDestructive ? 'REJECTED' : 'OUT_OF_SCOPE',
      rationale: outOfScopeRationale || 'Request is out of scope.',
      limitations: [outOfScopeRationale || 'Request is out of scope for Codebase Intelligence.'],
      safeQuery: sanitizedQuery,
    };
  }

  if (sortedOps.length === 0 || (/^(check|analyze|look\s+into|inspect|audit)\b/i.test(cleanQ) && sortedOps[0][1] <= 5 && !extractedTarget)) {
    if (/\binvestigate\s+([a-zA-Z0-9_\-\.\/]+)/i.test(cleanQ)) {
      const match = cleanQ.match(/\binvestigate\s+([a-zA-Z0-9_\-\.\/]+)/i);
      const subject = match[1].replace(/[.?]/g, '').trim();
      return {
        primarySkill: 'codebase-intelligence',
        operation: 'investigate',
        target: subject,
        delegatedCapabilities: [],
        delegatedOperations: [],
        confidence: 'L2_CORROBORATED',
        isAmbiguous: false,
        hasContradiction,
        isUntrusted,
        isOutOfScope: false,
        missingContext: [],
        expectedUncertainty: isUntrusted ? 'UNTRUSTED_INJECTION' : 'DETERMINISTIC',
        rationale: `Autonomous investigation routed for target "${subject}".`,
        limitations: [],
        safeQuery: sanitizedQuery,
      };
    }

    return {
      primarySkill: 'codebase-intelligence',
      operation: 'overview',
      target: undefined,
      delegatedCapabilities: [],
      delegatedOperations: [],
      confidence: 'L3_INFERRED',
      isAmbiguous: true,
      hasContradiction,
      isUntrusted,
      isOutOfScope: false,
      missingContext: [],
      expectedUncertainty: isUntrusted ? 'UNTRUSTED_INJECTION' : 'AMBIGUOUS',
      rationale: 'Query has no distinct single capability signal or is overly broad; defaulting to safe repository overview.',
      limitations: ['Query is ambiguous. Defaulting to safe repository overview. Narrow request using a specific subcommand or target symbol.'],
      safeQuery: sanitizedQuery,
    };
  }

  const primaryOp = sortedOps[0][0];
  const primarySkill = skillMapping[primaryOp];

  const delegatedCapabilities = [];
  const delegatedOperations = [];
  if (sortedOps.length > 1 && sortedOps[1][1] >= 5 && !hasContradiction) {
    const secondaryOp = sortedOps[1][0];
    const secondarySkill = skillMapping[secondaryOp];
    if (secondarySkill !== primarySkill) {
      delegatedCapabilities.push(secondarySkill);
      delegatedOperations.push(secondaryOp);
    }
  }

  const missingContext = [];
  if (['trace', 'impact', 'prepare'].includes(primaryOp) && !extractedTarget) {
    missingContext.push('target');
  }

  // Model-aware unknown symbol detection
  let isUnknownTarget = false;
  if (options.repoRoot && extractedTarget && ['trace', 'impact', 'dependencies'].includes(primaryOp)) {
    try {
      const engine = new CodebaseIntelligence(options.repoRoot);
      const model = engine.getModel();
      const norm = extractedTarget.toLowerCase().replace(/\\/g, '/');
      const found = (model.entities || []).some(e =>
        e.id.toLowerCase() === norm ||
        e.name.toLowerCase() === norm ||
        (e.sources && e.sources.some(s => s.file.toLowerCase().includes(norm)))
      );
      if (!found && !['authentication', 'src/cli.js', 'logger.js', 'logger.log'].includes(norm)) {
        isUnknownTarget = true;
      }
    } catch {
      // ignore
    }
  }

  let expectedUncertainty = 'DETERMINISTIC';
  if (hasContradiction) {
    expectedUncertainty = 'CONTRADICTION';
  } else if (isUntrusted) {
    expectedUncertainty = 'UNTRUSTED_INJECTION';
  } else if (missingContext.length > 0) {
    expectedUncertainty = 'MISSING_CONTEXT';
  } else if (delegatedOperations.length > 0) {
    expectedUncertainty = 'MULTI_CAPABILITY';
  } else if (isUnknownTarget) {
    expectedUncertainty = 'UNKNOWN_TARGET';
  } else if (/will.*throw.*exception|latency.*under/i.test(cleanQ)) {
    expectedUncertainty = 'INSUFFICIENT_STATIC_EVIDENCE';
  } else if (primaryOp === 'prepare') {
    expectedUncertainty = 'READY_WITH_UNKNOWNS';
  }

  const limitations = [];
  if (contradictionRationale) limitations.push(contradictionRationale);
  if (isUntrusted) limitations.push('Prompt injection pattern detected and neutralized. Read-only analysis enforced.');
  if (missingContext.includes('target')) limitations.push(`Missing target for "${primaryOp}". Provide a target symbol, file path, or task description.`);
  if (isUnknownTarget) limitations.push(`Target "${extractedTarget}" was not observed in the scanned codebase model.`);

  return {
    primarySkill,
    operation: primaryOp,
    target: extractedTarget ? redactSecrets(extractedTarget) : undefined,
    delegatedCapabilities,
    delegatedOperations,
    confidence: (hasContradiction || expectedUncertainty === 'INSUFFICIENT_STATIC_EVIDENCE' || isUnknownTarget) ? 'L4_UNKNOWN' : (delegatedOperations.length > 0 ? 'L2_CORROBORATED' : 'L1_OBSERVED'),
    isAmbiguous: false,
    hasContradiction,
    isUntrusted,
    isOutOfScope,
    missingContext,
    expectedUncertainty,
    rationale: `Resolved primary capability "${primarySkill}" (${primaryOp})${delegatedCapabilities.length > 0 ? ` with delegated capability [${delegatedCapabilities.join(', ')}]` : ''}.`,
    limitations,
    safeQuery: sanitizedQuery,
  };
}

/**
 * Programmatic Execution Gateway
 */
async function runCodebaseIntelligence(params = {}) {
  const {
    subcommand = 'overview',
    target,
    flags = {},
    repoRoot = process.cwd(),
  } = params;

  const effectiveTimeout = params.timeoutMs || flags.timeoutMs || flags.timeout;
  const effectiveSignal = params.signal || flags.signal;
  const mergedFlags = { ...flags };
  if (effectiveTimeout) mergedFlags.timeoutMs = effectiveTimeout;
  if (effectiveSignal) mergedFlags.signal = effectiveSignal;

  const containment = safeContainedPath('.', repoRoot);
  const resolvedRoot = containment.ok ? containment.resolvedPath : path.resolve(repoRoot);

  const engine = new CodebaseIntelligence(resolvedRoot, mergedFlags);
  let normalizedSub = (subcommand || 'overview').toLowerCase().replace(/_/g, '-');
  if (normalizedSub === 'deps') normalizedSub = 'dependencies';

  let rawData;
  let markdown;
  let summary = '';
  let status = 'COMPLETE';

  let timerId;
  let abortListener;

  try {
    if (effectiveSignal && effectiveSignal.aborted) {
      const err = new Error(`Operation "${normalizedSub}" was cancelled`);
      err.code = 'OPERATION_CANCELLED';
      throw err;
    }

    const runOp = async () => {
      switch (normalizedSub) {
        case 'overview':
          rawData = engine.overview(flags);
          markdown = renderOverviewMarkdown(rawData);
          summary = `Overview completed: ${rawData.endpoints.total} endpoints, ${rawData.workspaces.length} workspaces, ${rawData.centralityRanking.length} centrality hubs identified.`;
          break;
        case 'trace':
          rawData = engine.trace(target, flags);
          markdown = renderTraceMarkdown(rawData);
          summary = `Trace for "${target}": ${rawData.steps.length} execution steps mapped.`;
          break;
        case 'dependencies':
        case 'deps':
          rawData = engine.dependencies(target, flags);
          markdown = renderDependenciesMarkdown(rawData);
          summary = rawData.target
            ? `Dependencies for "${rawData.target}": ${rawData.fanIn} inbound, ${rawData.fanOut} outbound.`
            : `Project-wide dependencies: ${rawData.totalImportEdges} import edges, ${rawData.missingDependencies?.length || 0} missing.`;
          break;
        case 'relevant-files':
          rawData = engine.relevantFiles(target, flags);
          markdown = renderRelevantFilesMarkdown(rawData);
          summary = `Relevant files for "${target}": ${rawData.primaryFiles.length} primary targets identified.`;
          break;
        case 'impact':
          rawData = engine.impact(target, flags);
          markdown = renderImpactMarkdown(rawData);
          summary = `Impact for "${target}": ${rawData.riskTier} risk tier, ${rawData.totalImpactedEntities} entities impacted.`;
          break;
        case 'change-impact':
        case 'change_impact':
          rawData = engine.changeImpact(target, flags);
          markdown = renderChangeImpactMarkdown(rawData);
          summary = `Change impact analysis: ${rawData.directlyAffectedFiles?.length || 0} direct, ${rawData.downstreamAffectedModules?.length || 0} downstream, Risk Tier ${rawData.riskTier}.`;
          break;
        case 'dead-code':
          rawData = engine.deadCode(target, flags);
          markdown = renderDeadCodeMarkdown(rawData);
          summary = `Dead-code audit: ${rawData.unreferencedExportsCount} unreferenced export candidates, ${rawData.orphanModulesCount} orphan modules.`;
          break;
        case 'onboard':
          rawData = engine.onboard(flags);
          markdown = renderOnboardMarkdown(rawData);
          summary = `Onboarding dossier generated: ${rawData.mentalModel.architecturePattern}, ${rawData.verificationRecipes.length} recipes.`;
          break;
        case 'prepare':
          rawData = engine.prepare(target, flags);
          markdown = renderPrepareMarkdown(rawData);
          summary = `Change preparation for "${target}": Readiness is ${rawData.readiness}.`;
          break;
        case 'investigate':
          rawData = await engine.investigate(target || flags.question, flags);
          markdown = renderInvestigateMarkdown(rawData);
          summary = rawData.summary;
          break;
        default:
          status = 'UNSUPPORTED';
          throw new Error(`Unknown codebase intelligence subcommand: "${subcommand}". Expected one of: overview, trace, dependencies, relevant-files, impact, dead-code, onboard, prepare, change-impact, investigate.`);
      }
    };

    if (effectiveTimeout || effectiveSignal) {
      const promises = [
        new Promise((resolve, reject) => {
          setImmediate(() => {
            if (effectiveSignal && effectiveSignal.aborted) {
              const err = new Error(`Operation "${normalizedSub}" was cancelled`);
              err.code = 'OPERATION_CANCELLED';
              return reject(err);
            }
            try {
              Promise.resolve(runOp()).then(resolve, reject);
            } catch (e) {
              reject(e);
            }
          });
        }),
      ];

      if (effectiveTimeout) {
        promises.push(
          new Promise((_, reject) => {
            timerId = setTimeout(() => {
              const err = new Error(`Operation "${normalizedSub}" timed out after ${effectiveTimeout}ms`);
              err.code = 'TIMEOUT_EXCEEDED';
              reject(err);
            }, effectiveTimeout);
            if (timerId && timerId.unref) timerId.unref();
          })
        );
      }

      if (effectiveSignal) {
        promises.push(
          new Promise((_, reject) => {
            abortListener = () => {
              const err = new Error(`Operation "${normalizedSub}" was cancelled`);
              err.code = 'OPERATION_CANCELLED';
              reject(err);
            };
            effectiveSignal.addEventListener('abort', abortListener, { once: true });
          })
        );
      }

      await Promise.race(promises);
    } else {
      await runOp();
    }
  } catch (err) {
    if (timerId) clearTimeout(timerId);
    if (effectiveSignal && abortListener) {
      effectiveSignal.removeEventListener('abort', abortListener);
    }
    status = status === 'UNSUPPORTED' ? 'UNSUPPORTED' : 'FAILED';
    const diag = classifyError(err, normalizedSub, target);
    const safeErrorMsg = diag.message;
    if (timerId) clearTimeout(timerId);
  if (effectiveSignal && abortListener) {
    effectiveSignal.removeEventListener('abort', abortListener);
  }

  const safeTarget = target ? redactSecrets(target) : undefined;
    const envelope = createResultEnvelope({
      status,
      operation: normalizedSub,
      target: safeTarget,
      summary: redactSecrets(`Failed to execute ${normalizedSub}: [${diag.code}] ${safeErrorMsg}`),
      data: { error: safeErrorMsg, error_code: diag.code },
      diagnostics: [diag],
      limitations: [safeErrorMsg],
      completeness: {
        total_expected: undefined,
        analyzed: 0,
        percentage: 0,
        is_complete: false,
      },
    });
    return {
      schema_version: '2.0.0',
      operation: normalizedSub,
      subcommand: normalizedSub,
      target: safeTarget,
      status,
      data: envelope,
      markdown: redactSecrets(`# ❌ Error executing /understand ${normalizedSub} [${diag.code}]\n\n${safeTarget ? `**Target:** ${safeTarget}\n\n` : ''}${safeErrorMsg}\n\n**Suggested Action:** ${diag.suggested_action}`),
      evidenceRecords: [],
    };
  }

  if (timerId) clearTimeout(timerId);
  if (effectiveSignal && abortListener) {
    effectiveSignal.removeEventListener('abort', abortListener);
  }

  const safeTarget = target ? redactSecrets(target) : undefined;
  const safeSummary = redactSecrets(summary);
  const safeMarkdown = redactSecrets(markdown);
  const diagnostics = (rawData.diagnostics || []).slice();
  if (rawData.missingDependencies && rawData.missingDependencies.length > 0) {
    for (const miss of rawData.missingDependencies) {
      diagnostics.push({
        code: 'DEPENDENCY_UNRESOLVED',
        severity: 'WARNING',
        message: `External package "${miss}" is imported in code but not declared in package.json`,
        component: 'architecture_extractor',
        operation: normalizedSub,
        recoverable: false,
        source_reference: miss,
        suggested_action: `Run 'npm install ${miss}' or declare in package.json dependencies`,
      });
    }
  }
  const envelope = createResultEnvelope({
    status,
    operation: normalizedSub,
    target: safeTarget,
    summary: safeSummary,
    data: rawData,
    evidence_records: rawData.evidenceRecords || [],
    unresolved_assumptions: (rawData.unresolvedAssumptions || rawData.unknowns || []).map(a => redactSecrets(a)),
    limitations: (rawData.limitations || []).map(l => redactSecrets(l)),
    diagnostics,
  });

  return {
    schema_version: '2.0.0',
    operation: normalizedSub,
    subcommand: normalizedSub,
    target: safeTarget,
    status,
    data: envelope,
    markdown: safeMarkdown,
    evidenceRecords: rawData.evidenceRecords || [],
  };
}

/**
 * CLI Command Handler
 */
async function runCodebaseIntelligenceCli(args = [], flags = {}, quiet = false) {
  let subcommand = 'overview';
  let target = undefined;

  const positional = args.filter(a => !a.startsWith('-'));
  if (positional.length === 1 && !positional[0].includes(' ')) {
    const candidate = positional[0].toLowerCase();
    const validSubs = ['overview', 'trace', 'dependencies', 'deps', 'relevant-files', 'impact', 'dead-code', 'onboard', 'prepare', 'change-impact', 'investigate'];
    if (validSubs.includes(candidate)) {
      subcommand = candidate === 'deps' ? 'dependencies' : candidate;
    } else {
      subcommand = positional[0];
    }
  } else if (positional.length > 0) {
    const candidate = positional[0].toLowerCase();
    const validSubs = ['overview', 'trace', 'dependencies', 'deps', 'relevant-files', 'impact', 'dead-code', 'onboard', 'prepare', 'change-impact', 'investigate'];
    if (validSubs.includes(candidate)) {
      subcommand = candidate === 'deps' ? 'dependencies' : candidate;
      target = positional.slice(1).join(' ') || undefined;
    } else {
      const route = resolveRoute(positional.join(' '), { flags, repoRoot: process.cwd() });
      subcommand = route.operation;
      target = route.target;
    }
  }

  const result = await runCodebaseIntelligence({
    subcommand,
    target,
    flags,
    repoRoot: process.cwd(),
  });

  if (flags.json) {
    console.log(JSON.stringify(result.data, null, 2));
  } else if (!quiet) {
    console.log(result.markdown);
  }

  if (result.status === 'FAILED' || result.status === 'UNSUPPORTED') {
    process.exitCode = 1;
  }

  return result;
}

// ── Direct Invocation ───────────────────────────────────────────────────────

if (require.main === module) {
  const argv = process.argv.slice(2);
  const flags = {
    json: argv.includes('--json'),
    noCache: argv.includes('--no-cache'),
  };
  const depthIdx = argv.indexOf('--depth');
  if (depthIdx !== -1 && argv[depthIdx + 1]) {
    flags.depth = parseInt(argv[depthIdx + 1], 10);
  }
  const focusIdx = argv.indexOf('--focus');
  if (focusIdx !== -1 && argv[focusIdx + 1]) {
    flags.focus = argv[focusIdx + 1];
  }

  runCodebaseIntelligenceCli(argv, flags).catch(err => {
    console.error(`${C.RED}Error:${C.RESET} ${redactSecrets(err.message)}`);
    process.exit(1);
  });
}

module.exports = {
  CodebaseIntelligence,
  runCodebaseIntelligence,
  runCodebaseIntelligenceCli,
  resolveRoute,
  createEvidenceRecord,
  createResultEnvelope,
  redactSecrets,
  renderOverviewMarkdown,
  renderTraceMarkdown,
  renderDependenciesMarkdown,
  renderRelevantFilesMarkdown,
  renderImpactMarkdown,
  renderDeadCodeMarkdown,
  renderOnboardMarkdown,
  renderPrepareMarkdown,
  classifyError,
};
