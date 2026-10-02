'use strict';

/**
 * measure_system1_performance.js
 * Runs 100 iterations across the System-1 capabilities and captures exact
 * min, median, p95, and max execution timings and telemetry counts.
 */

const { performance } = require('perf_hooks');
const path = require('path');
const fs = require('fs');
const os = require('os');

const { resolveMonotonicImpactTier } = require('../src/commands/native');
const { rankContext } = require('../src/context/ranker');
const {
  createImplementationCheck,
  createEvidenceClaim,
  synthesizeReviewResults,
} = require('../src/synthesis/claim_check_separator');
const { createEvolutionProposal, validateEvolutionProposal } = require('../src/evolution/engine');

function computePercentiles(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const median = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  return { min, median, p95, max };
}

const tmpRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-perf-'));
fs.mkdirSync(path.join(tmpRepo, 'src', 'auth'), { recursive: true });
fs.mkdirSync(path.join(tmpRepo, 'docs'), { recursive: true });
fs.writeFileSync(path.join(tmpRepo, 'SECURITY.md'), '# Policy\n');
fs.writeFileSync(path.join(tmpRepo, 'package.json'), '{"name":"perf"}');
fs.writeFileSync(
  path.join(tmpRepo, 'src', 'auth', 'jwt.js'),
  'const a = 1;\nmodule.exports = { a };',
);
fs.writeFileSync(path.join(tmpRepo, 'docs', 'readme.md'), '# Docs\n' + 'line\n'.repeat(50));

const ITERATIONS = 100;
const impactTimes = [];
const rankTimes = [];
const checkTimes = [];
const synthTimes = [];
const evoTimes = [];

let totalCandTokens = 0;
let totalSelTokens = 0;
let _lastRankResult = null;
let lastSynthResult = null;

for (let i = 0; i < ITERATIONS; i++) {
  // 1. Impact Tier
  const t0 = performance.now();
  const _tier = resolveMonotonicImpactTier({
    files: ['src/auth/jwt.js'],
    lines: 10,
    task: 'Update auth session expiration',
    diff: '+ const token = jwt.sign();',
    layaTier: 2,
  });
  const t1 = performance.now();
  impactTimes.push(t1 - t0);

  // 2. Context Ranking
  const t2 = performance.now();
  const rank = rankContext({
    repoRoot: tmpRepo,
    targetFiles: ['src/auth/jwt.js'],
    candidateFiles: ['SECURITY.md', 'package.json', 'src/auth/jwt.js', 'docs/readme.md'],
    maxItems: 2,
  });
  const t3 = performance.now();
  rankTimes.push(t3 - t2);
  _lastRankResult = rank;
  totalCandTokens += rank.metrics.estimated_tokens_before;
  totalSelTokens += rank.metrics.estimated_tokens_after;

  // 3. Deterministic Checks Execution
  const t4 = performance.now();
  const check1 = createImplementationCheck({
    check: 'tests_passed',
    command: 'npm test',
    result: 'PASSED',
  });
  const check2 = createImplementationCheck({
    check: 'security_scan',
    command: 'node sec.js',
    result: 'FAILED',
  });
  const t5 = performance.now();
  checkTimes.push(t5 - t4);

  // 4. Claims & Synthesis
  const claim1 = createEvidenceClaim({
    reviewer: 'security-auditor',
    assertion: 'Security approved',
    category: 'security',
  });
  const claim2 = createEvidenceClaim({
    reviewer: 'code-reviewer',
    assertion: 'Clean code',
    category: 'logic',
  });
  const t6 = performance.now();
  const synth = synthesizeReviewResults({
    checks: [check1, check2],
    claims: [claim1, claim2],
  });
  const t7 = performance.now();
  synthTimes.push(t7 - t6);
  lastSynthResult = synth;

  // 5. Evolution Analysis
  const t8 = performance.now();
  const prop = createEvolutionProposal({
    target: 'reviewer-routing',
    currentBehavior: 'Run 7 reviewers',
    observedEvidence: 'Telemetry showed 0 findings across 50 runs',
    proposedChange: 'Skip accessibility reviewer on pure SQL migrations',
    expectedEffect: 'Faster execution',
    risk: 'LOW',
    testsRequired: ['test/unit/native.test.js'],
    regressionRequirements: ['SQL reviewers still run'],
    evidenceType: 'DETERMINISTIC_TELEMETRY',
  });
  validateEvolutionProposal(prop);
  const t9 = performance.now();
  evoTimes.push(t9 - t8);
}

fs.rmSync(tmpRepo, { recursive: true, force: true });

const avgCandTokens = Math.round(totalCandTokens / ITERATIONS);
const avgSelTokens = Math.round(totalSelTokens / ITERATIONS);
const tokenReductionPercent = parseFloat(
  (((avgCandTokens - avgSelTokens) / avgCandTokens) * 100).toFixed(1),
);

const telemetry = {
  iterations: ITERATIONS,
  impact_tier_ms: computePercentiles(impactTimes),
  context_rank_ms: computePercentiles(rankTimes),
  check_execution_ms: computePercentiles(checkTimes),
  synthesis_ms: computePercentiles(synthTimes),
  evolution_analysis_ms: computePercentiles(evoTimes),
  token_metrics: {
    candidate_context_tokens: avgCandTokens,
    selected_context_tokens: avgSelTokens,
    context_reduction_percent: tokenReductionPercent,
  },
  synthesis_counts: {
    reviewer_count: 2,
    claims_count: 2,
    verified_checks: lastSynthResult.summary.passed_checks,
    failed_checks: lastSynthResult.summary.failed_checks,
    conflicts: lastSynthResult.summary.conflict_count,
    duplicate_claims: 0,
  },
  llm_telemetry: {
    llm_latency_ms: 'UNVERIFIED (No active external provider session)',
    llm_tokens_consumed: 'UNVERIFIED (No external provider billing telemetry)',
  },
};

console.log(JSON.stringify(telemetry, null, 2));
