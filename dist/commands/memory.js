"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmdMemory = cmdMemory;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
const helpers_1 = require("../utils/helpers");

/**
 * Tribunal Memory Engine — Node.js CLI Handler
 *
 * Routes memory subcommands to the Rust binary when available,
 * with a pure JS fallback for environments without native binaries.
 *
 * Commands:
 *   tk memory store --type semantic --content "..." --tags "db,orm"
 *   tk memory recall --query "database" --budget 2000
 *   tk memory gc
 *   tk memory stats
 *   tk memory export
 */

// ── Memory Index I/O (JS fallback) ──────────────────────────────────────────

const MEMORY_DIR = 'history/memory';
const INDEX_FILE = '.memory.idx';
const PROJECTION_FILE = 'MEMORY.md';
const MAX_ENTRIES = 500;
const EPISODIC_TTL_DAYS = 30;

function getMemoryDir(agentDest) {
    return path_1.default.join(agentDest, MEMORY_DIR);
}

function getIndexPath(agentDest) {
    return path_1.default.join(getMemoryDir(agentDest), INDEX_FILE);
}

function getProjectionPath(agentDest) {
    return path_1.default.join(getMemoryDir(agentDest), PROJECTION_FILE);
}

function loadIndex(agentDest) {
    const indexPath = getIndexPath(agentDest);
    if (!fs_1.default.existsSync(indexPath)) {
        return { version: 1, entries: [], next_id: 1 };
    }
    try {
        const content = fs_1.default.readFileSync(indexPath, 'utf8');
        return JSON.parse(content);
    } catch {
        return { version: 1, entries: [], next_id: 1 };
    }
}

function saveIndex(agentDest, index) {
    const memDir = getMemoryDir(agentDest);
    fs_1.default.mkdirSync(memDir, { recursive: true });
    const indexPath = getIndexPath(agentDest);
    // Atomic write: write temp, rename
    const tmpPath = indexPath + '.tmp';
    fs_1.default.writeFileSync(tmpPath, JSON.stringify(index, null, 2), 'utf8');
    fs_1.default.renameSync(tmpPath, indexPath);
}

function estimateTokens(text) {
    return Math.ceil(text.length / 4);
}

function nowEpochStr() {
    return `${Math.floor(Date.now() / 1000)}Z`;
}

function daysSince(ts) {
    const created = parseInt(ts.replace('Z', ''), 10) || 0;
    const now = Math.floor(Date.now() / 1000);
    return Math.floor((now - created) / 86400);
}

// ── Scoring Engine ──────────────────────────────────────────────────────────

const TYPE_PRIORITY = { semantic: 1.0, procedural: 0.9, episodic: 0.7, working: 0.5 };

function computeScore(entry, query) {
    const queryLower = query.toLowerCase();
    const contentLower = entry.content.toLowerCase();

    let relevance = 0;
    if (contentLower.includes(queryLower)) {
        relevance = 1.0;
    } else if (entry.tags.some(t => t.toLowerCase().includes(queryLower))) {
        relevance = 0.8;
    } else if (queryLower.split(/\s+/).some(word => contentLower.includes(word))) {
        relevance = 0.3;
    }

    if (relevance === 0) return 0;

    const priority = TYPE_PRIORITY[entry.memory_type] || 0.5;
    let recency = 0;
    if (entry.memory_type === 'episodic') {
        const age = daysSince(entry.created_at);
        recency = Math.exp(-age / 30);
    }
    const freqBoost = Math.max(0, Math.log(entry.access_count || 1)) * 0.05;

    return (relevance * priority) + recency + freqBoost;
}

// ── Store ───────────────────────────────────────────────────────────────────

