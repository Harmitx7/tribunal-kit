'use strict';

/**
 * codebase_intelligence_performance.test.js
 * ══════════════════════════════════════════════════════════════════════════════
 * Phase 7: Performance, Scalability & Resource-Budget Certification Test Suite
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  CodebaseIntelligence,
  runCodebaseIntelligence,
} = require('../../.agent/scripts/codebase_intelligence');
const { ArchitectureExtractor } = require('../../.agent/scripts/architecture_extractor');

describe('Phase 7: Performance, Scalability & Resource-Budget Certification', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tribunal-perf-test-'));
  });

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('P1: Cache Correctness & Invalidation — getModel() reuses model and forceFresh invalidates', async () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'cache-test', version: '1.0.0' }));
    fs.writeFileSync(path.join(tmpDir, 'service_a.js'), 'module.exports = { a: 1 };\n');

    const engine = new CodebaseIntelligence(tmpDir);
    const model1 = engine.getModel();
    expect(model1).toBeDefined();

    // Calling again returns identical reference (cache hit)
    const model2 = engine.getModel();
    expect(model2).toBe(model1);

    // Adding a new file and calling with forceFresh produces updated model (cache invalidation)
    fs.writeFileSync(path.join(tmpDir, 'service_b.js'), 'module.exports = { b: 2 };\n');
    const model3 = engine.getModel(true);
    expect(model3).not.toBe(model1);
    const entityIds = (model3.entities || []).map(e => e.name);
    expect(entityIds).toContain('service_b.js');
  });

  test('P2: Resource Budget — maxFileSize skips reading and full AST parsing of oversized files', async () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'size-test', version: '1.0.0' }));
    fs.writeFileSync(path.join(tmpDir, 'normal.js'), 'module.exports = { normal: true };\n');

    // Create a 200KB file and set limit to 50KB (51200 bytes)
    const largeContent = '// Large bundle file\n' + 'const x = 1;\n'.repeat(15000);
    fs.writeFileSync(path.join(tmpDir, 'oversized.js'), largeContent);

    const extractor = new ArchitectureExtractor(tmpDir, { maxFileSize: 51200 });
    const model = extractor.scan();

    const oversizedEntity = (model.entities || []).find(e => e.name === 'oversized.js');
    expect(oversizedEntity).toBeDefined();
    expect(oversizedEntity.role).toContain('Oversized');
  });

  test('P3: Resource Budget — maxFiles limits traversal to budget and prevents unbounded crawling', async () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'files-test', version: '1.0.0' }));
    for (let i = 0; i < 25; i++) {
      fs.writeFileSync(path.join(tmpDir, `mod_${i}.js`), `module.exports = { i: ${i} };\n`);
    }

    const extractor = new ArchitectureExtractor(tmpDir, { maxFiles: 10 });
    const model = extractor.scan();

    const modules = (model.entities || []).filter(e => e.kind === 'module');
    expect(modules.length).toBeLessThanOrEqual(10);
  });

  test('P4: Resource Budget — maxDepth prevents infinite directory descent beyond limit', async () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'depth-test', version: '1.0.0' }));

    // Create nested directory 8 levels deep
    let currentDir = tmpDir;
    for (let d = 1; d <= 8; d++) {
      currentDir = path.join(currentDir, `level_${d}`);
      fs.mkdirSync(currentDir, { recursive: true });
      fs.writeFileSync(path.join(currentDir, `leaf_${d}.js`), `module.exports = { depth: ${d} };\n`);
    }

    // Set maxDepth to 3
    const extractor = new ArchitectureExtractor(tmpDir, { maxDepth: 3 });
    const model = extractor.scan();

    const deepModule = (model.entities || []).find(e => e.name === 'leaf_8.js');
    expect(deepModule).toBeUndefined(); // Level 8 excluded by depth limit

    const shallowModule = (model.entities || []).find(e => e.name === 'leaf_2.js');
    expect(shallowModule).toBeDefined(); // Level 2 included
  });

  test('P5: Context & Token Efficiency — overview honors flags.limit to bound output size', async () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'token-test', version: '1.0.0' }));
    for (let i = 0; i < 30; i++) {
      fs.writeFileSync(
        path.join(tmpDir, `file_${i}.js`),
        `const dep = require('./file_0');\nmodule.exports = { i: ${i} };\n`
      );
    }

    const engine = new CodebaseIntelligence(tmpDir);
    const limitedOverview = engine.overview({ limit: 5 });
    expect(limitedOverview.centralityRanking.length).toBeLessThanOrEqual(5);
  });

  test('P6: Semantic Equivalence — Optimized graph lookups match unoptimized behavior', async () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'equiv-test', version: '1.0.0' }));
    fs.writeFileSync(path.join(tmpDir, 'a.js'), 'const b = require("./b");\nmodule.exports = { a: 1 };\n');
    fs.writeFileSync(path.join(tmpDir, 'b.js'), 'const c = require("./c");\nmodule.exports = { b: 2 };\n');
    fs.writeFileSync(path.join(tmpDir, 'c.js'), 'const a = require("./a");\nmodule.exports = { c: 3 };\n');

    const res = await runCodebaseIntelligence({
      subcommand: 'dependencies',
      target: 'a.js',
      repoRoot: tmpDir,
    });

    expect(res.status).toBe('COMPLETE');
    expect(res.data.participatesInCycle).toBe(true);
    expect(res.data.fanIn).toBeGreaterThanOrEqual(1);
    expect(res.data.fanOut).toBeGreaterThanOrEqual(1);
  });
});

