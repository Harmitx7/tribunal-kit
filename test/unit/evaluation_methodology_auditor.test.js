'use strict';

const { EvaluationMethodologyAuditor } = require('../../src/evaluation/evaluation_methodology_auditor');

describe('Evaluation Methodology Auditor & Experimental Validity Gate', () => {
  let auditor;

  beforeEach(() => {
    auditor = new EvaluationMethodologyAuditor();
  });

  const validPlan = {
    objective: 'Measure reviewer precision, recall, and F1 on 50 security benchmark fixtures',
    taskType: 'CLASSIFICATION',
    sampleSize: 50,
    metrics: ['precision', 'recall', 'f1', 'confusion_matrix'],
    successCriteria: [
      'Precision >= 0.85',
      'Recall >= 0.90',
      'Zero critical regressions vs baseline v1.0',
    ],
    baselineId: 'baseline-v1.0.0',
    determinism: 'DETERMINISTIC',
  };

  it('approves a rigorous, well-powered evaluation methodology plan', () => {
    const report = auditor.auditMethodology(validPlan);
    expect(report.approved).toBe(true);
    expect(report.verdict).toBe('METHODOLOGY_APPROVED');
    expect(report.risks).toHaveLength(0);
    expect(report.powerAnalysis.adequate).toBe(true);
    expect(report.powerAnalysis.sampleSize).toBe(50);
  });

  it('rejects plan with vague objective or missing success criteria', () => {
    const invalidPlan = {
      ...validPlan,
      objective: 'test',
      successCriteria: [],
    };
    const report = auditor.auditMethodology(invalidPlan);
    expect(report.approved).toBe(false);
    expect(report.verdict).toBe('METHODOLOGY_REJECTED');
    expect(report.risks.some(r => r.includes('VAGUE_OBJECTIVE'))).toBe(true);
    expect(report.risks.some(r => r.includes('NO_SUCCESS_CRITERIA'))).toBe(true);
  });

  it('rejects plan with inadequate sample size (N < 10)', () => {
    const smallSamplePlan = {
      ...validPlan,
      sampleSize: 4,
    };
    const report = auditor.auditMethodology(smallSamplePlan);
    expect(report.approved).toBe(false);
    expect(report.risks.some(r => r.includes('INADEQUATE_SAMPLE_SIZE'))).toBe(true);
    expect(report.powerAnalysis.adequate).toBe(false);
  });

  it('rejects stochastic evaluation plan with fewer than 3 repeated runs', () => {
    const stochasticPlan = {
      ...validPlan,
      determinism: 'STOCHASTIC',
      repeatedRuns: 1,
    };
    const report = auditor.auditMethodology(stochasticPlan);
    expect(report.approved).toBe(false);
    expect(report.risks.some(r => r.includes('STOCHASTIC_UNDER_REPLICATION'))).toBe(true);
  });

  it('rejects cherry-picking attempts that filter negative cases or exclude failures', () => {
    const cherryPickedPlan = {
      ...validPlan,
      filterNegativeCases: true,
      excludeFailures: true,
    };
    const report = auditor.auditMethodology(cherryPickedPlan);
    expect(report.approved).toBe(false);
    expect(report.risks.some(r => r.includes('CHERRY_PICKING_RISK'))).toBe(true);
  });

  it('flags metric misalignment when classification task lacks precision/recall/F1', () => {
    const misalignedPlan = {
      ...validPlan,
      metrics: ['bleu_score', 'rouge'],
    };
    const report = auditor.auditMethodology(misalignedPlan);
    expect(report.approved).toBe(false);
    expect(report.risks.some(r => r.includes('METRIC_MISALIGNMENT'))).toBe(true);
  });

  it('handles null or invalid plan objects gracefully', () => {
    const report = auditor.auditMethodology(null);
    expect(report.approved).toBe(false);
    expect(report.risks[0]).toContain('PLAN_UNDEFINED');
  });
});
