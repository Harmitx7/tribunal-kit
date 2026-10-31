'use strict';

/**
 * sbom_engine.js — Software Bill of Materials (SBOM) Generation, Validation & Diffing
 * ===================================================================================
 * Domain: Supply Chain Intelligence (supply-chain-intelligence)
 *
 * Responsibilities:
 * 1. Generate CycloneDX v1.5 JSON formatted SBOMs from DependencyGraph / components.
 * 2. Generate SPDX v2.3 JSON formatted SBOMs with standard package definitions.
 * 3. Validate SBOM completeness, PURL conformity, and schema integrity (V7_SBOM_INACCURACY).
 * 4. Compute deterministic SBOM diffs between baseline and candidate releases.
 */

const crypto = require('crypto');
const { SupplyChainFindingSchema } = require('./component_inventory_schemas');

class SbomEngine {
  constructor(options = {}) {
    this.toolName = options.toolName || 'tribunal-kit-sbom-engine';
    this.toolVersion = options.toolVersion || '9.3.0';
  }

  /**
   * Generate CycloneDX v1.5 JSON document from an array of components.
   */
  generateCycloneDx(components, rootMetadata = {}) {
    const timestamp = new Date().toISOString();
    const serialNumber = `urn:uuid:${crypto.randomUUID()}`;

    const cycloneComponents = components.map((c) => {
      const hashes = [];
      if (c.hashes) {
        if (c.hashes.sha512) {
          hashes.push({ alg: 'SHA-512', content: c.hashes.sha512.replace(/^sha512-/, '') });
        }
        if (c.hashes.sha256) {
          hashes.push({ alg: 'SHA-256', content: c.hashes.sha256.replace(/^sha256-/, '') });
        }
      }

      return {
        type: 'library',
        'bom-ref': c.purl,
        name: c.name,
        version: c.version,
        purl: c.purl,
        scope: c.direct ? 'required' : 'optional',
        hashes: hashes.length > 0 ? hashes : undefined,
        licenses: c.license && c.license !== 'UNKNOWN' ? [{ license: { id: c.license } }] : [],
        properties: [
          { name: 'depth', value: String(c.depth ?? 0) },
          { name: 'direct', value: String(Boolean(c.direct)) },
        ],
      };
    });

    const doc = {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      serialNumber,
      version: 1,
      metadata: {
        timestamp,
        tools: [{ vendor: 'Tribunal-Kit', name: this.toolName, version: this.toolVersion }],
        component: rootMetadata.name
          ? {
              type: 'application',
              name: rootMetadata.name,
              version: rootMetadata.version || '1.0.0',
            }
          : undefined,
      },
      components: cycloneComponents,
      dependencies: components.map((c) => ({
        ref: c.purl,
        dependsOn: (c.dependencies || []).map((depName) => {
          const match = components.find((candidate) => candidate.name === depName);
          return match ? match.purl : depName;
        }),
      })),
    };

    return doc;
  }

  /**
   * Generate SPDX v2.3 JSON document from an array of components.
   */
  generateSpdx(components, rootMetadata = {}) {
    const timestamp = new Date().toISOString();
    const documentNamespace = `https://spdx.org/spdxdocs/tribunal-kit-${crypto.randomUUID()}`;

    const packages = components.map((c) => {
      const spdxId = `SPDXRef-Package-${c.name.replace(/[^a-zA-Z0-9.-]/g, '-')}-${c.version.replace(/[^a-zA-Z0-9.-]/g, '-')}`;
      const checksums = [];
      if (c.hashes && c.hashes.sha256) {
        checksums.push({
          algorithm: 'SHA256',
          checksumValue: c.hashes.sha256.replace(/^sha256-/, ''),
        });
      }

      return {
        SPDXID: spdxId,
        name: c.name,
        versionInfo: c.version,
        downloadLocation: c.resolved || 'NOASSERTION',
        filesAnalyzed: false,
        licenseConcluded: c.license || 'NOASSERTION',
        licenseDeclared: c.license || 'NOASSERTION',
        copyrightText: 'NOASSERTION',
        externalRefs: [
          {
            referenceCategory: 'PACKAGE-MANAGER',
            referenceType: 'purl',
            referenceLocator: c.purl,
          },
        ],
        checksums: checksums.length > 0 ? checksums : undefined,
      };
    });

    const doc = {
      spdxVersion: 'SPDX-2.3',
      dataLicense: 'CC0-1.0',
      SPDXID: 'SPDXRef-DOCUMENT',
      name: rootMetadata.name || 'tribunal-kit-sbom',
      documentNamespace,
      creationInfo: {
        created: timestamp,
        creators: [`Tool: ${this.toolName}-${this.toolVersion}`],
      },
      packages,
    };

    return doc;
  }

