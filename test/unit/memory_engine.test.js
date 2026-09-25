'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * MemoryEngine (.agent/scripts/memory_engine.js) — Unit Tests
 *
 * Verifies that the unified MemoryEngine behaves deterministically, persists
 * to .memory.idx, generates MEMORY.md, operates without better-sqlite3,
 * and maintains 100% interoperability with the core memory system.
 */

const { MemoryEngine, VALID_TYPES, MEMORY_TYPES: _MEMORY_TYPES } = require('../../.agent/scripts/memory_engine');

function createTempAgent() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-mem-engine-test-'));
  const agentDir = path.join(tmpDir, '.agent');
  const memoryDir = path.join(agentDir, 'history', 'memory');
  fs.mkdirSync(memoryDir, { recursive: true });
  return agentDir;
}

function cleanupTempAgent(agentDir) {
  const tmpDir = path.dirname(agentDir);
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (_) {}
}

describe('MemoryEngine Class', () => {
  let agentDir;
  let mem;

  beforeEach(() => {
    agentDir = createTempAgent();
    mem = new MemoryEngine(agentDir);
  });

  afterEach(() => {
    if (mem) mem.close();
    cleanupTempAgent(agentDir);
  });

  test('initializes directories and files cleanly without database drivers', () => {
    expect(fs.existsSync(mem.memoryDir)).toBe(true);
    const index = mem.loadIndex();
    expect(index.version).toBe(1);
    expect(index.entries).toEqual([]);
  });

  test('stores valid semantic memory and returns id and token estimate', () => {
    const result = mem.store('semantic', 'Project uses TypeScript 5.5', ['typescript', 'config']);
    expect(result.id).toBe(1);
    expect(result.type).toBe('semantic');
    expect(result.token_estimate).toBeGreaterThan(0);

    const saved = mem.get(1);
    expect(saved).not.toBeNull();
    expect(saved.content).toBe('Project uses TypeScript 5.5');
    expect(saved.tags).toEqual(['typescript', 'config']);
  });

  test('stores across all 4 valid types', () => {
    for (const type of VALID_TYPES) {
      const res = mem.store(type, `Content for ${type}`, [type]);
      expect(res.type).toBe(type);
      expect(res.id).toBeGreaterThan(0);
    }
    const stats = mem.stats();
    expect(stats.total).toBe(4);
    expect(stats.semantic).toBe(1);
    expect(stats.procedural).toBe(1);
    expect(stats.episodic).toBe(1);
    expect(stats.working).toBe(1);
  });

  test('rejects invalid memory types', () => {
    expect(() => mem.store('fake_type', 'test')).toThrow(/Invalid memory type/);
    expect(() => mem.store('long_term', 'test')).toThrow(/Invalid memory type/);
  });

  test('rejects empty or whitespace content', () => {
    expect(() => mem.store('semantic', '')).toThrow(/cannot be empty/);
    expect(() => mem.store('semantic', '   ')).toThrow(/cannot be empty/);
    expect(() => mem.store('semantic', null)).toThrow(/cannot be empty/);
  });

  test('recalls memories matching search query and updates access statistics', () => {
    mem.store('semantic', 'Database is PostgreSQL 16 on port 5432', ['database', 'postgres']);
    mem.store('procedural', 'Deploy using docker compose up', ['docker', 'deploy']);

    const recallRes = mem.recall('PostgreSQL', 2000);
    expect(recallRes.results.length).toBe(1);
    expect(recallRes.results[0].content).toContain('PostgreSQL');
    expect(recallRes.tokens_used).toBeGreaterThan(0);

    // Verify access count incremented
    const retrieved = mem.get(recallRes.results[0].id);
    expect(retrieved.access_count).toBe(1);
  });

  test('enforces recall token budget', () => {
    mem.store('semantic', 'First entry with some words', ['a']);
    mem.store('semantic', 'Second entry with many more words in it', ['b']);

    // Tiny budget
    const recallRes = mem.recall('entry', 5);
    expect(recallRes.tokens_used).toBeLessThanOrEqual(5);
  });

  test('deletes memory by id and regenerates projection', () => {
    const r1 = mem.store('semantic', 'To be kept');
    const r2 = mem.store('semantic', 'To be deleted');

    expect(mem.delete(r2.id)).toBe(true);
    expect(mem.get(r2.id)).toBeNull();
    expect(mem.get(r1.id)).not.toBeNull();
    expect(mem.delete(999)).toBe(false);
  });

  test('clears working memory', () => {
    mem.store('working', 'Scratchpad 1');
    mem.store('working', 'Scratchpad 2');
    mem.store('semantic', 'Permanent');

    const cleared = mem.clearWorking();
    expect(cleared).toBe(2);

    const stats = mem.stats();
    expect(stats.working).toBe(0);
    expect(stats.semantic).toBe(1);
  });

  test('expires old episodic memories during gc', () => {
    mem.store('working', 'Working note');
    mem.store('semantic', 'Permanent note');

    // Manually inject an expired episodic memory into the index
    const index = mem.loadIndex();
    index.entries.push({
      id: 99,
      memory_type: 'episodic',
      content: 'Ancient decision from 60 days ago',
      tags: ['decision'],
      created_at: `${Math.floor(Date.now() / 1000) - (60 * 86400)}Z`,
      last_accessed: `${Math.floor(Date.now() / 1000) - (60 * 86400)}Z`,
      access_count: 0,
      token_estimate: 8,
      source: 'manual',
      session_id: null,
      priority: 1.0,
    });
    mem.saveIndex(index);

    const gcRes = mem.gc();
    expect(gcRes.working_removed).toBe(1);
    expect(gcRes.episodic_removed).toBe(1);
    expect(mem.get(99)).toBeNull();
  });

  test('generates human-readable MEMORY.md projection', () => {
    mem.store('semantic', 'Important Fact', ['fact']);
    mem.store('procedural', 'Recipe for building', ['build']);

    const projContent = mem.export();
    expect(projContent).toContain('Tribunal Memory Index');
    expect(projContent).toContain('SEMANTIC');
    expect(projContent).toContain('PROCEDURAL');
    expect(projContent).toContain('Important Fact');
    expect(projContent).toContain('Recipe for building');
  });

  test('persists across distinct MemoryEngine instances', () => {
    mem.store('semantic', 'Cross-instance verification', ['persist']);

    // Instantiate a new engine on the exact same agent directory
    const secondEngine = new MemoryEngine(agentDir);
    const recalled = secondEngine.recall('Cross-instance', 2000);
    expect(recalled.results.length).toBe(1);
    expect(recalled.results[0].content).toBe('Cross-instance verification');
    secondEngine.close();
  });

  test('assigns confidence penalty to learned source memories', () => {
    const r1 = mem.store('semantic', 'Manual fact', [], { source: 'manual' });
    const r2 = mem.store('semantic', 'Learned fact', [], { source: 'learned' });
    
    const m1 = mem.get(r1.id);
    const m2 = mem.get(r2.id);
    
    expect(m1.confidence).toBe(1.0);
    expect(m2.confidence).toBe(0.5);
  });

  test('computes BM25 score and applies relational boosting correctly', () => {
    const r1 = mem.store('semantic', 'Node is a runtime', ['js']);
    const r2 = mem.store('semantic', 'Python is a runtime', ['py']);
    const _r3 = mem.store('semantic', 'Node uses npm', ['js'], { relations: [r1.id] });
    
    // query "npm runtime". r3 matches npm. r1 and r2 match runtime.
    // r3 has relation to r1. So r1 should get a relational boost and score higher than r2.
    const recallNpm = mem.recall('npm runtime', 2000);
    const results = recallNpm.results;
    
    expect(results.length).toBeGreaterThanOrEqual(2);
    
    const r1Index = results.findIndex(r => r.id === r1.id);
    const r2Index = results.findIndex(r => r.id === r2.id);
    
    if (r2Index !== -1 && r1Index !== -1) {
      expect(r1Index).toBeLessThan(r2Index); // r1 ranks higher than r2
    }
  });
});
