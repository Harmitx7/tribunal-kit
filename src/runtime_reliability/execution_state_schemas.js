'use strict';

/**
 * execution_state_schemas.js — Canonical State, Failure & Checkpoint Contracts
 * ============================================================================
 * Domain: Agent Runtime Reliability & Recovery (agent-runtime-reliability)
 *
 * Implements strict Zod contracts and taxonomies for:
 * 1. 10 Canonical Execution States (ExecutionStateEnum)
 * 2. 14 Normalized Failure Classes (FailureCategoryEnum)
 * 3. Execution Records & Provenance (ExecutionRecordSchema)
 * 4. Durable Execution Checkpoints (CheckpointSchema)
 * 5. Configurable Retry & Backoff Policies (RetryPolicySchema)
 * 6. Multi-Agent Quorum Policies (QuorumPolicySchema)
 * 7. Standardized Runtime Findings & Audit Results (RuntimeFindingSchema, RuntimeAuditResultSchema)
 */

const { z } = require('zod');

const SUPPORTED_SCHEMA_VERSIONS = ['1.0.0'];

const CANONICAL_STATES = [
  'PENDING',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'TIMED_OUT',
  'CANCELLED',
  'INTERRUPTED',
  'PARTIAL',
  'RETRYING',
  'BLOCKED',
];

const TERMINAL_STATES = new Set(['SUCCEEDED', 'FAILED', 'TIMED_OUT', 'CANCELLED', 'PARTIAL']);

const FAILURE_CATEGORIES = [
  'TRANSIENT_NETWORK',
  'RATE_LIMITED',
  'AUTHORIZATION_FAILURE',
  'INVALID_INPUT',
  'MALFORMED_OUTPUT',
  'MODEL_FAILURE',
  'TOOL_FAILURE',
  'TIMEOUT',
  'CANCELLED',
  'RESOURCE_EXHAUSTED',
  'STATE_INTEGRITY_FAILURE',
  'DEPENDENCY_UNAVAILABLE',
  'NON_RETRYABLE',
  'UNKNOWN',
];

const SEVERITY_LEVELS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

/**
 * ExecutionRecordSchema — Canonical record of a single task or agent execution.
 */
const ExecutionRecordSchema = z.object({
  id: z.string().min(1, 'Execution id is required.'),
  parentExecutionId: z.string().optional(),
  agentId: z.string().min(1, 'Agent identifier is required.'),
  taskType: z.string().min(1, 'Task type is required.'),
  state: z.enum(CANONICAL_STATES).default('PENDING'),
  attempt: z.number().int().nonnegative().default(1),
  maxAttempts: z.number().int().positive().default(3),
  deadline: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  createdAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  updatedAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  error: z.string().optional(),
  failureCategory: z.enum(FAILURE_CATEGORIES).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  provenanceHash: z.string().optional(),
}).strict();

/**
 * CheckpointSchema — Durable snapshot of workflow execution progress.
 */
const CheckpointSchema = z.object({
  checkpointId: z.string().min(1, 'Checkpoint id is required.'),
  executionId: z.string().min(1, 'Execution id is required.'),
  stateRevision: z.number().int().positive().default(1),
  schemaVersion: z.enum(SUPPORTED_SCHEMA_VERSIONS).default('1.0.0'),
  codeRevision: z.string().default('9.4.0'),
  completedTasks: z.array(z.string()).default([]),
  pendingTasks: z.array(z.string()).default([]),
  partialResults: z.record(z.string(), z.unknown()).default({}),
  idempotencyKeys: z.array(z.string()).default([]),
  timestamp: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  integrityHash: z.string().regex(/^[a-f0-9]{64}$/i, 'Integrity hash must be a SHA-256 hex string.'),
}).strict();

/**
 * RetryPolicySchema — Governs bounded exponential backoff and jitter.
 */
