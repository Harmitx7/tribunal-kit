'use strict';

/**
 * component_inventory_schemas.js — Canonical Contracts for Supply Chain Intelligence
 * =================================================================================
 * Domain: Supply Chain Intelligence (supply-chain-intelligence)
 *
 * Implements strict Zod contracts and taxonomies for:
 * 1. Component Identification & Inventory (ComponentSchema)
 * 2. Vulnerability Advisories & Security Intelligence (AdvisorySchema)
 * 3. Provenance & SLSA Attestations (ProvenanceSchema)
 * 4. Software Bill of Materials Contracts (SbomSchema)
 * 5. License Policy & Exception Management (LicensePolicySchema)
 * 6. Standardized Supply Chain Finding Taxonomy (SupplyChainFindingSchema)
 * 7. Comprehensive Audit Result Aggregator (SupplyChainAuditResultSchema)
 */

const { z } = require('zod');

const SUPPORTED_SCHEMA_VERSIONS = ['1.0.0'];

const SUPPLY_CHAIN_VERDICTS = [
  'PASS',
  'FAIL',
  'INCONCLUSIVE',
  'BLOCKED',
  'NOT_RUN',
  'NOT_APPLICABLE',
];

const SUPPORTED_ECOSYSTEMS = [
  'npm',
  'cargo',
  'pypi',
  'github-actions',
  'maven',
  'golang',
];

const THREAT_CATEGORIES = [
  'V1_KNOWN_CVE',
  'V2_MALICIOUS_PACKAGE_HOOK',
  'V3_TYPOSQUATTING',
  'V4_DEPENDENCY_CONFUSION',
  'V5_LOCKFILE_POISONING',
  'V6_INTEGRITY_CHECKSUM_GAP',
  'V7_SBOM_INACCURACY',
  'V8_LICENSE_VIOLATION',
  'V9_ABANDONED_DEPENDENCY',
  'V10_TRANSITIVE_RISK_EXPLOSION',
  'V11_UNPINNED_CI_ACTION',
  'V12_ARTIFACT_TAMPERING',
];

const SEVERITY_LEVELS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

/**
 * ComponentSchema — Canonical representation of an individual software package/component.
 */
const ComponentSchema = z.object({
  id: z.string().min(1, 'Component id is required.'),
  name: z.string().min(1, 'Package name is required.'),
  version: z.string().min(1, 'Package version is required.'),
  purl: z.string().min(1, 'Package URL (PURL) is required.'),
  ecosystem: z.enum(SUPPORTED_ECOSYSTEMS).default('npm'),
  direct: z.boolean().default(false),
  depth: z.number().int().nonnegative().default(0),
  dependencies: z.array(z.string()).default([]),
  hashes: z.record(z.string(), z.string()).default({}),
  license: z.string().default('UNKNOWN'),
  repository: z.string().optional(),
  lifecycleScripts: z.record(z.string(), z.string()).default({}),
  resolved: z.string().optional(),
  scope: z.string().optional(),
  isDeprecated: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).default({}),
}).strict();

/**
 * AdvisorySchema — Normalized security advisory from OSV, GHSA, or NVD.
 */
const AdvisorySchema = z.object({
  id: z.string().min(1, 'Advisory id is required (e.g. CVE or GHSA).'),
  schemaVersion: z.enum(SUPPORTED_SCHEMA_VERSIONS).default('1.0.0'),
  summary: z.string().min(1, 'Advisory summary is required.'),
  details: z.string().optional(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']).default('MEDIUM'),
  cvssScore: z.number().min(0).max(10).optional(),
  epssScore: z.number().min(0).max(1).optional(),
  cisaKev: z.boolean().default(false),
  affectedPackage: z.string().min(1, 'Affected package name is required.'),
  ecosystem: z.enum(SUPPORTED_ECOSYSTEMS).default('npm'),
  affectedRange: z.string().min(1, 'Semver affected range is required.'),
  fixedVersion: z.string().optional(),
  publishedAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  source: z.string().default('OSV'),
  references: z.array(z.string()).default([]),
}).strict();

/**
 * ProvenanceSchema — SLSA v1.0 and in-toto build provenance attestation contract.
 */
const ProvenanceSchema = z.object({
  builderId: z.string().min(1, 'Builder ID is required.'),
  buildType: z.string().min(1, 'Build type is required.'),
  sourceRepository: z.string().min(1, 'Source repository URL is required.'),
  commitSha: z.string().regex(/^[a-f0-9]{40}$/i, 'Commit SHA must be a 40-character hex string.'),
  buildTimestamp: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  slsaLevel: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).default(1),
  materials: z.array(
    z.object({
      uri: z.string().min(1),
      digest: z.record(z.string(), z.string()),
    })
  ).default([]),
  attestationSignature: z.string().optional(),
  verified: z.boolean().default(false),
}).strict();

