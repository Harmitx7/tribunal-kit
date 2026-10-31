'use strict';

/**
 * evaluation_methodology_auditor.js — Independent Evaluation Methodology Auditor
 * ==============================================================================
 * Domain: AI Reliability & Evaluation (ai-reliability)
 *
 * Conducts independent meta-audits of proposed evaluation suites:
 * 1. Measurable criteria validation (rejects subjective/untestable plans)
 * 2. Statistical power & sample size adequacy check
 * 3. Metric-to-objective alignment
 * 4. Cherry-picking & selective reporting defense
 * 5. Determinism & repeated-run requirements
 */

class EvaluationMethodologyAuditor {
  /**
   * Audits an evaluation plan or methodology specification.
   *
   * @param {object} plan - Evaluation plan specification
   * @returns {object} Methodology audit report
   */
  auditMethodology(plan) {
    if (!plan || typeof plan !== 'object') {
      return {
        approved: false,
        risks: ['PLAN_UNDEFINED: Evaluation plan object is required.'],
        powerAnalysis: { adequate: false, sampleSize: 0 },
      };
    }

    const risks = [];
    const recommendations = [];

    // 1. Objectives & Criteria
    if (!plan.objective || plan.objective.trim().length < 10) {
      risks.push('VAGUE_OBJECTIVE: Stated evaluation objective lacks precision or detail.');
    }

    if (!Array.isArray(plan.successCriteria) || plan.successCriteria.length === 0) {
      risks.push('NO_SUCCESS_CRITERIA: Plan does not define measurable, testable success criteria.');
    }

    // 2. Sample Size & Statistical Power
    const sampleSize = plan.sampleSize || plan.totalCases || 0;
    let powerAdequate = true;

    if (sampleSize < 10) {
      risks.push(`INADEQUATE_SAMPLE_SIZE: Sample size (${sampleSize}) is too small for statistical validity (min 10 required, 30+ recommended).`);
      powerAdequate = false;
    } else if (sampleSize < 30) {
      recommendations.push(`MODEST_SAMPLE_SIZE: Sample size is ${sampleSize}; confidence intervals will be relatively wide.`);
    }

    // 3. Metric Alignment
    const metrics = plan.metrics || [];
    if (!Array.isArray(metrics) || metrics.length === 0) {
      risks.push('NO_METRICS_DEFINED: Evaluation fails to declare explicit mathematical metrics.');
    } else {
      if (plan.taskType === 'CLASSIFICATION' && !metrics.some(m => ['precision', 'recall', 'f1', 'confusion_matrix'].includes(m.toLowerCase()))) {
        risks.push('METRIC_MISALIGNMENT: Classification task lacks standard precision/recall/F1 metrics.');
      }
      if (plan.taskType === 'PROBABILISTIC' && !metrics.some(m => ['brier', 'ece', 'log_loss', 'calibration'].includes(m.toLowerCase()))) {
        risks.push('METRIC_MISALIGNMENT: Probabilistic prediction task lacks calibration/Brier metrics.');
      }
    }

    // 4. Repeated Runs for Stochastic Systems
    if (plan.determinism === 'STOCHASTIC') {
      const runs = plan.repeatedRuns || 1;
      if (runs < 3) {
        risks.push(`STOCHASTIC_UNDER_REPLICATION: Stochastic system evaluated with only ${runs} run(s). Minimum 3-5 runs required for variance estimation.`);
      }
    }

    // 5. Cherry-Picking Defenses
    if (plan.filterNegativeCases === true || plan.excludeFailures === true) {
      risks.push('CHERRY_PICKING_RISK: Plan explicitly filters out negative cases or failures, violating evaluation integrity.');
    }

    if (!plan.baselineId && !plan.hasBaseline) {
      recommendations.push('NO_BASELINE_SPECIFIED: Plan lacks a baseline comparison. Absolute scores alone may be ungrounded.');
    }

    return {
      approved: risks.length === 0,
      verdict: risks.length === 0 ? 'METHODOLOGY_APPROVED' : 'METHODOLOGY_REJECTED',
      risks,
      recommendations,
      powerAnalysis: {
        adequate: powerAdequate,
        sampleSize,
        recommendedMin: 30,
      },
    };
  }
}

module.exports = {
  EvaluationMethodologyAuditor,
};
