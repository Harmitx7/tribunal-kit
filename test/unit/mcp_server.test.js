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

    // We mock process.cwd or make sure .agent/ exists
    // The test runs from the project root where .agent/ actually exists!
    const result = await handleRequest(req);
    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');

    const text = result.content[0].text;
    expect(text).toContain('Tribunal Context Broker');
    expect(text).toContain('Task: Build JWT authentication API with Hono');
    // Ensure duplicate boilerplate is stripped from the returned prompt
    expect(text).not.toContain('AI coding assistants often fall into specific bad habits');
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
});
