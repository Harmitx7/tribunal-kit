"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { copyDir, countDir } = require("../../bin/tribunal-kit");

function makeTempDir(prefix = "tk-test-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

describe("countDir", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("returns 0 for empty directory", async () => {
    expect(await countDir(tmpDir)).toBe(0);
  });

  test("counts files at top level", async () => {
    fs.writeFileSync(path.join(tmpDir, "a.txt"), "a");
    fs.writeFileSync(path.join(tmpDir, "b.txt"), "b");
    expect(await countDir(tmpDir)).toBe(2);
  });

  test("counts files recursively in subdirectories", async () => {
    const sub = path.join(tmpDir, "sub");
    fs.mkdirSync(sub);
    fs.writeFileSync(path.join(tmpDir, "top.txt"), "top");
    fs.writeFileSync(path.join(sub, "nested.txt"), "nested");
    expect(await countDir(tmpDir)).toBe(2);
  });
});

describe("copyDir", () => {
  let srcDir;
  let destDir;

  beforeEach(() => {
    srcDir = makeTempDir("tk-src-");
    destDir = makeTempDir("tk-dest-");
    // Remove destDir so copyDir can create it fresh
    fs.rmSync(destDir, { recursive: true, force: true });
  });

  afterEach(() => {
    fs.rmSync(srcDir, { recursive: true, force: true });
    fs.rmSync(destDir, { recursive: true, force: true });
  });

  test("copies files to destination", async () => {
    fs.writeFileSync(path.join(srcDir, "hello.txt"), "hello");
    await copyDir(srcDir, destDir);
    expect(fs.existsSync(path.join(destDir, "hello.txt"))).toBe(true);
    expect(fs.readFileSync(path.join(destDir, "hello.txt"), "utf8")).toBe(
      "hello",
    );
  });

  test("copies nested directories recursively", async () => {
    const sub = path.join(srcDir, "sub");
    fs.mkdirSync(sub);
    fs.writeFileSync(path.join(sub, "nested.txt"), "nested");
    await copyDir(srcDir, destDir);
    expect(fs.existsSync(path.join(destDir, "sub", "nested.txt"))).toBe(true);
  });

  test("returns total file count copied", async () => {
    fs.writeFileSync(path.join(srcDir, "a.txt"), "a");
    fs.writeFileSync(path.join(srcDir, "b.txt"), "b");
    const count = await copyDir(srcDir, destDir);
    expect(count).toBe(2);
  });

  test("dry-run does NOT create destination files", async () => {
    fs.writeFileSync(path.join(srcDir, "hello.txt"), "hello");
    const destDryRun = path.join(os.tmpdir(), "tk-dryrun-" + Date.now());
    await copyDir(srcDir, destDryRun, true);
    expect(fs.existsSync(destDryRun)).toBe(false);
  });

  test("dry-run still returns correct file count", async () => {
    fs.writeFileSync(path.join(srcDir, "a.txt"), "a");
    fs.writeFileSync(path.join(srcDir, "b.txt"), "b");
    const destDryRun = path.join(os.tmpdir(), "tk-dryrun2-" + Date.now());
    const count = await copyDir(srcDir, destDryRun, true);
    expect(count).toBe(2);
  });
});
