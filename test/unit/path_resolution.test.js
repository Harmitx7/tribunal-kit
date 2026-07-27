"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { getMarathonDir } = require("../../.agent/scripts/marathon_harness");

describe("agent path resolution", () => {
  test("marathon state resolves from the nearest .agent directory", () => {
    const nestedPath = path.join(process.cwd(), "test", "unit", "nested");
    expect(getMarathonDir(nestedPath)).toBe(path.join(process.cwd(), ".agent", "history", "marathon"));
  });

  test("skill evolution can be imported outside an initialized workspace", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tk-skill-import-"));
    const script = path.resolve(__dirname, "../../.agent/scripts/skill_evolution.js");
    try {
      const result = spawnSync(
        process.execPath,
        ["-e", "process.chdir(process.argv[1]); require(process.argv[2]); console.log('loaded')", tempDir, script],
        { encoding: "utf8" },
      );
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("loaded");
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
