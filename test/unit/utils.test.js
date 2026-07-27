"use strict";

const { normalizeCommand } = require("../../.agent/scripts/_utils");

describe("normalizeCommand", () => {
  test("only appends .cmd for Windows package-manager shims", () => {
    expect(normalizeCommand("npm", "win32")).toBe("npm.cmd");
    expect(normalizeCommand("node", "win32")).toBe("node");
    expect(normalizeCommand("cargo", "win32")).toBe("cargo");
    expect(normalizeCommand("C:\\tools\\node.exe", "win32")).toBe("C:\\tools\\node.exe");
  });
});
