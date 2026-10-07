const path = require('path');
const { performance } = require('perf_hooks');
const crypto = require('crypto');
const fs = require('fs');

const { ControlledWriteService } = require('../src/execution/controlled_write_service');

const TOTAL_RUNS = 20;

function calculatePercentile(values, p) {
  if (values.length === 0) return 0;
  values.sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * values.length) - 1;
  return values[index].toFixed(4);
}

function generateDummyFiles(count) {
  const files = [];
  for (let i = 0; i < count; i++) {
    const p = `dummy_file_${i}.js`;
    const c = `// Dummy file ${i}\nconst a = ${Math.random()};\nconsole.log(a);\n`;
    files.push({
      path: p,
      operation: 'CREATE',
      content: c,
    });
  }
  return files;
}

async function runBenchmark() {
  const service = new ControlledWriteService({ workspaceRoot: process.cwd() });

  const results = {
    '1_file': [],
    '5_files': [],
    '10_files': [],
    '50_files': [],
  };

  const fileCounts = [1, 5, 10, 50];

  for (const count of fileCounts) {
    console.log(`Benchmarking ${count} files...`);
    const key = `${count}_file${count > 1 ? 's' : ''}`;
    for (let i = 0; i < TOTAL_RUNS; i++) {
      const files = generateDummyFiles(count);
      const req = {
        requestId: `req_${Date.now()}`,
        workspaceId: 'bench-workspace',
        agentId: 'BENCH_AGENT',
        files,
        reason: 'Performance testing',
      };

      const start = performance.now();
      try {
        const res = await service.requestWrite(req, { dryRun: true });
        const end = performance.now();
        results[key].push(end - start);
      } catch (err) {
        console.error(err);
      }
    }
  }

  console.log('\\n--- BENCHMARK RESULTS ---');
  for (const count of fileCounts) {
    const key = `${count}_file${count > 1 ? 's' : ''}`;
    const times = results[key];
    console.log(`${count} files:`);
    console.log(`  P50: ${calculatePercentile(times, 50)} ms`);
    console.log(`  P95: ${calculatePercentile(times, 95)} ms`);
    console.log(`  P99: ${calculatePercentile(times, 99)} ms`);
  }

  // Test rejection
  console.log('\\nBenchmarking rejection (Sensitive File)...');
  const rejectTimes = [];
  for (let i = 0; i < TOTAL_RUNS; i++) {
    const req = {
      requestId: `req_${Date.now()}`,
      workspaceId: 'bench-workspace',
      agentId: 'BENCH_AGENT',
      files: [{ path: '.env', operation: 'CREATE', content: 'SECRET=123' }],
      reason: 'Testing rejection',
    };
    const start = performance.now();
    try {
      await service.requestWrite(req, { dryRun: true });
    } catch (e) {}
    rejectTimes.push(performance.now() - start);
  }
  console.log(`  Rejection P50: ${calculatePercentile(rejectTimes, 50)} ms`);
}

runBenchmark().catch(console.error);
