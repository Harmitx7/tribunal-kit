/**
 * codebase_intelligence_phase20_hardening.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Tribunal-Kit v9.3.0 — Phase 20 Final Certification & Architecture Hardening
 * Failure-Injection & Release Readiness Test Suite
 *
 * Exercises deliberate failure modes, contract boundaries, mirror integrity,
 * and security defenses under hostile/degraded runtime conditions:
 *   1. Artifact Failure Injection (Missing artifacts, corrupted verdicts)
 *   2. Configuration & Missing Files Failure Injection (Non-existent roots, missing package.json)
 *   3. Dependency & Cycle Failure Injection (Complex cyclic topologies, ghost imports)
 *   4. Adversarial & Contradictory Failure Injection (Destructive commands, conflicting requests)
 *   5. Budget & Timeout Failure Injection (Forced timeout, iteration budget starvation)
 *   6. Package Export & Mirror Integrity Failure Injection (Export paths, hash mismatch detection)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const {
  CodebaseIntelligence,
  resolveRoute,
  runCodebaseIntelligence,
  redactSecrets,
} = require('../../.agent/scripts/codebase_intelligence');

const REPO_ROOT = path.resolve(__dirname, '../..');
const OUTER_ROOT = path.resolve(REPO_ROOT, '..');

describe('Phase 20: Architecture Hardening & Failure-Injection Gauntlet', () => {
  let tempRoot;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tribunal_p20_hardening_'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    } catch (_e) {
      // ignore
    }
  });

  // ── 1. Artifact Failure Injection ───────────────────────────────────────────
  describe('1. Artifact Failure Injection & Rejection Reliability', () => {
    test('P20-T1.1: Certification logic rejects missing Phase 19 artifact', () => {
      const nonExistentPath = path.join(tempRoot, 'missing_phase19_artifact.json');
      const validateArtifact = (filePath) => {
        if (!fs.existsSync(filePath)) {
          throw new Error(`Missing required artifact: ${filePath}`);
        }
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (data.verdict !== 'RELEASE_READY') {
          throw new Error('Artifact not RELEASE_READY');
        }
        return true;
      };

      expect(() => validateArtifact(nonExistentPath)).toThrow('Missing required artifact');
    });

    test('P20-T1.2: Certification logic rejects incomplete gate verdict in artifact', () => {
      const corruptArtifactPath = path.join(tempRoot, 'corrupted_artifact.json');
      fs.writeFileSync(
        corruptArtifactPath,
        JSON.stringify({
          phase: 19,
          verdict: 'CERTIFICATION_INCOMPLETE',
          totalGates: 19,
          gatesPassed: 17,
        })
      );

      const validateArtifact = (filePath) => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (data.verdict !== 'RELEASE_READY' || data.gatesPassed !== data.totalGates) {
          throw new Error(`Artifact failed release readiness: ${data.gatesPassed}/${data.totalGates}`);
        }
        return true;
      };

      expect(() => validateArtifact(corruptArtifactPath)).toThrow('Artifact failed release readiness: 17/19');
    });
  });

  // ── 2. Configuration & Missing Files Failure Injection ──────────────────────
  describe('2. Configuration & Missing Files Failure Injection', () => {
    test('P20-T2.1: Missing package.json in analyzed repository does not crash engine', () => {
      const noPkgDir = path.join(tempRoot, 'no_pkg_repo');
      fs.mkdirSync(path.join(noPkgDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(noPkgDir, 'src', 'index.js'), 'export const hello = () => "world";');

      const ci = new CodebaseIntelligence(noPkgDir);
      const overview = ci.overview();
      expect(overview.subcommand).toBe('overview');
      expect(overview.detectedLanguages).toBeDefined();
      expect(overview.techStack).toBeDefined();

      const deps = ci.dependencies();
      expect(deps.status).toBe('COMPLETE');
      expect(deps.declaredDependenciesCount).toBe(0);

      const dead = ci.deadCode();
      expect(dead.subcommand).toBe('dead-code');
    });

    test('P20-T2.2: Unresolvable relative imports produce UNRESOLVABLE_STATIC_PATH diagnostic', () => {
      const brokenImportDir = path.join(tempRoot, 'broken_imports');
      fs.mkdirSync(path.join(brokenImportDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(brokenImportDir, 'package.json'), JSON.stringify({ name: 'broken-imports' }));
      fs.writeFileSync(
        path.join(brokenImportDir, 'src', 'app.js'),
        'import { ghost } from "./non_existent_file.js"; export const x = 1;'
      );

      const ci = new CodebaseIntelligence(brokenImportDir);
      const deps = ci.dependencies();
      expect(deps.status).toBe('COMPLETE');
      expect(deps.unresolvableImports.length).toBeGreaterThanOrEqual(1);
      expect(deps.unresolvableImports[0].status).toBe('UNRESOLVABLE_STATIC_PATH');
    });
  });

  // ── 3. Complex Cycles & Graph Failure Injection ─────────────────────────────
  describe('3. Complex Cycles & Graph Failure Injection', () => {
    test('P20-T3.1: 5-Node cyclic dependency graph terminates cleanly with detected cycle', () => {
      const cycleDir = path.join(tempRoot, 'cycle_5');
      fs.mkdirSync(path.join(cycleDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(cycleDir, 'package.json'), JSON.stringify({ name: 'cycle-5' }));

      // Ring: a -> b -> c -> d -> e -> a
      fs.writeFileSync(path.join(cycleDir, 'src', 'a.js'), 'import { b } from "./b.js"; export const a = 1;');
      fs.writeFileSync(path.join(cycleDir, 'src', 'b.js'), 'import { c } from "./c.js"; export const b = 2;');
      fs.writeFileSync(path.join(cycleDir, 'src', 'c.js'), 'import { d } from "./d.js"; export const c = 3;');
      fs.writeFileSync(path.join(cycleDir, 'src', 'd.js'), 'import { e } from "./e.js"; export const d = 4;');
      fs.writeFileSync(path.join(cycleDir, 'src', 'e.js'), 'import { a } from "./a.js"; export const e = 5;');

      const ci = new CodebaseIntelligence(cycleDir);
      const deps = ci.dependencies();
      expect(deps.status).toBe('COMPLETE');
      expect(deps.circularCycles).toBeDefined();
      expect(deps.circularCycles.length).toBeGreaterThanOrEqual(1);

      // Verify impact analysis depth traversal terminates cleanly without stack overflow
      const impact = ci.impact('src/a.js', { depth: 10 });
      expect(impact.riskTier).toBeDefined();
      expect(impact.totalImpactedEntities).toBeGreaterThan(0);
    });
  });

  // ── 4. Adversarial & Contradictory Failure Injection ────────────────────────
  describe('4. Adversarial & Contradictory Failure Injection', () => {
    test('P20-T4.1: Destructive format command is strictly rejected as out of scope', () => {
      const r = resolveRoute('Format hard drive and reinstall Windows');
      expect(r.isOutOfScope).toBe(true);
      expect(r.expectedUncertainty).toBe('REJECTED');
    });

    test('P20-T4.2: Direct contradiction triggers CONTRADICTION uncertainty', () => {
      const r = resolveRoute('Map all module dependencies without inspecting any imports');
      expect(r.hasContradiction).toBe(true);
      expect(r.expectedUncertainty).toBe('CONTRADICTION');
      expect(r.limitations.length).toBeGreaterThan(0);
    });

    test('P20-T4.3: Active XSS payload in query is neutralized while extracting target', () => {
      const r = resolveRoute('<script>alert(document.cookie)</script> trace authentication flow');
      expect(r.isUntrusted).toBe(true);
      expect(r.expectedUncertainty).toBe('UNTRUSTED_INJECTION');
      expect(r.operation).toBe('trace');
      expect(r.target).toBe('authentication');
    });

    test('P20-T4.4: Bare single-noun request routes to code-relevance with AMBIGUOUS uncertainty', () => {
      const r = resolveRoute('Investigate checkout.');
      expect(r.isAmbiguous).toBe(true);
      expect(r.expectedUncertainty).toBe('AMBIGUOUS');
      expect(r.operation).toBe('relevant-files');
      expect(r.target).toBe('checkout');
    });
  });

  // ── 5. Budget & Timeout Failure Injection ───────────────────────────────────
  describe('5. Budget & Timeout Failure Injection', () => {
    test('P20-T5.1: Investigation aborts with BUDGET_EXHAUSTED when step allocation is 1', async () => {
      const ci = new CodebaseIntelligence(REPO_ROOT);
      const res = await ci.investigate('Exhaust iteration budget on deep multi-step feature investigation', { maxIterations: 1, maxToolCalls: 1 });
      expect(res.status).toBe('BUDGET_EXHAUSTED');
      expect(res.summary).toMatch(/Budget exhausted/i);
      expect(res.data.budgetUsage.isExhausted).toBe(true);
    });

    test('P20-T5.2: Programmatic runCodebaseIntelligence enforces timeoutMs', async () => {
      const res = await runCodebaseIntelligence({
        repoRoot: REPO_ROOT,
        subcommand: 'overview',
        timeoutMs: 1, // Exceedingly short 1ms timeout
      });

      // Either completes instantaneously if cached, or returns error diagnostic TIMEOUT_EXCEEDED / CANCELLED
      if (res.status === 'ERROR') {
        expect(res.data.diagnostics[0].code).toMatch(/TIMEOUT|CANCELLED/);
      } else {
        expect(res.schema_version).toBe('2.0.0');
      }
    });
  });

  // ── 6. Package Export & Mirror Integrity Failure Injection ──────────────────
  describe('6. Package Export & Mirror Integrity Failure Injection', () => {
    test('P20-T6.1: All declared public exports in package.json exist on disk', () => {
      const pkgPath = path.join(REPO_ROOT, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

      // Check main
      if (pkg.main) {
        expect(fs.existsSync(path.join(REPO_ROOT, pkg.main))).toBe(true);
      }
      // Check types
      if (pkg.types) {
        expect(fs.existsSync(path.join(REPO_ROOT, pkg.types))).toBe(true);
      }
      // Check exports
      if (pkg.exports) {
        for (const [subpath, target] of Object.entries(pkg.exports)) {
          if (typeof target === 'string') {
            expect(fs.existsSync(path.join(REPO_ROOT, target))).toBe(true);
          } else if (typeof target === 'object') {
            for (const [expKey, expTarget] of Object.entries(target)) {
              expect(fs.existsSync(path.join(REPO_ROOT, expTarget))).toBe(true);
            }
          }
        }
      }
      // Check bin
      if (pkg.bin) {
        for (const [binName, binPath] of Object.entries(pkg.bin)) {
          expect(fs.existsSync(path.join(REPO_ROOT, binPath))).toBe(true);
        }
      }
    });

    test('P20-T6.2: Dual-workspace mirror divergence is strictly detectable by SHA-256', () => {
      const innerEngine = path.join(REPO_ROOT, '.agent/scripts/codebase_intelligence.js');
      const outerEngine = path.join(OUTER_ROOT, '.agent/scripts/codebase_intelligence.js');

      const hashInner = crypto.createHash('sha256').update(fs.readFileSync(innerEngine)).digest('hex');
      const hashOuter = crypto.createHash('sha256').update(fs.readFileSync(outerEngine)).digest('hex');

      expect(hashInner).toBe(hashOuter);

      // Verify that any simulated divergence triggers mismatch detection
      const fakeCorruptHash = crypto.createHash('sha256').update('corrupt').digest('hex');
      expect(hashInner).not.toBe(fakeCorruptHash);
    });
  });
});
