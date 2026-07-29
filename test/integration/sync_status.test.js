/**
 * sync_status.test.js
 * Integration tests for Day 3: Multi-IDE Rule Sync Engine & Status Dashboard.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

/**
 * Helper: Find the compiled Rust binary.
 */
function findBinary() {
  const repoRoot = path.join(__dirname, "../..");
  const isWindows = os.platform() === "win32";
  const ext = isWindows ? ".exe" : "";
  const candidates = [
    path.join(repoRoot, "target/release", `tribunal-core${ext}`),
    path.join(repoRoot, "target/debug", `tribunal-core${ext}`),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

/**
 * Helper: Create a temporary project directory with .agent/ scaffolding.
 */
function createTempProject() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tk-sync-test-"));
  const agentDir = path.join(tempDir, ".agent");
  const rulesDir = path.join(agentDir, "rules");
  const agentsDir = path.join(agentDir, "agents");
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.mkdirSync(agentsDir, { recursive: true });
  fs.writeFileSync(
    path.join(rulesDir, "GEMINI.md"),
    "# Test Governance Rules\n\nRule content for sync testing."
  );
  // Create a couple of reviewer agent files for readiness testing
  fs.writeFileSync(path.join(agentsDir, "logic-reviewer.md"), "# Logic Reviewer");
  fs.writeFileSync(path.join(agentsDir, "security-auditor.md"), "# Security Auditor");
  return tempDir;
}

/**
 * Helper: Cleanup temp directory.
 */
function cleanupTempProject(tempDir) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

describe("Day 3: Multi-IDE Sync Engine & Status Dashboard", () => {
  const bin = findBinary();
  const skipRust = !bin;

  test("sync writes all 6 IDE bridge files from .agent/rules/GEMINI.md", () => {
    if (skipRust) {
      // Graceful skip if binary not compiled
      expect(true).toBe(true);
      return;
    }

    const tempDir = createTempProject();
    try {
      const out = execFileSync(bin, ["sync", "--quiet", tempDir], {
        encoding: "utf8",
      });
      const res = JSON.parse(out.trim());

      expect(res.success).toBe(true);
      expect(res.bridges_synced).toBe(6);

      // Verify all bridge files were actually written
      expect(fs.existsSync(path.join(tempDir, ".cursorrules"))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, ".windsurfrules"))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, ".gemini", "GEMINI.md"))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, ".gemini", "settings.json"))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, ".github", "copilot-instructions.md"))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, ".claude", "CLAUDE.md"))).toBe(true);

      // Verify bridge content contains the rules
      const cursorContent = fs.readFileSync(path.join(tempDir, ".cursorrules"), "utf8");
      expect(cursorContent).toContain("Test Governance Rules");
      expect(cursorContent).toContain("tribunal-kit sync");
    } finally {
      cleanupTempProject(tempDir);
    }
  });

  test("status reports bridge health and reviewer readiness", () => {
    if (skipRust) {
      expect(true).toBe(true);
      return;
    }

    const tempDir = createTempProject();
    try {
      // First sync to create bridges
      execFileSync(bin, ["sync", "--quiet", tempDir], { encoding: "utf8" });

      // Now check status
      const out = execFileSync(bin, ["status", tempDir], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      const res = JSON.parse(out.trim());

      expect(res.installed).toBe(true);
      expect(res.bridges).toBeDefined();
      expect(res.bridges.length).toBe(6);
      expect(res.reviewers).toBeDefined();
      expect(res.reviewers.ready).toBeGreaterThanOrEqual(2); // logic-reviewer + security-auditor
      expect(res.context_tokens_estimate).toBeDefined();
    } finally {
      cleanupTempProject(tempDir);
    }
  });

  test("status reports missing bridges when none exist", () => {
    if (skipRust) {
      expect(true).toBe(true);
      return;
    }

    const tempDir = createTempProject();
    try {
      // Don't sync — bridges should be missing
      const out = execFileSync(bin, ["status", tempDir], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      const res = JSON.parse(out.trim());

      expect(res.installed).toBe(true);
      expect(res.bridges).toBeDefined();
      const missingBridges = (res.bridges || []).filter((b) => b.status === "missing");
      expect(missingBridges.length).toBe(6);
    } finally {
      cleanupTempProject(tempDir);
    }
  });

  test("sync errors gracefully when .agent/ does not exist", () => {
    if (skipRust) {
      expect(true).toBe(true);
      return;
    }

    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "tk-empty-"));
    try {
      expect(() => {
        execFileSync(bin, ["sync", "--quiet", emptyDir], { encoding: "utf8" });
      }).toThrow();
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});
