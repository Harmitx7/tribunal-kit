'use strict';

/**
 * agent_dispatcher.test.js — Unit Tests for DAG Scheduling, Cascading Failure, and Conflict Aggregation
 */

const { AgentDispatcher, validateDag } = require('../../src/execution/agent_dispatcher');
const { AgentRuntime } = require('../../src/execution/agent_runtime');
const { ProviderAdapter } = require('../../src/execution/provider_adapter');
const { EvidenceBus } = require('../../src/execution/evidence_bus');
const path = require('path');

describe('Stage 2: AgentDispatcher DAG Orchestration', () => {
  const repoRoot = path.resolve(__dirname, '../../');

  describe('DAG Validation & Cycle Detection', () => {
    test('computes parallel waves for independent and dependent tasks', () => {
      const tasks = [
        { taskId: 'build', agentId: 'backend-specialist', objective: 'Compile' },
        { taskId: 'lint', agentId: 'style-reviewer', objective: 'Lint' },
        {
          taskId: 'test',
          agentId: 'test-coverage-reviewer',
          objective: 'Unit tests',
          dependencies: ['build'],
        },
        {
          taskId: 'deploy',
          agentId: 'devops-specialist',
          objective: 'Deploy',
          dependencies: ['test', 'lint'],
        },
      ];

      const res = validateDag(tasks);
      expect(res.valid).toBe(true);
      expect(res.executionOrder).toHaveLength(3);
      // Wave 0 has build and lint in parallel
      expect(res.executionOrder[0]).toEqual(expect.arrayContaining(['build', 'lint']));
      // Wave 1 has test
      expect(res.executionOrder[1]).toEqual(['test']);
      // Wave 2 has deploy
      expect(res.executionOrder[2]).toEqual(['deploy']);
    });

    test('detects circular dependencies fail-closed', () => {
      const tasks = [
        { taskId: 'taskA', agentId: 'backend-specialist', objective: 'A', dependencies: ['taskB'] },
        { taskId: 'taskB', agentId: 'backend-specialist', objective: 'B', dependencies: ['taskC'] },
        { taskId: 'taskC', agentId: 'backend-specialist', objective: 'C', dependencies: ['taskA'] },
      ];

      const res = validateDag(tasks);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('CYCLE_DETECTED');
    });

    test('detects missing dependency reference fail-closed', () => {
      const tasks = [
        {
          taskId: 'taskA',
          agentId: 'backend-specialist',
          objective: 'A',
          dependencies: ['ghostTask'],
        },
      ];

      const res = validateDag(tasks);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('MISSING_DEPENDENCY');
    });
  });

  describe('Multi-Agent Wave Dispatch', () => {
    test('executes parallel tasks and returns consolidated report', async () => {
      const provider = new ProviderAdapter({
        mockHandler: async req => {
          if (req.prompt.includes('Task ID: sec_check')) {
            return {
              status: 'SUCCESS',
              summary: 'Security review clean.',
              findings: [],
            };
          }
          return {
            status: 'SUCCESS',
            summary: 'Architecture review clean.',
            findings: [],
          };
        },
      });

      const runtime = new AgentRuntime({ repoRoot, provider });
      const dispatcher = new AgentDispatcher({ runtime });

      const tasks = [
        { taskId: 'sec_check', agentId: 'security-auditor', objective: 'Audit auth tokens' },
        { taskId: 'arch_check', agentId: 'backend-specialist', objective: 'Audit API contract' },
      ];

      const report = await dispatcher.dispatch(tasks);

      expect(report.status).toBe('SUCCESS');
      expect(report.totalTasks).toBe(2);
      expect(report.completedTasks).toBe(2);
      expect(report.failedTasks).toBe(0);
      expect(report.results['sec_check'].status).toBe('SUCCESS');
      expect(report.results['arch_check'].status).toBe('SUCCESS');
      expect(report.hasConflicts).toBe(false);
    });

    test('cascades failure to dependent tasks while isolating independent tasks', async () => {
      const provider = new ProviderAdapter({
        mockHandler: async req => {
          if (req.prompt.includes('Task ID: root_fail')) {
            return {
              status: 'FAILURE',
              summary: 'Critical failure in dependency',
              findings: [
                {
                  findingId: 'FAIL-1',
                  category: 'CORRECTNESS',
                  severity: 'CRITICAL',
                  description: 'Compilation failed',
                  evidence: 'SyntaxError',
                },
              ],
            };
          }
          return {
            status: 'SUCCESS',
            summary: 'Independent task succeeded',
            findings: [],
          };
        },
      });

      const runtime = new AgentRuntime({ repoRoot, provider });
      const dispatcher = new AgentDispatcher({ runtime });

      const tasks = [
        // Root task that fails
        { taskId: 'root_fail', agentId: 'backend-specialist', objective: 'Build core module' },
        // Dependent task: should be BLOCKED due to root_fail
        {
          taskId: 'child_blocked',
          agentId: 'test-coverage-reviewer',
          objective: 'Test core',
          dependencies: ['root_fail'],
        },
        // Independent task: should SUCCEED
        { taskId: 'independent_ok', agentId: 'documentation-writer', objective: 'Generate docs' },
      ];

      const report = await dispatcher.dispatch(tasks);

      expect(report.status).toBe('PARTIAL_SUCCESS');
      expect(report.totalTasks).toBe(3);
      expect(report.completedTasks).toBe(1); // independent_ok
      expect(report.failedTasks).toBe(1); // root_fail
      expect(report.blockedTasks).toBe(1); // child_blocked

      expect(report.results['root_fail'].status).toBe('FAILURE');
      expect(report.results['child_blocked'].status).toBe('BLOCKED');
      expect(report.results['child_blocked'].summary).toContain('CASCADING_FAILURE');
      expect(report.results['independent_ok'].status).toBe('SUCCESS');
    });

    test('detects contradictory findings across agents during dispatch aggregation', async () => {
      const provider = new ProviderAdapter({
        mockHandler: async req => {
          if (req.prompt.includes('Task ID: sec_eval')) {
            return {
              status: 'SUCCESS',
              summary: 'Flagged critical flaw in token validator',
              findings: [
                {
                  findingId: 'SEC-CRIT',
                  category: 'SECURITY',
                  severity: 'CRITICAL',
                  description: 'Insecure timing attack vulnerability',
                  evidence: 'if (inputToken === secretToken)',
                  filePath: 'src/tokens.js',
                  lineRange: '15-20',
                  confidence: 0.99,
                },
              ],
            };
          }
          // Perf agent flags low severity / approval on same lines
          return {
            status: 'SUCCESS',
            summary: 'Token comparison is fast',
            findings: [
              {
                findingId: 'PERF-OK',
                category: 'PERFORMANCE',
                severity: 'INFO',
                description: 'Fast string comparison',
                evidence: '=== is fast',
                filePath: 'src/tokens.js',
                lineRange: '16-19',
                confidence: 0.9,
              },
            ],
          };
        },
      });

      const runtime = new AgentRuntime({ repoRoot, provider });
      const dispatcher = new AgentDispatcher({ runtime });

      const tasks = [
        { taskId: 'sec_eval', agentId: 'security-auditor', objective: 'Security review tokens' },
        { taskId: 'perf_eval', agentId: 'backend-specialist', objective: 'Perf review tokens' },
      ];

      const report = await dispatcher.dispatch(tasks);

      expect(report.hasConflicts).toBe(true);
      expect(report.conflicts).toHaveLength(1);
      const conf = report.conflicts[0];
      expect(conf.filePath).toBe('src/tokens.js');
      expect(conf.resolutionStatus).toBe('RESOLVED_BY_PRECEDENCE');
      expect(conf.winningFindingId).toBe('SEC-CRIT');
    });
  });
});
