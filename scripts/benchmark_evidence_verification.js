'use strict';

const { ValidationRunner, VALIDATION_REGISTRY } = require('../src/execution/validation_runner');
const { CorrectionVerifier } = require('../src/execution/correction_verifier');

async function runBenchmark() {
  console.log('TRIBUNAL KIT: Evidence Verification Benchmark');
  console.log('=============================================');

  // Register a fast mock test command
  VALIDATION_REGISTRY.test_bench = {
    command: 'node',
    args: ['-e', 'console.log("Tests: 1 passed")'],
    timeout: 5000,
    parser: 'jest',
  };

  const runner = new ValidationRunner();
  const verifier = new CorrectionVerifier({ validationRunner: runner });

  const finding = { category: 'Correctness', severity: 'HIGH' };
  const plan = { affectedFiles: [] };

  // Override the validation plan strictly to our benchmark mock
  verifier._buildValidationPlan = () => [{ type: 'EXECUTION', targetId: 'test_bench' }];

  let totalMs = 0;
  const iterations = 50;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await verifier.verify(finding, plan);
    totalMs += performance.now() - start;
  }

  const p50 = totalMs / iterations;
  console.log(`Executed ${iterations} validation rounds.`);
  console.log(
    `Average (P50) Latency (Process Spawning + Parsing): ${p50.toFixed(2)}ms per complete loop`,
  );

  if (p50 > 500) {
    console.warn('WARNING: Process spawning overhead is very high.');
    process.exit(1);
  } else {
    console.log('STATUS: PASS');
  }
}

runBenchmark().catch(err => {
  console.error(err);
  process.exit(1);
});
