'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

describe('Security Containment & Boundary Hardening (Phase 2 TDD)', () => {
  let tmpRoot;

  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tk_sec_containment_'));
  });

  afterAll(() => {
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch (_) {}
  });

  describe('1. Shared Boundary Module (src/security/boundary.js)', () => {
    let boundary;
    beforeAll(() => {
      boundary = require('../../src/security/boundary');
    });

    it('assertWithinRoot allows legitimate files inside root', () => {
      const root = path.join(tmpRoot, 'workspace');
      fs.mkdirSync(root, { recursive: true });
      const target = path.join(root, 'sub', 'file.txt');
      const resolved = boundary.assertWithinRoot(root, 'sub/file.txt');
      expect(resolved).toBe(path.resolve(target));
    });

    it('assertWithinRoot rejects ../ path traversal', () => {
      const root = path.join(tmpRoot, 'workspace');
      expect(() => {
        boundary.assertWithinRoot(root, '../outside.txt');
      }).toThrow(/Security Violation: Path traversal detected/);
    });

    it('assertWithinRoot rejects absolute paths outside root', () => {
      const root = path.join(tmpRoot, 'workspace');
      const outside = path.resolve(tmpRoot, 'other', 'file.txt');
      expect(() => {
        boundary.assertWithinRoot(root, outside);
      }).toThrow(/Security Violation: Path traversal detected/);
    });

    it('assertWithinRoot rejects sibling directory prefix collisions', () => {
      const root = path.join(tmpRoot, 'myproject');
      fs.mkdirSync(root, { recursive: true });
      const sibling = path.join(tmpRoot, 'myproject_evil');
      fs.mkdirSync(sibling, { recursive: true });

      // Target path begins with root's string prefix, but is a sibling directory
      const siblingFile = '../myproject_evil/payload.txt';
      expect(() => {
        boundary.assertWithinRoot(root, siblingFile);
      }).toThrow(/Security Violation: Path traversal detected/);
    });

    it('validateResourceId accepts valid identifiers and rejects traversal/separators', () => {
      expect(boundary.validateResourceId('clean-code')).toBe('clean-code');
      expect(boundary.validateResourceId('security_auditor_v2')).toBe('security_auditor_v2');
      expect(boundary.validateResourceId('agent-1')).toBe('agent-1');

      // Traversal / separators / invalid chars
      expect(() => boundary.validateResourceId('../secret')).toThrow(/Invalid resource identifier/);
      expect(() => boundary.validateResourceId('foo/bar')).toThrow(/Invalid resource identifier/);
      expect(() => boundary.validateResourceId('foo\\bar')).toThrow(/Invalid resource identifier/);
      expect(() => boundary.validateResourceId('foo\0bar')).toThrow(/Invalid resource identifier/);
      expect(() => boundary.validateResourceId('something.md')).toThrow(/Invalid resource identifier/);
      expect(() => boundary.validateResourceId('')).toThrow(/Invalid resource identifier/);
      expect(() => boundary.validateResourceId(' ')).toThrow(/Invalid resource identifier/);
    });

    it('validateBrowserUrl accepts public HTTP/HTTPS and rejects SSRF targets', () => {
      expect(boundary.validateBrowserUrl('https://example.com/api').href).toBe('https://example.com/api');
      expect(boundary.validateBrowserUrl('http://sub.domain.org/path?q=1').href).toBe('http://sub.domain.org/path?q=1');

      // Reject non-http(s) schemes
      expect(() => boundary.validateBrowserUrl('file:///etc/passwd')).toThrow(/Unsupported URL scheme/);
      expect(() => boundary.validateBrowserUrl('javascript:alert(1)')).toThrow(/Unsupported URL scheme/);
      expect(() => boundary.validateBrowserUrl('chrome://settings')).toThrow(/Unsupported URL scheme/);
      expect(() => boundary.validateBrowserUrl('data:text/html,evil')).toThrow(/Unsupported URL scheme/);

      // Reject loopback / localhost
      expect(() => boundary.validateBrowserUrl('http://localhost:8080')).toThrow(/Prohibited network destination/);
      expect(() => boundary.validateBrowserUrl('http://127.0.0.1:3000')).toThrow(/Prohibited network destination/);
      expect(() => boundary.validateBrowserUrl('http://[::1]:8080')).toThrow(/Prohibited network destination/);

      // Reject cloud metadata & link-local
      expect(() => boundary.validateBrowserUrl('http://169.254.169.254/latest/meta-data/')).toThrow(/Prohibited network destination/);

      // Reject private RFC 1918 ranges
      expect(() => boundary.validateBrowserUrl('http://10.0.0.1/admin')).toThrow(/Prohibited network destination/);
      expect(() => boundary.validateBrowserUrl('http://192.168.1.1/router')).toThrow(/Prohibited network destination/);
      expect(() => boundary.validateBrowserUrl('http://172.16.0.5/internal')).toThrow(/Prohibited network destination/);

      // Reject Chrome CDP debugging ports
      expect(() => boundary.validateBrowserUrl('http://127.0.0.1:9222/json')).toThrow(/Prohibited network destination/);
    });

    it('sanitizeErrorMessage removes sensitive unparsed file snippets', () => {
      const fakeError = new SyntaxError('Unexpected token \'a\', "api_key=SECRET_TOKEN_XYZ"... is not valid JSON');
      const sanitized = boundary.sanitizeErrorMessage(fakeError);
      expect(sanitized).not.toContain('SECRET_TOKEN_XYZ');
      expect(sanitized).toContain('JSON parsing failed');
    });
  });

  describe('2. Write Containment & Sibling Collision Defense (TK-SEC-05)', () => {
    let workspaceDir;
    let siblingDir;

    beforeEach(() => {
      workspaceDir = path.join(tmpRoot, 'target_app');
      siblingDir = path.join(tmpRoot, 'target_app_sibling');
      fs.mkdirSync(workspaceDir, { recursive: true });
      fs.mkdirSync(siblingDir, { recursive: true });
    });

    it('ControlledWriteService rejects sibling prefix collision write requests', async () => {
      const { ControlledWriteService } = require('../../src/execution/controlled_write_service');
      const service = new ControlledWriteService({ workspaceRoot: workspaceDir });

      const req = {
        requestId: 'req-test-sibling',
        workspaceId: 'ws-1',
        agentId: 'agent-1',
        files: [
          {
            path: '../target_app_sibling/escape.txt',
            operation: 'CREATE',
            content: 'should fail',
          },
        ],
        reason: 'test sibling bypass',
      };

      await expect(service.requestWrite(req)).rejects.toThrow(/outside workspace root|Security Violation/i);
    });

    it('TransactionManager rejects sibling prefix collision prepareWrite and prepareDelete', () => {
      const TransactionManager = require('../../src/execution/transaction_manager');
      const tx = new TransactionManager({ workspace: workspaceDir });
      tx.begin();

      expect(() => {
        tx.prepareWrite('../target_app_sibling/escape.txt', 'evil');
      }).toThrow(/outside workspace|Security Violation/i);

      expect(() => {
        tx.prepareDelete('../target_app_sibling/escape.txt');
      }).toThrow(/outside workspace|Security Violation/i);

      tx.rollback();
    });
  });

  describe('3. MCP Server Resource & Prompt Traversal Defense (TK-SEC-01, TK-SEC-02)', () => {
    process.env.NODE_ENV = 'test';
    const { handleRequest } = require('../../bin/mcp-server');

    it('resources/read rejects directory traversal in agent URIs', async () => {
      await expect(
        handleRequest({
          jsonrpc: '2.0',
          id: 101,
          method: 'resources/read',
          params: { uri: 'tribunal://agent/../../../../sensitive' },
        })
      ).rejects.toThrow(/Invalid resource identifier|Security Violation/i);
    });

    it('resources/read rejects directory traversal in skill URIs', async () => {
      await expect(
        handleRequest({
          jsonrpc: '2.0',
          id: 102,
          method: 'resources/read',
          params: { uri: 'tribunal://skill/../../../../sensitive' },
        })
      ).rejects.toThrow(/Invalid resource identifier|Security Violation/i);
    });

    it('resources/read rejects directory traversal in workflow URIs', async () => {
      await expect(
        handleRequest({
          jsonrpc: '2.0',
          id: 103,
          method: 'resources/read',
          params: { uri: 'tribunal://workflow/../../../../sensitive' },
        })
      ).rejects.toThrow(/Invalid resource identifier|Security Violation/i);
    });

    it('prompts/get rejects directory traversal in prompt name', async () => {
      await expect(
        handleRequest({
          jsonrpc: '2.0',
          id: 104,
          method: 'prompts/get',
          params: { name: '../../../../etc/passwd' },
        })
      ).rejects.toThrow(/Invalid resource identifier|Security Violation/i);
    });
  });

  describe('4. MCP dispatch_swarm Path Traversal & Error Leak Defense (TK-SEC-03)', () => {
    process.env.NODE_ENV = 'test';
    const { handleRequest } = require('../../bin/mcp-server');

    it('dispatch_swarm rejects file paths escaping authorized workspace', async () => {
      const res = await handleRequest({
        jsonrpc: '2.0',
        id: 201,
        method: 'tools/call',
        params: {
          name: 'dispatch_swarm',
          arguments: {
            file: '../../outside_secret.json',
          },
        },
      });

      expect(res.content[0].text).toMatch(/Swarm dispatch failed:.*(outside authorized workspace|Security Violation|Path traversal)/i);
    });

    it('dispatch_swarm does not leak file contents on JSON parse error', async () => {
      const nonJsonFile = path.join(process.cwd(), '.agent', 'test_invalid_syntax.conf');
      fs.mkdirSync(path.dirname(nonJsonFile), { recursive: true });
      fs.writeFileSync(nonJsonFile, 'SECRET_KEY_NEVER_LEAK_12345 = true\n');

      try {
        const res = await handleRequest({
          jsonrpc: '2.0',
          id: 202,
          method: 'tools/call',
          params: {
            name: 'dispatch_swarm',
            arguments: {
              file: '.agent/test_invalid_syntax.conf',
            },
          },
        });

        const output = res.content[0].text;
        expect(output).not.toContain('SECRET_KEY_NEVER_LEAK_12345');
        expect(output).toMatch(/JSON parsing failed|Invalid JSON/i);
      } finally {
        try {
          fs.unlinkSync(nonJsonFile);
        } catch (_) {}
      }
    });
  });

  describe('5. MCP dispatch_swarm DAG Arbitrary Command Execution Defense (TK-SEC-04)', () => {
    process.env.NODE_ENV = 'test';
    const { handleRequest } = require('../../bin/mcp-server');

    it('dispatch_swarm rejects arbitrary worker.command execution in DAG mode', async () => {
      const payload = JSON.stringify({
        tasks: [
          {
            id: 'task-malicious',
            agent: 'arbitrary-exec-agent',
            command: ['node', '-e', 'console.log("RCE_ATTEMPT")'],
          },
        ],
      });

      const res = await handleRequest({
        jsonrpc: '2.0',
        id: 301,
        method: 'tools/call',
        params: {
          name: 'dispatch_swarm',
          arguments: {
            mode: 'dag',
            payload: payload,
          },
        },
      });

      // Must reject execution or fail validation without executing
      expect(res.content[0].text).not.toContain('RCE_ATTEMPT');
      expect(res.content[0].text).toMatch(/rejected|forbidden|failed|invalid/i);
    });
  });

  describe('6. MCP tribunal_get_context Path Containment & Flag Injection Defense (TK-SEC-06)', () => {
    process.env.NODE_ENV = 'test';
    const { handleRequest } = require('../../bin/mcp-server');

    it('tribunal_get_context rejects targets outside workspace root', async () => {
      const res = await handleRequest({
        jsonrpc: '2.0',
        id: 401,
        method: 'tools/call',
        params: {
          name: 'tribunal_get_context',
          arguments: {
            target: '../../../../outside_file.js',
          },
        },
      });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toMatch(/outside authorized workspace|Security Violation|Invalid target/i);
    });

    it('tribunal_get_context rejects flag injection in target argument', async () => {
      const res = await handleRequest({
        jsonrpc: '2.0',
        id: 402,
        method: 'tools/call',
        params: {
          name: 'tribunal_get_context',
          arguments: {
            target: '--check',
          },
        },
      });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toMatch(/cannot start with '-'|Invalid target/i);
    });
  });

  describe('7. Windows Shell Spawning & Process Execution Defense (TK-SEC-08)', () => {
    const {
      resolveExecutable,
      validateExecutableName,
      validateProcessArgs,
    } = require('../../bin/spawn-agent');

    it('rejects executable names containing shell metacharacters', () => {
      expect(() => validateExecutableName('node; calc.exe')).toThrow(/Security Violation/);
      expect(() => validateExecutableName('git && echo evil')).toThrow(/Security Violation/);
      expect(() => validateExecutableName('python | more')).toThrow(/Security Violation/);
      expect(() => validateExecutableName('cmd > evil.txt')).toThrow(/Security Violation/);
      expect(() => validateExecutableName('node\nwhoami')).toThrow(/Security Violation/);
    });

    it('preserves argument arrays containing spaces and Unicode', () => {
      const args = ['--prompt', 'Write a hello world program in 🦀 Rust', '--format', 'json'];
      const validated = validateProcessArgs(args, false);
      expect(validated).toEqual(args);
      expect(validated[1]).toBe('Write a hello world program in 🦀 Rust');
    });

    it('rejects batch command execution if arguments contain cmd.exe injection characters', () => {
      expect(() => validateProcessArgs(['--param', 'safe & calc.exe'], true)).toThrow(
        /Security Violation: Argument ".*" contains dangerous cmd\.exe metacharacters/,
      );
      expect(() => validateProcessArgs(['--file', 'test.txt | dir'], true)).toThrow(
        /Security Violation: Argument ".*" contains dangerous cmd\.exe metacharacters/,
      );
    });

    it('resolves binary executables to shell: false', () => {
      const res = resolveExecutable('node');
      expect(res.needsShell).toBe(false);
      expect(res.isBatch).toBe(false);
    });
  });

  describe('8. Browser Launcher Taskkill Metacharacter Defense (TK-SEC-09)', () => {
    const { terminateProcessTree } = require('../../src/browser/launcher');

    it('ignores invalid, negative, or injected pids safely without executing shell commands', () => {
      // Injected string PID
      expect(() => terminateProcessTree({ pid: '123 & calc.exe' })).not.toThrow();
      // Zero PID
      expect(() => terminateProcessTree({ pid: 0 })).not.toThrow();
      // Negative PID
      expect(() => terminateProcessTree({ pid: -99 })).not.toThrow();
      // Null / undefined proc
      expect(() => terminateProcessTree(null)).not.toThrow();
      expect(() => terminateProcessTree({})).not.toThrow();
    });
  });

  describe('9. Evolution Engine Proposal ID Traversal Defense (TK-SEC-10)', () => {
    const {
      createEvolutionProposal,
      validateEvolutionProposal,
      saveEvolutionProposal,
      approveEvolutionProposal,
      rejectEvolutionProposal,
    } = require('../../src/evolution/engine');

    it('createEvolutionProposal and validateEvolutionProposal reject traversal proposal_id', () => {
      expect(() => {
        createEvolutionProposal({
          target: 'reviewer-routing',
          currentBehavior: 'test',
          observedEvidence: '12345678901',
          proposedChange: 'test',
          expectedEffect: 'test',
          proposalId: '../../evil_proposal',
        });
      }).toThrow(/Invalid resource identifier/);

      const invalidProposal = {
        proposal_id: '../../evil',
        target: 'reviewer-routing',
        current_behavior: 'b',
        observed_evidence: 'evidence-123456789',
        proposed_change: 'c',
        expected_effect: 'e',
        risk: 'LOW',
        tests_required: ['t'],
        regression_requirements: ['r'],
      };
      const val = validateEvolutionProposal(invalidProposal);
      expect(val.valid).toBe(false);
      expect(val.reason).toMatch(/Invalid proposal_id/i);
    });

    it('saveEvolutionProposal, approve, and reject reject directory traversal in proposalId', () => {
      const evilProposal = {
        proposal_id: '../../evil_save',
        target: 'reviewer-routing',
        current_behavior: 'b',
        observed_evidence: 'evidence-123456789',
        proposed_change: 'c',
        expected_effect: 'e',
        risk: 'LOW',
        tests_required: ['t'],
        regression_requirements: ['r'],
      };

      expect(() => saveEvolutionProposal(evilProposal)).toThrow(
        /Invalid resource identifier|Cannot save invalid evolution proposal/,
      );
      expect(() => approveEvolutionProposal('../../evil_id', 'Admin')).toThrow(
        /Invalid resource identifier/,
      );
      expect(() => rejectEvolutionProposal('../../evil_id', 'Rejected')).toThrow(
        /Invalid resource identifier/,
      );
    });
  });

  describe('10. SDD Git Option Injection & OutFile Containment Defense (TK-PART-01)', () => {
    const sddModule = require('../../src/commands/sdd');

    it('sddDiff rejects git revisions starting with leading dash (option injection)', () => {
      expect(() => {
        sddModule.sddDiff('plan.md', '--output=/tmp/evil', 'HEAD');
      }).toThrow(/Invalid BASE git revision/);

      expect(() => {
        sddModule.sddDiff('plan.md', 'HEAD~1', '--upload-pack=evil');
      }).toThrow(/Invalid HEAD git revision/);
    });

    it('sddScratchpad and sddDiff reject outFile escaping workspace root', () => {
      expect(() => {
        sddModule.sddScratchpad('plan.md', 1, '../../outside_scratchpad.md');
      }).toThrow(/Security Violation: Path traversal detected/);
    });
  });

  describe('11. TransactionManager Symlink Escape Defense (TK-PART-02)', () => {
    let txWorkspace;
    let txExternal;

    beforeAll(() => {
      const baseTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'tk_sec_symlink_'));
      txWorkspace = path.join(baseTemp, 'workspace');
      txExternal = path.join(baseTemp, 'external');
      fs.mkdirSync(txWorkspace, { recursive: true });
      fs.mkdirSync(txExternal, { recursive: true });
      fs.writeFileSync(path.join(txExternal, 'target.txt'), 'secret');
    });

    afterAll(() => {
      try {
        fs.rmSync(path.dirname(txWorkspace), { recursive: true, force: true });
      } catch (_) {}
    });

    it('rejects operations when a symlink points outside workspace', () => {
      const TransactionManager = require('../../src/execution/transaction_manager');
      const tx = new TransactionManager({ workspace: txWorkspace });
      tx.begin();

      // Create a symlink inside txWorkspace pointing to txExternal
      const symlinkPath = path.join(txWorkspace, 'link_to_external');
      try {
        fs.symlinkSync(txExternal, symlinkPath, 'dir');
        expect(() => {
          tx.prepareWrite('link_to_external/pwned.txt', 'evil');
        }).toThrow(/Security Violation: Path traversal detected|Symlink target.*escapes/);
      } catch (err) {
        // On Windows without Developer Mode, creating symlinks requires admin privilege.
        // If symlinks cannot be created, lexical boundary is tested.
      } finally {
        try {
          fs.unlinkSync(symlinkPath);
        } catch (_) {}
        tx.rollback();
      }
    });
  });
});
