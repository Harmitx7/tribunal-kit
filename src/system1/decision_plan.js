'use strict';

const crypto = require('crypto');
const { evaluateDecision } = require('./decision_engine');
const { detectRequiredDomains } = require('./reviewer_orchestrator');

/**
 * decision_plan.js — Phase 1: Validated Decision Plan Contract
 * =============================================================
 * Generates a structured, validated Decision Plan from existing Tribunal
 * signals. Laya System-1 is consulted when available; deterministic
 * fallback preserves full safety guarantees when it is not.
 *
 * Schema Version: 1
 *
 * Phase 1 Scope:
 *   - Decision Plan generation and validation.
 *   - Laya integration at the impact-tier decision point.
 *   - Deterministic fallback with structured reason.
 *   - Available to the existing orchestration pipeline.
 *
 * Phase 1 Boundaries (not implemented):
 *   - Dynamic reviewer pruning based on plan fields.
 *   - Shared evidence packs.
 *   - Progressive context expansion driven by plan.
 *   - Adaptive feedback loop.
 */

// Maximum safe length for task and diff inputs to prevent DoS
const MAX_TASK_LENGTH = 50000;
const MAX_DIFF_LENGTH = 500000;

/**
 * Sanitize a string input: strip zero-width characters, limit length,
 * and reject prompt-injection delimiters.
 * @param {string} raw
 * @param {number} maxLen
 * @returns {string}
 */
function sanitizeInput(raw, maxLen) {
  if (typeof raw !== 'string') return '';
  let s = raw.replace(/[\u200B-\u200D\uFEFF]/g, '');
  // Strip prompt injection delimiters that could be used to override policy
  s = s.replace(/<\/?(?:system|assistant|user|instruction|override|ignore)[^>]*>/gi, '');
  if (s.length > maxLen) {
    s = s.slice(0, maxLen);
  }
  return s;
}

/**
 * Attempts to obtain a Laya impact tier prediction.
 * Returns { layaTier, fallbackReason } — layaTier is null when Laya
 * is unavailable, disabled, or produces invalid output.
 *
 * This function never throws. All errors result in graceful fallback.
 *
 * @param {Object} options
 * @param {string[]} options.files
 * @param {string} options.task
 * @param {Object|null} options.provider - Optional pre-constructed System1Provider
 * @returns {{ layaTier: number|null, fallbackReason: string|null }}
 */
function attemptLayaClassification(options = {}) {
  const { files: _files = [], task: _task = '', provider = null } = options;

  // If a provider was explicitly passed, use it
  if (provider) {
    try {
      if (typeof provider.isAvailable === 'function' && !provider.isAvailable()) {
        return { layaTier: null, fallbackReason: 'System-1 provider reports unavailable' };
      }
      // Laya.classifyImpact is async, but buildDecisionPlan is synchronous.
      // Phase 1 constraint: Laya integration is synchronous-safe only when
      // the caller pre-resolves the tier and passes it as options.layaTier.
      // This function serves as documentation and future integration point.
      return { layaTier: null, fallbackReason: 'Synchronous Laya call not supported in Phase 1; use options.layaTier' };
    } catch (err) {
      return { layaTier: null, fallbackReason: `Provider check failed: ${err.message}` };
    }
  }

  // No provider passed — attempt lazy construction
  try {
    const { System1Provider } = require('./provider');
    const s1 = new System1Provider();
    if (!s1.isAvailable()) {
      return { layaTier: null, fallbackReason: 'System-1 is not installed or disabled' };
    }
    // Phase 1: Laya.classifyImpact is async; synchronous buildDecisionPlan
    // cannot await it. Callers should pre-resolve via options.layaTier.
    return { layaTier: null, fallbackReason: 'Synchronous Laya call not supported in Phase 1; use options.layaTier' };
  } catch (err) {
    return { layaTier: null, fallbackReason: `System-1 provider load failed: ${err.message}` };
  }
}

