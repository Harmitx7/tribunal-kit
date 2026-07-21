"use strict";

const { cmdOptimizeSkill } = require("../../dist/commands/optimize");
const fs = require("fs");
const _path = require("path");
const _child_process = require("child_process");

jest.mock("fs");
jest.mock("child_process");

describe("cmdOptimizeSkill", () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("fails immediately if no agent directory is present", async () => {
    fs.existsSync.mockReturnValue(false);
    
    const mockExit = jest.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`process.exit called with: ${code}`);
    });

    await expect(cmdOptimizeSkill({ target: "project-idioms" }, [])).rejects.toThrow("process.exit called with: 1");
    mockExit.mockRestore();
  });

  test("fails if no LLM key is found in environment", async () => {
    // Mock agent dir exists
    fs.existsSync.mockImplementation((p) => {
      if (p.includes(".agent")) return true;
      return false;
    });

    // Clear LLM env keys
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const mockExit = jest.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`process.exit called with: ${code}`);
    });

    await expect(cmdOptimizeSkill({ target: "project-idioms" }, [])).rejects.toThrow("process.exit called with: 1");
    mockExit.mockRestore();
  });

  test("fails if core binary is not found", async () => {
    // Mock agent dir exists
    fs.existsSync.mockImplementation((p) => {
      if (p.includes(".agent")) return true;
      // Core binary does not exist
      return false;
    });

    process.env.GEMINI_API_KEY = "test-key";

    const mockExit = jest.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`process.exit called with: ${code}`);
    });

    await expect(cmdOptimizeSkill({ target: "project-idioms" }, [])).rejects.toThrow("process.exit called with: 1");
    mockExit.mockRestore();
  });
});
