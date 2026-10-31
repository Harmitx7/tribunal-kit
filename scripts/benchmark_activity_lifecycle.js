'use strict';

/**
 * Phase 2 Benchmark: Activity Intelligence & State Tracking Engine
 *
 * Measures:
 * 1. Lifecycle transition validation throughput (ops/sec)
 * 2. Operation registration & lookup throughput (ops/sec)
 * 3. Monotonic progress update throughput (ops/sec)
 * 4. High-volume multi-operation lifecycle simulation (1,000 operations)
 * 5. Bounded retention cleanup throughput & memory footprint
 */

const {
  LIFECYCLE_STATES,
  AGENT_SKILL_STATES,
  TOOL_STATES,
  canTransition,
  assertValidTransition,
  OperationRegistry,
  OperationRecord,
} = require('../src/activity');

function runBenchmark() {
  console.log('================================================================');
  console.log(' Tribunal-Kit Activity Engine — Phase 2 Lifecycle Benchmark');
  console.log('================================================================\n');

  const WARMUP_ROUNDS = 5000;
  const BENCH_ROUNDS = 50000;

  // 1. Lifecycle Transition Validation
  for (let i = 0; i < WARMUP_ROUNDS; i++) {
    canTransition(LIFECYCLE_STATES.RUNNING, LIFECYCLE_STATES.COMPLETED);
    canTransition(LIFECYCLE_STATES.PENDING, LIFECYCLE_STATES.RUNNING);
  }

  const startTrans = process.hrtime.bigint();
  for (let i = 0; i < BENCH_ROUNDS; i++) {
    canTransition(LIFECYCLE_STATES.RUNNING, LIFECYCLE_STATES.COMPLETED);
    canTransition(LIFECYCLE_STATES.RUNNING, LIFECYCLE_STATES.WAITING);
    canTransition(LIFECYCLE_STATES.WAITING, LIFECYCLE_STATES.RUNNING);
    canTransition(LIFECYCLE_STATES.RUNNING, LIFECYCLE_STATES.BLOCKED);
  }
  const endTrans = process.hrtime.bigint();
  const transDurationSec = Number(endTrans - startTrans) / 1e9;
  const transOpsPerSec = Math.round((BENCH_ROUNDS * 4) / transDurationSec);

  console.log(`[1] Lifecycle Transition Checks:`);
  console.log(`    Total checks:  ${BENCH_ROUNDS * 4}`);
  console.log(`    Elapsed time:  ${(transDurationSec * 1000).toFixed(2)} ms`);
  console.log(`    Throughput:    ${transOpsPerSec.toLocaleString()} ops/sec\n`);

  // 2. Operation Registry Registration & Lookup
  const registry = new OperationRegistry({ maxCompletedRetention: 10000 });
  const startReg = process.hrtime.bigint();
  for (let i = 0; i < BENCH_ROUNDS; i++) {
    const id = `op_bench_${i}`;
    registry.register({ operationId: id, title: 'Benchmark Op' });
    registry.get(id);
  }
  const endReg = process.hrtime.bigint();
  const regDurationSec = Number(endReg - startReg) / 1e9;
  const regOpsPerSec = Math.round(BENCH_ROUNDS / regDurationSec);

  console.log(`[2] Operation Registry Register & Lookup:`);
  console.log(`    Total pairs:   ${BENCH_ROUNDS}`);
  console.log(`    Elapsed time:  ${(regDurationSec * 1000).toFixed(2)} ms`);
  console.log(`    Throughput:    ${regOpsPerSec.toLocaleString()} ops/sec\n`);

  // 3. Monotonic Progress Updates
  const op = new OperationRecord({ operationId: 'op_prog_bench', status: LIFECYCLE_STATES.RUNNING });
  const startProg = process.hrtime.bigint();
  const PROG_ROUNDS = 20000;
  for (let i = 0; i < PROG_ROUNDS; i++) {
    op.setProgress({ current: i, total: PROG_ROUNDS, unit: 'items' });
  }
  const endProg = process.hrtime.bigint();
  const progDurationSec = Number(endProg - startProg) / 1e9;
  const progOpsPerSec = Math.round(PROG_ROUNDS / progDurationSec);

  console.log(`[3] Monotonic Progress Invariant Updates:`);
  console.log(`    Total updates: ${PROG_ROUNDS}`);
  console.log(`    Elapsed time:  ${(progDurationSec * 1000).toFixed(2)} ms`);
  console.log(`    Throughput:    ${progOpsPerSec.toLocaleString()} ops/sec\n`);

  // 4. Full End-to-End Operation Lifecycle Simulation
  const SIM_OPERATIONS = 5000;
  const simRegistry = new OperationRegistry({ maxCompletedRetention: 2000 });
  const startSim = process.hrtime.bigint();

  for (let i = 0; i < SIM_OPERATIONS; i++) {
    const simOp = simRegistry.register({
      operationId: `sim_op_${i}`,
      title: `Simulation Operation ${i}`,
      status: LIFECYCLE_STATES.RUNNING,
    });

    simOp.recordAgent('backend-specialist', AGENT_SKILL_STATES.ACTIVATED, 'Context');
    simOp.recordTool('git_status', TOOL_STATES.STARTED);
    simOp.recordTool('git_status', TOOL_STATES.COMPLETED, { durationMs: 12 });
    simOp.setProgress({ current: 5, total: 10 });
    simOp.recordEvidence({ ref: `artifacts/evidence_${i}.json`, verified: true });
    simOp.transitionTo(LIFECYCLE_STATES.COMPLETED);
  }

  const endSim = process.hrtime.bigint();
  const simDurationSec = Number(endSim - startSim) / 1e9;
  const simOpsPerSec = Math.round(SIM_OPERATIONS / simDurationSec);

  console.log(`[4] Full Operational Lifecycle Simulation (Register -> Agent -> Tool -> Progress -> Evidence -> Complete):`);
  console.log(`    Total operations: ${SIM_OPERATIONS}`);
  console.log(`    Elapsed time:     ${(simDurationSec * 1000).toFixed(2)} ms`);
  console.log(`    Throughput:       ${simOpsPerSec.toLocaleString()} ops/sec\n`);

  // 5. Memory Footprint and Retention Cleanup
  const memBefore = process.memoryUsage().heapUsed;
  const cleanupRes = simRegistry.cleanup({ maxCompleted: 500, ttlMs: 1000000 });
  const memAfter = process.memoryUsage().heapUsed;

  console.log(`[5] Memory Bounds & Bounded Retention Cleanup:`);
  console.log(`    Completed total:  ${cleanupRes.completedCount}`);
  console.log(`    Evicted count:    ${cleanupRes.evictedCount}`);
  console.log(`    Active count:     ${cleanupRes.activeCount}`);
  console.log(`    Heap used:        ${Math.round(memAfter / 1024 / 1024 * 100) / 100} MB\n`);

  console.log('================================================================');
  console.log(' Benchmark Completed Successfully');
  console.log('================================================================');
}

runBenchmark();
