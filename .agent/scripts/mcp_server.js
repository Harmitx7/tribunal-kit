#!/usr/bin/env node
/**
 * mcp_server.js
 * Model Context Protocol (MCP) server for Tribunal Kit.
 * Exposes internal Tribunal Kit capabilities (Syscalls) natively to MCP clients.
 */

'use strict';

const readline = require('readline');
const { SYSCALL_MAP, executeSyscall } = require('./syscall_registry');
const { appendEvent } = require('./session_logger');
const { assertWithinRoot } = require('./_utils');

class McpServer {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    this.rl.on('line', line => {
      if (line.length > 1048576) {
        return this.sendError(
          null,
          -32600,
          'Payload Too Large: Maximum stdin frame size is 1MB (1048576 bytes).',
        );
      }
      try {
        const req = JSON.parse(line);
        this.handleMessage(req);
      } catch (_err) {
        this.sendError(null, -32700, 'Parse error');
      }
    });

    // Generate tools manifest from syscall registry
    this.tools = Object.keys(SYSCALL_MAP).map(syscallName => ({
      name: `tribunal_${syscallName}`,
      description: `Executes the Tribunal Kit ${syscallName} script securely.`,
      inputSchema: {
        type: 'object',
        properties: {
          args: {
            type: 'array',
            items: { type: 'string' },
            description: `Arguments to pass. Allowed arguments: ${SYSCALL_MAP[syscallName].allowedArgs.join(', ')}`,
          },
        },
      },
    }));

    // Add DAG dispatch as an exposed MCP tool
    this.tools.push({
      name: 'tribunal_dispatch_dag',
      description:
        'Dispatch a Dynamic Directed Acyclic Graph (DAG) for parallel, staged execution.',
      inputSchema: {
        type: 'object',
        properties: {
          payloadFile: {
            type: 'string',
            description: 'Path to the JSON payload file containing the DAG',
          },
        },
        required: ['payloadFile'],
      },
    });
  }

  send(response) {
    process.stdout.write(JSON.stringify(response) + '\n');
  }

  sendError(id, code, message) {
    this.send({
      jsonrpc: '2.0',
      id: id || null,
      error: { code, message },
    });
  }

  handleMessage(req) {
    if (req.method === 'initialize') {
      this.send({
        jsonrpc: '2.0',
        id: req.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'tribunal-mcp', version: '1.0.0' },
        },
      });
      return;
    }

    if (req.method === 'tools/list') {
      this.send({
        jsonrpc: '2.0',
        id: req.id,
        result: { tools: this.tools },
      });
      return;
    }

    if (req.method === 'tools/call') {
      this.handleToolCall(req);
      return;
    }

    // Ignore unsupported methods gracefully
    this.sendError(req.id, -32601, 'Method not found');
  }

  handleToolCall(req) {
    const { name, arguments: args } = req.params;

    // Log the MCP interaction natively into the session.jsonl log
    const eventId = appendEvent(
      'ToolRequested',
      {
        tool: name,
        args: args,
      },
      'mcp-server',
    );

    if (name === 'tribunal_dispatch_dag') {
      const payloadFile = args && args.payloadFile;
      if (!payloadFile || typeof payloadFile !== 'string') {
        return this.sendError(req.id, -32602, 'Missing or invalid payloadFile argument');
      }

      let safePayloadPath;
      try {
        safePayloadPath = assertWithinRoot(process.cwd(), payloadFile);
      } catch (pathErr) {
        return this.sendError(req.id, -32602, `Path security violation: ${pathErr.message}`);
      }

      try {
        const { spawnSync } = require('child_process');
        const scriptPath = require('path').join(__dirname, 'swarm_dispatcher.js');
        const result = spawnSync(
          process.execPath,
          [scriptPath, '--mode', 'dag', '--file', safePayloadPath],
          {
            cwd: process.cwd(),
            encoding: 'utf8',
            timeout: 120000,
            shell: false,
          },
        );

        appendEvent(
          'ToolCompleted',
          { exitCode: result.status, requestEventId: eventId },
          'mcp-server',
        );
        this.send({
          jsonrpc: '2.0',
          id: req.id,
          result: {
            content: [
              {
                type: 'text',
                text: result.stdout || (result.stderr ? 'Error: ' + result.stderr : 'Executed.'),
              },
            ],
          },
        });
      } catch (err) {
        this.sendError(req.id, -32603, 'Internal execution error: ' + err.message);
      }
      return;
    }

    // Process syscall registry tools
    const prefix = 'tribunal_';
    if (name.startsWith(prefix)) {
      const syscall = name.substring(prefix.length);
      const syscallArgs = (args && args.args) || [];
      if (syscallArgs.includes('--fix')) {
        const token = (args && args.approvalToken) || (req.params && req.params.approvalToken);
        if (!token || typeof token !== 'string' || !token.startsWith('HUMAN-APPROVED-')) {
          return this.sendError(
            req.id,
            -32001,
            'Approval Required: Mutating operations (--fix) require a verified human approval token.',
          );
        }
      }

      const result = executeSyscall(syscall, syscallArgs);

      if (result.exitCode === 0) {
        appendEvent(
          'ToolCompleted',
          { exitCode: 0, stdout: result.stdout, requestEventId: eventId },
          'mcp-server',
        );
        this.send({
          jsonrpc: '2.0',
          id: req.id,
          result: {
            content: [{ type: 'text', text: result.stdout }],
          },
        });
      } else {
        appendEvent(
          'ErrorEncountered',
          { exitCode: result.exitCode, message: result.stderr, requestEventId: eventId },
          'mcp-server',
        );
        this.send({
          jsonrpc: '2.0',
          id: req.id,
          result: {
            content: [{ type: 'text', text: 'Error: ' + result.stderr + '\n' + result.stdout }],
            isError: true,
          },
        });
      }
      return;
    }

    this.sendError(req.id, -32601, 'Tool not found');
  }
}

if (require.main === module) {
  new McpServer();
}

module.exports = { McpServer };
