#!/usr/bin/env node
/**
 * case_law_manager.js — Tribunal Kit Case Law Engine
 * =====================================================
 * Records rejected code patterns as "Cases" and surfaces them as
 * binding Legal Precedence during future Tribunal reviews.
 *
 * Usage:
 *   node .agent/scripts/case_law_manager.js add-case
 *   node .agent/scripts/case_law_manager.js search-cases --query "forEach side effects"
 *   node .agent/scripts/case_law_manager.js list
 *   node .agent/scripts/case_law_manager.js show --id 7
 *   node .agent/scripts/case_law_manager.js export
 *   node .agent/scripts/case_law_manager.js stats
 *
 * Storage:
 *   .agent/history/case-law/index.json    ← master index of all cases
 *   .agent/history/case-law/cases/        ← one JSON file per case
 */

'use strict';

const fs       = require('fs');
const path     = require('path');
const crypto   = require('crypto');
const readline = require('readline');

// ── Colours ──────────────────────────────────────────────────────────────────
const GREEN   = '\x1b[92m';
const YELLOW  = '\x1b[93m';
const CYAN    = '\x1b[96m';
const RED     = '\x1b[91m';
const BLUE    = '\x1b[94m';
const BOLD    = '\x1b[1m';
const DIM     = '\x1b[2m';
const RESET   = '\x1b[0m';

// ── Find .agent directory ─────────────────────────────────────────────────────
function findAgentDir() {
    let current = path.resolve(process.cwd());
    const root = path.parse(current).root;
    while (current !== root) {
        const candidate = path.join(current, '.agent');
        if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) return candidate;
        current = path.dirname(current);
    }
    console.error(`${RED}✖ Error: '.agent' directory not found. Please run 'npx tribunal-kit init' first.${RESET}`);
    process.exit(1);
}

const AGENT_DIR   = findAgentDir();
const HISTORY_DIR = path.join(AGENT_DIR, 'history', 'case-law');
const CASES_DIR   = path.join(HISTORY_DIR, 'cases');
const INDEX_FILE  = path.join(HISTORY_DIR, 'index.json');

const VALID_DOMAINS  = new Set(['backend', 'frontend', 'database', 'security', 'performance', 'mobile', 'testing', 'devops', 'general']);
const VALID_VERDICTS = new Set(['REJECTED', 'APPROVED_WITH_CONDITIONS', 'PRECEDENT_SET', 'OVERRULED']);

// ── Noise filter ────────────────────────────────────────────────────────────
const NOISE_PATTERNS = [
    /\bformatting\b/i, /\bwhitespace\b/i, /\bindent(ation)?\b/i,
    /\bimport\s+order\b/i, /\btrailing\s+(comma|space|whitespace)\b/i,
    /\bsemicolon\b/i, /\bprettier\b/i, /\beslint.*fix\b/i, /\blint.*only\b/i,
];

function isNoiseRejection(reason) {
    const lower = reason.toLowerCase();
    return NOISE_PATTERNS.some(p => p.test(lower));
}

// ── Trivial-change filter (Semantic Delta) ────────────────────────────────────
const TRIVIAL_PATTERNS = [
    /^\s*$/,                         // blank lines
    /^\s*\/\/.*$/,                   // comment-only lines
    /^\s*#.*$/,                      // python comments
    /^\s*\*.*$/,                     // JSDoc lines
    /^\s*import\b.*$/,               // imports
];

function isTrivialLine(line) {
    return TRIVIAL_PATTERNS.some(p => p.test(line));
}

function semanticDelta(diffText) {
    const lines = diffText.split('\n');
    const meaningful = [];
    for (const line of lines) {
        if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) {
            meaningful.push(line);
            continue;
        }
        if (line.startsWith('+') || line.startsWith('-')) {
            const codePart = line.slice(1);
            if (!isTrivialLine(codePart)) meaningful.push(line);
        } else {
            meaningful.push(line);
        }
    }
    let filtered = meaningful.join('\n');
    filtered = filtered.replace(/(\n[ ]?\n){3,}/g, '\n\n');
    return filtered.trim();
}

