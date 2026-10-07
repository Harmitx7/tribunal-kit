'use strict';

const { CorrectionRunEngine } = require('../src/execution/correction_run_engine');

async function benchmark() {
  console.log('TRIBUNAL KIT: Correction Loop Benchmark');
  console.log('=======================================');

  // Mock implementations to measure framework overhead rather than API latency
  const mockWriteService = {
    requestWrite: async () => ({ status: 'PENDING_COMMIT', token: 'tok', transactionId: 'tx1' }),
    commitWrite: async () => ({}),
  };

  const mockVerifier = {
    verify: async () => ({ status: 'VERIFIED', passedChecks: ['UNIT_TEST'], failedChecks: [] }),
  };

  const engine = new CorrectionRunEngine({
    controlledWriteService: mockWriteService,
    correctionVerifier: mockVerifier,
  });

  const finding = {
    id: 'F1',
    category: 'Security',
    severity: 'CRITICAL',
    issue: 'Hardcoded secret',
  };

  const iterations = 100;
  let totalMs = 0;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();

    const runId = engine.createRun(finding, { workspaceId: 'ws_bench' });

    // Disable exact loop detection by mutating the engine's mock plan generator just to get varied plans
    engine.correctionEngine.generateEnhancedPlan = () => ({ objective: `Fix ${i}` });

    await engine.planCorrection(runId, {});
    await engine.executeCorrection(runId, [
      { path: 'test.js', operation: 'MODIFY', content: 'good' },
    ]);
    await engine.verifyCorrection(runId, []); // empty array = no new findings = resolved

    totalMs += performance.now() - start;
  }

  const p50 = totalMs / iterations;
  console.log(`Executed ${iterations} simulated correction loops.`);
  console.log(
    `Average (P50) Latency (System Overhead only): ${p50.toFixed(2)}ms per complete loop`,
  );

  if (p50 > 100) {
    console.warn('WARNING: Correction loop overhead is surprisingly high.');
    process.exit(1);
  } else {
    console.log('STATUS: PASS');
  }
}

benchmark().catch(err => {
  console.error(err);
  process.exit(1);
});
