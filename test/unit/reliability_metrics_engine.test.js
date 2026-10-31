'use strict';

const {
  calculateConfusionMatrix,
  calculateCohensKappa,
  calculateFleissKappa,
} = require('../../src/evaluation/reliability_metrics_engine');

describe('Reliability Metrics Engine', () => {
  describe('Confusion Matrix & Classification Metrics', () => {
    it('computes standard binary confusion matrix and derived rates accurately', () => {
      const pairs = [
        { predicted: true, actual: true },   // TP
        { predicted: true, actual: true },   // TP
        { predicted: true, actual: false },  // FP
        { predicted: false, actual: false }, // TN
        { predicted: false, actual: false }, // TN
        { predicted: false, actual: false }, // TN
        { predicted: false, actual: true },  // FN
      ];
      const result = calculateConfusionMatrix(pairs, { positiveLabel: true });

      expect(result.counts).toEqual({
        tp: 2,
        fp: 1,
        tn: 3,
        fn: 1,
        total: 7,
      });

      // Precision: 2 / (2 + 1) = 0.6667
      expect(result.metrics.precision).toBe(0.6667);
      // Recall: 2 / (2 + 1) = 0.6667
      expect(result.metrics.recall).toBe(0.6667);
      // Specificity: 3 / (3 + 1) = 0.75
      expect(result.metrics.specificity).toBe(0.75);
      // F1: 2 * (0.66667 * 0.66667) / (0.66667 + 0.66667) = 0.6667
      expect(result.metrics.f1).toBe(0.6667);
      // FPR: 1 / (3 + 1) = 0.25
      expect(result.metrics.fpr).toBe(0.25);
      // FNR: 1 / (2 + 1) = 0.3333
      expect(result.metrics.fnr).toBe(0.3333);
      // Accuracy: (2 + 3) / 7 = 0.7143
      expect(result.metrics.accuracy).toBe(0.7143);

      expect(result.zeroDenominatorFlags).toEqual({
        precision: false,
        recall: false,
        specificity: false,
      });
    });

    it('enforces safe zero-denominator behavior when classes are absent', () => {
      // No positive predictions or actuals
      const pairs = [
        { predicted: false, actual: false },
        { predicted: false, actual: false },
      ];
      const result = calculateConfusionMatrix(pairs);

      expect(result.counts).toEqual({ tp: 0, fp: 0, tn: 2, fn: 0, total: 2 });
      expect(result.metrics.precision).toBe(0);
      expect(result.metrics.recall).toBe(0);
      expect(result.metrics.f1).toBe(0);
      expect(result.zeroDenominatorFlags.precision).toBe(true);
      expect(result.zeroDenominatorFlags.recall).toBe(true);
      expect(result.zeroDenominatorFlags.specificity).toBe(false);
    });

    it('supports custom string positive labels (e.g. VULNERABLE)', () => {
      const pairs = [
        { predicted: 'VULNERABLE', actual: 'VULNERABLE' },
        { predicted: 'SAFE', actual: 'VULNERABLE' },
        { predicted: 'SAFE', actual: 'SAFE' },
      ];
      const result = calculateConfusionMatrix(pairs, { positiveLabel: 'VULNERABLE' });

      expect(result.counts.tp).toBe(1);
      expect(result.counts.fn).toBe(1);
      expect(result.counts.tn).toBe(1);
      expect(result.counts.fp).toBe(0);
      expect(result.metrics.precision).toBe(1.0);
      expect(result.metrics.recall).toBe(0.5);
    });

    it('throws when input is not an array', () => {
      expect(() => calculateConfusionMatrix(null)).toThrow(/expects an array/);
    });
  });

  describe("Cohen's Kappa (Inter-Reviewer Agreement)", () => {
    it('yields kappa = 1.0 when two raters agree completely on varied categories', () => {
      const ratings = [
        { raterA: 'PASS', raterB: 'PASS' },
        { raterA: 'FAIL', raterB: 'FAIL' },
        { raterA: 'PASS', raterB: 'PASS' },
        { raterA: 'INCONCLUSIVE', raterB: 'INCONCLUSIVE' },
      ];
      const result = calculateCohensKappa(ratings);
      expect(result.kappa).toBe(1.0);
      expect(result.observedAgreement).toBe(1.0);
      expect(result.sampleSize).toBe(4);
    });

    it('yields negative kappa when raters disagree systematically', () => {
      const ratings = [
        { raterA: 'PASS', raterB: 'FAIL' },
        { raterA: 'FAIL', raterB: 'PASS' },
        { raterA: 'PASS', raterB: 'FAIL' },
        { raterA: 'FAIL', raterB: 'PASS' },
      ];
      const result = calculateCohensKappa(ratings);
      expect(result.observedAgreement).toBe(0);
      expect(result.kappa).toBeLessThan(0);
    });

    it('handles empty input gracefully', () => {
      expect(calculateCohensKappa([])).toEqual({ kappa: 0, observedAgreement: 0, expectedAgreement: 0, sampleSize: 0 });
    });

    it('handles degenerate single-category consensus without division by zero', () => {
      const ratings = [
        { raterA: 'SAFE', raterB: 'SAFE' },
        { raterA: 'SAFE', raterB: 'SAFE' },
      ];
      const result = calculateCohensKappa(ratings);
      expect(result.kappa).toBe(1.0);
      expect(result.observedAgreement).toBe(1.0);
    });
  });

  describe("Fleiss' Kappa (Multi-Rater Agreement)", () => {
    it('computes substantial agreement for multi-reviewer audit matrix', () => {
      // 5 cases evaluated by 3 raters across {SAFE, VULNERABLE}
      const matrix = [
        { SAFE: 3, VULNERABLE: 0 }, // 3 agree SAFE
        { SAFE: 3, VULNERABLE: 0 }, // 3 agree SAFE
        { SAFE: 0, VULNERABLE: 3 }, // 3 agree VULNERABLE
        { SAFE: 2, VULNERABLE: 1 }, // 2 SAFE, 1 VULNERABLE
        { SAFE: 3, VULNERABLE: 0 }, // 3 agree SAFE
      ];
      const result = calculateFleissKappa(matrix);
      expect(result.sampleSize).toBe(5);
      expect(result.ratersPerItem).toBe(3);
      expect(result.observedAgreement).toBeGreaterThan(0.7);
      expect(result.kappa).toBeGreaterThan(0.5);
    });

    it('returns kappa = 1.0 for unanimous multi-rater agreement', () => {
      const matrix = [
        { PASS: 4, FAIL: 0 },
        { PASS: 0, FAIL: 4 },
        { PASS: 4, FAIL: 0 },
      ];
      const result = calculateFleissKappa(matrix);
      expect(result.kappa).toBe(1.0);
      expect(result.observedAgreement).toBe(1.0);
    });

    it('throws error when fewer than 2 raters per item are provided', () => {
      const matrix = [{ PASS: 1, FAIL: 0 }];
      expect(() => calculateFleissKappa(matrix)).toThrow(/at least 2 raters/);
    });

    it('returns 0 for empty matrix', () => {
      expect(calculateFleissKappa([])).toEqual({ kappa: 0, sampleSize: 0, ratersPerItem: 0 });
    });
  });
});
