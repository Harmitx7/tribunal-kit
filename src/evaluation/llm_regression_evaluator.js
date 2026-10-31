'use strict';

/**
 * llm_regression_evaluator.js — AI Regression Evaluation & Safety Non-Masking Gate
 * ==============================================================================
 * Domain: AI Reliability & Evaluation (ai-reliability)
 *
 * Compares candidate vs baseline evaluations across versioned datasets.
 *
 * Core Law: Non-Masking Safety Invariant
 * An improvement in overall average pass rate CANNOT mask or permit
 * a critical safety or security regression.
 */

const { wilsonScoreInterval, compareIntervals } = require('./statistical_evaluator');

/**
 * Compares candidate evaluation execution against baseline evaluation execution.
 *
 * @param {Array<object>} candidateResults - Array of EvaluationResult objects
 * @param {Array<object>} baselineResults - Array of EvaluationResult objects
 * @param {object} [options]
 * @param {number} [options.regressionTolerance=0.0] - Allowed drop in non-critical pass rate
 * @returns {object} Comprehensive regression report
 */
function evaluateRegressions(candidateResults, baselineResults, options = {}) {
  if (!Array.isArray(candidateResults) || !Array.isArray(baselineResults)) {
    throw new Error('evaluateRegressions requires candidateResults and baselineResults arrays.');
  }

  const baselineMap = new Map();
  for (const b of baselineResults) {
    if (b.caseId) baselineMap.set(b.caseId, b);
  }

  let candidatePasses = 0;
  let baselinePasses = 0;
  const criticalSafetyRegressions = [];
  const nonCriticalRegressions = [];
  const newPasses = [];
  const matchedComparisons = [];

  for (const cand of candidateResults) {
    const base = baselineMap.get(cand.caseId);
    const candPassed = cand.verdict === 'PASS';
    if (candPassed) candidatePasses++;

    if (!base) continue;

    const basePassed = base.verdict === 'PASS';
    if (basePassed) baselinePasses++;

    matchedComparisons.push({
      caseId: cand.caseId,
      baseVerdict: base.verdict,
      candVerdict: cand.verdict,
      severity: cand.severity || base.severity || 'MEDIUM',
    });

    // Detect Regression (passed in baseline, failed in candidate)
    if (basePassed && !candPassed) {
      const severity = String(cand.severity || base.severity || 'MEDIUM').toUpperCase();
      const regressionItem = {
        caseId: cand.caseId,
        severity,
        baseVerdict: base.verdict,
        candVerdict: cand.verdict,
        reason: cand.failureDetails?.reason || 'Evaluation case failed in candidate run.',
      };

      if (severity === 'CRITICAL' || severity === 'HIGH') {
        criticalSafetyRegressions.push(regressionItem);
      } else {
        nonCriticalRegressions.push(regressionItem);
      }
    } else if (!basePassed && candPassed) {
      newPasses.push({
        caseId: cand.caseId,
        severity: cand.severity || 'MEDIUM',
      });
    }
  }

  // Statistical Wilson Score Intervals
  const candCI = wilsonScoreInterval(candidatePasses, candidateResults.length);
  const baseCI = wilsonScoreInterval(baselinePasses, baselineResults.length);
  const statComparison = compareIntervals(baseCI, candCI);

  // Release Decision Logic
  let releaseDecision = 'APPROVE_RELEASE';
  let releaseReason = 'Candidate demonstrates no regressions and maintains statistical equivalence or improvement.';

  if (criticalSafetyRegressions.length > 0) {
    // Non-Masking Safety Invariant Enforced
    releaseDecision = 'REJECTED_WITH_SAFETY_REGRESSION';
    releaseReason = `CRITICAL_INVARIANT_VIOLATION: ${criticalSafetyRegressions.length} critical safety/security cases regressed. Release is blocked regardless of overall pass rate.`;
  } else if (nonCriticalRegressions.length > 0 && statComparison.verdict === 'STATISTICALLY_SIGNIFICANT_REGRESSION') {
    releaseDecision = 'REJECTED_WITH_METRIC_REGRESSION';
    releaseReason = `Statistically significant regression observed across non-critical metrics (candidate [${candCI.lower}, ${candCI.upper}] vs baseline [${baseCI.lower}, ${baseCI.upper}]).`;
  } else if (nonCriticalRegressions.length > 0) {
    releaseDecision = 'CONDITIONALLY_APPROVED_WITH_WARNINGS';
    releaseReason = `Candidate had ${nonCriticalRegressions.length} non-critical regressions, but statistical bounds overlap baseline.`;
  }

  return {
    releaseDecision,
    releaseReason,
    safetyInvariantHeld: criticalSafetyRegressions.length === 0,
    metrics: {
      candidate: {
        total: candidateResults.length,
        passed: candidatePasses,
        passRate: candCI.p,
        confidenceInterval: [candCI.lower, candCI.upper],
      },
      baseline: {
        total: baselineResults.length,
        passed: baselinePasses,
        passRate: baseCI.p,
        confidenceInterval: [baseCI.lower, baseCI.upper],
      },
      statisticalComparison: statComparison,
    },
    criticalSafetyRegressions,
    nonCriticalRegressions,
    newPasses,
    matchedCasesCount: matchedComparisons.length,
  };
}

module.exports = {
  evaluateRegressions,
};
