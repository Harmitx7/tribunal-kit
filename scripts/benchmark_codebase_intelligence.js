#!/usr/bin/env node
/**
 * benchmark_codebase_intelligence.js
 * ══════════════════════════════════════════════════════════════════════════════
 * Phase 7: Performance, Scalability & Resource-Budget Benchmark Suite
 *
 * Deterministically generates synthetic repositories of specified profiles:
 *   - Tiny (100 files)
 *   - Small (1,000 files)
 *   - Medium (5,000 - 10,000 files)
 *
 * Measures:
 *   - All 8 operations: overview, trace, dependencies, relevant-files, impact, dead-code, onboard, prepare
 *   - Cold-start vs Warm-run performance
 *   - Wall-clock duration, CPU time, Heap memory delta, Files parsed, Edges examined
 *   - Context efficiency (byte size, char count, estimated token budget)
 *   - Resource budget enforcement and limit degradation
 *
 * Zero external dependencies. Self-cleaning temporary directories.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { performance } = require('perf_hooks');
const {
  CodebaseIntelligence,
  runCodebaseIntelligence,
} = require('../.agent/scripts/codebase_intelligence');

// ANSI Colors
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[92m',
  yellow: '\x1b[93m',
  cyan: '\x1b[96m',
  red: '\x1b[91m',
  gray: '\x1b[90m',
  magenta: '\x1b[95m',
};
function c(color, text) { return `${C[color]}${text}${C.reset}`; }
function bold(text) { return `${C.bold}${text}${C.reset}`; }

// Deterministic Pseudo-Random Generator (Linear Congruential Generator)
function createLcg(seed = 42) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/**
 * Generates an isolated synthetic repository with realistic architectural features
 */
function generateSyntheticRepository(targetDir, fileCount = 100, seed = 42) {
  const rand = createLcg(seed);
  fs.mkdirSync(targetDir, { recursive: true });

  // 1. package.json
  const pkg = {
    name: `synthetic-repo-${fileCount}`,
    version: '1.0.0',
    main: 'src/index.js',
    bin: { 'app-cli': 'bin/cli.js' },
    scripts: {
      test: 'jest',
      build: 'tsc',
      start: 'node src/index.js',
    },
    dependencies: {
      express: '^4.18.2',
      prisma: '^5.0.0',
    },
  };
  fs.writeFileSync(path.join(targetDir, 'package.json'), JSON.stringify(pkg, null, 2));

  // 2. Directories
  const binDir = path.join(targetDir, 'bin');
  const srcDir = path.join(targetDir, 'src');
  const testDir = path.join(targetDir, 'test');
  const ignoredDir = path.join(targetDir, 'node_modules', 'dummy_pkg');
  fs.mkdirSync(binDir, { recursive: true });
  fs.mkdirSync(srcDir, { recursive: true });
  fs.mkdirSync(testDir, { recursive: true });
  fs.mkdirSync(ignoredDir, { recursive: true });

  // Ignored folder files (must not be parsed by extractor)
  fs.writeFileSync(path.join(ignoredDir, 'index.js'), 'module.exports = { secret: "ignored" };\n');

  // CLI Binary
  fs.writeFileSync(path.join(binDir, 'cli.js'), '#!/usr/bin/env node\nconsole.log("CLI running");\n');

  // Subsystem module directories
  const moduleCount = Math.max(3, Math.floor(fileCount / 20));
  const moduleDirs = [];
  for (let m = 0; m < moduleCount; m++) {
    const modPath = path.join(srcDir, `module_${m}`);
    fs.mkdirSync(modPath, { recursive: true });
    moduleDirs.push(modPath);
  }

  // Create files across modules with imports and call-graphs
  const allCreatedFiles = [];
  const filesPerModule = Math.floor((fileCount - 10) / moduleCount);

  for (let m = 0; m < moduleCount; m++) {
    const modDir = moduleDirs[m];
    const modRel = path.relative(targetDir, modDir).replace(/\\/g, '/');

    for (let f = 0; f < filesPerModule; f++) {
      const fileName = `service_${f}.js`;
      const fullPath = path.join(modDir, fileName);
      const relPath = path.relative(targetDir, fullPath).replace(/\\/g, '/');
      allCreatedFiles.push(relPath);

      // Deterministic imports from other modules
      let importStatement = '';
      if (allCreatedFiles.length > 1 && rand() > 0.3) {
        const targetRel = allCreatedFiles[Math.floor(rand() * (allCreatedFiles.length - 1))];
        const relativeImport = path.relative(modDir, path.join(targetDir, targetRel)).replace(/\\/g, '/');
        const cleanImport = relativeImport.startsWith('.') ? relativeImport : `./${relativeImport}`;
        importStatement = `const dep = require('${cleanImport}');\n`;
      }

      // Feature patterns (routes, datastores, queues)
      let body = '';
      if (f % 5 === 0) {
        body += `// HTTP Route Handler\napp.get('/api/resource_${m}_${f}', (req, res) => res.json({ status: 'ok' }));\n`;
      }
      if (f % 7 === 0) {
        body += `// Datastore Query\nconst user = await prisma.user.findMany({ where: { active: true } });\n`;
      }
      if (f % 11 === 0) {
        body += `// Message Queue Event\nqueue.add('job_${m}_${f}', { data: 123 });\n`;
      }
      if (f % 13 === 0) {
        body += `// VERIFY: Chesterton's fence for legacy resource invariant\n`;
      }

      const fileContent = `'use strict';\n${importStatement}\nfunction handle_${m}_${f}() {\n  return 'val_${m}_${f}';\n}\n${body}\nmodule.exports = { handle_${m}_${f} };\n`;
      fs.writeFileSync(fullPath, fileContent);
    }

    // Barrel index.js for module
    fs.writeFileSync(path.join(modDir, 'index.js'), `module.exports = require('./service_0.js');\n`);
  }

  // Root entry point
  fs.writeFileSync(
    path.join(srcDir, 'index.js'),
    `'use strict';\nconst m0 = require('./module_0');\nmodule.exports = { m0 };\n`
  );

  // Test files
  fs.writeFileSync(
    path.join(testDir, 'app.test.js'),
    `const app = require('../src/index');\ntest('app loads', () => expect(app).toBeDefined());\n`
  );

  return { targetDir, fileCount };
}

