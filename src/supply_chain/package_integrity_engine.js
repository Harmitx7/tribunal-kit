'use strict';

/**
 * package_integrity_engine.js — Cryptographic Integrity, Lockfile Poisoning & SLSA Verifier
 * =========================================================================================
 * Domain: Supply Chain Intelligence (supply-chain-intelligence)
 *
 * Responsibilities:
 * 1. Verify SHA-512 / SHA-256 Subresource Integrity (SRI) hashes against artifact buffers.
 * 2. Detect lockfile poisoning (unauthorized registries, unencrypted HTTP, package name spoofing).
 * 3. Audit integrity checksum gaps (missing hashes in package-lock.json).
 * 4. Verify SLSA v1.0 build provenance and in-toto attestations.
 * 5. Generate deterministic SupplyChainFindingSchema records for integrity violations.
 */

const crypto = require('crypto');
const { ProvenanceSchema, SupplyChainFindingSchema } = require('./component_inventory_schemas');

const DEFAULT_APPROVED_REGISTRIES = [
  'https://registry.npmjs.org/',
  'https://registry.yarnpkg.com/',
  'https://npm.pkg.github.com/',
];

/**
 * Computes SRI base64 hash for a buffer or string.
 */
function computeSriHash(content, algorithm = 'sha512') {
  const hash = crypto.createHash(algorithm).update(content).digest('base64');
  return `${algorithm}-${hash}`;
}

/**
 * Verify if an SRI string matches content.
 */
function verifySriHash(content, sriString) {
  if (!sriString || typeof sriString !== 'string') return false;
  const parts = sriString.split('-');
  if (parts.length < 2) return false;

  const algo = parts[0];
  const expectedBase64 = parts.slice(1).join('-');

  try {
    const actualBase64 = crypto.createHash(algo).update(content).digest('base64');
    return crypto.timingSafeEqual(Buffer.from(actualBase64), Buffer.from(expectedBase64));
  } catch (_err) {
    return false;
  }
}

class PackageIntegrityEngine {
  constructor(options = {}) {
    this.approvedRegistries = options.approvedRegistries || DEFAULT_APPROVED_REGISTRIES;
    this.allowedBuilders = options.allowedBuilders || [
      'https://github.com/actions/runner',
      'https://github.com/Harmitx7/tribunal-kit/.github/workflows/',
    ];
  }

  /**
   * Audit an npm lockfile (v1, v2, v3) for poisoning, unapproved registries, or missing integrity.
   */
  auditLockfileIntegrity(lockfileJson) {
    const findings = [];
    let scannedEntries = 0;

    const checkEntry = (pkgName, resolved, integrity, locationKey) => {
      scannedEntries++;

      // Check 1: Missing integrity checksum (V6: INTEGRITY_CHECKSUM_GAP)
      if (!integrity) {
        findings.push(
          SupplyChainFindingSchema.parse({
            id: `integ-missing-${pkgName}-${scannedEntries}`,
            category: 'V6_INTEGRITY_CHECKSUM_GAP',
            severity: 'HIGH',
            component: pkgName,
            title: `Missing cryptographic integrity hash for ${pkgName}`,
            description: `Lockfile entry at '${locationKey}' contains no integrity checksum (sha512/sha256).`,
            evidence: `location: ${locationKey}, resolved: ${resolved || 'none'}, integrity: null`,
            remediation: `Re-generate the lockfile with 'npm install --package-lock-only' to populate integrity checksums.`,
            verdict: 'FAIL',
          })
        );
      } else if (!integrity.startsWith('sha512-') && !integrity.startsWith('sha256-')) {
        findings.push(
          SupplyChainFindingSchema.parse({
            id: `integ-weak-algo-${pkgName}-${scannedEntries}`,
            category: 'V6_INTEGRITY_CHECKSUM_GAP',
            severity: 'MEDIUM',
            component: pkgName,
            title: `Weak or unapproved integrity algorithm for ${pkgName}`,
            description: `Integrity hash uses legacy algorithm instead of modern sha512 or sha256.`,
            evidence: `integrity: ${integrity}`,
            remediation: `Upgrade lockfile to modern lockfileVersion (v2 or v3) with sha512 checksums.`,
            verdict: 'FAIL',
          })
        );
      }

      // Check 2: Unapproved or unencrypted registry (V5: LOCKFILE_POISONING)
      if (resolved) {
        if (resolved.startsWith('http://')) {
          findings.push(
            SupplyChainFindingSchema.parse({
              id: `poison-http-${pkgName}-${scannedEntries}`,
              category: 'V5_LOCKFILE_POISONING',
              severity: 'CRITICAL',
              component: pkgName,
              title: `Unencrypted HTTP registry URL for ${pkgName}`,
              description: `Resolved URL '${resolved}' uses unencrypted HTTP transport, enabling man-in-the-middle package tampering.`,
              evidence: `resolved: ${resolved}`,
              remediation: `Replace unencrypted HTTP resolved URLs with verified HTTPS registry endpoints.`,
              verdict: 'FAIL',
            })
          );
        } else if (resolved.startsWith('https://')) {
          const matchesApproved = this.approvedRegistries.some((approved) =>
            resolved.startsWith(approved)
          );
          if (!matchesApproved) {
            findings.push(
              SupplyChainFindingSchema.parse({
                id: `poison-unapproved-registry-${pkgName}-${scannedEntries}`,
                category: 'V5_LOCKFILE_POISONING',
                severity: 'HIGH',
                component: pkgName,
                title: `Unapproved registry host for ${pkgName}`,
                description: `Package resolves from an unauthorized registry host '${resolved}', potential lockfile poisoning.`,
                evidence: `resolved: ${resolved}, approved: [${this.approvedRegistries.join(', ')}]`,
                remediation: `Verify and point resolved URLs strictly to approved registry mirrors.`,
                verdict: 'FAIL',
              })
            );
          }
        }
      }
    };

    if (lockfileJson.packages) {
      // v2/v3 lockfile
      for (const [key, meta] of Object.entries(lockfileJson.packages)) {
        if (!key || key === '') continue; // Skip root project
        const name = meta.name || key.split('node_modules/').pop();
        checkEntry(name, meta.resolved, meta.integrity, key);
      }
    } else if (lockfileJson.dependencies) {
      // v1 lockfile
      const recurse = (deps, prefix = '') => {
        for (const [name, meta] of Object.entries(deps)) {
          const loc = prefix ? `${prefix} -> ${name}` : name;
          checkEntry(name, meta.resolved, meta.integrity, loc);
          if (meta.dependencies) {
            recurse(meta.dependencies, loc);
          }
        }
      };
      recurse(lockfileJson.dependencies);
    }

    return {
      status: findings.length === 0 ? 'PASS' : 'FAIL',
      scannedEntries,
      findingsCount: findings.length,
      findings,
    };
  }

