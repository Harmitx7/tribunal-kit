"use strict";

const path = require("path");
const fs = require("fs");
const os = require("os");

/**
 * Tribunal Memory Engine — Unit Tests
 *
 * Tests the JS fallback implementation of the 4-Type Taxonomy Memory Engine.
 * Covers: store validation, recall with budget constraints, garbage collection,
 * scoring priorities, MEMORY.md projection, and anti-hallucination guards.
 */

// ── Test Helpers ────────────────────────────────────────────────────────────

function createTempAgent() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tk-memory-test-"));
  const agentDir = path.join(tmpDir, ".agent");
  const memoryDir = path.join(agentDir, "history", "memory");
  fs.mkdirSync(memoryDir, { recursive: true });
  // Seed empty index
  fs.writeFileSync(
    path.join(memoryDir, ".memory.idx"),
    JSON.stringify({ version: 1, entries: [], next_id: 1 }, null, 2),
    "utf8",
  );
  return agentDir;
}

function cleanupTempAgent(agentDir) {
  const tmpDir = path.dirname(agentDir);
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

// Import the memory module's internal functions
const {
  _memoryStore,
  _memoryRecall,
  _memoryGc,
  _memoryStats,
  _generateProjection,
} = require("../../dist/commands/memory");

// ── Store Tests ─────────────────────────────────────────────────────────────

describe("Memory Store", () => {
  let agentDir;

  beforeEach(() => {
    agentDir = createTempAgent();
  });

  afterEach(() => {
    cleanupTempAgent(agentDir);
  });

  test("stores a semantic memory and returns ID", () => {
    const result = _memoryStore(
      agentDir,
      "semantic",
      "Project uses PostgreSQL",
      ["db", "orm"],
      null,
    );
    expect(result.id).toBe(1);
    expect(result.token_estimate).toBeGreaterThan(0);
  });

  test("increments IDs sequentially", () => {
    const r1 = _memoryStore(
      agentDir,
      "semantic",
      "First memory",
      ["test"],
      null,
    );
    const r2 = _memoryStore(
      agentDir,
      "procedural",
      "Second memory",
      ["test"],
      null,
    );
    expect(r1.id).toBe(1);
    expect(r2.id).toBe(2);
  });

  test("rejects invalid memory type", () => {
    expect(() => {
      _memoryStore(agentDir, "super_semantic", "Hallucinated type", [], null);
    }).toThrow(/Invalid memory type/);
  });

  test("rejects empty content", () => {
    expect(() => {
      _memoryStore(agentDir, "semantic", "", [], null);
    }).toThrow(/cannot be empty/);
  });

  test("rejects whitespace-only content", () => {
    expect(() => {
      _memoryStore(agentDir, "semantic", "   ", [], null);
    }).toThrow(/cannot be empty/);
  });

  test("accepts all four valid types", () => {
    const types = ["episodic", "semantic", "procedural", "working"];
    for (const type of types) {
      const result = _memoryStore(
        agentDir,
        type,
        `Memory of type ${type}`,
        [type],
        null,
      );
      expect(result.id).toBeGreaterThan(0);
    }
  });

  test("persists to disk", () => {
    _memoryStore(agentDir, "semantic", "Persistent test", ["test"], null);
    const indexPath = path.join(agentDir, "history", "memory", ".memory.idx");
    const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
    expect(index.entries).toHaveLength(1);
    expect(index.entries[0].content).toBe("Persistent test");
    expect(index.entries[0].memory_type).toBe("semantic");
  });

  test("filters empty tags", () => {
    _memoryStore(
      agentDir,
      "semantic",
      "Tag test",
      ["valid", "", "  ", "also-valid"],
      null,
    );
    const indexPath = path.join(agentDir, "history", "memory", ".memory.idx");
    const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
    // Only non-empty tags should be stored
    const tags = index.entries[0].tags;
    expect(tags).not.toContain("");
  });
});

// ── Recall Tests ────────────────────────────────────────────────────────────

describe("Memory Recall", () => {
  let agentDir;

  beforeEach(() => {
    agentDir = createTempAgent();
    _memoryStore(
      agentDir,
      "semantic",
      "Project uses PostgreSQL database",
      ["db", "orm"],
      null,
    );
    _memoryStore(
      agentDir,
      "procedural",
      "Deploy with vercel --prod",
      ["deploy", "ci"],
      null,
    );
    _memoryStore(
      agentDir,
      "episodic",
      "User rejected Redux for Zustand",
      ["state", "decision"],
      null,
    );
    _memoryStore(
      agentDir,
      "working",
      "Debugging auth middleware",
      ["auth", "debug"],
      null,
    );
  });

  afterEach(() => {
    cleanupTempAgent(agentDir);
  });

  test("returns matching entries", () => {
    const { results } = _memoryRecall(agentDir, "database", 2000);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].content).toContain("PostgreSQL");
  });

  test("returns empty for non-matching query", () => {
    const { results } = _memoryRecall(agentDir, "kubernetes", 2000);
    expect(results).toHaveLength(0);
  });

  test("enforces budget constraint", () => {
    // Budget of 1 token should return 0 or very limited results
    const { results, tokens_used } = _memoryRecall(agentDir, "database", 1);
    // Even 1 entry would exceed 1 token budget
    expect(tokens_used).toBeLessThanOrEqual(1);
  });

  test("recalls by tag match", () => {
    const { results } = _memoryRecall(agentDir, "auth", 2000);
    expect(results.length).toBeGreaterThan(0);
  });

  test("ranks semantic higher than working", () => {
    // Store two entries with same content but different types
    _memoryStore(
      agentDir,
      "semantic",
      "ranking test content alpha",
      ["rank"],
      null,
    );
    _memoryStore(
      agentDir,
      "working",
      "ranking test content alpha",
      ["rank"],
      null,
    );

    const { results } = _memoryRecall(
      agentDir,
      "ranking test content alpha",
      2000,
    );
    expect(results.length).toBeGreaterThanOrEqual(2);
    // First result should be semantic (higher priority)
    const semanticIdx = results.findIndex(
      (r) => r.memory_type === "semantic" && r.content.includes("ranking"),
    );
    const workingIdx = results.findIndex(
      (r) => r.memory_type === "working" && r.content.includes("ranking"),
    );
    if (semanticIdx !== -1 && workingIdx !== -1) {
      expect(semanticIdx).toBeLessThan(workingIdx);
    }
  });

  test("updates access count on recall", () => {
    _memoryRecall(agentDir, "database", 2000);
    _memoryRecall(agentDir, "database", 2000);
    const indexPath = path.join(agentDir, "history", "memory", ".memory.idx");
    const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
    const dbEntry = index.entries.find((e) => e.content.includes("PostgreSQL"));
    expect(dbEntry.access_count).toBeGreaterThanOrEqual(2);
  });
});

