'use strict';

/**
 * license_compliance_engine.js — SPDX Normalization, License Classification & Policy Evaluator
 * ===========================================================================================
 * Domain: Supply Chain Intelligence (supply-chain-intelligence)
 *
 * Responsibilities:
 * 1. Normalize non-standard license strings to canonical SPDX License Identifiers.
 * 2. Classify licenses into Permissive, Weak Copyleft, Strong Copyleft, and Prohibited tiers.
 * 3. Evaluate dual licenses and disjunctive (OR) / conjunctive (AND) expressions.
 * 4. Audit active exceptions with expiration tracking.
 * 5. Generate SupplyChainFindingSchema records for license violations (V8_LICENSE_VIOLATION).
 */

const { LicensePolicySchema, SupplyChainFindingSchema } = require('./component_inventory_schemas');

const CANONICAL_SPDX_ALIASES = {
  'apache 2.0': 'Apache-2.0',
  'apache 2': 'Apache-2.0',
  'apache-2': 'Apache-2.0',
  'apache-2.0': 'Apache-2.0',
  'apache2': 'Apache-2.0',
  'mit': 'MIT',
  'mit license': 'MIT',
  'bsd-3-clause': 'BSD-3-Clause',
  'bsd 3-clause': 'BSD-3-Clause',
  'bsd-3': 'BSD-3-Clause',
  'bsd 3': 'BSD-3-Clause',
  'bsd-2-clause': 'BSD-2-Clause',
  'bsd 2-clause': 'BSD-2-Clause',
  'bsd': 'BSD-2-Clause',
  'isc': 'ISC',
  'cc0-1.0': 'CC0-1.0',
  'cc0': 'CC0-1.0',
  'unlicense': 'Unlicense',
  'mpl-2.0': 'MPL-2.0',
  'mpl 2.0': 'MPL-2.0',
  'epl-2.0': 'EPL-2.0',
  'lgpl-2.1': 'LGPL-2.1-only',
  'lgpl-3.0': 'LGPL-3.0-only',
  'gpl-2.0': 'GPL-2.0-only',
  'gpl-3.0': 'GPL-3.0-only',
  'gplv3': 'GPL-3.0-only',
  'agpl-3.0': 'AGPL-3.0-only',
  'agplv3': 'AGPL-3.0-only',
  'sspl-1.0': 'SSPL-1.0',
  'sspl': 'SSPL-1.0',
};

/**
 * Normalizes a license string or compound expression.
 */
function normalizeSpdxLicense(licenseStr) {
  if (!licenseStr || typeof licenseStr !== 'string') return 'UNKNOWN';
  const trimmed = licenseStr.trim();
  if (trimmed === '' || trimmed.toUpperCase() === 'UNKNOWN' || trimmed.toUpperCase() === 'NOASSERTION') {
    return 'UNKNOWN';
  }

  // Handle simple expression without parentheses
  const lower = trimmed.toLowerCase();
  if (CANONICAL_SPDX_ALIASES[lower]) {
    return CANONICAL_SPDX_ALIASES[lower];
  }

  return trimmed;
}

class LicenseComplianceEngine {
  constructor(policyData = {}) {
    this.policy = LicensePolicySchema.parse({
      policyId: policyData.policyId || 'default-commercial-permissive',
      permissive: policyData.permissive,
      weakCopyleft: policyData.weakCopyleft,
      strongCopyleft: policyData.strongCopyleft,
      prohibited: policyData.prohibited,
      exceptions: policyData.exceptions,
    });
  }

  /**
   * Determine the classification tier of an individual normalized SPDX identifier.
   */
  classifyLicense(spdxId) {
    if (spdxId === 'UNKNOWN') return 'UNKNOWN';
    if (this.policy.prohibited.includes(spdxId)) return 'PROHIBITED';
    if (this.policy.strongCopyleft.includes(spdxId)) return 'STRONG_COPYLEFT';
    if (this.policy.weakCopyleft.includes(spdxId)) return 'WEAK_COPYLEFT';
    if (this.policy.permissive.includes(spdxId)) return 'PERMISSIVE';
    return 'UNCLASSIFIED';
  }

