'use strict';

const {
  levenshteinDistance,
  MaliciousPackageEngine,
} = require('../../src/supply_chain');

const fixtureData = require('../fixtures/supply_chain/supply_chain_dataset_v1.json');

describe('Malicious Packages, Lifecycle Hooks, Typosquatting & CI Actions', () => {
  test('levenshteinDistance computes edit distance correctly', () => {
    expect(levenshteinDistance('lodash', 'lodash')).toBe(0);
    expect(levenshteinDistance('loadash', 'lodash')).toBe(1);
    expect(levenshteinDistance('crossenv', 'cross-env')).toBe(1);
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
  });

  test('auditLifecycleScripts detects dangerous hooks statically without execution', () => {
    const engine = new MaliciousPackageEngine();

    for (const pkg of fixtureData.maliciousLifecycleComponents) {
      const result = engine.auditLifecycleScripts(pkg);
      if (pkg.name === 'clean-helper') {
        expect(result.status).toBe('PASS');
        expect(result.findingsCount).toBe(0);
      } else {
        expect(result.status).toBe('FAIL');
        expect(result.findingsCount).toBeGreaterThanOrEqual(1);
        expect(result.findings[0].category).toBe('V2_MALICIOUS_PACKAGE_HOOK');
        expect(result.findings[0].severity).toBe('CRITICAL');
      }
    }
  });

  test('checkTyposquatting flags typosquatted package names', () => {
    const engine = new MaliciousPackageEngine();

    for (const { candidate, expectedTarget } of fixtureData.typosquatTestCases) {
      const result = engine.checkTyposquatting(candidate);
      expect(result.isTyposquat).toBe(true);
      expect(result.findings[0].category).toBe('V3_TYPOSQUATTING');
      expect(result.findings[0].title).toContain(expectedTarget);
    }

    // Legitimate package names should not be flagged
    const cleanResult = engine.checkTyposquatting('lodash');
    expect(cleanResult.isTyposquat).toBe(false);
  });

  test('checkDependencyConfusion flags un-scoped private internal packages', () => {
    const engine = new MaliciousPackageEngine();

    // Internal un-scoped package -> vulnerable
    const result1 = engine.checkDependencyConfusion('internal-billing-service', true);
    expect(result1.isVulnerable).toBe(true);
    expect(result1.findings[0].category).toBe('V4_DEPENDENCY_CONFUSION');

    // Internal scoped package -> safe
    const result2 = engine.checkDependencyConfusion('@myorg/internal-billing-service', true);
    expect(result2.isVulnerable).toBe(false);

    // Public package -> not flagged
    const result3 = engine.checkDependencyConfusion('express', false);
    expect(result3.isVulnerable).toBe(false);
  });

  test('auditWorkflowActions flags unpinned mutable action tags in CI workflows', () => {
    const engine = new MaliciousPackageEngine();
    const result = engine.auditWorkflowActions(fixtureData.githubWorkflowSnippet);

    expect(result.status).toBe('FAIL');
    // In snippet: checkout@v4 (unpinned) and cache@v3 (unpinned), while setup-node@b4ffde65... (pinned)
    expect(result.findingsCount).toBe(2);

    const checkoutFinding = result.findings.find((f) => f.component === 'actions/checkout');
    expect(checkoutFinding).toBeDefined();
    expect(checkoutFinding.category).toBe('V11_UNPINNED_CI_ACTION');
    expect(checkoutFinding.version).toBe('v4');

    const cacheFinding = result.findings.find((f) => f.component === 'actions/cache');
    expect(cacheFinding).toBeDefined();
    expect(cacheFinding.version).toBe('v3');
  });
});