function contentHash(text) {
    const cleaned = semanticDelta(text);
    return crypto.createHash('sha256').update(cleaned).digest('hex').slice(0, 8);
}

// ── Index helpers ─────────────────────────────────────────────────────────────
function ensureDirs() {
    fs.mkdirSync(HISTORY_DIR, { recursive: true });
    fs.mkdirSync(CASES_DIR,   { recursive: true });
}

function loadIndex() {
    ensureDirs();
    if (fs.existsSync(INDEX_FILE)) {
        try { return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8')); } catch { /* fallthrough */ }
    }
    return { version: '1.0', cases: [], next_id: 1 };
}

function saveIndex(index) {
    ensureDirs();
    const tmp = INDEX_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(index, null, 2), 'utf8');
    fs.renameSync(tmp, INDEX_FILE);
}

function loadCase(caseId) {
    const p = path.join(CASES_DIR, `case-${String(caseId).padStart(4, '0')}.json`);
    if (!fs.existsSync(p)) return null;
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function saveCase(caseRecord) {
    const p = path.join(CASES_DIR, `case-${String(caseRecord.id).padStart(4, '0')}.json`);
    fs.writeFileSync(p, JSON.stringify(caseRecord, null, 2), 'utf8');
}

// ── Keyword/tag extraction ─────────────────────────────────────────────────────
function extractTags(text) {
    const tokens = text.match(/\b[a-zA-Z_][a-zA-Z0-9_]{2,}\b/g) || [];
    const stopWords = new Set([
        'the', 'and', 'for', 'was', 'this', 'with', 'that', 'has', 'a', 'an',
        'from', 'are', 'not', 'use', 'but', 'also', 'code',
        'have', 'will', 'should', 'must', 'can', 'may', 'any',
        'all', 'new', 'old', 'add', 'get', 'set', 'var', 'let',
        'const', 'function', 'return', 'import', 'export', 'class',
        'async', 'await', 'true', 'false', 'null', 'undefined',
    ]);
    const seen = new Set();
    const tags = [];
    for (const token of tokens) {
        const lower = token.toLowerCase();
        if (!stopWords.has(lower) && !seen.has(lower)) {
            seen.add(lower);
            tags.push(lower);
        }
        if (tags.length >= 20) break;
    }
    return tags;
}

// ── Version-Aware Case Filtering ──────────────────────────────────────────────
// FIX: Prevents stale cases (e.g., React 17 rejections) from blocking valid code
// once the project has upgraded frameworks. Uses simple numeric comparison.
//
// Version filter string format: "react=19,node=22,next=15"
// Case stack_version format:    "react>=18,node>=20"  (>=, >, =, <, <=)

/**
 * Parse a version filter string into a map of { lib -> number }.
 * Input:  "react=19,node=22"
 * Output: { react: 19, node: 22 }
 * @param {string} filterStr
 * @returns {Object<string, number>}
 */
function parseVersionFilter(filterStr) {
    const result = {};
    if (!filterStr) return result;
    for (const segment of filterStr.split(',')) {
        const m = segment.trim().match(/^([a-zA-Z0-9_.-]+)\s*(?:>=|>|<=|<|=)?\s*(\d+(?:\.\d+)?)/);
        if (m) result[m[1].toLowerCase()] = parseFloat(m[2]);
    }
    return result;
}

/**
 * Returns true if the case either has no stack_version constraint,
 * OR all of its version constraints are satisfied by the provided filter.
 *
 * A case with stack_version "react>=18,node>=20" will be SKIPPED (return false)
 * when the version filter says react=19,node=22 → both constraints met → case IS relevant.
 *
 * The logic: if a case's constraint is NOT met by the current version filter,
 * that case is from a different version context → skip it.
 *
 * @param {{ stack_version?: string }} caseEntry
 * @param {Object<string, number>}     versionFilter
 * @returns {boolean} true = case is eligible for this version context
 */
function caseMatchesVersionFilter(caseEntry, versionFilter) {
    if (!caseEntry.stack_version) return true; // No constraint → always eligible
    if (!versionFilter || !Object.keys(versionFilter).length) return true;

    // Parse the case's own version constraint
    const caseConstraints = [];
    for (const segment of caseEntry.stack_version.split(',')) {
        const m = segment.trim().match(/^([a-zA-Z0-9_.-]+)\s*(>=|>|<=|<|=)\s*(\d+(?:\.\d+)?)/);
        if (m) caseConstraints.push({ lib: m[1].toLowerCase(), op: m[2], ver: parseFloat(m[3]) });
    }

    // Check each constraint against the version filter
    for (const { lib, op, ver } of caseConstraints) {
        const projectVer = versionFilter[lib];
        if (projectVer === undefined) continue; // Unknown lib → don't filter on it

        const satisfied = (
            op === '>='  ? projectVer >= ver :
            op === '>'   ? projectVer >  ver :
            op === '<='  ? projectVer <= ver :
            op === '<'   ? projectVer <  ver :
            /* = */        projectVer === ver
        );
        if (!satisfied) return false; // This case's version context doesn't match
    }
    return true;
}

// ── Similarity scoring (TF-IDF Cosine — token-free) ──────────────────────────

function buildIdf(corpus) {
    const n = corpus.length;
    if (n === 0) return {};
    const docFreq = {};
    for (const tags of corpus) {
        const unique = new Set(tags);
        for (const tag of unique) {
            docFreq[tag] = (docFreq[tag] || 0) + 1;
        }
    }
    const idf = {};
    for (const [term, df] of Object.entries(docFreq)) {
        idf[term] = Math.log((n + 1) / (df + 1)) + 1.0;
    }
    return idf;
}

function tfidfCosineSimilarity(queryTags, caseTags, idf) {
    if (!queryTags.length || !caseTags.length) return 0.0;
    const tfQ = {};
    for (const t of queryTags) tfQ[t] = (tfQ[t] || 0) + 1;
    const tfC = {};
    for (const t of caseTags) tfC[t] = (tfC[t] || 0) + 1;
    const allTerms = new Set([...Object.keys(tfQ), ...Object.keys(tfC)]);
    let dot = 0, magQ = 0, magC = 0;
    for (const term of allTerms) {
        const wQ = (tfQ[term] || 0) * (idf[term] || 1.0);
        const wC = (tfC[term] || 0) * (idf[term] || 1.0);
        dot  += wQ * wC;
        magQ += wQ * wQ;
        magC += wC * wC;
    }
    if (magQ === 0 || magC === 0) return 0.0;
    return dot / (Math.sqrt(magQ) * Math.sqrt(magC));
}

// ── Input helpers ─────────────────────────────────────────────────────────────
function createRl() {
    return readline.createInterface({ input: process.stdin, output: process.stdout });
}

function ask(rl, prompt) {
    return new Promise(resolve => rl.question(`  ${BOLD}${prompt}${RESET} `, resolve));
}

function askMultiline(rl, prompt, sentinel) {
    return new Promise(resolve => {
        console.log(`  ${BOLD}${prompt}${RESET}`);
        console.log(`  ${DIM}(Type or paste content. Type '${sentinel}' on its own line when done.)${RESET}`);
        const lines = [];
        const listener = (line) => {
            if (line.trim() === sentinel) {
                rl.removeListener('line', listener);
                resolve(lines.join('\n'));
            } else {
                lines.push(line);
            }
        };
        rl.on('line', listener);
    });
}

function askChoice(rl, label, choices, defaultVal) {
    return new Promise(resolve => {
        const opts = choices.map(c => c === defaultVal ? `${BOLD}${c}${RESET}` : c).join(' / ');
        rl.question(`  ${BOLD}${label}${RESET} [${opts}] (default: ${defaultVal}): `, answer => {
            const val = (answer || '').trim().toLowerCase();
            resolve(val && choices.includes(val) ? val : defaultVal);
        });
    });
}

// ── Commands ──────────────────────────────────────────────────────────────────
async function cmdAddCase() {
    console.log(`\n${BOLD}${CYAN}━━━ Recording New Case ━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
    const rl = createRl();

    const diffText = await askMultiline(rl, 'Paste the REJECTED diff (code snippet):', 'END_DIFF');
    if (!diffText.trim()) { console.log(`${RED}✖ Diff cannot be empty. Aborting.${RESET}`); rl.close(); process.exit(1); }

    const reason = await ask(rl, 'Rejection reason (1-2 sentences):');
    if (!reason.trim()) { console.log(`${RED}✖ Reason cannot be empty. Aborting.${RESET}`); rl.close(); process.exit(1); }

    const domain  = await askChoice(rl, 'Domain', [...VALID_DOMAINS].sort(), 'general');
    const verdict = await askChoice(rl, 'Verdict', [...VALID_VERDICTS].sort(), 'REJECTED');
    const prRef    = (await ask(rl, 'PR / commit reference (optional, e.g. PR-404):')).trim() || null;
    const reviewer = (await ask(rl, 'Reviewer agent (optional, e.g. security-auditor):')).trim() || null;

    // FIX: stack_version — prevents stale cases from blocking valid code after
    // framework upgrades. Format: "react>=19, node>=20" or leave blank for all.
    const stackVersionRaw = (await ask(rl, 'Stack version constraint (optional, e.g. react>=18, node>=20):')).trim();
    const stackVersion = stackVersionRaw || null;
    rl.close();

    const delta       = semanticDelta(diffText);
    const fingerprint = contentHash(diffText);
    const tags        = extractTags(diffText + ' ' + reason);

    const index  = loadIndex();
    const caseId = index.next_id;
    const now    = new Date().toISOString().slice(0, 19);

    const caseRecord = {
        id: caseId, fingerprint, timestamp: now, domain, verdict,
        reason: reason.trim(), pr_ref: prRef, reviewer, tags,
        stack_version: stackVersion,
        diff_raw: diffText.trim(), diff_delta: delta,
    };

    saveCase(caseRecord);
    index.cases.push({
        id: caseId, fingerprint, domain, verdict, tags,
        timestamp: now, reason_summary: reason.trim().slice(0, 120),
        stack_version: stackVersion,
    });
    index.next_id = caseId + 1;
    saveIndex(index);

    console.log(`\n${GREEN}✔ Case #${String(caseId).padStart(4, '0')} recorded${RESET}`);
    console.log(`  ${DIM}Fingerprint   : ${fingerprint}${RESET}`);
    console.log(`  ${DIM}Domain        : ${domain}${RESET}`);
    console.log(`  ${DIM}Tags          : ${tags.slice(0, 8).join(', ')}${RESET}`);
    if (stackVersion) console.log(`  ${DIM}Stack version : ${stackVersion}${RESET}`);
    console.log();
}

function cmdSearchCases(args) {
    let query = args.filter(a => !a.startsWith('--')).join(' ');
    if (!query) {
        const qi = process.argv.indexOf('--query');
        if (qi !== -1) query = process.argv.slice(qi + 1).filter(a => !a.startsWith('--')).join(' ');
    }
    if (!query) { console.log(`${RED}✖ Provide a search query: search-cases --query "forEach side effects"${RESET}`); process.exit(1); }

    // FIX: --version-filter skips cases whose stack_version constraint doesn't
    // match the specified versions. Prevents stale React 17/18 cases blocking React 19 code.
    // Usage: search-cases "useEffect" --version-filter "react=19,node=22"
    const vfIdx = args.indexOf('--version-filter');
    const versionFilter = vfIdx !== -1 && args[vfIdx + 1]
        ? parseVersionFilter(args[vfIdx + 1])
        : null;

    const queryTags = extractTags(query);
    const index = loadIndex();
    if (!index.cases.length) { console.log(`${YELLOW}No cases recorded yet. Use 'add-case' to record your first rejection.${RESET}`); return; }

    // Apply version filter before scoring
    const eligibleCases = versionFilter
        ? index.cases.filter(e => caseMatchesVersionFilter(e, versionFilter))
        : index.cases;

    const skipped = index.cases.length - eligibleCases.length;

    const corpus = eligibleCases.map(e => e.tags || []);
    const idf = buildIdf(corpus);

    const scored = [];
    for (const entry of eligibleCases) {
        const score = tfidfCosineSimilarity(queryTags, entry.tags || [], idf);
        if (score > 0.0) scored.push({ score, entry });
    }
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 5);

    if (!top.length) {
        console.log(`${YELLOW}No matching cases found for: "${query}"${RESET}`);
        if (skipped > 0) console.log(`  ${DIM}${skipped} case(s) skipped by version filter: ${args[vfIdx + 1]}${RESET}`);
        console.log(`  ${DIM}Try broader terms or check 'list' for available cases.${RESET}`);
        return;
    }

    console.log(`\n${BOLD}${CYAN}━━━ Case Law Search Results ━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
    console.log(`  Query  : ${BOLD}${query}${RESET}`);
    console.log(`  Matches: ${top.length} of ${index.cases.length} cases` +
        (skipped > 0 ? `  ${DIM}(${skipped} skipped by version filter)${RESET}` : '') + '\n');

    for (const { score, entry } of top) {
        const vc = entry.verdict === 'REJECTED' ? RED : YELLOW;
        console.log(`  ${BOLD}Case #${String(entry.id).padStart(4, '0')}${RESET}  ${vc}[${entry.verdict}]${RESET}  ${DIM}${(entry.timestamp || '').slice(0, 10)}${RESET}  score=${score.toFixed(2)}`);
        console.log(`  ${DIM}Domain: ${entry.domain}${RESET}`);
        console.log(`  ${entry.reason_summary}`);
        console.log(`  ${DIM}Tags: ${(entry.tags || []).slice(0, 8).join(', ')}${RESET}\n`);
    }
    console.log(`  ${DIM}Run 'show --id <N>' to see the full diff for any case.${RESET}`);
    console.log(`${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);
}

function cmdList(args) {
    const index = loadIndex();
    const cases = index.cases || [];
    if (!cases.length) { console.log(`${YELLOW}No cases recorded yet.${RESET}`); return; }

    let domainFilter = null;
    const di = args.indexOf('--domain');
    if (di !== -1 && args[di + 1]) domainFilter = args[di + 1].toLowerCase();

    const filtered = domainFilter ? cases.filter(c => c.domain === domainFilter) : cases;
    const total = filtered.length;

    console.log(`\n${BOLD}${CYAN}━━━ Case Law Index (${total} cases) ━━━━━━━━━━━━━━━━━━━━${RESET}`);
    if (domainFilter) console.log(`  ${DIM}Filtered by domain: ${domainFilter}${RESET}\n`);

    const last20 = filtered.slice(-20).reverse();
    for (const entry of last20) {
        const vc = entry.verdict === 'REJECTED' ? RED : YELLOW;
        console.log(`  ${BOLD}#${String(entry.id).padStart(4, '0')}${RESET}  ${vc}[${entry.verdict}]${RESET}  ${DIM}${(entry.domain || '').toUpperCase()}${RESET}  ${(entry.timestamp || '').slice(0, 10)}`);
        console.log(`       ${(entry.reason_summary || '').slice(0, 80)}`);
    }
    if (total > 20) console.log(`\n  ${YELLOW}... showing last 20 of ${total}. Use 'export' for full history.${RESET}`);
    console.log(`${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);
}

function cmdShow(args) {
    let caseId = null;
    const ii = args.indexOf('--id');
    if (ii !== -1 && args[ii + 1]) caseId = parseInt(args[ii + 1], 10);
    if (caseId == null || isNaN(caseId)) { console.log(`${RED}✖ Provide a case ID: show --id 7${RESET}`); process.exit(1); }

    const caseRecord = loadCase(caseId);
    if (!caseRecord) { console.log(`${RED}✖ Case #${String(caseId).padStart(4, '0')} not found.${RESET}`); process.exit(1); }

    const vc = caseRecord.verdict === 'REJECTED' ? RED : YELLOW;
    console.log(`\n${BOLD}${CYAN}━━━ Case #${String(caseRecord.id).padStart(4, '0')} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
    console.log(`  Verdict    : ${vc}${BOLD}${caseRecord.verdict}${RESET}`);
    console.log(`  Domain     : ${caseRecord.domain}`);
    console.log(`  Recorded   : ${caseRecord.timestamp}`);
    if (caseRecord.pr_ref)   console.log(`  PR / Ref   : ${caseRecord.pr_ref}`);
    if (caseRecord.reviewer) console.log(`  Reviewer   : ${caseRecord.reviewer}`);
    console.log(`\n  ${BOLD}Reason:${RESET}`);
    console.log(`  ${caseRecord.reason}`);
    console.log(`\n  ${BOLD}Semantic Delta (meaningful changes only):${RESET}`);
    console.log(`  ${DIM}─────────────────────────────────────────${RESET}`);
    const deltaLines = (caseRecord.diff_delta || caseRecord.diff_raw).split('\n').slice(0, 40);
    for (const line of deltaLines) {
        if (line.startsWith('+'))      console.log(`  ${GREEN}${line}${RESET}`);
        else if (line.startsWith('-')) console.log(`  ${RED}${line}${RESET}`);
        else                           console.log(`  ${DIM}${line}${RESET}`);
    }
    console.log(`\n  ${BOLD}Tags:${RESET} ${(caseRecord.tags || []).join(', ')}`);
    console.log(`${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);
}

function cmdExport(args) {
    const toStdout = args.includes('--stdout');
    const index = loadIndex();
    const cases = index.cases || [];
    if (!cases.length) { console.log(`${YELLOW}No cases to export.${RESET}`); return; }

    const now = new Date().toISOString().slice(0, 19);
    const lines = [
        '# Tribunal Case Law — Full Export\n',
        `Generated: ${now}`, `Total Cases: ${cases.length}\n`, '---\n',
    ];
    for (const entry of cases) {
        const caseRecord = loadCase(entry.id) || entry;
        const badge = `[${caseRecord.verdict || 'REJECTED'}]`;
        lines.push(`## Case #${String(entry.id).padStart(4, '0')} ${badge}`);
        lines.push(`**Domain:** ${entry.domain}  `);
        lines.push(`**Recorded:** ${(entry.timestamp || '').slice(0, 10)}  `);
        if (caseRecord.pr_ref) lines.push(`**PR/Ref:** ${caseRecord.pr_ref}  `);
        lines.push(`\n**Reason:** ${entry.reason_summary}\n`);
        lines.push(`**Tags:** \`${(entry.tags || []).slice(0, 8).join(', ')}\`\n`);
        lines.push('---\n');
    }
    const content = lines.join('\n');
    if (toStdout) { console.log(content); return; }

    const outPath = path.join(HISTORY_DIR, 'case-law-export.md');
    fs.writeFileSync(outPath, content, 'utf8');
    console.log(`${GREEN}✔ Exported ${cases.length} cases to ${outPath}${RESET}`);
}

function cmdStats() {
    const index = loadIndex();
    const cases = index.cases || [];
    const domainCounts = {};
    const verdictCounts = {};
    for (const c of cases) {
        domainCounts[c.domain]   = (domainCounts[c.domain] || 0) + 1;
        verdictCounts[c.verdict] = (verdictCounts[c.verdict] || 0) + 1;
    }

    console.log(`\n${BOLD}${CYAN}━━━ Case Law Statistics ━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
    console.log(`  Total cases: ${BOLD}${cases.length}${RESET}`);
    console.log(`\n  ${BOLD}By Verdict:${RESET}`);
    for (const v of Object.keys(verdictCounts).sort()) {
        const color = v === 'REJECTED' ? RED : YELLOW;
        console.log(`    ${color}${v.padEnd(30)}${RESET} ${verdictCounts[v]}`);
    }
    console.log(`\n  ${BOLD}By Domain:${RESET}`);
    for (const [d, c] of Object.entries(domainCounts).sort((a, b) => b[1] - a[1])) {
        console.log(`    ${CYAN}${d.padEnd(20)}${RESET} ${c}`);
    }
    console.log(`${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);
}

function cmdAutoRecord() {
    function getFlag(name) {
        const flag = `--${name}`;
        const idx = process.argv.indexOf(flag);
        return (idx !== -1 && process.argv[idx + 1]) ? process.argv[idx + 1] : '';
    }

    const diffText   = getFlag('diff');
    const reason     = getFlag('reason');
    let domain       = getFlag('domain') || 'general';
    let verdict      = getFlag('verdict') || 'REJECTED';
    const reviewer   = getFlag('reviewer') || null;
    const prRef      = getFlag('pr-ref') || null;
    // FIX: --stack-version persists version context with the case record so
    // future searches can skip it when the project has moved past that version.
    // Example: --stack-version "react=18,next=14"
    const stackVersion = getFlag('stack-version') || null;

    if (!diffText || !reason) {
        console.log(`${RED}✖ auto-record requires --diff and --reason flags.${RESET}`);
        console.log(`  Usage: auto-record --diff "code" --reason "why" --domain security --reviewer agent-name --stack-version "react=18"`);
        process.exit(1);
    }

    if (isNoiseRejection(reason)) { console.log(`${DIM}⊘ Skipped: trivial rejection (noise filter matched).${RESET}`); return; }
    if (!VALID_DOMAINS.has(domain)) domain = 'general';
    if (!VALID_VERDICTS.has(verdict)) verdict = 'REJECTED';

    const fingerprint = contentHash(diffText);
    const index = loadIndex();
    for (const existing of index.cases) {
        if (existing.fingerprint === fingerprint) {
            console.log(`${YELLOW}⊘ Duplicate: Case #${String(existing.id).padStart(4, '0')} already records this pattern.${RESET}`);
            return;
        }
    }

    const delta = semanticDelta(diffText);
    const tags  = extractTags(diffText + ' ' + reason);
    const caseId = index.next_id;
    const now = new Date().toISOString().slice(0, 19);

    const caseRecord = {
        id: caseId, fingerprint, timestamp: now, domain, verdict,
        reason: reason.trim(), pr_ref: prRef, reviewer, tags,
        stack_version: stackVersion,
        diff_raw: diffText.trim(), diff_delta: delta, auto_recorded: true,
    };

    saveCase(caseRecord);
    index.cases.push({
        id: caseId, fingerprint, domain, verdict, tags,
        timestamp: now, reason_summary: reason.trim().slice(0, 120),
        stack_version: stackVersion,
    });
    index.next_id = caseId + 1;
    saveIndex(index);
    console.log(`${GREEN}✔ Auto-recorded Case #${String(caseId).padStart(4, '0')}${RESET} [${verdict}] domain=${domain}`);
    console.log(`  ${DIM}Reason: ${reason.slice(0, 80)}${RESET}`);
    if (stackVersion) console.log(`  ${DIM}Stack version: ${stackVersion}${RESET}`);
}

async function cmdOverrule(args) {
    let caseId = null;
    const ii = args.indexOf('--id');
    if (ii !== -1 && args[ii + 1]) caseId = parseInt(args[ii + 1], 10);
    if (caseId == null || isNaN(caseId)) { console.log(`${RED}✖ Provide a case ID: overrule --id 7${RESET}`); process.exit(1); }

    const caseRecord = loadCase(caseId);
    if (!caseRecord) { console.log(`${RED}✖ Case #${String(caseId).padStart(4, '0')} not found.${RESET}`); process.exit(1); }
    if (caseRecord.verdict === 'OVERRULED') { console.log(`${YELLOW}Case #${String(caseId).padStart(4, '0')} is already OVERRULED.${RESET}`); return; }

    let reason = null;
    const ri = args.indexOf('--reason');
    if (ri !== -1 && args[ri + 1]) reason = args[ri + 1];

    if (!reason) {
        const rl = createRl();
        reason = await ask(rl, 'Reason for overruling this precedent:');
        rl.close();
    }
    if (!reason || !reason.trim()) { console.log(`${RED}✖ An overrule reason is required.${RESET}`); process.exit(1); }

    const oldVerdict = caseRecord.verdict;
    caseRecord.verdict = 'OVERRULED';
    caseRecord.overruled_at = new Date().toISOString().slice(0, 19);
    caseRecord.overrule_reason = reason.trim();
    caseRecord.previous_verdict = oldVerdict;
    saveCase(caseRecord);

    const index = loadIndex();
    for (const entry of index.cases) {
        if (entry.id === caseId) { entry.verdict = 'OVERRULED'; break; }
    }
    saveIndex(index);

    console.log(`\n${GREEN}✔ Case #${String(caseId).padStart(4, '0')} OVERRULED${RESET}`);
    console.log(`  ${DIM}Previous verdict : ${oldVerdict}${RESET}`);
    console.log(`  ${DIM}Overrule reason  : ${reason.trim()}${RESET}`);
    console.log(`  ${DIM}The case is preserved in history but no longer blocks reviews.${RESET}\n`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
const COMMANDS = {
    'add-case':     cmdAddCase,
    'auto-record':  cmdAutoRecord,
    'search-cases': cmdSearchCases,
    'list':         cmdList,
    'show':         cmdShow,
    'overrule':     cmdOverrule,
    'export':       cmdExport,
    'stats':        cmdStats,
};

async function main() {
    const argv = process.argv.slice(2);
    if (!argv.length || ['-h', '--help', 'help'].includes(argv[0])) {
        console.log(`
${BOLD}case_law_manager.js${RESET} — Tribunal Case Law Engine

${BOLD}Commands:${RESET}
  add-case                      Record a new rejected pattern (interactive)
  auto-record --diff --reason   Record a rejection (non-interactive, for AI agents)
  search-cases --query <text>   Find relevant precedents (TF-IDF cosine, token-free)
  list [--domain <domain>]      List all recorded cases
  show --id <N>                 Show full diff for a case
  overrule --id <N>             Formally overrule a past precedent
  export [--stdout]             Export all cases to Markdown
  stats                         Show breakdown by domain/verdict

${BOLD}Domains:${RESET}  ${[...VALID_DOMAINS].sort().join(', ')}
${BOLD}Verdicts:${RESET} ${[...VALID_VERDICTS].sort().join(', ')}
`);
        return;
    }

    const cmd = argv[0];
    const rest = argv.slice(1);
    if (!COMMANDS[cmd]) {
        console.log(`${RED}✖ Unknown command: '${cmd}'${RESET}`);
        console.log(`  Valid: ${Object.keys(COMMANDS).join(', ')}`);
        process.exit(1);
    }
    await COMMANDS[cmd](rest);
}

// ── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
    contentHash, semanticDelta, extractTags, loadIndex, saveIndex,
    loadCase, saveCase, tfidfCosineSimilarity, buildIdf, findAgentDir,
    isNoiseRejection, isTrivialLine,
};

if (require.main === module) {
    main().catch(err => { console.error(err); process.exit(1); });
}
