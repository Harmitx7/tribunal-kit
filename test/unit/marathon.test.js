"use strict";

const fs = require("fs");
const { spawn } = require("child_process");
const { cmdMarathon } = require("../../bin/tribunal-kit");

jest.mock("fs");
jest.mock("child_process");

describe("cmdMarathon", () => {
  let mockExit;
  let mockConsoleError;
  let mockConsoleLog;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExit = jest.spyOn(process, "exit").mockImplementation(() => {});
    mockConsoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockConsoleLog = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    mockExit.mockRestore();
    mockConsoleError.mockRestore();
    mockConsoleLog.mockRestore();
  });

  test("exits if .agent/ is not found", async () => {
    fs.existsSync.mockReturnValue(false);
    const flags = { path: "./dummy" };

    await cmdMarathon(flags);

    expect(fs.existsSync).toHaveBeenCalled();
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining(".agent/ not found"),
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  test("prints help when args are empty", async () => {
    fs.existsSync.mockReturnValue(true);
    const originalArgv = process.argv;
    process.argv = ["node", "tribunal-kit.js", "marathon"]; // no extra args

    const flags = { path: "./dummy" };
    await cmdMarathon(flags);

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("Marathon"),
    );
    expect(spawn).not.toHaveBeenCalled();

    process.argv = originalArgv;
  });

  test("executes marathon_harness.js with provided args", async () => {
    fs.existsSync.mockReturnValue(true);
    const originalArgv = process.argv;
    process.argv = ["node", "tribunal-kit.js", "marathon", "status"];

    // Mock spawn to simulate a successful child process
    const mockChild = {
      on: jest.fn((event, cb) => {
        if (event === "close") {
          setImmediate(() => cb(0));
        }
      }),
    };
    spawn.mockReturnValue(mockChild);

    const flags = { path: "./dummy" };
    await cmdMarathon(flags);

    expect(spawn).toHaveBeenCalledWith(
      process.execPath,
      [expect.stringContaining("marathon_harness.js"), "status"],
      expect.any(Object),
    );
    expect(mockExit).not.toHaveBeenCalled();

    process.argv = originalArgv;
  });

  test("catches execution errors gracefully and exits 1", async () => {
    fs.existsSync.mockReturnValue(true);
    const originalArgv = process.argv;
    process.argv = ["node", "tribunal-kit.js", "marathon", "status"];

    // Mock spawn to simulate a failing child process
    const mockChild = {
      on: jest.fn((event, cb) => {
        if (event === "close") {
          setImmediate(() => cb(1));
        }
      }),
    };
    spawn.mockReturnValue(mockChild);

    const flags = { path: "./dummy" };
    await cmdMarathon(flags);

    expect(spawn).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(1);

    process.argv = originalArgv;
  });
});
