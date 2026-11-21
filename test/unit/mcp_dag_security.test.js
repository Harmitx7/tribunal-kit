'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { SwarmOrchestrator } = require('../../.agent/scripts/swarm_dispatcher');
const { DAGPayloadSchema, validatePayload } = require('../../.agent/scripts/payload_schemas');
const { McpServer } = require('../../.agent/scripts/mcp_server');

describe('TK-SEC-004: MCP Server & DAG Execution Hardening', () => {
  describe('DAG Payload Limits & Security Constraints', () => {
    it('rejects DAG with more than 50 tasks at the schema level', () => {
      const tasks = [];
      for (let i = 0; i < 51; i++) {
        tasks.push({ id: `task-${i}`, agent: 'security-auditor' });
      }
      const val = validatePayload({ tasks }, DAGPayloadSchema);
      expect(val.valid).toBe(false);
      expect(val.errors.some(e => e.message.includes('50'))).toBe(true);
    });

    it('rejects invalid agent names with directory traversal in DAG schema', () => {
      const payload = {
        tasks: [{ id: 'task-1', agent: '../../evil-agent' }],
      };
      const val = validatePayload(payload, DAGPayloadSchema);
      expect(val.valid).toBe(false);
    });

    it('executeDAG throws when tasks exceed 50 count', async () => {
      const orchestrator = new SwarmOrchestrator();
      const tasks = [];
      for (let i = 0; i < 55; i++) {
        tasks.push({ id: `task-${i}` });
      }
      await expect(orchestrator.executeDAG({ tasks })).rejects.toThrow(/Task limit exceeded/);
    });

    it('executeDAG throws on path traversal in worker.files', async () => {
      const orchestrator = new SwarmOrchestrator();
      const payload = {
        tasks: [
          {
            id: 'task-leak',
            agent: 'backend-specialist',
            files: ['../../../../etc/shadow'],
          },
        ],
      };
      await expect(orchestrator.executeDAG(payload)).rejects.toThrow(
        /Path traversal|Path security violation/,
      );
    });

    it('executeDAG throws on unauthorized agent name', async () => {
      const orchestrator = new SwarmOrchestrator();
      const payload = {
        tasks: [
          {
            id: 'task-unreg',
            agent: 'nonexistent-rogue-agent',
          },
        ],
      };
      await expect(orchestrator.executeDAG(payload)).rejects.toThrow(
        /Unauthorized or unregistered agent/,
      );
    });
  });

  describe('MCP Server Security Boundaries', () => {
    let server;
    let writtenMessages = [];
    let tempDir;

    beforeEach(() => {
      writtenMessages = [];
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-test-'));
      server = new McpServer();
      server.send = msg => {
        writtenMessages.push(msg);
      };
    });

    afterEach(() => {
      if (server && server.rl) {
        server.rl.close();
      }
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('rejects payloadFile with path traversal in tribunal_dispatch_dag', () => {
      server.handleMessage({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'tribunal_dispatch_dag',
          arguments: {
            payloadFile: '../../../../sensitive/data.json',
          },
        },
      });

      expect(writtenMessages.length).toBe(1);
      const res = writtenMessages[0];
      expect(res.error).toBeDefined();
      expect(res.error.message).toContain('Path security violation');
    });

    it('requires human approval token for mutating --fix operations', () => {
      server.handleMessage({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'tribunal_lint_runner',
          arguments: {
            args: ['--fix', tempDir],
          },
        },
      });

      expect(writtenMessages.length).toBe(1);
      const res = writtenMessages[0];
      expect(res.error).toBeDefined();
      expect(res.error.message).toContain('Approval Required');
    });

    it('allows mutating --fix operations with verified human approval token', () => {
      server.handleMessage({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'tribunal_lint_runner',
          arguments: {
            args: ['--fix', tempDir],
            approvalToken: 'HUMAN-APPROVED-AUDIT-2026',
          },
        },
      });

      expect(writtenMessages.length).toBe(1);
      const res = writtenMessages[0];
      if (res.error) {
        expect(res.error.message).not.toContain('Approval Required');
      }
    });

    it('rejects stdin line exceeding 1MB limit', () => {
      const hugeLine = 'x'.repeat(1048577);
      server.rl.emit('line', hugeLine);

      expect(writtenMessages.length).toBe(1);
      const res = writtenMessages[0];
      expect(res.error).toBeDefined();
      expect(res.error.message).toContain('Payload Too Large');
    });
  });
});
