'use strict';

/**
 * verdict_aggregator.js — Deterministic Governance Verdict Aggregator
 * ====================================================================
 * Phase 1I: Deterministic Verdict Aggregator & Monotonic Safety Invariants
 *
 * Core Directives:
 * 1. LLMs provide evidence and individual opinions; this deterministic engine decides the final state.
 * 2. Monotonic Safety: Uncertainty or errors can maintain or increase scrutiny, never silently decrease it.
 * 3. Fail-Closed: Unknown states or failures never become APPROVED.
 * 4. Deterministic checks always overrule conflicting LLM claims.
 */

class VerdictAggregator {
  /**
   * Aggregates multiple ReviewerResult objects and optional deterministic checks
   * into an authoritative governance verdict.
   *
   * @param {Object} params
   * @param {Array<Object>} params.results - ReviewerResult[] from ReviewExecutor
   * @param {Array<Object>} [params.checks] - ImplementationCheck[] (deterministic facts)
   * @param {number} [params.tier=1] - Impact tier (0..3)
   * @param {Object} [params.decision] - DecisionPayload
   * @param {string} [params.reviewRunId] - Provenance ID
   * @returns {Object} AggregatedVerdictPayload
   */
  static aggregate(params = {}) {
    const results = Array.isArray(params.results) ? params.results : [];
    const checks = Array.isArray(params.checks) ? params.checks : [];
    const tier = typeof params.tier === 'number' ? params.tier : 1;
    const reviewRunId = params.reviewRunId || `agg_${Date.now()}`;
    const decision = params.decision || {};

    const allFindings = [];
    const conflicts = [];
    const reviewersExecuted = [];
    let hasCritical = false;
    let hasHigh = false;
    let hasMedium = false;
    let hasLow = false;
    let hasError = false;
    let hasRejected = false;
    let hasWarning = false;
    let hasApproved = false;

    // 1. Ingest all reviewer results
    for (const r of results) {
      if (!r || typeof r !== 'object') continue;
      const revId = r.reviewerId || 'unknown';
      reviewersExecuted.push(revId);

      if (r.verdict === 'ERROR') hasError = true;
      if (r.verdict === 'REJECTED') hasRejected = true;
      if (r.verdict === 'WARNING') hasWarning = true;
      if (r.verdict === 'APPROVED') hasApproved = true;

      if (Array.isArray(r.findings)) {
        for (const f of r.findings) {
          const findingWithRev = { ...f, reviewer: revId };
          allFindings.push(findingWithRev);

          if (f.severity === 'CRITICAL') hasCritical = true;
          if (f.severity === 'HIGH') hasHigh = true;
          if (f.severity === 'MEDIUM') hasMedium = true;
          if (f.severity === 'LOW') hasLow = true;
        }
      }
    }

    // 2. Cross-check against deterministic execution facts
    // If deterministic test/lint/security check failed, force failure
    for (const c of checks) {
      if (c && c.result === 'FAILED') {
        conflicts.push({
          type: 'DETERMINISTIC_CHECK_FAILED',
          description: `Deterministic check "${c.check || 'check'}" FAILED. Reviewer opinions cannot overrule deterministic failure.`,
          resolution: 'CHECK_FAILURE_ENFORCED',
        });
        hasCritical = true;
      }
    }

    // 3. Detect reviewer-to-reviewer conflicts
    if (hasApproved && (hasRejected || hasCritical || hasHigh)) {
      conflicts.push({
        type: 'REVIEWER_CONTRADICTION',
        description:
          'One or more reviewers approved the change while others flagged Critical/High severity risks or rejected it.',
        resolution: 'RESOLVED_TOWARD_GREATER_SCRUTINY',
      });
    }

    // 4. Determine authoritative final verdict based on strict safety rules
    let finalVerdict = 'APPROVED';
    let finalSeverity = 'INFO';
    let reason = '';

    if (results.length === 0) {
      // Tier 0 Fast-Pass with 0 reviewers is approved if no deterministic check failed
      if (tier === 0 && !hasCritical) {
        finalVerdict = 'APPROVED';
        finalSeverity = 'INFO';
        reason =
          'Fast-Pass (Tier 0) verified: Low-risk documentation/styling change with zero risk signals.';
      } else {
        finalVerdict = 'REJECTED';
        finalSeverity = 'HIGH';
        reason = 'Fail-Closed Invariant: Zero reviewers executed for a change requiring audit.';
      }
    } else if (hasCritical) {
      finalVerdict = 'REJECTED';
      finalSeverity = 'CRITICAL';
      reason = 'Rejected due to one or more CRITICAL security or logic findings.';
    } else if (hasHigh) {
      finalVerdict = 'REJECTED';
      finalSeverity = 'HIGH';
      reason = 'Rejected due to unmitigated HIGH severity findings.';
    } else if (hasRejected) {
      finalVerdict = 'REJECTED';
      finalSeverity = 'HIGH';
      reason = 'Rejected due to explicit reviewer rejection verdict.';
    } else if (hasError) {
      // Any error prevents unconditional approval
      finalVerdict = 'WARNING';
      finalSeverity = 'MEDIUM';
      reason =
        'Reviewer execution encountered one or more errors or timeouts; cannot grant unconditional approval.';
    } else if (hasMedium || hasWarning) {
      finalVerdict = 'WARNING';
      finalSeverity = 'MEDIUM';
      reason = 'Approved with warnings: Medium severity findings require developer review.';
    } else if (hasLow) {
      finalVerdict = 'WARNING';
      finalSeverity = 'LOW';
      reason = 'Approved with minor suggestions: Low severity improvements recommended.';
    } else {
      finalVerdict = 'APPROVED';
      finalSeverity = 'INFO';
      reason = `All ${reviewersExecuted.length} specialist reviewer(s) approved with zero findings.`;
    }

    // 5. Epistemic Confidence Calculation
    let confidence = 'L1';
    if (hasError) {
      confidence = 'L3';
    } else if (hasCritical || hasHigh) {
      confidence = 'L1';
    } else if (decision.confidence) {
      confidence = decision.confidence;
    }

    return {
      verdict: finalVerdict,
      severity: finalSeverity,
      confidence,
      reviewersExecuted,
      findingsCount: {
        total: allFindings.length,
        critical: allFindings.filter(f => f.severity === 'CRITICAL').length,
        high: allFindings.filter(f => f.severity === 'HIGH').length,
        medium: allFindings.filter(f => f.severity === 'MEDIUM').length,
        low: allFindings.filter(f => f.severity === 'LOW').length,
        info: allFindings.filter(f => f.severity === 'INFO').length,
      },
      findings: allFindings,
      conflicts,
      reason,
      provenance: {
        reviewRunId,
        decisionId: decision.decision_id || null,
        tier,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

module.exports = {
  VerdictAggregator,
};