// ── Garbage Collection Tests ────────────────────────────────────────────────

describe("Memory GC", () => {
  let agentDir;

  beforeEach(() => {
    agentDir = createTempAgent();
  });

  afterEach(() => {
    cleanupTempAgent(agentDir);
  });

  test("removes all working entries", () => {
    _memoryStore(agentDir, "working", "temp1", [], null);
    _memoryStore(agentDir, "working", "temp2", [], null);
    _memoryStore(agentDir, "semantic", "permanent", [], null);

    const result = _memoryGc(agentDir);
    expect(result.working_removed).toBe(2);
    expect(result.after).toBe(1);
  });

  test("preserves semantic and procedural entries", () => {
    _memoryStore(agentDir, "semantic", "fact", [], null);
    _memoryStore(agentDir, "procedural", "recipe", [], null);

    const result = _memoryGc(agentDir);
    expect(result.working_removed).toBe(0);
    expect(result.episodic_removed).toBe(0);
    expect(result.after).toBe(2);
  });

  test("regenerates MEMORY.md after GC", () => {
    _memoryStore(agentDir, "working", "temp", [], null);
    _memoryGc(agentDir);

    const projPath = path.join(agentDir, "history", "memory", "MEMORY.md");
    expect(fs.existsSync(projPath)).toBe(true);
    const content = fs.readFileSync(projPath, "utf8");
    expect(content).toContain("Tribunal Memory Index");
  });
});

// ── Stats Tests ─────────────────────────────────────────────────────────────

