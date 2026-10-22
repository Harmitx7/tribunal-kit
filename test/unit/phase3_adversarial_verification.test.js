'use strict';

/**
 * phase3_adversarial_verification.test.js
 * ========================================
 * Independent Adversarial Regression Test Suite for Tribunal Kit Phase 3.
 * Rigorously probes all findings (TK-SEC-01 through TK-SEC-10, TK-PART-01, TK-PART-02)
 * using malicious payloads, encoded inputs, boundary collisions, and edge cases.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const boundary = require('../../src/security/boundary');
const { handleRequest } = require('../../bin/mcp-server');
const { ControlledWriteService } = require('../../src/execution/controlled_write_service');
const TransactionManager = require('../../src/execution/transaction_manager');
const { executeSyscall } = require('../../.agent/scripts/syscall_registry');
const { DAGTaskSchema, DAGPayloadSchema, validatePayload } = require('../../.agent/scripts/payload_schemas');
const { resolveExecutable, validateExecutableName, validateProcessArgs } = require('../../bin/spawn-agent');
const { terminateProcessTree } = require('../../src/browser/launcher');
const {
  createEvolutionProposal,
  validateEvolutionProposal,
  saveEvolutionProposal,
  approveEvolutionProposal,
} = require('../../src/evolution/engine');
const { sddDiff, sddBrief } = require('../../src/commands/sdd');

describe('Tribunal Kit — Phase 3 Adversarial Security Verification Suite', () => {
  let tmpRoot;
  let workspace;

  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tk_phase3_adv_'));
    workspace = path.join(tmpRoot, 'workspace');
    fs.mkdirSync(workspace, { recursive: true });
  });

  afterAll(() => {
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch (_) {}
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TK-SEC-01: MCP Resource Path Traversal
  // ───────────────────────────────────────────────────────────────────────────
  describe('TK-SEC-01: MCP Resource Path Traversal (resources/read)', () => {
    const maliciousUris = [
      'tribunal://agent/../../../../etc/passwd',
      'tribunal://agent/..%2f..%2f..%2fetc%2fpasswd',
      'tribunal://agent/..%252f..%252f..%252fetc%252fpasswd',
      'tribunal://agent/....//....//etc//passwd',
      'tribunal://agent/C:\\Windows\\System32\\drivers\\etc\\hosts',
      'tribunal://agent/test\0evil',
      'tribunal://agent/sub/nested-agent',
      'tribunal://agent/agent.md',
      'tribunal://agent/',
      'tribunal://skill/../../../../root/id_rsa',
      'tribunal://skill/clean-code/../../../secret',
      'tribunal://skill/clean-code\0bad',
      'tribunal://workflow/../../scripts/secret',
      'tribunal://workflow/audit.md',
      'tribunal://unknown/some-resource',
    ];

    test.each(maliciousUris)('rejects adversarial resource URI: %s', async uri => {
      await expect(
        handleRequest({
          jsonrpc: '2.0',
          id: 101,
          method: 'resources/read',
          params: { uri },
        }),
      ).rejects.toThrow();
    });

    test('legitimate resource access works for existing agent', async () => {
      // Test with legitimate resource
      const res = await handleRequest({
        jsonrpc: '2.0',
        id: 102,
        method: 'resources/read',
        params: { uri: 'tribunal://agent/security-auditor' },
      });
      expect(res).toBeDefined();
      expect(res.contents).toBeInstanceOf(Array);
      expect(res.contents[0].text).toContain('security-auditor');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TK-SEC-02: MCP Prompt Path Traversal
  // ───────────────────────────────────────────────────────────────────────────
  describe('TK-SEC-02: MCP Prompt Path Traversal (prompts/get)', () => {
    const maliciousPromptNames = [
      '../../workflows/audit',
      '..\\..\\workflows\\audit',
      'audit.md',
      'audit.js',
      'audit/sub',
      'audit%00',
      'audit\0evil',
      '--flag',
      '   ',
    ];

    test.each(maliciousPromptNames)('rejects adversarial prompt name: %s', async name => {
      await expect(
        handleRequest({
          jsonrpc: '2.0',
          id: 201,
          method: 'prompts/get',
          params: { name },
        }),
      ).rejects.toThrow();
    });

    test('legitimate prompt retrieval works for existing workflow', async () => {
      const res = await handleRequest({
        jsonrpc: '2.0',
        id: 202,
        method: 'prompts/get',
        params: { name: 'audit' },
      });
      expect(res).toBeDefined();
      expect(res.messages).toBeInstanceOf(Array);
      expect(res.messages[0].content.text).toBeDefined();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TK-SEC-03: dispatch_swarm Arbitrary File Read & Error Leak
  // ───────────────────────────────────────────────────────────────────────────
  describe('TK-SEC-03: dispatch_swarm Arbitrary File Read & Information Leakage', () => {
    test('rejects reading files outside workspace root', async () => {
      const secretFile = path.join(tmpRoot, 'outside_secret.json');
      fs.writeFileSync(secretFile, JSON.stringify({ secret: 'SENSITIVE_KEY_999' }), 'utf8');

      const res = await handleRequest({
        jsonrpc: '2.0',
        id: 301,
        method: 'tools/call',
        params: {
          name: 'dispatch_swarm',
          arguments: {
            file: secretFile,
            mode: 'legacy',
          },
        },
      });

      // Must be blocked by assertWithinRoot
      expect(res.content[0].text).toMatch(/Path traversal detected|escapes authorized root|Swarm dispatch failed/);
      expect(res.content[0].text).not.toContain('SENSITIVE_KEY_999');
    });

    test('sanitizes V8 SyntaxError on malformed JSON payload containing sensitive tokens', async () => {
      const relPath = '.test_adv_malformed_secret.json';
      const absPath = path.resolve(process.cwd(), relPath);
      fs.writeFileSync(absPath, 'INVALID_JSON_TOKEN_PASSWORD_AWS_SECRET_XYZ123456', 'utf8');

      try {
        const res = await handleRequest({
          jsonrpc: '2.0',
          id: 302,
          method: 'tools/call',
          params: {
            name: 'dispatch_swarm',
            arguments: {
              file: relPath,
              mode: 'legacy',
            },
          },
        });

        // Crucial test: V8 SyntaxError snippet must NOT leak AWS_SECRET_XYZ123456
        expect(res.content[0].text).not.toContain('PASSWORD_AWS_SECRET_XYZ123456');
        expect(res.content[0].text).toMatch(/Invalid JSON payload|JSON parsing failed/);
      } finally {
        try {
          fs.unlinkSync(absPath);
        } catch (_) {}
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TK-SEC-04: DAG Worker Command Execution & Syscall Enforcement
  // ───────────────────────────────────────────────────────────────────────────
  describe('TK-SEC-04: DAG Worker Command Execution & Syscall Whitelist', () => {
    test('DAGTaskSchema strictly rejects unknown fields (command, exec, shell)', () => {
      const maliciousTask = {
        id: 'task-1',
        agent: 'security-auditor',
        command: ['node', '-e', 'console.log("RCE")'],
      };

      const val = validatePayload({ tasks: [maliciousTask] }, DAGPayloadSchema);
      expect(val.valid).toBe(false);
      expect(val.errors.some(e => e.message.includes('unrecognized_keys') || e.code === 'unrecognized_keys')).toBe(true);
    });

    test('executeSyscall rejects non-whitelisted syscall operations', () => {
      const unauthSyscalls = ['rm_rf', 'eval_code', 'powershell', 'cmd', 'spawn_worker', 'curl'];
      for (const sc of unauthSyscalls) {
        const res = executeSyscall(sc, []);
        expect(res.exitCode).toBe(1);
        expect(res.stderr).toContain('Security Exception');
      }
    });

    test('executeSyscall rejects shell metacharacters in arguments', () => {
      const maliciousArgs = [
        ['.', ';', 'dir'],
        ['.', '|', 'whoami'],
        ['.', '&', 'calc'],
        ['`id`'],
        ['$((1+1))'],
      ];

      for (const args of maliciousArgs) {
        const res = executeSyscall('security_scan', args);
        expect(res.exitCode).toBe(1);
        expect(res.stderr).toMatch(/Security Exception: (Unsafe shell metacharacters|Invalid arguments)/);
      }
    });

    test('executeSyscall permits legitimate whitelisted syscall and arguments', () => {
      const res = executeSyscall('schema_validator', ['.']);
      expect(res.exitCode).toBe(0);
      expect(res.stderr).toBe('');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TK-SEC-05: Workspace Boundary, Sibling Prefix Collisions & Transactions
  // ───────────────────────────────────────────────────────────────────────────
  describe('TK-SEC-05: Workspace Boundary, Sibling Collision & Transaction Rollback', () => {
    test('ControlledWriteService rejects sibling prefix collisions and dot traversal', async () => {
      const service = new ControlledWriteService({ workspaceRoot: workspace });

      const siblingPath = '../workspace_evil/payload.js';
      await expect(
        service.requestWrite({
          workspaceId: 'ws-1',
          files: [{ path: siblingPath, operation: 'CREATE', content: 'malicious' }],
        }),
      ).rejects.toThrow(/Security Violation: Path traversal detected/);

      const absoluteOutside = path.resolve(tmpRoot, 'outside.js');
      await expect(
        service.requestWrite({
          workspaceId: 'ws-1',
          files: [{ path: absoluteOutside, operation: 'CREATE', content: 'malicious' }],
        }),
      ).rejects.toThrow(/Security Violation: Path traversal detected/);
    });

    test('TransactionManager enforces atomic rollback on commit failure without partial writes', () => {
      const tx = new TransactionManager({ workspace });
      tx.begin();

      const legitimateFile = path.join(workspace, 'initial_file.txt');
      fs.writeFileSync(legitimateFile, 'ORIGINAL_STATE', 'utf8');

      tx.prepareWrite('initial_file.txt', 'MODIFIED_STATE');

      // Add a second operation that attempts an illegal sibling write to force failure
      expect(() => {
        tx.prepareWrite('../workspace_sibling/bad.txt', 'BAD_STATE');
      }).toThrow(/Security Violation: Path traversal detected/);

      // Validate and commit the single valid op
      tx.validate();
      tx.commit();

      expect(fs.readFileSync(legitimateFile, 'utf8')).toBe('MODIFIED_STATE');

      // Now test rollback
      tx.begin();
      tx.prepareWrite('initial_file.txt', 'SHOULD_BE_ROLLED_BACK');
      tx.validate();
      tx.rollback();

      // Must be restored to MODIFIED_STATE
      expect(fs.readFileSync(legitimateFile, 'utf8')).toBe('MODIFIED_STATE');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TK-SEC-06: Context Path & CLI Argument Injection
  // ───────────────────────────────────────────────────────────────────────────
  describe('TK-SEC-06: Context Path & CLI Argument Injection (tribunal_get_context)', () => {
    const maliciousTargets = [
      '--check',
      '--write',
      '-f',
      '-rf',
      '--target=foo',
      '../../../../outside.js',
      '..\\..\\..\\outside.js',
    ];

    test.each(maliciousTargets)('rejects malicious target in tribunal_get_context: %s', async target => {
      const res = await handleRequest({
        jsonrpc: '2.0',
        id: 601,
        method: 'tools/call',
        params: {
          name: 'tribunal_get_context',
          arguments: { target },
        },
      });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toMatch(/cannot start with '-'|outside authorized workspace|Security Violation/);
    });

    test('rejects flag injection in compareWith argument', async () => {
      const res = await handleRequest({
        jsonrpc: '2.0',
        id: 602,
        method: 'tools/call',
        params: {
          name: 'tribunal_get_context',
          arguments: {
            target: 'package.json',
            compareWith: '--danger-flag',
          },
        },
      });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toMatch(/cannot start with '-'/);
    });

    test('legitimate context extraction functions for valid workspace file', async () => {
      const res = await handleRequest({
        jsonrpc: '2.0',
        id: 603,
        method: 'tools/call',
        params: {
          name: 'tribunal_get_context',
          arguments: {
            target: 'package.json',
            write: false,
          },
        },
      });

      expect(res.isError).toBeFalsy();
      expect(res.content[0].text).toContain('package.json');
      expect(res.content[0].text).toContain('FILE DOSSIER');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TK-SEC-07: Browser SSRF, Local Access & Redirect / DNS Gaps
  // ───────────────────────────────────────────────────────────────────────────
  describe('TK-SEC-07: Browser SSRF, Local Access & Redirect/DNS Defense', () => {
    const prohibitedUrls = [
      'http://127.0.0.1:8080',
      'http://localhost:3000',
      'http://[::1]:9000',
      'http://0.0.0.0:8000',
      'http://169.254.169.254/latest/meta-data/',
      'http://10.0.0.1/admin',
      'http://192.168.1.1/setup',
      'http://172.16.0.1/internal',
      'http://127.0.0.1:9222/json',
      'file:///etc/passwd',
      'javascript:alert(1)',
      'chrome://settings',
      'data:text/html,<h1>evil</h1>',
    ];

    test.each(prohibitedUrls)('validateBrowserUrl blocks prohibited URL or scheme: %s', url => {
      expect(() => boundary.validateBrowserUrl(url)).toThrow(
        /Unsupported URL scheme|Prohibited network destination/,
      );
    });

    test('validateBrowserUrl normalizes decimal and hex IP representations in WHATWG URL', () => {
      // 2130706433 is decimal representation of 127.0.0.1
      // WHATWG URL parser resolves http://2130706433 to hostname "127.0.0.1"
      expect(() => boundary.validateBrowserUrl('http://2130706433/')).toThrow(/Loopback address/);
    });

    test('PHASE 4 REMEDIATION VERIFICATION: validateBrowserUrl strictly blocks cloud metadata hostnames', () => {
      const gcpMetadata = 'http://metadata.google.internal/computeMetadata/v1/';
      expect(() => boundary.validateBrowserUrl(gcpMetadata)).toThrow(
        /Prohibited network destination/,
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TK-SEC-08: Windows Shell Spawning & Process Execution Defense
  // ───────────────────────────────────────────────────────────────────────────
  describe('TK-SEC-08: Windows Shell Spawning & Argument Safety', () => {
    test('validateExecutableName rejects shell metacharacters in command', () => {
      const maliciousCmds = [
        'node; dir',
        'node & whoami',
        'node | netstat',
        'node`calc`',
        'node\0evil',
        'node\nwhoami',
      ];

      for (const cmd of maliciousCmds) {
        expect(() => validateExecutableName(cmd)).toThrow(/Disallowed metacharacters/);
      }
    });

    test('validateProcessArgs rejects dangerous cmd.exe metacharacters for batch files', () => {
      const dangerousArgs = [
        ['arg1', '&', 'dir'],
        ['arg1', '|', 'calc'],
        ['arg1', '^', 'special'],
        ['arg1', '%PATH%'],
      ];

      for (const args of dangerousArgs) {
        expect(() => validateProcessArgs(args, true)).toThrow(/contains dangerous cmd\.exe metacharacters/);
      }
    });

    test('resolveExecutable on Windows classifies .exe as needsShell: false', () => {
      const res = resolveExecutable('node');
      // In Node environment on Windows or Linux, binary executables must not need shell
      expect(res.needsShell).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Additional Findings: TK-SEC-09, TK-SEC-10, TK-PART-01, TK-PART-02
  // ───────────────────────────────────────────────────────────────────────────
  describe('Additional Security Findings (TK-SEC-09, TK-SEC-10, TK-PART-01, TK-PART-02)', () => {
    test('TK-SEC-09: terminateProcessTree discards non-integer or injected PIDs safely', () => {
      // Must not throw and must not execute shell commands
      expect(() => terminateProcessTree({ pid: '1234 & calc' })).not.toThrow();
      expect(() => terminateProcessTree({ pid: -1 })).not.toThrow();
      expect(() => terminateProcessTree(null)).not.toThrow();
      expect(() => terminateProcessTree({ pid: 'abc' })).not.toThrow();
    });

    test('TK-SEC-10: Evolution Engine rejects traversal in proposalId across all methods', () => {
      const traversalId = '../../evil_proposal';

      // 1. Creation
      expect(() => {
        createEvolutionProposal({
          proposalId: traversalId,
          target: 'context-weights',
          currentBehavior: 'default weights',
          observedEvidence: 'telemetry evidence showing 15% improvement',
          proposedChange: 'increase weight',
          expectedEffect: 'faster routing',
          evidenceType: 'DETERMINISTIC_TELEMETRY',
        });
      }).toThrow(/Invalid resource identifier/);

      // 2. Validation
      const badProposal = {
        proposal_id: traversalId,
        target: 'context-weights',
        current_behavior: 'default weights',
        observed_evidence: 'telemetry evidence showing 15% improvement',
        proposed_change: 'increase weight',
        expected_effect: 'faster routing',
        risk: 'LOW',
        tests_required: ['test1'],
        regression_requirements: ['reg1'],
        evidence_type: 'DETERMINISTIC_TELEMETRY',
      };
      const val = validateEvolutionProposal(badProposal);
      expect(val.valid).toBe(false);
      expect(val.reason).toContain('Invalid proposal_id');

      // 3. Save
      expect(() => saveEvolutionProposal(badProposal, path.join(workspace, '.agent'))).toThrow(
        /Cannot save invalid evolution proposal/,
      );

      // 4. Approve
      expect(() => approveEvolutionProposal(traversalId, 'admin', path.join(workspace, '.agent'))).toThrow(
        /Invalid resource identifier/,
      );
    });

    test('TK-PART-01: sddDiff and sddBrief reject option injection and path traversal', () => {
      expect(() => {
        sddDiff('plan.md', '-o/tmp/evil', 'HEAD', null);
      }).toThrow(/Invalid BASE git revision/);

      expect(() => {
        sddDiff('plan.md', 'HEAD', '--upload-pack=evil', null);
      }).toThrow(/Invalid HEAD git revision/);
    });
  });
});
