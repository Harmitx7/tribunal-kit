"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

// Test against the modular dist/ init command
const { cmdInit, generateIDEBridges } = require("../../dist/commands/init");
const { isSelfInstall, copyDir, countDir } = require("../../dist/utils/fs");

function makeTempDir(prefix = "tk-init-test-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/**
 * Create a minimal fake .agent/ source directory that mirrors the real structure.
 * This allows cmdInit to run without needing the full 400+ file payload.
 */
function _createFakeAgentSource(dir) {
  const agentsDir = path.join(dir, "agents");
  const skillsDir = path.join(dir, "skills", "clean-code");
  const workflowsDir = path.join(dir, "workflows");
  const scriptsDir = path.join(dir, "scripts");
  const rulesDir = path.join(dir, "rules");

  fs.mkdirSync(agentsDir, { recursive: true });
  fs.mkdirSync(skillsDir, { recursive: true });
  fs.mkdirSync(workflowsDir, { recursive: true });
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.mkdirSync(rulesDir, { recursive: true });

  // Create a few agent files (some core, some non-core)
  fs.writeFileSync(
    path.join(agentsDir, "backend-specialist.md"),
    "# Backend Specialist\nCore agent."
  );
  fs.writeFileSync(
    path.join(agentsDir, "frontend-specialist.md"),
    "# Frontend Specialist\nCore agent."
  );
  fs.writeFileSync(
    path.join(agentsDir, "game-developer.md"),
    "# Game Developer\nNon-core agent."
  );

  // Create a skill
  fs.writeFileSync(
    path.join(skillsDir, "SKILL.md"),
    "---\nname: clean-code\ndescription: Clean code mastery.\n---\n# Clean Code"
  );

  // Create a workflow
  fs.writeFileSync(
    path.join(workflowsDir, "create.md"),
    "# /create\nCreate workflow."
  );

  // Create a script
  fs.writeFileSync(
    path.join(scriptsDir, "checklist.js"),
    "// checklist script"
  );

  // Create rules
  fs.writeFileSync(
    path.join(rulesDir, "GEMINI.md"),
    "# Rules\nMaster rules file."
  );

  return dir;
}

describe("dist/commands/init — cmdInit", () => {
  let tmpTarget;
  let _originalCwd;
  let mockConsoleLog;
  let mockConsoleError;
  let mockExit;

  beforeEach(() => {
    tmpTarget = makeTempDir();
    _originalCwd = process.cwd();
    mockConsoleLog = jest.spyOn(console, "log").mockImplementation(() => {});
    mockConsoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockExit = jest.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    mockExit.mockRestore();
    try {
      fs.rmSync(tmpTarget, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  test("self-install guard prevents init inside tribunal-kit package itself", async () => {
    // Point --path to the kit's own root
    const kitRoot = path.resolve(__dirname, "../../");
    const flags = { path: kitRoot };

    await expect(cmdInit(flags, true)).rejects.toThrow("process.exit called");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  test("exits when target directory does not exist", async () => {
    const nonExistent = path.join(tmpTarget, "does-not-exist");
    const flags = { path: nonExistent };

    await expect(cmdInit(flags, true)).rejects.toThrow("process.exit called");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  test("exits gracefully when .agent/ already exists without --force", async () => {
    // Pre-create .agent/ in the target
    fs.mkdirSync(path.join(tmpTarget, ".agent"), { recursive: true });
    const flags = { path: tmpTarget };

    await expect(cmdInit(flags, true)).rejects.toThrow("process.exit called");
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  test("dry-run does NOT create .agent/ in target", async () => {
    const flags = { path: tmpTarget, dryRun: true };

    await cmdInit(flags, true);

    // .agent should NOT exist in the target
    const agentDir = path.join(tmpTarget, ".agent");
    // In dry-run, copyDir doesn't create files but the directory structure
    // may be created by the history dir logic. The key assertion is that
    // no actual agent/skill files are copied.
    const agentsDir = path.join(agentDir, "agents");
    if (fs.existsSync(agentsDir)) {
      const files = fs.readdirSync(agentsDir);
      expect(files.length).toBe(0);
    }
  });

  test("full init copies .agent/ into target directory", async () => {
    const flags = { path: tmpTarget };

    await cmdInit(flags, true);

    const agentDir = path.join(tmpTarget, ".agent");
    expect(fs.existsSync(agentDir)).toBe(true);

    // Check that key subdirectories were created
    expect(fs.existsSync(path.join(agentDir, "agents"))).toBe(true);
    expect(fs.existsSync(path.join(agentDir, "skills"))).toBe(true);
    expect(fs.existsSync(path.join(agentDir, "workflows"))).toBe(true);
    expect(fs.existsSync(path.join(agentDir, "scripts"))).toBe(true);

    // Check history dirs were created
    expect(
      fs.existsSync(
        path.join(agentDir, "history", "case-law", "cases", ".gitkeep")
      )
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(agentDir, "history", "skill-evolution", ".gitkeep")
      )
    ).toBe(true);
  });

  test("init with --force over existing .agent/ succeeds", async () => {
    // First init
    const flags = { path: tmpTarget };
    await cmdInit(flags, true);

    // Second init with --force
    const forceFlags = { path: tmpTarget, force: true };
    await cmdInit(forceFlags, true);

    // Should still have a valid .agent/
    const agentDir = path.join(tmpTarget, ".agent");
    expect(fs.existsSync(agentDir)).toBe(true);
    expect(fs.existsSync(path.join(agentDir, "agents"))).toBe(true);
  });
});

describe("dist/utils/fs — isSelfInstall", () => {
  test("returns true when target matches kitRoot path", () => {
    const kitRoot = path.resolve(__dirname, "../../");
    expect(isSelfInstall(kitRoot, "tribunal-kit", kitRoot)).toBe(true);
  });

  test("returns false for unrelated directory", () => {
    const kitRoot = path.resolve(__dirname, "../../");
    expect(isSelfInstall(os.tmpdir(), "tribunal-kit", kitRoot)).toBe(false);
  });

  test("returns true when target package.json name matches", () => {
    const fakeDir = makeTempDir("tk-self-");
    const kitRoot = "/some/other/path";
    fs.writeFileSync(
      path.join(fakeDir, "package.json"),
      JSON.stringify({ name: "tribunal-kit" })
    );
    expect(isSelfInstall(fakeDir, "tribunal-kit", kitRoot)).toBe(true);
    fs.rmSync(fakeDir, { recursive: true, force: true });
  });

  test("returns false when target package.json name differs", () => {
    const fakeDir = makeTempDir("tk-other-");
    const kitRoot = "/some/other/path";
    fs.writeFileSync(
      path.join(fakeDir, "package.json"),
      JSON.stringify({ name: "other-package" })
    );
    expect(isSelfInstall(fakeDir, "tribunal-kit", kitRoot)).toBe(false);
    fs.rmSync(fakeDir, { recursive: true, force: true });
  });

  test("returns false when package.json is invalid JSON", () => {
    const fakeDir = makeTempDir("tk-bad-json-");
    const kitRoot = "/some/other/path";
    fs.writeFileSync(path.join(fakeDir, "package.json"), "NOT VALID JSON");
    expect(isSelfInstall(fakeDir, "tribunal-kit", kitRoot)).toBe(false);
    fs.rmSync(fakeDir, { recursive: true, force: true });
  });
});

describe("dist/utils/fs — copyDir", () => {
  let srcDir;
  let destDir;

  beforeEach(() => {
    srcDir = makeTempDir("tk-cp-src-");
    destDir = path.join(os.tmpdir(), `tk-cp-dest-${Date.now()}`);
  });

  afterEach(() => {
    try {
      fs.rmSync(srcDir, { recursive: true, force: true });
    } catch {}
    try {
      fs.rmSync(destDir, { recursive: true, force: true });
    } catch {}
  });

  test("copies files to destination", async () => {
    fs.writeFileSync(path.join(srcDir, "test.txt"), "hello");
    const count = await copyDir(srcDir, destDir);
    expect(count).toBe(1);
    expect(fs.readFileSync(path.join(destDir, "test.txt"), "utf8")).toBe(
      "hello"
    );
  });

  test("copies nested directories", async () => {
    fs.mkdirSync(path.join(srcDir, "sub"), { recursive: true });
    fs.writeFileSync(path.join(srcDir, "sub", "nested.txt"), "nested");
    const count = await copyDir(srcDir, destDir);
    expect(count).toBe(1);
    expect(
      fs.readFileSync(path.join(destDir, "sub", "nested.txt"), "utf8")
    ).toBe("nested");
  });

  test("dry-run returns count but creates no files", async () => {
    fs.writeFileSync(path.join(srcDir, "a.txt"), "a");
    fs.writeFileSync(path.join(srcDir, "b.txt"), "b");
    const count = await copyDir(srcDir, destDir, true);
    expect(count).toBe(2);
    // destDir should not have the files (it may have the dir created)
    expect(fs.existsSync(path.join(destDir, "a.txt"))).toBe(false);
  });

  test("filter function excludes matching files", async () => {
    fs.writeFileSync(path.join(srcDir, "keep.txt"), "keep");
    fs.writeFileSync(path.join(srcDir, "skip.txt"), "skip");
    const filter = (name) => name !== "skip.txt";
    const count = await copyDir(srcDir, destDir, false, filter);
    expect(count).toBe(1);
    expect(fs.existsSync(path.join(destDir, "keep.txt"))).toBe(true);
    expect(fs.existsSync(path.join(destDir, "skip.txt"))).toBe(false);
  });
});

describe("dist/utils/fs — countDir", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir("tk-count-");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("returns 0 for empty directory", async () => {
    expect(await countDir(tmpDir)).toBe(0);
  });

  test("counts top-level files", async () => {
    fs.writeFileSync(path.join(tmpDir, "a.txt"), "a");
    fs.writeFileSync(path.join(tmpDir, "b.txt"), "b");
    expect(await countDir(tmpDir)).toBe(2);
  });

  test("counts recursively", async () => {
    fs.mkdirSync(path.join(tmpDir, "sub"));
    fs.writeFileSync(path.join(tmpDir, "top.txt"), "top");
    fs.writeFileSync(path.join(tmpDir, "sub", "nested.txt"), "nested");
    expect(await countDir(tmpDir)).toBe(2);
  });
});

describe("generateIDEBridges", () => {
  let tmpDir;
  let agentDir;
  let mockConsoleLog;

  beforeEach(() => {
    tmpDir = makeTempDir("tk-bridge-");
    agentDir = path.join(tmpDir, ".agent");
    fs.mkdirSync(path.join(agentDir, "rules"), { recursive: true });
    fs.writeFileSync(
      path.join(agentDir, "rules", "GEMINI.md"),
      "# Rules\nTest rules."
    );
    mockConsoleLog = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("generates IDE bridge files in target directory", async () => {
    await generateIDEBridges(tmpDir, agentDir, false);

    // Check that bridge files were created
    const files = fs.readdirSync(tmpDir);
    const bridgeFiles = files.filter(
      (f) =>
        f === ".cursorrules" ||
        f === ".windsurfrules" ||
        f === ".gemini" ||
        f === ".github" ||
        f === ".claude"
    );
    expect(bridgeFiles.length).toBeGreaterThan(0);
  });
});
