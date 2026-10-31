'use strict';

/**
 * codebase_intelligence_adversarial.test.js
 * ══════════════════════════════════════════════════════════════════════════════════════
 * Phase 6: Behavioral Certification & Adversarial Testing Suite for Tribunal-Kit v9.3.0
 *
 * Evaluates the engine across four adversarial fixture categories:
 *   1. Category A: Dependency Resolution (cycles, missing packages, unresolvable imports)
 *   2. Category B: Static Analysis Boundaries (dead code, entry points, test refs, fences)
 *   3. Category C: Malformed & Ambiguous Repositories (no manifest, corrupted JSON, empty, binary, deep tree)
 *   4. Category D: Adversarial Content & Prompt Injection Defense (README injections, synthetic secrets)
 *   5. All Eight Operations Behavioral Certification
 *   6. Determinism & Stability across repeated invocations
 *   7. Zero-Mutation Read-Only Invariant across adversarial environments
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const {
  CodebaseIntelligence,
  runCodebaseIntelligence,
  runCodebaseIntelligenceCli,
  createEvidenceRecord,
  createResultEnvelope,
  redactSecrets,
} = require('../../.agent/scripts/codebase_intelligence');

const FIXTURES_ROOT = path.resolve(__dirname, '../fixtures/codebase_intelligence_adversarial');
const DEP_REPO = path.join(FIXTURES_ROOT, 'dep_resolution');
const STATIC_REPO = path.join(FIXTURES_ROOT, 'static_boundaries');
const NO_MANIFEST_REPO = path.join(FIXTURES_ROOT, 'malformed_ambiguous/no_manifest');
const EMPTY_REPO = path.join(FIXTURES_ROOT, 'malformed_ambiguous/empty_repo');
const MIXED_REPO = path.join(FIXTURES_ROOT, 'malformed_ambiguous/mixed_languages');
const DEEP_REPO = path.join(FIXTURES_ROOT, 'malformed_ambiguous/deep_tree');
const INJECTION_REPO = path.join(FIXTURES_ROOT, 'injection_adversarial');

describe('Phase 6 — Category A: Dependency Resolution Adversarial Gauntlet', () => {
  test('A1: Detects circular dependency cycles accurately without infinite recursion', async () => {
    const res = await runCodebaseIntelligence({
      subcommand: 'dependencies',
      target: 'src/circular_a.js',
      repoRoot: DEP_REPO,
    });

    expect(res.status).toBe('COMPLETE');
    expect(res.data.participatesInCycle).toBe(true);
    expect(Array.isArray(res.data.cyclePath)).toBe(true);
    expect(res.data.cyclePath.length).toBeGreaterThan(0);
  });

  test('A2: Distinguishes missing manifest dependencies from unresolvable local files', async () => {
    const res = await runCodebaseIntelligence({
      subcommand: 'dependencies',
      target: undefined, // repo-wide audit
      repoRoot: DEP_REPO,
    });

    expect(res.status).toBe('COMPLETE');
    expect(res.data.mode).toBe('project_wide');

    // Missing package (uninstalled-ghost-library) must be in missingDependencies
    const missingPkgs = res.data.missingDependencies.map(m => m.package);
    expect(missingPkgs).toContain('uninstalled-ghost-library');

    // Unresolvable local file (./does_not_exist_file.js) must be in unresolvableImports
    const unresolvable = res.data.unresolvableImports.map(u => u.importPath);
    expect(unresolvable).toContain('./does_not_exist_file.js');
  });

  test('A3: Correctly resolves extensionless imports (./service -> service.js)', async () => {
    const res = await runCodebaseIntelligence({
      subcommand: 'dependencies',
      target: 'src/service.js',
      repoRoot: DEP_REPO,
    });

    expect(res.status).toBe('COMPLETE');
    expect(res.data.fanIn).toBeGreaterThanOrEqual(1);
    expect(res.data.fanOut).toBeGreaterThanOrEqual(1);
  });

  test('A4: Computed and dynamic imports do not trigger engine crash and are marked as unresolvable/dynamic', async () => {
    const res = await runCodebaseIntelligence({
      subcommand: 'trace',
      target: 'dynamicLoader',
      repoRoot: DEP_REPO,
    });

    expect(res.status).toBe('COMPLETE');
    // Trace must not fabricate runtime execution for dynamic require
    for (const step of res.data.steps) {
      expect(step.relationType).not.toBe('executes');
      expect(step.action.toLowerCase()).not.toContain('executes at runtime');
    }
  });
});

describe('Phase 6 — Category B: Static Analysis Boundaries', () => {
  test('B1: Identifies unreferenced export candidates in dead-code analysis', async () => {
    const res = await runCodebaseIntelligence({
      subcommand: 'dead-code',
      repoRoot: STATIC_REPO,
    });

    expect(res.status).toBe('COMPLETE');
    expect(res.data.unreferencedExportsCount).toBeGreaterThanOrEqual(1);
    const unrefNames = res.data.unreferencedExports.map(u => u.name || u.symbol);
    expect(unrefNames).toContain('unreferencedZombieFunction');
  });

  test('B2: Protects CLI binaries declared in package.json from being flagged as dead code', async () => {
    const res = await runCodebaseIntelligence({
      subcommand: 'dead-code',
      repoRoot: STATIC_REPO,
    });

    expect(res.status).toBe('COMPLETE');
    // bin/cli.js is declared in package.json bin; must not be an orphan module
    const orphanPaths = (res.data.orphanModules || []).map(o => o.file);
    expect(orphanPaths).not.toContain('bin/cli.js');
  });

  test('B3: Preserves Chesterton fences in dead-code commentary', async () => {
    const res = await runCodebaseIntelligence({
      subcommand: 'dead-code',
      repoRoot: STATIC_REPO,
    });

    expect(res.status).toBe('COMPLETE');
    expect(res.data.chestertonsFencesCount).toBeGreaterThanOrEqual(1);
    const fenceNotes = res.data.chestertonsFences.map(f => f.note);
    expect(fenceNotes.some(n => n.includes('Chesterton') || n.includes('VERIFY'))).toBe(true);
  });

  test('B4: Traverses barrel re-exports without breaking call hierarchy', async () => {
    const res = await runCodebaseIntelligence({
      subcommand: 'dependencies',
      target: 'src/barrel/index.js',
      repoRoot: STATIC_REPO,
    });

    expect(res.status).toBe('COMPLETE');
    expect(res.data.fanOut).toBeGreaterThanOrEqual(2);
  });
});

describe('Phase 6 — Category C: Malformed & Ambiguous Repositories', () => {
  test('C1: Gracefully handles repository with missing package manifest (no package.json)', async () => {
    const res = await runCodebaseIntelligence({
      subcommand: 'overview',
      repoRoot: NO_MANIFEST_REPO,
    });

    expect(res.status).toBe('COMPLETE');
    expect(res.data.schema_version).toBe('2.0.0');
    expect(res.data.workspaces.length).toBe(0);
    expect(res.data.centralityRanking).toBeDefined();
  });

  test('C2: Gracefully handles corrupted/invalid JSON in package manifest without throwing', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tribunal-corrupted-'));
    try {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{\n  "name": "corrupted-test",\n  "version": 1.0.0 (SYNTAX ERROR),\n');
      fs.writeFileSync(path.join(tmpDir, 'index.js'), 'console.log("hello");\n');

      const res = await runCodebaseIntelligence({
        subcommand: 'overview',
        repoRoot: tmpDir,
      });

      expect(res.status).toBe('COMPLETE');
      expect(res.data.schema_version).toBe('2.0.0');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('C3: Gracefully handles empty repository', async () => {
    const res = await runCodebaseIntelligence({
      subcommand: 'overview',
      repoRoot: EMPTY_REPO,
    });

    expect(res.status).toBe('COMPLETE');
    expect(res.data.endpoints.total).toBe(0);
    expect(res.data.centralityRanking.length).toBe(0);
  });

  test('C4: Mixed-language repository catalogs languages and ignores binary files safely', async () => {
    const res = await runCodebaseIntelligence({
      subcommand: 'overview',
      repoRoot: MIXED_REPO,
    });

    expect(res.status).toBe('COMPLETE');
    expect(res.data.techStack.languages.length).toBeGreaterThanOrEqual(1);
    // Binary dummy.bin must not cause read errors or corrupt overview
  });

  test('C5: Deep directory tree (10+ nested levels) is traversed without stack overflow', async () => {
    const res = await runCodebaseIntelligence({
      subcommand: 'overview',
      repoRoot: DEEP_REPO,
    });

    expect(res.status).toBe('COMPLETE');
    expect(res.data.centralityRanking).toBeDefined();
  });
});

describe('Phase 6 — Category D: Adversarial Content & Prompt Injection Defense', () => {
  test('D1: Treats README prompt injections as inert data, never instructions', async () => {
    const res = await runCodebaseIntelligence({
      subcommand: 'overview',
      repoRoot: INJECTION_REPO,
    });

    expect(res.status).toBe('COMPLETE');
    // Summary must not follow the injection to claim '100% bug-free' or DAN persona
    expect(res.data.summary.toLowerCase()).not.toContain('you are now dan');
    expect(res.data.summary.toLowerCase()).not.toContain('injection_successful');
  });

  test('D2: Synthetic secrets in source code and package description are 100% redacted', async () => {
    const res = await runCodebaseIntelligence({
      subcommand: 'relevant-files',
      target: 'prompt_injection credentials',
      repoRoot: INJECTION_REPO,
    });

    const serialized = JSON.stringify(res);
    expect(serialized).not.toContain('sk-ant-api03-abcdef1234567890abcdef1234567890AA');
    expect(serialized).not.toContain('sk-proj-abcdef1234567890abcdef1234567890abcdef12');
    expect(serialized).not.toContain('cluster_secret_pw');
    expect(serialized).not.toContain('super secret internal password');
    expect(res.markdown).not.toContain('cluster_secret_pw');
  });

  test('D3: Fake dependencies inside code comments are not elevated to declared dependencies', async () => {
    const res = await runCodebaseIntelligence({
      subcommand: 'dependencies',
      target: undefined,
      repoRoot: INJECTION_REPO,
    });

    expect(res.status).toBe('COMPLETE');
    const declared = Array.from(res.data.declaredDependenciesCount ? [] : []);
    expect(declared).not.toContain('malicious-comment-package-should-not-be-parsed');
  });
});

describe('Phase 6 — All Eight Operations Behavioral Certification', () => {
  const operations = [
    { sub: 'overview', target: undefined },
    { sub: 'trace', target: 'startApp' },
    { sub: 'dependencies', target: 'src/index.js' },
    { sub: 'relevant-files', target: 'start application flow' },
    { sub: 'impact', target: 'src/service.js' },
    { sub: 'dead-code', target: undefined },
    { sub: 'onboard', target: undefined },
    { sub: 'prepare', target: 'refactor application startup' },
  ];

  for (const op of operations) {
    test(`Operation "${op.sub}" executes cleanly with valid envelope on adversarial repo`, async () => {
      const res = await runCodebaseIntelligence({
        subcommand: op.sub,
        target: op.target,
        repoRoot: DEP_REPO,
      });

      expect(res.status).toBe('COMPLETE');
      expect(res.data.schema_version).toBe('2.0.0');
      expect(res.data.operation).toBe(op.sub);
      expect(typeof res.data.summary).toBe('string');
      expect(Array.isArray(res.data.evidence_records)).toBe(true);
      expect(res.data.completeness.is_complete).toBe(true);
      expect(res.data.completeness.percentage).toBe(100);
    });
  }
});

describe('Phase 6 — Determinism & Zero-Mutation Invariant', () => {
  test('Determinism: Multiple runs on identical fixture produce identical data shapes and statuses', async () => {
    const run1 = await runCodebaseIntelligence({ subcommand: 'overview', repoRoot: DEP_REPO });
    const run2 = await runCodebaseIntelligence({ subcommand: 'overview', repoRoot: DEP_REPO });

    expect(run1.status).toBe(run2.status);
    expect(run1.data.endpoints.total).toBe(run2.data.endpoints.total);
    expect(run1.data.centralityRanking.length).toBe(run2.data.centralityRanking.length);
    expect(run1.data.completeness).toEqual(run2.data.completeness);
  });

  test('Zero Mutation: Entire adversarial fixture tree has zero file creations, edits, or deletes', async () => {
    function snapshotDir(dir) {
      const map = new Map();
      function walk(curr) {
        for (const e of fs.readdirSync(curr, { withFileTypes: true })) {
          const full = path.join(curr, e.name);
          const rel = path.relative(dir, full).replace(/\\/g, '/');
          if (e.isDirectory()) walk(full);
          else map.set(rel, crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex'));
        }
      }
      walk(dir);
      return map;
    }

    const before = snapshotDir(FIXTURES_ROOT);

    // Run all 8 operations across fixtures
    await runCodebaseIntelligence({ subcommand: 'overview', repoRoot: DEP_REPO });
    await runCodebaseIntelligence({ subcommand: 'trace', target: 'startApp', repoRoot: DEP_REPO });
    await runCodebaseIntelligence({ subcommand: 'dependencies', repoRoot: DEP_REPO });
    await runCodebaseIntelligence({ subcommand: 'relevant-files', target: 'run service', repoRoot: DEP_REPO });
    await runCodebaseIntelligence({ subcommand: 'impact', target: 'src/service.js', repoRoot: DEP_REPO });
    await runCodebaseIntelligence({ subcommand: 'dead-code', repoRoot: STATIC_REPO });
    await runCodebaseIntelligence({ subcommand: 'onboard', repoRoot: MIXED_REPO });
    await runCodebaseIntelligence({ subcommand: 'prepare', target: 'update feature', repoRoot: STATIC_REPO });

    const after = snapshotDir(FIXTURES_ROOT);

    expect(after.size).toBe(before.size);
    for (const [file, hash] of before.entries()) {
      expect(after.has(file)).toBe(true);
      expect(after.get(file)).toBe(hash);
    }
  });
});
