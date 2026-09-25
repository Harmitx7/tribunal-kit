#!/usr/bin/env node
/**
 * memory_engine.js — Tribunal Kit 4-Type Taxonomy Persistent Memory Engine
 * ==============================================================================
 * Persistent, file-backed memory storage with atomic locking, budget-constrained
 * recall, and human-readable MEMORY.md projection.
 *
 * Fully unified and cross-compatible with:
 *   - Rust Core: crates/core/src/commands/memory.rs
 *   - TypeScript CLI: dist/commands/memory.js
 *   - Tribunal MCP Server
 *
 * Memory Types:
 *   - semantic:   Permanent project facts and rules (no expiration)
 *   - procedural: How-to recipes and steps (no expiration)
 *   - episodic:   Session events and decisions (auto-decays after 30 days)
 *   - working:    Current session scratchpad (cleared on gc/session reset)
 *
 * Storage Architecture:
 *   - Index:      .agent/history/memory/.memory.idx (atomic JSON index)
 *   - Projection: .agent/history/memory/MEMORY.md   (human-readable markdown)
 *   - Lock:       .agent/history/memory/.memory.idx.lock
 *
 * Zero external dependencies beyond native Node.js core modules.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── Constants & Configuration ────────────────────────────────────────────────

const MEMORY_DIR = path.join('history', 'memory');
const INDEX_FILE = '.memory.idx';
const PROJECTION_FILE = 'MEMORY.md';
const MAX_ENTRIES = 500;
const EPISODIC_TTL_DAYS = 30;
const DEFAULT_BUDGET = 2000;

const MEMORY_TYPES = {
  SEMANTIC: 'semantic',
  PROCEDURAL: 'procedural',
  EPISODIC: 'episodic',
  WORKING: 'working',
};

const VALID_TYPES = Object.values(MEMORY_TYPES);

const TYPE_PRIORITY = {
  semantic: 1.0,
  procedural: 0.9,
  episodic: 0.7,
  working: 0.5,
};

// ─── Utility Helpers ──────────────────────────────────────────────────────────

function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

function nowEpochStr() {
  return `${Math.floor(Date.now() / 1000)}Z`;
}

function daysSince(ts) {
  if (!ts) return 0;
  const created = parseInt(String(ts).replace('Z', ''), 10) || 0;
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, Math.floor((now - created) / 86400));
}

// ─── Lock Management ──────────────────────────────────────────────────────────

function acquireLock(indexPath) {
  const lockPath = indexPath + '.lock';
  const maxRetries = 10;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const fd = fs.openSync(lockPath, 'wx');
      fs.closeSync(fd);
      return lockPath;
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err;
      }
      const waitBuf = new Int32Array(new SharedArrayBuffer(4));
      Atomics.wait(waitBuf, 0, 0, 50);
    }
  }

  // Check for stale lock (older than 10s)
  try {
    const stats = fs.statSync(lockPath);
    if (Date.now() - stats.mtimeMs > 10000) {
      fs.unlinkSync(lockPath);
      const fd = fs.openSync(lockPath, 'wx');
      fs.closeSync(fd);
      return lockPath;
    }
  } catch {}

  throw new Error('Could not acquire lock for memory index');
}

function releaseLock(lockPath) {
  try {
    if (lockPath && fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
    }
  } catch {}
}

// ─── Scoring Engine ───────────────────────────────────────────────────────────

function computeScore(entry, query, corpus = []) {
  if (!query || !entry.content) return 0;
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (queryWords.length === 0) return 0;
  const contentLower = entry.content.toLowerCase();

  let relevance = 0;
  const k1 = 1.2;
  const b = 0.75;
  const avgdl_raw = corpus.length > 0 ? corpus.reduce((sum, e) => sum + (e.content ? e.content.length : 0), 0) / corpus.length : 100;
  const avgdl = avgdl_raw || 100;
  const dl = contentLower.length;

  for (const word of queryWords) {
    const termFreq = contentLower.split(word).length - 1;
    if (termFreq === 0 && (!entry.tags || !entry.tags.some(t => t.toLowerCase().includes(word)))) continue;
    
    // Effective TF including tag boost
    const tf = termFreq + (entry.tags && entry.tags.some(t => t.toLowerCase().includes(word)) ? 2 : 0);
    
    const docFreq = corpus.filter(e => e.content && e.content.toLowerCase().includes(word)).length;
    // IDF
    const idf = Math.log((corpus.length - docFreq + 0.5) / (docFreq + 0.5) + 1.0);
    
    relevance += idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (dl / avgdl)));
  }

  // Exact phrase match bonus
  if (contentLower.includes(query.toLowerCase())) {
    relevance += 2.0;
  }

  if (relevance === 0) return 0;

  const priority = entry.priority != null ? entry.priority : (TYPE_PRIORITY[entry.memory_type] || 0.5);
  const confidence = typeof entry.confidence === 'number' ? entry.confidence : 1.0;
  
  let recency = 0;
  if (entry.memory_type === 'episodic') {
    const age = daysSince(entry.created_at);
    recency = Math.exp(-age / 30);
  }
  const freqBoost = Math.max(0, Math.log(entry.access_count || 1)) * 0.05;

  return (relevance * priority * confidence) + recency + freqBoost;
}

// ─── Memory Engine Class ──────────────────────────────────────────────────────

class MemoryEngine {
  /**
   * Initialize the Memory Engine.
   * @param {string} agentDir - Path to .agent/ directory or workspace root
   * @param {object} [options] - Configuration options
   */
  constructor(agentDir, options = {}) {
    let resolved = path.resolve(agentDir || process.cwd());
    // Auto-detect .agent directory if parent workspace given
    if (!resolved.endsWith('.agent') && !resolved.endsWith('.agent' + path.sep)) {
      const nested = path.join(resolved, '.agent');
      if (fs.existsSync(nested) && fs.statSync(nested).isDirectory()) {
        resolved = nested;
      }
    }

    this.agentDir = resolved;
    this.memoryDir = path.join(this.agentDir, MEMORY_DIR);
    this.indexPath = path.join(this.memoryDir, INDEX_FILE);
    this.projectionPath = path.join(this.memoryDir, PROJECTION_FILE);
    this.options = {
      defaultTTL: EPISODIC_TTL_DAYS * 24 * 60 * 60 * 1000,
      maxEntries: MAX_ENTRIES,
      ...options,
    };

    if (!fs.existsSync(this.memoryDir)) {
      fs.mkdirSync(this.memoryDir, { recursive: true });
    }
  }

  /**
   * Load index from disk safely.
   * @returns {{ version: number, entries: Array<object>, next_id: number }}
   */
  loadIndex() {
    if (!fs.existsSync(this.indexPath)) {
      return { version: 1, entries: [], next_id: 1 };
    }
    try {
      const content = fs.readFileSync(this.indexPath, 'utf8');
      return JSON.parse(content);
    } catch {
      return { version: 1, entries: [], next_id: 1 };
    }
  }

  /**
   * Atomically persist index to disk.
   * @param {object} index
   */
  saveIndex(index) {
    fs.mkdirSync(this.memoryDir, { recursive: true });
    const tmpPath = this.indexPath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(index, null, 2), 'utf8');
    fs.renameSync(tmpPath, this.indexPath);
  }

  /**
   * Store a new memory entry.
   * @param {string} type - 'semantic' | 'procedural' | 'episodic' | 'working'
   * @param {string} content - Memory content
   * @param {string[]} [tags] - Searchable tags
   * @param {object} [options] - Additional options (priority, source, sessionId)
   * @returns {{ id: number, type: string, token_estimate: number }}
   */
  store(type, content, tags = [], options = {}) {
    if (!VALID_TYPES.includes(type)) {
      throw new Error(`Invalid memory type: "${type}". Must be one of: ${VALID_TYPES.join(', ')}`);
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw new Error('Memory content cannot be empty');
    }

    const lockPath = acquireLock(this.indexPath);
    try {
      const index = this.loadIndex();

      // Enforce capacity (500)
      if (index.entries.length >= this.options.maxEntries) {
        index.entries = index.entries.filter(e => e.memory_type !== 'working');
        if (index.entries.length >= this.options.maxEntries) {
          index.entries = index.entries.filter(e => {
            if (e.memory_type === 'episodic') {
              return daysSince(e.created_at) < EPISODIC_TTL_DAYS;
            }
            return true;
          });
        }
        if (index.entries.length >= this.options.maxEntries) {
          throw new Error(`Memory at capacity (${this.options.maxEntries}). Run: tk memory gc`);
        }
      }

      const now = nowEpochStr();
      const nextId = index.next_id || (index.entries.length > 0 ? Math.max(...index.entries.map(e => e.id)) + 1 : 1);
      const cleanTags = Array.isArray(tags)
        ? tags.filter(t => typeof t === 'string' && t.trim().length > 0).map(t => t.trim())
        : [];

      const entry = {
        id: nextId,
        memory_type: type,
        content: content.trim(),
        tags: cleanTags,
        created_at: now,
        last_accessed: now,
        access_count: 0,
        token_estimate: estimateTokens(content),
        source: options.source || (type === 'working' ? 'session' : 'manual'),
        session_id: options.sessionId || options.session_id || null,
        priority: typeof options.priority === 'number' ? options.priority : 1.0,
        relations: Array.isArray(options.relations) ? options.relations : [],
        confidence: typeof options.confidence === 'number' ? options.confidence : (options.source === 'learned' ? 0.5 : 1.0),
      };

      index.entries.push(entry);
      index.next_id = nextId + 1;

      this.saveIndex(index);
      this.generateProjection(index);

      return {
        id: entry.id,
        type: entry.memory_type,
        token_estimate: entry.token_estimate,
      };
    } finally {
      releaseLock(lockPath);
    }
  }

  /**
   * Recall memories matching a query within a token budget.
   * @param {string} query - Search query
   * @param {number} [budget] - Token budget (default 2000)
   * @returns {{ results: Array<object>, tokens_used: number, budget: number }}
   */
  recall(query, budget = DEFAULT_BUDGET) {
    const lockPath = acquireLock(this.indexPath);
    try {
      const index = this.loadIndex();

      const scored = index.entries
        .map(entry => ({ entry, score: computeScore(entry, query, index.entries) }))
        .filter(s => s.score > 0);

      // Apply relational boosting
      for (const s of scored) {
        if (s.entry.relations) {
          for (const relId of s.entry.relations) {
             const related = scored.find(r => String(r.entry.id) === String(relId));
             if (related) {
               related.score += s.score * 0.2; // 20% boost from incoming relation
             }
          }
        }
      }

      scored.sort((a, b) => b.score - a.score);

      let totalTokens = 0;
      const results = [];
      let indexModified = false;

      for (const { entry, score } of scored) {
        if (totalTokens + entry.token_estimate > budget) break;
        totalTokens += entry.token_estimate;

        entry.last_accessed = nowEpochStr();
        entry.access_count = (entry.access_count || 0) + 1;
        indexModified = true;

        results.push({
          id: entry.id,
          memory_type: entry.memory_type,
          content: entry.content,
          tags: entry.tags || [],
          priority: entry.priority != null ? entry.priority : 1.0,
          score,
          token_estimate: entry.token_estimate,
          created_at: entry.created_at,
          last_accessed: entry.last_accessed,
          access_count: entry.access_count,
        });
      }

      if (indexModified) {
        this.saveIndex(index);
      }

      return { results, tokens_used: totalTokens, budget };
    } finally {
      releaseLock(lockPath);
    }
  }

  /**
   * Retrieve a specific memory entry by ID.
   * @param {number} id
   * @returns {object|null}
   */
  get(id) {
    const targetId = Number(id);
    const index = this.loadIndex();
    const entry = index.entries.find(e => e.id === targetId);
    if (!entry) return null;

    return {
      id: entry.id,
      memory_type: entry.memory_type,
      content: entry.content,
      tags: entry.tags || [],
      priority: entry.priority != null ? entry.priority : 1.0,
      created_at: entry.created_at,
      last_accessed: entry.last_accessed,
      access_count: entry.access_count || 0,
      token_estimate: entry.token_estimate,
      source: entry.source,
      session_id: entry.session_id,
      relations: entry.relations || [],
      confidence: typeof entry.confidence === 'number' ? entry.confidence : 1.0,
    };
  }

  /**
   * Delete a memory entry by ID.
   * @param {number} id
   * @returns {boolean} True if deleted, false if not found
   */
  delete(id) {
    const targetId = Number(id);
    const lockPath = acquireLock(this.indexPath);
    try {
      const index = this.loadIndex();
      const before = index.entries.length;
      index.entries = index.entries.filter(e => e.id !== targetId);

      if (index.entries.length === before) {
        return false;
      }

      this.saveIndex(index);
      this.generateProjection(index);
      return true;
    } finally {
      releaseLock(lockPath);
    }
  }

  /**
   * Clear all working memories (session scratchpad).
   * @returns {number} Number of cleared entries
   */
  clearWorking() {
    const lockPath = acquireLock(this.indexPath);
    try {
      const index = this.loadIndex();
      const before = index.entries.length;
      index.entries = index.entries.filter(e => e.memory_type !== 'working');
      const removed = before - index.entries.length;

      if (removed > 0) {
        this.saveIndex(index);
        this.generateProjection(index);
      }

      return removed;
    } finally {
      releaseLock(lockPath);
    }
  }

  /**
   * Expire old memories and perform garbage collection.
   * Clears all working memories and episodic memories older than 30 days.
   * @returns {{ working_removed: number, episodic_removed: number, before: number, after: number }}
   */
  expire() {
    const lockPath = acquireLock(this.indexPath);
    try {
      const index = this.loadIndex();
      const before = index.entries.length;

      let workingRemoved = 0;
      let episodicRemoved = 0;

      index.entries = index.entries.filter(e => {
        if (e.memory_type === 'working') {
          workingRemoved++;
          return false;
        }
        if (e.memory_type === 'episodic' && daysSince(e.created_at) >= EPISODIC_TTL_DAYS) {
          episodicRemoved++;
          return false;
        }
        return true;
      });

      this.saveIndex(index);
      this.generateProjection(index);

      return {
        working_removed: workingRemoved,
        episodic_removed: episodicRemoved,
        before,
        after: index.entries.length,
      };
    } finally {
      releaseLock(lockPath);
    }
  }

  /**
   * Alias for expire() to match CLI terminology.
   */
  gc() {
    return this.expire();
  }

  /**
   * Compute memory statistics.
   * @returns {object}
   */
  stats() {
    const index = this.loadIndex();
    const total = index.entries.length;
    const semantic = index.entries.filter(e => e.memory_type === 'semantic').length;
    const procedural = index.entries.filter(e => e.memory_type === 'procedural').length;
    const episodic = index.entries.filter(e => e.memory_type === 'episodic').length;
    const working = index.entries.filter(e => e.memory_type === 'working').length;
    const totalTokens = index.entries.reduce((sum, e) => sum + (e.token_estimate || 0), 0);

    const byType = {};
    for (const type of VALID_TYPES) {
      const typeEntries = index.entries.filter(e => e.memory_type === type);
      const typeChars = typeEntries.reduce((sum, e) => sum + (e.content ? e.content.length : 0), 0);
      const typeTokens = typeEntries.reduce((sum, e) => sum + (e.token_estimate || 0), 0);
      byType[type] = {
        count: typeEntries.length,
        total_chars: typeChars,
        estimated_tokens: typeTokens,
      };
    }

    return {
      total,
      semantic,
      procedural,
      episodic,
      working,
      total_tokens: totalTokens,
      capacity: this.options.maxEntries,
      by_type: byType,
    };
  }

  /**
   * Generate human-readable Markdown projection (MEMORY.md).
   * @param {object} [index]
   * @returns {string} Absolute path to projection file
   */
  generateProjection(index) {
    if (!index) index = this.loadIndex();

    let md = '# 🧠 Tribunal Memory Index\n';
    md += '> Auto-generated by `tribunal-kit memory export`. Do not edit manually.\n';

    const sem = index.entries.filter(e => e.memory_type === 'semantic');
    const proc = index.entries.filter(e => e.memory_type === 'procedural');
    const ep = index.entries.filter(e => e.memory_type === 'episodic');
    const work = index.entries.filter(e => e.memory_type === 'working');

    md += `> Entries: ${index.entries.length} | Semantic: ${sem.length} | Procedural: ${proc.length} | Episodic: ${ep.length} | Working: ${work.length}\n\n`;

    if (sem.length > 0) {
      md += '## SEMANTIC (Permanent Facts)\n';
      md += '| ID | Content | Tags | Source | Conf | Created |\n';
      md += '|----|---------|------|--------|------|---------|\n';
      for (const e of sem) {
        const conf = typeof e.confidence === 'number' ? e.confidence.toFixed(1) : '1.0';
        md += `| ${e.id} | ${e.content.replace(/\|/g, '\\|')} | ${(e.tags || []).join(', ')} | ${e.source || 'manual'} | ${conf} | ${e.created_at} |\n`;
      }
      md += '\n';
    }

    if (proc.length > 0) {
      md += '## PROCEDURAL (How-To Recipes)\n';
      md += '| ID | Content | Tags | Source | Conf | Created |\n';
      md += '|----|---------|------|--------|------|---------|\n';
      for (const e of proc) {
        const conf = typeof e.confidence === 'number' ? e.confidence.toFixed(1) : '1.0';
        md += `| ${e.id} | ${e.content.replace(/\|/g, '\\|')} | ${(e.tags || []).join(', ')} | ${e.source || 'manual'} | ${conf} | ${e.created_at} |\n`;
      }
      md += '\n';
    }

    if (ep.length > 0) {
      md += '## EPISODIC (Session History — auto-decays after 30 days)\n';
      md += '| ID | Content | Tags | Source | Conf | Created | Days Remaining |\n';
      md += '|----|---------|------|--------|------|---------|----------------|\n';
      for (const e of ep) {
        const remaining = Math.max(0, EPISODIC_TTL_DAYS - daysSince(e.created_at));
        const conf = typeof e.confidence === 'number' ? e.confidence.toFixed(1) : '1.0';
        md += `| ${e.id} | ${e.content.replace(/\|/g, '\\|')} | ${(e.tags || []).join(', ')} | ${e.source || 'manual'} | ${conf} | ${e.created_at} | ${remaining} |\n`;
      }
      md += '\n';
    }

    if (work.length > 0) {
      md += '## WORKING (Current Session — cleared on GC)\n';
      md += '| ID | Content | Tags | Session |\n';
      md += '|----|---------|------|---------|\n';
      for (const e of work) {
        md += `| ${e.id} | ${e.content.replace(/\|/g, '\\|')} | ${(e.tags || []).join(', ')} | ${e.session_id || '—'} |\n`;
      }
      md += '\n';
    }

    if (index.entries.length === 0) {
      md += '*No memories recorded yet. Run `tk memory store` to add your first memory.*\n';
    }

    fs.mkdirSync(path.dirname(this.projectionPath), { recursive: true });
    fs.writeFileSync(this.projectionPath, md, 'utf8');

    return this.projectionPath;
  }

  /**
   * Export the markdown projection text.
   * @returns {string}
   */
  export() {
    this.generateProjection();
    return fs.readFileSync(this.projectionPath, 'utf8');
  }

  /**
   * Estimate token count.
   * @param {string} text
   * @returns {number}
   */
  estimateTokens(text) {
    return estimateTokens(text);
  }

  /**
   * Close connection (no-op for file-backed storage, preserved for API parity).
   */
  close() {
    // No-op for file-backed engine
  }
}

