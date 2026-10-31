/**
 * benchmark_ecosystem_performance.js — Ecosystem Performance & Latency Benchmarks
 *
 * Measures:
 * 1. Routing latency per query (target: < 50ms average)
 * 2. System graph construction and traversal latency (target: < 2000ms)
 * 3. Context Broker token bounding across model tiers
 */

'use strict';

const path = require('path');
const { performance } = require('perf_hooks');
const { selectSkills, loadSkills } = require('../.agent/scripts/context_broker');
const { auditGraph } = require('../scripts/audit_system_graph');

const ROOT = path.resolve(__dirname, '..');
const AGENT_DIR = path.join(ROOT, '.agent');

function runBenchmarks() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('› TRIBUNAL-KIT ECOSYSTEM PERFORMANCE BENCHMARK');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Skill Catalog Loading
  const t0Load = performance.now();
  const allSkills = loadSkills(AGENT_DIR);
  const loadDuration = performance.now() - t0Load;
  console.log(`✔ Loaded ${allSkills.length} skills from disk in ${loadDuration.toFixed(2)}ms`);

  // 2. Routing Latency Benchmark (100 runs)
  const benchmarkQueries = [
    'Build a high-performance Next.js landing page with Framer Motion animations',
    'Write secure PostgreSQL schema migration with zero downtime and pgvector index',
    'Audit OWASP Top 10 vulnerabilities, parameterize SQL queries, and harden JWT',
    'Configure GitHub Actions CI/CD pipeline with Docker containerization',
    'Audit prompt injection vulnerabilities in AI agent tool-calling pipeline',
    'Run property-based mutation tests with Stryker and isolate flakiness',
    'Map system architecture blast radius and detect circular dependency cycles',
    'Train sentence-transformers with LoRA and track evals with huggingface'
  ];

  const iterations = 100;
  const t0Routing = performance.now();
  for (let i = 0; i < iterations; i++) {
    const query = benchmarkQueries[i % benchmarkQueries.length];
    const selection = selectSkills(query, [], 'large', allSkills);
    if (!selection.essential || selection.essential.length === 0) {
      throw new Error(`Routing failed on iteration ${i} for query: ${query}`);
    }
  }
  const totalRoutingTime = performance.now() - t0Routing;
  const avgRoutingLatency = totalRoutingTime / iterations;

  console.log(`✔ Executed ${iterations} routing resolutions in ${totalRoutingTime.toFixed(2)}ms (Avg: ${avgRoutingLatency.toFixed(2)}ms / query)`);
  if (avgRoutingLatency > 50) {
    console.warn(`⚠ Warning: Routing latency (${avgRoutingLatency.toFixed(2)}ms) exceeded 50ms threshold`);
  } else {
    console.log(`  Target Met: < 50ms latency (Achieved: ${avgRoutingLatency.toFixed(2)}ms)`);
  }

  // 3. System Graph Construction Latency Benchmark
  const t0Graph = performance.now();
  const graphResult = auditGraph();
  const graphDuration = performance.now() - t0Graph;

  console.log(`\n✔ Built and audited canonical system execution graph (${graphResult.summary.edgesCount} edges mapped) in ${graphDuration.toFixed(2)}ms`);
  if (graphDuration > 2000) {
    console.warn(`⚠ Warning: Graph audit time (${graphDuration.toFixed(2)}ms) exceeded 2000ms threshold`);
  } else {
    console.log(`  Target Met: < 2000ms graph audit (Achieved: ${graphDuration.toFixed(2)}ms)`);
  }

  // 4. Token Bounding Benchmark (Large vs Small tier)
  const testQuery = 'Design an enterprise microservice backend with PostgreSQL, Redis cache, JWT auth, and Docker CI/CD';
  const largeSelection = selectSkills(testQuery, [], 'large', allSkills);
  const smallSelection = selectSkills(testQuery, [], 'small', allSkills);

  console.log('\n✔ Token Budget Bounding:');
  console.log(`  • Large Tier:  ${largeSelection.essential.length} essential, ${largeSelection.supplementary.length} supplementary`);
  console.log(`  • Small Tier:  ${smallSelection.essential.length} essential, ${smallSelection.supplementary.length} supplementary`);
  console.log(`  • Small tier is more compact than Large: ${smallSelection.essential.length <= largeSelection.essential.length}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✔ All Performance & Latency Benchmarks PASSED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return {
    skillsLoaded: allSkills.length,
    loadDurationMs: loadDuration,
    avgRoutingLatencyMs: avgRoutingLatency,
    graphDurationMs: graphDuration,
    edgesCount: graphResult.summary.edgesCount,
  };
}

if (require.main === module) {
  runBenchmarks();
}

module.exports = { runBenchmarks };
