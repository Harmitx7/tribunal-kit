'use strict';

/**
 * src/supply_chain/index.js — Unified Barrel Export & Orchestration Entrypoint
 * ===========================================================================
 * Domain: Supply Chain Intelligence (supply-chain-intelligence)
 *
 * Consolidates all supply chain intelligence schemas, engines, and evaluators
 * into a single unified API for Tribunal-Kit.
 */

const schemas = require('./component_inventory_schemas');
const graphEngine = require('./dependency_graph_engine');
const vulnEngine = require('./vulnerability_intelligence_engine');
const integrityEngine = require('./package_integrity_engine');
const sbomEngine = require('./sbom_engine');
const licenseEngine = require('./license_compliance_engine');
const maliciousEngine = require('./malicious_package_engine');

/**
 * Top-level orchestrator: runs an end-to-end supply chain audit on manifest & lockfile.
 */
function runSupplyChainAudit(packageJson, lockfileJson, options = {}) {
  const timestamp = new Date().toISOString();
  const allFindings = [];

  // 1. Build dependency graph
  const graph = graphEngine.buildNpmDependencyGraph(packageJson, lockfileJson);
  const components = Array.from(graph.nodes.values());
  const graphMetrics = graph.getMetrics();

  // Check graph cycles (V10)
  const cycleInfo = graph.detectCycles();
  if (cycleInfo.hasCycles) {
    for (const cycle of cycleInfo.cycles) {
      allFindings.push(
        schemas.SupplyChainFindingSchema.parse({
          id: `cycle-${cycle.join('->')}`,
          category: 'V10_TRANSITIVE_RISK_EXPLOSION',
          severity: 'MEDIUM',
          component: cycle[0],
          title: `Circular dependency detected in package tree`,
          description: `A circular dependency cycle was identified: ${cycle.join(' -> ')}`,
          evidence: `cycle trace: ${cycle.join(' -> ')}`,
          remediation: `Refactor dependencies to eliminate circular references and stabilize build resolution.`,
          verdict: 'FAIL',
        })
      );
    }
  }

  // 2. Lockfile integrity audit (V5, V6)
  if (lockfileJson) {
    const pkgIntegrity = new integrityEngine.PackageIntegrityEngine(options.integrityOptions);
    const lockfileAudit = pkgIntegrity.auditLockfileIntegrity(lockfileJson);
    allFindings.push(...lockfileAudit.findings);
  }

  // 3. Vulnerability intelligence audit (V1)
  if (options.advisories && options.advisories.length > 0) {
    const vulnIntel = new vulnEngine.VulnerabilityIntelligenceEngine(options.vulnOptions);
    vulnIntel.loadAdvisories(options.advisories);
    const vulnAudit = vulnIntel.auditComponents(components, options.vulnAuditOptions);
    allFindings.push(...vulnAudit.findings);
  }

  // 4. License compliance audit (V8)
  const licEngine = new licenseEngine.LicenseComplianceEngine(options.licensePolicy);
  const licenseAudit = licEngine.auditComponents(components);
  allFindings.push(...licenseAudit.findings);

  // 5. Malicious hooks & Typosquatting audit (V2, V3, V4)
  const malEngine = new maliciousEngine.MaliciousPackageEngine(options.maliciousOptions);
  for (const comp of components) {
    // Audit scripts
    const hookAudit = malEngine.auditLifecycleScripts(comp);
    allFindings.push(...hookAudit.findings);

    // Audit typosquatting
    const typoAudit = malEngine.checkTyposquatting(comp.name);
    allFindings.push(...typoAudit.findings);

    // Audit dependency confusion if internal
    if (options.internalPackages && options.internalPackages.includes(comp.name)) {
      const confusionAudit = malEngine.checkDependencyConfusion(comp.name, true);
      allFindings.push(...confusionAudit.findings);
    }
  }

  // 6. Aggregate audit result
  const criticalFindings = allFindings.filter((f) => f.severity === 'CRITICAL').length;
  const highFindings = allFindings.filter((f) => f.severity === 'HIGH').length;
  const mediumFindings = allFindings.filter((f) => f.severity === 'MEDIUM').length;
  const lowFindings = allFindings.filter((f) => f.severity === 'LOW').length;

  const status = allFindings.length === 0 ? 'PASS' : 'FAIL';
  const summary =
    status === 'PASS'
      ? `Supply chain audit PASSED: ${components.length} components scanned with 0 violations.`
      : `Supply chain audit FAILED: ${allFindings.length} violations found (${criticalFindings} Critical, ${highFindings} High, ${mediumFindings} Medium, ${lowFindings} Low).`;

  return schemas.SupplyChainAuditResultSchema.parse({
    status,
    timestamp,
    summary,
    scannedComponentsCount: components.length,
    findings: allFindings,
    metrics: {
      directDependencies: graphMetrics.directComponents,
      transitiveDependencies: graphMetrics.transitiveComponents,
      maxDepth: graphMetrics.maxDepth,
      criticalFindings,
      highFindings,
      mediumFindings,
      lowFindings,
    },
  });
}

module.exports = {
  // Sub-modules
  ...schemas,
  ...graphEngine,
  ...vulnEngine,
  ...integrityEngine,
  ...sbomEngine,
  ...licenseEngine,
  ...maliciousEngine,
  // High-level orchestrator
  runSupplyChainAudit,
};