const RetryPolicySchema = z.object({
  maxAttempts: z.number().int().min(1).max(10).default(3),
  initialDelayMs: z.number().int().nonnegative().default(100),
  maxDelayMs: z.number().int().positive().default(10000),
  backoffFactor: z.number().min(1).default(2.0),
  jitter: z.boolean().default(true),
  retryDeadlineMs: z.number().int().positive().default(60000),
  retryableCategories: z.array(z.enum(FAILURE_CATEGORIES)).default([
    'TRANSIENT_NETWORK',
    'RATE_LIMITED',
    'MALFORMED_OUTPUT',
    'MODEL_FAILURE',
  ]),
  idempotentOnly: z.boolean().default(true),
}).strict();

/**
 * QuorumPolicySchema — Multi-agent consensus and aggregation rules.
 */
const QuorumPolicySchema = z.object({
  policyType: z.enum(['ALL_REQUIRED', 'THRESHOLD_QUORUM', 'BEST_EFFORT']).default('ALL_REQUIRED'),
  requiredAgents: z.array(z.string()).default([]),
  optionalAgents: z.array(z.string()).default([]),
  minSuccessThreshold: z.number().min(0).max(1).default(1.0),
  allowPartialResults: z.boolean().default(false),
}).strict();

/**
 * RuntimeFindingSchema — Standard diagnostic finding for runtime and reliability defects.
 */
const RuntimeFindingSchema = z.object({
  id: z.string().min(1, 'Finding id is required.'),
  category: z.enum([
    'DEADLOCK_DETECTED',
    'TIMEOUT_EXCEEDED',
    'CANCELLATION_FAILURE',
    'UNBOUNDED_RETRY',
    'ILLEGAL_STATE_TRANSITION',
    'CORRUPT_CHECKPOINT',
    'QUORUM_FAILURE',
    'NON_IDEMPOTENT_RETRY',
    'RESOURCE_EXHAUSTION',
    'ORPHANED_SUBPROCESS',
    'MISSING_OBSERVABILITY',
    'RUNTIME_REGRESSION',
  ]),
  severity: z.enum(SEVERITY_LEVELS),
  component: z.string().min(1, 'Component or agent identifier is required.'),
  title: z.string().min(1, 'Finding title is required.'),
  description: z.string().min(1, 'Detailed description is required.'),
  evidence: z.string().min(1, 'Empirical evidence is required.'),
  remediation: z.string().min(1, 'Remediation instructions required.'),
  verdict: z.enum(['PASS', 'FAIL', 'INCONCLUSIVE', 'BLOCKED', 'NOT_RUN', 'NOT_APPLICABLE']).default('FAIL'),
}).strict();

/**
 * RuntimeAuditResultSchema — Aggregated output for runtime resilience audits.
 */
const RuntimeAuditResultSchema = z.object({
  status: z.enum(['PASS', 'FAIL', 'BLOCKED', 'PARTIAL']),
  timestamp: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  summary: z.string().min(1, 'Summary is required.'),
  totalTasks: z.number().int().nonnegative(),
  succeededTasks: z.number().int().nonnegative(),
  failedTasks: z.number().int().nonnegative(),
  timedOutTasks: z.number().int().nonnegative().default(0),
  cancelledTasks: z.number().int().nonnegative().default(0),
  findings: z.array(RuntimeFindingSchema).default([]),
  metrics: z.object({
    totalExecutionTimeMs: z.number().nonnegative().optional(),
    totalRetries: z.number().int().nonnegative().optional(),
    quorumSatisfied: z.boolean().optional(),
    recoverySuccess: z.boolean().optional(),
  }).passthrough().default({}),
}).strict();

module.exports = {
  SUPPORTED_SCHEMA_VERSIONS,
  CANONICAL_STATES,
  TERMINAL_STATES,
  FAILURE_CATEGORIES,
  SEVERITY_LEVELS,
  ExecutionRecordSchema,
  CheckpointSchema,
  RetryPolicySchema,
  QuorumPolicySchema,
  RuntimeFindingSchema,
  RuntimeAuditResultSchema,
};
