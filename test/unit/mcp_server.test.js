"use strict";

// Set environment to test so that mcp-server exports handleRequest and stripBoilerplate
process.env.NODE_ENV = "test";

const _path = require("path");
const _fs = require("fs");
const { handleRequest, stripBoilerplate } = require("../../bin/mcp-server");

describe("MCP Server Boilerplate Stripper", () => {
  test("strips standard duplicate boilerplate blocks from text", () => {
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

  test("handles text without boilerplate gracefully", () => {
    const rawText = "Just normal instructions.";
    expect(stripBoilerplate(rawText)).toBe("Just normal instructions.");
  });

  test("returns empty string for empty input", () => {
    expect(stripBoilerplate("")).toBe("");
    expect(stripBoilerplate(null)).toBeNull();
  });
});

describe("MCP Server handleRequest", () => {
  test("handles initialize request correctly", () => {
    const req = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {}
    };
    const result = handleRequest(req);
    expect(result.protocolVersion).toBe("2024-11-05");
    expect(result.serverInfo.name).toBe("tribunal-kit-mcp");
  });

  test("lists tools including get_sparse_context", () => {
    const req = {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {}
    };
    const result = handleRequest(req);
    expect(result.tools).toBeDefined();
    
    const getSparseContextTool = result.tools.find(t => t.name === "get_sparse_context");
    expect(getSparseContextTool).toBeDefined();
    expect(getSparseContextTool.inputSchema.required).toContain("task");
  });

  test("get_sparse_context throws error if task is missing", () => {
    const req = {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "get_sparse_context",
        arguments: {}
      }
    };
    expect(() => handleRequest(req)).toThrow();
  });

  test("get_sparse_context returns sparse context prompt", () => {
    const req = {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "get_sparse_context",
        arguments: {
          task: "Build JWT authentication API with Hono",
          files: ["src/auth.ts"],
          model: "large"
        }
      }
    };
    
    // We mock process.cwd or make sure .agent/ exists
    // The test runs from the project root where .agent/ actually exists!
    const result = handleRequest(req);
    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe("text");
    
    const text = result.content[0].text;
    expect(text).toContain("Tribunal Context Broker");
    expect(text).toContain("Task: Build JWT authentication API with Hono");
    // Ensure duplicate boilerplate is stripped from the returned prompt
    expect(text).not.toContain("AI coding assistants often fall into specific bad habits");
  });

  test("get_tribunal_skill strips boilerplate", () => {
    const req = {
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: {
        name: "get_tribunal_skill",
        arguments: {
          name: "clean-code"
        }
      }
    };

    const result = handleRequest(req);
    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe("text");
    
    const text = result.content[0].text;
    expect(text).not.toContain("AI coding assistants often fall into specific bad habits");
    expect(text).not.toContain("VBC Protocol");
  });
});
