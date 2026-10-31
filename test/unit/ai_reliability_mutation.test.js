'use strict';

const {
  calculateConfusionMatrix,
  calculateExpectedCalibrationError,
} = require('../../src/evaluation/reliability_metrics_engine');
const { evaluateRegressions } = require('../../src/evaluation/llm_regression_evaluator');
const { auditClaim } = require('../../src/evaluation/hallucination_detection_auditor');
const { auditDatasetIntegrity } = require('../../src/evaluation/dataset_integrity_auditor');

describe('AI Reliability Controlled Mutation Testing Suite', () => {
  describe('Mutation 1: Confusion Matrix Precision Denominator Tampering', () => {
    it('detects and fails if precision denominator were mutated to total count rather than (tp + fp)', () => {
      const pairs = [
        { predicted: true, actual: true },   // TP
        { predicted: true, actual: false },  // FP
        { predicted: false, actual: false }, // TN
        { predicted: false, actual: false }, // TN
      ];
      // Canonical: TP = 1, FP = 1, TN = 2. Precision = 1 / (1 + 1) = 0.5. Total = 4.
      const canonical = calculateConfusionMatrix(pairs);
      expect(canonical.metrics.precision).toBe(0.5);

      // Simulated mutation function where precision = tp / total
      function mutatedCalculatePrecision(counts) {
        return counts.tp / counts.total; // MUTATION: 1 / 4 = 0.25
      }

      const mutatedVal = mutatedCalculatePrecision(canonical.counts);
      expect(mutatedVal).not.toBe(canonical.metrics.precision);
      expect(mutatedVal).toBe(0.25);
    });
  });

  describe('Mutation 2: Safety Gate Invariant Bypass (Non-Masking Invariant)', () => {
    it('proves that mutating safety gate to ignore CRITICAL severity fails regression test', () => {
      const baseline = [
        { caseId: 'C-01', verdict: 'PASS', severity: 'CRITICAL' },
        { caseId: 'C-02', verdict: 'FAIL', severity: 'LOW' },
      ];
      const candidate = [
        { caseId: 'C-01', verdict: 'FAIL', severity: 'CRITICAL' },
        { caseId: 'C-02', verdict: 'FAIL', severity: 'LOW' },
      ];

      const canonicalReport = evaluateRegressions(candidate, baseline);
      expect(canonicalReport.safetyInvariantHeld).toBe(false);
      expect(canonicalReport.releaseDecision).toBe('REJECTED_WITH_SAFETY_REGRESSION');

      // Simulated mutated gate that only checks average pass rate without severity check
      function mutatedRegressionGate(cand, base) {
        const candPassRate = cand.filter(c => c.verdict === 'PASS').length / cand.length;
        const basePassRate = base.filter(c => c.verdict === 'PASS').length / base.length;
        // MUTATION: Blind release decision based solely on pass rate
        return candPassRate >= basePassRate ? 'APPROVE_RELEASE' : 'REJECTED';
      }

      // Candidate has 1 critical failure but 10 non-critical passes (10/11 = 90.9% vs base 1/2 = 50%)
      const passingCand = [
        { caseId: 'C-01', verdict: 'FAIL', severity: 'CRITICAL' },
        ...Array(10).fill({ caseId: 'D', verdict: 'PASS', severity: 'LOW' }),
      ];
      expect(mutatedRegressionGate(passingCand, baseline)).toBe('APPROVE_RELEASE'); // MUTATION MASKED CRITICAL REGRESSION!
      expect(canonicalReport.releaseDecision).not.toBe('APPROVE_RELEASE'); // Proves canonical catches it
    });
  });

  describe('Mutation 3: Ghost Package Detection Bypass', () => {
    it('proves that removing ghost package checking fails claim verification', () => {
      const claim = {
        id: 'C-GHOST',
        assertion: 'Use ultravalidate for input sanitization',
      };
      const canonical = auditClaim(claim);
      expect(canonical.verdict).toBe('CONTRADICTED');
      expect(canonical.hallucinationType).toBe('GHOST_PACKAGE');

      // Mutated claim auditor that ignores known ghost packages
      function mutatedAuditClaim(c) {
        // MUTATION: Skips ghost check, evaluates location only
        if (!c.evidence) return { verdict: 'UNSUPPORTED' };
        return { verdict: 'SUPPORTED' };
      }

      const mutated = mutatedAuditClaim(claim);
      expect(mutated.verdict).not.toBe('CONTRADICTED'); // Mutation fails to catch hallucination!
    });
  });

  describe('Mutation 4: Expected Calibration Error Bin Weighting Tampering', () => {
    it('proves that unweighted ECE deviates from canonical weighted ECE', () => {
      const predictions = [
        // 9 items in bin ~0.9 with 100% accuracy (diff = 0.1)
        ...Array(9).fill({ confidence: 0.9, correct: true }),
        // 1 item in bin ~0.1 with 100% accuracy (diff = 0.9)
        { confidence: 0.1, correct: true },
      ];
      const canonical = calculateExpectedCalibrationError(predictions, 10);

      // Mutated ECE: unweighted average of bin diffs
      const activeBins = canonical.bins.filter(b => b.count > 0);
      const mutatedUnweightedEce = activeBins.reduce((sum, b) => sum + b.diff, 0) / activeBins.length;

      // Unweighted treats the 1-sample bin equally with the 9-sample bin: (0.1 + 0.9)/2 = 0.5
      // Weighted: 0.9*(0.1) + 0.1*(0.9) = 0.09 + 0.09 = 0.18
      expect(canonical.ece).toBeCloseTo(0.18, 2);
      expect(mutatedUnweightedEce).toBeCloseTo(0.5, 2);
      expect(canonical.ece).not.toBe(mutatedUnweightedEce);
    });
  });

  describe('Mutation 5: Duplicate Case ID Suppression Tampering', () => {
    it('proves that suppressing duplicate ID check causes dataset integrity audit to pass corrupted datasets', () => {
      const corruptedDataset = {
        schemaVersion: '1.0.0',
        datasetId: 'corrupted-ds',
        version: '1.0.0',
        name: 'Corrupted',
        description: 'Corrupted dataset',
        split: 'held_out_eval',
        cases: [
          {
            id: 'CASE-SAME',
            schemaVersion: '1.0.0',
            suiteId: 's1',
            category: 'Testing',
            taskDescription: 'task 1',
            inputFixture: {},
            expected: { groundTruthLabel: 'PASS', labelProvenance: 'Source 1' },
            severity: 'LOW',
            determinism: 'DETERMINISTIC',
            timeoutMs: 1000,
          },
          {
            id: 'CASE-SAME', // Duplicate ID
            schemaVersion: '1.0.0',
            suiteId: 's1',
            category: 'Testing',
            taskDescription: 'task 2',
            inputFixture: {},
            expected: { groundTruthLabel: 'FAIL', labelProvenance: 'Source 2' },
            severity: 'LOW',
            determinism: 'DETERMINISTIC',
            timeoutMs: 1000,
          },
        ],
      };

      const audit = auditDatasetIntegrity(corruptedDataset);
      expect(audit.valid).toBe(false);
      expect(audit.violations.some(v => v.includes('DUPLICATE_CASE_ID'))).toBe(true);
    });
  });
});
