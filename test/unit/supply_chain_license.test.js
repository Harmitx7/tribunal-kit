'use strict';

const {
  normalizeSpdxLicense,
  LicenseComplianceEngine,
} = require('../../src/supply_chain');

const fixtureData = require('../fixtures/supply_chain/supply_chain_dataset_v1.json');

describe('License Compliance & Policy Auditor Engine', () => {
  test('normalizeSpdxLicense normalizes aliases to canonical SPDX identifiers', () => {
    expect(normalizeSpdxLicense('apache 2.0')).toBe('Apache-2.0');
    expect(normalizeSpdxLicense('mit')).toBe('MIT');
    expect(normalizeSpdxLicense('mit license')).toBe('MIT');
    expect(normalizeSpdxLicense('agplv3')).toBe('AGPL-3.0-only');
    expect(normalizeSpdxLicense('bsd 3-clause')).toBe('BSD-3-Clause');
    expect(normalizeSpdxLicense('')).toBe('UNKNOWN');
    expect(normalizeSpdxLicense('NOASSERTION')).toBe('UNKNOWN');
  });

  test('classifyLicense categorizes licenses into policy tiers', () => {
    const engine = new LicenseComplianceEngine(fixtureData.licensePolicyDataset);

    expect(engine.classifyLicense('MIT')).toBe('PERMISSIVE');
    expect(engine.classifyLicense('Apache-2.0')).toBe('PERMISSIVE');
    expect(engine.classifyLicense('LGPL-3.0-only')).toBe('WEAK_COPYLEFT');
    expect(engine.classifyLicense('AGPL-3.0-only')).toBe('PROHIBITED');
    expect(engine.classifyLicense('Custom-License')).toBe('UNCLASSIFIED');
  });

  test('evaluateLicenseExpression handles dual-licensing (OR / AND)', () => {
    const engine = new LicenseComplianceEngine(fixtureData.licensePolicyDataset);

    // Permissive option in OR clause -> compliant
    const orResult = engine.evaluateLicenseExpression('(MIT OR AGPL-3.0-only)');
    expect(orResult.compliant).toBe(true);
    expect(orResult.effectiveTier).toBe('PERMISSIVE');

    // Copyleft in AND clause -> non-compliant
    const andResult = engine.evaluateLicenseExpression('(MIT AND AGPL-3.0-only)');
    expect(andResult.compliant).toBe(false);
    expect(andResult.effectiveTier).toBe('PROHIBITED');
  });

  test('checkException handles active vs expired exceptions', () => {
    const engine = new LicenseComplianceEngine(fixtureData.licensePolicyDataset);

    // Active exception
    const activeExc = engine.checkException('approved-agpl-tool', 'AGPL-3.0-only');
    expect(activeExc.hasException).toBe(true);
    expect(activeExc.isExpired).toBe(false);

    // Expired exception
    const expiredExc = engine.checkException('expired-exception-lib', 'AGPL-3.0-only');
    expect(expiredExc.hasException).toBe(false);
    expect(expiredExc.isExpired).toBe(true);
  });

  test('auditComponents generates findings for prohibited licenses and expired exceptions', () => {
    const engine = new LicenseComplianceEngine(fixtureData.licensePolicyDataset);

    const components = [
      { name: 'lodash', version: '4.17.21', license: 'MIT' },
      { name: 'approved-agpl-tool', version: '1.0.0', license: 'AGPL-3.0-only' }, // Exception active
      { name: 'bad-copyleft', version: '2.0.0', license: 'AGPL-3.0-only' }, // Violation
      { name: 'expired-exception-lib', version: '1.0.0', license: 'AGPL-3.0-only' }, // Violation (expired)
    ];

    const result = engine.auditComponents(components);
    expect(result.status).toBe('FAIL');
    expect(result.compliantCount).toBe(2); // lodash and approved-agpl-tool
    expect(result.exceptionCount).toBe(1);
    expect(result.findingsCount).toBe(2); // bad-copyleft and expired-exception-lib

    const badCopyleftFinding = result.findings.find((f) => f.component === 'bad-copyleft');
    expect(badCopyleftFinding.category).toBe('V8_LICENSE_VIOLATION');
    expect(badCopyleftFinding.severity).toBe('CRITICAL');
  });
});

