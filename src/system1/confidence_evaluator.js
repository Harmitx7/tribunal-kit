'use strict';

/**
 * confidence_evaluator.js — System-1 Phase 6 Confidence-Driven Review Depth
 * =========================================================================
 * Formulates versioned confidence assessments (v1), enforces the 10 scoring
 * safeguards, implements deterministic review-depth policies, and provides
 * an adaptive escalation controller for targeted Phase 5 evidence requests
 * and dynamic reviewer escalation.
 */

const crypto = require('crypto');
const {
  CONFIDENCE_SCHEMA_VERSION,
  validateConfidenceAssessment,
  computeConfidenceFingerprint,
  ConfidenceEscalationBudgetManager,
} = require('./confidence_contract');
const { executeWithEvidenceRequests, resolveEvidenceRequests } = require('./evidence_resolver');
const { progressiveContextExpansion } = require('./progressive_context');
const { HIGH_RISK_PATTERNS } = require('./constants');

/**
 * Generates a unique assessment ID with "conf_" prefix.
 */
function generateAssessmentId() {
  return `conf_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Evaluates a versioned Confidence Assessment (Schema v1) implementing the 10 safeguards.
 *
 * @param {Object} params
 * @param {Object} params.execRes - Execution results ({ results, evidence_requests })
 * @param {Object} params.decisionPlan - Decision plan
 * @param {Object} [params.evidencePack] - Shared evidence pack
 * @param {Array<string>} [params.files] - Files under review
 * @param {string} [params.task] - Task description
 * @param {ConfidenceEscalationBudgetManager} [params.budgetManager] - Escalation budget manager
 * @param {string} [params.reviewRunId] - Review run ID
 * @returns {Object} Validated Confidence Assessment
 */
function evaluateConfidenceAssessment(params = {}) {
  const execRes = params.execRes || {};
  const decisionPlan = params.decisionPlan || {};
  const evidencePack = params.evidencePack || null;
  const files = Array.isArray(params.files) ? params.files : (decisionPlan.files || []);
  const task = params.task || decisionPlan.task || '';
  const budgetManager = params.budgetManager || new ConfidenceEscalationBudgetManager();
  const fallbackHash = crypto
    .createHash('sha256')
    .update(task + '::' + files.join(',') + '::' + (decisionPlan.decision_id || ''))
    .digest('hex')
    .slice(0, 12);
  const reviewRunId = params.reviewRunId || execRes.reviewRunId || `run_${fallbackHash}`;

  const results = Array.isArray(execRes.results) ? execRes.results : [];
  const evidenceRequests = Array.isArray(execRes.evidence_requests) ? execRes.evidence_requests : [];

  // Determine security-sensitive and risk characteristics
  const isSecuritySensitive =
    decisionPlan.security_sensitive === true ||
    HIGH_RISK_PATTERNS.test(task) ||
    files.some(f => HIGH_RISK_PATTERNS.test(f));
  const riskTier = typeof decisionPlan.tier === 'number' ? decisionPlan.tier : (decisionPlan.risk === 'HIGH' ? 3 : 1);
  const isHighRisk = decisionPlan.risk === 'HIGH' || riskTier >= 3;
  const isHighAmbiguity = decisionPlan.ambiguity === 'HIGH';

  // Evidence Pack inspection
  const packSummary = evidencePack?.summary || {
    total_records: 0,
    observed_count: 0,
    validated_count: 0,
    unverified_count: 0,
    stale_count: 0,
  };
  const totalEvidenceRecords = packSummary.total_records || 0;
  const staleCount = packSummary.stale_count || 0;
  const unverifiedCount = packSummary.unverified_count || 0;

  // Reviewer signals
  const hasExecutionErrors = results.some(r => r.verdict === 'ERROR');
  const hasRejections = results.some(r => r.verdict === 'REJECTED');
  const hasApproved = results.some(r => r.verdict === 'APPROVED');
  const hasWarnings = results.some(r => r.verdict === 'WARNING');
  const hasSevereContradiction = hasApproved && hasRejections;
  const hasWarningDisagreement = hasApproved && hasWarnings && !hasRejections;
  const hasCriticalFindings = results.some(r => (r.findings || []).some(f => f.severity === 'CRITICAL'));

  // Unverified findings or unsupported assertions check
  const hasUnverifiedClaims =
    unverifiedCount > 0 ||
    results.some(r =>
      (r.findings || []).some(
        f =>
          f.unverified === true ||
          (typeof f.title === 'string' && /(unverified|unsupported|unconfirmed)/i.test(f.title)) ||
          (!f.evidence_id && (!Array.isArray(f.evidence_ids) || f.evidence_ids.length === 0) && f.severity !== 'INFO')
      )
    );

  const hasUnresolvedRequests = evidenceRequests.some(
    r => r.status !== 'fulfilled' && r.status !== 'duplicate',
  );

  // Safeguard 3: Correlated Reviewer Detection
  let hasCorrelatedReviewers = false;
  if (results.length >= 2) {
    const findingsSignatures = results.map(r => {
      const fTitles = (r.findings || []).map(f => (f.title || f.message || '').trim()).sort().join('::');
      return `${r.verdict}__${fTitles}`;
    });
    const uniqueSigs = new Set(findingsSignatures);
    if (uniqueSigs.size === 1 && (results[0].findings || []).length > 0) {
      hasCorrelatedReviewers = true;
    }
  }

  // Safeguard 6: Missing evidence floor
  const hasNoEvidenceBase = totalEvidenceRecords === 0 && files.length > 0;

  // Build Score & Deductions
  let score = 1.0;
  const reasonCodes = [];
  const deductions = {
    execution_errors: 0.0,
    reviewer_disagreement: 0.0,
    unresolved_evidence: 0.0,
    stale_evidence: 0.0,
    unverified_claims: 0.0,
    high_risk: 0.0,
    high_ambiguity: 0.0,
    correlated_reviewers: 0.0,
    low_reported_confidence: 0.0,
  };
  const penaltiesApplied = [];

  // Safeguard 4: Deductions for errors & missing/stale evidence
  if (hasExecutionErrors) {
    deductions.execution_errors = 0.5;
    score -= 0.5;
    reasonCodes.push('FAILED_VERIFICATION');
    penaltiesApplied.push('execution_errors');
  }

  if (hasSevereContradiction) {
    deductions.reviewer_disagreement = 0.4;
    score -= 0.4;
    reasonCodes.push('LOW_REVIEWER_AGREEMENT');
    reasonCodes.push('REVIEWER_CONTRADICTION');
    penaltiesApplied.push('reviewer_disagreement');
  } else if (hasWarningDisagreement) {
    deductions.reviewer_disagreement = 0.2;
    score -= 0.2;
    reasonCodes.push('LOW_REVIEWER_AGREEMENT');
    reasonCodes.push('REVIEWER_WARNING_EXPANSION');
    penaltiesApplied.push('reviewer_disagreement');
  }

  if (hasUnresolvedRequests) {
    deductions.unresolved_evidence = 0.3;
    score -= 0.3;
    reasonCodes.push('UNRESOLVED_EVIDENCE_REQUEST');
    penaltiesApplied.push('unresolved_evidence');
  }

  if (staleCount > 0) {
    deductions.stale_evidence = 0.25;
    score -= 0.25;
    reasonCodes.push('STALE_EVIDENCE_RECORD');
    penaltiesApplied.push('stale_evidence');
  }

  // Safeguard 5: Deductions for unverified claims (cannot independently increase confidence)
  if (unverifiedCount > 0) {
    deductions.unverified_claims = 0.15;
    score -= 0.15;
    reasonCodes.push('UNVERIFIED_EVIDENCE_CLAIM');
    penaltiesApplied.push('unverified_claims');
  } else if (hasUnverifiedClaims) {
    deductions.unverified_claims = 0.15;
    score -= 0.15;
    reasonCodes.push('UNVERIFIED_EVIDENCE_CLAIM');
    penaltiesApplied.push('unverified_claims');
  }

  if (isHighRisk) {
    deductions.high_risk = 0.1;
    score -= 0.1;
    reasonCodes.push('HIGH_RISK');
    reasonCodes.push('HIGH_RISK_CHANGE');
    penaltiesApplied.push('high_risk');
  }

  if (isSecuritySensitive) {
    reasonCodes.push('SECURITY_SENSITIVE_BEHAVIOR');
  }

  if (isHighAmbiguity) {
    deductions.high_ambiguity = 0.1;
    score -= 0.1;
    reasonCodes.push('HIGH_AMBIGUITY');
    penaltiesApplied.push('high_ambiguity');
  }

  if (hasCorrelatedReviewers) {
    deductions.correlated_reviewers = 0.1;
    score -= 0.1;
    reasonCodes.push('CORRELATED_REVIEWERS');
    penaltiesApplied.push('correlated_reviewers');
  }

  // Reviewer reported confidence (sanitized against NaN, infinity, negative)
  const validConfs = results
    .map(r => r.confidence)
    .filter(c => typeof c === 'number' && Number.isFinite(c) && !Number.isNaN(c) && c >= 0.0 && c <= 1.0);
  if (validConfs.length > 0) {
    const minLlmConf = Math.min(...validConfs);
    if (minLlmConf < 0.8) {
      deductions.low_reported_confidence = 0.2;
      score -= 0.2;
      reasonCodes.push('LOW_REVIEWER_CONFIDENCE');
      penaltiesApplied.push('low_reported_confidence');
    }
  }

  // Bound score [0.0, 1.0]
  score = Math.max(0.0, Math.min(1.0, parseFloat(score.toFixed(4))));

  // Safeguard 9 & 6: Insufficient evidence status and confidence level
  let status = 'EVALUATED';
  let level = 'HIGH';

  if (hasNoEvidenceBase && evidencePack !== null) {
    status = 'INSUFFICIENT_EVIDENCE';
    level = 'INSUFFICIENT';
    score = 0.0;
    reasonCodes.push('INSUFFICIENT_EVIDENCE_BASE');
  } else if (score < 0.5) {
    level = 'LOW';
  } else if (score < 0.8 || hasUnverifiedClaims) {
    level = 'MEDIUM';
  } else {
    level = 'HIGH';
  }

  // Determine Review Depth using explicit precedence hierarchy:
  let reviewDepth = 'STANDARD';

  if (status === 'INSUFFICIENT_EVIDENCE') {
    reviewDepth = 'INSUFFICIENT_EVIDENCE';
    reasonCodes.push('INSUFFICIENT_EVIDENCE_BASE');
  } else if (isHighRisk || isSecuritySensitive || riskTier >= 3) {
    // Precedence 1: Deterministic Risk Tier & Security Sensitivity (authoritative)
    reviewDepth = 'DEEP';
    reasonCodes.push('MANDATORY_HIGH_RISK_SCRUTINY');
  } else if (hasExecutionErrors) {
    // Precedence 2: Failed Verification / Execution Errors
    reviewDepth = 'DEEP';
    reasonCodes.push('FAILED_VERIFICATION');
  } else if (hasCriticalFindings) {
    // Precedence 3: Critical Defect Findings Scrutiny
    reviewDepth = 'DEEP';
    reasonCodes.push('CRITICAL_FINDINGS_SCRUTINY');
  } else if (hasSevereContradiction) {
    // Precedence 4: Severe Reviewer Contradiction (Approved vs Rejected)
    reviewDepth = 'DEEP';
    reasonCodes.push('REVIEWER_CONTRADICTION');
  } else if (score < 0.50) {
    // Precedence 5: Low Confidence Floor (< 0.50)
    reviewDepth = 'DEEP';
    reasonCodes.push('LOW_CONFIDENCE_DEEP_SCRUTINY');
  } else if (hasWarningDisagreement) {
    // Precedence 6: Reviewer Disagreement / Warning Expansion
    reviewDepth = 'EXPANDED';
    reasonCodes.push('REVIEWER_WARNING_EXPANSION');
  } else if (hasUnresolvedRequests) {
    // Precedence 7: Unresolved Evidence Requests
    reviewDepth = 'EXPANDED';
    reasonCodes.push('UNRESOLVED_EVIDENCE_REQUEST');
  } else if (staleCount > 0) {
    // Precedence 8: Stale Evidence Records
    reviewDepth = 'EXPANDED';
    reasonCodes.push('STALE_EVIDENCE_RECORD');
  } else if (hasUnverifiedClaims) {
    // Precedence 9: Unverified Evidence Claims
    reviewDepth = 'EXPANDED';
    reasonCodes.push('UNVERIFIED_EVIDENCE_CLAIM');
  } else if (riskTier === 2) {
    // Precedence 10: Deterministic Risk Tier 2
    reviewDepth = 'EXPANDED';
    reasonCodes.push('TIER_2_EXPANDED_AUDIT');
  } else if (score < 0.80) {
    // Precedence 11: Moderate Confidence (0.50 <= score < 0.80)
    reviewDepth = 'EXPANDED';
    reasonCodes.push('MODERATE_CONFIDENCE_EXPANSION');
  } else {
    // Precedence 12: High Confidence Standard Review (score >= 0.80)
    reviewDepth = 'STANDARD';
  }

  // Determine Next Action
  let nextAction = 'CONTINUE';
  let stoppingReason = null;

  if (reviewDepth === 'STANDARD') {
    nextAction = 'STOP';
    stoppingReason = 'Sufficient evidence and high confidence achieved at standard depth';
  } else if (reviewDepth === 'INSUFFICIENT_EVIDENCE') {
    if (budgetManager.canRequestEvidence()) {
      nextAction = 'REQUEST_EVIDENCE';
    } else {
      nextAction = 'UNRESOLVED';
      stoppingReason = 'Evidence is insufficient and request budget is exhausted';
      reasonCodes.push('BUDGET_EXHAUSTED');
    }
  } else {
    // EXPANDED or DEEP
    if (!budgetManager.canEscalate()) {
      if (budgetManager.isTimedOut()) {
        nextAction = 'STOP';
        stoppingReason = 'Escalation timeout reached';
        reasonCodes.push('BUDGET_EXHAUSTED');
      } else if (budgetManager.currentRound >= budgetManager.maxRounds) {
        nextAction = 'STOP';
        stoppingReason = 'Maximum review-depth rounds reached';
        reasonCodes.push('MAX_DEPTH_REACHED');
      } else {
        nextAction = 'STOP';
        stoppingReason = 'Escalation token or resource budget exhausted';
        reasonCodes.push('BUDGET_EXHAUSTED');
      }
    } else if (hasUnresolvedRequests && budgetManager.canRequestEvidence()) {
      nextAction = 'REQUEST_EVIDENCE';
    } else if (budgetManager.canAddReviewer()) {
      nextAction = 'ADD_REVIEWER';
    } else if (budgetManager.canRequestEvidence()) {
      nextAction = 'REQUEST_EVIDENCE';
    } else {
      nextAction = 'STOP';
      stoppingReason = 'Eligible reviewers and requests already exhausted for current depth';
      reasonCodes.push('MAX_DEPTH_REACHED');
    }
  }

  // Reason codes unique & sorted
  const uniqueReasonCodes = Array.from(new Set(reasonCodes)).sort();

  const assessment = {
    assessment_id: generateAssessmentId(),
    schema_version: CONFIDENCE_SCHEMA_VERSION,
    review_run_id: reviewRunId,
    scope: {
      files,
      task,
      risk_tier: riskTier,
      security_sensitive: isSecuritySensitive,
    },
    status,
    level,
    score,
    review_depth: reviewDepth,
    next_action: nextAction,
    reason_codes: uniqueReasonCodes,
    score_components: {
      base: 1.0,
      deductions,
      penalties_applied: penaltiesApplied,
      provenance: {
        total_evidence_records: totalEvidenceRecords,
        observed_records: packSummary.observed_count || 0,
        validated_records: packSummary.validated_count || 0,
        unverified_records: unverifiedCount,
        stale_records: staleCount,
      },
    },
    escalation_budget: budgetManager.getSnapshot(),
    stopping_reason: stoppingReason,
    calibration_disclosure:
      'Uncalibrated heuristic. Evaluated based on deterministic risk, verification, and evidence completeness.',
  };

  assessment.fingerprint = computeConfidenceFingerprint(assessment);

  const validation = validateConfidenceAssessment(assessment);
  if (!validation.ok) {
    throw new Error(`Confidence assessment failed validation: ${validation.error}`);
  }

  return assessment;
}

/**
 * Backward-compatible evaluateConfidence for legacy callers.
 */
function evaluateConfidence(execRes, decisionPlan) {
  const assessment = evaluateConfidenceAssessment({ execRes, decisionPlan });
  return {
    score: assessment.score,
    level: assessment.level,
    signals: {
      has_unresolved_evidence: assessment.reason_codes.includes('UNRESOLVED_EVIDENCE_REQUEST'),
      has_reviewer_disagreement:
        assessment.reason_codes.includes('REVIEWER_CONTRADICTION') ||
        assessment.reason_codes.includes('LOW_REVIEWER_AGREEMENT'),
      has_execution_errors: assessment.reason_codes.includes('FAILED_VERIFICATION'),
      high_risk: assessment.scope.risk_tier >= 3,
      high_ambiguity: assessment.reason_codes.includes('HIGH_AMBIGUITY'),
    },
    reason_codes: assessment.reason_codes,
    assessment,
  };
}

/**
 * PHASE 3 & 4: Review Depth Escalation Reviewer Selection & Budget Adjustment.
 */
function getEscalatedReviewersAndBudget(pruningContract, currentDepth, baseDecisionPlan) {
  let pruned = pruningContract?.pruned_reviewers || [];
  if (pruned.length === 0 && pruningContract?.selected_reviewers) {
    const { REVIEWER_CATALOG } = require('./reviewer_orchestrator');
    const selected = new Set(pruningContract.selected_reviewers);
    pruned = REVIEWER_CATALOG.map(r => r.name || r).filter(r => !selected.has(r));
  }

  const additionalReviewers = [];
  let budgetMultiplier = 1.0;

  if (currentDepth === 1) {
    // Add 1 pruned reviewer, preferably security if available
    const sec = pruned.find(r => r.includes('security'));
    if (sec) additionalReviewers.push(sec);
    else if (pruned.length > 0) additionalReviewers.push(pruned[0]);
    budgetMultiplier = 1.25;
  } else if (currentDepth === 2) {
    // Add up to 2 pruned reviewers
    const sec = pruned.find(r => r.includes('security'));
    if (sec && !additionalReviewers.includes(sec)) additionalReviewers.push(sec);
    for (const r of pruned) {
      if (additionalReviewers.length >= 2) break;
      if (!additionalReviewers.includes(r)) additionalReviewers.push(r);
    }
    budgetMultiplier = 1.5;
  } else if (currentDepth >= 3) {
    // Add all pruned reviewers
    additionalReviewers.push(...pruned);
    budgetMultiplier = 2.0;
  }

  // Enforce Decision Plan limits
  const maxMultiplier = baseDecisionPlan?.context_budget?.max_expansion_multiplier || 2.0;
  budgetMultiplier = Math.min(budgetMultiplier, maxMultiplier);

  const baseMaxTokens = baseDecisionPlan?.context_budget?.max_tokens || 10000;
  const baseMaxItems = baseDecisionPlan?.context_budget?.max_items || 10;
  const baseRounds = baseDecisionPlan?.context_budget?.max_expansion_rounds || 2;

  const adjustedBudget = {
    max_tokens: Math.floor(baseMaxTokens * budgetMultiplier),
    max_items: Math.floor(baseMaxItems * budgetMultiplier),
    max_expansion_rounds: baseRounds,
  };

  return { additionalReviewers, adjustedBudget };
}

/**
 * Orchestrates Review Execution with Confidence-Driven Review Depth.
 */
async function executeWithConfidenceEscalation(options = {}) {
  const {
    executor,
    decision,
    decisionPlan,
    pruningContract,
    evidencePack,
    customDiff,
    task,
    initialReviewers,
    files,
    budgetOptions = {},
  } = options;

  const budgetManager = new ConfidenceEscalationBudgetManager(budgetOptions);
  const executedReviewerIds = new Set(initialReviewers);
  const allResults = [];
  const allEvidenceRequests = [];
  let totalDurationMs = 0;
  const aggregatedTelemetry = {
    reviewerCount: 0,
    successCount: 0,
    failureCount: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    concurrencyLimit: executor?.maxConcurrency || 3,
    roundsExecuted: 0,
  };

  let reviewRunId = null;
  let finalContextExpansion = null;
  let lastAssessment = null;

  let reviewersToRunThisDepth = [...initialReviewers];
  let currentDecisionPlan = { ...decisionPlan };

  while (budgetManager.recordRound()) {
    // 1. Progressive Context Expansion for the current batch
    const contextExpansion = progressiveContextExpansion({
      decisionPlan: currentDecisionPlan,
      selectedReviewers: Array.from(executedReviewerIds),
      task,
      diff: customDiff,
      files,
      evidencePack,
    });

    finalContextExpansion = contextExpansion;

    if (reviewersToRunThisDepth.length > 0) {
      // 2. Execute with Evidence Requests (Phase 5)
      const execRes = await executeWithEvidenceRequests({
        executor,
        decision,
        decisionPlan: currentDecisionPlan,
        customDiff,
        task,
        selectedReviewers: reviewersToRunThisDepth,
        initialContextExpansion: contextExpansion,
        maxRounds: currentDecisionPlan.context_budget?.max_expansion_rounds || 2,
      });

      if (!reviewRunId) reviewRunId = execRes.reviewRunId;
      totalDurationMs += execRes.durationMs;

      // Telemetry accounting
      aggregatedTelemetry.reviewerCount += execRes.telemetry.reviewerCount;
      aggregatedTelemetry.successCount += execRes.telemetry.successCount;
      aggregatedTelemetry.failureCount += execRes.telemetry.failureCount;
      if (typeof execRes.telemetry.inputTokens === 'number')
        aggregatedTelemetry.inputTokens += execRes.telemetry.inputTokens;
      if (typeof execRes.telemetry.outputTokens === 'number')
        aggregatedTelemetry.outputTokens += execRes.telemetry.outputTokens;
      if (typeof execRes.telemetry.totalTokens === 'number') {
        aggregatedTelemetry.totalTokens += execRes.telemetry.totalTokens;
        budgetManager.recordTokens(execRes.telemetry.totalTokens);
      }
      aggregatedTelemetry.roundsExecuted += execRes.telemetry.roundsExecuted;

      allResults.push(...execRes.results);
      allEvidenceRequests.push(...(execRes.evidence_requests || []));
    }

    // 3. Evaluate Confidence Assessment (Phase 6)
    lastAssessment = evaluateConfidenceAssessment({
      execRes: { results: allResults, evidence_requests: allEvidenceRequests, reviewRunId },
      decisionPlan: currentDecisionPlan,
      evidencePack,
      files,
      task,
      budgetManager,
      reviewRunId,
    });

    // Check loop termination / deduplication
    const recorded = budgetManager.recordFingerprint(lastAssessment.fingerprint);
    if (!recorded) {
      lastAssessment.stopping_reason = 'Deduplication: identical confidence state reached across rounds';
      break;
    }

    // Stopping conditions
    if (lastAssessment.next_action === 'STOP' || lastAssessment.next_action === 'UNRESOLVED' || lastAssessment.next_action === 'CONTINUE') {
      break;
    }

    // Handle Escalation Actions
    if (lastAssessment.next_action === 'REQUEST_EVIDENCE') {
      budgetManager.recordEvidenceRequest();
      // Resolve evidence requests using Phase 5 pipeline
      const newRequests = allEvidenceRequests.filter(r => r.status === 'pending');
      if (newRequests.length > 0) {
        resolveEvidenceRequests(newRequests, files, process.cwd(), {
          evidencePack,
          activeReviewers: Array.from(executedReviewerIds),
        });
      }
      // Continue to re-evaluate with updated evidence
      reviewersToRunThisDepth = [];
    } else if (lastAssessment.next_action === 'ADD_REVIEWER') {
      const { additionalReviewers, adjustedBudget } = getEscalatedReviewersAndBudget(
        pruningContract,
        budgetManager.currentRound,
        decisionPlan,
      );

      const unexecuted = additionalReviewers.filter(r => !executedReviewerIds.has(r));
      if (unexecuted.length === 0) {
        lastAssessment.stopping_reason = 'No remaining unexecuted pruned reviewers available';
        break;
      }

      // Add eligible reviewers
      const toAdd = unexecuted.slice(0, 1);
      reviewersToRunThisDepth = toAdd;
      for (const r of toAdd) {
        executedReviewerIds.add(r);
        budgetManager.recordReviewerExecution();
      }
      currentDecisionPlan = { ...decisionPlan, context_budget: adjustedBudget };
    } else {
      break;
    }
  }

  // Fallback assessment if loop didn't run
  if (!lastAssessment) {
    lastAssessment = evaluateConfidenceAssessment({
      execRes: { results: allResults, evidence_requests: allEvidenceRequests, reviewRunId },
      decisionPlan: currentDecisionPlan,
      evidencePack,
      files,
      task,
      budgetManager,
      reviewRunId,
    });
  }

  // Final structured decision
  const confidenceDecision = {
    confidence: lastAssessment.score,
    confidence_level: lastAssessment.level,
    review_depth: lastAssessment.review_depth,
    required_depth: lastAssessment.review_depth === 'DEEP' ? 2 : (lastAssessment.review_depth === 'EXPANDED' ? 1 : 0),
    escalation: budgetManager.currentRound > 1 || budgetManager.additionalReviewersExecuted > 0,
    reason_codes: lastAssessment.reason_codes,
    evidence_state: allEvidenceRequests.some(r => r.status === 'unavailable') ? 'INCOMPLETE' : 'COMPLETE',
    verification_state: lastAssessment.reason_codes.includes('FAILED_VERIFICATION') ? 'FAILED' : 'VERIFIED',
    fingerprint: lastAssessment.fingerprint,
    assessment: lastAssessment,
  };

  return {
    reviewRunId,
    results: allResults,
    durationMs: totalDurationMs,
    telemetry: aggregatedTelemetry,
    evidence_requests: allEvidenceRequests,
    final_context_expansion: finalContextExpansion,
    confidence_decision: confidenceDecision,
    assessment: lastAssessment,
  };
}

module.exports = {
  generateAssessmentId,
  evaluateConfidenceAssessment,
  evaluateConfidence,
  getEscalatedReviewersAndBudget,
  executeWithConfidenceEscalation,
};