function memoryStore(agentDest, type, content, tags, sessionId) {
    const VALID_TYPES = ['episodic', 'semantic', 'procedural', 'working'];
    if (!VALID_TYPES.includes(type)) {
        throw new Error(`Invalid memory type: "${type}". Must be one of: ${VALID_TYPES.join(', ')}`);
    }
    if (!content || content.trim().length === 0) {
        throw new Error('Memory content cannot be empty');
    }

    const index = loadIndex(agentDest);

    // Enforce cap — auto-GC if needed
    if (index.entries.length >= MAX_ENTRIES) {
        index.entries = index.entries.filter(e => e.memory_type !== 'working');
        if (index.entries.length >= MAX_ENTRIES) {
            index.entries = index.entries.filter(e => {
                if (e.memory_type === 'episodic') {
                    return daysSince(e.created_at) < EPISODIC_TTL_DAYS;
                }
                return true;
            });
        }
        if (index.entries.length >= MAX_ENTRIES) {
            throw new Error(`Memory at capacity (${MAX_ENTRIES}). Run: tk memory gc`);
        }
    }

    const now = nowEpochStr();
    const id = index.next_id || (index.entries.length > 0 ? Math.max(...index.entries.map(e => e.id)) + 1 : 1);
    const entry = {
        id,
        memory_type: type,
        content: content.trim(),
        tags: tags.filter(t => t.length > 0),
        created_at: now,
        last_accessed: now,
        access_count: 0,
        token_estimate: estimateTokens(content),
        source: type === 'working' ? 'session' : 'manual',
        session_id: sessionId || null,
    };

    index.entries.push(entry);
    index.next_id = id + 1;
    saveIndex(agentDest, index);
    generateProjection(agentDest, index);

    return { id, token_estimate: entry.token_estimate };
}

// ── Recall ──────────────────────────────────────────────────────────────────

function memoryRecall(agentDest, query, budget = 2000) {
    const index = loadIndex(agentDest);

    const scored = index.entries
        .map(entry => ({ entry, score: computeScore(entry, query) }))
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score);

    let totalTokens = 0;
    const results = [];

    for (const { entry, score } of scored) {
        if (totalTokens + entry.token_estimate > budget) break;
        totalTokens += entry.token_estimate;
        entry.last_accessed = nowEpochStr();
        entry.access_count = (entry.access_count || 0) + 1;
        results.push({ ...entry, score });
    }

    // Save updated access counts
    saveIndex(agentDest, index);

    return { results, tokens_used: totalTokens, budget };
}

// ── Garbage Collect ─────────────────────────────────────────────────────────

function memoryGc(agentDest) {
    const index = loadIndex(agentDest);
    const before = index.entries.length;

    let workingRemoved = 0;
    let episodicRemoved = 0;

    index.entries = index.entries.filter(e => {
        if (e.memory_type === 'working') { workingRemoved++; return false; }
        if (e.memory_type === 'episodic' && daysSince(e.created_at) >= EPISODIC_TTL_DAYS) {
            episodicRemoved++; return false;
        }
        return true;
    });

    saveIndex(agentDest, index);
    generateProjection(agentDest, index);

    return { working_removed: workingRemoved, episodic_removed: episodicRemoved, before, after: index.entries.length };
}

// ── Stats ───────────────────────────────────────────────────────────────────

function memoryStats(agentDest) {
    const index = loadIndex(agentDest);
    const total = index.entries.length;
    const semantic = index.entries.filter(e => e.memory_type === 'semantic').length;
    const procedural = index.entries.filter(e => e.memory_type === 'procedural').length;
    const episodic = index.entries.filter(e => e.memory_type === 'episodic').length;
    const working = index.entries.filter(e => e.memory_type === 'working').length;
    const totalTokens = index.entries.reduce((sum, e) => sum + (e.token_estimate || 0), 0);
    return { total, semantic, procedural, episodic, working, total_tokens: totalTokens, capacity: MAX_ENTRIES };
}

// ── Projection Generator ───────────────────────────────────────────────────