/**
 * Builds a structured Decision Plan from existing Tribunal signals.
 *
 * @param {Object} options
 * @param {string} [options.task] - Task description
 * @param {string} [options.diff] - Code diff
 * @param {string[]|string} [options.files] - Changed files
 * @param {number} [options.lines] - Line count
 * @param {number|null} [options.layaTier] - Pre-resolved Laya tier (0-3)
 * @param {Object} [options.evidence] - Pre-computed evidence
 * @param {Object} [options.browserSignal] - Pre-computed browser signal
 * @param {Object} [options.provider] - Pre-constructed System1Provider
 * @param {Array} [options.previousFindings] - Previous review findings
 * @param {string} [options.repoRoot] - Repository root
 * @returns {Object} Validated Decision Plan
 */
function buildDecisionPlan(options = {}) {
  // 0. Input sanitization
  const sanitizedTask = sanitizeInput(options.task, MAX_TASK_LENGTH);
  const sanitizedDiff = sanitizeInput(options.diff, MAX_DIFF_LENGTH);

  // 1. Attempt Laya classification if not pre-resolved
  let layaTier = options.layaTier ?? null;
  let fallbackReason = null;

  if (layaTier === null) {
    const layaResult = attemptLayaClassification({
      files: options.files,
      task: sanitizedTask,
      provider: options.provider || null,
    });
    layaTier = layaResult.layaTier;
    fallbackReason = layaResult.fallbackReason;
  }

  // Validate injected layaTier
  if (layaTier !== null) {
    if (typeof layaTier !== 'number' || isNaN(layaTier) || layaTier < 0 || layaTier > 3) {
      fallbackReason = `Invalid layaTier value rejected: ${layaTier}`;
      layaTier = null;
    } else {
      layaTier = Math.floor(layaTier); // Enforce integer
    }
  }

  // 2. Call evaluateDecision with sanitized inputs and resolved layaTier
  const decisionOptions = {
    ...options,
    task: sanitizedTask,
    diff: sanitizedDiff,
    layaTier,
  };
  const decision = evaluateDecision(decisionOptions);

  // 3. Derive Risk
  let risk = 'LOW';
  if (decision.explanation.fired_risk_signals.length > 0) {
    risk = 'HIGH';
  } else if (decision.tier >= 2) {
    risk = 'MEDIUM';
  }

  // 4. Domains
  const domains = detectRequiredDomains({
    files: options.files,
    diff: sanitizedDiff,
    task: sanitizedTask,
    evidence: options.evidence,
    previousFindings: options.previousFindings,
  });
  domains.sort(); // Stable sort for fingerprint determinism

  // 5. Ambiguity
  const taskStr = sanitizedTask.trim();
  const wordCount = taskStr.length > 0 ? taskStr.split(/\s+/).length : 0;
  const fileCount = Array.isArray(options.files)
    ? options.files.length
    : typeof options.files === 'string' && options.files
      ? 1
      : 0;

  let ambiguity = 'LOW';
  const vaguePatterns =
    /^(change|update|improve|modify|fix)\s+(auth|system|login|backend|database|security)$/i;

  if (vaguePatterns.test(taskStr)) {
    ambiguity = 'HIGH';
  } else if (wordCount > 0 && wordCount <= 2 && fileCount > 0) {
    ambiguity = 'HIGH';
  } else if (wordCount > 0 && wordCount <= 5) {
    const hasPathOrSymbol = /[/.]/.test(taskStr);
    if (!hasPathOrSymbol) {
      ambiguity = 'MEDIUM';
    }
  }

  // 6. Review Policy
  // Phase 1 does not execute dynamic reviewer pruning.
  // The Decision Plan describes reviewer policy as a prepared contract.
  const required_reviewers = (decision.reviewers.selected || []).map(r => r.reviewer).sort();
  const optional_reviewers = (decision.reviewers.rejected || [])
    .filter(r => !r.reason.includes('Zero domain overlap'))
    .map(r => r.reviewer)
    .sort();

  // 7. Context Budget
  let max_tokens = 4000;
  let max_items = 5;
  let max_expansion_multiplier = 2.0;
  if (decision.tier === 1) {
    max_tokens = 8000;
    max_items = 10;
    max_expansion_multiplier = 2.0;
  } else if (decision.tier === 2) {
    max_tokens = 16000;
    max_items = 20;
    max_expansion_multiplier = 1.5;
  } else if (decision.tier >= 3) {
    max_tokens = 32000;
    max_items = 40;
    max_expansion_multiplier = 1.0;
  }

  // 8. Evidence Mode
  let evidence_mode = 'MINIMAL';
  if (decision.tier === 1) evidence_mode = 'STANDARD';
  if (decision.tier === 2)
    evidence_mode = risk === 'HIGH' || ambiguity === 'HIGH' ? 'STRICT' : 'STANDARD';
  if (decision.tier >= 3) evidence_mode = 'STRICT';

  // 9. Verification Requirements
  const verification_requirements = [];
  if (decision.tier === 0) {
    verification_requirements.push('DETERMINISTIC_CHECKS');
  } else if (decision.tier === 1 || decision.tier === 2) {
    verification_requirements.push('EXECUTABLE_CHECKS');
    if (risk === 'HIGH' || decision.explanation.fired_risk_signals.length > 0) {
      verification_requirements.push('SECURITY_CHECKS');
    }
  } else {
    verification_requirements.push('FULL_VALIDATION');
  }

  // 10. Human Gate — monotonic safety: never weakened by Laya
  const human_gate = {
    required: decision.socratic_gate === 'required' || risk === 'HIGH' || decision.tier >= 3,
    reason: decision.escalated
      ? decision.escalation_reason
      : risk === 'HIGH'
        ? 'High risk operation'
        : decision.tier >= 3
          ? 'Tier 3 operation'
          : null,
  };

  if (human_gate.required && !human_gate.reason) {
    human_gate.reason = 'Tribunal policy requires human oversight';
  }

  // 11. Rationale — structured audit trail
  const rationale = [`impact_tier=T${decision.tier}`];
  if (risk !== 'LOW') rationale.push(`risk=${risk}`);
  if (domains.length > 0) rationale.push(`domains=${domains.join(',')}`);
  if (ambiguity !== 'LOW') rationale.push(`ambiguity=${ambiguity}`);
  rationale.push(`evidence_mode=${evidence_mode}`);
  if (human_gate.required) rationale.push('human_gate_required');
  if (decision.explanation.fired_risk_signals.length > 0) {
    const firstSignal = decision.explanation.fired_risk_signals[0].split(' ')[0].toLowerCase();
    rationale.push(`security_pattern=${firstSignal}`);
  }

  // 12. Decision Source — structured traceability
  const source = decision.explanation.fallback_used ? 'deterministic_fallback' : 'system1';

  const decision_source = {
    engine: source,
    laya_available: layaTier !== null,
    laya_tier: layaTier,
    fallback_used: decision.explanation.fallback_used,
    fallback_reason: fallbackReason || (decision.explanation.fallback_used ? 'Laya not provided or unavailable' : null),
    monotonic_safeguards: decision.explanation.monotonic_safeguards_applied || [],
  };

  // 13. Deterministic Fingerprint
  // Equivalent normalized inputs must produce equivalent fingerprints.
  // plan_id is NOT included (contains timestamp). decision_source is NOT
  // included (contains runtime availability info that doesn't affect the plan).
  const fingerprintInputs = JSON.stringify({
    task: sanitizedTask,
    files: Array.isArray(options.files)
      ? options.files.slice().sort()
      : typeof options.files === 'string'
        ? options.files
        : '',
    diff: sanitizedDiff,
    tier: decision.tier,
    layaTier: layaTier,
    evidenceConfidence: decision.signals.evidence_confidence,
  });
  const fingerprint = crypto.createHash('sha256').update(fingerprintInputs).digest('hex');

  const plan = {
    schema_version: 1,
    plan_id: `DP-${Date.now()}-${fingerprint.slice(0, 8)}`,
    fingerprint,
    tier: decision.tier,
    tier_name: decision.tier_name,
    risk,
    domains,
    ambiguity,
    required_reviewers,
    optional_reviewers,
    context_budget: {
      max_tokens,
      max_items,
      max_expansion_multiplier,
    },
    evidence_mode,
    verification_requirements,
    human_gate,
    rationale,
    source,
    decision_source,
  };

  // 14. Self-validate before returning
  const validation = validateDecisionPlan(plan);
  if (!validation.valid) {
    // This should never happen with correct buildDecisionPlan logic.
    // If it does, return a fail-closed Tier 3 plan.
    return buildFailClosedPlan(
      `Internal validation failure: ${validation.error}`,
      sanitizedTask,
      options.files,
      sanitizedDiff,
    );
  }

  return plan;
}

