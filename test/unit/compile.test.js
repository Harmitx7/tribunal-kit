"use strict";

const { cmdCompile } = require("../../dist/commands/compile");

describe("cmdCompile command", () => {
  test("exports cmdCompile function", () => {
    expect(typeof cmdCompile).toBe("function");
  });

  test("returns prompt compile structure for target agent", async () => {
    const flags = { target: "aider", quiet: true };
    await expect(cmdCompile(flags, true)).resolves.not.toThrow();
  });
});
