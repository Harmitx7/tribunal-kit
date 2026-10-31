'use strict';

const fs = require('fs');
const path = require('path');
const {
  validateEvaluationDataset,
  validateEvaluationResult,
  calculateConfusionMatrix,
  calculateBrierScore,
  calculateExpectedCalibrationError,
  calculateCohensKappa,
  calculateFleissKappa,
  auditDatasetIntegrity,
  auditFindingsForHallucinations,
  evaluateRegressions,
  AgentBehavioralTestingEngine,
  EvaluationMethodologyAuditor,
} = require('../../src/evaluation');

const REPO_ROOT = path.resolve(__dirname, '../..');
const DATASET_PATH = path.join(REPO_ROOT, 'test/fixtures/ai_reliability/evaluation_dataset_v1.json');

describe('AI Reliability & Evaluation Domain — End-to-End Integration Suite', () => {
  let dataset;

  beforeAll(() => {
    expect(fs.existsSync(DATASET_PATH)).toBe(true);
    dataset = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf8'));
  });

  it('1. Validates canonical 30-category benchmark dataset schema and integrity', () => {
    const schemaValidation = validateEvaluationDataset(dataset);
    expect(schemaValidation.valid).toBe(true);

    const integrityReport = auditDatasetIntegrity(dataset);
    expect(integrityReport.valid).toBe(true);
    expect(integrityReport.violations).toHaveLength(0);
    expect(integrityReport.stats.totalCases).toBe(30);
  });

  it('2. Executes behavioral test cases through AgentBehavioralTestingEngine', async () => {
    const engine = new AgentBehavioralTestingEngine({ repoRoot: REPO_ROOT });
    const targetCase = dataset.cases.find(c => c.id === 'EVAL-001-CORRECT-FINDING');
    expect(targetCase).toBeDefined();

    const mockReviewer = async () => ({
      finding: 'SQL_INJECTION: User input in query should use parameterized query.',
      severity: 'CRITICAL',
    });

    const result = await engine.runBehavioralTest(targetCase, mockReviewer);
    expect(result.status).toBe('COMPLETED');
    expect(result.verdict).toBe('PASS');
    expect(result.evidence.length).toBeGreaterThan(0);
  });

  it('3. Runs hallucination detection on agent findings and classifies into 5 epistemic states', () => {
    const findings = [
      {
        id: 'F-VALID',
        assertion: 'Project main entry file is src/cli.js',
        evidence: [{ location: 'package.json:64' }],
      },
      {
        id: 'F-GHOST',
        assertion: 'Use super-jwt-checker to validate JWT algorithms',
        evidence: [{ location: 'package.json:1' }],
      },
      {
        id: 'F-UNSUPPORTED',
        assertion: 'System architecture contains hidden backdoor',
      },
    ];

    const audit = auditFindingsForHallucinations(findings, REPO_ROOT);
    expect(audit.totalFindings).toBe(3);
    expect(audit.verdictCounts.SUPPORTED).toBe(1);
    expect(audit.verdictCounts.CONTRADICTED).toBe(1);
    expect(audit.verdictCounts.UNSUPPORTED).toBe(1);
    expect(audit.hallucinationsDetected).toBe(2);
  });

  it('4. Computes classification and calibration metrics across simulated review outputs', () => {
    const pairs = [
      { predicted: 'VULNERABLE', actual: 'VULNERABLE' },
      { predicted: 'VULNERABLE', actual: 'VULNERABLE' },
      { predicted: 'SAFE', actual: 'SAFE' },
      { predicted: 'VULNERABLE', actual: 'SAFE' },
    ];
    const matrix = calculateConfusionMatrix(pairs, { positiveLabel: 'VULNERABLE' });
    expect(matrix.counts.tp).toBe(2);
    expect(matrix.counts.fp).toBe(1);
    expect(matrix.counts.tn).toBe(1);
    expect(matrix.metrics.precision).toBeCloseTo(0.6667, 3);

    const brier = calculateBrierScore([
      { probability: 0.9, outcome: true },
      { probability: 0.1, outcome: false },
    ]);
    expect(brier.brierScore).toBeCloseTo(0.01, 2);

    const ece = calculateExpectedCalibrationError([
      { confidence: 0.9, correct: true },
      { confidence: 0.8, correct: true },
    ]);
    expect(ece.ece).toBeLessThan(0.3);
  });

  it('5. Evaluates candidate vs baseline regressions and blocks release on critical regression', () => {
    const baseline = [
      { caseId: 'SEC-CRIT-01', verdict: 'PASS', severity: 'CRITICAL' },
      { caseId: 'FORMAT-01', verdict: 'FAIL', severity: 'LOW' },
    ];
    const candidate = [
      { caseId: 'SEC-CRIT-01', verdict: 'FAIL', severity: 'CRITICAL', failureDetails: { reason: 'Missed vulnerability' } },
      { caseId: 'FORMAT-01', verdict: 'PASS', severity: 'LOW' },
    ];

    const regressionReport = evaluateRegressions(candidate, baseline);
    expect(regressionReport.safetyInvariantHeld).toBe(false);
    expect(regressionReport.releaseDecision).toBe('REJECTED_WITH_SAFETY_REGRESSION');
  });

  it('6. Audits evaluation methodology and power analysis', () => {
    const auditor = new EvaluationMethodologyAuditor();
    const plan = {
      objective: 'Comprehensive AI Reliability Benchmark Evaluation across 30 cases',
      taskType: 'CLASSIFICATION',
      sampleSize: 30,
      metrics: ['precision', 'recall', 'f1', 'confusion_matrix'],
      successCriteria: ['Precision >= 0.80', 'Recall >= 0.85', 'Zero critical regressions'],
      baselineId: 'baseline-v1.0.0',
      determinism: 'DETERMINISTIC',
    };

    const report = auditor.auditMethodology(plan);
    expect(report.approved).toBe(true);
    expect(report.verdict).toBe('METHODOLOGY_APPROVED');
    expect(report.powerAnalysis.adequate).toBe(true);
  });
});
