'use strict';

/**
 * multi_agent_e2e.test.js — End-to-End Multi-Agent Orchestration & Governance Pipeline
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  AgentRuntime,
  AgentDispatcher,
  EvidenceBus,
  ConflictResolver,
  KernelScheduler,
  ControlledWriteService,
  ReviewExecutor,
  ProviderAdapter,
} = require('../../src/execution');

describe('Stage 2.1: End-to-End Multi-Agent Integration Pipeline', () => {
  let tmpDir;
  let writeService;
  const realRepoRoot = path.resolve(__dirname, '../../');

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-e2e-pipeline-'));
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.agent'), { recursive: true });

    // Seed original code file
    fs.writeFileSync(
      path.join(tmpDir, 'src', 'auth.js'),
      '// Original auth middleware\nfunction auth(req) {\n  return req.headers.token === "secret";\n}\nmodule.exports = auth;\n',
      'utf8',
    );

    const mockReviewerProvider = new ProviderAdapter({
      mockHandler: async () => ({
        verdict: 'APPROVED',
        confidence: 0.98,
        findings: [],
      }),
    });

    const reviewExecutor = new ReviewExecutor({
      provider: mockReviewerProvider,
      repoRoot: realRepoRoot,
    });

    writeService = new ControlledWriteService({
      workspaceRoot: tmpDir,
      reviewExecutor,
    });
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  });

  test('executes complete 13-step multi-agent orchestration and human-gated write lifecycle', async () => {
    // 1. Setup multi-provider execution mock
    const provider = new ProviderAdapter({
      mockHandler: async req => {
        if (req.prompt.includes('Task ID: task_sec')) {
          return {
            status: 'SUCCESS',
            summary: 'Security vulnerability identified in token comparison',
            findings: [
              {
                findingId: 'SEC-CRIT-1',
                category: 'SECURITY',
                severity: 'CRITICAL',
                description: 'Timing attack on plain string token comparison',
                evidence: 'return req.headers.token === "secret"',
                filePath: 'src/auth.js',
                lineRange: '2-4',
                confidence: 0.99,
              },
            ],
            writeProposals: [
              {
                operation: 'MODIFY',
                path: 'src/auth.js',
                content:
                  '// Constant-time auth\nconst crypto = require("crypto");\nfunction auth(req) {\n  return crypto.timingSafeEqual(Buffer.from(req.headers.token || ""), Buffer.from("secret"));\n}\nmodule.exports = auth;\n',
              },
            ],
            recommendations: ['Replace equality check with timingSafeEqual'],
            totalTokens: 120,
          };
        }

        if (req.prompt.includes('Task ID: task_perf')) {
          return {
            status: 'SUCCESS',
            summary: 'String comparison benchmarked with low overhead',
            findings: [
              {
                findingId: 'PERF-OK-1',
                category: 'PERFORMANCE',
                severity: 'INFO',
                description: '=== comparison is sub-microsecond in V8 engine',
                evidence: 'req.headers.token === "secret"',
                filePath: 'src/auth.js',
                lineRange: '3-4',
                confidence: 0.9,
              },
            ],
            recommendations: ['Preserve fast path'],
            totalTokens: 90,
          };
        }

        if (req.prompt.includes('Task ID: task_test')) {
          return {
            status: 'SUCCESS',
            summary: 'Unit test suite generated for timing-safe equality',
            findings: [],
            recommendations: ['Integrate into CI'],
            totalTokens: 75,
          };
        }

        if (req.prompt.includes('Task ID: task_doc')) {
          return {
            status: 'SUCCESS',
            summary: 'Architecture Decision Record documented',
            findings: [],
            recommendations: ['Publish to docs'],
            totalTokens: 60,
          };
        }

        return {
          status: 'SUCCESS',
          summary: 'Default mock response',
          findings: [],
        };
      },
    });

    const evidenceBus = new EvidenceBus();
    const scheduler = new KernelScheduler({ maxConcurrentTasks: 4 });
    const conflictResolver = new ConflictResolver();
    const runtime = new AgentRuntime({
      repoRoot: realRepoRoot,
      provider,
      scheduler,
      evidenceBus,
      writeService,
    });
    const dispatcher = new AgentDispatcher({
      runtime,
      conflictResolver,
      evidenceBus,
    });

    // 2. Submit multi-task DAG
    // Wave 0: task_sec (security-auditor) & task_perf (backend-specialist) [CONCURRENT]
    // Wave 1: task_test (test-coverage-reviewer) depends on [task_sec]
    // Wave 2: task_doc (documentation-writer) depends on [task_test]
    const tasks = [
      {
        taskId: 'task_sec',
        agentId: 'security-auditor',
        objective: 'Audit token verification security in src/auth.js',
        riskLevel: 'CRITICAL',
      },
      {
        taskId: 'task_perf',
        agentId: 'backend-specialist',
        objective: 'Benchmark token comparison overhead in src/auth.js',
        riskLevel: 'LOW',
      },
      {
        taskId: 'task_test',
        agentId: 'test-coverage-reviewer',
        objective: 'Create verification test cases for security fix',
        dependencies: ['task_sec'],
        riskLevel: 'MEDIUM',
      },
      {
        taskId: 'task_doc',
        agentId: 'documentation-writer',
        objective: 'Draft security advisory ADR',
        dependencies: ['task_test'],
        riskLevel: 'LOW',
      },
    ];

    const report = await dispatcher.dispatch(tasks);

    // 3. Verify DAG dispatch results & canonical resolution
    expect(report.status).toBe('SUCCESS');
    expect(report.totalTasks).toBe(4);
    expect(report.completedTasks).toBe(4);
    expect(report.failedTasks).toBe(0);
    expect(report.blockedTasks).toBe(0);

    // Verify task results
    const secRes = report.results['task_sec'];
    const perfRes = report.results['task_perf'];
    const testRes = report.results['task_test'];
    const docRes = report.results['task_doc'];

    expect(secRes.agentId).toBe('security-auditor');
    expect(perfRes.agentId).toBe('backend-specialist');
    expect(testRes.agentId).toBe('test-coverage-reviewer');
    expect(docRes.agentId).toBe('documentation-writer');

    // 4. Verify evidence envelope & provenance
    const sessionEvidence = evidenceBus.createSession(report.sessionId);
    const recordedFindings = sessionEvidence.getFindings();
    expect(recordedFindings.length).toBeGreaterThanOrEqual(2);
    for (const f of recordedFindings) {
      expect(f.provenanceHash).toHaveLength(64);
      expect(f.sessionId).toBe(report.sessionId);
    }

    // 5. Verify cross-agent conflict detection
    expect(report.hasConflicts).toBe(true);
    expect(report.conflicts).toHaveLength(1);
    const conf = report.conflicts[0];
    expect(conf.filePath).toBe('src/auth.js');
    expect(conf.agents).toContain('security-auditor');
    expect(conf.agents).toContain('backend-specialist');
    expect(conf.resolutionStatus).toBe('RESOLVED_BY_PRECEDENCE');
    expect(conf.winningFindingId).toBe('SEC-CRIT-1');

    // 6. Verify Human Approval Gate & Staged Write Proposal
    const writeArtifact = secRes.artifacts.find(a => a.type === 'CONTROLLED_WRITE_PROPOSAL');
    expect(writeArtifact).toBeDefined();
    expect(writeArtifact.requiresHumanApproval).toBe(true);
    const token = writeArtifact.token;
    expect(token.startsWith('tok_')).toBe(true);

    // INVARIANT: Unapproved write proposal MUST NOT have changed file on disk!
    const onDiskBeforeApproval = fs.readFileSync(path.join(tmpDir, 'src', 'auth.js'), 'utf8');
    expect(onDiskBeforeApproval).toContain('return req.headers.token === "secret"');
    expect(onDiskBeforeApproval).not.toContain('timingSafeEqual');

    // 7. Human Approves Write Transaction
    writeService.approveWrite(token, 'security_lead_architect', 'sig_lead_verified_123');

    // 8. Commit Write Transaction
    const commitOutcome = await writeService.commitWrite(token);
    expect(commitOutcome.status).toBe('COMMITTED');

    // INVARIANT: Approved and committed write is now safely persisted on disk!
    const onDiskAfterCommit = fs.readFileSync(path.join(tmpDir, 'src', 'auth.js'), 'utf8');
    expect(onDiskAfterCommit).toContain('timingSafeEqual');

    // 9. Verify Rollback Mechanism
    // Propose an invalid write on a conflicting file to test rollback
    fs.writeFileSync(path.join(tmpDir, 'src', 'rollback_test.js'), 'initial clean state', 'utf8');
    const rollbackReq = {
      requestId: 'req_rollback_demo',
      workspaceId: tmpDir,
      reason: 'Batch with intentional collision',
      requiresHumanApproval: true,
      files: [
        {
          path: 'src/rollback_test.js',
          operation: 'MODIFY',
          content: 'mutated state',
        },
        {
          path: 'src/rollback_test.js',
          operation: 'CREATE', // Invalid: already exists! Triggers rollback
          content: 'collision',
        },
      ],
    };

    // Should fail validation before dirtying disk
    await expect(writeService.requestWrite(rollbackReq)).rejects.toThrow(/Duplicate file path/);
    const rollbackDiskContent = fs.readFileSync(
      path.join(tmpDir, 'src', 'rollback_test.js'),
      'utf8',
    );
    expect(rollbackDiskContent).toBe('initial clean state');
  });

  test('cascading failure blocks downstream dependencies while independent tasks continue', async () => {
    const provider = new ProviderAdapter({
      mockHandler: async req => {
        if (req.prompt.includes('Task ID: task_failing_root')) {
          return {
            status: 'FAILURE',
            summary: 'Root build task failed with syntax error',
            findings: [],
            errors: ['SyntaxError: Unexpected token'],
          };
        }
        return {
          status: 'SUCCESS',
          summary: 'Independent task succeeded',
          findings: [],
        };
      },
    });

    const runtime = new AgentRuntime({ repoRoot: realRepoRoot, provider });
    const dispatcher = new AgentDispatcher({ runtime });

    const tasks = [
      {
        taskId: 'task_failing_root',
        agentId: 'backend-specialist',
        objective: 'Compile core',
      },
      {
        taskId: 'task_dependent_child',
        agentId: 'test-coverage-reviewer',
        objective: 'Test core',
        dependencies: ['task_failing_root'],
      },
      {
        taskId: 'task_independent_peer',
        agentId: 'documentation-writer',
        objective: 'Generate docs',
      },
    ];

    const report = await dispatcher.dispatch(tasks);

    expect(report.status).toBe('PARTIAL_SUCCESS');
    expect(report.completedTasks).toBe(1); // task_independent_peer
    expect(report.failedTasks).toBe(1); // task_failing_root
    expect(report.blockedTasks).toBe(1); // task_dependent_child

    expect(report.results['task_failing_root'].status).toBe('FAILURE');
    expect(report.results['task_dependent_child'].status).toBe('BLOCKED');
    expect(report.results['task_dependent_child'].summary).toContain('CASCADING_FAILURE');
    expect(report.results['task_independent_peer'].status).toBe('SUCCESS');
  });

  test('dispatched wave respects AbortSignal cancellation', async () => {
    const provider = new ProviderAdapter({
      mockHandler: async () => ({
        status: 'SUCCESS',
        summary: 'Done',
        findings: [],
      }),
    });

    const runtime = new AgentRuntime({ repoRoot: realRepoRoot, provider });
    const dispatcher = new AgentDispatcher({ runtime });

    const ac = new AbortController();
    // Cancel immediately
    ac.abort();

    const tasks = [
      { taskId: 't_abort_1', agentId: 'backend-specialist', objective: 'A' },
      { taskId: 't_abort_2', agentId: 'documentation-writer', objective: 'B' },
    ];

    const report = await dispatcher.dispatch(tasks, { signal: ac.signal });

    expect(report.results['t_abort_1'].status).toBe('CANCELLED');
    expect(report.results['t_abort_2'].status).toBe('CANCELLED');
  });

  test('end-to-end resilience against invalid provider output', async () => {
    // Provider returns malformed non-JSON text
    const provider = new ProviderAdapter({
      mockHandler: async () => ({
        status: 'SUCCESS',
        text: '<<<NOT JSON AT ALL>>> Unexpected token error string',
      }),
    });

    const evidenceBus = new EvidenceBus();
    const runtime = new AgentRuntime({ repoRoot: realRepoRoot, provider, evidenceBus });
    const dispatcher = new AgentDispatcher({ runtime, evidenceBus });

    const tasks = [
      {
        taskId: 't_garbled',
        agentId: 'backend-specialist',
        objective: 'Analyze legacy module',
      },
    ];

    const report = await dispatcher.dispatch(tasks);

    // Pipeline must not crash; result should be fail-closed ERROR
    expect(report.status).toBe('FAILURE');
    const res = report.results['t_garbled'];
    expect(res.status).toBe('ERROR');
    expect(res.summary).toContain('MALFORMED_OUTPUT');
    expect(res.provenance.outputHash).toBeDefined();

    // Provenance must still be recorded in evidence bus
    const session = evidenceBus.createSession(report.sessionId);
    const metrics = session.getMetrics();
    expect(metrics.length).toBeGreaterThan(0);
  });

  test('end-to-end provider timeout handling in multi-task execution', async () => {
    const provider = new ProviderAdapter({
      mockHandler: async req => {
        if (req.prompt.includes('Task ID: t_slow')) {
          // Intentionally delay longer than task timeout
          await new Promise(r => setTimeout(r, 200));
        }
        return {
          status: 'SUCCESS',
          summary: 'Fast task complete',
          findings: [],
        };
      },
    });

    const scheduler = new KernelScheduler({ maxConcurrentTasks: 2 });
    const runtime = new AgentRuntime({ repoRoot: realRepoRoot, provider, scheduler });
    const dispatcher = new AgentDispatcher({ runtime });

    const tasks = [
      {
        taskId: 't_slow',
        agentId: 'backend-specialist',
        objective: 'Slow task that times out',
        timeoutMs: 40,
      },
      {
        taskId: 't_fast',
        agentId: 'documentation-writer',
        objective: 'Fast task that succeeds concurrently',
      },
    ];

    const report = await dispatcher.dispatch(tasks);

    expect(report.status).toBe('PARTIAL_SUCCESS');
    expect(report.results['t_slow'].status).toBe('ERROR');
    expect(report.results['t_slow'].summary).toContain('TASK_TIMEOUT');
    expect(report.results['t_fast'].status).toBe('SUCCESS');
  });

  test('end-to-end token budget exhaustion enforcement', async () => {
    const provider = new ProviderAdapter({
      mockHandler: async () => ({
        status: 'SUCCESS',
        summary: 'Generated verbose output',
        findings: [],
        totalTokens: 500, // consumes 500 tokens
      }),
    });

    // Session budget ceiling set to 400 tokens
    const scheduler = new KernelScheduler({
      maxConcurrentTasks: 2,
      maxTotalTokens: 400,
    });
    const runtime = new AgentRuntime({ repoRoot: realRepoRoot, provider, scheduler });
    const dispatcher = new AgentDispatcher({ runtime });

    const tasks = [
      {
        taskId: 't_tok_1',
        agentId: 'backend-specialist',
        objective: 'Step 1',
      },
      {
        taskId: 't_tok_2',
        agentId: 'documentation-writer',
        objective: 'Step 2 dependent on Step 1',
        dependencies: ['t_tok_1'],
      },
    ];

    const report = await dispatcher.dispatch(tasks);

    // Total tasks = 2: First consumes 500 tokens (breaching 400 ceiling).
    // Wave 1 dispatch of t_tok_2 fails pre-check with TOKEN_BUDGET_EXCEEDED!
    expect(report.completedTasks).toBe(1);
    expect(report.blockedTasks).toBe(1);
    expect(report.status).toBe('PARTIAL_SUCCESS');
    expect(report.results['t_tok_1'].status).toBe('SUCCESS');
    expect(report.results['t_tok_2'].status).toBe('BLOCKED');
    expect(report.results['t_tok_2'].summary).toContain('TOKEN_BUDGET_EXCEEDED');
  });
});
