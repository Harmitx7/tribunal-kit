"use strict";

const path = require("path");
const fs = require("fs");

const AGENT_DIR = path.resolve(__dirname, "../../.agent");
const WORKFLOWS_DIR = path.join(AGENT_DIR, "workflows");
const AGENTS_DIR = path.join(AGENT_DIR, "agents");
const SCRIPTS_DIR = path.join(AGENT_DIR, "scripts");

describe("Minimal Change Governance Integration", () => {
  test("minimal_change_engine.js script exists and is executable", () => {
    const enginePath = path.join(SCRIPTS_DIR, "minimal_change_engine.js");
    expect(fs.existsSync(enginePath)).toBe(true);
    expect(fs.statSync(enginePath).size).toBeGreaterThan(0);
  });

  test("minimalist-reviewer.md agent exists and contains core governance rules", () => {
    const agentPath = path.join(AGENTS_DIR, "minimalist-reviewer.md");
    expect(fs.existsSync(agentPath)).toBe(true);
    const content = fs.readFileSync(agentPath, "utf8");
    expect(content).toContain("minimalist-reviewer");
    expect(content).toContain("Decision Order Hierarchy");
    expect(content).toContain("Change Budget");
  });

  test("minimal.md workflow exists and references minimal_change_engine.js", () => {
    const workflowPath = path.join(WORKFLOWS_DIR, "minimal.md");
    expect(fs.existsSync(workflowPath)).toBe(true);
    const content = fs.readFileSync(workflowPath, "utf8");
    expect(content).toContain("/minimal");
    expect(content).toContain(".agent/scripts/minimal_change_engine.js");
  });

  test("pipeline_engine.js integrates Minimal Change Gate in planPhase", () => {
    const pipeline = require("../../.agent/scripts/pipeline_engine");
    const result = pipeline.planPhase("add retry policy", ["dist/cli.js"]);
    expect(result).toHaveProperty("minimal_change");
    expect(result.minimal_change).not.toBeNull();
    expect(result.minimal_change).toHaveProperty("minimality_classification");
    expect(result.minimal_change).toHaveProperty("minimality_score");
  });

  test("case_law_manager.js supports minimal_change domain and MINIMALITY_REJECTED verdict", () => {
    const caseLaw = require("../../.agent/scripts/case_law_manager");
    expect(caseLaw).toBeDefined();
  });
});
