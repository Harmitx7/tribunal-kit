'use strict';

/**
 * statistical_evaluator.test.js
 * ==============================
 * Unit tests for StatisticalEvaluator, Wilson Score intervals, and Pareto comparison.
 */

const {
  StatisticalEvaluator,
  wilsonScoreInterval,
  compareIntervals,
} = require('../../src/evaluation/statistical_evaluator');

describe('StatisticalEvaluator & Wilson Score Confidence Intervals', () => {
  describe('wilsonScoreInterval', () => {
    test('Handles 0 total trials gracefully', () => {
      const ci = wilsonScoreInterval(0, 0);
      expect(ci).toEqual({ center: 0, lower: 0, upper: 0, p: 0 });
    });

    test('Computes valid bounds for 100% success rate (5/5)', () => {
      const ci = wilsonScoreInterval(5, 5);
      expect(ci.p).toBe(1);
      expect(ci.lower).toBeGreaterThan(0.5);
      expect(ci.upper).toBe(1);
      expect(ci.center).toBeLessThanOrEqual(1);
    });

    test('Computes valid bounds for 0% success rate (0/5)', () => {
      const ci = wilsonScoreInterval(0, 5);
      expect(ci.p).toBe(0);
      expect(ci.lower).toBe(0);
      expect(ci.upper).toBeLessThan(0.5);
      expect(ci.center).toBeGreaterThanOrEqual(0);
    });

    test('Computes symmetrical bounds for 50% success rate (50/100)', () => {
      const ci = wilsonScoreInterval(50, 100);
      expect(ci.p).toBe(0.5);
      expect(ci.lower).toBeLessThan(0.5);
      expect(ci.upper).toBeGreaterThan(0.5);
      expect(Math.abs((ci.upper + ci.lower) / 2 - 0.5)).toBeLessThan(0.01);
    });
  });

  describe('compareIntervals', () => {
    test('Detects statistically significant improvement when candidate lower > baseline upper', () => {
      const baseline = { lower: 0.40, upper: 0.60 };
      const candidate = { lower: 0.65, upper: 0.85 };
      const res = compareIntervals(baseline, candidate);

      expect(res.improved).toBe(true);
      expect(res.verdict).toBe('STATISTICALLY_SIGNIFICANT_IMPROVEMENT');
    });

    test('Detects statistically significant regression when baseline lower > candidate upper', () => {
      const baseline = { lower: 0.70, upper: 0.90 };
      const candidate = { lower: 0.30, upper: 0.50 };
      const res = compareIntervals(baseline, candidate);

      expect(res.improved).toBe(false);
      expect(res.verdict).toBe('STATISTICALLY_SIGNIFICANT_REGRESSION');
    });

    test('Reports INCONCLUSIVE when confidence intervals overlap', () => {
      const baseline = { lower: 0.50, upper: 0.75 };
      const candidate = { lower: 0.60, upper: 0.85 };
      const res = compareIntervals(baseline, candidate);

      expect(res.improved).toBe(false);
      expect(res.verdict).toBe('INCONCLUSIVE');
    });
  });

  describe('StatisticalEvaluator aggregation & Pareto analysis', () => {
    let evaluator;

    beforeEach(() => {
      evaluator = new StatisticalEvaluator({ runs: 5 });
    });

    test('Aggregates multi-run results properly by category', () => {
      const mockResults = [
        {
          scenarioId: 'SCENARIO_AH01_TEST',
          runs: 5,
          successes: 5,
          avgDurationMs: 100,
        },
        {
          scenarioId: 'SCENARIO_AH02_TEST',
          runs: 5,
          successes: 4,
          avgDurationMs: 120,
        },
        {
          scenarioId: 'SCENARIO_SEC01_TEST',
          runs: 5,
          successes: 5,
          avgDurationMs: 80,
        },
      ];

      const agg = evaluator._aggregateResults(mockResults, 'safe');
      expect(agg.count).toBe(3);
      expect(agg.overallPassRate).toBe(0.9333);
      expect(agg.byCategory.AH.runs).toBe(10);
      expect(agg.byCategory.AH.successes).toBe(9);
      expect(agg.byCategory.SEC.runs).toBe(5);
      expect(agg.byCategory.SEC.successes).toBe(5);
    });

    test('compareBenchmarks flags Pareto regression when unsafe detection regresses', () => {
      const baseline = {
        safe: {
          aggregate: {
            overallWilsonCI: { lower: 0.7, upper: 0.8 },
            avgDurationMs: 100,
          },
        },
        unsafe: {
          aggregate: { overallPassRate: 0.0 }, // 100% rejection
        },
      };

      const candidate = {
        safe: {
          aggregate: {
            overallWilsonCI: { lower: 0.85, upper: 0.95 }, // higher safe pass rate
            avgDurationMs: 100,
          },
        },
        unsafe: {
          aggregate: { overallPassRate: 0.1 }, // regressed: let 10% unsafe through!
        },
      };

      const comparison = evaluator.compareBenchmarks(baseline, candidate);
      expect(comparison.verdict).toBe('PARETO_REGRESSION');
      expect(comparison.unsafeRegressed).toBe(true);
    });

    test('compareBenchmarks flags Pareto regression when latency increases > 10%', () => {
      const baseline = {
        safe: {
          aggregate: {
            overallWilsonCI: { lower: 0.7, upper: 0.8 },
            avgDurationMs: 100,
          },
        },
        unsafe: {
          aggregate: { overallPassRate: 0.0 },
        },
      };

      const candidate = {
        safe: {
          aggregate: {
            overallWilsonCI: { lower: 0.85, upper: 0.95 },
            avgDurationMs: 130, // 30% slower!
          },
        },
        unsafe: {
          aggregate: { overallPassRate: 0.0 },
        },
      };

      const comparison = evaluator.compareBenchmarks(baseline, candidate);
      expect(comparison.verdict).toBe('PARETO_REGRESSION');
      expect(comparison.latencyRegressed).toBe(true);
    });
  });
});
