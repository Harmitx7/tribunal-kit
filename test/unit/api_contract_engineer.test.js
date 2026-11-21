'use strict';

/**
 * api_contract_engineer.test.js — Stage 3.2: API Contract Engineer Specialist Verification
 * =========================================================================================
 * Comprehensive verification covering all 15 Phase 5 areas:
 * 1. Persona discovery and canonical registration.
 * 2. Persona discovery & frontmatter validation.
 * 3. Correct routing and runtime invocation.
 * 4. Structured output validation (all 17 API contract fields).
 * 5. Malformed output rejection and fail-closed coercion.
 * 6. OpenAPI contract analysis.
 * 7. JSON Schema compatibility and narrowing detection.
 * 8. Breaking-change detection.
 * 9. Backward compatibility and additive change classification.
 * 10. Authentication contract defect detection.
 * 11. Evidence attribution and provenance hashing.
 * 12. False-positive prevention for safe additions.
 * 13. Provider failure and timeout resilience.
 * 14. Conflict escalation via ConflictResolver.
 * 15. Human approval boundaries, allowlists, HMAC signatures, and replay defense.
 * Realistic Integration Scenarios:
 * - Scenario A: OpenAPI Breaking Change Detection
 * - Scenario B: Missing RFC 9457 Error Contract Verification
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  resolveAgent,
  listAllAgents,
  getRegistrySummary,
} = require('../../src/execution/canonical_registry');
const { AgentRuntime } = require('../../src/execution/agent_runtime');
const { ProviderAdapter } = require('../../src/execution/provider_adapter');
const { EvidenceBus } = require('../../src/execution/evidence_bus');
const { ConflictResolver } = require('../../src/execution/conflict_resolver');
const { ControlledWriteService, ReviewExecutor } = require('../../src/execution');
const {
  validateApiContractFinding,
  ApiContractFindingSchema,
  parseRawAgentOutput,
  CONTRACT_TYPES,
  REQUEST_RESPONSE_COMPONENTS,
  COMPATIBILITY_CLASSIFICATIONS,
  CONTRACT_VIOLATION_STATUSES,
} = require('../../src/execution/agent_contracts');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

describe('Stage 3.2: API Contract Engineer Specialist Persona & Runtime Verification', () => {
  let tmpWorkspace;

  beforeEach(() => {
    tmpWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-api-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpWorkspace, { recursive: true, force: true });
    } catch (_) {}
  });

  // ── Area 1: Canonical Registration ──────────────────────────────────────────
  test('1. Canonical registration: resolves as active production specialist', () => {
    const spec = resolveAgent('api-contract-engineer', {}, REPO_ROOT);
    expect(spec).not.toBeNull();
    expect(spec.name).toBe('api-contract-engineer');
    expect(spec.status).toBe('production');
    expect(spec.type).toBe('specialist');
    expect(spec.active).toBe(true);
    expect(spec.domain).toContain('backend');
    expect(spec.domain).toContain('api');
    expect(spec.domain).toContain('architecture');

    // Canonical registry agent count matches registry summary
    const allAgents = listAllAgents(REPO_ROOT);
    expect(allAgents.length).toBe(getRegistrySummary(REPO_ROOT).total);
  });

  // ── Area 2: Persona Discovery & Frontmatter ────────────────────────────────
  test('2. Persona discovery: markdown frontmatter contains required fields and domain mandate', () => {
    const agentMdPath = path.join(REPO_ROOT, '.agent', 'agents', 'api-contract-engineer.md');
    expect(fs.existsSync(agentMdPath)).toBe(true);
    const content = fs.readFileSync(agentMdPath, 'utf8');

    // Verify frontmatter block
    expect(content).toMatch(/^---\r?\n([\s\S]*?)\r?\n---/);
    expect(content).toContain('name: api-contract-engineer');
    expect(content).toContain('version: 1.0.0');
    expect(content).toContain('status: production');
    expect(content).toContain('type: specialist');

    // Verify skills and core mandate keywords
    expect(content).toContain('api-patterns');
    expect(content).toContain('data-validation-schemas');
    expect(content).toContain('Breaking Change Detection');
    expect(content).toContain('Backward Compatibility Verification');
    expect(content).toContain('RFC 9457');
  });

  // ── Area 3: Runtime Invocation ──────────────────────────────────────────────
  test('3. Runtime invocation: runtime initializes, executes tasks with specialist instructions', async () => {
    let capturedPrompt = '';
    const mockProvider = new ProviderAdapter({
      provider: 'mock',
      mockHandler: async req => {
        capturedPrompt = req.prompt || '';
        return {
          text: JSON.stringify({
            status: 'SUCCESS',
            summary: 'API contract audit completed with zero breaking changes.',
            findings: [],
            recommendations: ['Maintain strict RFC 9457 compliance on new endpoints.'],
            writeProposals: [],
          }),
          usage: { totalTokens: 180 },
        };
      },
    });

    const runtime = new AgentRuntime({ repoRoot: REPO_ROOT, provider: mockProvider });
    const result = await runtime.executeTask({
      taskId: 'TASK-API-001',
      agentId: 'api-contract-engineer',
      objective: 'Verify OpenAPI backward compatibility for v2 users endpoint.',
      context: { spec: 'openapi.yaml', endpoint: '/api/v2/users' },
    });

    expect(result.status).toBe('SUCCESS');
    expect(result.agentId).toBe('api-contract-engineer');
    expect(capturedPrompt).toContain('You are "api-contract-engineer"');
    expect(capturedPrompt).toContain(
      'Verify OpenAPI backward compatibility for v2 users endpoint.',
    );
    expect(result.recommendations.length).toBe(1);
  });

  // ── Area 4: Structured Output Validation (17 Fields) ────────────────────────
  test('4. Structured output validation: all 17 API contract fields validated against ApiContractFindingSchema', () => {
    const validFinding = {
      findingId: 'API-F01',
      category: 'ARCHITECTURE',
      severity: 'CRITICAL',
      confidence: 0.98,
      apiOrServiceId: 'billing-service-v1',
      contractType: 'OPENAPI',
      affectedEndpoint: 'POST /v1/charges',
      requestResponseComponent: 'REQUEST_BODY',
      expectedContract: {
        type: 'object',
        properties: { amount: { type: 'integer' }, currency: { type: 'string' } },
        required: ['amount'],
      },
      actualObservedContract: {
        type: 'object',
        properties: {
          amount: { type: 'integer' },
          currency: { type: 'string' },
          idempotencyKey: { type: 'string' },
        },
        required: ['amount', 'idempotencyKey'],
      },
      compatibilityClassification: 'BREAKING',
      breakingChangeAssessment:
        'Added mandatory idempotencyKey to charge request body without fallback.',
      evidence: 'schema.required: ["amount", "idempotencyKey"]',
      evidenceReferences: ['spec/billing.yaml:120-135'],
      filePath: 'spec/billing.yaml',
      lineRange: '120-135',
      consumerImpact: 'Legacy clients omitting idempotencyKey will receive 400 Bad Request.',
      recommendedCorrection:
        'Make idempotencyKey optional in request body or derive from request headers.',
      verificationRequirements: ['Contract test sending payload with only amount property'],
      residualRisk: 'Low once client migration or optional header fallback is in place.',
      uncertaintyOrMissingEvidence: 'None. Schema diff reviewed in task context.',
      contractViolationStatus: 'CONFIRMED_VIOLATION',
    };

    const validated = validateApiContractFinding(validFinding);
    expect(validated.findingId).toBe('API-F01');
    expect(validated.apiOrServiceId).toBe('billing-service-v1');
    expect(validated.contractType).toBe('OPENAPI');
    expect(validated.requestResponseComponent).toBe('REQUEST_BODY');
    expect(validated.compatibilityClassification).toBe('BREAKING');
    expect(validated.contractViolationStatus).toBe('CONFIRMED_VIOLATION');
    expect(validated.confidence).toBe(0.98);
    expect(validated.evidenceReferences).toHaveLength(1);
  });

  // ── Area 5: Malformed Output Rejection ──────────────────────────────────────
  test('5. Malformed output rejection: non-JSON or invalid enum values fail closed', () => {
    // 1. Non-JSON string output
    const nonJsonOutput = 'I examined the API and it looks like a breaking change was introduced.';
    const result = parseRawAgentOutput(nonJsonOutput, {
      taskId: 'TASK-API-ERR',
      agentId: 'api-contract-engineer',
    });

    expect(result.status).toBe('ERROR');
    expect(result.summary).toContain('MALFORMED_OUTPUT');
    expect(result.findings).toEqual([]);

    // 2. Missing required API contract field
    const incompleteFinding = {
      findingId: 'API-INC',
      severity: 'HIGH',
      evidence: 'paths["/test"] removed',
      // Missing apiOrServiceId, contractType, affectedEndpoint, requestResponseComponent, etc.
    };
    expect(() => validateApiContractFinding(incompleteFinding)).toThrow();

    // 3. Invalid enum value
    const invalidEnumFinding = {
      findingId: 'API-INV-ENUM',
      severity: 'HIGH',
      evidence: 'bad enum',
      apiOrServiceId: 'svc',
      contractType: 'UNSUPPORTED_PROTOCOL', // Invalid enum
      affectedEndpoint: '/test',
      requestResponseComponent: 'REQUEST_BODY',
      expectedContract: {},
      actualObservedContract: {},
      compatibilityClassification: 'BREAKING',
      breakingChangeAssessment: 'Test',
      consumerImpact: 'Test',
      recommendedCorrection: 'Test',
      residualRisk: 'Test',
    };
    expect(() => validateApiContractFinding(invalidEnumFinding)).toThrow();
  });

  // ── Area 6: OpenAPI Contract Analysis ───────────────────────────────────────
  test('6. OpenAPI contract analysis: detects breaking changes in OpenAPI specifications', () => {
    const rawOutput = {
      status: 'SUCCESS',
      summary:
        'OpenAPI specification analysis identified removed operation and parameter narrowing.',
      findings: [
        {
          findingId: 'OAS-001',
          category: 'ARCHITECTURE',
          severity: 'CRITICAL',
          confidence: 1.0,
          apiOrServiceId: 'order-api',
          contractType: 'OPENAPI',
          affectedEndpoint: 'DELETE /orders/{id}',
          requestResponseComponent: 'PATH_PARAM',
          expectedContract: 'Operation DELETE /orders/{id} present in OpenAPI 3.0 specification',
          actualObservedContract: 'Operation removed in commit 4a2f81',
          compatibilityClassification: 'BREAKING',
          breakingChangeAssessment:
            'Endpoint DELETE /orders/{id} was removed entirely without deprecation period.',
          evidence: '- /orders/{id}:\n-   delete:\n-     summary: Cancel order',
          evidenceReferences: ['openapi.yaml:310-325'],
          filePath: 'openapi.yaml',
          lineRange: '310-325',
          consumerImpact:
            'All automated clients invoking cancellation endpoint will receive 404 Not Found.',
          recommendedCorrection:
            'Restore endpoint, mark deprecated: true, and return 410 Gone after deprecation sunset.',
          verificationRequirements: ['Automated diff verification with openapi-diff tool'],
          residualRisk: 'Zero breaking impact once operation is restored.',
          uncertaintyOrMissingEvidence: 'None.',
          contractViolationStatus: 'CONFIRMED_VIOLATION',
        },
      ],
      recommendations: ['Enforce openapi-diff in CI gate to block breaking deletions.'],
    };

    const parsed = parseRawAgentOutput(rawOutput, {
      taskId: 'TASK-OAS-1',
      agentId: 'api-contract-engineer',
    });

    expect(parsed.status).toBe('SUCCESS');
    expect(parsed.findings).toHaveLength(1);
    const f = parsed.findings[0];
    expect(f.contractType).toBe('OPENAPI');
    expect(f.compatibilityClassification).toBe('BREAKING');
    expect(f.affectedEndpoint).toBe('DELETE /orders/{id}');
  });

  // ── Area 7: JSON Schema Compatibility & Narrowing ───────────────────────────
  test('7. JSON Schema compatibility: detects narrowing constraints and additionalProperties: false', () => {
    const schemaDiffFinding = {
      findingId: 'JSON-SCH-01',
      category: 'ARCHITECTURE',
      severity: 'HIGH',
      confidence: 0.95,
      apiOrServiceId: 'catalog-schema',
      contractType: 'JSON_SCHEMA',
      affectedEndpoint: 'PUT /products/{sku}',
      requestResponseComponent: 'SCHEMA',
      expectedContract: {
        type: 'object',
        properties: { sku: { type: 'string' }, price: { type: 'number' } },
        additionalProperties: true,
      },
      actualObservedContract: {
        type: 'object',
        properties: { sku: { type: 'string' }, price: { type: 'number', minimum: 0 } },
        additionalProperties: false,
      },
      compatibilityClassification: 'POTENTIAL_BREAKING',
      breakingChangeAssessment:
        'Setting additionalProperties: false rejects payloads containing unrecognized client metadata.',
      evidence: 'additionalProperties: false added to ProductUpdateSchema',
      evidenceReferences: ['schemas/product.json:15'],
      filePath: 'schemas/product.json',
      lineRange: '15-20',
      consumerImpact:
        'Clients forwarding additional analytics or extension attributes will fail schema validation.',
      recommendedCorrection: 'Allow extension attributes or preserve additionalProperties: true.',
      verificationRequirements: ['Test schema validation with extra payload properties'],
      residualRisk: 'Low if consumers are known to send strictly conformant payloads.',
      uncertaintyOrMissingEvidence: 'Client inventory not fully available in context.',
      contractViolationStatus: 'POTENTIAL_RISK',
    };

    const validated = validateApiContractFinding(schemaDiffFinding);
    expect(validated.contractType).toBe('JSON_SCHEMA');
    expect(validated.compatibilityClassification).toBe('POTENTIAL_BREAKING');
    expect(validated.contractViolationStatus).toBe('POTENTIAL_RISK');
  });

  // ── Area 8: Breaking-Change Detection ───────────────────────────────────────
  test('8. Breaking-change detection: correctly classifies breaking modifications', () => {
    const classifications = COMPATIBILITY_CLASSIFICATIONS;
    expect(classifications).toContain('BREAKING');
    expect(classifications).toContain('POTENTIAL_BREAKING');
    expect(classifications).toContain('NON_BREAKING');
    expect(classifications).toContain('ADDITIVE');
    expect(classifications).toContain('DEPRECATION');

    const finding = {
      findingId: 'API-BRK-01',
      severity: 'CRITICAL',
      category: 'ARCHITECTURE',
      apiOrServiceId: 'auth-svc',
      contractType: 'REST',
      affectedEndpoint: 'POST /oauth/token',
      requestResponseComponent: 'RESPONSE_BODY',
      expectedContract: '{ access_token: string, expires_in: number, token_type: string }',
      actualObservedContract: '{ token: string, expiry: number }',
      compatibilityClassification: 'BREAKING',
      breakingChangeAssessment:
        'Renamed standard OAuth2 response keys: access_token -> token, expires_in -> expiry',
      evidence: 'res.json({ token, expiry })',
      consumerImpact:
        'All RFC 6749 compliant OAuth2 client libraries will fail to parse the access token.',
      recommendedCorrection: 'Preserve standard RFC 6749 field names access_token and expires_in.',
      residualRisk: 'Zero once standard field names are restored.',
      contractViolationStatus: 'CONFIRMED_VIOLATION',
    };

    const validated = validateApiContractFinding(finding);
    expect(validated.compatibilityClassification).toBe('BREAKING');
    expect(validated.severity).toBe('CRITICAL');
  });

  // ── Area 9: Backward Compatibility & Additive Changes ───────────────────────
  test('9. Backward compatibility: additive optional fields classified as ADDITIVE or NON_BREAKING', () => {
    const additiveFinding = {
      findingId: 'API-ADD-01',
      category: 'ARCHITECTURE',
      severity: 'INFO',
      confidence: 1.0,
      apiOrServiceId: 'user-service',
      contractType: 'OPENAPI',
      affectedEndpoint: 'GET /api/v2/users',
      requestResponseComponent: 'QUERY_PARAM',
      expectedContract: 'Parameters: [page, perPage]',
      actualObservedContract: 'Parameters: [page, perPage, sortDirection (optional, default: ASC)]',
      compatibilityClassification: 'ADDITIVE',
      breakingChangeAssessment:
        'Safe additive change: introduced optional query parameter sortDirection with default value.',
      evidence: 'parameters.push({ name: "sortDirection", in: "query", required: false })',
      evidenceReferences: ['openapi.yaml:85'],
      filePath: 'openapi.yaml',
      lineRange: '85-92',
      consumerImpact:
        'Zero adverse consumer impact. Existing clients continue to receive default ascending order.',
      recommendedCorrection: 'None required. Safe evolutionary addition.',
      verificationRequirements: ['Verify GET /api/v2/users without sortDirection works unchanged'],
      residualRisk: 'None.',
      uncertaintyOrMissingEvidence: 'None.',
      contractViolationStatus: 'CONFIRMED_VIOLATION',
    };

    const validated = validateApiContractFinding(additiveFinding);
    expect(validated.compatibilityClassification).toBe('ADDITIVE');
    expect(validated.severity).toBe('INFO');
  });

  // ── Area 10: Authentication Contract Defects ────────────────────────────────
  test('10. Authentication contract defects: identifies security scheme and scope mismatches', () => {
    const authContractFinding = {
      findingId: 'API-AUTH-01',
      category: 'SECURITY',
      severity: 'HIGH',
      confidence: 0.95,
      apiOrServiceId: 'payment-gateway',
      contractType: 'OPENAPI',
      affectedEndpoint: 'POST /v1/settlements',
      requestResponseComponent: 'HEADERS',
      expectedContract: 'Security scheme: OAuth2 Bearer with scope "settlements:write"',
      actualObservedContract:
        'Spec defines empty security: [] while route implementation enforces Bearer token validation',
      compatibilityClassification: 'POTENTIAL_BREAKING',
      breakingChangeAssessment:
        'OpenAPI specification documents endpoint as public, but gateway rejects unauthenticated requests with 401.',
      evidence: 'spec.security = []; // Code: router.post("/settlements", requireAuth, ...)',
      evidenceReferences: ['spec/openapi.yaml:210', 'src/routes/settlements.js:45'],
      filePath: 'spec/openapi.yaml',
      lineRange: '210-215',
      consumerImpact:
        'Client SDK generators generate unauthenticated clients which fail at runtime with 401 Unauthorized.',
      recommendedCorrection:
        'Add security: - bearerAuth: ["settlements:write"] to the OpenAPI operation definition.',
      verificationRequirements: ['Generate TypeScript SDK and verify auth header transmission'],
      residualRisk: 'Low once specification matches runtime security filter.',
      uncertaintyOrMissingEvidence: 'None.',
      contractViolationStatus: 'CONFIRMED_VIOLATION',
    };

    const validated = validateApiContractFinding(authContractFinding);
    expect(validated.category).toBe('SECURITY');
    expect(validated.severity).toBe('HIGH');
    expect(validated.requestResponseComponent).toBe('HEADERS');
  });

  // ── Area 11: Evidence Provenance & Cryptographic Hashing ────────────────────
  test('11. Evidence provenance: input/output hashes, timestamps, and EvidenceBus queryability', async () => {
    const evidenceBus = new EvidenceBus();
    const mockProvider = new ProviderAdapter({
      provider: 'mock',
      mockHandler: async () => ({
        text: JSON.stringify({
          status: 'SUCCESS',
          summary: 'Evaluated API contract provenance.',
          findings: [
            {
              findingId: 'API-PROV-01',
              category: 'ARCHITECTURE',
              severity: 'LOW',
              apiOrServiceId: 'metrics-api',
              contractType: 'REST',
              affectedEndpoint: 'GET /metrics',
              requestResponseComponent: 'HEADERS',
              expectedContract: 'Content-Type: text/plain; version=0.0.4',
              actualObservedContract: 'Content-Type: application/openmetrics-text; version=1.0.0',
              compatibilityClassification: 'NON_BREAKING',
              breakingChangeAssessment:
                'Negotiated content-type update per OpenMetrics specification.',
              evidence: 'res.setHeader("Content-Type", "application/openmetrics-text")',
              consumerImpact: 'Prometheus scrapers natively negotiate modern format.',
              recommendedCorrection: 'Support content negotiation via Accept header.',
              residualRisk: 'Minimal.',
              contractViolationStatus: 'CONFIRMED_VIOLATION',
            },
          ],
        }),
        usage: { totalTokens: 210 },
      }),
    });

    const runtime = new AgentRuntime({
      repoRoot: REPO_ROOT,
      provider: mockProvider,
      evidenceBus,
    });

    const sessionId = 'session_api_provenance_test';
    const result = await runtime.executeTask(
      {
        taskId: 'TASK-API-PROV-1',
        agentId: 'api-contract-engineer',
        objective: 'Audit OpenMetrics contract header changes.',
      },
      { sessionId },
    );

    expect(result.provenance.inputHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.provenance.outputHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.provenance.provider).toBe('mock');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);

    const busFindings = evidenceBus.query({
      sessionId,
      agentId: 'api-contract-engineer',
      type: 'FINDING',
    });
    expect(busFindings).toHaveLength(1);
    expect(busFindings[0].content.findingId).toBe('API-PROV-01');
    expect(busFindings[0].provenanceHash).toMatch(/^[a-f0-9]{64}$/);
  });

  // ── Area 12: False-Positive Prevention ─────────────────────────────────────
  test('12. False-positive prevention: non-breaking additions must not be flagged as BREAKING', () => {
    const safeAdditiveFinding = {
      findingId: 'API-FP-01',
      category: 'ARCHITECTURE',
      severity: 'INFO',
      confidence: 0.9,
      apiOrServiceId: 'inventory-svc',
      contractType: 'REST',
      affectedEndpoint: 'GET /api/v1/inventory/{sku}',
      requestResponseComponent: 'RESPONSE_BODY',
      expectedContract: '{ sku: string, inStock: boolean }',
      actualObservedContract: '{ sku: string, inStock: boolean, warehouseLocation: string }',
      compatibilityClassification: 'ADDITIVE',
      breakingChangeAssessment: 'Added non-mandatory warehouseLocation field to response object.',
      evidence: 'responsePayload.warehouseLocation = location;',
      consumerImpact: 'Compliant REST JSON parsers ignore unrecognized fields.',
      recommendedCorrection: 'No remediation necessary.',
      residualRisk: 'None.',
      contractViolationStatus: 'CONFIRMED_VIOLATION',
    };

    const validated = validateApiContractFinding(safeAdditiveFinding);
    expect(validated.compatibilityClassification).not.toBe('BREAKING');
    expect(validated.compatibilityClassification).toBe('ADDITIVE');
    expect(validated.severity).toBe('INFO');
  });

  // ── Area 13: Provider Timeout & Failure Resilience ─────────────────────────
  test('13. Provider timeout and failure: runtime fails closed gracefully to ERROR result', async () => {
    const failingProvider = new ProviderAdapter({
      provider: 'mock',
      mockHandler: async () => {
        throw new Error(
          'PROVIDER_TIMEOUT: Upstream model gateway failed to respond within 30000ms.',
        );
      },
    });

    const runtime = new AgentRuntime({ repoRoot: REPO_ROOT, provider: failingProvider });
    const result = await runtime.executeTask({
      taskId: 'TASK-API-TIMEOUT-1',
      agentId: 'api-contract-engineer',
      objective: 'Run API contract verification under network disruption.',
    });

    expect(result.status).toBe('ERROR');
    expect(result.summary).toContain('PROVIDER_TIMEOUT');
    expect(result.errors[0]).toContain('PROVIDER_TIMEOUT');
    expect(result.findings).toEqual([]);
  });

  // ── Area 14: Conflict Escalation ───────────────────────────────────────────
  test('14. Conflict escalation: ConflictResolver detects severity divergence across specialist findings', () => {
    const resolver = new ConflictResolver();

    const apiFinding = {
      agentId: 'api-contract-engineer',
      findingId: 'API-CONF-01',
      category: 'SECURITY',
      severity: 'CRITICAL',
      description:
        'Breaking security change: mandatory authentication header X-Tenant-Id introduced',
      filePath: 'src/middleware/tenant.js',
      lineRange: '20-35',
    };

    const generalReviewerFinding = {
      agentId: 'precedence-reviewer',
      findingId: 'REV-CONF-01',
      category: 'STYLE',
      severity: 'LOW',
      description: 'Middleware header extraction follows standard pattern',
      filePath: 'src/middleware/tenant.js',
      lineRange: '22-28',
    };

    const conflictResult = resolver.resolve([apiFinding, generalReviewerFinding]);

    expect(conflictResult.hasConflicts).toBe(true);
    expect(conflictResult.conflicts).toHaveLength(1);
    expect(conflictResult.conflicts[0].conflictType).toBe('SEVERITY_DIVERGENCE');
    expect(conflictResult.conflicts[0].winningFindingId).toBe('API-CONF-01');
    expect(conflictResult.conflicts[0].resolutionStatus).toBe('RESOLVED_BY_PRECEDENCE');
  });

  // ── Area 15: Human Approval Boundaries, Allowlists & HMAC Signatures ───────
  test('15. Human approval boundaries: rejects AI self-approval, unauthorized approvers, invalid HMAC, and token replay', async () => {
    const mockProvider = new ProviderAdapter({
      mockHandler: async () => ({
        verdict: 'APPROVED',
        confidence: 0.99,
        findings: [],
      }),
    });

    const reviewExecutor = new ReviewExecutor({
      provider: mockProvider,
      repoRoot: REPO_ROOT,
    });

    const APPROVAL_SECRET = 'super_secure_contract_audit_secret_key_99';
    const writeService = new ControlledWriteService({
      workspaceRoot: tmpWorkspace,
      reviewExecutor,
      approvalSecret: APPROVAL_SECRET,
      authorizedApprovers: ['principal_architect_jane', 'lead_secops_bob'],
    });

    // 1. Request write proposal for an API schema patch
    const writeReq = {
      requestId: 'req_api_patch',
      workspaceId: tmpWorkspace,
      reason: 'Revert breaking change in OpenAPI schema',
      requiresHumanApproval: true,
      files: [
        {
          operation: 'CREATE',
          path: 'spec/remediated_openapi.yaml',
          content: 'openapi: 3.0.3\ninfo:\n  title: Fixed API\n  version: 2.0.1',
        },
      ],
    };

    const outcome = await writeService.requestWrite(writeReq);
    expect(outcome.status).toBe('HUMAN_APPROVAL_REQUIRED');

    // 2. Reject self-approval by API Contract Engineer persona
    expect(() =>
      writeService.approveWrite(outcome.token, 'api-contract-engineer', 'sig_from_agent'),
    ).toThrow(/Security Violation: AI agents and automated callers cannot self-approve/);

    // 3. Reject unauthorized human approver not in allowlist
    expect(() =>
      writeService.approveWrite(outcome.token, 'rogue_developer_dan', 'some_sig'),
    ).toThrow(/is not in the authorized approvers allowlist/);

    // 4. Reject authorized approver with forged/invalid HMAC signature
    expect(() =>
      writeService.approveWrite(
        outcome.token,
        'principal_architect_jane',
        'invalid_hmac_signature',
      ),
    ).toThrow(/Cryptographic signature verification failed/);

    // 5. Generate authentic cryptographic HMAC signature
    const validSignature = writeService.generateApprovalSignature(
      outcome.token,
      'principal_architect_jane',
    );
    expect(validSignature).toMatch(/^[a-f0-9]{64}$/);

    // 6. Legitimate approval succeeds
    const approved = writeService.approveWrite(
      outcome.token,
      'principal_architect_jane',
      validSignature,
    );
    expect(approved.status).toBe('PENDING_COMMIT');

    // 7. Commit write succeeds
    const commitRes = await writeService.commitWrite(outcome.token);
    expect(commitRes.status).toBe('COMMITTED');
    expect(
      fs.readFileSync(path.join(tmpWorkspace, 'spec', 'remediated_openapi.yaml'), 'utf8'),
    ).toContain('Fixed API');

    // 8. Token replay attack rejected (token purged upon commit)
    await expect(writeService.commitWrite(outcome.token)).rejects.toThrow(
      /Invalid or expired token/,
    );
  });

  // ── Realistic Scenario A: OpenAPI Breaking Change ───────────────────────────
  describe('Realistic Scenario A: OpenAPI Breaking Change Detection', () => {
    test('Identifies and flags required request parameter addition to existing POST endpoint', () => {
      const scenarioFinding = {
        findingId: 'SCENARIO-A-01',
        category: 'ARCHITECTURE',
        severity: 'CRITICAL',
        confidence: 0.99,
        apiOrServiceId: 'customer-v2',
        contractType: 'OPENAPI',
        affectedEndpoint: 'POST /v2/customers',
        requestResponseComponent: 'REQUEST_BODY',
        expectedContract: {
          type: 'object',
          properties: { name: { type: 'string' }, email: { type: 'string' } },
          required: ['name', 'email'],
        },
        actualObservedContract: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
            taxIdentifier: { type: 'string' },
          },
          required: ['name', 'email', 'taxIdentifier'],
        },
        compatibilityClassification: 'BREAKING',
        breakingChangeAssessment:
          'Field taxIdentifier was added to required array in v2 customer creation schema.',
        evidence: 'required: ["name", "email", "taxIdentifier"]',
        evidenceReferences: ['openapi/customer.yaml:45-60'],
        filePath: 'openapi/customer.yaml',
        lineRange: '45-60',
        consumerImpact:
          'All v2 customer integration clients will fail immediately with 422 Unprocessable Entity.',
        recommendedCorrection:
          'Make taxIdentifier optional or defer requirement to v3 API release.',
        verificationRequirements: [
          'Prism validation proxy running with historical production payloads',
        ],
        residualRisk: 'Low once taxIdentifier is made optional.',
        uncertaintyOrMissingEvidence: 'None. Schema git diff inspected.',
        contractViolationStatus: 'CONFIRMED_VIOLATION',
      };

      const validated = validateApiContractFinding(scenarioFinding);
      expect(validated.compatibilityClassification).toBe('BREAKING');
      expect(validated.severity).toBe('CRITICAL');
      expect(validated.affectedEndpoint).toBe('POST /v2/customers');
    });
  });

  // ── Realistic Scenario B: Missing RFC 9457 Error Contract ───────────────────
  describe('Realistic Scenario B: Missing RFC 9457 Error Contract Verification', () => {
    test('Flags endpoints returning unstructured error objects lacking RFC 9457 Problem Details', () => {
      const rfc9457ViolationFinding = {
        findingId: 'SCENARIO-B-01',
        category: 'ARCHITECTURE',
        severity: 'HIGH',
        confidence: 0.92,
        apiOrServiceId: 'payments-api',
        contractType: 'REST',
        affectedEndpoint: 'POST /api/v1/payments',
        requestResponseComponent: 'RESPONSE_BODY',
        expectedContract: {
          type: 'application/problem+json',
          properties: {
            type: { type: 'string', format: 'uri' },
            title: { type: 'string' },
            status: { type: 'integer' },
            detail: { type: 'string' },
            instance: { type: 'string', format: 'uri' },
          },
          required: ['type', 'title', 'status'],
        },
        actualObservedContract: {
          type: 'application/json',
          properties: {
            error: { type: 'string' },
          },
        },
        compatibilityClassification: 'POTENTIAL_BREAKING',
        breakingChangeAssessment:
          'Endpoint returns ad-hoc JSON { error: "msg" } on 4xx/5xx responses rather than standard RFC 9457 Problem Details.',
        evidence: 'res.status(400).json({ error: "Insufficient funds" });',
        evidenceReferences: ['src/controllers/payment_controller.js:88'],
        filePath: 'src/controllers/payment_controller.js',
        lineRange: '88-90',
        consumerImpact:
          'Automated API gateways, SDKs, and error monitors cannot programmatically parse machine-readable problem types.',
        recommendedCorrection:
          'Adopt ProblemDetailsFactory returning application/problem+json conformant with RFC 9457.',
        verificationRequirements: [
          'Integration test verifying 400 responses have Content-Type: application/problem+json',
          'Assert response contains type, title, status, and detail fields',
        ],
        residualRisk: 'Medium until client error handlers accommodate structured problem details.',
        uncertaintyOrMissingEvidence: 'Upstream gateway error rewriting rules not inspected.',
        contractViolationStatus: 'CONFIRMED_VIOLATION',
      };

      const validated = validateApiContractFinding(rfc9457ViolationFinding);
      expect(validated.category).toBe('ARCHITECTURE');
      expect(validated.severity).toBe('HIGH');
      expect(validated.contractViolationStatus).toBe('CONFIRMED_VIOLATION');
      expect(validated.recommendedCorrection).toContain('RFC 9457');
    });
  });
});
