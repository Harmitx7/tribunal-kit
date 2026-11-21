'use strict';

/**
 * agent_runtime.test.js — Unit Tests for Agent Runtime
 */

const { AgentRuntime } = require('../../src/execution/agent_runtime');
const { ProviderAdapter } = require('../../src/execution/provider_adapter');
const { EvidenceBus } = require('../../src/execution/evidence_bus');
const path = require('path');

describe('Stage 2: Agent Runtime Core Execution', () => {
  const repoRoot = path.resolve(__dirname, '../../');

  test('executes canonical specialist agent and returns validated AgentResult', async () => {
    const provider = new ProviderAdapter({
      mockHandler: async req => {
        expect(req.prompt).toContain('backend-specialist');
        return {
          status: 'SUCCESS',
          summary: 'Database schema migration validated.',
          findings: [
            {
              findingId: 'DB-1',
              category: 'CORRECTNESS',
              severity: 'LOW',
              description: 'Index recommendation on user_id',
              evidence: 'CREATE INDEX idx_user ON accounts(user_id);',
              filePath: 'db/schema.sql',
              lineRange: '12-14',
              confidence: 0.95,
            },
          ],
          recommendations: ['Apply index in next migration wave.'],
        };
      },
    });

    const evidenceBus = new EvidenceBus();
    const runtime = new AgentRuntime({ repoRoot, provider, evidenceBus });

    const result = await runtime.executeTask({
      taskId: 'task_db_01',
      agentId: 'backend-specialist',
      objective: 'Verify accounts schema migration script',
      context: 'schema contents...',
    });

    expect(result.taskId).toBe('task_db_01');
    expect(result.agentId).toBe('backend-specialist');
    expect(result.status).toBe('SUCCESS');
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].findingId).toBe('DB-1');
    expect(result.findings[0].category).toBe('CORRECTNESS');
    expect(result.findings[0].confidence).toBe(0.95);
    expect(result.provenance.inputHash).toHaveLength(64);
    expect(result.provenance.outputHash).toHaveLength(64);

    // Verify evidence bus ingestion
    const sessionFindings = evidenceBus.query({ taskId: 'task_db_01', type: 'FINDING' });
    expect(sessionFindings).toHaveLength(1);
    expect(sessionFindings[0].category).toBe('CORRECTNESS');
  });

  test('rejects experimental agent without explicit opt-in', async () => {
    const runtime = new AgentRuntime({ repoRoot });

    const result = await runtime.executeTask({
      taskId: 'task_exp',
      agentId: 'backend-security-architect',
      objective: 'Assess cryptographic bounds',
    });

    expect(result.status).toBe('ERROR');
    expect(result.summary).toContain('EXPERIMENTAL_AGENT_REJECTED');
  });

  test('allows experimental agent when explicit optIn is granted', async () => {
    const provider = new ProviderAdapter({
      mockHandler: async () => ({
        status: 'SUCCESS',
        summary: 'Experimental security evaluation completed.',
        findings: [],
      }),
    });

    const runtime = new AgentRuntime({ repoRoot, provider });
    const result = await runtime.executeTask(
      {
        taskId: 'task_exp_allow',
        agentId: 'backend-security-architect',
        objective: 'Assess cryptographic bounds',
      },
      { enableExperimental: true },
    );

    expect(result.status).toBe('SUCCESS');
    expect(result.summary).toContain('Experimental security evaluation completed.');
  });

  test('redirects deprecated agent to successor', async () => {
    const provider = new ProviderAdapter({
      mockHandler: async req => {
        // Must invoke backend-specialist (successor to api-architect)
        expect(req.prompt).toContain('backend-specialist');
        return {
          status: 'SUCCESS',
          summary: 'API design approved.',
          findings: [],
        };
      },
    });

    const runtime = new AgentRuntime({ repoRoot, provider });
    const result = await runtime.executeTask({
      taskId: 'task_dep',
      agentId: 'api-architect',
      objective: 'Review OpenAPI spec',
    });

    expect(result.status).toBe('SUCCESS');
    expect(result.agentId).toBe('backend-specialist');
  });

  test('rejects malformed task inputs fail-closed', async () => {
    const runtime = new AgentRuntime({ repoRoot });
    const result = await runtime.executeTask({
      taskId: '', // Empty taskId invalid
      agentId: 'backend-specialist',
      objective: 'Run logic',
    });

    expect(result.status).toBe('ERROR');
    expect(result.summary).toContain('INPUT_VALIDATION_ERROR');
  });

  test('routes proposed writes through ControlledWriteService and enforces human approval', async () => {
    const provider = new ProviderAdapter({
      mockHandler: async () => ({
        status: 'SUCCESS',
        summary: 'Generated security fix for middleware',
        findings: [],
        writeProposals: [
          {
            operation: 'MODIFY',
            path: 'src/auth.js',
            content: 'const safeAuth = true;\nmodule.exports = safeAuth;',
          },
        ],
      }),
    });

    const runtime = new AgentRuntime({ repoRoot, provider });
    const result = await runtime.executeTask({
      taskId: 'task_write_01',
      agentId: 'backend-specialist',
      objective: 'Patch authentication middleware',
    });

    expect(result.status).toBe('SUCCESS');
    // Controlled write proposal was captured in artifacts
    const writeArtifact = result.artifacts.find(a => a.type === 'CONTROLLED_WRITE_PROPOSAL');
    expect(writeArtifact).toBeDefined();
    expect(writeArtifact.token).toBeDefined();
    expect(writeArtifact.token.startsWith('tok_')).toBe(true);
    expect(writeArtifact.transactionId).toBeDefined();
    expect(writeArtifact.files).toEqual(['src/auth.js']);
  });
});
