'use strict';

const {
  ComponentSchema,
  AdvisorySchema,
  ProvenanceSchema,
  SbomSchema,
  LicensePolicySchema,
  SupplyChainFindingSchema,
  SupplyChainAuditResultSchema,
  THREAT_CATEGORIES,
} = require('../../src/supply_chain');

const fixtureData = require('../fixtures/supply_chain/supply_chain_dataset_v1.json');

describe('Supply Chain Intelligence Schemas & Invariant Contracts', () => {
  test('ComponentSchema validates complete component correctly', () => {
    const comp = ComponentSchema.parse({
      id: 'comp-lodash-4.17.21',
      name: 'lodash',
      version: '4.17.21',
      purl: 'pkg:npm/lodash@4.17.21',
      ecosystem: 'npm',
      direct: true,
      depth: 0,
      dependencies: [],
      hashes: { sha512: 'sha512-test==' },
      license: 'MIT',
    });
    expect(comp.name).toBe('lodash');
    expect(comp.ecosystem).toBe('npm');
    expect(comp.depth).toBe(0);
  });

  test('ComponentSchema rejects missing purl or version', () => {
    expect(() => {
      ComponentSchema.parse({
        id: 'comp-1',
        name: 'lodash',
      });
    }).toThrow();
  });

  test('AdvisorySchema validates normalized vulnerability advisory', () => {
    const adv = AdvisorySchema.parse(fixtureData.advisoriesDataset[0]);
    expect(adv.id).toBe('GHSA-lodash-prototype-pollution');
    expect(adv.severity).toBe('CRITICAL');
    expect(adv.cvssScore).toBe(9.8);
    expect(adv.cisaKev).toBe(true);
  });

  test('ProvenanceSchema validates valid SLSA build attestation', () => {
    const prov = ProvenanceSchema.parse(fixtureData.slsaProvenanceFixtures.valid);
    expect(prov.slsaLevel).toBe(3);
    expect(prov.commitSha).toMatch(/^[a-f0-9]{40}$/);
    expect(prov.verified).toBe(true);
  });

  test('ProvenanceSchema rejects malformed commit SHA', () => {
    expect(() => {
      ProvenanceSchema.parse({
        ...fixtureData.slsaProvenanceFixtures.valid,
        commitSha: 'not-a-40-char-sha',
      });
    }).toThrow(/Commit SHA must be a 40-character hex string/);
  });

  test('LicensePolicySchema parses policies and exceptions', () => {
    const policy = LicensePolicySchema.parse(fixtureData.licensePolicyDataset);
    expect(policy.policyId).toBe('strict-enterprise-policy');
    expect(policy.prohibited).toContain('AGPL-3.0-only');
    expect(policy.exceptions.length).toBe(2);
  });

  test('SupplyChainFindingSchema enforces all 12 threat categories', () => {
    expect(THREAT_CATEGORIES.length).toBe(12);

    for (const cat of THREAT_CATEGORIES) {
      const finding = SupplyChainFindingSchema.parse({
        id: `finding-${cat}`,
        category: cat,
        severity: 'HIGH',
        component: 'target-pkg',
        title: `Test finding for ${cat}`,
        description: 'Detailed description',
        evidence: 'Cryptographic evidence',
        remediation: 'Remediation steps',
        verdict: 'FAIL',
      });
      expect(finding.category).toBe(cat);
    }
  });

  test('SupplyChainAuditResultSchema validates aggregated audit output', () => {
    const auditResult = SupplyChainAuditResultSchema.parse({
      status: 'PASS',
      timestamp: new Date().toISOString(),
      summary: 'All checks passed',
      scannedComponentsCount: 42,
      findings: [],
      metrics: {
        directDependencies: 10,
        transitiveDependencies: 32,
        maxDepth: 3,
      },
    });
    expect(auditResult.status).toBe('PASS');
    expect(auditResult.scannedComponentsCount).toBe(42);
  });
});

