// @ts-nocheck
'use strict';

/**
 * agent_contracts.js — Strict Schemas and Contract Validation for Agent Execution
 * ==============================================================================
 * Defines formal schemas and fail-closed validation for:
 * - AgentTask
 * - AgentResult
 * - AgentFinding
 */

const { z } = require('zod');
const { extractJsonPayload, normalizeSeverity } = require('./schemas');

const RISK_LEVELS = Object.freeze(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const AGENT_STATUSES = Object.freeze(['SUCCESS', 'FAILURE', 'ERROR', 'CANCELLED', 'BLOCKED']);
const FINDING_CATEGORIES = Object.freeze([
  'CORRECTNESS',
  'SECURITY',
  'PERFORMANCE',
  'ARCHITECTURE',
  'COMPLIANCE',
  'STYLE',
  'LOGIC',
  'DEPENDENCY',
  'TYPE_SAFETY',
  'OTHER',
]);

const STRIDE_CATEGORIES = Object.freeze([
  'SPOOFING',
  'TAMPERING',
  'REPUDIATION',
  'INFORMATION_DISCLOSURE',
  'DENIAL_OF_SERVICE',
  'ELEVATION_OF_PRIVILEGE',
]);

const CONTRACT_TYPES = Object.freeze([
  'OPENAPI',
  'JSON_SCHEMA',
  'REST',
  'GRAPHQL',
  'GRPC',
  'TRPC',
  'OTHER',
]);

const REQUEST_RESPONSE_COMPONENTS = Object.freeze([
  'REQUEST_BODY',
  'QUERY_PARAM',
  'PATH_PARAM',
  'RESPONSE_BODY',
  'HEADERS',
  'STATUS_CODE',
  'SCHEMA',
  'OTHER',
]);

const COMPATIBILITY_CLASSIFICATIONS = Object.freeze([
  'BREAKING',
  'NON_BREAKING',
  'POTENTIAL_BREAKING',
  'DEPRECATION',
  'ADDITIVE',
]);

const CONTRACT_VIOLATION_STATUSES = Object.freeze([
  'CONFIRMED_VIOLATION',
  'POTENTIAL_RISK',
  'MISSING_SPECIFICATION',
  'VERIFICATION_RECOMMENDATION',
]);

const CHANGE_TYPES = Object.freeze(['MODIFY', 'CREATE', 'DELETE', 'REPLACE']);

const PATCH_FORMATS = Object.freeze(['STRUCTURED', 'UNIFIED_DIFF', 'AST_REPLACEMENT']);

const PROPOSAL_STATUSES = Object.freeze([
  'PROPOSED',
  'ACCEPTED',
  'REJECTED',
  'APPLIED',
  'ROLLED_BACK',
]);

const REFACTORING_CATEGORIES = Object.freeze([
  'EXTRACT_METHOD',
  'EXTRACT_FUNCTION',
  'EXTRACT_VARIABLE',
  'INLINE_METHOD',
  'INLINE_TEMP',
  'MOVE_FUNCTION',
  'RENAME',
  'SIMPLIFY_CONDITIONAL',
  'REMOVE_DUPLICATION',
  'DECOUPLE_MODULE',
  'REPLACE_LOOP_WITH_PIPELINE',
  'INTRODUCE_PARAMETER_OBJECT',
  'OTHER',
]);

const CONCURRENCY_CATEGORIES = Object.freeze([
  'DATA_RACE',
  'RACE_CONDITION',
  'DEADLOCK',
  'LIVELOCK',
  'STARVATION',
  'LOCK_CONTENTION',
  'UNSAFE_CANCELLATION',
  'RESOURCE_LEAK',
  'ORDERING_VIOLATION',
  'SESSION_ISOLATION',
  'TRANSACTION_INTERFERENCE',
  'UNSAFE_SHARED_STATE',
  'OTHER',
]);

const RELEASE_READINESS_CATEGORIES = Object.freeze([
  'TEST_INTEGRITY',
  'BUILD_INTEGRITY',
  'SECURITY_VULNERABILITY',
  'SUPPLY_CHAIN',
  'PACKAGE_METADATA',
  'VERSION_INTEGRITY',
  'WORKING_TREE_INTEGRITY',
  'ARTIFACT_REPRODUCIBILITY',
  'DOCUMENTATION_PARITY',
  'REGISTRY_PARITY',
  'PLATFORM_COMPATIBILITY',
  'LICENSE_COMPLIANCE',
  'SECRET_EXPOSURE',
  'REGRESSION_RISK',
  'EVIDENCE_SUFFICIENCY',
]);

const RELEASE_GATE_STATUSES = Object.freeze(['PASSED', 'FAILED', 'SKIPPED', 'WARNING']);

const RELEASE_VERDICTS = Object.freeze([
  'READY',
  'READY_WITH_LIMITATIONS',
  'BLOCKED',
  'INSUFFICIENT_EVIDENCE',
]);

const RELEASE_FINDING_STATUSES = Object.freeze(['BLOCKING', 'NON_BLOCKING', 'WAIVED', 'RESOLVED']);

const LineRangeSchema = z.union([
  z.string(),
  z.object({
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
  }),
]);

const AgentFindingSchema = z.object({
  findingId: z.string().min(1, 'findingId must not be empty'),
  category: z.string().default('OTHER'),
  severity: z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  description: z.string().default('Finding description.'),
  evidence: z.string().min(1, 'Finding evidence must not be empty'),
  filePath: z.string().optional(),
  lineRange: LineRangeSchema.optional(),
  confidence: z.number().min(0.0).max(1.0).default(1.0),
  // Specialist Threat Modeling & Security Extensions (backward-compatible)
  title: z.string().optional(),
  affectedComponent: z.string().optional(),
  threatCategory: z.string().optional(),
  strideCategory: z
    .enum([
      'SPOOFING',
      'TAMPERING',
      'REPUDIATION',
      'INFORMATION_DISCLOSURE',
      'DENIAL_OF_SERVICE',
      'ELEVATION_OF_PRIVILEGE',
    ])
    .optional(),
  attackPreconditions: z.array(z.string()).optional(),
  attackScenario: z.string().optional(),
  potentialImpact: z.string().optional(),
  evidenceReferences: z.array(z.string()).optional(),
  recommendedMitigation: z.string().optional(),
  verificationRequirements: z.array(z.string()).optional(),
  residualRisk: z.string().optional(),
  uncertaintyOrMissingEvidence: z.string().optional(),
  verificationStatus: z.enum(['HYPOTHETICAL', 'DETECTED', 'VERIFIED']).optional(),
  // Specialist API Contract Extensions (backward-compatible)
  apiOrServiceId: z.string().optional(),
  contractType: z.enum(CONTRACT_TYPES).optional(),
  affectedEndpoint: z.string().optional(),
  requestResponseComponent: z.enum(REQUEST_RESPONSE_COMPONENTS).optional(),
  expectedContract: z.union([z.string(), z.record(z.any())]).optional(),
  actualObservedContract: z.union([z.string(), z.record(z.any())]).optional(),
  compatibilityClassification: z.enum(COMPATIBILITY_CLASSIFICATIONS).optional(),
  breakingChangeAssessment: z.string().optional(),
  consumerImpact: z.string().optional(),
  recommendedCorrection: z.string().optional(),
  contractViolationStatus: z.enum(CONTRACT_VIOLATION_STATUSES).optional(),
  // Specialist Concurrency Extensions (backward-compatible)
  concurrencyCategory: z.enum(CONCURRENCY_CATEGORIES).optional(),
  sharedResources: z.array(z.string()).optional(),
  interleavingSequence: z.array(z.union([z.string(), z.record(z.any())])).optional(),
  raceConditionEvidence: z.string().optional(),
  protectedInvariant: z.string().optional(),
  reproductionRequirements: z.array(z.string()).optional(),
  affectedComponents: z.array(z.string()).optional(),
  affectedFiles: z.array(z.string()).optional(),
  executionContext: z.string().optional(),
  rollbackPlan: z.string().optional(),
});

/**
 * Strict schema for threat modeling findings produced by threat-modeler.
 */
const ThreatFindingSchema = AgentFindingSchema.extend({
  description: z.string().default('Threat modeling finding.'),
  title: z.string().min(1, 'Threat finding must contain a non-empty title.'),
  affectedComponent: z.string().min(1, 'Threat finding must identify the affected component.'),
  threatCategory: z.string().min(1, 'Threat category is required.'),
  attackPreconditions: z.array(z.string()).default([]),
  attackScenario: z.string().min(1, 'Attack scenario must not be empty.'),
  potentialImpact: z.string().min(1, 'Potential impact must not be empty.'),
  evidenceReferences: z.array(z.string()).default([]),
  recommendedMitigation: z.string().min(1, 'Recommended mitigation must not be empty.'),
  verificationRequirements: z.array(z.string()).default([]),
  residualRisk: z.string().min(1, 'Residual risk assessment must not be empty.'),
  uncertaintyOrMissingEvidence: z.string().default('None identified.'),
  verificationStatus: z.enum(['HYPOTHETICAL', 'DETECTED', 'VERIFIED']).default('HYPOTHETICAL'),
});

/**
 * Strict schema for API contract findings produced by api-contract-engineer.
 */
const ApiContractFindingSchema = AgentFindingSchema.extend({
  description: z.string().default('API contract finding.'),
  apiOrServiceId: z.string().min(1, 'apiOrServiceId must not be empty.'),
  contractType: z.enum(CONTRACT_TYPES),
  affectedEndpoint: z.string().min(1, 'affectedEndpoint must not be empty.'),
  requestResponseComponent: z.enum(REQUEST_RESPONSE_COMPONENTS),
  expectedContract: z.union([z.string(), z.record(z.any())]),
  actualObservedContract: z.union([z.string(), z.record(z.any())]),
  compatibilityClassification: z.enum(COMPATIBILITY_CLASSIFICATIONS),
  breakingChangeAssessment: z.string().min(1, 'breakingChangeAssessment must not be empty.'),
  evidenceReferences: z.array(z.string()).default([]),
  consumerImpact: z.string().min(1, 'consumerImpact must not be empty.'),
  recommendedCorrection: z.string().min(1, 'recommendedCorrection must not be empty.'),
  verificationRequirements: z.array(z.string()).default([]),
  residualRisk: z.string().min(1, 'residualRisk must not be empty.'),
  uncertaintyOrMissingEvidence: z.string().default('None identified.'),
  contractViolationStatus: z.enum(CONTRACT_VIOLATION_STATUSES).default('CONFIRMED_VIOLATION'),
});

/**
 * Strict schema for individual file changes within a patch proposal.
 */
const PatchChangeSchema = z.object({
  filePath: z
    .string()
    .min(1, 'filePath must not be empty')
    .refine(p => !p.includes('\0'), 'filePath must not contain null bytes')
    .refine(p => !p.split(/[/\\]/).includes('..'), 'filePath must not contain path traversal (..)'),
  changeType: z.enum(CHANGE_TYPES),
  lineRange: LineRangeSchema.optional(),
  originalContent: z.string().optional(),
  replacement: z.string(),
  evidence: z.string().min(1, 'evidence supporting change must not be empty'),
});

/**
 * Strict schema for structured patch proposals produced by patch-proposal-agent.
 */
const PatchProposalSchema = z.object({
  proposalId: z.string().min(1, 'proposalId must not be empty'),
  title: z.string().min(1, 'title must not be empty'),
  description: z.string().min(1, 'description must not be empty'),
  rootCause: z.string().min(1, 'rootCause must not be empty'),
  findingReferences: z.array(z.string()).default([]),
  affectedFiles: z.array(z.string()).min(1, 'affectedFiles must list at least one file'),
  proposedChanges: z
    .array(PatchChangeSchema)
    .min(1, 'proposedChanges must contain at least one change'),
  patchFormat: z.enum(PATCH_FORMATS).default('STRUCTURED'),
  severity: z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  confidence: z.number().min(0.0).max(1.0).default(1.0),
  expectedBehavior: z.string().min(1, 'expectedBehavior must not be empty'),
  regressionRisks: z.array(z.string()).default([]),
  verificationRequirements: z.array(z.string()).default([]),
  rollbackPlan: z.string().min(1, 'rollbackPlan must not be empty'),
  securityImpact: z.string().min(1, 'securityImpact must not be empty'),
  dependencies: z.array(z.string()).default([]),
  requiresHumanApproval: z.boolean().default(true),
  uncertaintyOrMissingEvidence: z.string().default('None identified.'),
  status: z.enum(PROPOSAL_STATUSES).default('PROPOSED'),
});

/**
 * Strict schema for individual file changes within a refactoring proposal.
 */
const RefactoringChangeSchema = z.object({
  targetFile: z
    .string()
    .min(1, 'targetFile must not be empty')
    .refine(p => !p.includes('\0'), 'targetFile must not contain null bytes')
    .refine(
      p => !p.split(/[/\\]/).includes('..'),
      'targetFile must not contain path traversal (..)',
    ),
  sourceRange: LineRangeSchema.optional(),
  existingContext: z.string().min(1, 'existingContext must not be empty'),
  proposedReplacement: z.string(),
  reason: z.string().min(1, 'reason for refactor must not be empty'),
  evidence: z.string().min(1, 'evidence supporting refactor must not be empty'),
});

/**
 * Strict schema for structured refactoring proposals produced by refactoring-engineer.
 */
const RefactoringProposalSchema = z.object({
  proposalId: z.string().min(1, 'proposalId must not be empty'),
  title: z.string().min(1, 'title must not be empty'),
  description: z.string().min(1, 'description must not be empty'),
  refactoringCategory: z.enum(REFACTORING_CATEGORIES).default('OTHER'),
  targetFiles: z
    .array(
      z
        .string()
        .min(1, 'targetFile must not be empty')
        .refine(p => !p.includes('\0'), 'targetFile must not contain null bytes')
        .refine(
          p => !p.split(/[/\\]/).includes('..'),
          'targetFile must not contain path traversal (..)',
        ),
    )
    .min(1, 'targetFiles must list at least one file'),
  codeSmells: z.array(z.string()).min(1, 'codeSmells must list at least one detected smell'),
  currentDesign: z.string().min(1, 'currentDesign must not be empty'),
  proposedDesign: z.string().min(1, 'proposedDesign must not be empty'),
  behaviorPreservation: z.string().min(1, 'behaviorPreservation justification must not be empty'),
  publicApiImpact: z.union([
    z.boolean(),
    z.string(),
    z.object({
      hasBreakingChanges: z.boolean(),
      details: z.string().optional(),
    }),
  ]),
  dependencyImpact: z.union([z.string(), z.array(z.string())]).default('None'),
  proposedChanges: z
    .array(RefactoringChangeSchema)
    .min(1, 'proposedChanges must contain at least one change'),
  regressionRisks: z.array(z.string()).default([]),
  verificationRequirements: z
    .array(z.string())
    .min(1, 'verificationRequirements must specify at least one test requirement'),
  rollbackPlan: z.string().min(1, 'rollbackPlan must not be empty'),
  confidence: z.number().min(0.0).max(1.0).default(1.0),
  evidenceReferences: z.array(z.string()).default([]),
  requiresHumanApproval: z.boolean().default(true),
  securityImpact: z.string().default('NONE_IDENTIFIED'),
  status: z.enum(PROPOSAL_STATUSES).default('PROPOSED'),
  uncertaintyOrMissingEvidence: z.string().default('None identified.'),
});

const SafeFilePathSchema = z
  .string()
  .min(1, 'affectedFiles path must not be empty')
  .refine(p => !p.includes('\0'), 'path must not contain null bytes')
  .refine(p => !p.split(/[/\\]/).includes('..'), 'path must not contain path traversal (..)');

const InterleavingStepSchema = z.union([
  z.string().min(1, 'interleaving step must not be empty'),
  z.object({
    step: z.number().int().optional(),
    actor: z.string().optional(),
    operation: z.string().min(1, 'operation must not be empty'),
    resource: z.string().optional(),
  }),
]);

/**
 * Strict schema for concurrency analysis findings produced by concurrency-analyst.
 */
const ConcurrencyFindingSchema = z
  .object({
    findingId: z.string().min(1, 'findingId must not be empty'),
    title: z.string().min(1, 'concurrency finding must contain a non-empty title.'),
    description: z.string().min(1, 'description must not be empty.'),
    concurrencyCategory: z.enum(CONCURRENCY_CATEGORIES),
    severity: z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    confidence: z.number().min(0.0).max(1.0),
    affectedComponents: z.array(z.string()).default([]),
    affectedFiles: z.array(SafeFilePathSchema).default([]),
    sharedResources: z.array(z.string()).default([]),
    executionContext: z.string().default('General runtime execution'),
    interleavingSequence: z.array(InterleavingStepSchema).default([]),
    raceConditionEvidence: z.string().default(''),
    protectedInvariant: z.string().min(1, 'protectedInvariant must not be empty.'),
    rootCause: z.string().min(1, 'rootCause must not be empty.'),
    impact: z.string().min(1, 'impact must not be empty.'),
    reproductionRequirements: z.array(z.string()).default([]),
    recommendedMitigation: z.string().min(1, 'recommendedMitigation must not be empty.'),
    verificationRequirements: z.array(z.string()).default([]),
    rollbackPlan: z.string().min(1, 'rollbackPlan must not be empty.'),
    evidenceReferences: z.array(z.string()).default([]),
    uncertaintyOrMissingEvidence: z.string().default('None identified.'),
  })
  .refine(
    f => {
      if (['HIGH', 'CRITICAL'].includes(f.severity)) {
        const hasEvidence =
          typeof f.raceConditionEvidence === 'string' && f.raceConditionEvidence.trim().length > 0;
        const hasRefs = Array.isArray(f.evidenceReferences) && f.evidenceReferences.length > 0;
        return hasEvidence && hasRefs;
      }
      return true;
    },
    {
      message:
        'HIGH and CRITICAL concurrency findings strictly require non-empty raceConditionEvidence and at least one evidenceReference.',
      path: ['raceConditionEvidence'],
    },
  )
  .refine(
    f => {
      if (['DATA_RACE', 'RACE_CONDITION', 'DEADLOCK', 'LIVELOCK'].includes(f.concurrencyCategory)) {
        if (!Array.isArray(f.interleavingSequence) || f.interleavingSequence.length === 0) {
          return false;
        }
        return f.interleavingSequence.every(step => {
          if (typeof step === 'string') return step.trim().length > 0;
          if (typeof step === 'object' && step !== null) {
            return typeof step.operation === 'string' && step.operation.trim().length > 0;
          }
          return false;
        });
      }
      return true;
    },
    {
      message:
        'Race condition and deadlock findings must provide an interleavingSequence with at least one valid, non-empty step.',
      path: ['interleavingSequence'],
    },
  );

/**
 * Strict schema for release readiness findings produced by release-readiness-agent.
 * Exactly 13 fields.
 */
const ReleaseReadinessFindingSchema = z.object({
  findingId: z.string().regex(/^RRF-[A-Z0-9_-]+$/, 'findingId must match pattern RRF-[A-Z0-9_-]+'),
  category: z.enum(RELEASE_READINESS_CATEGORIES),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL']),
  status: z.enum(RELEASE_FINDING_STATUSES),
  title: z
    .string()
    .min(5, 'title must be at least 5 characters')
    .max(150, 'title must not exceed 150 characters'),
  description: z.string().min(10, 'description must be at least 10 characters'),
  evidence: z.string().min(5, 'evidence must be at least 5 characters'),
  gate: z.string().min(1, 'gate must not be empty'),
  remediation: z.string().min(1, 'remediation must not be empty'),
  component: z.string().min(1, 'component must not be empty'),
  lineOrLocation: z.string().optional(),
  detectedAt: z.string().min(1, 'detectedAt timestamp required'),
  metadata: z.record(z.any()).optional(),
});

/**
 * Strict schema for release readiness reports produced by release-readiness-agent.
 * Exactly 20 fields with fail-closed gate and evidence enforcement.
 */
const ReleaseReadinessReportSchema = z
  .object({
    reportId: z.string().regex(/^RRR-[A-Z0-9_-]+$/, 'reportId must match pattern RRR-[A-Z0-9_-]+'),
    targetPackage: z.string().min(1, 'targetPackage must not be empty'),
    targetVersion: z.string().min(1, 'targetVersion must not be empty'),
    commitHash: z.string().min(1, 'commitHash must not be empty'),
    branch: z.string().min(1, 'branch must not be empty'),
    evaluationTimestamp: z.string().min(1, 'evaluationTimestamp required'),
    evaluator: z.string().min(1, 'evaluator must not be empty'),
    verdict: z.enum(RELEASE_VERDICTS),
    confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    findings: z.array(ReleaseReadinessFindingSchema).default([]),
    gatesEvaluated: z
      .array(
        z.object({
          gateName: z.string().min(1, 'gateName required'),
          status: z.enum(RELEASE_GATE_STATUSES),
          mandatory: z.boolean().default(true),
          evidenceRef: z.string().optional(),
        }),
      )
      .min(1, 'At least one gate must be evaluated'),
    testsSummary: z.object({
      totalSuites: z.number().int().nonnegative(),
      passedSuites: z.number().int().nonnegative(),
      failedSuites: z.number().int().nonnegative(),
      totalTests: z.number().int().nonnegative(),
      passedTests: z.number().int().nonnegative(),
      failedTests: z.number().int().nonnegative(),
      durationMs: z.number().nonnegative().optional(),
    }),
    workingTreeState: z.object({
      isClean: z.boolean(),
      branch: z.string().min(1),
      headCommit: z.string().min(1),
      modifiedCount: z.number().int().nonnegative(),
      untrackedCount: z.number().int().nonnegative(),
    }),
    dependenciesSummary: z.object({
      productionDependencies: z.number().int().nonnegative(),
      allowedDependencies: z.array(z.string()),
      pass: z.boolean(),
    }),
    packageValidation: z.object({
      name: z.string().min(1),
      version: z.string().min(1),
      filesIncluded: z.number().int().nonnegative(),
      packSuccess: z.boolean(),
    }),
    blockingFindingsCount: z.number().int().nonnegative(),
    limitations: z.array(z.string()).default([]),
    certificationSignature: z.string().min(1, 'certificationSignature must not be empty'),
    evidenceReferences: z.array(z.string()).default([]),
    metadata: z.record(z.any()).optional(),
  })
  .refine(
    report => {
      if (report.verdict === 'READY') {
        const hasFailedMandatoryGate = report.gatesEvaluated.some(
          g => g.mandatory !== false && g.status === 'FAILED',
        );
        if (hasFailedMandatoryGate) return false;

        const hasBlockingFinding = report.findings.some(f => f.status === 'BLOCKING');
        if (hasBlockingFinding) return false;

        if (report.blockingFindingsCount > 0) return false;

        if (report.testsSummary.failedSuites > 0 || report.testsSummary.failedTests > 0) {
          return false;
        }

        if (report.dependenciesSummary.pass === false) return false;
        if (report.packageValidation.packSuccess === false) return false;
        if (!report.evidenceReferences || report.evidenceReferences.length === 0) return false;
      }
      return true;
    },
    {
      message:
        'A verdict of READY is strictly prohibited when mandatory gates fail, blocking findings exist, tests fail, dependency invariants are breached, package validation fails, or evidence references are missing.',
      path: ['verdict'],
    },
  )
  .refine(
    report => {
      if (report.verdict === 'READY_WITH_LIMITATIONS') {
        if (!Array.isArray(report.limitations) || report.limitations.length === 0) {
          return false;
        }
        const hasFailedMandatoryGate = report.gatesEvaluated.some(
          g => g.mandatory !== false && g.status === 'FAILED',
        );
        if (hasFailedMandatoryGate) return false;
      }
      return true;
    },
    {
      message:
        'A verdict of READY_WITH_LIMITATIONS requires at least one documented limitation and no failed mandatory gates.',
      path: ['limitations'],
    },
  );

const AgentTaskSchema = z.object({
  taskId: z.string().min(1, 'taskId must not be empty'),
  agentId: z.string().min(1, 'agentId must not be empty'),
  objective: z.string().min(1, 'objective must not be empty'),
  context: z.union([z.string(), z.record(z.any())]).default(''),
  constraints: z.array(z.string()).default([]),
  requiredSkills: z.array(z.string()).default([]),
  model: z.string().optional(),
  timeoutMs: z.number().int().positive().default(30000),
  tokenBudget: z.number().int().positive().default(4096),
  dependencies: z.array(z.string()).default([]),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  metadata: z.record(z.any()).optional(),
});

const AgentProvenanceSchema = z.object({
  inputHash: z.string().min(1, 'inputHash required'),
  outputHash: z.string().min(1, 'outputHash required'),
  provider: z.string().default('unknown'),
  model: z.string().default('unknown'),
  durationMs: z.number().nonnegative().default(0),
  timestamp: z.number().positive(),
});

const AgentResultSchema = z.object({
  taskId: z.string().min(1, 'taskId must not be empty'),
  agentId: z.string().min(1, 'agentId must not be empty'),
  status: z.enum(['SUCCESS', 'FAILURE', 'ERROR', 'CANCELLED', 'BLOCKED']),
  summary: z.string().min(1, 'summary must not be empty'),
  findings: z.array(AgentFindingSchema).default([]),
  proposals: z.array(PatchProposalSchema).default([]),
  refactoringProposals: z.array(RefactoringProposalSchema).default([]),
  concurrencyFindings: z.array(ConcurrencyFindingSchema).default([]),
  releaseFindings: z.array(ReleaseReadinessFindingSchema).default([]),
  releaseReadinessReports: z.array(ReleaseReadinessReportSchema).default([]),
  writeProposals: z.array(z.any()).default([]),
  evidence: z.array(z.any()).default([]),
  artifacts: z.array(z.any()).default([]),
  recommendations: z.array(z.string()).default([]),
  errors: z.array(z.string()).default([]),
  provenance: AgentProvenanceSchema,
  durationMs: z.number().nonnegative(),
});

/**
 * Validates an AgentTask. Throws on validation failure.
 * @param {any} task
 * @returns {import('zod').infer<typeof AgentTaskSchema>}
 */
function validateAgentTask(task) {
  return AgentTaskSchema.parse(task);
}

/**
 * Safely checks if a task is valid without throwing.
 * @param {any} task
 * @returns {{ success: boolean, data?: Object, error?: import('zod').ZodError }}
 */
function safeValidateAgentTask(task) {
  return AgentTaskSchema.safeParse(task);
}

/**
 * Validates an AgentResult. Throws on validation failure.
 * @param {any} result
 * @returns {import('zod').infer<typeof AgentResultSchema>}
 */
function validateAgentResult(result) {
  return AgentResultSchema.parse(result);
}

/**
 * Safely checks if a result is valid.
 * @param {any} result
 * @returns {{ success: boolean, data?: Object, error?: import('zod').ZodError }}
 */
function safeValidateAgentResult(result) {
  return AgentResultSchema.safeParse(result);
}

/**
 * Validates a single finding against schema.
 * @param {any} finding
 * @returns {import('zod').infer<typeof AgentFindingSchema>}
 */
function validateAgentFinding(finding) {
  return AgentFindingSchema.parse(finding);
}

/**
 * Validates a threat modeling finding against ThreatFindingSchema.
 * @param {any} finding
 * @returns {import('zod').infer<typeof ThreatFindingSchema>}
 */
function validateThreatFinding(finding) {
  return ThreatFindingSchema.parse(finding);
}

/**
 * Validates an API contract finding against ApiContractFindingSchema.
 * @param {any} finding
 * @returns {import('zod').infer<typeof ApiContractFindingSchema>}
 */
function validateApiContractFinding(finding) {
  return ApiContractFindingSchema.parse(finding);
}

/**
 * Validates a concurrency finding against ConcurrencyFindingSchema.
 * @param {any} finding
 * @returns {import('zod').infer<typeof ConcurrencyFindingSchema>}
 */
function validateConcurrencyFinding(finding) {
  return ConcurrencyFindingSchema.parse(finding);
}

/**
 * Safely validates a concurrency finding against ConcurrencyFindingSchema without throwing.
 * @param {any} finding
 * @returns {{ success: boolean, data?: Object, error?: import('zod').ZodError }}
 */
function safeValidateConcurrencyFinding(finding) {
  return ConcurrencyFindingSchema.safeParse(finding);
}

/**
 * Validates a release readiness finding against ReleaseReadinessFindingSchema.
 * @param {any} finding
 * @returns {import('zod').infer<typeof ReleaseReadinessFindingSchema>}
 */
function validateReleaseReadinessFinding(finding) {
  return ReleaseReadinessFindingSchema.parse(finding);
}

/**
 * Safely validates a release readiness finding against ReleaseReadinessFindingSchema without throwing.
 * @param {any} finding
 * @returns {{ success: boolean, data?: Object, error?: import('zod').ZodError }}
 */
function safeValidateReleaseReadinessFinding(finding) {
  return ReleaseReadinessFindingSchema.safeParse(finding);
}

/**
 * Validates a release readiness report against ReleaseReadinessReportSchema.
 * @param {any} report
 * @returns {import('zod').infer<typeof ReleaseReadinessReportSchema>}
 */
function validateReleaseReadinessReport(report) {
  return ReleaseReadinessReportSchema.parse(report);
}

/**
 * Safely validates a release readiness report against ReleaseReadinessReportSchema without throwing.
 * @param {any} report
 * @returns {{ success: boolean, data?: Object, error?: import('zod').ZodError }}
 */
function safeValidateReleaseReadinessReport(report) {
  return ReleaseReadinessReportSchema.safeParse(report);
}

/**
 * Validates a patch proposal against PatchProposalSchema.
 * @param {any} proposal
 * @returns {import('zod').infer<typeof PatchProposalSchema>}
 */
function validatePatchProposal(proposal) {
  return PatchProposalSchema.parse(proposal);
}

/**
 * Safely checks if a patch proposal is valid.
 * @param {any} proposal
 * @returns {{ success: boolean, data?: Object, error?: import('zod').ZodError }}
 */
function safeValidatePatchProposal(proposal) {
  return PatchProposalSchema.safeParse(proposal);
}

/**
 * Validates an individual patch change.
 * @param {any} change
 * @returns {import('zod').infer<typeof PatchChangeSchema>}
 */
function validatePatchChange(change) {
  return PatchChangeSchema.parse(change);
}

/**
 * Evaluates whether a proposal contains destructive operations (deletion or blank replacement).
 * @param {any} proposal
 * @returns {boolean}
 */
function isDestructivePatch(proposal) {
  if (!proposal || !Array.isArray(proposal.proposedChanges)) return false;
  return proposal.proposedChanges.some(
    change =>
      change.changeType === 'DELETE' ||
      (change.changeType === 'REPLACE' && (!change.replacement || !change.replacement.trim())),
  );
}

/**
 * Translates a validated PatchProposal into a ControlledWriteService writeRequest.
 * @param {any} proposal
 * @param {string} [workspaceId]
 * @returns {Object}
 */
function proposalToWriteRequest(proposal, workspaceId) {
  const validated = PatchProposalSchema.parse(proposal);
  return {
    requestId: `req_${validated.proposalId}`,
    workspaceId: workspaceId || process.cwd(),
    reason: `Automated Repair: ${validated.title} [${validated.proposalId}]`,
    requiresHumanApproval: validated.requiresHumanApproval !== false,
    files: validated.proposedChanges.map(change => ({
      path: change.filePath,
      operation:
        change.changeType === 'DELETE'
          ? 'DELETE'
          : change.changeType === 'CREATE'
            ? 'CREATE'
            : 'MODIFY',
      content: change.replacement,
    })),
  };
}

/**
 * Validates a refactoring proposal against RefactoringProposalSchema.
 * Throws ZodError on validation failure.
 * @param {any} proposal
 * @returns {import('zod').infer<typeof RefactoringProposalSchema>}
 */
function validateRefactoringProposal(proposal) {
  return RefactoringProposalSchema.parse(proposal);
}

/**
 * Safely validates a refactoring proposal without throwing.
 * @param {any} proposal
 * @returns {{ success: boolean, data?: Object, error?: import('zod').ZodError }}
 */
function safeValidateRefactoringProposal(proposal) {
  return RefactoringProposalSchema.safeParse(proposal);
}

/**
 * Validates an individual refactoring change against RefactoringChangeSchema.
 * @param {any} change
 * @returns {import('zod').infer<typeof RefactoringChangeSchema>}
 */
function validateRefactoringChange(change) {
  return RefactoringChangeSchema.parse(change);
}

/**
 * Verifies that a refactoring proposal strictly preserves observable program behavior,
 * does not introduce public API breaking changes, and is not a disguised bug fix.
 * @param {any} proposal
 * @returns {boolean}
 */
function isBehaviorPreservingProposal(proposal) {
  try {
    const validated = RefactoringProposalSchema.parse(proposal);
    if (
      !validated.behaviorPreservation ||
      typeof validated.behaviorPreservation !== 'string' ||
      !validated.behaviorPreservation.trim()
    ) {
      return false;
    }

    // Check public API impact
    if (typeof validated.publicApiImpact === 'boolean' && validated.publicApiImpact === true) {
      return false;
    }
    if (typeof validated.publicApiImpact === 'object' && validated.publicApiImpact !== null) {
      if (validated.publicApiImpact.hasBreakingChanges === true) {
        return false;
      }
    }
    if (typeof validated.publicApiImpact === 'string') {
      const upper = validated.publicApiImpact.toUpperCase();
      if (
        upper.includes('BREAKING') &&
        !upper.includes('NON_BREAKING') &&
        !upper.includes('NON-BREAKING') &&
        !upper.includes('NO BREAKING')
      ) {
        return false;
      }
    }

    // Disallow functional bug fixes or vulnerability patches masquerading as refactors
    const categoryUpper = String(validated.refactoringCategory || '').toUpperCase();
    if (
      categoryUpper.includes('BUGFIX') ||
      categoryUpper.includes('VULNERABILITY') ||
      categoryUpper.includes('SECURITY_PATCH')
    ) {
      return false;
    }

    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Translates a validated RefactoringProposal into a ControlledWriteService writeRequest.
 * @param {any} proposal
 * @param {Object|string} [contextOrWorkspace]
 * @returns {Object}
 */
function refactoringToWriteRequest(proposal, contextOrWorkspace) {
  const validated = RefactoringProposalSchema.parse(proposal);
  const context =
    typeof contextOrWorkspace === 'string'
      ? { workspaceId: contextOrWorkspace }
      : contextOrWorkspace || {};

  return {
    requestId: `req_${validated.proposalId}`,
    workspaceId: context.workspaceId || process.cwd(),
    sessionId: context.sessionId,
    agentId: context.agentId || 'refactoring-engineer',
    reason: `Refactoring: ${validated.title} [${validated.proposalId}]`,
    requiresHumanApproval: validated.requiresHumanApproval !== false,
    files: validated.proposedChanges.map(change => ({
      path: change.targetFile,
      operation: 'MODIFY',
      content: change.proposedReplacement,
    })),
  };
}

/**
 * Normalizes raw model output into a valid AgentResult.
 * Fails closed on malformed output, coercing to an ERROR result.
 *
 * @param {string|Object} rawOutput
 * @param {Object} context
 * @param {string} context.taskId
 * @param {string} context.agentId
 * @param {string} context.inputHash
 * @param {string} context.provider
 * @param {string} context.model
 * @param {number} context.durationMs
 * @returns {import('zod').infer<typeof AgentResultSchema>}
 */
function parseRawAgentOutput(rawOutput, context = {}) {
  const timestamp = Date.now();
  const taskId = context.taskId || 'unknown_task';
  const agentId = context.agentId || 'unknown_agent';
  const inputHash =
    context.inputHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const provider = context.provider || 'unknown';
  const model = context.model || 'unknown';
  const durationMs = typeof context.durationMs === 'number' ? context.durationMs : 0;

  let parsed = null;
  let rawStr = '';

  if (typeof rawOutput === 'object' && rawOutput !== null) {
    parsed = rawOutput;
    rawStr = JSON.stringify(rawOutput);
  } else if (typeof rawOutput === 'string') {
    rawStr = rawOutput;
    const jsonStr = extractJsonPayload(rawOutput);
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      // Fail closed: malformed JSON becomes ERROR status
      return {
        taskId,
        agentId,
        status: 'ERROR',
        summary: `MALFORMED_OUTPUT: Model returned unparseable output: ${parseErr.message}`,
        findings: [],
        proposals: [],
        refactoringProposals: [],
        writeProposals: [],
        evidence: [],
        artifacts: [],
        recommendations: [],
        errors: [`Unparseable model output. Raw snippet: ${rawStr.slice(0, 200)}`],
        provenance: {
          inputHash,
          outputHash: require('crypto').createHash('sha256').update(rawStr, 'utf8').digest('hex'),
          provider,
          model,
          durationMs,
          timestamp,
        },
        durationMs,
      };
    }
  } else {
    return {
      taskId,
      agentId,
      status: 'ERROR',
      summary: 'MALFORMED_OUTPUT: Model returned empty or null output.',
      findings: [],
      proposals: [],
      refactoringProposals: [],
      writeProposals: [],
      evidence: [],
      artifacts: [],
      recommendations: [],
      errors: ['No output received from model provider.'],
      provenance: {
        inputHash,
        outputHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        provider,
        model,
        durationMs,
        timestamp,
      },
      durationMs,
    };
  }

  // Handle reviewer schema compatibility (verdict -> status)
  let status = 'SUCCESS';
  if (parsed.status && AGENT_STATUSES.includes(String(parsed.status).toUpperCase())) {
    status = String(parsed.status).toUpperCase();
  } else if (parsed.verdict) {
    const v = String(parsed.verdict).toUpperCase();
    if (v === 'APPROVED' || v === 'WARNING') status = 'SUCCESS';
    else if (v === 'REJECTED') status = 'FAILURE';
    else if (v === 'ERROR') status = 'ERROR';
  }

  const summary =
    typeof parsed.summary === 'string' && parsed.summary.trim()
      ? parsed.summary.trim()
      : typeof parsed.description === 'string' && parsed.description.trim()
        ? parsed.description.trim()
        : `Execution completed by ${agentId}.`;

  // Normalize findings
  const rawFindings = Array.isArray(parsed.findings) ? parsed.findings : [];
  const normalizedFindings = [];

  for (let i = 0; i < rawFindings.length; i++) {
    const rf = rawFindings[i];
    if (!rf || typeof rf !== 'object') continue;

    const findingId =
      typeof rf.findingId === 'string' && rf.findingId.trim()
        ? rf.findingId.trim()
        : typeof rf.id === 'string' && rf.id.trim()
          ? rf.id.trim()
          : `F-${i + 1}`;

    const severity = normalizeSeverity(rf.severity);
    const category =
      typeof rf.category === 'string' && FINDING_CATEGORIES.includes(rf.category.toUpperCase())
        ? rf.category.toUpperCase()
        : 'OTHER';

    const desc =
      typeof rf.description === 'string' && rf.description.trim()
        ? rf.description.trim()
        : typeof rf.issue === 'string' && rf.issue.trim()
          ? rf.issue.trim()
          : typeof rf.title === 'string' && rf.title.trim()
            ? rf.title.trim()
            : `Finding ${i + 1}`;

    const evid =
      typeof rf.evidence === 'string' && rf.evidence.trim()
        ? rf.evidence.trim()
        : typeof rf.snippet === 'string' && rf.snippet.trim()
          ? rf.snippet.trim()
          : desc;

    const filePath =
      typeof rf.filePath === 'string'
        ? rf.filePath
        : typeof rf.file === 'string'
          ? rf.file
          : undefined;
    const lineRange =
      rf.lineRange !== undefined
        ? rf.lineRange
        : rf.line !== undefined
          ? String(rf.line)
          : undefined;
    const confidence =
      typeof rf.confidence === 'number' && rf.confidence >= 0 && rf.confidence <= 1
        ? rf.confidence
        : 1.0;

    const title = typeof rf.title === 'string' && rf.title.trim() ? rf.title.trim() : undefined;
    const affectedComponent =
      typeof rf.affectedComponent === 'string' && rf.affectedComponent.trim()
        ? rf.affectedComponent.trim()
        : typeof rf.component === 'string' && rf.component.trim()
          ? rf.component.trim()
          : undefined;
    const threatCategory =
      typeof rf.threatCategory === 'string' && rf.threatCategory.trim()
        ? rf.threatCategory.trim()
        : undefined;
    const strideCategory =
      typeof rf.strideCategory === 'string' &&
      STRIDE_CATEGORIES.includes(rf.strideCategory.toUpperCase())
        ? rf.strideCategory.toUpperCase()
        : undefined;
    const attackPreconditions = Array.isArray(rf.attackPreconditions)
      ? rf.attackPreconditions.map(String)
      : Array.isArray(rf.preconditions)
        ? rf.preconditions.map(String)
        : undefined;
    const attackScenario =
      typeof rf.attackScenario === 'string' && rf.attackScenario.trim()
        ? rf.attackScenario.trim()
        : typeof rf.scenario === 'string' && rf.scenario.trim()
          ? rf.scenario.trim()
          : undefined;
    const potentialImpact =
      typeof rf.potentialImpact === 'string' && rf.potentialImpact.trim()
        ? rf.potentialImpact.trim()
        : typeof rf.impact === 'string' && rf.impact.trim()
          ? rf.impact.trim()
          : undefined;
    const evidenceReferences = Array.isArray(rf.evidenceReferences)
      ? rf.evidenceReferences.map(String)
      : Array.isArray(rf.references)
        ? rf.references.map(String)
        : undefined;
    const recommendedMitigation =
      typeof rf.recommendedMitigation === 'string' && rf.recommendedMitigation.trim()
        ? rf.recommendedMitigation.trim()
        : typeof rf.mitigation === 'string' && rf.mitigation.trim()
          ? rf.mitigation.trim()
          : undefined;
    const verificationRequirements = Array.isArray(rf.verificationRequirements)
      ? rf.verificationRequirements.map(String)
      : Array.isArray(rf.verification)
        ? rf.verification.map(String)
        : undefined;
    const residualRisk =
      typeof rf.residualRisk === 'string' && rf.residualRisk.trim()
        ? rf.residualRisk.trim()
        : undefined;
    const uncertaintyOrMissingEvidence =
      typeof rf.uncertaintyOrMissingEvidence === 'string' && rf.uncertaintyOrMissingEvidence.trim()
        ? rf.uncertaintyOrMissingEvidence.trim()
        : typeof rf.uncertainty === 'string' && rf.uncertainty.trim()
          ? rf.uncertainty.trim()
          : undefined;
    const verificationStatus =
      typeof rf.verificationStatus === 'string' &&
      ['HYPOTHETICAL', 'DETECTED', 'VERIFIED'].includes(rf.verificationStatus.toUpperCase())
        ? rf.verificationStatus.toUpperCase()
        : undefined;

    // Specialist API Contract Fields
    const apiOrServiceId =
      typeof rf.apiOrServiceId === 'string' && rf.apiOrServiceId.trim()
        ? rf.apiOrServiceId.trim()
        : typeof rf.serviceId === 'string' && rf.serviceId.trim()
          ? rf.serviceId.trim()
          : typeof rf.apiId === 'string' && rf.apiId.trim()
            ? rf.apiId.trim()
            : undefined;
    const contractType =
      typeof rf.contractType === 'string' && CONTRACT_TYPES.includes(rf.contractType.toUpperCase())
        ? rf.contractType.toUpperCase()
        : undefined;
    const affectedEndpoint =
      typeof rf.affectedEndpoint === 'string' && rf.affectedEndpoint.trim()
        ? rf.affectedEndpoint.trim()
        : typeof rf.endpoint === 'string' && rf.endpoint.trim()
          ? rf.endpoint.trim()
          : typeof rf.operation === 'string' && rf.operation.trim()
            ? rf.operation.trim()
            : undefined;
    const requestResponseComponent =
      typeof rf.requestResponseComponent === 'string' &&
      REQUEST_RESPONSE_COMPONENTS.includes(rf.requestResponseComponent.toUpperCase())
        ? rf.requestResponseComponent.toUpperCase()
        : typeof rf.component === 'string' &&
            REQUEST_RESPONSE_COMPONENTS.includes(rf.component.toUpperCase())
          ? rf.component.toUpperCase()
          : undefined;
    const expectedContract = rf.expectedContract !== undefined ? rf.expectedContract : undefined;
    const actualObservedContract =
      rf.actualObservedContract !== undefined
        ? rf.actualObservedContract
        : rf.observedContract !== undefined
          ? rf.observedContract
          : undefined;
    const compatibilityClassification =
      typeof rf.compatibilityClassification === 'string' &&
      COMPATIBILITY_CLASSIFICATIONS.includes(rf.compatibilityClassification.toUpperCase())
        ? rf.compatibilityClassification.toUpperCase()
        : typeof rf.compatibility === 'string' &&
            COMPATIBILITY_CLASSIFICATIONS.includes(rf.compatibility.toUpperCase())
          ? rf.compatibility.toUpperCase()
          : undefined;
    const breakingChangeAssessment =
      typeof rf.breakingChangeAssessment === 'string' && rf.breakingChangeAssessment.trim()
        ? rf.breakingChangeAssessment.trim()
        : undefined;
    const consumerImpact =
      typeof rf.consumerImpact === 'string' && rf.consumerImpact.trim()
        ? rf.consumerImpact.trim()
        : undefined;
    const recommendedCorrection =
      typeof rf.recommendedCorrection === 'string' && rf.recommendedCorrection.trim()
        ? rf.recommendedCorrection.trim()
        : typeof rf.correction === 'string' && rf.correction.trim()
          ? rf.correction.trim()
          : undefined;
    const contractViolationStatus =
      typeof rf.contractViolationStatus === 'string' &&
      CONTRACT_VIOLATION_STATUSES.includes(rf.contractViolationStatus.toUpperCase())
        ? rf.contractViolationStatus.toUpperCase()
        : undefined;

    const concurrencyCategory =
      typeof rf.concurrencyCategory === 'string' &&
      CONCURRENCY_CATEGORIES.includes(rf.concurrencyCategory.toUpperCase())
        ? rf.concurrencyCategory.toUpperCase()
        : undefined;
    const sharedResources = Array.isArray(rf.sharedResources) ? rf.sharedResources : undefined;
    const interleavingSequence = Array.isArray(rf.interleavingSequence)
      ? rf.interleavingSequence
      : undefined;
    const raceConditionEvidence =
      typeof rf.raceConditionEvidence === 'string' && rf.raceConditionEvidence.trim()
        ? rf.raceConditionEvidence.trim()
        : undefined;
    const protectedInvariant =
      typeof rf.protectedInvariant === 'string' && rf.protectedInvariant.trim()
        ? rf.protectedInvariant.trim()
        : undefined;
    const reproductionRequirements = Array.isArray(rf.reproductionRequirements)
      ? rf.reproductionRequirements
      : undefined;
    const rollbackPlan =
      typeof rf.rollbackPlan === 'string' && rf.rollbackPlan.trim()
        ? rf.rollbackPlan.trim()
        : undefined;
    const affectedComponents = Array.isArray(rf.affectedComponents)
      ? rf.affectedComponents
      : undefined;
    const affectedFiles = Array.isArray(rf.affectedFiles) ? rf.affectedFiles : undefined;
    const executionContext =
      typeof rf.executionContext === 'string' && rf.executionContext.trim()
        ? rf.executionContext.trim()
        : undefined;

    normalizedFindings.push({
      findingId,
      category,
      severity,
      description: desc,
      evidence: evid,
      ...(filePath ? { filePath } : {}),
      ...(lineRange !== undefined ? { lineRange } : {}),
      confidence,
      ...(title ? { title } : {}),
      ...(affectedComponent ? { affectedComponent } : {}),
      ...(threatCategory ? { threatCategory } : {}),
      ...(strideCategory ? { strideCategory } : {}),
      ...(attackPreconditions ? { attackPreconditions } : {}),
      ...(attackScenario ? { attackScenario } : {}),
      ...(potentialImpact ? { potentialImpact } : {}),
      ...(evidenceReferences ? { evidenceReferences } : {}),
      ...(recommendedMitigation ? { recommendedMitigation } : {}),
      ...(verificationRequirements ? { verificationRequirements } : {}),
      ...(residualRisk ? { residualRisk } : {}),
      ...(uncertaintyOrMissingEvidence ? { uncertaintyOrMissingEvidence } : {}),
      ...(verificationStatus ? { verificationStatus } : {}),
      ...(apiOrServiceId ? { apiOrServiceId } : {}),
      ...(contractType ? { contractType } : {}),
      ...(affectedEndpoint ? { affectedEndpoint } : {}),
      ...(requestResponseComponent ? { requestResponseComponent } : {}),
      ...(expectedContract !== undefined ? { expectedContract } : {}),
      ...(actualObservedContract !== undefined ? { actualObservedContract } : {}),
      ...(compatibilityClassification ? { compatibilityClassification } : {}),
      ...(breakingChangeAssessment ? { breakingChangeAssessment } : {}),
      ...(consumerImpact ? { consumerImpact } : {}),
      ...(recommendedCorrection ? { recommendedCorrection } : {}),
      ...(contractViolationStatus ? { contractViolationStatus } : {}),
      ...(concurrencyCategory ? { concurrencyCategory } : {}),
      ...(sharedResources ? { sharedResources } : {}),
      ...(interleavingSequence ? { interleavingSequence } : {}),
      ...(raceConditionEvidence ? { raceConditionEvidence } : {}),
      ...(protectedInvariant ? { protectedInvariant } : {}),
      ...(reproductionRequirements ? { reproductionRequirements } : {}),
      ...(rollbackPlan ? { rollbackPlan } : {}),
      ...(affectedComponents ? { affectedComponents } : {}),
      ...(affectedFiles ? { affectedFiles } : {}),
      ...(executionContext ? { executionContext } : {}),
    });
  }

  const recommendations = Array.isArray(parsed.recommendations)
    ? parsed.recommendations.filter(r => typeof r === 'string' && r.trim()).map(r => r.trim())
    : [];

  const evidence = Array.isArray(parsed.evidence) ? parsed.evidence : [];
  const artifacts = Array.isArray(parsed.artifacts) ? parsed.artifacts : [];
  const errors = Array.isArray(parsed.errors) ? parsed.errors.map(String) : [];

  const rawProposals = Array.isArray(parsed.proposals)
    ? parsed.proposals
    : Array.isArray(parsed.patchProposals)
      ? parsed.patchProposals
      : [];

  const normalizedProposals = [];
  for (const rawProp of rawProposals) {
    if (!rawProp || typeof rawProp !== 'object') continue;
    const safeParsed = PatchProposalSchema.safeParse(rawProp);
    if (safeParsed.success) {
      normalizedProposals.push(safeParsed.data);
    }
  }

  const rawRefactoringProposals = Array.isArray(parsed.refactoringProposals)
    ? parsed.refactoringProposals
    : [];

  const normalizedRefactoringProposals = [];
  for (const rawProp of rawRefactoringProposals) {
    if (!rawProp || typeof rawProp !== 'object') continue;
    const safeParsed = RefactoringProposalSchema.safeParse(rawProp);
    if (safeParsed.success) {
      normalizedRefactoringProposals.push(safeParsed.data);
    }
  }

  const rawConcurrencyFindings = Array.isArray(parsed.concurrencyFindings)
    ? parsed.concurrencyFindings
    : [];

  const normalizedConcurrencyFindings = [];
  for (const rawCf of rawConcurrencyFindings) {
    if (!rawCf || typeof rawCf !== 'object') continue;
    const safeParsed = ConcurrencyFindingSchema.safeParse(rawCf);
    if (safeParsed.success) {
      normalizedConcurrencyFindings.push(safeParsed.data);
    }
  }

  const rawReleaseFindings = Array.isArray(parsed.releaseFindings) ? parsed.releaseFindings : [];

  const normalizedReleaseFindings = [];
  for (const rawRf of rawReleaseFindings) {
    if (!rawRf || typeof rawRf !== 'object') continue;
    const safeParsed = ReleaseReadinessFindingSchema.safeParse(rawRf);
    if (safeParsed.success) {
      normalizedReleaseFindings.push(safeParsed.data);
    }
  }

  const rawReleaseReports = Array.isArray(parsed.releaseReadinessReports)
    ? parsed.releaseReadinessReports
    : parsed.releaseReadinessReport
      ? [parsed.releaseReadinessReport]
      : [];

  const normalizedReleaseReports = [];
  for (const rawRr of rawReleaseReports) {
    if (!rawRr || typeof rawRr !== 'object') continue;
    const safeParsed = ReleaseReadinessReportSchema.safeParse(rawRr);
    if (safeParsed.success) {
      normalizedReleaseReports.push(safeParsed.data);
    }
  }

  const writeProposals = Array.isArray(parsed.writeProposals) ? parsed.writeProposals : [];

  const outputHash = require('crypto').createHash('sha256').update(rawStr, 'utf8').digest('hex');

  const normalizedResult = {
    taskId,
    agentId,
    status,
    summary,
    findings: normalizedFindings,
    proposals: normalizedProposals,
    refactoringProposals: normalizedRefactoringProposals,
    concurrencyFindings: normalizedConcurrencyFindings,
    releaseFindings: normalizedReleaseFindings,
    releaseReadinessReports: normalizedReleaseReports,
    writeProposals,
    evidence,
    artifacts,
    recommendations,
    errors,
    provenance: {
      inputHash,
      outputHash,
      provider,
      model,
      durationMs,
      timestamp,
    },
    durationMs,
  };

  return AgentResultSchema.parse(normalizedResult);
}

module.exports = {
  RISK_LEVELS,
  AGENT_STATUSES,
  FINDING_CATEGORIES,
  STRIDE_CATEGORIES,
  CONTRACT_TYPES,
  REQUEST_RESPONSE_COMPONENTS,
  COMPATIBILITY_CLASSIFICATIONS,
  CONTRACT_VIOLATION_STATUSES,
  CHANGE_TYPES,
  PATCH_FORMATS,
  PROPOSAL_STATUSES,
  REFACTORING_CATEGORIES,
  CONCURRENCY_CATEGORIES,
  RELEASE_READINESS_CATEGORIES,
  RELEASE_GATE_STATUSES,
  RELEASE_VERDICTS,
  RELEASE_FINDING_STATUSES,
  LineRangeSchema,
  SafeFilePathSchema,
  InterleavingStepSchema,
  AgentFindingSchema,
  ThreatFindingSchema,
  ApiContractFindingSchema,
  PatchChangeSchema,
  PatchProposalSchema,
  RefactoringChangeSchema,
  RefactoringProposalSchema,
  ConcurrencyFindingSchema,
  ReleaseReadinessFindingSchema,
  ReleaseReadinessReportSchema,
  AgentTaskSchema,
  AgentProvenanceSchema,
  AgentResultSchema,
  validateAgentTask,
  safeValidateAgentTask,
  validateAgentResult,
  safeValidateAgentResult,
  validateAgentFinding,
  validateThreatFinding,
  validateApiContractFinding,
  validatePatchProposal,
  safeValidatePatchProposal,
  validatePatchChange,
  isDestructivePatch,
  proposalToWriteRequest,
  validateRefactoringProposal,
  safeValidateRefactoringProposal,
  validateRefactoringChange,
  isBehaviorPreservingProposal,
  refactoringToWriteRequest,
  validateConcurrencyFinding,
  safeValidateConcurrencyFinding,
  validateReleaseReadinessFinding,
  safeValidateReleaseReadinessFinding,
  validateReleaseReadinessReport,
  safeValidateReleaseReadinessReport,
  parseRawAgentOutput,
};
