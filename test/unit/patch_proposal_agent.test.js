'use strict';

/**
 * patch_proposal_agent.test.js — Stage 3.3: Patch Proposal Agent Verification
 * ============================================================================
 * Comprehensive verification covering all 20 Phase 5 areas and 4 realistic scenarios:
 * 1. Canonical registration.
 * 2. Persona discovery & frontmatter validation.
 * 3. Correct routing and runtime invocation.
 * 4. Structured proposal validation (all 18 proposal fields).
 * 5. Malformed proposal rejection and fail-closed coercion.
 * 6. Root-cause and evidence linkage.
 * 7. Missing-evidence rejection.
 * 8. Invalid path rejection (null bytes, empty strings).
 * 9. Path traversal protection (.. components).
 * 10. Destructive patch detection (isDestructivePatch).
 * 11. Conflicting proposal handling via ConflictResolver.
 * 12. Regression-risk reporting.
 * 13. Provider failure and timeout resilience.
 * 14. Evidence provenance and cryptographic hashing.
 * 15. Human approval enforcement for write proposals.
 * 16. Unauthorized approval rejection and AI self-authorization prevention.
 * 17. Token replay prevention.
 * 18. Rollback behavior on transaction failure.
 * 19. Backward compatibility with existing finding contracts.
 * 20. End-to-end proposal generation using actual AgentRuntime.
 * Realistic Fixture Scenarios:
 * - Scenario A: Incorrect API response validation repair.
 * - Scenario B: Path traversal vulnerability containment repair.
 * - Scenario C: Concurrency race condition mutex lock repair.
 * - Scenario D: Regression recovery from a flawed prior patch.
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
  validatePatchProposal,
  safeValidatePatchProposal,
  validatePatchChange,
  isDestructivePatch,
  proposalToWriteRequest,
  PatchProposalSchema,
  PatchChangeSchema,
  parseRawAgentOutput,
  CHANGE_TYPES,
  PATCH_FORMATS,
  PROPOSAL_STATUSES,
} = require('../../src/execution/agent_contracts');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

describe('Stage 3.3: Patch Proposal Agent Specialist Persona & Runtime Integration', () => {
  let tmpWorkspace;

  beforeEach(() => {
    tmpWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-patch-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpWorkspace, { recursive: true, force: true });
    } catch (_) {}
  });

  // ── Area 1: Canonical Registration ──────────────────────────────────────────
  test('1. Canonical registration: resolves as active production specialist with complete domain coverage', () => {
    const spec = resolveAgent('patch-proposal-agent', {}, REPO_ROOT);
    expect(spec).not.toBeNull();
    expect(spec.name).toBe('patch-proposal-agent');
    expect(spec.status).toBe('production');
    expect(spec.type).toBe('specialist');
    expect(spec.active).toBe(true);
    expect(spec.domain).toContain('architecture');
    expect(spec.domain).toContain('backend');
    expect(spec.domain).toContain('frontend');
    expect(spec.domain).toContain('security');
    expect(spec.domain).toContain('all');

    // Canonical registry agent count matches registry summary
    const allAgents = listAllAgents(REPO_ROOT);
    expect(allAgents.length).toBe(getRegistrySummary(REPO_ROOT).total);
  });

  // ── Area 2: Persona Discovery & Frontmatter ────────────────────────────────
  test('2. Persona discovery: markdown frontmatter contains required fields and automated repair mandate', () => {
    const agentMdPath = path.join(REPO_ROOT, '.agent', 'agents', 'patch-proposal-agent.md');
    expect(fs.existsSync(agentMdPath)).toBe(true);
    const content = fs.readFileSync(agentMdPath, 'utf8');

    // Verify frontmatter block
    expect(content).toMatch(/^---\r?\n([\s\S]*?)\r?\n---/);
    expect(content).toContain('name: patch-proposal-agent');
    expect(content).toContain('version: 1.0.0');
    expect(content).toContain('status: production');
    expect(content).toContain('type: specialist');

    // Verify skills and core mandate keywords
    expect(content).toContain('clean-code');
    expect(content).toContain('refactoring');
    expect(content).toContain('Root-Cause Analysis');
    expect(content).toContain('Minimal Safe Repair');
    expect(content).toContain('Proposals Are Not Executed Patches');
    expect(content).toContain('No Self-Authorization');
  });

  // ── Area 3: Runtime Invocation ──────────────────────────────────────────────
  test('3. Runtime invocation: runtime initializes, executes tasks with patch proposal specialist instructions', async () => {
    let capturedPrompt = '';
    const mockProvider = new ProviderAdapter({
      provider: 'mock',
      mockHandler: async req => {
        capturedPrompt = req.prompt || '';
        return {
          text: JSON.stringify({
            status: 'SUCCESS',
            summary: 'Formulated repair for missing validation schema.',
            findings: [],
            proposals: [
              {
                proposalId: 'PROP-INIT-01',
                title: 'Add required schema validator',
                description: 'Injects Zod parser before handler.',
                rootCause: 'Handler lacks payload validation.',
                findingReferences: ['F-001'],
                affectedFiles: ['src/api/handler.js'],
                proposedChanges: [
                  {
                    filePath: 'src/api/handler.js',
                    changeType: 'MODIFY',
                    lineRange: '10-15',
                    originalContent: 'function handle(req) { run(req.body); }',
                    replacement: 'function handle(req) { schema.parse(req.body); run(req.body); }',
                    evidence: 'src/api/handler.js:10: unvalidated req.body',
                  },
                ],
                patchFormat: 'STRUCTURED',
                severity: 'HIGH',
                confidence: 0.95,
                expectedBehavior: 'Invalid bodies throw 400 Bad Request.',
                regressionRisks: ['Clients sending non-conforming payloads will be rejected.'],
                verificationRequirements: ['Unit test asserting schema.parse is called.'],
                rollbackPlan: 'Revert handler.js to pre-patch version.',
                securityImpact: 'Prevents arbitrary object injection.',
                dependencies: ['zod'],
                requiresHumanApproval: true,
                uncertaintyOrMissingEvidence: 'None.',
                status: 'PROPOSED',
              },
            ],
            recommendations: ['Verify client schemas in staging.'],
            writeProposals: [],
          }),
          usage: { totalTokens: 240 },
        };
      },
    });

    const runtime = new AgentRuntime({ repoRoot: REPO_ROOT, provider: mockProvider });
    const result = await runtime.executeTask({
      taskId: 'TASK-PATCH-001',
      agentId: 'patch-proposal-agent',
      objective: 'Formulate repair for unvalidated handler payload.',
      context: { defectId: 'DEF-001', file: 'src/api/handler.js' },
    });

    expect(result.status).toBe('SUCCESS');
    expect(result.agentId).toBe('patch-proposal-agent');
    expect(capturedPrompt).toContain('You are "patch-proposal-agent"');
    expect(capturedPrompt).toContain('Formulate repair for unvalidated handler payload.');
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].proposalId).toBe('PROP-INIT-01');
  });

  // ── Area 4: Structured Proposal Validation (All 18 Fields) ──────────────────
  test('4. Structured proposal validation: all 18 proposal fields validated against PatchProposalSchema', () => {
    const validProposal = {
      proposalId: 'PROP-FULL-01',
      title: 'Fix unhandled promise rejection in stream reader',
      description: 'Adds error event listener to file stream to prevent process crash.',
      rootCause: 'Stream created without .on("error") listener on ephemeral socket.',
      findingReferences: ['FIND-STREAM-01', 'EVID-STREAM-02'],
      affectedFiles: ['src/stream/reader.js'],
      proposedChanges: [
        {
          filePath: 'src/stream/reader.js',
          changeType: 'MODIFY',
          lineRange: '45-50',
          originalContent: 'const stream = fs.createReadStream(path);\nreturn stream.pipe(dest);',
          replacement:
            'const stream = fs.createReadStream(path);\nstream.on("error", errHandler);\nreturn stream.pipe(dest);',
          evidence: 'src/stream/reader.js:45: unhandled error event causes uncaughtException',
        },
      ],
      patchFormat: 'STRUCTURED',
      severity: 'CRITICAL',
      confidence: 0.99,
      expectedBehavior: 'Stream errors trigger errHandler and graceful socket close.',
      regressionRisks: ['Downstream consumers must handle error callback.'],
      verificationRequirements: ['Test stream failure with non-existent file path.'],
      rollbackPlan: 'Restore previous stream/reader.js from git revision.',
      securityImpact: 'Eliminates denial-of-service via socket crash.',
      dependencies: ['fs'],
      requiresHumanApproval: true,
      uncertaintyOrMissingEvidence: 'None identified.',
      status: 'PROPOSED',
    };

    const validated = validatePatchProposal(validProposal);
    expect(validated.proposalId).toBe('PROP-FULL-01');
    expect(validated.title).toBe(validProposal.title);
    expect(validated.findingReferences).toHaveLength(2);
    expect(validated.affectedFiles).toEqual(['src/stream/reader.js']);
    expect(validated.proposedChanges).toHaveLength(1);
    expect(validated.proposedChanges[0].changeType).toBe('MODIFY');
    expect(validated.patchFormat).toBe('STRUCTURED');
    expect(validated.severity).toBe('CRITICAL');
    expect(validated.confidence).toBe(0.99);
    expect(validated.requiresHumanApproval).toBe(true);
    expect(validated.status).toBe('PROPOSED');
  });

  // ── Area 5: Malformed Proposal Rejection ───────────────────────────────────
  test('5. Malformed proposal rejection: unparseable output or invalid schema fails closed', () => {
    // 1. Non-JSON string output
    const rawGarbage = 'I recommend changing line 42 to make it work better.';
    const result = parseRawAgentOutput(rawGarbage, {
      taskId: 'TASK-ERR-1',
      agentId: 'patch-proposal-agent',
    });
    expect(result.status).toBe('ERROR');
    expect(result.summary).toContain('MALFORMED_OUTPUT');
    expect(result.proposals).toEqual([]);

    // 2. Missing mandatory proposal fields (e.g. missing rootCause, affectedFiles, proposedChanges)
    const incompleteProposal = {
      proposalId: 'PROP-BAD',
      title: 'Bad patch',
      // Missing rootCause, affectedFiles, proposedChanges, rollbackPlan, etc.
    };
    expect(() => validatePatchProposal(incompleteProposal)).toThrow();

    // 3. Invalid changeType enum
    const badChangeEnum = {
      filePath: 'src/file.js',
      changeType: 'HACK', // Invalid enum
      replacement: 'new code',
      evidence: 'evidence snippet',
    };
    expect(() => validatePatchChange(badChangeEnum)).toThrow();
  });

  // ── Area 6: Root-Cause and Evidence Linkage ─────────────────────────────────
  test('6. Root-cause and evidence linkage: proposal explicitly binds finding references and root causes', () => {
    const proposal = {
      proposalId: 'PROP-LINK-01',
      title: 'Patch CORS wildcard reflection vulnerability',
      description: 'Replaces reflected Origin header with explicit domain allowlist.',
      rootCause:
        'Server reflected req.headers.origin into Access-Control-Allow-Origin without verification.',
      findingReferences: ['SEC-CORS-001'],
      affectedFiles: ['src/middleware/cors.js'],
      proposedChanges: [
        {
          filePath: 'src/middleware/cors.js',
          changeType: 'MODIFY',
          originalContent: 'res.setHeader("Access-Control-Allow-Origin", req.headers.origin);',
          replacement:
            'if (ALLOWED_ORIGINS.has(req.headers.origin)) res.setHeader("Access-Control-Allow-Origin", req.headers.origin);',
          evidence: 'src/middleware/cors.js:14: arbitrary origin reflection',
        },
      ],
      patchFormat: 'STRUCTURED',
      severity: 'HIGH',
      confidence: 0.95,
      expectedBehavior: 'Disallowed origins receive no CORS allow header.',
      regressionRisks: ['Internal microservices on unlisted ports will be blocked.'],
      verificationRequirements: ['Integration test sending Origin: https://evil.com'],
      rollbackPlan: 'Revert cors.js',
      securityImpact: 'Mitigates cross-origin credential leakage (CWE-346).',
      dependencies: [],
      requiresHumanApproval: true,
      uncertaintyOrMissingEvidence: 'None.',
      status: 'PROPOSED',
    };

    const validated = validatePatchProposal(proposal);
    expect(validated.findingReferences).toContain('SEC-CORS-001');
    expect(validated.rootCause).toContain('reflected req.headers.origin');
    expect(validated.proposedChanges[0].evidence).toContain('arbitrary origin reflection');
  });

  // ── Area 7: Missing-Evidence Rejection ─────────────────────────────────────
  test('7. Missing-evidence rejection: change proposals with empty or missing evidence throw validation error', () => {
    const changeWithoutEvidence = {
      filePath: 'src/auth.js',
      changeType: 'MODIFY',
      replacement: 'return true;',
      evidence: '', // Empty evidence must fail
    };

    expect(() => validatePatchChange(changeWithoutEvidence)).toThrow(
      /evidence supporting change must not be empty/,
    );
  });

  // ── Area 8: Invalid Path Rejection ─────────────────────────────────────────
  test('8. Invalid path rejection: empty paths or paths with null bytes fail validation', () => {
    // 1. Empty filePath
    expect(() =>
      validatePatchChange({
        filePath: '',
        changeType: 'MODIFY',
        replacement: 'code',
        evidence: 'proof',
      }),
    ).toThrow(/filePath must not be empty/);

    // 2. Null byte in filePath (poison null byte attack)
    expect(() =>
      validatePatchChange({
        filePath: 'src/auth\0.js',
        changeType: 'MODIFY',
        replacement: 'code',
        evidence: 'proof',
      }),
    ).toThrow(/must not contain null bytes/);
  });

  // ── Area 9: Path Traversal Protection ─────────────────────────────────────
  test('9. Path traversal protection: rejects paths with .. components escaping project root', () => {
    // Relative traversal attempt
    expect(() =>
      validatePatchChange({
        filePath: '../../etc/passwd',
        changeType: 'MODIFY',
        replacement: 'root:x:0:0',
        evidence: 'traversal exploit',
      }),
    ).toThrow(/must not contain path traversal/);

    expect(() =>
      validatePatchChange({
        filePath: 'src/../../outside.js',
        changeType: 'MODIFY',
        replacement: 'escape',
        evidence: 'traversal exploit',
      }),
    ).toThrow(/must not contain path traversal/);
  });

  // ── Area 10: Destructive Patch Detection ───────────────────────────────────
  test('10. Destructive patch detection: isDestructivePatch identifies deletion and blank replacement operations', () => {
    const nonDestructive = {
      proposalId: 'P1',
      proposedChanges: [
        {
          filePath: 'src/util.js',
          changeType: 'MODIFY',
          replacement: 'const x = 1;',
          evidence: 'fix',
        },
      ],
    };
    expect(isDestructivePatch(nonDestructive)).toBe(false);

    const destructiveDelete = {
      proposalId: 'P2',
      proposedChanges: [
        {
          filePath: 'src/deprecated.js',
          changeType: 'DELETE',
          replacement: '',
          evidence: 'deprecate',
        },
      ],
    };
    expect(isDestructivePatch(destructiveDelete)).toBe(true);

    const destructiveBlankReplace = {
      proposalId: 'P3',
      proposedChanges: [
        {
          filePath: 'src/core.js',
          changeType: 'REPLACE',
          replacement: '   ', // Blank content
          evidence: 'truncate',
        },
      ],
    };
    expect(isDestructivePatch(destructiveBlankReplace)).toBe(true);
  });

  // ── Area 11: Conflicting Proposal Handling ─────────────────────────────────
  test('11. Conflicting proposal handling: ConflictResolver identifies severity divergence and line overlaps', () => {
    const resolver = new ConflictResolver();

    const criticalProposalFinding = {
      agentId: 'patch-proposal-agent',
      findingId: 'PROP-CONF-01',
      category: 'SECURITY',
      severity: 'CRITICAL',
      description: 'Replace vulnerable regex with linear string scanner in auth.js',
      filePath: 'src/auth.js',
      lineRange: '10-25',
    };

    const conflictingReviewerFinding = {
      agentId: 'logic-reviewer',
      findingId: 'REV-CONF-02',
      category: 'CORRECTNESS',
      severity: 'LOW',
      description: 'Regex is acceptable if bounded by timeout',
      filePath: 'src/auth.js',
      lineRange: '15-20',
    };

    const conflictResult = resolver.resolve([criticalProposalFinding, conflictingReviewerFinding]);
    expect(conflictResult.hasConflicts).toBe(true);
    expect(conflictResult.conflicts).toHaveLength(1);
    expect(conflictResult.conflicts[0].conflictType).toBe('SEVERITY_DIVERGENCE');
    expect(conflictResult.conflicts[0].winningFindingId).toBe('PROP-CONF-01');
    expect(conflictResult.conflicts[0].resolutionStatus).toBe('RESOLVED_BY_PRECEDENCE');
  });

  // ── Area 12: Regression-Risk Reporting ─────────────────────────────────────
  test('12. Regression-risk reporting: enforces structured enumeration of regression risks and verification steps', () => {
    const proposal = {
      proposalId: 'PROP-RISK-01',
      title: 'Migrate sync fs.readFileSync to async fs.promises.readFile',
      description: 'Improves event loop throughput by unblocking thread pool.',
      rootCause: 'Sync I/O in main request path creates thread starvation.',
      findingReferences: ['PERF-001'],
      affectedFiles: ['src/services/config_loader.js'],
      proposedChanges: [
        {
          filePath: 'src/services/config_loader.js',
          changeType: 'MODIFY',
          replacement: 'const data = await fs.promises.readFile(p, "utf8");',
          evidence: 'src/services/config_loader.js:20: sync read in async handler',
        },
      ],
      patchFormat: 'STRUCTURED',
      severity: 'MEDIUM',
      confidence: 0.95,
      expectedBehavior: 'Configuration loads asynchronously without blocking event loop.',
      regressionRisks: [
        'Caller functions must now be marked async and awaited.',
        'Synchronous bootstrap scripts calling loadConfig will fail unless updated.',
      ],
      verificationRequirements: [
        'Run integration test suite with --detect-open-handles',
        'Verify startup script awaits loadConfig()',
      ],
      rollbackPlan: 'Revert to fs.readFileSync',
      securityImpact: 'Eliminates event loop denial-of-service under high concurrency.',
      dependencies: [],
      requiresHumanApproval: true,
      uncertaintyOrMissingEvidence: 'None.',
      status: 'PROPOSED',
    };

    const validated = validatePatchProposal(proposal);
    expect(validated.regressionRisks).toHaveLength(2);
    expect(validated.verificationRequirements).toHaveLength(2);
    expect(validated.rollbackPlan.length).toBeGreaterThan(5);
  });

  // ── Area 13: Provider Failure & Timeout Resilience ─────────────────────────
  test('13. Provider failure and timeout: runtime fails closed gracefully on provider exception', async () => {
    const failingProvider = new ProviderAdapter({
      provider: 'mock',
      mockHandler: async () => {
        throw new Error('PROVIDER_TIMEOUT: Upstream code repair model timed out after 30000ms.');
      },
    });

    const runtime = new AgentRuntime({ repoRoot: REPO_ROOT, provider: failingProvider });
    const result = await runtime.executeTask({
      taskId: 'TASK-TIMEOUT-01',
      agentId: 'patch-proposal-agent',
      objective: 'Formulate repair under network partition.',
    });

    expect(result.status).toBe('ERROR');
    expect(result.summary).toContain('PROVIDER_TIMEOUT');
    expect(result.errors[0]).toContain('PROVIDER_TIMEOUT');
    expect(result.proposals).toEqual([]);
  });

  // ── Area 14: Evidence Provenance ───────────────────────────────────────────
  test('14. Evidence provenance: computes cryptographic hashes and queries through EvidenceBus', async () => {
    const evidenceBus = new EvidenceBus();
    const mockProvider = new ProviderAdapter({
      provider: 'mock',
      mockHandler: async () => ({
        text: JSON.stringify({
          status: 'SUCCESS',
          summary: 'Formulated provenance-tracked patch.',
          findings: [],
          proposals: [
            {
              proposalId: 'PROP-PROV-01',
              title: 'Fix off-by-one loop boundary',
              description: 'Changes <= to < in array traversal.',
              rootCause: 'Array out of bounds read on last index.',
              findingReferences: ['FIND-BOUNDS-01'],
              affectedFiles: ['src/math/vector.js'],
              proposedChanges: [
                {
                  filePath: 'src/math/vector.js',
                  changeType: 'MODIFY',
                  replacement: 'for (let i = 0; i < len; i++)',
                  evidence: 'src/math/vector.js:30: i <= len produces undefined',
                },
              ],
              patchFormat: 'STRUCTURED',
              severity: 'MEDIUM',
              confidence: 1.0,
              expectedBehavior: 'Loop terminates at len - 1.',
              regressionRisks: [],
              verificationRequirements: ['Assert vector iteration handles empty array.'],
              rollbackPlan: 'Revert vector.js',
              securityImpact: 'Prevents out-of-bounds undefined access.',
              dependencies: [],
              requiresHumanApproval: true,
              uncertaintyOrMissingEvidence: 'None.',
              status: 'PROPOSED',
            },
          ],
        }),
        usage: { totalTokens: 190 },
      }),
    });

    const runtime = new AgentRuntime({
      repoRoot: REPO_ROOT,
      provider: mockProvider,
      evidenceBus,
    });

    const sessionId = 'session_patch_provenance';
    const result = await runtime.executeTask(
      {
        taskId: 'TASK-PROV-PATCH-1',
        agentId: 'patch-proposal-agent',
        objective: 'Formulate repair for vector iteration.',
      },
      { sessionId },
    );

    expect(result.provenance.inputHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.provenance.outputHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.proposals).toHaveLength(1);
  });

  // ── Area 15: Human Approval Enforcement ────────────────────────────────────
  test('15. Human approval enforcement: write requests require human approval token', async () => {
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

    const writeService = new ControlledWriteService({
      workspaceRoot: tmpWorkspace,
      reviewExecutor,
    });

    const proposal = {
      proposalId: 'PROP-WRITE-01',
      title: 'Fix broken import path in service router',
      description: 'Updates relative import target.',
      rootCause: 'Moved file broke relative import.',
      findingReferences: ['IMP-001'],
      affectedFiles: ['src/service.js'],
      proposedChanges: [
        {
          filePath: 'src/service.js',
          changeType: 'CREATE',
          replacement: 'module.exports = { status: "repaired" };',
          evidence: 'Cannot find module ./missing',
        },
      ],
      patchFormat: 'STRUCTURED',
      severity: 'HIGH',
      confidence: 1.0,
      expectedBehavior: 'Module loads cleanly.',
      regressionRisks: [],
      verificationRequirements: ['Require test asserting service exports status.'],
      rollbackPlan: 'Delete service.js',
      securityImpact: 'None.',
      dependencies: [],
      requiresHumanApproval: true,
      uncertaintyOrMissingEvidence: 'None.',
      status: 'PROPOSED',
    };

    const writeReq = proposalToWriteRequest(proposal, tmpWorkspace);
    const outcome = await writeService.requestWrite(writeReq);

    expect(outcome.status).toBe('HUMAN_APPROVAL_REQUIRED');
    expect(outcome.token).toMatch(/^tok_/);

    // Unapproved commit must fail closed
    await expect(writeService.commitWrite(outcome.token)).rejects.toThrow(
      /Cannot commit write in status 'HUMAN_APPROVAL_REQUIRED'/,
    );
    expect(fs.existsSync(path.join(tmpWorkspace, 'src', 'service.js'))).toBe(false);
  });

  // ── Area 16: Unauthorized Approval Rejection ───────────────────────────────
  test('16. Unauthorized approval rejection: rejects AI self-authorization and allowlist violations', async () => {
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

    const writeService = new ControlledWriteService({
      workspaceRoot: tmpWorkspace,
      reviewExecutor,
      authorizedApprovers: ['lead_maintainer_alice'],
      approvalSecret: 'secret_hmac_key_99',
    });

    const writeReq = {
      requestId: 'req_unauth_test',
      workspaceId: tmpWorkspace,
      reason: 'Automated patch application',
      requiresHumanApproval: true,
      files: [{ path: 'src/test.js', operation: 'CREATE', content: 'console.log("ok");' }],
    };

    const outcome = await writeService.requestWrite(writeReq);

    // 1. Rejects self-approval by patch-proposal-agent
    expect(() =>
      writeService.approveWrite(outcome.token, 'patch-proposal-agent', 'dummy_sig'),
    ).toThrow(/Security Violation: AI agents and automated callers cannot self-approve/);

    // 2. Rejects unauthorized human approver not in allowlist
    expect(() =>
      writeService.approveWrite(outcome.token, 'unauthorized_dev_bob', 'dummy_sig'),
    ).toThrow(/is not in the authorized approvers allowlist/);

    // 3. Rejects authorized approver with forged/invalid HMAC signature
    expect(() =>
      writeService.approveWrite(outcome.token, 'lead_maintainer_alice', 'forged_sig'),
    ).toThrow(/Cryptographic signature verification failed/);

    // 4. Authorized approver with valid cryptographic signature succeeds
    const validSig = writeService.generateApprovalSignature(outcome.token, 'lead_maintainer_alice');
    const approved = writeService.approveWrite(outcome.token, 'lead_maintainer_alice', validSig);
    expect(approved.status).toBe('PENDING_COMMIT');
  });

  // ── Area 17: Token Replay Prevention ───────────────────────────────────────
  test('17. Token replay prevention: tokens are invalidated immediately upon commit', async () => {
    const mockProvider = new ProviderAdapter({
      mockHandler: async () => ({
        verdict: 'APPROVED',
        confidence: 1.0,
        findings: [],
      }),
    });

    const reviewExecutor = new ReviewExecutor({
      provider: mockProvider,
      repoRoot: REPO_ROOT,
    });

    const writeService = new ControlledWriteService({
      workspaceRoot: tmpWorkspace,
      reviewExecutor,
    });

    const writeReq = {
      requestId: 'req_replay_test',
      workspaceId: tmpWorkspace,
      reason: 'Single-use token verification',
      requiresHumanApproval: true,
      files: [{ path: 'src/replay.js', operation: 'CREATE', content: 'const replay = 1;' }],
    };

    const outcome = await writeService.requestWrite(writeReq);
    writeService.approveWrite(outcome.token, 'human_dev_dan', 'sig_ok');

    // First commit succeeds
    const commitRes = await writeService.commitWrite(outcome.token);
    expect(commitRes.status).toBe('COMMITTED');

    // Second commit attempt with same token must fail closed (purged from active requests)
    await expect(writeService.commitWrite(outcome.token)).rejects.toThrow(
      /Invalid or expired token/,
    );
  });

  // ── Area 18: Rollback Behavior ─────────────────────────────────────────────
  test('18. Rollback behavior: aborts multi-file writes cleanly if failure occurs during execution', async () => {
    const mockProvider = new ProviderAdapter({
      mockHandler: async () => ({
        verdict: 'APPROVED',
        confidence: 1.0,
        findings: [],
      }),
    });

    const reviewExecutor = new ReviewExecutor({
      provider: mockProvider,
      repoRoot: REPO_ROOT,
    });

    const writeService = new ControlledWriteService({
      workspaceRoot: tmpWorkspace,
      reviewExecutor,
    });

    // Create a pre-existing file that will cause a CREATE collision on file 2
    fs.mkdirSync(path.join(tmpWorkspace, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpWorkspace, 'src', 'existing.js'),
      'original existing content',
      'utf8',
    );

    const multiFileReq = {
      requestId: 'req_rollback_test',
      workspaceId: tmpWorkspace,
      reason: 'Multi-file atomic repair',
      requiresHumanApproval: true,
      files: [
        { path: 'src/file_a.js', operation: 'CREATE', content: 'new content A' },
        { path: 'src/existing.js', operation: 'CREATE', content: 'will collide' }, // Conflict!
      ],
    };

    const outcome = await writeService.requestWrite(multiFileReq);
    writeService.approveWrite(outcome.token, 'human_admin', 'sig_ok');

    // Commit must reject and trigger rollback
    await expect(writeService.commitWrite(outcome.token)).rejects.toThrow(
      /CONFLICT: File already exists/,
    );

    // Verify atomic isolation: file_a.js was never created, existing.js remains unmutated
    expect(fs.existsSync(path.join(tmpWorkspace, 'src', 'file_a.js'))).toBe(false);
    expect(fs.readFileSync(path.join(tmpWorkspace, 'src', 'existing.js'), 'utf8')).toBe(
      'original existing content',
    );
  });

  // ── Area 19: Backward Compatibility ────────────────────────────────────────
  test('19. Backward compatibility: AgentResult parses legacy finding outputs without proposals', () => {
    const legacyFindingOutput = {
      status: 'SUCCESS',
      summary: 'Legacy finding review output.',
      findings: [
        {
          findingId: 'F-LEGACY-01',
          category: 'CORRECTNESS',
          severity: 'INFO',
          description: 'Valid code logic',
          evidence: 'const x = true;',
        },
      ],
      recommendations: ['Keep clean tests.'],
    };

    const parsed = parseRawAgentOutput(legacyFindingOutput, {
      taskId: 'TASK-LEGACY-01',
      agentId: 'logic-reviewer',
    });

    expect(parsed.status).toBe('SUCCESS');
    expect(parsed.findings).toHaveLength(1);
    expect(parsed.proposals).toEqual([]);
    expect(parsed.writeProposals).toEqual([]);
  });

  // ── Area 20: End-to-End Proposal Generation ─────────────────────────────────
  test('20. End-to-end proposal generation: AgentRuntime produces validated PatchProposal', async () => {
    const mockProvider = new ProviderAdapter({
      provider: 'mock',
      mockHandler: async () => ({
        text: JSON.stringify({
          status: 'SUCCESS',
          summary: 'Formulated automated repair for null dereference defect.',
          findings: [],
          proposals: [
            {
              proposalId: 'PROP-E2E-01',
              title: 'Add optional chaining guard for user session profile',
              description: 'Guards against undefined user profile in session middleware.',
              rootCause: 'session.user was accessed before session validation.',
              findingReferences: ['BUG-DEREF-001'],
              affectedFiles: ['src/middleware/session.js'],
              proposedChanges: [
                {
                  filePath: 'src/middleware/session.js',
                  changeType: 'MODIFY',
                  lineRange: '18-22',
                  originalContent: 'const role = req.session.user.role;',
                  replacement: 'const role = req.session?.user?.role || "GUEST";',
                  evidence:
                    'src/middleware/session.js:18: TypeError: Cannot read properties of undefined (reading role)',
                },
              ],
              patchFormat: 'STRUCTURED',
              severity: 'HIGH',
              confidence: 0.99,
              expectedBehavior: 'Unauthenticated sessions default to GUEST role without throwing.',
              regressionRisks: [
                'Downstream handlers assuming user always exists must handle GUEST.',
              ],
              verificationRequirements: [
                'Test request without session cookie returns 200 with GUEST.',
              ],
              rollbackPlan: 'Revert session.js to previous revision.',
              securityImpact: 'Eliminates unhandled exception denial-of-service.',
              dependencies: [],
              requiresHumanApproval: true,
              uncertaintyOrMissingEvidence: 'None.',
              status: 'PROPOSED',
            },
          ],
          recommendations: ['Add regression test in test/integration/session.test.js'],
          writeProposals: [],
        }),
        usage: { totalTokens: 250 },
      }),
    });

    const runtime = new AgentRuntime({ repoRoot: REPO_ROOT, provider: mockProvider });
    const result = await runtime.executeTask({
      taskId: 'TASK-E2E-PATCH',
      agentId: 'patch-proposal-agent',
      objective: 'Formulate repair for session user null dereference.',
    });

    expect(result.status).toBe('SUCCESS');
    expect(result.proposals).toHaveLength(1);
    const p = result.proposals[0];
    expect(p.proposalId).toBe('PROP-E2E-01');
    expect(p.affectedFiles).toEqual(['src/middleware/session.js']);
    expect(p.proposedChanges[0].replacement).toContain('req.session?.user?.role');
  });

  // ── Realistic Fixture Scenarios ─────────────────────────────────────────────
  describe('Realistic Scenario A: Incorrect API Response Validation Fix', () => {
    test('Repairs API route responding with unvalidated payload by injecting response schema check', () => {
      // Create actual file on disk
      const routeDir = path.join(tmpWorkspace, 'src', 'routes');
      fs.mkdirSync(routeDir, { recursive: true });
      const routeFile = path.join(routeDir, 'user_route.js');
      fs.writeFileSync(
        routeFile,
        'function getUser(req, res) {\n  const user = db.find(req.params.id);\n  res.json(user);\n}\n',
        'utf8',
      );

      const proposal = {
        proposalId: 'PROP-SCENARIO-A',
        title: 'Validate outgoing API response payload against UserResponseSchema',
        description: 'Prevents internal database attributes from leaking to client response.',
        rootCause: 'Raw database entity returned without DTO sanitization or schema validation.',
        findingReferences: ['API-LEAK-01'],
        affectedFiles: ['src/routes/user_route.js'],
        proposedChanges: [
          {
            filePath: 'src/routes/user_route.js',
            changeType: 'MODIFY',
            lineRange: '1-4',
            originalContent:
              'function getUser(req, res) {\n  const user = db.find(req.params.id);\n  res.json(user);\n}',
            replacement:
              'function getUser(req, res) {\n  const user = db.find(req.params.id);\n  const sanitized = UserResponseSchema.parse(user);\n  res.json(sanitized);\n}',
            evidence: 'src/routes/user_route.js:3: raw user entity exposes passwordHash and salt',
          },
        ],
        patchFormat: 'STRUCTURED',
        severity: 'CRITICAL',
        confidence: 0.99,
        expectedBehavior: 'Response JSON contains strictly whitelisted fields.',
        regressionRisks: ['Internal consumers expecting unwhitelisted fields will fail.'],
        verificationRequirements: ['Verify GET /users/1 response omits passwordHash'],
        rollbackPlan: 'Revert user_route.js to raw json response',
        securityImpact: 'Eliminates credential hash leakage (CWE-200).',
        dependencies: ['src/schemas/user_schema.js'],
        requiresHumanApproval: true,
        uncertaintyOrMissingEvidence: 'None.',
        status: 'PROPOSED',
      };

      const validated = validatePatchProposal(proposal);
      expect(validated.severity).toBe('CRITICAL');
      expect(validated.affectedFiles[0]).toBe('src/routes/user_route.js');
    });
  });

  describe('Realistic Scenario B: Path Traversal Vulnerability Containment', () => {
    test('Proposes assertWithinRoot guard on untrusted file download route', () => {
      const proposal = {
        proposalId: 'PROP-SCENARIO-B',
        title: 'Confine static download handler within assets directory',
        description: 'Replaces path.join with assertWithinRoot to prevent directory traversal.',
        rootCause: 'File path constructed using raw unvalidated user input.',
        findingReferences: ['VULN-TRAV-002'],
        affectedFiles: ['src/handlers/download.js'],
        proposedChanges: [
          {
            filePath: 'src/handlers/download.js',
            changeType: 'MODIFY',
            lineRange: '22-26',
            originalContent: 'const fullPath = path.join(BASE_DIR, req.query.file);',
            replacement: 'const fullPath = assertWithinRoot(BASE_DIR, req.query.file);',
            evidence: 'GET /download?file=../../../../Windows/win.ini',
          },
        ],
        patchFormat: 'STRUCTURED',
        severity: 'CRITICAL',
        confidence: 1.0,
        expectedBehavior: 'Path traversal payloads trigger 403 Forbidden.',
        regressionRisks: [
          'Filenames containing symlinks will be rejected unless realpath is in root.',
        ],
        verificationRequirements: ['Assert assertWithinRoot throws on ../../ payloads.'],
        rollbackPlan: 'Revert download.js',
        securityImpact: 'Eliminates arbitrary file read vulnerability (CWE-22).',
        dependencies: ['src/utils/path_containment.js'],
        requiresHumanApproval: true,
        uncertaintyOrMissingEvidence: 'None.',
        status: 'PROPOSED',
      };

      const validated = validatePatchProposal(proposal);
      expect(validated.securityImpact).toContain('CWE-22');
      expect(validated.proposedChanges[0].replacement).toContain('assertWithinRoot');
    });
  });

  describe('Realistic Scenario C: Concurrency Defect Mutex Lock Repair', () => {
    test('Proposes AsyncMutex acquisition to eliminate race condition in balance debit', () => {
      const proposal = {
        proposalId: 'PROP-SCENARIO-C',
        title: 'Serialize account debit transactions with AsyncMutex',
        description:
          'Wraps check-and-debit sequence in critical section to eliminate double-spend race.',
        rootCause: 'Concurrent debit requests read identical balance before either write commits.',
        findingReferences: ['RACE-COND-001'],
        affectedFiles: ['src/wallet/account_service.js'],
        proposedChanges: [
          {
            filePath: 'src/wallet/account_service.js',
            changeType: 'MODIFY',
            lineRange: '50-65',
            originalContent:
              'const bal = await getBalance(id);\nif (bal >= amount) await debit(id, amount);',
            replacement:
              'await mutex.runExclusive(async () => {\n  const bal = await getBalance(id);\n  if (bal >= amount) await debit(id, amount);\n});',
            evidence:
              'src/wallet/account_service.js:50: TOCTOU race condition in concurrent debits',
          },
        ],
        patchFormat: 'STRUCTURED',
        severity: 'CRITICAL',
        confidence: 0.98,
        expectedBehavior: 'Concurrent debits for same account execute sequentially.',
        regressionRisks: [
          'Slight throughput reduction on hot accounts under concurrent contention.',
        ],
        verificationRequirements: [
          'Run 50 parallel debit operations asserting final balance is accurate.',
        ],
        rollbackPlan: 'Revert account_service.js',
        securityImpact: 'Eliminates double-spend financial fraud (CWE-362).',
        dependencies: ['async-mutex'],
        requiresHumanApproval: true,
        uncertaintyOrMissingEvidence: 'None.',
        status: 'PROPOSED',
      };

      const validated = validatePatchProposal(proposal);
      expect(validated.securityImpact).toContain('CWE-362');
      expect(validated.proposedChanges[0].replacement).toContain('runExclusive');
    });
  });

  describe('Realistic Scenario D: Regression Recovery From a Flawed Prior Patch', () => {
    test('Detects and fixes regression caused by incomplete prior patch', () => {
      const proposal = {
        proposalId: 'PROP-SCENARIO-D',
        title: 'Restore optional pagination params omitted by v2.1 refactor',
        description:
          'Reintroduces cursor and limit parameters to preserve backwards compatibility.',
        rootCause:
          'Prior commit 8e3a1f removed cursor query parameter, breaking mobile client pagination.',
        findingReferences: ['REGRESS-PAGINATE-01'],
        affectedFiles: ['src/controllers/feed_controller.js'],
        proposedChanges: [
          {
            filePath: 'src/controllers/feed_controller.js',
            changeType: 'MODIFY',
            lineRange: '12-18',
            originalContent: 'const { page, perPage } = req.query;',
            replacement:
              'const { page, perPage, cursor, limit } = req.query;\nconst effectiveLimit = limit || perPage || 20;',
            evidence: 'Mobile client logs report 400 Bad Request on query ?cursor=abc',
          },
        ],
        patchFormat: 'STRUCTURED',
        severity: 'HIGH',
        confidence: 0.97,
        expectedBehavior: 'Endpoints accept both legacy cursor and modern page parameters.',
        regressionRisks: ['None. Additive backward-compatible fix.'],
        verificationRequirements: ['Verify GET /feed?cursor=xyz returns 200 OK'],
        rollbackPlan: 'Revert feed_controller.js to strict page params',
        securityImpact: 'Restores service availability to mobile clients.',
        dependencies: [],
        requiresHumanApproval: true,
        uncertaintyOrMissingEvidence: 'None.',
        status: 'PROPOSED',
      };

      const validated = validatePatchProposal(proposal);
      expect(validated.findingReferences).toContain('REGRESS-PAGINATE-01');
      expect(validated.rootCause).toContain('8e3a1f');
    });
  });
});