describe("Memory Stats", () => {
  let agentDir;

  beforeEach(() => {
    agentDir = createTempAgent();
  });

  afterEach(() => {
    cleanupTempAgent(agentDir);
  });

  test("returns correct counts by type", () => {
    _memoryStore(agentDir, "semantic", "fact", [], null);
    _memoryStore(agentDir, "procedural", "recipe", [], null);
    _memoryStore(agentDir, "episodic", "event", [], null);
    _memoryStore(agentDir, "working", "scratch", [], null);

    const stats = _memoryStats(agentDir);
    expect(stats.total).toBe(4);
    expect(stats.semantic).toBe(1);
    expect(stats.procedural).toBe(1);
    expect(stats.episodic).toBe(1);
    expect(stats.working).toBe(1);
    expect(stats.capacity).toBe(500);
  });

  test("counts total tokens", () => {
    _memoryStore(
      agentDir,
      "semantic",
      "This is a memory with some tokens",
      [],
      null,
    );
    const stats = _memoryStats(agentDir);
    expect(stats.total_tokens).toBeGreaterThan(0);
  });

  test("returns zeros for empty index", () => {
    const stats = _memoryStats(agentDir);
    expect(stats.total).toBe(0);
    expect(stats.total_tokens).toBe(0);
  });
});

// ── Projection Tests ────────────────────────────────────────────────────────

describe("Memory Projection (MEMORY.md)", () => {
  let agentDir;

  beforeEach(() => {
    agentDir = createTempAgent();
  });

  afterEach(() => {
    cleanupTempAgent(agentDir);
  });

  test("generates MEMORY.md with sections for each type", () => {
    _memoryStore(agentDir, "semantic", "Uses PostgreSQL", ["db"], null);
    _memoryStore(
      agentDir,
      "procedural",
      "Deploy with vercel",
      ["deploy"],
      null,
    );

    const projPath = _generateProjection(agentDir);
    const content = fs.readFileSync(projPath, "utf8");

    expect(content).toContain("SEMANTIC");
    expect(content).toContain("PROCEDURAL");
    expect(content).toContain("Uses PostgreSQL");
    expect(content).toContain("Deploy with vercel");
  });

  test("shows hint for empty index", () => {
    const projPath = _generateProjection(agentDir);
    const content = fs.readFileSync(projPath, "utf8");
    expect(content).toContain("No memories recorded yet");
  });

  test("escapes pipe characters in content", () => {
    _memoryStore(agentDir, "semantic", "Use a|b pattern", [], null);
    const projPath = _generateProjection(agentDir);
    const content = fs.readFileSync(projPath, "utf8");
    // Pipes should be escaped so they don't break the markdown table
    expect(content).toContain("a\\|b");
  });
});

// ── Anti-Hallucination Tests ────────────────────────────────────────────────

describe("Anti-Hallucination Guards", () => {
  let agentDir;

  beforeEach(() => {
    agentDir = createTempAgent();
  });

  afterEach(() => {
    cleanupTempAgent(agentDir);
  });

  test("rejects hallucinated memory type 'cognitive'", () => {
    expect(() =>
      _memoryStore(agentDir, "cognitive", "test", [], null),
    ).toThrow();
  });

  test("rejects hallucinated memory type 'long_term'", () => {
    expect(() =>
      _memoryStore(agentDir, "long_term", "test", [], null),
    ).toThrow();
  });

  test("rejects hallucinated memory type 'super_semantic'", () => {
    expect(() =>
      _memoryStore(agentDir, "super_semantic", "test", [], null),
    ).toThrow();
  });

  test("only accepts exactly 4 types", () => {
    const validTypes = ["episodic", "semantic", "procedural", "working"];
    const invalidTypes = [
      "cognitive",
      "long_term",
      "flash",
      "permanent",
      "temporary",
      "cache",
      "vector",
    ];

    for (const type of validTypes) {
      expect(() =>
        _memoryStore(agentDir, type, `Valid ${type}`, [], null),
      ).not.toThrow();
    }

    for (const type of invalidTypes) {
      expect(() =>
        _memoryStore(agentDir, type, `Invalid ${type}`, [], null),
      ).toThrow();
    }
  });
});