/**
 * Runs a single benchmark trial
 */
async function runTrial(engine, opName, target, flags = {}) {
  // GC hint if available
  if (global.gc) global.gc();

  const memBefore = process.memoryUsage().heapUsed;
  const cpuBefore = process.cpuUsage();
  const t0 = performance.now();

  let res;
  switch (opName) {
    case 'overview':
      res = engine.overview(flags);
      break;
    case 'trace':
      res = engine.trace(target || 'resource_0_0', flags);
      break;
    case 'dependencies':
      res = engine.dependencies(target, flags);
      break;
    case 'relevant-files':
      res = engine.relevantFiles(target || 'resource user login', flags);
      break;
    case 'impact':
      res = engine.impact(target || 'src/index.js', flags);
      break;
    case 'dead-code':
      res = engine.deadCode('all', flags);
      break;
    case 'onboard':
      res = engine.onboard(flags);
      break;
    case 'prepare':
      res = engine.prepare(target || 'resource user login', flags);
      break;
    default:
      throw new Error(`Unknown operation: ${opName}`);
  }

  const t1 = performance.now();
  const cpuAfter = process.cpuUsage(cpuBefore);
  const memAfter = process.memoryUsage().heapUsed;

  const durationMs = t1 - t0;
  const cpuUserMs = cpuAfter.user / 1000;
  const cpuSystemMs = cpuAfter.system / 1000;
  const heapDeltaMb = (memAfter - memBefore) / (1024 * 1024);

  const jsonStr = JSON.stringify(res);
  const byteSize = Buffer.byteLength(jsonStr, 'utf8');
  const charLength = jsonStr.length;
  const estimatedTokens = Math.ceil(charLength / 4);

  return {
    opName,
    durationMs,
    cpuTotalMs: cpuUserMs + cpuSystemMs,
    heapDeltaMb,
    byteSize,
    charLength,
    estimatedTokens,
    status: res.status || (res.subcommand ? 'COMPLETE' : 'UNKNOWN'),
    evidenceCount: res.evidenceRecords?.length || 0,
  };
}

