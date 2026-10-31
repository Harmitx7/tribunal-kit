'use strict';

/**
 * threat_model_schemas.js — Threat Modeling & Security Governance Schemas
 * =======================================================================
 * Domain: AI Agent Security & Governance (ai-agent-security-governance)
 *
 * Enforces versioned contracts for:
 * 1. Threat Records (ThreatRecordSchema) mapped to MITRE ATLAS and STRIDE-AI
 * 2. Security Controls (SecurityControlSchema) linking threats to executable checks
 * 3. Security Findings (SecurityFindingSchema) requiring deterministic evidence
 * 4. Security Incidents (SecurityIncidentSchema) for post-incident triage and containment
 * 5. Policy Audit Clauses (PolicyAuditFindingSchema) evaluating testability vs documentation
 */

const { z } = require('zod');

const SUPPORTED_THREAT_MODEL_VERSIONS = ['1.0.0'];
const THREAT_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
const STRIDE_CATEGORIES = [
  'SPOOFING',
  'TAMPERING',
  'REPUDIATION',
  'INFORMATION_DISCLOSURE',
  'DENIAL_OF_SERVICE',
  'ELEVATION_OF_PRIVILEGE',
];
const TRUST_BOUNDARIES = [
  'ZONE_0_CONTROL',
  'ZONE_1_ENFORCEMENT',
  'ZONE_2_REASONING',
  'ZONE_3_UNTRUSTED_DATA',
];

/**
 * ThreatRecordSchema — Validates a canonical threat catalog entry.
 */
const ThreatRecordSchema = z.object({
  threatId: z
    .string()
    .regex(/^THREAT-\d{2}$/, 'threatId must match canonical format (e.g., THREAT-01)'),
  category: z.string().min(1, 'Threat category is required.'),
  atlasId: z
    .string()
    .regex(/^AML\.T\d{4}(\.\d{3})?$/, 'atlasId must match MITRE ATLAS format (e.g. AML.T0051 or AML.T0051.001)'),
  entryPoint: z.string().min(1, 'Entry point description is required.'),
  trustBoundaryCrossed: z.string().min(1, 'Trust boundary description is required.'),
  severity: z.enum(THREAT_SEVERITIES),
  mitigatingControl: z.string().min(1, 'Canonical mitigating control is required.'),
  testReference: z.string().min(1, 'Executable test reference path is required.'),
  strideCategory: z.enum(STRIDE_CATEGORIES).optional(),
  description: z.string().optional(),
}).strict();

/**
 * SecurityControlSchema — Links a threat to an executable enforcement check.
 */
const SecurityControlSchema = z.object({
  controlId: z.string().min(1, 'controlId is required.'),
  name: z.string().min(1, 'Control name is required.'),
  description: z.string().min(1, 'Control description is required.'),
  threatIds: z.array(z.string().regex(/^THREAT-\d{2}$/)).min(1, 'At least one THREAT-XX must be mapped.'),
  enforcementType: z.enum([
    'STATIC_BOUNDARY',
    'RUNTIME_FILTER',
    'SCHEMA_VALIDATION',
    'HUMAN_GATE',
    'CRYPTOGRAPHIC_VERIFICATION',
  ]),
  executableCheck: z.string().min(1, 'executableCheck (file path or symbol) is required.'),
  activeEnforcement: z.boolean(),
  bypassableViaFlag: z.boolean().default(false),
}).strict();

/**
 * SecurityFindingSchema — Concrete, evidence-backed security finding.
 */
