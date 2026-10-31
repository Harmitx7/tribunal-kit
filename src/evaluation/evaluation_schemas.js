'use strict';

/**
 * evaluation_schemas.js — Versioned Contracts for AI Evaluation & Reliability
 * ===========================================================================
 * Domain: AI Reliability & Evaluation (ai-reliability)
 *
 * Enforces strict typing, metadata versioning, and secret redaction for:
 * 1. Evaluation Cases (EvaluationCaseSchema)
 * 2. Evaluation Results (EvaluationResultSchema)
 * 3. Evaluation Datasets (EvaluationDatasetSchema)
 */

const { z } = require('zod');
const { redactSecrets } = require('../../.agent/scripts/secret_redactor');

const SUPPORTED_SCHEMA_VERSIONS = ['1.0.0'];

/**
 * Schema for an individual evaluation case within a benchmark suite.
 */
const EvaluationCaseSchema = z.object({
  id: z.string().min(1, 'Evaluation case must possess a unique id.'),
  schemaVersion: z.enum(SUPPORTED_SCHEMA_VERSIONS, {
    errorMap: () => ({ message: 'Unsupported schemaVersion. Supported: 1.0.0' }),
  }),
  suiteId: z.string().min(1, 'suiteId is required.'),
  category: z.string().min(1, 'category is required.'),
  taskDescription: z.string().min(1, 'taskDescription is required.'),
  inputFixture: z.object({
    prompt: z.string().optional(),
    targetFile: z.string().optional(),
    codeSnippet: z.string().optional(),
    context: z.record(z.unknown()).optional(),
  }),
  expected: z.object({
    groundTruthLabel: z.string().min(1, 'groundTruthLabel is required.'),
    labelProvenance: z.string().min(1, 'labelProvenance is required.'),
    requiredProperties: z.array(z.string()).optional(),
    forbiddenBehaviors: z.array(z.string()).optional(),
  }),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']).default('MEDIUM'),
  determinism: z.enum(['DETERMINISTIC', 'STOCHASTIC']).default('DETERMINISTIC'),
  timeoutMs: z.number().positive().default(10000),
  metadata: z.record(z.unknown()).optional(),
}).strict();

/**
 * Schema for an individual evaluation execution result.
 */
const EvaluationResultSchema = z.object({
  caseId: z.string().min(1, 'caseId is required.'),
  candidateId: z.string().min(1, 'candidateId is required.'),
  baselineId: z.string().optional(),
  schemaVersion: z.enum(SUPPORTED_SCHEMA_VERSIONS, {
    errorMap: () => ({ message: 'Unsupported schemaVersion. Supported: 1.0.0' }),
  }),
  timestamp: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T/)),
  status: z.enum(['COMPLETED', 'TIMED_OUT', 'CRASHED', 'BLOCKED']),
  verdict: z.enum(['PASS', 'FAIL', 'INCONCLUSIVE']),
  actualOutput: z.unknown().optional(),
  metrics: z.object({
    durationMs: z.number().nonnegative(),
    tokensUsed: z.number().nonnegative().optional(),
    confidence: z.number().min(0).max(1).or(z.string()).optional(),
    errorMargin: z.number().nonnegative().optional(),
  }).passthrough(),
  evidence: z.array(
    z.object({
      type: z.enum(['DETERMINISTIC_CHECK', 'STATIC_PROOF', 'INFERRED_CLAIM']),
      source: z.string().min(1),
      verified: z.boolean(),
      hash: z.string().optional(),
    })
  ).default([]),
  failureDetails: z.object({
    category: z.string(),
    reason: z.string(),
    sanitizedStack: z.string().optional(),
  }).optional(),
}).strict();

/**
 * Schema for an entire evaluation dataset file.
 */
const EvaluationDatasetSchema = z.object({
  schemaVersion: z.enum(SUPPORTED_SCHEMA_VERSIONS),
  datasetId: z.string().min(1),
  version: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  checksum: z.string().optional(),
  split: z.enum(['train', 'validation', 'held_out_eval']).default('held_out_eval'),
  cases: z.array(EvaluationCaseSchema).min(1, 'Dataset must contain at least one evaluation case.'),
  metadata: z.record(z.unknown()).optional(),
}).strict();

/**
 * Validates an evaluation case against EvaluationCaseSchema.
 */
function validateEvaluationCase(data) {
  const result = EvaluationCaseSchema.safeParse(data);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
    };
  }
  return { valid: true, data: result.data };
}

/**
 * Validates and sanitizes an evaluation result, automatically redacting secrets from failure details.
 */
function validateEvaluationResult(data) {
  // Pre-sanitize failure reasons & stacks to prevent secret leakage
  const sanitized = { ...data };
  if (sanitized.failureDetails) {
    const r1 = redactSecrets(sanitized.failureDetails.reason || '');
    const r2 = redactSecrets(sanitized.failureDetails.sanitizedStack || '');
    sanitized.failureDetails = {
      ...sanitized.failureDetails,
      reason: r1.text,
      sanitizedStack: r2.text,
    };
  }

  const result = EvaluationResultSchema.safeParse(sanitized);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
    };
  }
  return { valid: true, data: result.data };
}

/**
 * Validates an entire evaluation dataset.
 */
function validateEvaluationDataset(data) {
  const result = EvaluationDatasetSchema.safeParse(data);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
    };
  }
  return { valid: true, data: result.data };
}

module.exports = {
  EvaluationCaseSchema,
  EvaluationResultSchema,
  EvaluationDatasetSchema,
  SUPPORTED_SCHEMA_VERSIONS,
  validateEvaluationCase,
  validateEvaluationResult,
  validateEvaluationDataset,
};
