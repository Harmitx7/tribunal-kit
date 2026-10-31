'use strict';

const {
  computeSriHash,
  verifySriHash,
  PackageIntegrityEngine,
} = require('../../src/supply_chain');

const fixtureData = require('../fixtures/supply_chain/supply_chain_dataset_v1.json');

describe('Cryptographic Integrity, Lockfile Poisoning & SLSA Engine', () => {
  test('computeSriHash and verifySriHash validate content accurately', () => {
    const content = Buffer.from('console.log("secure release artifact");');
    const sri = computeSriHash(content, 'sha512');
    expect(sri.startsWith('sha512-')).toBe(true);

    expect(verifySriHash(content, sri)).toBe(true);
    expect(verifySriHash(Buffer.from('tampered content'), sri)).toBe(false);
  });

  test('auditLockfileIntegrity passes on clean valid lockfile', () => {
    const engine = new PackageIntegrityEngine();
    const result = engine.auditLockfileIntegrity(fixtureData.validLockfileJson);

    expect(result.status).toBe('PASS');
    expect(result.findingsCount).toBe(0);
    expect(result.scannedEntries).toBe(4);
  });

  test('auditLockfileIntegrity detects lockfile poisoning and missing checksums', () => {
    const engine = new PackageIntegrityEngine();
    const result = engine.auditLockfileIntegrity(fixtureData.poisonedLockfileJson);

    expect(result.status).toBe('FAIL');
    expect(result.findingsCount).toBeGreaterThanOrEqual(3);

    // Finding 1: Unencrypted HTTP
    const httpFinding = result.findings.find(
      (f) => f.category === 'V5_LOCKFILE_POISONING' && f.title.includes('HTTP')
    );
    expect(httpFinding).toBeDefined();
    expect(httpFinding.severity).toBe('CRITICAL');

    // Finding 2: Unapproved registry
    const registryFinding = result.findings.find(
      (f) => f.category === 'V5_LOCKFILE_POISONING' && f.title.includes('Unapproved registry')
    );
    expect(registryFinding).toBeDefined();

    // Finding 3: Missing integrity
    const missingFinding = result.findings.find(
      (f) => f.category === 'V6_INTEGRITY_CHECKSUM_GAP'
    );
    expect(missingFinding).toBeDefined();
    expect(missingFinding.severity).toBe('HIGH');
  });

  test('verifyProvenanceAttestation verifies valid SLSA attestation', () => {
    const engine = new PackageIntegrityEngine();
    const result = engine.verifyProvenanceAttestation(
      fixtureData.slsaProvenanceFixtures.valid,
      {
        expectedCommit: '781959c000000000000000000000000000000000',
        minSlsaLevel: 3,
      }
    );

    expect(result.status).toBe('PASS');
    expect(result.findingsCount).toBe(0);
    expect(result.slsaLevel).toBe(3);
  });

  test('verifyProvenanceAttestation flags commit mismatch', () => {
    const engine = new PackageIntegrityEngine();
    const result = engine.verifyProvenanceAttestation(
      fixtureData.slsaProvenanceFixtures.commitMismatch,
      {
        expectedCommit: '781959c000000000000000000000000000000000',
      }
    );

    expect(result.status).toBe('FAIL');
    const commitFinding = result.findings.find(
      (f) => f.category === 'V12_ARTIFACT_TAMPERING' && f.title.includes('commit mismatch')
    );
    expect(commitFinding).toBeDefined();
    expect(commitFinding.severity).toBe('CRITICAL');
  });

  test('verifyProvenanceAttestation flags untrusted builder and insufficient SLSA level', () => {
    const engine = new PackageIntegrityEngine();
    const result = engine.verifyProvenanceAttestation(
      fixtureData.slsaProvenanceFixtures.untrustedBuilder,
      { minSlsaLevel: 2 }
    );

    expect(result.status).toBe('FAIL');
    expect(result.findings.some((f) => f.title.includes('Untrusted SLSA builder'))).toBe(true);
    expect(result.findings.some((f) => f.title.includes('Insufficient SLSA level'))).toBe(true);
  });
});

