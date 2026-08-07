"use strict";

const { cmdLearn } = require("../../dist/commands/learn");
const { getKitAgent } = require("../../dist/utils/helpers");

describe("cmdLearn command", () => {
  test("exports cmdLearn function", () => {
    expect(typeof cmdLearn).toBe("function");
  });

  test("runs without crashing in quiet mode when target dir has no git diff", async () => {
    const flags = { quiet: true, head: false };
    // Should resolve cleanly
    await expect(cmdLearn(flags, true)).resolves.not.toThrow();
  });
});
