'use strict';

/**
 * verification_schemas.js — Versioned Contracts for Software Verification
 * =========================================================================
 * Domain: Software Verification & Formal Methods (software-verification-formal-methods)
 *
 * Enforces strict typing and versioned contracts for:
 * 1. Verification Cases (VerificationCaseSchema)
 * 2. Verification Results (VerificationResultSchema - standard 6-state taxonomy)
 * 3. System Invariants (InvariantRecordSchema)
 * 4. Requirement Traceability (RequirementTraceSchema)
 */

const { z } = require('zod');

const SUPPORTED_VERIFICATION_VERSIONS = ['1.0.0'];
const VERIFICATION_STATUSES = [
  'PASS',
  'FAIL',
  'INCONCLUSIVE',
  'BLOCKED',
  'NOT_RUN',
  'NOT_APPLICABLE',
];

const VERIFICATION_METHODS = [
  'CONTRACT',
  'PROPERTY_BASED',
  'MUTATION',
  'STATE_MACHINE',
  'DIFFERENTIAL',
  'STATIC_ANALYSIS',
  'REGRESSION',
  'FORMAL_SPEC',
];

/**
 * VerificationCaseSchema — Defines an individual formal or empirical verification scenario.
 */
const VerificationCaseSchema = z.object({
  id: z.string().min(1, 'Verification case id is required.'),
  schemaVersion: z.enum(SUPPORTED_VERIFICATION_VERSIONS).default('1.0.0'),
  requirementId: z.string().min(1, 'requirementId is required for traceability.'),
  component: z.string().min(1, 'Target component or module is required.'),
  method: z.enum(VERIFICATION_METHODS),
  description: z.string().min(1, 'Description of verified property is required.'),
  preconditions: z.array(z.string()).default([]),
  inputFixture: z.unknown().optional(),
  expectedProperty: z.string().min(1, 'Expected property or formal postcondition is required.'),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).default('HIGH'),
  timeoutMs: z.number().positive().default(5000),
  metadata: z.record(z.unknown()).optional(),
}).strict();

/**
 * VerificationResultSchema — Standardized 6-state verification result taxonomy.
 */
const VerificationResultSchema = z.object({
  caseId: z.string().min(1, 'caseId is required.'),
  testedRevision: z.string().min(1, 'testedRevision or git commit hash is required.'),
  timestamp: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T/)),
  status: z.enum(VERIFICATION_STATUSES),
  durationMs: z.number().nonnegative(),
  metrics: z.object({
    runsCount: z.number().nonnegative().optional(),
    mutantsKilled: z.number().nonnegative().optional(),
    mutantsTotal: z.number().nonnegative().optional(),
    shrinkSteps: z.number().nonnegative().optional(),
  }).passthrough().default({}),
  evidence: z.array(
    z.object({
      type: z.enum(['DETERMINISTIC_CHECK', 'PROPERTY_INVARIANT', 'MUTATION_KILL', 'FSM_TRANSITION', 'STATIC_AST_PROOF']),
      source: z.string().min(1),
      verified: z.boolean(),
      details: z.string().optional(),
    })
  ).default([]),
  counterexample: z.unknown().optional(),
  failureReason: z.string().optional(),
}).strict();

/**
 * InvariantRecordSchema — Reusable system safety and data integrity invariant.
 */
const InvariantRecordSchema = z.object({
  invariantId: z.string().regex(/^INV-\d{2,3}$/, 'invariantId must follow format INV-XX (e.g., INV-01)'),
  name: z.string().min(1, 'Invariant name is required.'),
  expression: z.string().min(1, 'Formal or executable invariant expression is required.'),
  category: z.enum(['SAFETY', 'LIVENESS', 'DATA_INTEGRITY', 'BOUNDED_RESOURCE', 'SECURITY']),
  enforcement: z.enum(['RUNTIME_ASSERTION', 'PROPERTY_TEST', 'STATIC_ANALYZER', 'FSM_GUARD']),
  active: z.boolean(),
  failureConsequence: z.string().min(1, 'Documented consequence of invariant breach is required.'),
}).strict();

/**
 * RequirementTraceSchema — Traceability link from requirement to code and test evidence.
 */
const RequirementTraceSchema = z.object({
  requirementId: z.string().regex(/^REQ-\d{2,3}$/, 'requirementId must match REQ-XX format'),
  title: z.string().min(1, 'Requirement title is required.'),
  category: z.enum(['FUNCTIONAL', 'NON_FUNCTIONAL', 'SECURITY', 'SAFETY']),
  invariantIds: z.array(z.string()).default([]),
  implementationFiles: z.array(z.string()).min(1, 'At least one implementation file must be mapped.'),
  verificationCaseIds: z.array(z.string()).default([]),
  status: z.enum(['VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED']),
  uncoveredAcceptanceCriteria: z.array(z.string()).default([]),
}).strict();

function validateVerificationCase(data) {
  return VerificationCaseSchema.parse(data);
}

function validateVerificationResult(data) {
  return VerificationResultSchema.parse(data);
}

function validateInvariantRecord(data) {
  return InvariantRecordSchema.parse(data);
}

function validateRequirementTrace(data) {
  return RequirementTraceSchema.parse(data);
}

module.exports = {
  SUPPORTED_VERIFICATION_VERSIONS,
  VERIFICATION_STATUSES,
  VERIFICATION_METHODS,
  VerificationCaseSchema,
  VerificationResultSchema,
  InvariantRecordSchema,
  RequirementTraceSchema,
  validateVerificationCase,
  validateVerificationResult,
  validateInvariantRecord,
  validateRequirementTrace,
};
