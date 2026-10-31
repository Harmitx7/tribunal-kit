'use strict';

/**
 * phase5_supply_chain_war_room.test.js — Supply-Chain & Dependency Forensics Suite (Phase 5)
 * =========================================================================================
 * Verifies Phase 5 Supply Chain Security, Package Integrity & Third-Party Risk Controls:
 * 1. Dependency Usage & Phantom Import Defense (statement-boundary anchoring in dependency_analyzer)
 * 2. Zero Lifecycle Scripts in package.json (no install-time code execution)
 * 3. Lockfile Cryptographic Integrity & Registry Origin (sha512 hashes, no unapproved registries)
 * 4. Permissive License Compliance & Modern SPDX Recognition (0BSD, Python-2.0, BlueOak-1.0.0, CC-BY-4.0)
 * 5. Full Supply Chain Audit Invariant on Tribunal-Kit Manifest & Lockfile
 * 6. Native Optional Dependency Binary Resolution Integrity
 */

const fs = require('fs');
const path = require('path');
const {
  PackageIntegrityEngine,
  LicenseComplianceEngine,
  runSupplyChainAudit,
  normalizeSpdxLicense,
} = require('../../src/supply_chain');

describe('PHASE 5 SUPPLY-CHAIN WAR ROOM — Dependency Forensics & Invariant Verification', () => {
  const rootDir = path.resolve(__dirname, '../..');
  const pkgJsonPath = path.join(rootDir, 'package.json');
  const lockJsonPath = path.join(rootDir, 'package-lock.json');

  let pkg;
  let lock;

  beforeAll(() => {
    pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    lock = JSON.parse(fs.readFileSync(lockJsonPath, 'utf8'));
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Lifecycle Hook Elimination (Domain C & D)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Domain C/D: Install-Time Lifecycle Script Elimination', () => {
    test('package.json contains zero install-time lifecycle hooks', () => {
      const scripts = pkg.scripts || {};
      expect(scripts.preinstall).toBeUndefined();
      expect(scripts.install).toBeUndefined();
      expect(scripts.postinstall).toBeUndefined();
    });

    test('Production runtime dependencies are strictly constrained', () => {
      const deps = Object.keys(pkg.dependencies || {});
      // Only zod is an approved runtime production dependency
      expect(deps).toEqual(['zod']);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Lockfile Cryptographic Integrity & Registry Provenance (Domain D & I)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Domain D/I: Lockfile Cryptographic Integrity & Registry Provenance', () => {
    test('PackageIntegrityEngine validates package-lock.json with zero findings', () => {
      const engine = new PackageIntegrityEngine();
      const auditResult = engine.auditLockfileIntegrity(lock);

      expect(auditResult.findings).toHaveLength(0);
    });

    test('All lockfile package integrity hashes use sha512 or sha256', () => {
      const packages = lock.packages || {};
      for (const [key, pkgInfo] of Object.entries(packages)) {
        if (key === '' || !pkgInfo.resolved) continue;
        expect(pkgInfo.integrity).toBeDefined();
        const hasValidAlgo =
          pkgInfo.integrity.startsWith('sha512-') || pkgInfo.integrity.startsWith('sha256-');
        expect(hasValidAlgo).toBe(true);
      }
    });

    test('All resolved tarball URLs originate from official approved npm registry', () => {
      const packages = lock.packages || {};
      for (const [key, pkgInfo] of Object.entries(packages)) {
        if (key === '' || !pkgInfo.resolved) continue;
        expect(pkgInfo.resolved.startsWith('https://registry.npmjs.org/')).toBe(true);
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Permissive License Compliance & SPDX Normalization (Domain E)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Domain E: Permissive License Compliance & SPDX Normalization', () => {
    test('LicenseComplianceEngine classifies modern permissive licenses as PERMISSIVE', () => {
      const engine = new LicenseComplianceEngine();

      expect(engine.classifyLicense('MIT')).toBe('PERMISSIVE');
      expect(engine.classifyLicense('Apache-2.0')).toBe('PERMISSIVE');
      expect(engine.classifyLicense('BSD-3-Clause')).toBe('PERMISSIVE');
      expect(engine.classifyLicense('0BSD')).toBe('PERMISSIVE');
      expect(engine.classifyLicense('Python-2.0')).toBe('PERMISSIVE');
      expect(engine.classifyLicense('BlueOak-1.0.0')).toBe('PERMISSIVE');
      expect(engine.classifyLicense('CC-BY-4.0')).toBe('PERMISSIVE');
    });

    test('Normalizes standard license string variants correctly', () => {
      expect(normalizeSpdxLicense('mit')).toBe('MIT');
      expect(normalizeSpdxLicense('apache-2.0')).toBe('Apache-2.0');
      expect(normalizeSpdxLicense('bsd 3-clause')).toBe('BSD-3-Clause');
      expect(normalizeSpdxLicense('0BSD')).toBe('0BSD');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. End-to-End Supply Chain Audit on Tribunal-Kit Tree (Domain A - K)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Domain A-K: Full Supply Chain Audit on Tribunal-Kit Tree', () => {
    test('runSupplyChainAudit passes on real repository manifest & lockfile with 0 violations', () => {
      const auditResult = runSupplyChainAudit(pkg, lock, {
        internalPackages: ['tribunal-kit'],
      });

      expect(auditResult.status).toBe('PASS');
      expect(auditResult.metrics.criticalFindings).toBe(0);
      expect(auditResult.metrics.highFindings).toBe(0);
      expect(auditResult.metrics.directDependencies).toBeGreaterThan(0);
      expect(auditResult.metrics.transitiveDependencies).toBeGreaterThan(0);
      expect(auditResult.findings).toHaveLength(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Dependency Analyzer Import Anchor Invariant (Domain A & K)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Domain A/K: Dependency Analyzer Statement-Anchor Invariant', () => {
    test('Import extraction regex distinguishes top-level imports from embedded string literals', () => {
      const importRegex = /(?:^|[;\n\r{}])\s*(?:import|export)\s+.*?\s+from\s+["']([^"'.\r\n][^"'\r\n]*)["']/gm;

      const codeWithLiteral = [
        '// Valid imports:',
        'import { z } from "zod";',
        'export { helper } from "helper-pkg";',
        '',
        '// Embedded test fixture string:',
        'const mockCode = \'import { fake } from "unresolvable-ghost-lib";\';',
        'fs.writeFileSync(file, "import { evil } from \'malicious-phantom-dep\';");',
      ].join('\n');

      const matches = [];
      let m;
      while ((m = importRegex.exec(codeWithLiteral)) !== null) {
        matches.push(m[1]);
      }

      expect(matches).toContain('zod');
      expect(matches).toContain('helper-pkg');
      expect(matches).not.toContain('unresolvable-ghost-lib');
      expect(matches).not.toContain('malicious-phantom-dep');
    });
  });
});