/**
 * Builds a fail-closed Tier 3 Decision Plan when normal construction fails.
 * Guarantees Human Gate is required and all mandatory verifications are active.
 *
 * @param {string} reason - Why the fail-closed plan was generated
 * @param {string} task
 * @param {string[]|string} files
 * @param {string} diff
 * @returns {Object} Fail-closed Decision Plan
 */
function buildFailClosedPlan(reason, task = '', files = [], diff = '') {
  const fingerprintInputs = JSON.stringify({
    task: task || '',
    files: Array.isArray(files) ? files.slice().sort() : typeof files === 'string' ? files : '',
    diff: diff || '',
    tier: 3,
    layaTier: null,
    evidenceConfidence: 'L4',
  });
  const fingerprint = crypto.createHash('sha256').update(fingerprintInputs).digest('hex');

  return {
    schema_version: 1,
    plan_id: `DP-${Date.now()}-${fingerprint.slice(0, 8)}`,
    fingerprint,
    tier: 3,
    tier_name: 'Full Gauntlet',
    risk: 'HIGH',
    domains: [],
    ambiguity: 'HIGH',
    required_reviewers: [],
    optional_reviewers: [],
    context_budget: {
      max_tokens: 32000,
      max_items: 40,
      max_expansion_multiplier: 1.0,
    },
    evidence_mode: 'STRICT',
    verification_requirements: ['FULL_VALIDATION'],
    human_gate: {
      required: true,
      reason: `Fail-closed: ${reason}`,
    },
    rationale: ['fail_closed', `reason=${reason}`],
    source: 'deterministic_fallback',
    decision_source: {
      engine: 'deterministic_fallback',
      laya_available: false,
      laya_tier: null,
      fallback_used: true,
      fallback_reason: reason,
      monotonic_safeguards: ['Fail-closed plan generated due to construction failure'],
    },
  };
}

