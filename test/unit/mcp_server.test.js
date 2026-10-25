'use strict';

// Set environment to test so that mcp-server exports handleRequest and stripBoilerplate
process.env.NODE_ENV = 'test';

const _path = require('path');
const _fs = require('fs');
const { handleRequest, stripBoilerplate, runTribunalAudit } = require('../../bin/mcp-server');

describe('MCP Server Boilerplate Stripper', () => {
  test('strips standard duplicate boilerplate blocks from text', async () => {
    const rawText = `## Core Rules
- Rule 1
- Rule 2

AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:
1. Over-engineering
2. Hallucinated libraries

## Pre-Flight Checklist
- Check files
- Check imports

## VBC Protocol (Verification-Before-Completion)
Verify everything.
`;

    const expected = `## Core Rules
- Rule 1
- Rule 2`;

    expect(stripBoilerplate(rawText)).toBe(expected);
  });

  test('handles text without boilerplate gracefully', async () => {
    const rawText = 'Just normal instructions.';
    expect(stripBoilerplate(rawText)).toBe('Just normal instructions.');
  });

  test('returns empty string for empty input', async () => {
    expect(stripBoilerplate('')).toBe('');
    expect(stripBoilerplate(null)).toBeNull();
  });
});

describe('MCP Server handleRequest', () => {
  test('handles initialize request correctly', async () => {
    const req = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {},
    };
    const result = await handleRequest(req);
    expect(result.protocolVersion).toBe('2025-03-26');
    expect(result.serverInfo.name).toBe('tribunal-kit-mcp');
  });

  test('lists tools including get_sparse_context', async () => {
    const req = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    };
    const result = await handleRequest(req);
    expect(result.tools).toBeDefined();

    const getSparseContextTool = result.tools.find(t => t.name === 'get_sparse_context');
    expect(getSparseContextTool).toBeDefined();
    expect(getSparseContextTool.inputSchema.required).toContain('task');

    expect(result.tools.find(t => t.name === 'tk_browser_navigate')).toBeDefined();
    expect(result.tools.find(t => t.name === 'tk_browser_audit')).toBeDefined();
    expect(result.tools.find(t => t.name === 'tk_browser_compare')).toBeDefined();
    expect(result.tools.find(t => t.name === 'tk_deconstruct_component')).toBeDefined();
    expect(result.tools.find(t => t.name === 'tk_heal_runtime_errors')).toBeDefined();
    expect(result.tools.find(t => t.name === 'tk_codify_browser_audit')).toBeDefined();
  });

  test('uses the in-process manifest audit rather than schema validation', async () => {
    const text = runTribunalAudit();
    expect(text).toContain('Tribunal audit complete.');
    expect(text).toMatch(/Agents: \d+ \(\d+ reviewers\)/);

    const result = await handleRequest({
      jsonrpc: '2.0',
      id: 20,
      method: 'tools/call',
      params: { name: 'run_tribunal_audit', arguments: {} },
    });
    expect(result.content[0].text).toContain('Tribunal audit');
  });

  test('get_sparse_context throws error if task is missing', async () => {
    const req = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'get_sparse_context',
        arguments: {},
      },
    };
    await expect(handleRequest(req)).rejects.toThrow();
  });

  test('get_sparse_context returns sparse context prompt', async () => {
    const req = {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'get_sparse_context',
        arguments: {
          task: 'Build JWT authentication API with Hono',
          files: ['src/auth.ts'],
          model: 'large',
        },
      },
    };

    const cp = require('child_process');
    const spawnSpy = jest.spyOn(cp, 'spawn').mockImplementation(() => {
      const { EventEmitter } = require('events');
      const child = new EventEmitter();
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();

      process.nextTick(() => {
        child.stdout.emit('data', JSON.stringify({ success: true }));
        child.emit('close', 0);
      });
      return child;
    });

    const result = await handleRequest(req);
    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');

    const text = result.content[0].text;
    expect(text).toContain('Tribunal Context Broker');
    expect(text).toContain('Task: Build JWT authentication API with Hono');
    expect(text).not.toContain('AI coding assistants often fall into specific bad habits');

    spawnSpy.mockRestore();
  });

  test('get_tribunal_skill strips boilerplate', async () => {
    const req = {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'get_tribunal_skill',
        arguments: {
          name: 'clean-code',
        },
      },
    };

    const result = await handleRequest(req);
    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');

    const text = result.content[0].text;
    expect(text).not.toContain('AI coding assistants often fall into specific bad habits');
    expect(text).not.toContain('VBC Protocol');
  });

  test('SEC-003: get_tribunal_agent and get_tribunal_skill reject path traversal and invalid identifiers', async () => {
    // get_tribunal_agent with path traversal
    const reqAgent = {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'get_tribunal_agent',
        arguments: { name: '../../evil' },
      },
    };
    await expect(handleRequest(reqAgent)).rejects.toThrow(/Invalid agent name: path traversal detected/);

    // get_tribunal_skill with path traversal
    const reqSkill = {
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: {
        name: 'get_tribunal_skill',
        arguments: { name: '../bad_skill' },
      },
    };
    await expect(handleRequest(reqSkill)).rejects.toThrow(/Invalid skill name: path traversal detected/);
  });

  test('SEC-003: get_ast_context and query_semantic_graph reject flag injection and traversal', async () => {
    // get_ast_context with flag option
    const reqAstFlag = {
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/call',
      params: {
        name: 'get_ast_context',
        arguments: { targetPath: '--output=evil' },
      },
    };
    await expect(handleRequest(reqAstFlag)).rejects.toThrow(/Invalid targetPath/);

    // query_semantic_graph with flag option
    const reqGraphFlag = {
      jsonrpc: '2.0',
      id: 9,
      method: 'tools/call',
      params: {
        name: 'query_semantic_graph',
        arguments: { targetPath: '-v' },
      },
    };
    await expect(handleRequest(reqGraphFlag)).rejects.toThrow(/Invalid targetPath/);
  });

  test('SEC-003: verify_contracts rejects file path traversal escaping projectRoot', async () => {
    const reqContracts = {
      jsonrpc: '2.0',
      id: 10,
      method: 'tools/call',
      params: {
        name: 'verify_contracts',
        arguments: {
          file: '../../outside_secret.ts',
          content: 'export const secret = 42;',
        },
      },
    };
    const result = await handleRequest(reqContracts);
    expect(result.content[0].text).toMatch(/Path security violation|Path traversal detected/);
  });
});


