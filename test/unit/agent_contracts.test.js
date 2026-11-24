'use strict';

/**
 * agent_contracts.test.js — Unit Tests for Strict Agent Contracts and Output Parsing
 */

const {
  validateAgentTask,
  safeValidateAgentTask,
  validateAgentResult: _validateAgentResult,
  safeValidateAgentResult: _safeValidateAgentResult,
  validateAgentFinding,
  parseRawAgentOutput,
  AgentTaskSchema: _AgentTaskSchema,
  AgentResultSchema: _AgentResultSchema,
  AgentFindingSchema: _AgentFindingSchema,
} = require('../../src/execution/agent_contracts');

describe('Stage 2: Agent Contracts & Structured Validation', () => {
  describe('AgentTask Validation', () => {
    test('accepts valid AgentTask with defaults', () => {
      const task = {
        taskId: 't-100',
        agentId: 'backend-specialist',
        objective: 'Implement OAuth refresh token rotation',
      };

      const parsed = validateAgentTask(task);
      expect(parsed.taskId).toBe('t-100');
      expect(parsed.agentId).toBe('backend-specialist');
      expect(parsed.timeoutMs).toBe(30000);
      expect(parsed.tokenBudget).toBe(4096);
      expect(parsed.riskLevel).toBe('MEDIUM');
      expect(parsed.dependencies).toEqual([]);
    });

    test('rejects missing or empty required fields', () => {
      expect(() =>
        validateAgentTask({ agentId: 'backend-specialist', objective: 'task' }),
      ).toThrow();
      expect(() => validateAgentTask({ taskId: 't-1', objective: 'task' })).toThrow();
      expect(() =>
        validateAgentTask({ taskId: 't-1', agentId: 'backend-specialist', objective: '' }),
      ).toThrow();
    });

    test('safeValidateAgentTask returns success boolean without throwing', () => {
      const valid = safeValidateAgentTask({
        taskId: 't-ok',
        agentId: 'security-auditor',
        objective: 'Audit code',
      });
      expect(valid.success).toBe(true);

      const invalid = safeValidateAgentTask({ taskId: '' });
      expect(invalid.success).toBe(false);
    });
  });

  describe('AgentFinding Validation', () => {
    test('validates structured finding with line ranges', () => {
      const finding = {
        findingId: 'SEC-10',
        category: 'SECURITY',
        severity: 'CRITICAL',
        description: 'Hardcoded JWT secret detected',
        evidence: 'const secret = "secret123";',
        filePath: 'src/auth/jwt.js',
        lineRange: '15-18',
        confidence: 0.99,
      };

      const parsed = validateAgentFinding(finding);
      expect(parsed.findingId).toBe('SEC-10');
      expect(parsed.severity).toBe('CRITICAL');
      expect(parsed.lineRange).toBe('15-18');
    });

    test('rejects invalid severity enum', () => {
      const finding = {
        findingId: 'SEC-10',
        category: 'SECURITY',
        severity: 'ULTRA_CRITICAL', // invalid
        description: 'Bug',
        evidence: 'snippet',
      };
      expect(() => validateAgentFinding(finding)).toThrow();
    });
  });

  describe('parseRawAgentOutput Parser', () => {
    test('parses clean JSON model output into validated AgentResult', () => {
      const raw = JSON.stringify({
        status: 'SUCCESS',
        summary: 'All security checks passed.',
        findings: [
          {
            id: 'F-1',
            category: 'SECURITY',
            severity: 'INFO',
            title: 'Use constant-time comparison',
            evidence: 'crypto.timingSafeEqual()',
            file: 'src/auth.js',
            line: '35',
            confidence: 0.95,
          },
        ],
        recommendations: ['Enable rate limiting on login route.'],
      });

      const res = parseRawAgentOutput(raw, {
        taskId: 't-parse-1',
        agentId: 'security-auditor',
        inputHash: 'hash123',
        provider: 'openai',
        model: 'gpt-4o',
      });

      expect(res.taskId).toBe('t-parse-1');
      expect(res.agentId).toBe('security-auditor');
      expect(res.status).toBe('SUCCESS');
      expect(res.findings).toHaveLength(1);
      expect(res.findings[0].findingId).toBe('F-1');
      expect(res.findings[0].filePath).toBe('src/auth.js');
      expect(res.findings[0].lineRange).toBe('35');
      expect(res.recommendations).toContain('Enable rate limiting on login route.');
      expect(res.provenance.outputHash).toHaveLength(64);
    });

    test('strips markdown markdown code fences before parsing', () => {
      const raw = `Here is my analysis:
\`\`\`json
{
  "status": "SUCCESS",
  "summary": "Fenced output analysis complete.",
  "findings": []
}
\`\`\`
Hope this helps!`;

      const res = parseRawAgentOutput(raw, { taskId: 't-fence', agentId: 'backend-specialist' });
      expect(res.status).toBe('SUCCESS');
      expect(res.summary).toBe('Fenced output analysis complete.');
    });

    test('fails closed on malformed unparseable output coercing to ERROR result', () => {
      const raw = 'I am an AI assistant and I think the code looks great!';
      const res = parseRawAgentOutput(raw, {
        taskId: 't-malformed',
        agentId: 'backend-specialist',
      });

      expect(res.status).toBe('ERROR');
      expect(res.summary).toContain('MALFORMED_OUTPUT');
      expect(res.errors.length).toBeGreaterThan(0);
      expect(res.provenance.outputHash).toHaveLength(64);
    });

    test('handles reviewer schema compatibility (APPROVED verdict maps to SUCCESS)', () => {
      const raw = JSON.stringify({
        verdict: 'APPROVED',
        confidence: 0.95,
        findings: [],
      });

      const res = parseRawAgentOutput(raw, { taskId: 't-compat', agentId: 'security-auditor' });
      expect(res.status).toBe('SUCCESS');
    });

    test('handles reviewer schema compatibility (REJECTED verdict maps to FAILURE)', () => {
      const raw = JSON.stringify({
        verdict: 'REJECTED',
        confidence: 0.95,
        findings: [],
      });

      const res = parseRawAgentOutput(raw, { taskId: 't-compat-rej', agentId: 'security-auditor' });
      expect(res.status).toBe('FAILURE');
    });
  });
});
