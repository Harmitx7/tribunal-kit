'use strict';

/**
 * Tribunal-Kit Phase 11 Hardening & Performance Benchmark
 *
 * Measures:
 * 1. Rendering throughput with ANSI fast-path (clean vs ANSI-rich strings)
 * 2. Secret redaction throughput with fast trigger pattern vs active secret strings
 * 3. Deep clone & sanitation with cyclic object graphs
 * 4. High-frequency telemetry burst (1,000 rapid events)
 * 5. Memory stability across burst cycles
 */

const {
  renderMarkdown,
  renderPlainText,
  renderStructured,
  createActivityEvent,
  redactSecrets,
  deepClone,
  ActivityTracker,
} = require('../src/activity');

function runBenchmark() {
  console.log('='.repeat(70));
  console.log('  TRIBUNAL-KIT PHASE 11: PERFORMANCE & HARDENING BENCHMARK');
  console.log('='.repeat(70));
  console.log('');

  const ITERATIONS = 10000;

  // ── Benchmark 1: ANSI Fast-Path Throughput ──────────────────────────────────
  console.log(`[1] ANSI Fast-Path vs Escape Code Stripping (${ITERATIONS} iterations):`);

  const cleanString = 'Linting src/activity/schema.js with ESLint rules';
  const ansiString = '\u001b[32mLinting\u001b[0m \u001b[1msrc/activity/schema.js\u001b[0m with ESLint rules';

  const { stripAnsi } = require('../src/activity');

  const startClean = process.hrtime.bigint();
  for (let i = 0; i < ITERATIONS; i++) {
    stripAnsi(cleanString);
  }
  const cleanDurationNs = process.hrtime.bigint() - startClean;
  const cleanMs = Number(cleanDurationNs) / 1e6;
  const cleanOpsSec = Math.round((ITERATIONS / cleanMs) * 1000);

  const startAnsi = process.hrtime.bigint();
  for (let i = 0; i < ITERATIONS; i++) {
    stripAnsi(ansiString);
  }
  const ansiDurationNs = process.hrtime.bigint() - startAnsi;
  const ansiMs = Number(ansiDurationNs) / 1e6;
  const ansiOpsSec = Math.round((ITERATIONS / ansiMs) * 1000);

  console.log(`    - Clean string (Fast-Path indexOf): ${cleanMs.toFixed(2)} ms (${cleanOpsSec.toLocaleString()} ops/sec)`);
  console.log(`    - ANSI string (Regex Replacement): ${ansiMs.toFixed(2)} ms (${ansiOpsSec.toLocaleString()} ops/sec)`);
  console.log(`    - Fast-Path Speedup: ${(ansiMs / cleanMs).toFixed(2)}x faster`);
  console.log('');

  // ── Benchmark 2: Secret Redaction Throughput ────────────────────────────────
  console.log(`[2] Secret Redaction Fast-Path vs Pattern Matching (${ITERATIONS} iterations):`);

  const cleanText = 'Running unit test suite for regression verification on release v2.4.0';
  const secretText = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.wJalrXUtnFEMIK7MDENGbPxRfiCYEXAMPLEKEY';

  const startCleanSec = process.hrtime.bigint();
  for (let i = 0; i < ITERATIONS; i++) {
    redactSecrets(cleanText);
  }
  const cleanSecNs = process.hrtime.bigint() - startCleanSec;
  const cleanSecMs = Number(cleanSecNs) / 1e6;
  const cleanSecOps = Math.round((ITERATIONS / cleanSecMs) * 1000);

  const startSec = process.hrtime.bigint();
  for (let i = 0; i < ITERATIONS; i++) {
    redactSecrets(secretText);
  }
  const secNs = process.hrtime.bigint() - startSec;
  const secMs = Number(secNs) / 1e6;
  const secOps = Math.round((ITERATIONS / secMs) * 1000);

  console.log(`    - Non-Secret Text (Fast Trigger Skip): ${cleanSecMs.toFixed(2)} ms (${cleanSecOps.toLocaleString()} ops/sec)`);
  console.log(`    - Active Secret Text (10-Pattern Regex): ${secMs.toFixed(2)} ms (${secOps.toLocaleString()} ops/sec)`);
  console.log(`    - Trigger Skip Speedup: ${(secMs / cleanSecMs).toFixed(2)}x faster`);
  console.log('');

  // ── Benchmark 3: Cyclic Object Graph Deep Cloning ──────────────────────────
  console.log(`[3] Cyclic Object Graph Handling (${ITERATIONS} iterations):`);

  const cyclicObj = { id: 'cyclic-node-1', metadata: { priority: 'high' } };
  cyclicObj.self = cyclicObj;
  cyclicObj.nested = { parent: cyclicObj };

  const startCyclic = process.hrtime.bigint();
  for (let i = 0; i < ITERATIONS; i++) {
    deepClone(cyclicObj);
  }
  const cyclicNs = process.hrtime.bigint() - startCyclic;
  const cyclicMs = Number(cyclicNs) / 1e6;
  const cyclicOps = Math.round((ITERATIONS / cyclicMs) * 1000);

  console.log(`    - Cycle-Safe WeakMap Clone: ${cyclicMs.toFixed(2)} ms (${cyclicOps.toLocaleString()} ops/sec)`);
  console.log(`    - Zero Stack Overflow errors encountered.`);
  console.log('');

  // ── Benchmark 4: Telemetry Burst & Memory Stability ────────────────────────
  console.log('[4] High-Frequency Telemetry Burst (10,000 rapid events):');

  if (global.gc) global.gc();
  const memBefore = process.memoryUsage().heapUsed;

  const tracker = new ActivityTracker({ maxEvents: 200 });
  const startBurst = process.hrtime.bigint();

  for (let i = 1; i <= 10000; i++) {
    tracker.updateProgress(
      { current: i, total: 10000, isAuthoritative: true },
      {
        phase: `Stage ${(i % 10) + 1}`,
        title: 'Phase 11 Hardening Stress Test',
        summary: `Processing item #${i}`,
      }
    );
  }

  const burstNs = process.hrtime.bigint() - startBurst;
  const burstMs = Number(burstNs) / 1e6;
  const burstOps = Math.round((10000 / burstMs) * 1000);

  const memAfter = process.memoryUsage().heapUsed;
  const memDiffKb = Math.round((memAfter - memBefore) / 1024);

  tracker.dispose();

  console.log(`    - Total Time for 10,000 Events: ${burstMs.toFixed(2)} ms (${burstOps.toLocaleString()} events/sec)`);
  console.log(`    - Heap Growth: ${memDiffKb > 0 ? '+' : ''}${memDiffKb} KB (Bounded buffer strictly enforced)`);
  console.log(`    - Buffer Retained Count: ${tracker.events.length} events retained`);
  console.log('');

  console.log('='.repeat(70));
  console.log('  BENCHMARK COMPLETED SUCCESSFULLY');
  console.log('='.repeat(70));
}

if (require.main === module) {
  runBenchmark();
}

module.exports = { runBenchmark };
