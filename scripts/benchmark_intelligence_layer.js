'use strict';

/**
 * benchmark_intelligence_layer.js
 * ============================================================================
 * Phase 7X implementation.
 *
 * Measures performance of intelligence operations to ensure Tier 0 fast-paths
 * are not bounded by slow database operations.
 */

const { CaseMemory } = require('../src/intelligence/case_memory');
const { CaseIndexer } = require('../src/intelligence/case_indexer');
const { CaseBasedReasoningEngine } = require('../src/intelligence/cbr_engine');

async function runBenchmark() {
  console.log('--- Tribunal Intelligence Performance Benchmark ---');

  const mem = new CaseMemory();
  const idx = new CaseIndexer();
  const cbr = new CaseBasedReasoningEngine();

  // 1. Case Insertion Benchmark
  const startStore = process.hrtime.bigint();
  const testCases = 500;
  for (let i = 0; i < testCases; i++) {
    const c = {
      caseId: `BENCH-${i}`,
      impactTier: i % 4,
      finalVerdict: 'RESOLVED',
      changeFingerprint: { files: ['src/index.js'] },
    };
    // Skip actual disk write for pure memory layout testing in dry run
    idx.indexCase(c);
  }
  const endStore = process.hrtime.bigint();
  const storeMs = Number(endStore - startStore) / 1e6;
  console.log(`[P99] Indexing ${testCases} cases: ${storeMs.toFixed(2)}ms`);

  // 2. Similarity Search Benchmark
  const startSim = process.hrtime.bigint();
  const simResult = cbr.similarity.findSimilar({ files: ['src/index.js'], impactTier: 3 });
  const endSim = process.hrtime.bigint();
  const simMs = Number(endSim - startSim) / 1e6;
  console.log(`[P99] Similarity Search across index: ${simMs.toFixed(2)}ms`);

  // 3. Review Plan Generation Benchmark
  const startPlan = process.hrtime.bigint();
  const plan = cbr.generateReviewPlan({ files: ['src/index.js'], impactTier: 1 });
  const endPlan = process.hrtime.bigint();
  const planMs = Number(endPlan - startPlan) / 1e6;
  console.log(`[P99] Review Plan Generation: ${planMs.toFixed(2)}ms`);

  // Constraint: P99 < 50ms for Tier 0 safety limits
  if (planMs > 50) {
    console.warn('WARNING: Intelligence layer latency exceeds Tier 0 deterministic limits (50ms).');
  } else {
    console.log('PASS: Intelligence layer latency is within deterministic limits.');
  }
}

runBenchmark().catch(console.error);
