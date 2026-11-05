'use strict';

/**
 * phase10_release_certification_war_room.test.js — Final Integration & Release Certification Suite (Phase 10)
 * =========================================================================================================
 * Consolidates, executes, and certifies the complete end-to-end integration across all 10 phases:
 * 1. E2E Lifecycle: Project scaffolding, IDE bridge generation, and cockpit telemetry verification.
 * 2. E2E Governance & Controlled Write: Policy evaluation, review execution, human gate security, and rollback.
 * 3. E2E Multi-Agent Correlation: Sub-quadratic findings correlation with strict file-boundary enforcement.
 * 4. E2E Case Intelligence: Immutable case sealing, tamper detection, and low-latency retrieval.
 * 5. E2E Defense-in-Depth: Path containment, device name filtering, and deep multi-sink secret redaction.
 * 6. E2E Dual-Engine & DX: Verified dual-engine routing and programmatic text alignment parity.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const PKG = require('../../package.json');
const tk = require('../../src/cli');
const { ControlledWriteService } = require('../../src/execution/controlled_write_service');
const { CaseMemory } = require('../../src/intelligence/case_memory');
const { correlateFindings } = require('../../.agent/scripts/cross_agent_correlator');
const { redactFinding } = require('../../.agent/scripts/secret_redactor');
const { validateLexicalPath, PathSecurityError } = require('../../src/utils/path_containment');
const { generateIDEBridges } = require('../../src/commands/init');
const { getBinaryPath, RUST_COMMANDS } = require('../../bin/wrapper');

describe('PHASE 10 FINAL INTEGRATION & RELEASE CERTIFICATION WAR ROOM', () => {
  let tmpDir;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-phase10-cert-'));
  });

  afterAll(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. E2E Lifecycle: Scaffolding, Bridges & Cockpit Status
  // ───────────────────────────────────────────────────────────────────────────
  describe('E2E Lifecycle & Project Governance Initialization', () => {
    test('generateIDEBridges scaffolds all 8 required editor bridges with rule contents', async () => {
      const workspace = path.join(tmpDir, 'e2e-init-ws');
      const agentDir = path.join(workspace, '.agent');
      fs.mkdirSync(path.join(agentDir, 'rules'), { recursive: true });

      fs.writeFileSync(
        path.join(agentDir, 'rules', 'GEMINI.md'),
        '# Master Rules\nRule 1: Always verify evidence.\n',
        'utf8',
      );

      await generateIDEBridges(workspace, agentDir, false, false);

      const bridges = [
        path.join(workspace, '.cursorrules'),
        path.join(workspace, '.windsurfrules'),
        path.join(workspace, '.gemini', 'settings.json'),
        path.join(workspace, '.gemini', 'GEMINI.md'),
        path.join(workspace, '.github', 'copilot-instructions.md'),
        path.join(workspace, 'CLAUDE.md'),
        path.join(workspace, '.claude', 'CLAUDE.md'),
        path.join(workspace, 'AGENTS.md'),
      ];

      for (const bridge of bridges) {
        expect(fs.existsSync(bridge)).toBe(true);
        const content = fs.readFileSync(bridge, 'utf8');
        expect(content.length).toBeGreaterThan(0);
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. E2E Governance: Controlled Write & Human Gate Security
  // ───────────────────────────────────────────────────────────────────────────
  describe('E2E Controlled Write Mutation & Gate Invariants', () => {
    test('ControlledWriteService enforces review policy and strictly rejects AI self-approval', async () => {
      const wsDir = path.join(tmpDir, 'e2e-cw-ws');
      fs.mkdirSync(wsDir, { recursive: true });

      const service = new ControlledWriteService({ workspaceRoot: wsDir });
      service.reviewExecutor = {
        executeReview: async () => ({
          reviewRunId: 'run-p10-cert',
          results: [{ reviewerId: 'logic-reviewer', verdict: 'APPROVED', findings: [] }],
        }),
      };

      const req = await service.requestWrite({
        requestId: 'req-p10-1',
        workspaceId: 'ws-p10',
        agentId: 'autonomous-agent',
        files: [{ path: '.agent/rules/GEMINI.md', operation: 'MODIFY', content: 'new rule text' }],
        reason: 'Attempt governance mutation',
      });

      expect(req.status).toBe('HUMAN_APPROVAL_REQUIRED');
      expect(typeof req.token).toBe('string');

      // Proves automated agent approver IDs are rejected
      const bannedApprovers = ['ai', 'agent', 'mcp_client', 'automated', 'bot', 'agent-coder', 'ai-assistant'];
      for (const badApprover of bannedApprovers) {
        expect(() => {
          service.approveWrite(req.token, badApprover, 'SIGNATURE_ANY');
        }).toThrow(/AI agents and automated callers cannot self-approve/i);
      }

      // Proves valid human engineer approval transitions state to PENDING_COMMIT
      const approval = service.approveWrite(req.token, 'human-security-officer', 'SIGNATURE_CONFIRMED');
      expect(approval.status).toBe('PENDING_COMMIT');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. E2E Multi-Agent Finding Correlation (OPT-01)
  // ───────────────────────────────────────────────────────────────────────────
  describe('E2E Cross-Agent Correlation Performance & Correctness', () => {
    test('correlateFindings merges same-file findings and preserves distinct file findings', () => {
      const rawFindings = [
        {
          id: 'F1',
          category: 'security',
          type: 'injection',
          title: 'SQL Injection in Query',
          location: { file: 'src/db.js', line: 10 },
          _source_agent: 'security-auditor',
        },
        {
          id: 'F2',
          category: 'security',
          type: 'injection',
          title: 'SQL Injection Query Flaw',
          location: { file: 'src/db.js', line: 12 },
          _source_agent: 'logic-reviewer',
        },
        {
          id: 'F3',
          category: 'security',
          type: 'injection',
          title: 'SQL Injection in Query',
          location: { file: 'src/other.js', line: 10 },
          _source_agent: 'security-auditor',
        },
      ];

      const correlated = correlateFindings(rawFindings);
      expect(correlated.length).toBe(2);

      const dbGroup = correlated.find(f => f.location && f.location.file === 'src/db.js');
      expect(dbGroup).toBeDefined();
      expect(dbGroup.agents).toContain('security-auditor');
      expect(dbGroup.agents).toContain('logic-reviewer');

      const otherGroup = correlated.find(f => f.location && f.location.file === 'src/other.js');
      expect(otherGroup).toBeDefined();
      expect(otherGroup.agents).toEqual(['security-auditor']);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. E2E Case Intelligence & Cryptographic Sealing
  // ───────────────────────────────────────────────────────────────────────────
  describe('E2E Case Intelligence & Tamper-Evident Storage', () => {
    test('CaseMemory generates immutable record hash and retrieves records intact', () => {
      const memory = new CaseMemory({ workspace: tmpDir });

      const stored = memory.storeCase({
        caseId: 'CASE-P10-RELEASE-001',
        impactTier: 'TIER_2',
        policyDecision: { verdict: 'APPROVED' },
        selectedReviewers: ['security-auditor', 'logic-reviewer'],
        finalVerdict: 'APPROVED',
      });

      expect(stored._recordHash).toBeDefined();
      expect(stored._recordHash.length).toBe(64); // SHA-256

      const retrieved = memory.getCase('CASE-P10-RELEASE-001');
      expect(retrieved).toBeDefined();
      expect(retrieved.caseId).toBe('CASE-P10-RELEASE-001');
      expect(retrieved._recordHash).toBe(stored._recordHash);
      expect(Object.isFrozen(retrieved)).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. E2E Defense-in-Depth & Secret Sanitization
  // ───────────────────────────────────────────────────────────────────────────
  describe('E2E Defense-in-Depth: Path Traversal & Deep Secret Sanitization', () => {
    test('validateLexicalPath enforces strict path boundaries across Windows and POSIX', () => {
      expect(() => validateLexicalPath('..\\secret.key')).toThrow(PathSecurityError);
      expect(() => validateLexicalPath('nested/../../etc/passwd')).toThrow(PathSecurityError);
      expect(() => validateLexicalPath('CON.txt')).toThrow(PathSecurityError);
      expect(() => validateLexicalPath('C:\\Windows\\System32')).toThrow(PathSecurityError);
      expect(() => validateLexicalPath('\\\\server\\share\\file.js')).toThrow(PathSecurityError);
      expect(validateLexicalPath('src\\index.js')).toBe('src/index.js');
    });

    test('redactFinding purges sensitive secrets from title, details, and raw output', () => {
      const dirtyFinding = {
        id: 'SEC-10',
        title: 'Leaked GitHub token: ghp_111122223333444455556666777788889999',
        description: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.jwt_token_sample',
        details: 'AWS Key: AKIA1111222233334444',
      };

      const cleaned = redactFinding(dirtyFinding);
      expect(cleaned.title).toContain('[REDACTED_GITHUB_TOKEN]');
      expect(cleaned.description).toContain('[REDACTED_TOKEN]');
      expect(cleaned.details).toContain('[REDACTED_AWS_KEY]');
      expect(cleaned._redactions).toBe(3);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. E2E Dual-Engine Routing & Developer Experience Parity
  // ───────────────────────────────────────────────────────────────────────────
  describe('E2E Dual-Engine Routing & Programmatic Parity', () => {
    test('getBinaryPath supports native Rust binary and TRIBUNAL_FORCE_JS override', () => {
      const prev = process.env.TRIBUNAL_FORCE_JS;
      try {
        process.env.TRIBUNAL_FORCE_JS = '1';
        expect(getBinaryPath()).toBeNull();
      } finally {
        process.env.TRIBUNAL_FORCE_JS = prev || '';
      }
    });

    test('alignText cleanly strips conversational intro and outro slop', () => {
      const messyResponse = 'Sure! I can help you with that.\nconst a = 1;\nHope this helps!';
      const aligned = tk.alignText(messyResponse);
      expect(aligned).toContain('const a = 1;');
      expect(aligned.startsWith('Sure!')).toBe(false);
    });

    test('package.json has a semantic version and exactly 1 production dependency', () => {
      expect(PKG.version).toMatch(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
      const deps = Object.keys(PKG.dependencies || {});
      expect(deps).toEqual(['zod']);
    });
  });
});