function generateProjection(agentDest, index) {
    if (!index) index = loadIndex(agentDest);

    let md = '# 🧠 Tribunal Memory Index\n';
    md += '> Auto-generated by `tribunal-kit memory export`. Do not edit manually.\n';

    const sem = index.entries.filter(e => e.memory_type === 'semantic');
    const proc = index.entries.filter(e => e.memory_type === 'procedural');
    const ep = index.entries.filter(e => e.memory_type === 'episodic');
    const work = index.entries.filter(e => e.memory_type === 'working');

    md += `> Entries: ${index.entries.length} | Semantic: ${sem.length} | Procedural: ${proc.length} | Episodic: ${ep.length} | Working: ${work.length}\n\n`;

    if (sem.length > 0) {
        md += '## SEMANTIC (Permanent Facts)\n';
        md += '| ID | Content | Tags | Source | Created |\n';
        md += '|----|---------|------|--------|---------|\n';
        for (const e of sem) {
            md += `| ${e.id} | ${e.content.replace(/\|/g, '\\|')} | ${e.tags.join(', ')} | ${e.source} | ${e.created_at} |\n`;
        }
        md += '\n';
    }

    if (proc.length > 0) {
        md += '## PROCEDURAL (How-To Recipes)\n';
        md += '| ID | Content | Tags | Source | Created |\n';
        md += '|----|---------|------|--------|---------|\n';
        for (const e of proc) {
            md += `| ${e.id} | ${e.content.replace(/\|/g, '\\|')} | ${e.tags.join(', ')} | ${e.source} | ${e.created_at} |\n`;
        }
        md += '\n';
    }

    if (ep.length > 0) {
        md += '## EPISODIC (Session History — auto-decays after 30 days)\n';
        md += '| ID | Content | Tags | Source | Created | Days Remaining |\n';
        md += '|----|---------|------|--------|---------|----------------|\n';
        for (const e of ep) {
            const remaining = Math.max(0, EPISODIC_TTL_DAYS - daysSince(e.created_at));
            md += `| ${e.id} | ${e.content.replace(/\|/g, '\\|')} | ${e.tags.join(', ')} | ${e.source} | ${e.created_at} | ${remaining} |\n`;
        }
        md += '\n';
    }

    if (work.length > 0) {
        md += '## WORKING (Current Session — cleared on GC)\n';
        md += '| ID | Content | Tags | Session |\n';
        md += '|----|---------|------|---------|\n';
        for (const e of work) {
            md += `| ${e.id} | ${e.content.replace(/\|/g, '\\|')} | ${e.tags.join(', ')} | ${e.session_id || '—'} |\n`;
        }
        md += '\n';
    }

    if (index.entries.length === 0) {
        md += '*No memories recorded yet. Run `tk memory store` to add your first memory.*\n';
    }

    const projPath = getProjectionPath(agentDest);
    fs_1.default.mkdirSync(path_1.default.dirname(projPath), { recursive: true });
    fs_1.default.writeFileSync(projPath, md, 'utf8');

    return projPath;
}

// ── CLI Router ──────────────────────────────────────────────────────────────

