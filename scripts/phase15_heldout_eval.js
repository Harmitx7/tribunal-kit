#!/usr/bin/env node
/**
 * Phase 15 — Held-Out Evaluation Runner
 * Runs the held-out dataset against resolveRoute and measures:
 *   1. Routing accuracy (operation match)
 *   2. Skill accuracy (primarySkill match)
 *   3. Target extraction accuracy
 *   4. Uncertainty calibration
 *   5. Security detection accuracy
 *   6. Ambiguity detection accuracy
 */
'use strict';

const path = require('path');
const { CodebaseIntelligence } = require('../.agent/scripts/codebase_intelligence');

const dataset = require('../test/fixtures/codebase_intelligence_adversarial/phase15_heldout_eval_dataset.json');

function evaluate() {
  const results = {
    total: 0,
    operationCorrect: 0,
    skillCorrect: 0,
    targetCorrect: 0,
    uncertaintyCorrect: 0,
    securityCorrect: 0,
    ambiguityCorrect: 0,
    contradictionCorrect: 0,
    outOfScopeCorrect: 0,
    failures: [],
    details: [],
  };

  for (const tc of dataset.cases) {
    results.total++;
    const route = CodebaseIntelligence.resolveRoute(tc.request);
    const detail = {
      id: tc.id,
      category: tc.category,
      request: tc.request.slice(0, 80),
      expected: {
        operation: tc.expectedOperation,
        skill: tc.expectedPrimarySkill,
        target: tc.expectedTarget,
        uncertainty: tc.expectedUncertainty,
      },
      actual: {
        operation: route.operation,
        skill: route.primarySkill,
        target: route.target || null,
        uncertainty: route.expectedUncertainty,
        confidence: route.confidence,
        isAmbiguous: route.isAmbiguous,
        isUntrusted: route.isUntrusted,
        isOutOfScope: route.isOutOfScope,
        hasContradiction: route.hasContradiction,
      },
      pass: {},
    };

    // 1. Operation match
    const opMatch = route.operation === tc.expectedOperation;
    detail.pass.operation = opMatch;
    if (opMatch) results.operationCorrect++;

    // 2. Skill match
    const skillMatch = route.primarySkill === tc.expectedPrimarySkill;
    detail.pass.skill = skillMatch;
    if (skillMatch) results.skillCorrect++;

    // 3. Target extraction
    let targetMatch = false;
    if (tc.expectedTarget === null || tc.expectedTarget === undefined) {
      targetMatch = !route.target || route.target === undefined;
    } else {
      // Flexible: actual target contains expected or vice versa
      const actualLower = (route.target || '').toLowerCase();
      const expectedLower = tc.expectedTarget.toLowerCase();
      targetMatch = actualLower.includes(expectedLower) ||
                    expectedLower.includes(actualLower) ||
                    actualLower === expectedLower;
    }
    detail.pass.target = targetMatch;
    if (targetMatch) results.targetCorrect++;

    // 4. Uncertainty calibration
    const uncMatch = route.expectedUncertainty === tc.expectedUncertainty;
    detail.pass.uncertainty = uncMatch;
    if (uncMatch) results.uncertaintyCorrect++;

    // 5. Security detection (for security category)
    if (tc.category === 'security') {
      const secOk = route.isUntrusted === true;
      detail.pass.security = secOk;
      if (secOk) results.securityCorrect++;
    }

    // 6. Ambiguity detection
    if (tc.category === 'ambiguous') {
      const ambOk = route.isAmbiguous === true;
      detail.pass.ambiguity = ambOk;
      if (ambOk) results.ambiguityCorrect++;
    }

    // 7. Contradiction detection
    if (tc.category === 'contradiction') {
      const conOk = route.hasContradiction === true;
      detail.pass.contradiction = conOk;
      if (conOk) results.contradictionCorrect++;
    }

    // 8. Out-of-scope detection
    if (tc.category === 'out-of-scope') {
      const oosOk = route.isOutOfScope === true;
      detail.pass.outOfScope = oosOk;
      if (oosOk) results.outOfScopeCorrect++;
    }

    const allPass = Object.values(detail.pass).every(v => v);
    detail.overallPass = allPass;
    if (!allPass) {
      results.failures.push(detail);
    }

    results.details.push(detail);
  }

  // Summary metrics
  const securityCases = dataset.cases.filter(c => c.category === 'security').length;
  const ambiguousCases = dataset.cases.filter(c => c.category === 'ambiguous').length;
  const contradictionCases = dataset.cases.filter(c => c.category === 'contradiction').length;
  const outOfScopeCases = dataset.cases.filter(c => c.category === 'out-of-scope').length;

  results.metrics = {
    operationAccuracy: `${results.operationCorrect}/${results.total} (${(results.operationCorrect/results.total*100).toFixed(1)}%)`,
    skillAccuracy: `${results.skillCorrect}/${results.total} (${(results.skillCorrect/results.total*100).toFixed(1)}%)`,
    targetAccuracy: `${results.targetCorrect}/${results.total} (${(results.targetCorrect/results.total*100).toFixed(1)}%)`,
    uncertaintyAccuracy: `${results.uncertaintyCorrect}/${results.total} (${(results.uncertaintyCorrect/results.total*100).toFixed(1)}%)`,
    securityDetection: securityCases > 0 ? `${results.securityCorrect}/${securityCases} (${(results.securityCorrect/securityCases*100).toFixed(1)}%)` : 'N/A',
    ambiguityDetection: ambiguousCases > 0 ? `${results.ambiguityCorrect}/${ambiguousCases} (${(results.ambiguityCorrect/ambiguousCases*100).toFixed(1)}%)` : 'N/A',
    contradictionDetection: contradictionCases > 0 ? `${results.contradictionCorrect}/${contradictionCases} (${(results.contradictionCorrect/contradictionCases*100).toFixed(1)}%)` : 'N/A',
    outOfScopeDetection: outOfScopeCases > 0 ? `${results.outOfScopeCorrect}/${outOfScopeCases} (${(results.outOfScopeCorrect/outOfScopeCases*100).toFixed(1)}%)` : 'N/A',
    overallPassRate: `${results.total - results.failures.length}/${results.total} (${((results.total - results.failures.length)/results.total*100).toFixed(1)}%)`,
  };

  return results;
}

