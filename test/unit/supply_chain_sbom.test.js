'use strict';

const { SbomEngine } = require('../../src/supply_chain');

describe('Software Bill of Materials (SBOM) Engine', () => {
  const sampleComponents = [
    {
      id: 'comp-1',
      name: 'lodash',
      version: '4.17.21',
      purl: 'pkg:npm/lodash@4.17.21',
      direct: true,
      depth: 0,
      hashes: { sha512: 'sha512-testHash==' },
      license: 'MIT',
      dependencies: [],
    },
    {
      id: 'comp-2',
      name: 'express',
      version: '4.18.2',
      purl: 'pkg:npm/express@4.18.2',
      direct: true,
      depth: 0,
      hashes: { sha256: 'sha256-hash256==' },
      license: 'MIT',
      dependencies: ['debug'],
    },
    {
      id: 'comp-3',
      name: 'debug',
      version: '2.6.9',
      purl: 'pkg:npm/debug@2.6.9',
      direct: false,
      depth: 1,
      license: 'MIT',
      dependencies: [],
    },
  ];

  test('generateCycloneDx produces valid CycloneDX v1.5 JSON', () => {
    const engine = new SbomEngine();
    const doc = engine.generateCycloneDx(sampleComponents, {
      name: 'my-service',
      version: '1.0.0',
    });

    expect(doc.bomFormat).toBe('CycloneDX');
    expect(doc.specVersion).toBe('1.5');
    expect(doc.components.length).toBe(3);
    expect(doc.components[0].purl).toBe('pkg:npm/lodash@4.17.21');
    expect(doc.dependencies.length).toBe(3);

    const validation = engine.validateSbom(doc);
    expect(validation.status).toBe('PASS');
    expect(validation.format).toBe('CycloneDX');
    expect(validation.findingsCount).toBe(0);
  });

  test('generateSpdx produces valid SPDX v2.3 JSON', () => {
    const engine = new SbomEngine();
    const doc = engine.generateSpdx(sampleComponents, { name: 'my-service' });

    expect(doc.spdxVersion).toBe('SPDX-2.3');
    expect(doc.dataLicense).toBe('CC0-1.0');
    expect(doc.packages.length).toBe(3);
    expect(doc.packages[0].name).toBe('lodash');

    const validation = engine.validateSbom(doc);
    expect(validation.status).toBe('PASS');
    expect(validation.format).toBe('SPDX');
    expect(validation.findingsCount).toBe(0);
  });

  test('validateSbom rejects empty or invalid SBOM format', () => {
    const engine = new SbomEngine();

    const invalidDoc = { invalid: true };
    const result1 = engine.validateSbom(invalidDoc);
    expect(result1.status).toBe('FAIL');
    expect(result1.findings[0].category).toBe('V7_SBOM_INACCURACY');

    const emptyDoc = { bomFormat: 'CycloneDX', specVersion: '1.5', components: [] };
    const result2 = engine.validateSbom(emptyDoc);
    expect(result2.status).toBe('FAIL');
    expect(result2.findings[0].title).toContain('Empty SBOM components');
  });

  test('diffComponents identifies added, removed, and updated packages', () => {
    const engine = new SbomEngine();

    const base = [
      { name: 'lodash', version: '4.17.20', license: 'MIT' },
      { name: 'dep-to-remove', version: '1.0.0', license: 'MIT' },
    ];

    const target = [
      { name: 'lodash', version: '4.17.21', license: 'MIT' }, // updated
      { name: 'new-dep', version: '2.0.0', license: 'Apache-2.0' }, // added
    ];

    const diff = engine.diffComponents(base, target);
    expect(diff.addedCount).toBe(1);
    expect(diff.added[0].name).toBe('new-dep');

    expect(diff.removedCount).toBe(1);
    expect(diff.removed[0].name).toBe('dep-to-remove');

    expect(diff.updatedCount).toBe(1);
    expect(diff.updated[0].name).toBe('lodash');
    expect(diff.updated[0].fromVersion).toBe('4.17.20');
    expect(diff.updated[0].toVersion).toBe('4.17.21');
  });
});

