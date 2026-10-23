'use strict';

/**
 * statistical_evaluator.js — Multi-Run Statistical Evaluation Engine
 * ==================================================================
 * Phase 1 RSIE: Sealed Benchmark Vault
 *
 * Executes benchmark scenarios multiple times (N >= 5) and computes
 * statistically rigorous pass rate estimates using Wilson Score confidence
 * intervals at 95% confidence level.
 *
 * Guarantees:
 * 1. Each scenario is evaluated N independent times for statistical power.
 * 2. Wilson Score CI provides robust lower/upper bounds even at small N.
 * 3. Deterministic aggregate reporting with per-category breakdowns.
 * 4. Pareto comparison function for candidate-vs-baseline analysis.
 */

const { EvaluationRunner } = require('./evaluation_runner');
const { BenchmarkOracle } = require('./benchmark_oracle');

/**
 * Computes the Wilson Score confidence interval for a binomial proportion.
 *
 * @param {number} successes - Number of successful trials
 * @param {number} total - Total number of trials
 * @param {number} [z=1.96] - Z-score for confidence level (1.96 = 95%)
 * @returns {{ center: number, lower: number, upper: number, p: number }}
 */
function wilsonScoreInterval(successes, total, z = 1.96) {
  if (total === 0) {
    return { center: 0, lower: 0, upper: 0, p: 0 };
  }

  const p = successes / total;
  const z2 = z * z;
  const denominator = 1 + z2 / total;

  const center = (p + z2 / (2 * total)) / denominator;
  const margin =
    (z * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total))) / denominator;

  return {
    center: Math.round(center * 10000) / 10000,
    lower: Math.max(0, Math.round((center - margin) * 10000) / 10000),
    upper: Math.min(1, Math.round((center + margin) * 10000) / 10000),
    p: Math.round(p * 10000) / 10000,
  };
}

/**
 * Determines if a candidate result is a statistically significant improvement
 * over a baseline result using non-overlapping Wilson confidence intervals.
 *
 * @param {{ lower: number, upper: number }} baseline - Baseline Wilson CI
 * @param {{ lower: number, upper: number }} candidate - Candidate Wilson CI
 * @returns {{ improved: boolean, verdict: string, reason: string }}
 */
function compareIntervals(baseline, candidate) {
  if (candidate.lower > baseline.upper) {
    return {
      improved: true,
      verdict: 'STATISTICALLY_SIGNIFICANT_IMPROVEMENT',
      reason: `Candidate lower bound (${candidate.lower}) exceeds baseline upper bound (${baseline.upper}).`,
    };
  }

  if (baseline.lower > candidate.upper) {
    return {
      improved: false,
      verdict: 'STATISTICALLY_SIGNIFICANT_REGRESSION',
      reason: `Baseline lower bound (${baseline.lower}) exceeds candidate upper bound (${candidate.upper}).`,
    };
  }

  return {
    improved: false,
    verdict: 'INCONCLUSIVE',
    reason: `Confidence intervals overlap: baseline [${baseline.lower}, ${baseline.upper}], candidate [${candidate.lower}, ${candidate.upper}]. Cannot determine improvement with statistical confidence.`,
  };
}

class StatisticalEvaluator {
  /**
   * @param {object} [options]
   * @param {string} [options.repoRoot] - Repository root path
   * @param {number} [options.runs=5] - Number of evaluation runs per scenario
   * @param {number} [options.confidenceZ=1.96] - Z-score for CI (default 95%)
   * @param {BenchmarkOracle} [options.oracle] - Custom oracle instance
   * @param {object} [options.sandboxOptions] - Additional sandbox config
   */
  constructor(options = {}) {
    this.repoRoot = options.repoRoot || process.cwd();
    this.runs = Math.max(options.runs || 5, 1);
    this.confidenceZ = options.confidenceZ || 1.96;
    this.oracle = options.oracle || null;
    this.sandboxOptions = options.sandboxOptions || {};
  }