  /**
   * Validate an SBOM document for structure and completeness.
   */
  validateSbom(sbomData) {
    const findings = [];

    // Check basic schema
    let format = 'UNKNOWN';
    if (sbomData.bomFormat === 'CycloneDX') format = 'CycloneDX';
    else if (sbomData.spdxVersion && sbomData.spdxVersion.startsWith('SPDX')) format = 'SPDX';

    if (format === 'UNKNOWN') {
      findings.push(
        SupplyChainFindingSchema.parse({
          id: `sbom-format-unrecognized`,
          category: 'V7_SBOM_INACCURACY',
          severity: 'HIGH',
          component: 'SBOM Document',
          title: 'Unrecognized SBOM format',
          description: 'SBOM document is neither standard CycloneDX nor SPDX JSON.',
          evidence: `keys: [${Object.keys(sbomData).slice(0, 5).join(', ')}]`,
          remediation: 'Export SBOM using standard CycloneDX v1.5 or SPDX v2.3 JSON specification.',
          verdict: 'FAIL',
        })
      );
      return { status: 'FAIL', format, findingsCount: findings.length, findings };
    }

    const items = format === 'CycloneDX' ? sbomData.components || [] : sbomData.packages || [];
    if (items.length === 0) {
      findings.push(
        SupplyChainFindingSchema.parse({
          id: `sbom-empty-components`,
          category: 'V7_SBOM_INACCURACY',
          severity: 'CRITICAL',
          component: 'SBOM Document',
          title: 'Empty SBOM components list',
          description: 'The SBOM document contains zero components or packages.',
          evidence: `items count: 0`,
          remediation: 'Ensure package manager inventory generation includes direct and transitive dependencies.',
          verdict: 'FAIL',
        })
      );
    }

    let missingPurlCount = 0;
    let missingLicenseCount = 0;

    for (const item of items) {
      const name = item.name || 'unknown';
      let hasPurl = false;
      let hasLicense = false;

      if (format === 'CycloneDX') {
        hasPurl = Boolean(item.purl);
        hasLicense = Boolean(item.licenses && item.licenses.length > 0);
      } else {
        hasPurl = Boolean(
          item.externalRefs && item.externalRefs.some((r) => r.referenceType === 'purl')
        );
        hasLicense = Boolean(
          item.licenseConcluded && item.licenseConcluded !== 'NOASSERTION'
        );
      }

      if (!hasPurl) {
        missingPurlCount++;
        findings.push(
          SupplyChainFindingSchema.parse({
            id: `sbom-missing-purl-${name}`,
            category: 'V7_SBOM_INACCURACY',
            severity: 'MEDIUM',
            component: name,
            title: `Missing PURL identifier for component ${name}`,
            description: `Component lacks standard Package URL (PURL) required for automated vulnerability mapping.`,
            evidence: `component: ${name}`,
            remediation: 'Include canonical PURL according to the Package URL specification.',
            verdict: 'FAIL',
          })
        );
      }

      if (!hasLicense) {
        missingLicenseCount++;
      }
    }

    return {
      status: findings.length === 0 ? 'PASS' : 'FAIL',
      format,
      totalComponents: items.length,
      missingPurlCount,
      missingLicenseCount,
      findingsCount: findings.length,
      findings,
    };
  }

  /**
   * Diff two lists of components or SBOM inventories to detect additions, removals, and updates.
   */
  diffComponents(baseComponents, targetComponents) {
    const baseMap = new Map();
    for (const c of baseComponents) {
      baseMap.set(c.name, c);
    }

    const targetMap = new Map();
    for (const c of targetComponents) {
      targetMap.set(c.name, c);
    }

    const added = [];
    const removed = [];
    const updated = [];
    const unchanged = [];

    for (const [name, targetComp] of targetMap.entries()) {
      if (!baseMap.has(name)) {
        added.push(targetComp);
      } else {
        const baseComp = baseMap.get(name);
        if (baseComp.version !== targetComp.version) {
          updated.push({
            name,
            fromVersion: baseComp.version,
            toVersion: targetComp.version,
            fromLicense: baseComp.license,
            toLicense: targetComp.license,
            component: targetComp,
          });
        } else {
          unchanged.push(targetComp);
        }
      }
    }

    for (const [name, baseComp] of baseMap.entries()) {
      if (!targetMap.has(name)) {
        removed.push(baseComp);
      }
    }

    return {
      addedCount: added.length,
      removedCount: removed.length,
      updatedCount: updated.length,
      unchangedCount: unchanged.length,
      added,
      removed,
      updated,
    };
  }
}

module.exports = {
  SbomEngine,
};