async function cmdMemory(flags, processArgs, quiet = false) {
    const targetDir = flags.path ? path_1.default.resolve(flags.path) : process.cwd();
    const agentDest = path_1.default.join(targetDir, '.agent');

    if (!fs_1.default.existsSync(agentDest)) {
        (0, logger_1.err)('.agent/ not found. Run: npx tribunal-kit init');
        process.exit(1);
    }

    const args = processArgs.slice(3);
    const subcommand = args[0];

    if (!subcommand || subcommand === 'help' || subcommand === '--help' || subcommand === '-h') {
        (0, helpers_1.banner)(quiet);
        const W = 62;
        const title = '  Tribunal Memory — 4-Type Taxonomy Engine';
        const trail = ' '.repeat(Math.max(0, W - title.length));
        console.log(`  ${(0, logger_1.c)('cyan', '\u2554' + '\u2550'.repeat(W) + '\u2557')}`);
        console.log(`  ${(0, logger_1.c)('cyan', '\u2551')}${(0, logger_1.bold)((0, logger_1.c)('white', title))}${trail}${(0, logger_1.c)('cyan', '\u2551')}`);
        console.log(`  ${(0, logger_1.c)('cyan', '\u255a' + '\u2550'.repeat(W) + '\u255d')}`);
        console.log();
        (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', 'store'.padEnd(10))}  ${(0, logger_1.c)('gray', 'Store a new memory entry')}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', 'recall'.padEnd(10))}  ${(0, logger_1.c)('gray', 'Budget-constrained memory recall')}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', 'gc'.padEnd(10))}  ${(0, logger_1.c)('gray', 'Garbage collect expired/working memories')}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', 'stats'.padEnd(10))}  ${(0, logger_1.c)('gray', 'Show memory index statistics')}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', 'export'.padEnd(10))}  ${(0, logger_1.c)('gray', 'Export MEMORY.md projection')}`);
        console.log();
        (0, logger_1.log)((0, logger_1.bold)('  Memory Types'));
        (0, logger_1.log)(`  ${(0, logger_1.c)('gray', '─'.repeat(40))}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('green', 'semantic'.padEnd(14))}  ${(0, logger_1.c)('gray', 'Permanent project facts & rules')}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('green', 'procedural'.padEnd(14))}  ${(0, logger_1.c)('gray', 'How-to recipes & build steps')}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('yellow', 'episodic'.padEnd(14))}  ${(0, logger_1.c)('gray', 'Session events (30-day TTL)')}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('yellow', 'working'.padEnd(14))}  ${(0, logger_1.c)('gray', 'Scratch memory (cleared on GC)')}`);
        console.log();
        (0, logger_1.log)((0, logger_1.bold)('  Examples'));
        (0, logger_1.log)(`  ${(0, logger_1.c)('gray', '─'.repeat(40))}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('gray', '▸')} ${(0, logger_1.c)('white', 'tk memory store --type semantic --content "Uses PostgreSQL" --tags db,orm')}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('gray', '▸')} ${(0, logger_1.c)('white', 'tk memory recall --query "database" --budget 2000')}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('gray', '▸')} ${(0, logger_1.c)('white', 'tk memory gc')}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('gray', '▸')} ${(0, logger_1.c)('white', 'tk memory stats')}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('gray', '▸')} ${(0, logger_1.c)('white', 'tk memory export')}`);
        console.log();
        process.exit(0);
    }

    // Parse flags from remaining args
    function getFlag(name) {
        const idx = args.indexOf(`--${name}`);
        if (idx === -1) return null;
        return args[idx + 1] || null;
    }

    try {
        switch (subcommand) {
            case 'store': {
                const type = getFlag('type');
                const content = getFlag('content');
                const tagsRaw = getFlag('tags') || '';
                const sessionId = getFlag('session-id');
                if (!type || !content) {
                    (0, logger_1.err)('Usage: tk memory store --type <type> --content "<text>" [--tags tag1,tag2]');
                    process.exit(1);
                }
                const tags = tagsRaw.split(',').map(t => t.trim()).filter(t => t.length > 0);
                const result = memoryStore(agentDest, type, content, tags, sessionId);
                if (!quiet) {
                    (0, logger_1.log)(`  ${(0, logger_1.c)('green', '✔')} ${(0, logger_1.bold)('Memory stored')} #${result.id} (${type})`);
                    (0, logger_1.log)(`    ${(0, logger_1.c)('gray', '▶')} ${(0, logger_1.c)('gray', content)}`);
                    if (tags.length > 0) {
                        (0, logger_1.log)(`    ${(0, logger_1.c)('gray', '▶')} Tags: ${(0, logger_1.c)('gray', tags.join(', '))}`);
                    }
                    (0, logger_1.log)(`    ${(0, logger_1.c)('gray', '▶')} ~${result.token_estimate} tokens`);
                }
                break;
            }

            case 'recall': {
                const query = getFlag('query');
                const budgetStr = getFlag('budget');
                const budget = budgetStr ? parseInt(budgetStr, 10) : 2000;
                if (!query) {
                    (0, logger_1.err)('Usage: tk memory recall --query "<search>" [--budget 2000]');
                    process.exit(1);
                }
                const { results, tokens_used } = memoryRecall(agentDest, query, budget);
                if (!quiet) {
                    if (results.length === 0) {
                        (0, logger_1.log)(`  ${(0, logger_1.c)('yellow', '⚠')} No memories match query: "${query}"`);
                    } else {
                        (0, logger_1.log)(`  ${(0, logger_1.c)('green', '✔')} ${results.length} memories recalled (budget: ${budget} tokens)`);
                        for (const entry of results) {
                            const typeLabel = entry.memory_type.toUpperCase();
                            (0, logger_1.log)(`    ${(0, logger_1.c)('gray', '▶')} [${(0, logger_1.c)('cyan', typeLabel)}] #${entry.id}: ${entry.content} ${(0, logger_1.c)('gray', `(score: ${entry.score.toFixed(2)}, ~${entry.token_estimate}tok)`)}`);
                        }
                        (0, logger_1.log)(`    ${(0, logger_1.c)('gray', '▶')} Total: ~${tokens_used} tokens used of ${budget} budget`);
                    }
                }
                // Machine output for agent consumption
                console.log(JSON.stringify({
                    action: 'recall', query, budget, tokens_used,
                    count: results.length,
                    entries: results.map(e => ({
                        id: e.id, memory_type: e.memory_type, content: e.content,
                        tags: e.tags, score: e.score, token_estimate: e.token_estimate,
                    })),
                }));
                break;
            }

            case 'gc': {
                const result = memoryGc(agentDest);
                if (!quiet) {
                    (0, logger_1.log)(`  ${(0, logger_1.c)('green', '✔')} ${(0, logger_1.bold)('Garbage collection complete')}`);
                    (0, logger_1.log)(`    ${(0, logger_1.c)('gray', '▶')} Working removed: ${result.working_removed}`);
                    (0, logger_1.log)(`    ${(0, logger_1.c)('gray', '▶')} Episodic expired: ${result.episodic_removed}`);
                    (0, logger_1.log)(`    ${(0, logger_1.c)('gray', '▶')} Entries: ${result.before} → ${result.after}`);
                }
                break;
            }

            case 'stats': {
                const stats = memoryStats(agentDest);
                if (!quiet) {
                    (0, logger_1.log)(`\n  🧠  ${(0, logger_1.bold)('Tribunal Memory Index')}`);
                    (0, logger_1.log)(`    ${(0, logger_1.c)('gray', '▶')} Total entries:  ${stats.total}`);
                    (0, logger_1.log)(`    ${(0, logger_1.c)('gray', '▶')} Semantic:       ${stats.semantic} (permanent)`);
                    (0, logger_1.log)(`    ${(0, logger_1.c)('gray', '▶')} Procedural:     ${stats.procedural} (permanent)`);
                    (0, logger_1.log)(`    ${(0, logger_1.c)('gray', '▶')} Episodic:       ${stats.episodic} (30-day TTL)`);
                    (0, logger_1.log)(`    ${(0, logger_1.c)('gray', '▶')} Working:        ${stats.working} (session-scoped)`);
                    (0, logger_1.log)(`    ${(0, logger_1.c)('gray', '▶')} Token budget:   ~${stats.total_tokens} tokens indexed`);
                    (0, logger_1.log)(`    ${(0, logger_1.c)('gray', '▶')} Capacity:       ${stats.total}/${stats.capacity}\n`);
                }
                break;
            }

            case 'export': {
                const projPath = generateProjection(agentDest);
                if (!quiet) {
                    (0, logger_1.log)(`  ${(0, logger_1.c)('green', '✔')} ${(0, logger_1.bold)('MEMORY.md exported')} → ${projPath}`);
                }
                break;
            }

            default:
                (0, logger_1.err)(`Unknown memory subcommand: "${subcommand}"`);
                (0, logger_1.log)('  Run: tk memory --help');
                process.exit(1);
        }
    } catch (e) {
        (0, logger_1.err)(e.message || String(e));
        process.exit(1);
    }
}

// Export internal functions for MCP server and learn/case integration
exports._memoryStore = memoryStore;
exports._memoryRecall = memoryRecall;
exports._memoryGc = memoryGc;
exports._memoryStats = memoryStats;
exports._generateProjection = generateProjection;