  /**
   * Verify an SLSA build provenance record against expected parameters and policies.
   */
  verifyProvenanceAttestation(provenanceData, expectedOptions = {}) {
    const validated = ProvenanceSchema.parse(provenanceData);
    const findings = [];

    // Verify builder ID
    const builderMatches = this.allowedBuilders.some((allowed) =>
      validated.builderId.startsWith(allowed)
    );
    if (!builderMatches) {
      findings.push(
        SupplyChainFindingSchema.parse({
          id: `slsa-untrusted-builder-${validated.commitSha.slice(0, 7)}`,
          category: 'V12_ARTIFACT_TAMPERING',
          severity: 'HIGH',
          component: validated.sourceRepository,
          title: `Untrusted SLSA builder ID: ${validated.builderId}`,
          description: `Build attestation builder '${validated.builderId}' does not match allowed builder identities.`,
          evidence: `builderId: ${validated.builderId}`,
          remediation: `Ensure builds are produced by verified GitHub Actions workflows or trusted build workers.`,
          verdict: 'FAIL',
        })
      );
    }

    // Verify commit SHA match if expectedCommit provided
    if (expectedOptions.expectedCommit) {
      if (validated.commitSha.toLowerCase() !== expectedOptions.expectedCommit.toLowerCase()) {
        findings.push(
          SupplyChainFindingSchema.parse({
            id: `slsa-commit-mismatch-${validated.commitSha.slice(0, 7)}`,
            category: 'V12_ARTIFACT_TAMPERING',
            severity: 'CRITICAL',
            component: validated.sourceRepository,
            title: `SLSA provenance commit mismatch`,
            description: `Attested build commit '${validated.commitSha}' differs from expected source commit '${expectedOptions.expectedCommit}'.`,
            evidence: `attested: ${validated.commitSha}, expected: ${expectedOptions.expectedCommit}`,
            remediation: `Investigate build pipeline tampering; do not release unverified artifact.`,
            verdict: 'FAIL',
          })
        );
      }
    }

    // Verify minimum SLSA level if requested
    const requiredLevel = expectedOptions.minSlsaLevel ?? 1;
    if (validated.slsaLevel < requiredLevel) {
      findings.push(
        SupplyChainFindingSchema.parse({
          id: `slsa-insufficient-level-${validated.commitSha.slice(0, 7)}`,
          category: 'V12_ARTIFACT_TAMPERING',
          severity: 'MEDIUM',
          component: validated.sourceRepository,
          title: `Insufficient SLSA level: Level ${validated.slsaLevel} (Required: Level ${requiredLevel})`,
          description: `Build provenance satisfies SLSA Level ${validated.slsaLevel}, below required Level ${requiredLevel}.`,
          evidence: `slsaLevel: ${validated.slsaLevel}, required: ${requiredLevel}`,
          remediation: `Configure build isolation and hermetic build environments to achieve higher SLSA level.`,
          verdict: 'FAIL',
        })
      );
    }

    return {
      status: findings.length === 0 ? 'PASS' : 'FAIL',
      slsaLevel: validated.slsaLevel,
      findingsCount: findings.length,
      findings,
    };
  }
}

module.exports = {
  computeSriHash,
  verifySriHash,
  PackageIntegrityEngine,
};