// Run
const results = evaluate();

console.log('\n══════════════════════════════════════════════════════════════');
console.log('  Phase 15 Held-Out Evaluation Results');
console.log('══════════════════════════════════════════════════════════════\n');
console.log('Metrics:');
Object.entries(results.metrics).forEach(([k, v]) => {
  console.log(`  ${k.padEnd(25)} ${v}`);
});

if (results.failures.length > 0) {
  console.log(`\nFailures (${results.failures.length}):`);
  results.failures.forEach(f => {
    const failedChecks = Object.entries(f.pass).filter(([_, v]) => !v).map(([k]) => k);
    console.log(`  ${f.id} [${f.category}]: failed {${failedChecks.join(', ')}}`);
    console.log(`    Expected op=${f.expected.operation} skill=${f.expected.skill} target=${JSON.stringify(f.expected.target)} unc=${f.expected.uncertainty}`);
    console.log(`    Actual   op=${f.actual.operation} skill=${f.actual.skill} target=${JSON.stringify(f.actual.target)} unc=${f.actual.uncertainty}`);
  });
}

console.log('\n══════════════════════════════════════════════════════════════\n');

// Output machine-readable JSON
const outputPath = path.join(__dirname, '..', 'test', 'fixtures', 'codebase_intelligence_adversarial', 'phase15_heldout_eval_results.json');
require('fs').writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log(`Results written to: ${outputPath}`);

// Exit with code based on pass rate
const passRate = (results.total - results.failures.length) / results.total;
process.exit(passRate >= 0.7 ? 0 : 1);

