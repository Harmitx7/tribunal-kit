#!/usr/bin/env node
/**
 * cross_repo_eval_runner.js
 * ═════════════════════════════════════════════════════════════════════════════
 * Phase 16B: Cross-Repository Generalization & Semantic Evidence Evaluation
 *
 * Evaluates CodebaseIntelligence across 6 diverse synthetic repository structures:
 *   1. Re-Export Heavy Barrel Repository
 *   2. Duplicate Symbol Names Across Modules
 *   3. Shadowed Identifiers & Misleading Comments
 *   4. Circular Dependency Cycles
 *   5. Monorepo Multi-Package Workspace Structure
 *   6. Dynamic Imports & Runtime Property Access
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { CodebaseIntelligence } = require('../.agent/scripts/codebase_intelligence');

// Helper to create directory recursively
function mkdirp(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Global fixtures container
const fixturesRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ci_cross_repo_eval_'));

const FIXTURES = {
  // ──────────────────────────────────────────────────────────────────────────
  // Fixture 1: Re-Export Heavy Barrel Architecture
  // ──────────────────────────────────────────────────────────────────────────
  reexport_heavy: () => {
    const root = path.join(fixturesRoot, 'reexport_heavy');
    mkdirp(root);
    mkdirp(path.join(root, 'src', 'features'));

    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({
      name: 'fixture-reexport-heavy',
      main: 'src/index.js'
    }, null, 2));

    // src/features/auth.js: exports login, logout, unusedAuthHelper
    fs.writeFileSync(path.join(root, 'src', 'features', 'auth.js'), `
export function login(user) { return "token_" + user; }
export function logout() { return true; }
export function unusedAuthHelper() { return "dead"; }
`);

    // src/features/index.js: re-exports auth
    fs.writeFileSync(path.join(root, 'src', 'features', 'index.js'), `
export { login, logout, unusedAuthHelper } from './auth.js';
`);

    // src/index.js: imports login only from barrel
    fs.writeFileSync(path.join(root, 'src', 'index.js'), `
import { login } from './features/index.js';
export function run() {
  return login("alice");
}
`);

    return {
      name: 'Re-Export Heavy Barrel Architecture',
      root,
      expected: {
        deadSymbols: ['unusedAuthHelper@src/features/auth.js', 'logout@src/features/auth.js'],
        liveSymbols: ['login@src/features/auth.js'],
      }
    };
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Fixture 2: Duplicate Symbol Names Across Modules
  // ──────────────────────────────────────────────────────────────────────────
  duplicate_symbols: () => {
    const root = path.join(fixturesRoot, 'duplicate_symbols');
    mkdirp(root);
    mkdirp(path.join(root, 'services'));

    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({
      name: 'fixture-duplicate-symbols',
      main: 'app.js'
    }, null, 2));

    // services/billing.js: exports calculateTax, formatCurrency
    fs.writeFileSync(path.join(root, 'services', 'billing.js'), `
export function calculateTax(amount) { return amount * 0.2; }
export function formatCurrency(amount) { return "$" + amount; }
`);

    // services/analytics.js: exports calculateTax (DEAD!), recordMetric
    fs.writeFileSync(path.join(root, 'services', 'analytics.js'), `
export function calculateTax(amount) { return amount * 0.15; }
export function recordMetric(name) { return name; }
`);

    // app.js: only imports calculateTax from billing.js, NOT analytics.js!
    fs.writeFileSync(path.join(root, 'app.js'), `
import { calculateTax } from './services/billing.js';
import { recordMetric } from './services/analytics.js';

export function start() {
  recordMetric("started");
  return calculateTax(100);
}
`);

    return {
      name: 'Duplicate Symbol Names Across Modules',
      root,
      expected: {
        deadSymbols: ['calculateTax@services/analytics.js', 'formatCurrency@services/billing.js'],
        liveSymbols: ['calculateTax@services/billing.js', 'recordMetric@services/analytics.js'],
      }
    };
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Fixture 3: Shadowed Identifiers & Misleading Comments
  // ──────────────────────────────────────────────────────────────────────────
  shadowed_and_comments: () => {
    const root = path.join(fixturesRoot, 'shadowed_and_comments');
    mkdirp(root);
    mkdirp(path.join(root, 'lib'));

    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({
      name: 'fixture-shadowed-comments',
      main: 'main.js'
    }, null, 2));

    // lib/crypto.js: exports hashPassword, signPayload (both dead!)
    fs.writeFileSync(path.join(root, 'lib', 'crypto.js'), `
export function hashPassword(p) { return "hashed_" + p; }
export function signPayload(data) { return "sig_" + data; }
`);

    // main.js: mentions hashPassword in comments and strings, shadows signPayload in a local function
    fs.writeFileSync(path.join(root, 'main.js'), `
// Note: We used to call hashPassword(p) here before migrating to Argon2.
const legacyDoc = "Never invoke hashPassword without salt";

function internalCrypto() {
  // Local shadowing of signPayload
  const signPayload = (x) => "internal_" + x;
  return signPayload("test");
}

export function exec() {
  return internalCrypto();
}
`);

    return {
      name: 'Shadowed Identifiers & Misleading Comments',
      root,
      expected: {
        deadSymbols: ['hashPassword@lib/crypto.js', 'signPayload@lib/crypto.js'],
        liveSymbols: ['exec@main.js'],
      }
    };
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Fixture 4: Circular Dependency Cycles
  // ──────────────────────────────────────────────────────────────────────────
  circular_deps: () => {
    const root = path.join(fixturesRoot, 'circular_deps');
    mkdirp(root);

    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({
      name: 'fixture-circular-deps',
      main: 'entry.js'
    }, null, 2));

    // moduleA.js imports moduleB.js
    fs.writeFileSync(path.join(root, 'moduleA.js'), `
import { getB } from './moduleB.js';
export function getA() { return "A"; }
export function callB() { return getB(); }
export function deadA() { return "deadA"; }
`);

    // moduleB.js imports moduleA.js
    fs.writeFileSync(path.join(root, 'moduleB.js'), `
import { getA } from './moduleA.js';
export function getB() { return "B"; }
export function callA() { return getA(); }
export function deadB() { return "deadB"; }
`);

    // entry.js imports moduleA.js
    fs.writeFileSync(path.join(root, 'entry.js'), `
import { callB } from './moduleA.js';
export function main() {
  return callB();
}
`);

    return {
      name: 'Circular Dependency Cycles',
      root,
      expected: {
        deadSymbols: ['deadA@moduleA.js', 'deadB@moduleB.js'],
        liveSymbols: ['callB@moduleA.js', 'getB@moduleB.js'],
      }
    };
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Fixture 5: Monorepo Multi-Package Workspace Structure
  // ──────────────────────────────────────────────────────────────────────────
  monorepo_packages: () => {
    const root = path.join(fixturesRoot, 'monorepo_packages');
    mkdirp(root);
    mkdirp(path.join(root, 'packages', 'core'));
    mkdirp(path.join(root, 'packages', 'cli'));

    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({
      name: 'fixture-monorepo',
      workspaces: ['packages/*']
    }, null, 2));

    // packages/core
    fs.writeFileSync(path.join(root, 'packages', 'core', 'package.json'), JSON.stringify({
      name: '@fixture/core',
      main: 'index.js'
    }, null, 2));

    fs.writeFileSync(path.join(root, 'packages', 'core', 'index.js'), `
export function coreUtil() { return "core"; }
export function unusedCoreUtil() { return "dead_core"; }
`);

    // packages/cli
    fs.writeFileSync(path.join(root, 'packages', 'cli', 'package.json'), JSON.stringify({
      name: '@fixture/cli',
      main: 'bin.js'
    }, null, 2));

    fs.writeFileSync(path.join(root, 'packages', 'cli', 'bin.js'), `
import { coreUtil } from '../core/index.js';
export function runCli() {
  return coreUtil();
}
`);

    return {
      name: 'Monorepo Multi-Package Workspace Structure',
      root,
      expected: {
        deadSymbols: ['unusedCoreUtil@packages/core/index.js'],
        liveSymbols: ['coreUtil@packages/core/index.js'],
      }
    };
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Fixture 6: Dynamic Imports & Runtime Property Access
  // ──────────────────────────────────────────────────────────────────────────
  dynamic_behavior: () => {
    const root = path.join(fixturesRoot, 'dynamic_behavior');
    mkdirp(root);
    mkdirp(path.join(root, 'plugins'));

    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({
      name: 'fixture-dynamic',
      main: 'loader.js'
    }, null, 2));

    // plugins/pluginA.js
    fs.writeFileSync(path.join(root, 'plugins', 'pluginA.js'), `
export function initializePlugin() { return "pluginA_ready"; }
export function unreferencedPluginHelper() { return "dead"; }
`);

    // loader.js: dynamically imports pluginA
    fs.writeFileSync(path.join(root, 'loader.js'), `
export async function loadPlugin(name) {
  const mod = await import('./plugins/' + name + '.js');
  return mod.initializePlugin();
}
`);

    return {
      name: 'Dynamic Imports & Runtime Property Access',
      root,
      expected: {
        deadSymbols: ['unreferencedPluginHelper@plugins/pluginA.js'],
        uncertainSymbols: ['initializePlugin@plugins/pluginA.js'],
      }
    };
  }
};

function runCrossRepoEvaluation() {
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  Phase 16B: Cross-Repository Generalization Evaluation');
  console.log('══════════════════════════════════════════════════════════════\n');

  const report = {
    timestamp: new Date().toISOString(),
    fixturesCount: Object.keys(FIXTURES).length,
    fixtures: {},
    summary: {
      totalChecks: 0,
      passedChecks: 0,
      falsePositives: 0,
      falseNegatives: 0,
      passRate: '0%'
    }
  };

  try {
    for (const [key, setup] of Object.entries(FIXTURES)) {
      const fix = setup();
      console.log(`[Testing Fixture] ${fix.name}...`);

      const ci = new CodebaseIntelligence(fix.root);
      const deadResult = ci.deadCode();
      const overviewResult = ci.overview();

      const foundDead = new Set(deadResult.unreferencedExports.map(e => `${e.name}@${e.file}`));
      const fixtureReport = {
        name: fix.name,
        deadExportsFound: deadResult.unreferencedExports.map(e => `${e.name}@${e.file}`),
        checks: []
      };

      // 1. Check expected dead symbols (should be identified as dead)
      for (const expectedDead of fix.expected.deadSymbols || []) {
        report.summary.totalChecks++;
        const isFound = foundDead.has(expectedDead);
        const check = {
          symbol: expectedDead,
          expected: 'DEAD',
          actual: isFound ? 'DEAD' : 'LIVE',
          passed: isFound,
          type: isFound ? 'PASS' : 'FALSE_NEGATIVE'
        };
        fixtureReport.checks.push(check);
        if (isFound) {
          report.summary.passedChecks++;
          console.log(`  ✓ Correctly flagged dead: ${expectedDead}`);
        } else {
          report.summary.falseNegatives++;
          console.log(`  ✗ FALSE NEGATIVE (missed dead symbol): ${expectedDead}`);
        }
      }

      // 2. Check expected live symbols (should NOT be flagged as dead)
      for (const expectedLive of fix.expected.liveSymbols || []) {
        report.summary.totalChecks++;
        const isFalselyDead = foundDead.has(expectedLive);
        const check = {
          symbol: expectedLive,
          expected: 'LIVE',
          actual: isFalselyDead ? 'DEAD' : 'LIVE',
          passed: !isFalselyDead,
          type: !isFalselyDead ? 'PASS' : 'FALSE_POSITIVE'
        };
        fixtureReport.checks.push(check);
        if (!isFalselyDead) {
          report.summary.passedChecks++;
          console.log(`  ✓ Correctly recognized live: ${expectedLive}`);
        } else {
          report.summary.falsePositives++;
          console.log(`  ✗ FALSE POSITIVE (flagged live symbol as dead): ${expectedLive}`);
        }
      }

      report.fixtures[key] = fixtureReport;
      console.log('');
    }

    report.summary.passRate = `${((report.summary.passedChecks / report.summary.totalChecks) * 100).toFixed(1)}%`;

    console.log('══════════════════════════════════════════════════════════════');
    console.log(`Summary: ${report.summary.passedChecks}/${report.summary.totalChecks} checks passed (${report.summary.passRate})`);
    console.log(`  • False Negatives: ${report.summary.falseNegatives}`);
    console.log(`  • False Positives: ${report.summary.falsePositives}`);
    console.log('══════════════════════════════════════════════════════════════\n');

    const outPath = path.join(__dirname, '..', 'test', 'fixtures', 'codebase_intelligence_adversarial', 'phase16_cross_repo_eval_results.json');
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(`Detailed report written to: ${outPath}\n`);

    return report;

  } finally {
    try {
      fs.rmSync(fixturesRoot, { recursive: true, force: true });
    } catch (_e) {}
  }
}

const res = runCrossRepoEvaluation();
process.exit(res.summary.passedChecks === res.summary.totalChecks ? 0 : 1);