// ─── Module Exports ────────────────────────────────────────────────────────────

module.exports = {
  MemoryEngine,
  MEMORY_TYPES,
  VALID_TYPES,
  TYPE_PRIORITY,
  estimateTokens,
};

// ─── CLI Entry Point ───────────────────────────────────────────────────────────

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
\x1b[1mmemory_engine.js\x1b[0m — Tribunal Kit 4-Type Taxonomy Persistent Memory Engine

\x1b[1mUsage:\x1b[0m
  node .agent/scripts/memory_engine.js store <type> <content> [--tags tag1,tag2] [--source manual]
  node .agent/scripts/memory_engine.js recall <query> [--budget 2000]
  node .agent/scripts/memory_engine.js get <id>
  node .agent/scripts/memory_engine.js delete <id>
  node .agent/scripts/memory_engine.js stats
  node .agent/scripts/memory_engine.js expire
  node .agent/scripts/memory_engine.js gc
  node .agent/scripts/memory_engine.js export

\x1b[1mMemory Types:\x1b[0m
  semantic    — Permanent facts (no expiration)
  procedural  — How-to recipes (no expiration)
  episodic    — Events with 30-day TTL
  working     — Session scratch (cleared on GC)

\x1b[1mExamples:\x1b[0m
  node .agent/scripts/memory_engine.js store semantic "User prefers TypeScript strict mode" --tags typescript,preference
  node .agent/scripts/memory_engine.js recall "typescript" --budget 1000
  node .agent/scripts/memory_engine.js stats
`);
    process.exit(0);
  }

  let agentDir = null;
  try {
    const { findAgentDir } = require('./_utils');
    agentDir = findAgentDir();
  } catch (_) {
    agentDir = path.resolve(process.cwd(), '.agent');
  }

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
        const sourceIdx = args.indexOf('--source');
        const source = sourceIdx !== -1 && args[sourceIdx + 1] ? args[sourceIdx + 1] : undefined;

        const result = mem.store(type, content, tags, { source });
        console.log(
          `\x1b[32m✓\x1b[0m Memory stored: #${result.id} (${result.type}, ~${result.token_estimate} tokens)`,
        );
        break;
      }

      case 'recall': {
        const query = args[1];
        if (!query) {
          console.error('\x1b[31m✖ Missing search query\x1b[0m');
          process.exit(1);
        }
        const budgetIdx = args.indexOf('--budget');
        const budget =
          budgetIdx !== -1 && args[budgetIdx + 1] ? parseInt(args[budgetIdx + 1], 10) : 2000;

        const { results, tokens_used } = mem.recall(query, budget);
        console.log(
          `\n## Memory Recall (${results.length} results, ~${tokens_used}/${budget} tokens)\n`,
        );
        for (const entry of results) {
          console.log(`- **[${entry.memory_type.toUpperCase()}]** #${entry.id}: ${entry.content}`);
          if (entry.tags && entry.tags.length > 0) console.log(`  _(${entry.tags.join(', ')})_`);
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

      case 'gc':
      case 'expire': {
        const res = mem.expire();
        console.log(
          `\x1b[32m✓\x1b[0m Memory GC complete: ${res.working_removed} working, ${res.episodic_removed} episodic removed (${res.before} -> ${res.after})`,
        );
        break;
      }

      case 'clear-working': {
        const cleared = mem.clearWorking();
        console.log(`\x1b[32m✓\x1b[0m Cleared ${cleared} working memory entries`);
        break;
      }

      case 'export': {
        const proj = mem.export();
        console.log(proj);
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
