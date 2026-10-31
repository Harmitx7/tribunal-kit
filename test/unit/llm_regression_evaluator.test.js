'use strict';

const { evaluateRegressions } = require('../../src/evaluation/llm_regression_evaluator');

describe('LLM Regression Evaluator & Non-Masking Safety Invariant', () => {
  describe('Non-Masking Safety Invariant (Mandatory Gate)', () => {
    it('REJECTS candidate with higher overall pass rate if even a single CRITICAL case regressed', () => {
      // Baseline: 14 passed out of 20 (70%)
      // Candidate: 19 passed out of 20 (95%)
      // BUT case "SEC-001" (CRITICAL) passed in baseline and failed in candidate!
      const baselineResults = [
        { caseId: 'SEC-001', verdict: 'PASS', severity: 'CRITICAL' },
        ...Array(13).fill(null).map((_, i) => ({ caseId: `NORM-${i}`, verdict: 'PASS', severity: 'LOW' })),
        ...Array(6).fill(null).map((_, i) => ({ caseId: `FAIL-${i}`, verdict: 'FAIL', severity: 'LOW' })),
      ];

      const candidateResults = [
        {
          caseId: 'SEC-001',
          verdict: 'FAIL',
          severity: 'CRITICAL',
          failureDetails: { reason: 'SQL injection slipped through' },
        },
        ...Array(13).fill(null).map((_, i) => ({ caseId: `NORM-${i}`, verdict: 'PASS', severity: 'LOW' })),
        ...Array(6).fill(null).map((_, i) => ({ caseId: `FAIL-${i}`, verdict: 'PASS', severity: 'LOW' })), // Improved 6 cases!
      ];

      const report = evaluateRegressions(candidateResults, baselineResults);

      expect(report.safetyInvariantHeld).toBe(false);
      expect(report.releaseDecision).toBe('REJECTED_WITH_SAFETY_REGRESSION');
      expect(report.releaseReason).toContain('CRITICAL_INVARIANT_VIOLATION');
      expect(report.criticalSafetyRegressions).toHaveLength(1);
      expect(report.criticalSafetyRegressions[0].caseId).toBe('SEC-001');
      // Verify aggregate improvement didn't mask the failure
      expect(report.metrics.candidate.passRate).toBe(0.95);
      expect(report.metrics.baseline.passRate).toBe(0.70);
    });

    it('approves candidate when there are zero regressions and matching/improving pass rate', () => {
      const baselineResults = [
        { caseId: 'CASE-01', verdict: 'PASS', severity: 'HIGH' },
        { caseId: 'CASE-02', verdict: 'PASS', severity: 'MEDIUM' },
        { caseId: 'CASE-03', verdict: 'FAIL', severity: 'LOW' },
      ];

      const candidateResults = [
        { caseId: 'CASE-01', verdict: 'PASS', severity: 'HIGH' },
        { caseId: 'CASE-02', verdict: 'PASS', severity: 'MEDIUM' },
        { caseId: 'CASE-03', verdict: 'PASS', severity: 'LOW' }, // Fixed low case!
      ];

      const report = evaluateRegressions(candidateResults, baselineResults);
      expect(report.safetyInvariantHeld).toBe(true);
      expect(report.releaseDecision).toBe('APPROVE_RELEASE');
      expect(report.criticalSafetyRegressions).toHaveLength(0);
      expect(report.newPasses).toHaveLength(1);
    });

    it('flags statistically significant metric regression across non-critical cases', () => {
      // 50 cases: baseline has 45 passes (90%), candidate has 20 passes (40%), all LOW severity
      const baselineResults = Array(50).fill(null).map((_, i) => ({
        caseId: `CASE-${i}`,
        verdict: i < 45 ? 'PASS' : 'FAIL',
        severity: 'LOW',
      }));

      const candidateResults = Array(50).fill(null).map((_, i) => ({
        caseId: `CASE-${i}`,
        verdict: i < 20 ? 'PASS' : 'FAIL',
        severity: 'LOW',
      }));

      const report = evaluateRegressions(candidateResults, baselineResults);
      expect(report.safetyInvariantHeld).toBe(true);
      expect(report.releaseDecision).toBe('REJECTED_WITH_METRIC_REGRESSION');
      expect(report.nonCriticalRegressions.length).toBeGreaterThan(10);
    });

    it('conditionally approves with warning when non-critical regressions are small and bounds overlap', () => {
      // Baseline 10 cases: 9 pass. Candidate 10 cases: 8 pass (1 non-critical regression)
      const baselineResults = Array(10).fill(null).map((_, i) => ({
        caseId: `CASE-${i}`,
        verdict: i < 9 ? 'PASS' : 'FAIL',
        severity: 'LOW',
      }));

      const candidateResults = Array(10).fill(null).map((_, i) => ({
        caseId: `CASE-${i}`,
        verdict: i < 8 ? 'PASS' : 'FAIL',
        severity: 'LOW',
      }));

      const report = evaluateRegressions(candidateResults, baselineResults);
      expect(report.safetyInvariantHeld).toBe(true);
      expect(report.releaseDecision).toBe('CONDITIONALLY_APPROVED_WITH_WARNINGS');
      expect(report.nonCriticalRegressions).toHaveLength(1);
    });
  });
});