/**
 * SbomSchema — Software Bill of Materials contract covering CycloneDX and SPDX.
 */
const SbomSchema = z.object({
  bomFormat: z.enum(['CycloneDX', 'SPDX']),
  specVersion: z.string().min(1, 'Specification version is required.'),
  serialNumber: z.string().optional(),
  timestamp: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  components: z.array(ComponentSchema).min(1, 'At least one component must be documented.'),
  metadata: z.object({
    component: z.object({
      name: z.string().min(1),
      version: z.string().min(1),
    }).optional(),
    tools: z.array(z.string()).default([]),
    timestamp: z.string().optional(),
  }).default({}),
}).strict();

/**
 * LicensePolicySchema — Policy rules for license compliance and approved exceptions.
 */
const LicensePolicySchema = z.object({
  policyId: z.string().min(1, 'policyId is required.'),
  permissive: z.array(z.string()).default([
    'MIT',
    'Apache-2.0',
    'BSD-2-Clause',
    'BSD-3-Clause',
    'ISC',
    'CC0-1.0',
    'Unlicense',
    '0BSD',
    'Python-2.0',
    'BlueOak-1.0.0',
    'CC-BY-4.0',
  ]),
  weakCopyleft: z.array(z.string()).default([
    'LGPL-2.1-only',
    'LGPL-2.1-or-later',
    'LGPL-3.0-only',
    'LGPL-3.0-or-later',
    'MPL-2.0',
    'EPL-2.0',
  ]),
  strongCopyleft: z.array(z.string()).default([
    'GPL-2.0-only',
    'GPL-2.0-or-later',
    'GPL-3.0-only',
    'GPL-3.0-or-later',
    'AGPL-3.0-only',
    'AGPL-3.0-or-later',
    'SSPL-1.0',
  ]),
  prohibited: z.array(z.string()).default([
    'AGPL-3.0-only',
    'AGPL-3.0-or-later',
    'SSPL-1.0',
    'Commons-Clause',
  ]),
  exceptions: z.array(
    z.object({
      package: z.string().min(1),
      license: z.string().min(1),
      reason: z.string().min(1),
      approvedBy: z.string().min(1),
      expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
    })
  ).default([]),
}).strict();

/**
 * SupplyChainFindingSchema — Standardized finding record across all 12 threat categories.
 */
const SupplyChainFindingSchema = z.object({
  id: z.string().min(1, 'Finding id is required.'),
  category: z.enum(THREAT_CATEGORIES),
  severity: z.enum(SEVERITY_LEVELS),
  component: z.string().min(1, 'Component name or identifier is required.'),
  version: z.string().optional(),
  title: z.string().min(1, 'Finding title is required.'),
  description: z.string().min(1, 'Detailed description is required.'),
  evidence: z.string().min(1, 'Verifiable cryptographic or structural evidence is required.'),
  remediation: z.string().min(1, 'Actionable remediation guidance is required.'),
  verdict: z.enum(SUPPLY_CHAIN_VERDICTS).default('FAIL'),
}).strict();

/**
 * SupplyChainAuditResultSchema — Aggregated output for supply chain audits.
 */
const SupplyChainAuditResultSchema = z.object({
  status: z.enum(['PASS', 'FAIL', 'BLOCKED', 'INCONCLUSIVE']),
  timestamp: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  summary: z.string().min(1, 'Audit summary is required.'),
  scannedComponentsCount: z.number().int().nonnegative(),
  findings: z.array(SupplyChainFindingSchema).default([]),
  metrics: z.object({
    directDependencies: z.number().int().nonnegative().optional(),
    transitiveDependencies: z.number().int().nonnegative().optional(),
    maxDepth: z.number().int().nonnegative().optional(),
    criticalFindings: z.number().int().nonnegative().optional(),
    highFindings: z.number().int().nonnegative().optional(),
    mediumFindings: z.number().int().nonnegative().optional(),
    lowFindings: z.number().int().nonnegative().optional(),
  }).passthrough().default({}),
}).strict();

module.exports = {
  SUPPORTED_SCHEMA_VERSIONS,
  SUPPLY_CHAIN_VERDICTS,
  SUPPORTED_ECOSYSTEMS,
  THREAT_CATEGORIES,
  SEVERITY_LEVELS,
  ComponentSchema,
  AdvisorySchema,
  ProvenanceSchema,
  SbomSchema,
  LicensePolicySchema,
  SupplyChainFindingSchema,
  SupplyChainAuditResultSchema,
};