  /**
   * Evaluates a single scenario N times and computes statistical metrics.
   *
   * @param {object} scenario - Scenario definition
   * @param {string} candidateCode - Code to test (typically safeProposal or unsafeProposal)
   * @param {object} [options]
   * @returns {Promise<{ scenarioId: string, runs: number, successes: number, failures: number, passRate: number, wilsonCI: object, results: object[], avgDurationMs: number }>}
   */
  async evaluateScenarioMultiRun(scenario, candidateCode, options = {}) {
    const numRuns = options.runs || this.runs;
    const results = [];
    let successes = 0;
    let totalDuration = 0;

    for (let i = 0; i < numRuns; i++) {
      const runner = new EvaluationRunner({
        repoRoot: this.repoRoot,
        oracle: this.oracle,
        scenarios: [scenario],
        sandboxOptions: this.sandboxOptions,
      });

      const report = await runner.evaluateCandidate(scenario, candidateCode, options);
      results.push({
        run: i + 1,
        verdict: report.verdict,
        exitCode: report.exitCode,
        durationMs: report.durationMs,
        timedOut: report.timedOut,
        reason: report.reason,
      });

      if (report.verdict === 'APPROVED') {
        successes++;
      }
      totalDuration += report.durationMs;
    }

    const failures = numRuns - successes;
    const passRate = numRuns > 0 ? successes / numRuns : 0;
    const wilsonCI = wilsonScoreInterval(successes, numRuns, this.confidenceZ);

    return {
      scenarioId: scenario.scenarioId,
      category: scenario.category || 'UNKNOWN',
      runs: numRuns,
      successes,
      failures,
      passRate: Math.round(passRate * 10000) / 10000,
      wilsonCI,
      results,
      avgDurationMs: numRuns > 0 ? Math.round(totalDuration / numRuns) : 0,
    };
  }

  /**
   * Runs the complete benchmark vault, evaluating all safeProposals and
   * unsafeProposals across N runs each.
   *
   * @param {object[]} scenarios - Array of scenario definitions
   * @param {object} [options]
   * @returns {Promise<object>} Full statistical benchmark report
   */
  async runFullBenchmark(scenarios, options = {}) {
    const numRuns = options.runs || this.runs;
    const safeResults = [];
    const unsafeResults = [];
    const errors = [];

    for (const scenario of scenarios) {
      // Evaluate safeProposal: MUST pass consistently
      try {
        const safeReport = await this.evaluateScenarioMultiRun(
          scenario,
          scenario.safeProposal,
          { runs: numRuns },
        );
        safeResults.push(safeReport);
      } catch (err) {
        errors.push({
          scenarioId: scenario.scenarioId,
          phase: 'safeProposal',
          error: err.message,
        });
      }

      // Evaluate unsafeProposal: MUST fail consistently
      try {
        const unsafeReport = await this.evaluateScenarioMultiRun(
          scenario,
          scenario.unsafeProposal,
          { runs: numRuns },
        );
        unsafeResults.push(unsafeReport);
      } catch (err) {
        errors.push({
          scenarioId: scenario.scenarioId,
          phase: 'unsafeProposal',
          error: err.message,
        });
      }
    }

    // Aggregate statistics
    const safeStats = this._aggregateResults(safeResults, 'safe');
    const unsafeStats = this._aggregateResults(unsafeResults, 'unsafe');

    // Dual-oracle verification
    const dualOracleViolations = [];

    for (const r of safeResults) {
      if (r.passRate < 1.0) {
        dualOracleViolations.push({
          scenarioId: r.scenarioId,
          type: 'SAFE_PROPOSAL_FAILED',
          passRate: r.passRate,
          reason: `Safe proposal should pass 100% of runs but achieved ${r.passRate * 100}%.`,
        });
      }
    }

    for (const r of unsafeResults) {
      if (r.passRate > 0.0) {
        dualOracleViolations.push({
          scenarioId: r.scenarioId,
          type: 'UNSAFE_PROPOSAL_PASSED',
          passRate: r.passRate,
          reason: `Unsafe proposal should fail 100% of runs but passed ${r.passRate * 100}%.`,
        });
      }
    }

    return {
      timestamp: new Date().toISOString(),
      config: {
        runsPerScenario: numRuns,
        confidenceZ: this.confidenceZ,
        totalScenarios: scenarios.length,
      },
      safe: {
        results: safeResults,
        aggregate: safeStats,
      },
      unsafe: {
        results: unsafeResults,
        aggregate: unsafeStats,
      },
      dualOracle: {
        valid: dualOracleViolations.length === 0,
        violations: dualOracleViolations,
      },
      errors,
      overallVerdict: dualOracleViolations.length === 0 && errors.length === 0
        ? 'BENCHMARK_VAULT_CERTIFIED'
        : 'BENCHMARK_VAULT_INVALID',
    };
  }