const SecurityFindingSchema = z.object({
  id: z.string().min(1, 'Security finding id is required.'),
  threatId: z.string().regex(/^THREAT-\d{2}$/).optional(),
  threatCategory: z.string().min(1, 'Threat category is required.'),
  severity: z.enum(THREAT_SEVERITIES),
  title: z.string().min(1, 'Title is required.'),
  description: z.string().min(1, 'Description is required.'),
  entryPoint: z.string().optional(),
  reproductionSteps: z.array(z.string()).optional(),
  evidence: z.array(
    z.object({
      type: z.string().min(1, 'Evidence type is required.'),
      source: z.string().min(1, 'Evidence source is required.'),
      description: z.string().optional(),
      codeSnippet: z.string().optional(),
      line: z.number().int().positive().optional(),
    })
  ).min(1, 'Security finding must contain at least one verifiable evidence record.'),
  remediation: z.string().min(1, 'Remediation advice is required.'),
  verificationStatus: z.enum(['VERIFIED', 'UNVERIFIED', 'FALSE_POSITIVE']).default('UNVERIFIED'),
}).strict();

/**
 * SecurityIncidentSchema — Tracks suspected or verified agent security breaches.
 */
const SecurityIncidentSchema = z.object({
  incidentId: z.string().min(1, 'incidentId is required.'),
  timestamp: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T/)),
  severity: z.enum(THREAT_SEVERITIES),
  suspectedThreats: z.array(z.string()).min(1, 'At least one suspected threat must be identified.'),
  timeline: z.array(
    z.object({
      timestamp: z.string(),
      action: z.string(),
      actor: z.string(),
      details: z.string().optional(),
    })
  ).min(1, 'Incident timeline must contain at least one event.'),
  affectedAssets: z.array(z.string()).min(1, 'Affected assets must be listed.'),
  compromisedBoundaries: z.array(z.string()).default([]),
  containmentActions: z.array(z.string()).min(1, 'At least one containment action is required.'),
}).strict();

/**
 * PolicyAuditFindingSchema — Evaluates policy clauses for testability and enforcement.
 */
const PolicyAuditFindingSchema = z.object({
  clauseId: z.string().min(1, 'clauseId is required.'),
  text: z.string().min(1, 'Policy clause text is required.'),
  testable: z.boolean(),
  associatedControls: z.array(z.string()).default([]),
  status: z.enum(['ENFORCED', 'DOCUMENTED_ONLY', 'AMBIGUOUS', 'UNTESTABLE']),
  notes: z.string().optional(),
}).strict();

/**
 * Validation helpers
 */
function validateThreatRecord(data) {
  return ThreatRecordSchema.parse(data);
}

function validateSecurityControl(data) {
  return SecurityControlSchema.parse(data);
}

function validateSecurityFinding(data) {
  return SecurityFindingSchema.parse(data);
}

function validateSecurityIncident(data) {
  return SecurityIncidentSchema.parse(data);
}

function validatePolicyClause(data) {
  return PolicyAuditFindingSchema.parse(data);
}

/**
 * Builds and validates an entire threat model register.
 * Ensures threat IDs are unique, all threats have mitigating controls and tests.
 *
 * @param {Array<object>} records - Array of ThreatRecord objects
 * @returns {object} Validated threat register with summary counts
 */
function buildThreatModelRegister(records) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('Threat model register requires a non-empty array of threat records.');
  }

  const validated = [];
  const idSet = new Set();
  const severityCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };

  for (const raw of records) {
    const record = validateThreatRecord(raw);
    if (idSet.has(record.threatId)) {
      throw new Error(`Duplicate threatId detected: "${record.threatId}". Threat IDs must be unique.`);
    }
    idSet.add(record.threatId);
    severityCounts[record.severity] = (severityCounts[record.severity] || 0) + 1;
    validated.push(record);
  }

  return {
    version: '1.0.0',
    totalThreats: validated.length,
    severityCounts,
    threats: validated,
  };
}

module.exports = {
  SUPPORTED_THREAT_MODEL_VERSIONS,
  THREAT_SEVERITIES,
  STRIDE_CATEGORIES,
  TRUST_BOUNDARIES,
  ThreatRecordSchema,
  SecurityControlSchema,
  SecurityFindingSchema,
  SecurityIncidentSchema,
  PolicyAuditFindingSchema,
  validateThreatRecord,
  validateSecurityControl,
  validateSecurityFinding,
  validateSecurityIncident,
  validatePolicyClause,
  buildThreatModelRegister,
};

