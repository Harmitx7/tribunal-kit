'use strict';

const {
  calculateBrierScore,
  calculateExpectedCalibrationError,
} = require('../../src/evaluation/reliability_metrics_engine');

describe('Confidence Calibration & Probabilistic Scoring Engine', () => {
  describe('Brier Score Calculation', () => {
    it('calculates perfect Brier score (0.0) when probabilities match outcomes exactly', () => {
      const items = [
        { probability: 1.0, outcome: 1 },
        { probability: 0.0, outcome: 0 },
        { probability: 1.0, outcome: true },
        { probability: 0.0, outcome: false },
      ];
      const result = calculateBrierScore(items);
      expect(result.brierScore).toBe(0);
      expect(result.sampleSize).toBe(4);
    });

    it('calculates worst Brier score (1.0) when probabilities are diametrically wrong', () => {
      const items = [
        { probability: 1.0, outcome: 0 },
        { probability: 0.0, outcome: 1 },
      ];
      const result = calculateBrierScore(items);
      expect(result.brierScore).toBe(1.0);
      expect(result.sampleSize).toBe(2);
    });

    it('calculates 0.25 Brier score for uniform 0.5 coin-flip predictions', () => {
      const items = [
        { probability: 0.5, outcome: 1 },
        { probability: 0.5, outcome: 0 },
        { probability: 0.5, outcome: 1 },
        { probability: 0.5, outcome: 0 },
      ];
      const result = calculateBrierScore(items);
      expect(result.brierScore).toBe(0.25);
      expect(result.sampleSize).toBe(4);
    });

    it('handles empty input gracefully', () => {
      expect(calculateBrierScore([])).toEqual({ brierScore: 0, sampleSize: 0 });
      expect(calculateBrierScore(null)).toEqual({ brierScore: 0, sampleSize: 0 });
    });

    it('throws on invalid probability values outside [0, 1]', () => {
      expect(() => calculateBrierScore([{ probability: 1.5, outcome: 1 }])).toThrow(/Invalid probability/);
      expect(() => calculateBrierScore([{ probability: -0.1, outcome: 1 }])).toThrow(/Invalid probability/);
      expect(() => calculateBrierScore([{ probability: 'not-a-number', outcome: 1 }])).toThrow(/Invalid probability/);
    });
  });

  describe('Expected Calibration Error (ECE)', () => {
    it('returns zero ECE and NO_DATA diagnosis for empty predictions array', () => {
      const result = calculateExpectedCalibrationError([]);
      expect(result.ece).toBe(0);
      expect(result.diagnosis).toBe('NO_DATA');
      expect(result.bins).toHaveLength(0);
    });

    it('detects OVERCONFIDENT predictions when high confidence has low accuracy', () => {
      const predictions = [
        { confidence: 0.95, correct: false },
        { confidence: 0.92, correct: false },
        { confidence: 0.88, correct: false },
        { confidence: 0.99, correct: true }, // 1/4 = 25% accuracy at ~93.5% confidence
      ];
      const result = calculateExpectedCalibrationError(predictions, 5);
      expect(result.diagnosis).toBe('OVERCONFIDENT');
      expect(result.ece).toBeGreaterThan(0.5);
    });

    it('detects UNDERCONFIDENT predictions when low confidence has high accuracy', () => {
      const predictions = [
        { confidence: 0.15, correct: true },
        { confidence: 0.20, correct: true },
        { confidence: 0.10, correct: true },
        { confidence: 0.25, correct: true }, // 100% accuracy at ~17.5% confidence
      ];
      const result = calculateExpectedCalibrationError(predictions, 5);
      expect(result.diagnosis).toBe('UNDERCONFIDENT');
      expect(result.ece).toBeGreaterThan(0.5);
    });

    it('identifies WELL_CALIBRATED model when confidence matches empirical accuracy closely', () => {
      const predictions = [
        // Bin [0.0, 0.5): 10 items with conf ~0.2, 2 correct (20% accuracy)
        ...Array(8).fill({ confidence: 0.2, correct: false }),
        ...Array(2).fill({ confidence: 0.2, correct: true }),
        // Bin [0.5, 1.0]: 10 items with conf ~0.8, 8 correct (80% accuracy)
        ...Array(8).fill({ confidence: 0.8, correct: true }),
        ...Array(2).fill({ confidence: 0.8, correct: false }),
      ];
      const result = calculateExpectedCalibrationError(predictions, 2);
      expect(result.diagnosis).toBe('WELL_CALIBRATED');
      expect(result.ece).toBe(0);
    });

    it('correctly maps boundary confidence 1.0 to the highest bin', () => {
      const predictions = [{ confidence: 1.0, correct: true }];
      const result = calculateExpectedCalibrationError(predictions, 10);
      const topBin = result.bins[9];
      expect(topBin.count).toBe(1);
      expect(topBin.accuracy).toBe(1.0);
    });

    it('throws error on invalid confidence values in predictions', () => {
      expect(() => calculateExpectedCalibrationError([{ confidence: -0.2, correct: true }])).toThrow(/Invalid confidence/);
      expect(() => calculateExpectedCalibrationError([{ confidence: 2.0, correct: true }])).toThrow(/Invalid confidence/);
    });
  });
});
