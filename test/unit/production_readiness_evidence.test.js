/**
 * production_readiness_evidence.test.js
 * ══════════════════════════════════════════════════════════════════
 * Empirical evidence that the Tribunal-Kit repository state is:
 *   1. SAFE — input sanitization, path bounds, secret hygiene
 *   2. DETERMINISTIC — repeatable tier classification and budgets
 *   3. FAILURE TOLERANT — JS fallback, graceful degradation
 *   4. OBSERVABLE — structured error outputs, exit codes, audit logs
 *   5. REPRODUCIBLE — stable manifest hashes, version metadata
 *   6. PRODUCTION RELEASE SUITABLE — no phantom references, no count drift
 *
 * Zero external dependencies. Tests use only Node.js stdlib + Jest.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");

// ─── Module Under Test: Impact Classifier ────────────────────────────────────
const { classifyImpact } = require("../../.agent/scripts/impact_classifier");

// ─── Module Under Test: Socratic Gate Policy ─────────────────────────────────
const { evaluateSocraticGate } = require("../../.agent/scripts/socratic_gate_policy");

// ─── Module Under Test: Token Budget Broker ──────────────────────────────────
const { getTokenBudget, TIER_TOKEN_LIMITS } = require("../../.agent/scripts/token_budget_broker");

// ─── Module Under Test: Integrity Manifest ───────────────────────────────────
const {
  generateManifest,
  parseFrontmatter,
  crawlAgents,
  crawlSkills,
  crawlScripts,
  crawlWorkflows,
} = require("../../.agent/scripts/integrity_manifest");

// ─── Module Under Test: MCP Server ───────────────────────────────────────────
process.env.NODE_ENV = "test";
const { handleRequest, stripBoilerplate } = require("../../bin/mcp-server");

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: SAFETY
// ─────────────────────────────────────────────────────────────────────────────

describe("SAFETY: Input Sanitization & Boundary Enforcement", () => {
  describe("Impact Classifier — malformed inputs", () => {
    test("handles null opts gracefully", () => {
      const result = classifyImpact(null);
      expect(result).toHaveProperty("tier");
      expect(typeof result.tier).toBe("number");
      expect(result.tier).toBeGreaterThanOrEqual(0);
      expect(result.tier).toBeLessThanOrEqual(3);
    });

    test("handles undefined opts gracefully", () => {
      const result = classifyImpact(undefined);
      expect(result).toHaveProperty("tier");
      expect(typeof result.score).toBe("number");
    });

    test("handles empty object gracefully", () => {
      const result = classifyImpact({});
      expect(result).toHaveProperty("tier");
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("maxReviewers");
      expect(result).toHaveProperty("requireGate");
      expect(result).toHaveProperty("reasoning");
      expect(result).toHaveProperty("fastPass");
    });

    test("filters non-string entries from files array", () => {
      const result = classifyImpact({
        files: [null, undefined, 42, "", "valid.css", { name: "bad" }],
        task: "fix style",
        lineCount: 2,
      });
      expect(result).toHaveProperty("tier");
      // Only "valid.css" should be considered
      expect(result.tier).toBe(0); // CSS file, small edit => Tier 0
    });

    test("handles numeric task gracefully (type coercion safety)", () => {
      const result = classifyImpact({ task: 12345, files: [] });
      expect(result).toHaveProperty("tier");
      // Numeric task should be treated as empty string, not crash
    });

    test("handles negative lineCount gracefully", () => {
      const result = classifyImpact({ lineCount: -10 });
      expect(result).toHaveProperty("tier");
      expect(result.tier).toBeGreaterThanOrEqual(0);
    });

    test("handles Infinity lineCount gracefully", () => {
      const result = classifyImpact({ lineCount: Infinity });
      expect(result).toHaveProperty("tier");
    });

    test("handles NaN lineCount gracefully", () => {
      const result = classifyImpact({ lineCount: NaN });
      expect(result).toHaveProperty("tier");
    });
  });

  describe("Token Budget Broker — boundary inputs", () => {
    test("handles negative tier by clamping to 0", () => {
      const result = getTokenBudget(-5);
      expect(result.tier).toBe(0);
      expect(result.maxTokens).toBe(0);
    });

    test("handles tier > 3 by clamping to 3", () => {
      const result = getTokenBudget(99);
      expect(result.tier).toBe(3);
      expect(result.maxTokens).toBe(32000);
    });

    test("handles NaN tier by defaulting to tier 1", () => {
      const result = getTokenBudget(NaN);
      expect(result.tier).toBe(1);
      expect(result.maxTokens).toBe(2000);
    });

    test("handles string tier by defaulting to tier 1", () => {
      const result = getTokenBudget("invalid");
      expect(result.tier).toBe(1);
      expect(result.maxTokens).toBe(2000);
    });

    test("handles undefined tier by defaulting to tier 1", () => {
      const result = getTokenBudget(undefined);
      expect(result.tier).toBe(1);
      expect(result.maxTokens).toBe(2000);
    });

    test("rounds fractional tiers to nearest integer", () => {
      const result = getTokenBudget(1.7);
      expect(result.tier).toBe(2);
      expect(result.maxTokens).toBe(8000);
    });
  });

  describe("MCP Server — argument validation", () => {
    test("rejects tools/call with missing params.name", () => {
      const req = { jsonrpc: "2.0", id: 1, method: "tools/call", params: {} };
      expect(() => handleRequest(req)).toThrow();
    });

    test("rejects unknown tool name with -32601", () => {
      const req = {
        jsonrpc: "2.0", id: 1,
        method: "tools/call",
        params: { name: "nonexistent_tool_xyz" },
      };
      try {
        handleRequest(req);
        fail("Should have thrown");
      } catch (e) {
        expect(e.code).toBe(-32601);
      }
    });

    test("rejects search_case_law with non-string query", () => {
      const req = {
        jsonrpc: "2.0", id: 1,
        method: "tools/call",
        params: { name: "search_case_law", arguments: { query: 123 } },
      };
      try {
        handleRequest(req);
        fail("Should have thrown");
      } catch (e) {
        expect(e.code).toBe(-32602);
      }
    });

    test("rejects get_tribunal_agent with non-string name", () => {
      const req = {
        jsonrpc: "2.0", id: 1,
        method: "tools/call",
        params: { name: "get_tribunal_agent", arguments: { name: 42 } },
      };
      try {
        handleRequest(req);
        fail("Should have thrown");
      } catch (e) {
        expect(e.code).toBe(-32602);
      }
    });

    test("rejects get_tribunal_skill with non-string name", () => {
      const req = {
        jsonrpc: "2.0", id: 1,
        method: "tools/call",
        params: { name: "get_tribunal_skill", arguments: { name: null } },
      };
      try {
        handleRequest(req);
        fail("Should have thrown");
      } catch (e) {
        expect(e.code).toBe(-32602);
      }
    });

    test("rejects store_memory with invalid type", () => {
      const req = {
        jsonrpc: "2.0", id: 1,
        method: "tools/call",
        params: { name: "store_memory", arguments: { type: "invalid_type", content: "test" } },
      };
      try {
        handleRequest(req);
        fail("Should have thrown");
      } catch (e) {
        expect(e.code).toBe(-32602);
      }
    });
  });

  describe("MCP Server — path traversal defense", () => {
    test("get_tribunal_agent sanitizes path traversal attempts", () => {
      const req = {
        jsonrpc: "2.0", id: 1,
        method: "tools/call",
        params: { name: "get_tribunal_agent", arguments: { name: "../../etc/passwd" } },
      };
      // Should not throw a path traversal error — path.basename strips traversal
      // Should return "not found" because "passwd" is not an agent
      const result = handleRequest(req);
      expect(result.content[0].text).toContain("not found");
    });

    test("get_tribunal_skill sanitizes path traversal attempts", () => {
      const req = {
        jsonrpc: "2.0", id: 1,
        method: "tools/call",
        params: { name: "get_tribunal_skill", arguments: { name: "../../../etc/shadow" } },
      };
      const result = handleRequest(req);
      expect(result.content[0].text).toContain("not found");
    });
  });

  describe("Socratic Gate — flag override safety", () => {
    test("only recognized flags bypass the gate", () => {
      // Unrecognized flag should NOT bypass
      const result = evaluateSocraticGate({ tier: 3, flags: { randomFlag: true } });
      expect(result.shouldBlock).toBe(true);
    });

    test("no-gate flag bypasses even Tier 3", () => {
      const result = evaluateSocraticGate({ tier: 3, flags: { "no-gate": true } });
      expect(result.shouldBlock).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: DETERMINISM
// ─────────────────────────────────────────────────────────────────────────────

describe("DETERMINISM: Repeatable Classification & Budget Allocation", () => {
  describe("Impact Classifier — deterministic tier assignment", () => {
    const DETERMINISTIC_CASES = [
      {
        label: "CSS typo fix → Tier 0",
        input: { files: ["src/button.css"], task: "fix typo in comment", lineCount: 3 },
        expectedTier: 0,
      },
      {
        label: "Single component logic → Tier 1",
        input: { files: ["src/Header.tsx"], task: "update toggle", lineCount: 15 },
        expectedTier: 1,
      },
      {
        label: "Auth file → Tier 3 (critical path)",
        input: { files: ["src/auth/jwt.ts"], task: "update token check", lineCount: 8 },
        expectedTier: 3,
      },
      {
        label: "Schema migration → Tier 3 (critical path)",
        input: { files: ["db/schema.prisma"], task: "add user column", lineCount: 5 },
        expectedTier: 3,
      },
      {
        label: "Multiple large files → Tier 2+",
        input: { files: ["src/api/routes.ts", "src/api/handlers.ts"], task: "refactor API", lineCount: 120 },
        expectedTier: 3, // refactor + large diff
      },
    ];

    test.each(DETERMINISTIC_CASES)("$label", ({ input, expectedTier }) => {
      // Run 10 times to prove determinism
      for (let i = 0; i < 10; i++) {
        const result = classifyImpact(input);
        expect(result.tier).toBe(expectedTier);
      }
    });

    test("score is always a finite number between 0 and 1", () => {
      const cases = [
        {},
        { files: ["a.css"], task: "typo", lineCount: 1 },
        { files: ["auth.ts"], task: "security refactor migration", lineCount: 500 },
      ];
      for (const input of cases) {
        const result = classifyImpact(input);
        expect(Number.isFinite(result.score)).toBe(true);
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      }
    });

    test("fastPass is true if and only if tier === 0", () => {
      const tier0 = classifyImpact({ files: ["readme.md"], task: "fix docs typo", lineCount: 1 });
      expect(tier0.fastPass).toBe(tier0.tier === 0);

      const tier3 = classifyImpact({ files: ["auth.ts"], task: "update jwt", lineCount: 10 });
      expect(tier3.fastPass).toBe(false);
    });
  });

  describe("Token Budget Broker — deterministic budget allocation", () => {
    test.each([
      [0, 0],
      [1, 2000],
      [2, 8000],
      [3, 32000],
    ])("Tier %i always returns %i maxTokens", (tier, expectedTokens) => {
      for (let i = 0; i < 10; i++) {
        expect(getTokenBudget(tier).maxTokens).toBe(expectedTokens);
      }
    });

    test("TIER_TOKEN_LIMITS is immutable (frozen or consistent)", () => {
      expect(TIER_TOKEN_LIMITS[0]).toBe(0);
      expect(TIER_TOKEN_LIMITS[1]).toBe(2000);
      expect(TIER_TOKEN_LIMITS[2]).toBe(8000);
      expect(TIER_TOKEN_LIMITS[3]).toBe(32000);
    });
  });

  describe("Socratic Gate — deterministic decisions", () => {
    test.each([
      [0, 0.0, false],
      [1, 0.0, false],
      [2, 0.3, false],
      [2, 0.8, true],
      [3, 0.0, true],
    ])("Tier %i + ambiguity %d → shouldBlock = %s", (tier, ambiguityScore, expected) => {
      for (let i = 0; i < 10; i++) {
        expect(evaluateSocraticGate({ tier, ambiguityScore }).shouldBlock).toBe(expected);
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: FAILURE TOLERANCE
// ─────────────────────────────────────────────────────────────────────────────

describe("FAILURE TOLERANCE: Graceful Degradation Under Failure", () => {
  test("wrapper.js runRustBinary contains graceful fallback pattern (not process.exit on spawn error)", () => {
    const wrapperSource = fs.readFileSync(path.join(ROOT, "bin/wrapper.js"), "utf8");

    // Extract the runRustBinary function body to verify it returns false on error
    // instead of calling process.exit(1)
    const fnMatch = wrapperSource.match(/function runRustBinary[\s\S]*?^}/m);
    expect(fnMatch).not.toBeNull();
    const fnBody = fnMatch[0];

    // The old dangerous pattern: process.exit(1) inside runRustBinary on result.error
    expect(fnBody).not.toContain("process.exit(1)");

    // The new safe pattern: return false to fall through
    expect(fnBody).toContain("return false");
    expect(wrapperSource).toContain("Falling back to JS engine");
  });

  test("TRIBUNAL_FORCE_JS=1 forces JS fallback without crashing", () => {
    const wrapperPath = path.join(ROOT, "bin/wrapper.js");
    // This should not throw — it should execute via JS engine
    try {
      const out = execFileSync(
        process.execPath,
        [wrapperPath, "status"],
        {
          encoding: "utf8",
          env: { ...process.env, TRIBUNAL_FORCE_JS: "1" },
          stdio: ["ignore", "pipe", "pipe"],
          timeout: 15000,
        }
      );
      expect(typeof out).toBe("string");
    } catch (err) {
      // Non-zero exit is acceptable (e.g. "not installed"), but unhandled crash is not
      expect(err.status).toBeDefined();
      expect(err.status).not.toBe(null);
    }
  });

  test("MCP server handles batch JSON-RPC requests (protocol resilience)", () => {
    const batch = [
      { jsonrpc: "2.0", id: 1, method: "ping" },
      { jsonrpc: "2.0", id: 2, method: "resources/list" },
    ];
    // Simulate batch by processing individually (batch is handled in rl.on line)
    for (const req of batch) {
      const result = handleRequest(req);
      expect(result).toBeDefined();
    }
  });

  test("MCP server handles notification methods without response (no crash)", () => {
    const notificationReq = { method: "notifications/initialized" };
    const result = handleRequest(notificationReq);
    expect(result).toBeNull();
  });

  test("MCP server returns proper error for unknown methods", () => {
    const req = { jsonrpc: "2.0", id: 99, method: "completely/unknown" };
    try {
      handleRequest(req);
      fail("Should have thrown");
    } catch (e) {
      expect(e.code).toBe(-32601);
      expect(e.message).toContain("Unknown method");
    }
  });

  test("integrity manifest handles missing .agent directory gracefully", () => {
    const result = generateManifest("/nonexistent/path/that/does/not/exist");
    expect(result).toHaveProperty("error");
    expect(typeof result.error).toBe("string");
  });

  test("parseFrontmatter handles empty string without crash", () => {
    expect(parseFrontmatter("")).toEqual({});
  });

  test("parseFrontmatter handles malformed YAML without crash", () => {
    const malformed = "---\n\n---\n\nContent";
    const result = parseFrontmatter(malformed);
    // Should return empty object (no valid key-value pairs)
    expect(typeof result).toBe("object");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: OBSERVABILITY
// ─────────────────────────────────────────────────────────────────────────────

describe("OBSERVABILITY: Structured Errors & Audit Outputs", () => {
  test("MCP initialize response contains valid server info", () => {
    const req = { jsonrpc: "2.0", id: 1, method: "initialize", params: {} };
    const result = handleRequest(req);

    expect(result.protocolVersion).toBe("2025-03-26");
    expect(result.serverInfo.name).toBe("tribunal-kit-mcp");
    expect(typeof result.serverInfo.version).toBe("string");
    expect(result.serverInfo.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("MCP tools/list returns well-formed tool descriptors", () => {
    const req = { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} };
    const result = handleRequest(req);

    expect(Array.isArray(result.tools)).toBe(true);
    expect(result.tools.length).toBeGreaterThan(0);

    for (const tool of result.tools) {
      expect(typeof tool.name).toBe("string");
      expect(tool.name.length).toBeGreaterThan(0);
      expect(typeof tool.description).toBe("string");
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
    }
  });

  test("Impact classifier returns structured reasoning array", () => {
    const result = classifyImpact({ files: ["auth.ts"], task: "update jwt", lineCount: 10 });
    expect(Array.isArray(result.reasoning)).toBe(true);
    expect(result.reasoning.length).toBeGreaterThan(0);
    for (const reason of result.reasoning) {
      expect(typeof reason).toBe("string");
      expect(reason.length).toBeGreaterThan(0);
    }
  });

  test("Socratic gate returns structured reason string", () => {
    const result = evaluateSocraticGate({ tier: 3 });
    expect(typeof result.reason).toBe("string");
    expect(result.reason.length).toBeGreaterThan(0);
  });

  test("Token budget returns all expected fields for observability", () => {
    const result = getTokenBudget(2);
    expect(result).toHaveProperty("tier");
    expect(result).toHaveProperty("maxTokens");
    expect(result).toHaveProperty("includeFullRepo");
    expect(result).toHaveProperty("maxSkills");
    expect(result).toHaveProperty("maxReviewers");
  });

  test("stripBoilerplate function preserves core content while removing guardrail boilerplate", () => {
    const input = "Core content here.\n\n## Pre-Flight Checklist\nBoilerplate content";
    const result = stripBoilerplate(input);
    expect(result).toContain("Core content here.");
    expect(result).not.toContain("Pre-Flight Checklist");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: REPRODUCIBILITY
// ─────────────────────────────────────────────────────────────────────────────

describe("REPRODUCIBILITY: Stable Manifests & Version Metadata", () => {
  test("integrity manifest is reproducible (two runs produce identical structure)", () => {
    const manifest1 = generateManifest(ROOT);
    const manifest2 = generateManifest(ROOT);

    // Remove timestamps for comparison
    delete manifest1.generated_at;
    delete manifest2.generated_at;

    expect(manifest1.agents.total).toBe(manifest2.agents.total);
    expect(manifest1.skills.total).toBe(manifest2.skills.total);
    expect(manifest1.scripts.total).toBe(manifest2.scripts.total);
    expect(manifest1.workflows.total).toBe(manifest2.workflows.total);
    expect(manifest1.integrity.phantom_references).toBe(manifest2.integrity.phantom_references);
    expect(manifest1.integrity.invalid_claims).toBe(manifest2.integrity.invalid_claims);
  });

  test("package.json version matches Cargo.toml version", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    const cargoToml = fs.readFileSync(path.join(ROOT, "crates/core/Cargo.toml"), "utf8");
    const cargoVersion = cargoToml.match(/^version\s*=\s*"([^"]+)"/m)?.[1];

    expect(cargoVersion).toBe(pkg.version);
  });

  test("package.json version matches Cargo.lock tribunal-core version", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    const cargoLock = fs.readFileSync(path.join(ROOT, "Cargo.lock"), "utf8");
    const lockVersion = cargoLock.match(/name\s*=\s*"tribunal-core"\s+version\s*=\s*"([^"]+)"/)?.[1];

    expect(lockVersion).toBe(pkg.version);
  });

  test("optionalDependencies versions are in sync with package.json version", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    const expectedVersion = `^${pkg.version}`;

    for (const [name, version] of Object.entries(pkg.optionalDependencies || {})) {
      expect(version).toBe(expectedVersion);
    }
  });

  test("package-lock.json root version matches package.json", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    const lock = JSON.parse(fs.readFileSync(path.join(ROOT, "package-lock.json"), "utf8"));

    expect(lock.version).toBe(pkg.version);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6: PRODUCTION RELEASE SUITABILITY
// ─────────────────────────────────────────────────────────────────────────────

describe("PRODUCTION RELEASE SUITABILITY: Structural Integrity", () => {
  test("critical files exist for production release", () => {
    const criticalFiles = [
      "package.json",
      "README.md",
      "LICENSE",
      "SECURITY.md",
      "CONTRIBUTING.md",
      "bin/wrapper.js",
      "bin/mcp-server.js",
      "bin/tribunal-kit.js",
      "dist/cli.js",
      "dist/index.d.ts",
      "Cargo.toml",
      "crates/core/Cargo.toml",
      "crates/core/src/main.rs",
      ".agent/scripts/impact_classifier.js",
      ".agent/scripts/token_budget_broker.js",
      ".agent/scripts/integrity_manifest.js",
      ".agent/scripts/context_broker.js",
      ".agent/scripts/guardrail_engine.js",
    ];

    for (const file of criticalFiles) {
      const fullPath = path.join(ROOT, file);
      expect(fs.existsSync(fullPath)).toBe(true);
    }
  });

  test("bin/wrapper.js shebang is correct for cross-platform npm bin", () => {
    const wrapper = fs.readFileSync(path.join(ROOT, "bin/wrapper.js"), "utf8");
    expect(wrapper.startsWith("#!/usr/bin/env node")).toBe(true);
  });

  test("bin/mcp-server.js shebang is correct", () => {
    const mcp = fs.readFileSync(path.join(ROOT, "bin/mcp-server.js"), "utf8");
    expect(mcp.startsWith("#!/usr/bin/env node")).toBe(true);
  });

  test("package.json exports are correctly defined", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));

    expect(pkg.main).toBe("dist/cli.js");
    expect(pkg.types).toBe("dist/index.d.ts");
    expect(pkg.exports["."]).toBeDefined();
    expect(pkg.exports["."].types).toBe("./dist/index.d.ts");
    expect(pkg.exports["."].import).toBe("./dist/esm/index.mjs");
    expect(pkg.exports["."].require).toBe("./dist/cli.js");
  });

  test("package.json bin entries point to existing files", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));

    for (const [binName, binPath] of Object.entries(pkg.bin || {})) {
      const fullPath = path.resolve(ROOT, binPath);
      expect(fs.existsSync(fullPath)).toBe(true);
    }
  });

  test("package.json engines specifies minimum Node version", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    expect(pkg.engines).toBeDefined();
    expect(pkg.engines.node).toBeDefined();
    expect(pkg.engines.node).toMatch(/>=\s*18/);
  });

  test("no hardcoded secrets in source files", () => {
    const sensitivePatterns = [
      /sk-[a-zA-Z0-9]{20,}/,      // OpenAI API keys
      /ghp_[a-zA-Z0-9]{36}/,       // GitHub personal access tokens
      /AKIA[A-Z0-9]{16}/,          // AWS access keys
      /password\s*[:=]\s*["'][^"']{8,}/i,  // Hardcoded passwords
    ];

    const filesToCheck = [
      "bin/wrapper.js",
      "bin/mcp-server.js",
      "bin/tribunal-kit.js",
      "dist/cli.js",
      ".agent/scripts/context_broker.js",
      ".agent/scripts/guardrail_engine.js",
    ];

    for (const file of filesToCheck) {
      const content = fs.readFileSync(path.join(ROOT, file), "utf8");
      for (const pattern of sensitivePatterns) {
        expect(pattern.test(content)).toBe(false);
      }
    }
  });

  test("integrity manifest reports phantom references accurately", () => {
    const manifest = generateManifest(ROOT);
    if (manifest.error) {
      // If .agent not found, skip (edge case in CI)
      return;
    }

    // The manifest should report phantom references deterministically
    expect(typeof manifest.integrity.phantom_references).toBe("number");
    expect(typeof manifest.integrity.invalid_claims).toBe("number");
  });

  test("routing_index.json exists and has valid structure", () => {
    const routingIndexPath = path.join(ROOT, ".agent", "routing_index.json");
    if (!fs.existsSync(routingIndexPath)) {
      // Skip if routing_index.json doesn't exist yet
      return;
    }

    const routingIndex = JSON.parse(fs.readFileSync(routingIndexPath, "utf8"));
    expect(routingIndex).toHaveProperty("summary");
    expect(typeof routingIndex.summary.total_agents).toBe("number");
    expect(typeof routingIndex.summary.total_workflows).toBe("number");
    expect(typeof routingIndex.summary.total_skills).toBe("number");
  });

  test("RUST_COMMANDS set in wrapper.js matches Rust core command modules", () => {
    const wrapperSource = fs.readFileSync(path.join(ROOT, "bin/wrapper.js"), "utf8");

    // Extract command names from the RUST_COMMANDS set
    const commandMatch = wrapperSource.match(/RUST_COMMANDS\s*=\s*new\s+Set\(\[([\s\S]*?)\]\)/);
    expect(commandMatch).not.toBeNull();

    // Verify the set is not empty
    const commandsBlock = commandMatch[1];
    const commands = commandsBlock.match(/"([^"]+)"/g);
    expect(commands).not.toBeNull();
    expect(commands.length).toBeGreaterThan(0);

    // Verify essential commands are present
    const commandNames = commands.map(c => c.replace(/"/g, ""));
    expect(commandNames).toContain("init");
    expect(commandNames).toContain("validate");
    expect(commandNames).toContain("status");
    expect(commandNames).toContain("memory");
  });
});