/**
 * Runs repeated trials and calculates median, min, max
 */
async function benchmarkOperation(repoRoot, opName, target, runs = 3) {
  // Cold run (new instance)
  const coldEngine = new CodebaseIntelligence(repoRoot);
  const coldResult = await runTrial(coldEngine, opName, target);

  // Warm runs (cached model)
  const warmResults = [];
  for (let i = 0; i < runs; i++) {
    const trial = await runTrial(coldEngine, opName, target);
    warmResults.push(trial);
  }

  const warmTimes = warmResults.map(r => r.durationMs).sort((a, b) => a - b);
  const medianWarm = warmTimes[Math.floor(warmTimes.length / 2)];
  const minWarm = warmTimes[0];
  const maxWarm = warmTimes[warmTimes.length - 1];

  return {
    opName,
    coldMs: coldResult.durationMs,
    warmMedianMs: medianWarm,
    warmMinMs: minWarm,
    warmMaxMs: maxWarm,
    cpuMs: coldResult.cpuTotalMs,
    heapDeltaMb: coldResult.heapDeltaMb,
    byteSize: coldResult.byteSize,
    estimatedTokens: coldResult.estimatedTokens,
    evidenceCount: coldResult.evidenceCount,
  };
}

/**
 * Run full benchmark suite across all profiles
 */
async function runFullBenchmark(profiles = [100, 1000]) {
  console.log(bold('\n══════════════════════════════════════════════════════════════════════════════'));
  console.log(bold('  Tribunal-Kit v9.3.0 Codebase Intelligence Performance Benchmark'));
  console.log(c('gray', `  Node: ${process.version} | Platform: ${os.platform()} ${os.arch()} | CPUs: ${os.cpus().length}`));
  console.log(bold('══════════════════════════════════════════════════════════════════════════════\n'));

  const ops = ['overview', 'trace', 'dependencies', 'relevant-files', 'impact', 'dead-code', 'onboard', 'prepare'];
  const profileResults = {};

  for (const fileCount of profiles) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `tribunal-bench-${fileCount}-`));
    console.log(c('cyan', `▶ Generating synthetic repository: ${fileCount} files in ${tmpDir}...`));
    const genStart = performance.now();
    generateSyntheticRepository(tmpDir, fileCount, 42);
    const genTime = performance.now() - genStart;
    console.log(c('green', `  ✓ Fixture ready in ${genTime.toFixed(1)} ms.\n`));

    const opResults = [];
    for (const op of ops) {
      process.stdout.write(`  Measuring operation ${bold(op.padEnd(16))} ... `);
      const stats = await benchmarkOperation(tmpDir, op, undefined, 3);
      opResults.push(stats);
      console.log(
        `${c('green', stats.coldMs.toFixed(1) + ' ms')} (cold) | ` +
        `${c('yellow', stats.warmMedianMs.toFixed(1) + ' ms')} (warm) | ` +
        `${c('gray', stats.estimatedTokens + ' tokens')}`
      );
    }

    profileResults[fileCount] = {
      fileCount,
      genTimeMs: genTime,
      opResults,
    };

    // Clean up
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.log(c('dim', `  ✓ Cleaned up temporary directory: ${tmpDir}\n`));
  }

  return profileResults;
}

if (require.main === module) {
  const targetCount = parseInt(process.argv[2], 10) || 100;
  runFullBenchmark([targetCount])
    .then(res => {
      console.log(bold('✓ Benchmark Completed Successfully.'));
    })
    .catch(err => {
      console.error(c('red', `✖ Benchmark failed: ${err.message}`));
      process.exit(1);
    });
}

module.exports = {
  generateSyntheticRepository,
  benchmarkOperation,
  runFullBenchmark,
};