  /**
   * Compares a candidate benchmark run against a baseline benchmark run.
   * Determines if the candidate is a statistically significant improvement.
   *
   * @param {object} baselineReport - Report from runFullBenchmark on baseline
   * @param {object} candidateReport - Report from runFullBenchmark on candidate
   * @returns {object} Pareto comparison result
   */
  compareBenchmarks(baselineReport, candidateReport) {
    const baselineSafeCI = baselineReport.safe.aggregate.overallWilsonCI;
    const candidateSafeCI = candidateReport.safe.aggregate.overallWilsonCI;

    const safeComparison = compareIntervals(baselineSafeCI, candidateSafeCI);

    // Candidate must not regress on unsafe detection
    const baselineUnsafeReject = 1 - (baselineReport.unsafe.aggregate.overallPassRate || 0);
    const candidateUnsafeReject = 1 - (candidateReport.unsafe.aggregate.overallPassRate || 0);

    const unsafeRegressed = candidateUnsafeReject < baselineUnsafeReject;

    // Latency check: candidate avg must not exceed 110% of baseline
    const baselineAvgMs = baselineReport.safe.aggregate.avgDurationMs || 1;
    const candidateAvgMs = candidateReport.safe.aggregate.avgDurationMs || 1;
    const latencyRegressed = candidateAvgMs > baselineAvgMs * 1.10;

    let verdict = 'INCONCLUSIVE';
    if (safeComparison.improved && !unsafeRegressed && !latencyRegressed) {
      verdict = 'PARETO_IMPROVEMENT';
    } else if (unsafeRegressed || latencyRegressed) {
      verdict = 'PARETO_REGRESSION';
    } else {
      verdict = safeComparison.verdict;
    }

    return {
      verdict,
      safeComparison,
      unsafeRegressed,
      latencyRegressed,
      baselineAvgMs: Math.round(baselineAvgMs),
      candidateAvgMs: Math.round(candidateAvgMs),
      latencyDeltaPercent: Math.round(((candidateAvgMs - baselineAvgMs) / baselineAvgMs) * 100),
    };
  }

  /**
   * Aggregates multi-run results into summary statistics.
   * @private
   */
  _aggregateResults(results, label) {
    if (results.length === 0) {
      return {
        label,
        count: 0,
        overallPassRate: 0,
        overallWilsonCI: { center: 0, lower: 0, upper: 0, p: 0 },
        avgDurationMs: 0,
        byCategory: {},
      };
    }

    let totalSuccesses = 0;
    let totalRuns = 0;
    let totalDuration = 0;
    const byCategory = {};

    for (const r of results) {
      totalSuccesses += r.successes;
      totalRuns += r.runs;
      totalDuration += r.avgDurationMs * r.runs;

      // Find category from category field, scenarioId prefix without digits, or 'UNKNOWN'
      const cat =
        r.category ||
        (r.scenarioId ? (r.scenarioId.split('_')[1] || '').replace(/[0-9]+$/, '') : 'UNKNOWN') ||
        'UNKNOWN';
      if (!byCategory[cat]) {
        byCategory[cat] = { successes: 0, runs: 0, scenarios: 0 };
      }
      byCategory[cat].successes += r.successes;
      byCategory[cat].runs += r.runs;
      byCategory[cat].scenarios++;
    }

    const overallPassRate = totalRuns > 0 ? totalSuccesses / totalRuns : 0;
    const overallWilsonCI = wilsonScoreInterval(totalSuccesses, totalRuns, this.confidenceZ);

    // Compute per-category CIs
    for (const cat of Object.keys(byCategory)) {
      const c = byCategory[cat];
      c.passRate = c.runs > 0 ? Math.round((c.successes / c.runs) * 10000) / 10000 : 0;
      c.wilsonCI = wilsonScoreInterval(c.successes, c.runs, this.confidenceZ);
    }

    return {
      label,
      count: results.length,
      overallPassRate: Math.round(overallPassRate * 10000) / 10000,
      overallWilsonCI,
      avgDurationMs: totalRuns > 0 ? Math.round(totalDuration / totalRuns) : 0,
      byCategory,
    };
  }
}

module.exports = {
  StatisticalEvaluator,
  wilsonScoreInterval,
  compareIntervals,
};