/**
 * Validates a Decision Plan payload against the Phase 1 schema contract.
 * Rejects malformed, out-of-range, or unsupported values.
 *
 * @param {Object} plan
 * @returns {{ valid: boolean, error?: string }}
 */
function validateDecisionPlan(plan) {
  if (!plan || typeof plan !== 'object') {
    return { valid: false, error: 'Plan must be an object' };
  }
  if (plan.schema_version !== 1) {
    return { valid: false, error: 'Invalid schema_version' };
  }
  if (typeof plan.tier !== 'number' || plan.tier < 0 || plan.tier > 3 || !Number.isInteger(plan.tier)) {
    return { valid: false, error: 'Invalid tier' };
  }
  if (!['LOW', 'MEDIUM', 'HIGH'].includes(plan.risk)) {
    return { valid: false, error: 'Invalid risk' };
  }
  if (!Array.isArray(plan.domains)) {
    return { valid: false, error: 'Domains must be an array' };
  }
  // Reject non-string domain entries
  if (plan.domains.some(d => typeof d !== 'string')) {
    return { valid: false, error: 'All domains must be strings' };
  }
  if (!['LOW', 'MEDIUM', 'HIGH'].includes(plan.ambiguity)) {
    return { valid: false, error: 'Invalid ambiguity' };
  }
  if (!Array.isArray(plan.required_reviewers) || !Array.isArray(plan.optional_reviewers)) {
    return { valid: false, error: 'Reviewers must be arrays' };
  }
  // Reject non-string reviewer entries
  if (
    plan.required_reviewers.some(r => typeof r !== 'string') ||
    plan.optional_reviewers.some(r => typeof r !== 'string')
  ) {
    return { valid: false, error: 'All reviewer names must be strings' };
  }
  if (
    !plan.context_budget ||
    typeof plan.context_budget.max_tokens !== 'number' ||
    typeof plan.context_budget.max_items !== 'number'
  ) {
    return { valid: false, error: 'Invalid context budget' };
  }
  if (plan.context_budget.max_tokens < 0 || plan.context_budget.max_items < 0) {
    return { valid: false, error: 'Context budget values must be non-negative' };
  }
  if (
    typeof plan.context_budget.max_expansion_multiplier !== 'number' ||
    plan.context_budget.max_expansion_multiplier < 1.0
  ) {
    return { valid: false, error: 'Invalid context budget expansion multiplier' };
  }
  if (!['MINIMAL', 'STANDARD', 'STRICT'].includes(plan.evidence_mode)) {
    return { valid: false, error: 'Invalid evidence mode' };
  }
  if (!Array.isArray(plan.verification_requirements)) {
    return { valid: false, error: 'Verification requirements must be an array' };
  }
  // Validate verification requirement values
  const VALID_VERIFICATION = ['DETERMINISTIC_CHECKS', 'EXECUTABLE_CHECKS', 'SECURITY_CHECKS', 'FULL_VALIDATION'];
  if (plan.verification_requirements.some(v => !VALID_VERIFICATION.includes(v))) {
    return { valid: false, error: 'Invalid verification requirement value' };
  }
  if (!plan.human_gate || typeof plan.human_gate.required !== 'boolean') {
    return { valid: false, error: 'Invalid human_gate structure' };
  }
  // Monotonic safety: if risk is HIGH or tier >= 3, human_gate MUST be required
  if ((plan.risk === 'HIGH' || plan.tier >= 3) && !plan.human_gate.required) {
    return { valid: false, error: 'Human Gate must be required for HIGH risk or Tier 3 operations' };
  }
  if (plan.source !== 'system1' && plan.source !== 'deterministic_fallback') {
    return { valid: false, error: 'Invalid source' };
  }
  if (!Array.isArray(plan.rationale)) {
    return { valid: false, error: 'Rationale must be an array' };
  }
  if (typeof plan.fingerprint !== 'string' || plan.fingerprint.length !== 64) {
    return { valid: false, error: 'Invalid fingerprint' };
  }
  // Validate decision_source if present (Phase 1 field)
  if (plan.decision_source) {
    if (typeof plan.decision_source !== 'object') {
      return { valid: false, error: 'decision_source must be an object' };
    }
    if (plan.decision_source.engine !== 'system1' && plan.decision_source.engine !== 'deterministic_fallback') {
      return { valid: false, error: 'Invalid decision_source.engine' };
    }
    if (typeof plan.decision_source.laya_available !== 'boolean') {
      return { valid: false, error: 'decision_source.laya_available must be boolean' };
    }
    if (typeof plan.decision_source.fallback_used !== 'boolean') {
      return { valid: false, error: 'decision_source.fallback_used must be boolean' };
    }
  }

  return { valid: true };
}

module.exports = {
  buildDecisionPlan,
  validateDecisionPlan,
  buildFailClosedPlan,
  attemptLayaClassification,
  sanitizeInput,
  MAX_TASK_LENGTH,
  MAX_DIFF_LENGTH,
};
