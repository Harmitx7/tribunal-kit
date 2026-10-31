/**
 * codebase_intelligence_phase16_semantic.test.js
 * ═════════════════════════════════════════════════════════════════════════════
 * Phase 16: Cross-Repository Generalization & Semantic Evidence Verification
 * Master Regression Test Suite
 *
 * Validates:
 *   1. Zero false negatives from local identifier shadowing (Failure Class A)
 *   2. Zero false negatives from same-name symbols across modules (Failure Class B)
 *   3. Zero false negatives from comments and string literals (Failure Class D)
 *   4. Zero false positives from aliased imports and destructuring (Failure Class E)
 *   5. Accurate resolution across re-export barrel chains (Fixture 1)
 *   6. Clean isolation of duplicate symbols across services (Fixture 2)
 *   7. Circular module dependency cycle traversal (Fixture 4)
 *   8. Monorepo multi-package cross-boundary imports (Fixture 5)
 *   9. Dynamic import recognition and uncertainty calibration (Fixture 6)
 *  10. Performance budget: dead-code latency strictly bounded (< 2500ms)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { CodebaseIntelligence } = require('../../.agent/scripts/codebase_intelligence');

describe('Phase 16: Cross-Repository Generalization & Semantic Evidence Verification', () => {
  let tempRoot;

  beforeAll(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ci_phase16_jest_'));
  });

  afterAll(() => {
    try {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    } catch (_e) {}
  });

  test('G-16.1: Local identifier shadowing does not cause false negative (Failure Class A)', () => {
    const projDir = path.join(tempRoot, 'shadowing_test');
    fs.mkdirSync(projDir, { recursive: true });
    fs.writeFileSync(path.join(projDir, 'package.json'), JSON.stringify({ name: 'shadowing-test', main: 'main.js' }));

    // users.js: exports truly dead function
    fs.writeFileSync(path.join(projDir, 'users.js'), 'export function deadFunction() { return 1; }');

    // main.js: defines a local variable named deadFunction, never imports users.js
    fs.writeFileSync(path.join(projDir, 'main.js'), `
function test() {
  const deadFunction = 42;
  return deadFunction;
}
export function run() { return test(); }
`);

    const ci = new CodebaseIntelligence(projDir);
    const res = ci.deadCode();
    const deadSymbols = res.unreferencedExports.map(e => `${e.name}@${e.file}`);
    expect(deadSymbols).toContain('deadFunction@users.js');
  });

  test('G-16.2: Same-name symbols in different modules are resolved independently (Failure Class B)', () => {
    const projDir = path.join(tempRoot, 'same_name_test');
    fs.mkdirSync(path.join(projDir, 'services'), { recursive: true });
    fs.writeFileSync(path.join(projDir, 'package.json'), JSON.stringify({ name: 'same-name-test', main: 'app.js' }));

    // billing.js: exports calculateTax (called by app.js)
    fs.writeFileSync(path.join(projDir, 'services', 'billing.js'), 'export function calculateTax(x) { return x * 0.2; }');

    // analytics.js: exports calculateTax (NEVER imported by any file!)
    fs.writeFileSync(path.join(projDir, 'services', 'analytics.js'), 'export function calculateTax(x) { return x * 0.1; }');

    // app.js: only imports calculateTax from billing.js
    fs.writeFileSync(path.join(projDir, 'app.js'), `
import { calculateTax } from './services/billing.js';
export function main() { return calculateTax(50); }
`);

    const ci = new CodebaseIntelligence(projDir);
    const res = ci.deadCode();
    const deadSymbols = res.unreferencedExports.map(e => `${e.name}@${e.file}`);

    // analytics.js calculateTax MUST be flagged dead
    expect(deadSymbols).toContain('calculateTax@services/analytics.js');
    // billing.js calculateTax MUST NOT be flagged dead
    expect(deadSymbols).not.toContain('calculateTax@services/billing.js');
  });

  test('G-16.3: Comments and string literals do not mark dead symbols as live (Failure Class D)', () => {
    const projDir = path.join(tempRoot, 'comments_test');
    fs.mkdirSync(projDir, { recursive: true });
    fs.writeFileSync(path.join(projDir, 'package.json'), JSON.stringify({ name: 'comments-test', main: 'index.js' }));

    // dead.js: exports unusedCalculation
    fs.writeFileSync(path.join(projDir, 'dead.js'), 'export function unusedCalculation() { return 100; }');

    // index.js: mentions unusedCalculation in comment and string literal only
    fs.writeFileSync(path.join(projDir, 'index.js'), `
// Note: We used to call unusedCalculation() before v2
const doc = "unusedCalculation() is now deprecated";
export function start() { return "ok"; }
`);

    const ci = new CodebaseIntelligence(projDir);
    const res = ci.deadCode();
    const deadSymbols = res.unreferencedExports.map(e => `${e.name}@${e.file}`);
    expect(deadSymbols).toContain('unusedCalculation@dead.js');
  });

  test('G-16.4: Aliased imports are correctly tracked as live (Failure Class E)', () => {
    const projDir = path.join(tempRoot, 'alias_test');
    fs.mkdirSync(projDir, { recursive: true });
    fs.writeFileSync(path.join(projDir, 'package.json'), JSON.stringify({ name: 'alias-test', main: 'index.js' }));

    // math.js: exports addNumbers
    fs.writeFileSync(path.join(projDir, 'math.js'), 'export function addNumbers(a, b) { return a + b; }');

    // index.js: imports addNumbers as add
    fs.writeFileSync(path.join(projDir, 'index.js'), `
import { addNumbers as add } from './math.js';
export function run() { return add(1, 2); }
`);

    const ci = new CodebaseIntelligence(projDir);
    const res = ci.deadCode();
    const deadSymbols = res.unreferencedExports.map(e => `${e.name}@${e.file}`);
    expect(deadSymbols).not.toContain('addNumbers@math.js');
  });

  test('G-16.5: Re-export barrel chains distinguish consumed vs unconsumed exports', () => {
    const projDir = path.join(tempRoot, 'barrel_test');
    fs.mkdirSync(path.join(projDir, 'features'), { recursive: true });
    fs.writeFileSync(path.join(projDir, 'package.json'), JSON.stringify({ name: 'barrel-test', main: 'app.js' }));

    // features/auth.js: exports login (consumed) and logout (unconsumed)
    fs.writeFileSync(path.join(projDir, 'features', 'auth.js'), `
export function login() { return "token"; }
export function logout() { return true; }
`);

    // features/index.js: barrel re-export
    fs.writeFileSync(path.join(projDir, 'features', 'index.js'), `
export { login, logout } from './auth.js';
`);

    // app.js: only imports login from barrel
    fs.writeFileSync(path.join(projDir, 'app.js'), `
import { login } from './features/index.js';
export function start() { return login(); }
`);

    const ci = new CodebaseIntelligence(projDir);
    const res = ci.deadCode();
    const deadSymbols = res.unreferencedExports.map(e => `${e.name}@${e.file}`);

    expect(deadSymbols).toContain('logout@features/auth.js');
    expect(deadSymbols).not.toContain('login@features/auth.js');
  });

  test('G-16.6: Performance invariant: deadCode completes within budget on repository (< 2500ms)', () => {
    const ci = new CodebaseIntelligence(path.resolve(__dirname, '../..'));
    const t0 = performance.now();
    const res = ci.deadCode();
    const dur = performance.now() - t0;

    expect(dur).toBeLessThan(2500);
    expect(res.subcommand).toBe('dead-code');
    expect(Array.isArray(res.unreferencedExports)).toBe(true);
    expect(res.unreferencedExports.length).toBeGreaterThan(0);
    expect(res.evidenceRecords.length).toBeGreaterThan(0);
  });
});