  /**
   * Evaluates compound expressions (e.g. "(MIT OR GPL-3.0)" or "(MIT AND GPL-3.0)").
   */
  evaluateLicenseExpression(expressionStr) {
    const normalized = normalizeSpdxLicense(expressionStr);

    if (normalized.includes(' OR ')) {
      // Disjunctive license: satisfying at least one permissive choice is permitted
      const parts = normalized
        .replace(/[()]/g, '')
        .split(' OR ')
        .map((p) => normalizeSpdxLicense(p.trim()));

      const tiers = parts.map((p) => this.classifyLicense(p));
      if (tiers.includes('PERMISSIVE')) {
        return {
          compliant: true,
          effectiveTier: 'PERMISSIVE',
          details: `Dual-licensed with permissive option available (${parts.join(', ')})`,
        };
      }
      return {
        compliant: false,
        effectiveTier: tiers[0] || 'UNCLASSIFIED',
        details: `Disjunctive license contains no approved permissive option (${parts.join(', ')})`,
      };
    }

    if (normalized.includes(' AND ')) {
      // Conjunctive license: must satisfy all clauses simultaneously
      const parts = normalized
        .replace(/[()]/g, '')
        .split(' AND ')
        .map((p) => normalizeSpdxLicense(p.trim()));

      const tiers = parts.map((p) => this.classifyLicense(p));
      if (tiers.includes('PROHIBITED') || tiers.includes('STRONG_COPYLEFT')) {
        return {
          compliant: false,
          effectiveTier: 'PROHIBITED',
          details: `Conjunctive license imposes copyleft obligations (${parts.join(' AND ')})`,
        };
      }
      const allPermissive = tiers.every((t) => t === 'PERMISSIVE');
      return {
        compliant: allPermissive,
        effectiveTier: allPermissive ? 'PERMISSIVE' : 'UNCLASSIFIED',
        details: `Conjunctive license clauses: ${parts.join(' AND ')}`,
      };
    }

    // Single license
    const tier = this.classifyLicense(normalized);
    const compliant = tier === 'PERMISSIVE';

    return {
      compliant,
      effectiveTier: tier,
      details: `Single license classified as ${tier}`,
    };
  }

  /**
   * Check if a component has an active, non-expired approved exception.
   */
  checkException(packageName, license) {
    const today = new Date().toISOString().slice(0, 10);
    const match = this.policy.exceptions.find((ex) => {
      const pkgMatches = ex.package === '*' || ex.package.toLowerCase() === packageName.toLowerCase();
      const licMatches = ex.license === '*' || ex.license.toLowerCase() === license.toLowerCase();
      return pkgMatches && licMatches;
    });

    if (!match) return { hasException: false };

    const isExpired = match.expiresAt < today;
    return {
      hasException: !isExpired,
      isExpired,
      exception: match,
    };
  }

  /**
   * Audit an array of components against the organizational license policy.
   */
  auditComponents(components) {
    const findings = [];
    let compliantCount = 0;
    let exceptionCount = 0;

    for (const comp of components) {
      const rawLicense = comp.license || 'UNKNOWN';
      const normalized = normalizeSpdxLicense(rawLicense);
      const evalResult = this.evaluateLicenseExpression(normalized);

      // Check exceptions
      const exc = this.checkException(comp.name, normalized);
      if (exc.hasException) {
        exceptionCount++;
        compliantCount++;
        continue; // Permitted via approved exception
      }

      if (!evalResult.compliant) {
        let severity = 'HIGH';
        if (evalResult.effectiveTier === 'PROHIBITED' || evalResult.effectiveTier === 'STRONG_COPYLEFT') {
          severity = 'CRITICAL';
        } else if (evalResult.effectiveTier === 'UNKNOWN') {
          severity = 'MEDIUM';
        }

        findings.push(
          SupplyChainFindingSchema.parse({
            id: `license-violation-${comp.name}-${comp.version}`,
            category: 'V8_LICENSE_VIOLATION',
            severity,
            component: comp.name,
            version: comp.version,
            title: `License violation in ${comp.name}: ${normalized} (${evalResult.effectiveTier})`,
            description: `Package '${comp.name}' uses license '${normalized}' classified as ${evalResult.effectiveTier}, violating the ${this.policy.policyId} policy.`,
            evidence: `license: ${rawLicense}, normalized: ${normalized}, tier: ${evalResult.effectiveTier}`,
            remediation: `Replace ${comp.name} with a permissively licensed alternative or request an approved compliance exception.`,
            verdict: 'FAIL',
          })
        );
      } else {
        compliantCount++;
      }
    }

    return {
      status: findings.length === 0 ? 'PASS' : 'FAIL',
      policyId: this.policy.policyId,
      scannedCount: components.length,
      compliantCount,
      exceptionCount,
      findingsCount: findings.length,
      findings,
    };
  }
}

module.exports = {
  CANONICAL_SPDX_ALIASES,
  normalizeSpdxLicense,
  LicenseComplianceEngine,
};

