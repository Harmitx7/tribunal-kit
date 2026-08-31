#!/usr/bin/env node
/**
 * memory_engine.js — Tribunal Kit 4-Type Taxonomy Persistent Memory Engine
 * ==============================================================================
 * SQLite-backed memory storage with budget-constrained recall.
 *
 * Memory Types:
 *   - semantic: Permanent facts (no expiration)
 *   - procedural: How-to recipes (no expiration)
 *   - episodic: Events with 30-day TTL
 *   - working: Session scratch (cleared on restart)
 *
 * Recall Algorithm:
 *   score = relevance × recency × priority
 *   where relevance = token overlap with query
 *         recency = -0.1 × days since last access
 *         priority = explicit priority (default: 1.0)
 *
 * Usage:
 *   const { MemoryEngine } = require('./memory_engine');
 *   const mem = new MemoryEngine(agentDir);
 *   mem.store('semantic', 'User prefers TypeScript', ['typescript', 'preference']);
 *   const { results } = mem.recall('typescript', 2000);
 *
 * Zero external dependencies beyond better-sqlite3 (already installed).
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Lazy-load better-sqlite3 (optional dependency for environments without native compilation)
let Database = null;
try {
  Database = require('better-sqlite3');
} catch (_err) {
  // Fallback to in-memory storage if better-sqlite3 not available
  console.warn('[Memory] better-sqlite3 not available, using in-memory fallback');
}

// ─── Memory Types ─────────────────────────────────────────────────────────────

const MEMORY_TYPES = {
  SEMANTIC: 'semantic', // Permanent facts
  PROCEDURAL: 'procedural', // How-to recipes
  EPISODIC: 'episodic', // Events (30-day TTL)
  WORKING: 'working', // Session scratch
};

const VALID_TYPES = Object.values(MEMORY_TYPES);

// ─── In-Memory Fallback Storage ───────────────────────────────────────────────

class InMemoryStore {
  constructor() {
    this.memories = new Map();
    this.nextId = 1;
  }

  prepare(sql) {
    const self = this;

    // Simple SQL-like operations on in-memory Map
    return {
      run(...params) {
        // INSERT
        if (sql.includes('INSERT INTO memories')) {
          const [type, content, tags, priority, expiresAt] = params;
          const id = self.nextId++;
          self.memories.set(id, {
            id,
            type,
            content,
            tags: JSON.parse(tags),
            priority,
            created_at: new Date().toISOString(),
            accessed_at: new Date().toISOString(),
            expires_at: expiresAt,
            access_count: 0,
          });
          return { lastInsertRowid: id, changes: 1 };
        }
        // UPDATE
        if (sql.includes('UPDATE memories')) {
          for (const [_id, mem] of self.memories) {
            mem.accessed_at = new Date().toISOString();
            mem.access_count++;
          }
          return { changes: self.memories.size };
        }
        // DELETE
        if (sql.includes('DELETE FROM memories')) {
          const before = self.memories.size;
          for (const [id, mem] of self.memories) {
            if (
              mem.type === 'episodic' &&
              mem.expires_at &&
              new Date(mem.expires_at) < new Date()
            ) {
              self.memories.delete(id);
            }
          }
          return { changes: before - self.memories.size };
        }
        return { changes: 0 };
      },

      all(...params) {
        const [query] = params;
        const results = [];

        for (const [_id, mem] of self.memories) {
          // Filter expired
          if (mem.expires_at && new Date(mem.expires_at) < new Date()) {
            continue;
          }

          // Calculate score
          const relevance = (
            mem.content.toLowerCase().match(new RegExp(query.toLowerCase(), 'g')) || []
          ).length;
          const daysSinceAccess =
            (Date.now() - new Date(mem.accessed_at).getTime()) / (1000 * 60 * 60 * 24);
          const score = relevance * 3.0 + daysSinceAccess * -0.1 + mem.priority;

          results.push({ ...mem, score });
        }

        return results.sort((a, b) => b.score - a.score);
      },

      get(...params) {
        const [id] = params;
        return self.memories.get(id) || undefined;
      },
    };
  }

  exec(_sql) {
    // No-op for in-memory
  }

  close() {
    this.memories.clear();
  }
}

// ─── Memory Engine Class ──────────────────────────────────────────────────────

class MemoryEngine {
  /**
   * Initialize the Memory Engine.
   * @param {string} agentDir - Path to .agent/ directory
   * @param {object} options - Configuration options
   */
  constructor(agentDir, options = {}) {
    this.agentDir = agentDir;
    this.dbPath = path.join(agentDir, 'history', 'memory.db');
    this.options = {
      defaultTTL: 30 * 24 * 60 * 60 * 1000, // 30 days for episodic
      maxWorkingMemorySize: 100, // Max working memory entries
      ...options,
    };

    // Ensure history directory exists
    const historyDir = path.dirname(this.dbPath);
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }

    // Initialize database
    this.db = this.initDatabase();
    this.initSchema();
  }

  /**
   * Initialize database connection (SQLite or in-memory fallback).
   */
  initDatabase() {
    if (Database) {
      return new Database(this.dbPath);
    }
    return new InMemoryStore();
  }

  /**
   * Create database schema if not exists.
   */
  initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('semantic', 'procedural', 'episodic', 'working')),
        content TEXT NOT NULL,
        tags TEXT,
        priority REAL DEFAULT 1.0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        accessed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        expires_at TEXT,
        access_count INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
      CREATE INDEX IF NOT EXISTS idx_memories_accessed ON memories(accessed_at);
    `);
  }

  /**
   * Store a new memory entry.
   * @param {string} type - Memory type (semantic, procedural, episodic, working)
   * @param {string} content - Memory content
   * @param {string[]} tags - Searchable tags
   * @param {object} options - Additional options (priority, expiresIn)
   * @returns {{ id: number, type: string, token_estimate: number }}
   */
  store(type, content, tags = [], options = {}) {
    // Validate type
    if (!VALID_TYPES.includes(type)) {
      throw new Error(`Invalid memory type: "${type}". Must be one of: ${VALID_TYPES.join(', ')}`);
    }

    // Validate content
    if (!content || typeof content !== 'string') {
      throw new Error('Memory content must be a non-empty string');
    }

    // Calculate expiration
    let expiresAt = null;
    if (type === MEMORY_TYPES.EPISODIC) {
      const expiresIn = options.expiresIn || this.options.defaultTTL;
      expiresAt = new Date(Date.now() + expiresIn).toISOString();
    }

    // Insert into database
    const stmt = this.db.prepare(`
      INSERT INTO memories (type, content, tags, priority, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      type,
      content,
      JSON.stringify(tags),
      options.priority || 1.0,
      expiresAt,
    );

    return {
      id: result.lastInsertRowid,
      type,
      token_estimate: this.estimateTokens(content),
    };
  }

  /**
   * Recall memories matching a query, within token budget.
   * @param {string} query - Search query
   * @param {number} budget - Maximum token budget
   * @returns {{ results: array, tokens_used: number }}
   */
  recall(query, budget = 2000) {
    const _tokens = this.tokenize(query);

    // Score by relevance × recency × priority
    const memories = this.db
      .prepare(
        `
      SELECT *, (
        (length(content) - length(replace(lower(content), lower(?), ''))) / length(?) * 3.0
        + (julianday('now') - julianday(accessed_at)) * -0.1
        + priority
      ) as score
      FROM memories
      WHERE expires_at IS NULL OR expires_at > datetime('now')
      ORDER BY score DESC
    `,
      )
      .all(query, query);

    // Fit within budget
    const selected = [];
    let usedTokens = 0;

    for (const mem of memories) {
      const tokens = this.estimateTokens(mem.content);
      if (usedTokens + tokens <= budget) {
        selected.push({
          id: mem.id,
          memory_type: mem.type,
          content: mem.content,
          tags: mem.tags ? JSON.parse(mem.tags) : [],
          priority: mem.priority,
          score: mem.score,
        });
        usedTokens += tokens;

        // Update access stats
        this.db
          .prepare(
            `
          UPDATE memories
          SET accessed_at = CURRENT_TIMESTAMP, access_count = access_count + 1
          WHERE id = ?
        `,
          )
          .run(mem.id);
      }
    }

    return { results: selected, tokens_used: usedTokens };
  }

  /**
   * Get a specific memory by ID.
   * @param {number} id - Memory ID
   * @returns {object|null}
   */
  get(id) {
    const mem = this.db
      .prepare(
        `
      SELECT * FROM memories WHERE id = ?
    `,
      )
      .get(id);

    if (!mem) return null;

    return {
      id: mem.id,
      memory_type: mem.type,
      content: mem.content,
      tags: mem.tags ? JSON.parse(mem.tags) : [],
      priority: mem.priority,
      created_at: mem.created_at,
      accessed_at: mem.accessed_at,
      access_count: mem.access_count,
      expires_at: mem.expires_at,
    };
  }

  /**
   * Delete a memory by ID.
   * @param {number} id - Memory ID
   * @returns {boolean} True if deleted
   */
  delete(id) {
    const result = this.db
      .prepare(
        `
      DELETE FROM memories WHERE id = ?
    `,
      )
      .run(id);

    return result.changes > 0;
  }

  /**
   * Clear all working memories (session scratch).
   */
  clearWorking() {
    this.db
      .prepare(
        `
      DELETE FROM memories WHERE type = 'working'
    `,
      )
      .run();
  }

  /**
   * Auto-expire episodic memories.
   */
  expire() {
    this.db
      .prepare(
        `
      DELETE FROM memories
      WHERE type = 'episodic' AND expires_at < datetime('now')
    `,
      )
      .run();
  }

  /**
   * Get memory statistics.
   */
  stats() {
    const stats = this.db
      .prepare(
        `
      SELECT
        type,
        COUNT(*) as count,
        SUM(length(content)) as total_chars
      FROM memories
      WHERE expires_at IS NULL OR expires_at > datetime('now')
      GROUP BY type
    `,
      )
      .all();

    const result = {
      total: 0,
      by_type: {},
    };

    for (const stat of stats) {
      result.total += stat.count;
      result.by_type[stat.type] = {
        count: stat.count,
        total_chars: stat.total_chars,
        estimated_tokens: Math.ceil(stat.total_chars / 4),
      };
    }

    return result;
  }

  /**
   * Close database connection.
   */
  close() {
    if (this.db && this.db.close) {
      this.db.close();
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Estimate token count for text.
   * Uses rough approximation: 1 token ≈ 4 characters.
   */
  estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  /**
   * Tokenize text into lowercase words.
   */
  tokenize(text) {
    if (!text) return [];
    return (text.match(/\b[a-zA-Z_][a-zA-Z0-9_]{2,}\b/g) || []).map(t => t.toLowerCase());
  }
}

// ─── Module Exports ────────────────────────────────────────────────────────────

module.exports = {
  MemoryEngine,
  MEMORY_TYPES,
  VALID_TYPES,
};

// ─── CLI Entry Point ───────────────────────────────────────────────────────────

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
\x1b[1mmemory_engine.js\x1b[0m — Tribunal Kit 4-Type Taxonomy Persistent Memory Engine

\x1b[1mUsage:\x1b[0m
  node .agent/scripts/memory_engine.js store <type> <content> [--tags tag1,tag2]
  node .agent/scripts/memory_engine.js recall <query> [--budget 2000]
  node .agent/scripts/memory_engine.js get <id>
  node .agent/scripts/memory_engine.js delete <id>
  node .agent/scripts/memory_engine.js stats
  node .agent/scripts/memory_engine.js expire

\x1b[1mMemory Types:\x1b[0m
  semantic    — Permanent facts (no expiration)
  procedural  — How-to recipes (no expiration)
  episodic    — Events with 30-day TTL
  working     — Session scratch (cleared on restart)

\x1b[1mExamples:\x1b[0m
  node .agent/scripts/memory_engine.js store semantic "User prefers TypeScript strict mode" --tags typescript,preference
  node .agent/scripts/memory_engine.js recall "typescript" --budget 1000
  node .agent/scripts/memory_engine.js stats
`);
    process.exit(0);
  }

  const { findAgentDir } = require('./_utils');
  const agentDir = findAgentDir() || path.resolve(__dirname, '..');

  const mem = new MemoryEngine(agentDir);

  const command = args[0];

  try {
    switch (command) {
      case 'store': {
        const type = args[1];
        const content = args[2];
        const tagsIdx = args.indexOf('--tags');
        const tags =
          tagsIdx !== -1 && args[tagsIdx + 1]
            ? args[tagsIdx + 1].split(',').map(t => t.trim())
            : [];

        const result = mem.store(type, content, tags);
        console.log(
          `\x1b[32m✓\x1b[0m Memory stored: #${result.id} (${result.type}, ~${result.token_estimate} tokens)`,
        );
        break;
      }

      case 'recall': {
        const query = args[1];
        const budgetIdx = args.indexOf('--budget');
        const budget =
          budgetIdx !== -1 && args[budgetIdx + 1] ? parseInt(args[budgetIdx + 1], 10) : 2000;

        const { results, tokens_used } = mem.recall(query, budget);
        console.log(
          `\n## Memory Recall (${results.length} results, ~${tokens_used}/${budget} tokens)\n`,
        );
        for (const entry of results) {
          console.log(`- **[${entry.memory_type.toUpperCase()}]** #${entry.id}: ${entry.content}`);
          if (entry.tags.length > 0) console.log(`  _(${entry.tags.join(', ')})_`);
        }
        break;
      }

      case 'get': {
        const id = parseInt(args[1], 10);
        const result = mem.get(id);
        if (!result) {
          console.error(`\x1b[31m✖ Memory #${id} not found\x1b[0m`);
          process.exit(1);
        }
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      case 'delete': {
        const id = parseInt(args[1], 10);
        const deleted = mem.delete(id);
        if (deleted) {
          console.log(`\x1b[32m✓\x1b[0m Memory #${id} deleted`);
        } else {
          console.error(`\x1b[31m✖ Memory #${id} not found\x1b[0m`);
          process.exit(1);
        }
        break;
      }

      case 'stats': {
        const stats = mem.stats();
        console.log(`\n## Memory Statistics\n`);
        console.log(`Total memories: ${stats.total}`);
        for (const [type, data] of Object.entries(stats.by_type)) {
          console.log(`  ${type}: ${data.count} (~${data.estimated_tokens} tokens)`);
        }
        break;
      }

      case 'expire': {
        mem.expire();
        console.log(`\x1b[32m✓\x1b[0m Expired episodic memories cleaned up`);
        break;
      }

      default:
        console.error(`\x1b[31m✖ Unknown command: ${command}\x1b[0m`);
        process.exit(1);
    }
  } catch (err) {
    console.error(`\x1b[31m✖ Error: ${err.message}\x1b[0m`);
    process.exit(1);
  } finally {
    mem.close();
  }
}
