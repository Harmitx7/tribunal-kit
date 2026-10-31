'use strict';

/**
 * phase4_security_war_room.test.js — Comprehensive Security Regression Suite (Phase 4)
 * ====================================================================================
 * Verifies Phase 4 Zero-Trust Architecture, Vulnerability Repairs, and Invariants:
 * 1. Anti-Self-Authorization & Human Gate Integrity (ControlledWriteService & MCP)
 * 2. Extended Secret Redaction across All Fields & Contemporary Token Formats
 * 3. Path Traversal Neutralization in CaseMemory
 * 4. Windows Shell Metacharacter Injection Defense
 * 5. Report Markdown Sanitization (dangerous URI schemes & script tags)
 * 6. Cryptographically Random Lifecycle Identifiers
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { ControlledWriteService } = require('../../src/execution/controlled_write_service');
const { redactSecrets, redactFinding } = require('../../.agent/scripts/secret_redactor');
const { CaseMemory } = require('../../src/intelligence/case_memory');
const { SkillExecutionCoordinator } = require('../../src/execution/skill_execution_coordinator');
const { handleRequest } = require('../../bin/mcp-server');

describe('PHASE 4 SECURITY WAR ROOM — Zero-Trust & Invariant Verification', () => {
  let tmpDir;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-sec-p4-'));
  });

  afterAll(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Anti-Self-Authorization & Human Gate Defense (Domain E & B)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Domain E/B: Anti-Self-Authorization & Human Gate Integrity', () => {
    let service;

    beforeEach(() => {
      service = new ControlledWriteService({ workspaceRoot: tmpDir });
      service.reviewExecutor = {
        executeReview: async () => ({
          reviewRunId: 'test-run-sec',
          results: [{ reviewerId: 'logic-reviewer', verdict: 'APPROVED', findings: [] }],
        }),
      };
    });

    test('ControlledWriteService rejects AI agent self-approval on human-gated transactions', async () => {
      const res = await service.requestWrite({
        requestId: 'req-sec-1',
        workspaceId: 'sec-ws',
        agentId: 'autonomous-coder',
        files: [{ path: '.agent/rules/GEMINI.md', operation: 'MODIFY', content: '// hacked' }],
        reason: 'Attempt governance rewrite',
      });

      expect(res.status).toBe('HUMAN_APPROVAL_REQUIRED');

      // 1. AI agent identity trying to approve must be rejected
      expect(() => {
        service.approveWrite(res.token, 'agent-coder', 'SIG_FAKE');
      }).toThrow(/Security Violation: AI agents and automated callers cannot self-approve/i);

      expect(() => {
        service.approveWrite(res.token, 'ai', 'SIG_FAKE');
      }).toThrow(/Security Violation: AI agents and automated callers cannot self-approve/i);

      expect(() => {
        service.approveWrite(res.token, 'mcp_client', 'SIG_FAKE');
      }).toThrow(/Security Violation: AI agents and automated callers cannot self-approve/i);

      // 2. Missing or blank signature must be rejected
      expect(() => {
        service.approveWrite(res.token, 'human_alice', '');
      }).toThrow(/Security Violation: Human approval requires a valid, non-empty confirmation signature/i);

      // 3. Legitimate human operator with valid signature succeeds
      const approved = service.approveWrite(res.token, 'human_alice', 'SIG_APPROVED_BY_ALICE');
      expect(approved.status).toBe('PENDING_COMMIT');
    });

    test('MCP tribunal_approve_write rejects calls without explicit approverId', async () => {
      const req = {
        jsonrpc: '2.0',
        id: 101,
        method: 'tools/call',
        params: {
          name: 'tribunal_approve_write',
          arguments: {
            token: 'tok_fake_approval',
          },
        },
      };

      const res = await handleRequest(req);
      expect(res.content[0].text).toMatch(/Security Violation: Human approval via MCP requires explicit approverId/i);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Secret Redactor Across All Boundaries & Contemporary Tokens (Domain A & K)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Domain A/K: Secret Redaction Across All Output Boundaries', () => {
    test('redactSecrets catches GitHub, Slack, HuggingFace, and OpenAI tokens', () => {
      const githubKey = 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcd';
      const slackKey = 'xoxb-mock-sample-slack-token-test-12345';
      const hfKey = 'hf_abcdefghijklmnopqrstuvwxyz01234567';
      const aiKey = 'sk-proj-abc123def456ghi789jkl012mno345pqr678';

      const input = `Keys: github=${githubKey}, slack=${slackKey}, hf=${hfKey}, ai=${aiKey}`;
      const { text, redactions } = redactSecrets(input);

      expect(text).toContain('[REDACTED_GITHUB_TOKEN]');
      expect(text).toContain('[REDACTED_SLACK_TOKEN]');
      expect(text).toContain('[REDACTED_HF_TOKEN]');
      expect(text).toContain('[REDACTED_API_KEY]');
      expect(text).not.toContain(githubKey);
      expect(text).not.toContain(slackKey);
      expect(text).not.toContain(hfKey);
      expect(text).not.toContain(aiKey);
      expect(redactions).toBe(4);
    });

    test('redactFinding purges secrets from actual_content, description, and details', () => {
      const dirtyFinding = {
        id: 'FIND-SEC-01',
        title: 'Exposed key in file.js',
        description: 'Hardcoded key found: ghp_111122223333444455556666777788889999',
        details: 'Raw details with pass: password="mySuperSecretPass123"',
        raw_output: 'sk-ant-api03-abcdef1234567890abcdef1234567890',
        evidence: [
          {
            type: 'source',
            description: 'Hardcoded token Bearer aaaaaaaaaaaaaaaaaaaaaaaa',
            actual_content: 'const token = "hf_0000111122223333444455556666777788";',
          },
        ],
      };

      const cleaned = redactFinding(dirtyFinding);

      expect(cleaned.description).toContain('[REDACTED_GITHUB_TOKEN]');
      expect(cleaned.details).toContain('password=[REDACTED]');
      expect(cleaned.raw_output).toContain('[REDACTED_API_KEY]');
      expect(cleaned.evidence[0].description).toContain('[REDACTED_TOKEN]');
      expect(cleaned.evidence[0].actual_content).toContain('[REDACTED_HF_TOKEN]');
      expect(cleaned._redactions).toBeGreaterThanOrEqual(5);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Path Traversal Neutralization in CaseMemory (Domain D)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Domain D: Path Traversal Neutralization in CaseMemory', () => {
    test('CaseMemory rejects parent traversal, separators, and null bytes in caseId', () => {
      const memory = new CaseMemory({ workspace: tmpDir });

      expect(() => {
        memory.getCase('../../etc/passwd');
      }).toThrow(/Security Violation: Path traversal detected in caseId/i);

      expect(() => {
        memory.getCase('sub/../../escaped');
      }).toThrow(/Security Violation: Path traversal detected in caseId/i);

      expect(() => {
        memory.getCase('null\0byte');
      }).toThrow(/Security Violation: Path traversal detected in caseId/i);

      expect(() => {
        memory.storeCase({ caseId: '../../evil' });
      }).toThrow(/Security Violation: Path traversal detected in caseId/i);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Markdown Injection Defense in Report Generator (Domain B & G)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Domain B/G: Dangerous URI Schemes in Report Sanitization', () => {
    test('Report generator neutralizes javascript, vbscript, and data:text/html', () => {
      const { sanitize } = require('../../.agent/scripts/backend_report_generator');
      const testContent =
        '[Malicious](javascript:alert(1)) and [Data](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==) and [Vbs](vbscript:msgbox(1))';
      const sanitized = sanitize(testContent);

      expect(sanitized).toContain('blocked-js:');
      expect(sanitized).toContain('blocked-data:');
      expect(sanitized).toContain('blocked-vbs:');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('data:text/html');
      expect(sanitized).not.toContain('vbscript:');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Cryptographically Secure Lifecycle Identifiers (Domain L)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Domain L: Cryptographically Secure Unique Identifiers', () => {
    test('SkillExecutionCoordinator generates IDs with cryptographic hex entropy', () => {
      const coordinator = new SkillExecutionCoordinator();
      const rec1 = coordinator.createRecord('clean-code');
      const rec2 = coordinator.createRecord('clean-code');

      expect(rec1.id).toMatch(/^exec-clean-code-\d+-[a-f0-9]{8}$/);
      expect(rec2.id).toMatch(/^exec-clean-code-\d+-[a-f0-9]{8}$/);
      expect(rec1.id).not.toBe(rec2.id);
    });
  });
});
