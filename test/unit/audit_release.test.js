"use strict";

const fs = require("fs");
const path = require("path");

process.env.NODE_ENV = "test";
const { handleRequest } = require("../../bin/mcp-server");

describe("Release Audit Verification & Counts", () => {
  const rootDir = path.join(__dirname, "../..");
  const agentDir = path.join(rootDir, ".agent");
  const routingIndexPath = path.join(agentDir, "routing_index.json");

  test("routing_index.json summary counts match actual filesystem totals", () => {
    expect(fs.existsSync(routingIndexPath)).toBe(true);

    const routingIndex = JSON.parse(fs.readFileSync(routingIndexPath, "utf8"));
    const { summary } = routingIndex;

    const agentFiles = fs.readdirSync(path.join(agentDir, "agents")).filter(f => f.endsWith(".md"));
    const workflowFiles = fs.readdirSync(path.join(agentDir, "workflows")).filter(f => f.endsWith(".md"));
    const skillDirs = fs.readdirSync(path.join(agentDir, "skills"), { withFileTypes: true })
      .filter(d => d.isDirectory() && fs.existsSync(path.join(agentDir, "skills", d.name, "SKILL.md")));

    expect(summary.total_agents).toBe(agentFiles.length);
    expect(summary.total_workflows).toBe(workflowFiles.length);
    expect(summary.total_skills).toBe(skillDirs.length);
  });

  test("MCP Server handles resources/list and prompts/list correctly according to spec", () => {
    const resListReq = { jsonrpc: "2.0", id: 101, method: "resources/list", params: {} };
    const resListResult = handleRequest(resListReq);
    expect(Array.isArray(resListResult.resources)).toBe(true);
    expect(resListResult.resources.length).toBeGreaterThan(0);

    const promptListReq = { jsonrpc: "2.0", id: 102, method: "prompts/list", params: {} };
    const promptListResult = handleRequest(promptListReq);
    expect(Array.isArray(promptListResult.prompts)).toBe(true);
    expect(promptListResult.prompts.length).toBeGreaterThan(0);
  });
});
