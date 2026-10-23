'use strict';

/**
 * scripts/run_baseline_benchmark.js
 * =================================
 * Phase 1 RSIE: Sealed Benchmark Vault Baseline Runner
 *
 * Runs the 50-task benchmark corpus through the statistical evaluation engine,
 * verifying dual-oracle integrity (safe proposals must achieve 100% pass rate;
 * unsafe proposals must achieve 0% pass rate).
 *
 * Usage:
 *   node scripts/run_baseline_benchmark.js [options]
 *
 * Options:
 *   --dry-run        Run in isolated scratch directory (fast, no git worktree overhead)
 *   --sandbox        Run inside ephemeral Git worktrees with BenchmarkOracle checks
 *   --runs <N>       Number of evaluation runs per scenario (default: 1 for dry-run, 5 for sandbox)
 *   --category <CAT> Filter by category (Anti-Hallucination, Security, Functional, Resilience)
 *   --output <FILE>  Write JSON report to specified file (default: .tribunal/evals/baseline_report.json)
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { getCorpusWithValidation } = require('../benchmarks/corpus/index');
const { wilsonScoreInterval } = require('../src/evaluation/statistical_evaluator');
const { BenchmarkOracle } = require('../src/evaluation/benchmark_oracle');
const { EvaluationRunner } = require('../src/evaluation/evaluation_runner');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: true,
    runs: 1,
    category: null,
    output: path.join(process.cwd(), '.tribunal', 'evals', 'baseline_report.json'),
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--sandbox') {
      options.dryRun = false;
      if (options.runs === 1) options.runs = 5;
    } else if (args[i] === '--dry-run') {
      options.dryRun = true;
    } else if (args[i] === '--runs' && args[i + 1]) {
      options.runs = Math.max(1, parseInt(args[i + 1], 10) || 1);
      i++;
    } else if (args[i] === '--category' && args[i + 1]) {
      options.category = args[i + 1];
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      options.output = path.resolve(args[i + 1]);
      i++;
    }
  }

  return options;
}

function runDryRunTrial(scenario, code, targetDir) {
  const targetPath = path.join(targetDir, scenario.targetFile);
  const fileDir = path.dirname(targetPath);
  if (!fs.existsSync(fileDir)) fs.mkdirSync(fileDir, { recursive: true });

  fs.writeFileSync(targetPath, code, 'utf8');
  const start = Date.now();
  const res = spawnSync(scenario.verificationCommand.cmd, scenario.verificationCommand.args, {
    cwd: targetDir,
    encoding: 'utf8',
    timeout: scenario.timeoutMs || 10000,
  });
  const durationMs = Date.now() - start;

  return {
    exitCode: res.status !== null ? res.status : 1,
    stdout: res.stdout || '',
    stderr: res.stderr || (res.error ? res.error.message : ''),
    durationMs,
    timedOut: Boolean(res.error && res.error.code === 'ETIMEDOUT'),
    success: res.status === 0 && !res.error,
  };
}

async function main() {
  const options = parseArgs();
  console.log('🏛️  Tribunal Kit — Sealed Benchmark Vault Baseline Runner');
  console.log('===========================================================');
  console.log(`Execution Mode:  ${options.dryRun ? 'Dry-Run (Scratch Isolation)' : 'Git Worktree Sandbox'}`);
  console.log(`Runs / Scenario: ${options.runs}`);
  if (options.category) console.log(`Category Filter: ${options.category}`);
  console.log('-----------------------------------------------------------');

  const { scenarios, errors, stats } = getCorpusWithValidation();
  if (!stats.valid) {
    console.error('❌ Corpus validation failed:');
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
  }

  let activeScenarios = scenarios;
  if (options.category) {
    activeScenarios = scenarios.filter(
      s => s.category.toLowerCase() === options.category.toLowerCase(),
    );
    if (activeScenarios.length === 0) {
      console.error(`❌ No scenarios found for category: "${options.category}"`);
      process.exit(1);
    }
  }

  console.log(`Loaded ${activeScenarios.length} scenarios across ${Object.keys(stats.categories).length} categories.\n`);

  const scratchDir = path.resolve('./.tribunal/temp_baseline_scratch');
  if (options.dryRun) {
    if (fs.existsSync(scratchDir)) fs.rmSync(scratchDir, { recursive: true, force: true });
    fs.mkdirSync(path.join(scratchDir, 'scratch'), { recursive: true });
  }

  const safeResults = [];
  const unsafeResults = [];
  const violations = [];

  let idx = 0;
  for (const scenario of activeScenarios) {
    idx++;
    process.stdout.write(
      `[${String(idx).padStart(2, '0')}/${activeScenarios.length}] ${scenario.scenarioId} (${scenario.category})... `,
    );

    let safeSuccesses = 0;
    let safeTotalDuration = 0;
    let unsafeSuccesses = 0;
    let unsafeTotalDuration = 0;

    for (let r = 0; r < options.runs; r++) {
      if (options.dryRun) {
        const safeRes = runDryRunTrial(scenario, scenario.safeProposal, scratchDir);
        if (safeRes.success) safeSuccesses++;
        safeTotalDuration += safeRes.durationMs;

        const unsafeRes = runDryRunTrial(scenario, scenario.unsafeProposal, scratchDir);
        if (unsafeRes.success) unsafeSuccesses++;
        unsafeTotalDuration += unsafeRes.durationMs;
      } else {
        const runner = new EvaluationRunner({
          scenarios: [scenario],
        });
        const safeRep = await runner.evaluateCandidate(scenario, scenario.safeProposal);
        if (safeRep.verdict === 'APPROVED') safeSuccesses++;
        safeTotalDuration += safeRep.durationMs;

        const unsafeRep = await runner.evaluateCandidate(scenario, scenario.unsafeProposal);
        if (unsafeRep.verdict === 'APPROVED') unsafeSuccesses++;
        unsafeTotalDuration += unsafeRep.durationMs;
      }
    }

    const safePassRate = safeSuccesses / options.runs;
    const unsafePassRate = unsafeSuccesses / options.runs;

    safeResults.push({
      scenarioId: scenario.scenarioId,
      category: scenario.category,
      runs: options.runs,
      successes: safeSuccesses,
      passRate: safePassRate,
      avgDurationMs: Math.round(safeTotalDuration / options.runs),
      wilsonCI: wilsonScoreInterval(safeSuccesses, options.runs),
    });

    unsafeResults.push({
      scenarioId: scenario.scenarioId,
      category: scenario.category,
      runs: options.runs,
      successes: unsafeSuccesses,
      passRate: unsafePassRate,
      avgDurationMs: Math.round(unsafeTotalDuration / options.runs),
      wilsonCI: wilsonScoreInterval(unsafeSuccesses, options.runs),
    });

    if (safePassRate < 1.0) {
      violations.push({
        scenarioId: scenario.scenarioId,
        type: 'SAFE_PROPOSAL_FAILED',
        passRate: safePassRate,
      });
      console.log(`❌ SAFE FAILED (${safeSuccesses}/${options.runs})`);
    } else if (unsafePassRate > 0.0) {
      violations.push({
        scenarioId: scenario.scenarioId,
        type: 'UNSAFE_PROPOSAL_PASSED',
        passRate: unsafePassRate,
      });
      console.log(`❌ UNSAFE PASSED (${unsafeSuccesses}/${options.runs})`);
    } else {
      console.log('✅ CERTIFIED');
    }
  }

  if (options.dryRun && fs.existsSync(scratchDir)) {
    fs.rmSync(scratchDir, { recursive: true, force: true });
  }

  // Aggregate stats
  const totalSafeRuns = safeResults.reduce((a, b) => a + b.runs, 0);
  const totalSafeWins = safeResults.reduce((a, b) => a + b.successes, 0);
  const overallSafeRate = totalSafeWins / totalSafeRuns;
  const overallSafeCI = wilsonScoreInterval(totalSafeWins, totalSafeRuns);

  const totalUnsafeRuns = unsafeResults.reduce((a, b) => a + b.runs, 0);
  const totalUnsafeWins = unsafeResults.reduce((a, b) => a + b.successes, 0);
  const overallUnsafeRate = totalUnsafeWins / totalUnsafeRuns;

  const certified = violations.length === 0;

  console.log('\n===========================================================');
  console.log('📊 Baseline Benchmark Evaluation Summary:');
  console.log('-----------------------------------------------------------');
  console.log(`Total Scenarios:         ${activeScenarios.length}`);
  console.log(`Total Evaluation Trials: ${totalSafeRuns + totalUnsafeRuns}`);
  console.log(
    `Safe Proposal Pass Rate: ${(overallSafeRate * 100).toFixed(1)}% [95% CI: ${(overallSafeCI.lower * 100).toFixed(1)}% - ${(overallSafeCI.upper * 100).toFixed(1)}%]`,
  );
  console.log(`Unsafe Proposal Leak:    ${(overallUnsafeRate * 100).toFixed(1)}% (Must be 0.0%)`);
  console.log(`Dual-Oracle Violations:  ${violations.length}`);
  console.log(
    `Overall Verdict:         ${certified ? '🏆 BENCHMARK_VAULT_CERTIFIED' : '❌ VERIFICATION_FAILED'}`,
  );
  console.log('===========================================================');

  const report = {
    timestamp: new Date().toISOString(),
    config: options,
    summary: {
      totalScenarios: activeScenarios.length,
      runsPerScenario: options.runs,
      safePassRate: overallSafeRate,
      safeWilsonCI: overallSafeCI,
      unsafePassRate: overallUnsafeRate,
      dualOracleViolations: violations.length,
      verdict: certified ? 'BENCHMARK_VAULT_CERTIFIED' : 'VERIFICATION_FAILED',
    },
    safeResults,
    unsafeResults,
    violations,
  };

  const outDir = path.dirname(options.output);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(options.output, JSON.stringify(report, null, 2), 'utf8');
  console.log(`Saved baseline report to: ${options.output}`);

  if (!certified) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error during baseline evaluation:', err);
  process.exit(1);
});
