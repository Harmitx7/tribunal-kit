'use strict';

/**
 * Phase 5 Benchmark: Live Progress & Execution Telemetry Engine
 *
 * Measures:
 * 1. Progress calculation & bounded percentage throughput (ops/sec)
 * 2. Event coalescer burst throughput & suppression efficiency (5,000 burst events)
 * 3. Stall detector heartbeat and scan overhead (50,000 operations)
 * 4. Parallel progress aggregator throughput (composite multi-worker waves)
 */

const {
  EVENT_TYPES,
  PROGRESS_STATES,
  AGGREGATION_POLICIES,
  ProgressCalculator,
  ProgressCoalescer,
  StallDetector,
  ParallelProgressAggregator,
  createActivityEvent,
} = require('../src/activity');

function runBenchmark() {
  console.log('================================================================');
  console.log(' Tribunal-Kit Activity Engine — Phase 5 Telemetry Benchmark');
  console.log('================================================================\n');

  const BENCH_ROUNDS = 50000;

  // 1. Progress Calculator Throughput
  const startCalc = process.hrtime.bigint();
  for (let i = 0; i < BENCH_ROUNDS; i++) {
    ProgressCalculator.calculate({ current: i % 100, total: 100, unit: 'items' });
  }
  const endCalc = process.hrtime.bigint();
  const calcSec = Number(endCalc - startCalc) / 1e9;
  const calcOps = Math.round(BENCH_ROUNDS / calcSec);

  console.log(`[1] Authoritative Progress Calculation:`);
  console.log(`    Total calculations: ${BENCH_ROUNDS.toLocaleString()}`);
  console.log(`    Elapsed time:       ${(calcSec * 1000).toFixed(2)} ms`);
  console.log(`    Throughput:         ${calcOps.toLocaleString()} ops/sec\n`);

  // 2. High-Frequency Burst Coalescing & Suppression Efficiency
  const BURST_COUNT = 5000;
  let flushedCount = 0;
  const coalescer = new ProgressCoalescer({
    windowMs: 50,
    maxBurstSize: 10000,
    onFlush: () => {
      flushedCount++;
    },
  });

  const startBurst = process.hrtime.bigint();
  for (let i = 1; i <= BURST_COUNT; i++) {
    coalescer.push({
      eventType: EVENT_TYPES.PROGRESS_UPDATED,
      operationId: 'bench_burst_op',
      title: 'High-frequency indexing',
      progress: { current: i, total: BURST_COUNT },
    });
  }
  // Explicitly flush to complete batch
  coalescer.flush('bench_burst_op');
  const endBurst = process.hrtime.bigint();
  const burstSec = Number(endBurst - startBurst) / 1e9;
  const burstOps = Math.round(BURST_COUNT / burstSec);
  const suppressionRate = ((BURST_COUNT - flushedCount) / BURST_COUNT) * 100;

  console.log(`[2] High-Frequency Progress Burst Coalescing:`);
  console.log(`    Total burst ticks:  ${BURST_COUNT.toLocaleString()}`);
  console.log(`    Flushed events:     ${flushedCount}`);
  console.log(`    Noise suppression:  ${suppressionRate.toFixed(2)}% chat spam eliminated`);
  console.log(`    Elapsed time:       ${(burstSec * 1000).toFixed(2)} ms`);
  console.log(`    Throughput:         ${burstOps.toLocaleString()} ticks/sec\n`);
  coalescer.dispose();

  // 3. Stall Detector Heartbeat Throughput & Scan Overhead
  const detector = new StallDetector({ stallThresholdMs: 30000 });
  const MONITORED_COUNT = 1000;
  for (let i = 0; i < MONITORED_COUNT; i++) {
    detector.startMonitoring(`op_bench_${i}`, { title: `Subtask ${i}` });
  }

  const startHeartbeat = process.hrtime.bigint();
  for (let i = 0; i < BENCH_ROUNDS; i++) {
    detector.heartbeat(`op_bench_${i % MONITORED_COUNT}`);
  }
  const endHeartbeat = process.hrtime.bigint();
  const heartbeatSec = Number(endHeartbeat - startHeartbeat) / 1e9;
  const heartbeatOps = Math.round(BENCH_ROUNDS / heartbeatSec);

  // Measure scan check overhead
  const startCheck = process.hrtime.bigint();
  const stalls = detector.check();
  const endCheck = process.hrtime.bigint();
  const checkSec = Number(endCheck - startCheck) / 1e9;

  console.log(`[3] Stall Detector Heartbeats & Check Overhead:`);
  console.log(`    Monitored ops:      ${MONITORED_COUNT.toLocaleString()}`);
  console.log(`    Heartbeat updates:  ${BENCH_ROUNDS.toLocaleString()}`);
  console.log(`    Heartbeat speed:    ${heartbeatOps.toLocaleString()} ops/sec`);
  console.log(`    Scan time (1k ops): ${(checkSec * 1000).toFixed(3)} ms`);
  console.log(`    Stalls detected:    ${stalls.length} (healthy)\n`);
  detector.dispose();

  // 4. Parallel Progress Aggregator Simulation
  const WAVES = 200;
  const WORKERS_PER_WAVE = 10;
  const startAgg = process.hrtime.bigint();

  let completedWaves = 0;
  for (let w = 0; w < WAVES; w++) {
    const aggregator = new ParallelProgressAggregator({
      parentOperationId: `parent_wave_${w}`,
      policy: AGGREGATION_POLICIES.ALL_MUST_PASS,
    });

    for (let k = 0; k < WORKERS_PER_WAVE; k++) {
      aggregator.registerChild(`w_${w}_k_${k}`, { name: `Worker ${k}` });
      aggregator.updateChildProgress(`w_${w}_k_${k}`, { current: 10, total: 10 });
      aggregator.updateChildState(`w_${w}_k_${k}`, PROGRESS_STATES.COMPLETED);
    }

    const snap = aggregator.getSnapshot();
    if (snap.overallState === PROGRESS_STATES.COMPLETED) {
      completedWaves++;
    }
    aggregator.dispose();
  }

  const endAgg = process.hrtime.bigint();
  const aggSec = Number(endAgg - startAgg) / 1e9;
  const totalSubtasks = WAVES * WORKERS_PER_WAVE;
  const aggOps = Math.round(totalSubtasks / aggSec);

  console.log(`[4] Parallel Multi-Worker Aggregation Simulation:`);
  console.log(`    Completed waves:    ${completedWaves} / ${WAVES}`);
  console.log(`    Total subtasks:     ${totalSubtasks.toLocaleString()}`);
  console.log(`    Elapsed time:       ${(aggSec * 1000).toFixed(2)} ms`);
  console.log(`    Throughput:         ${aggOps.toLocaleString()} subtasks/sec\n`);

  console.log('================================================================');
  console.log(' Benchmark Completed Successfully');
  console.log('================================================================');
}

runBenchmark();

