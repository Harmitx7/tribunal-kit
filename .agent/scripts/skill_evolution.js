#!/usr/bin/env node
/**
 * skill_evolution.js — Tribunal Kit Skill Evolution Forge
 * =========================================================
 * Analyzes the delta between what the AI proposed and what the developer
 * actually committed, then distills those decisions into evolving
 * project-specific SKILL idioms — WITHOUT sending full files to any LLM.
 *
 * Core Strategy: Semantic Delta Extraction
 *   1. Read the raw git diff of staged/recent changes
 *   2. Strip trivial noise (whitespace, comments, import renames)
 *   3. Score remaining lines for "Architectural Weight"
 *   4. Only high-weight deltas reach the LLM reflection prompt
 *   5. LLM returns structured YAML idiom entries (not prose)
 *   6. Idioms are merged into .agent/skills/project-idioms/SKILL.md
 *
 * Usage:
 *   node .agent/scripts/skill_evolution.js digest
 *   node .agent/scripts/skill_evolution.js digest --dry-run
 *   node .agent/scripts/skill_evolution.js show
 *   node .agent/scripts/skill_evolution.js reset
 *   node .agent/scripts/skill_evolution.js status
 */

'use strict';

const fs      = require('fs');
const path    = require('path');
const https   = require('https');
const { execSync } = require('child_process');
const readline = require('readline');

// ── Colours ──────────────────────────────────────────────────────────────────
const GREEN  = '\x1b[92m';
const YELLOW = '\x1b[93m';
const CYAN   = '\x1b[96m';
const RED    = '\x1b[91m';
const BLUE   = '\x1b[94m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';
const RESET  = '\x1b[0m';

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
const SKILL_DIR   = path.join(AGENT_DIR, 'skills', 'project-idioms');
const SKILL_FILE  = path.join(SKILL_DIR, 'SKILL.md');
const HISTORY_DIR = path.join(AGENT_DIR, 'history', 'skill-evolution');
const LOG_FILE    = path.join(HISTORY_DIR, 'digest-log.json');

// ── Architectural Weight Patterns ────────────────────────────────────────────
const HIGH_WEIGHT_PATTERNS = [
    /\bclass\b/, /\binterface\b/, /\btype\s+\w+\s*=/, /\bextends\b/, /\bimplements\b/,
    /\bthrow\b/, /\bcatch\b/, /\btry\b/,
    /\bprisma\.\w+\(/, /\bsupabase\./, /\bfetch\(/, /\baxios\./,
    /\bReturnType\b/, /\bPromise</, /\basync\s+function/, /\bawait\b/,
    /\bexport\s+(default\s+)?(class|function|const)/, /\bmodule\.exports\b/,
    /\bRouter\b|\bapp\.(get|post|put|delete|patch)\(/,
    /\buse[A-Z]\w+\(/, /\bcreateContext\(/,
    /\bz\.object\(/, /\bPrisma\b|\bdrizzle\b/,
    /\benv\.\w+/, /\bprocess\.env\./,
];

const NOISE_PATTERNS = [
    /^\s*$/, /^\s*(\/\/|#|\/\*).*$/, /^\s*\*/,
    /^\s*import\s+\{[^}]+\}\s+from\s+['"](?!\.)/, /^\s*(console\.(log|warn|error)|print\()/,
    /^\s*\w+\s*[:,]?\s*$/,
];

function architecturalWeight(line) {
    const code = line.replace(/^[+-]/, '').trim();
    for (const p of NOISE_PATTERNS) { if (p.test(code)) return 0; }
    for (const p of HIGH_WEIGHT_PATTERNS) { if (p.test(code)) return 2; }
    return 1;
}

// ── Levenshtein Semantic Deduplication ───────────────────────────────────────
// FIX: Replaces over-aggressive substring matching (.includes) with normalised
// edit-distance similarity. A new idiom must differ by >= 20% from all existing
// ones to be accepted. Threshold 0.80 = 80% similar → considered a duplicate.

function levenshtein(a, b) {
    const m = a.length, n = b.length;
    // Allocate DP table with base cases pre-filled
    const dp = Array.from({ length: m + 1 }, (_, i) =>
        Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
    );
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

function normalizedSimilarity(a, b) {
    if (!a.length && !b.length) return 1.0;
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1.0;
    return 1 - levenshtein(a, b) / maxLen;
}

/**
 * Returns true if newPattern is semantically similar to any existing idiom.
 * Uses Levenshtein normalised similarity with a configurable threshold.
 * @param {string}   newPattern
 * @param {object[]} existingIdioms - array of { pattern } objects
 * @param {number}   threshold      - 0.0–1.0 (default 0.80 = 80% similar = duplicate)
 */
function isDuplicateIdiom(newPattern, existingIdioms, threshold = 0.80) {
    const newLow = newPattern.toLowerCase();
    return existingIdioms.some(ex => {
        const exLow = (ex.pattern || '').toLowerCase();
        return normalizedSimilarity(newLow, exLow) >= threshold;
    });
}

function semanticDelta(diffText, minWeight = 2) {
    const lines = diffText.split('\n');
    const kept = [];
    let currentHunkHasHigh = false;
    let hunkLines = [];

    for (const line of lines) {
        if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('diff --git')) {
            kept.push(line); continue;
        }
        if (line.startsWith('@@')) {
            if (currentHunkHasHigh) kept.push(...hunkLines);
            currentHunkHasHigh = false;
            hunkLines = [line]; continue;
        }
        if (line.startsWith('+') || line.startsWith('-')) {
            const w = architecturalWeight(line);
            hunkLines.push(line);
            if (w >= minWeight) currentHunkHasHigh = true;
        } else {
            hunkLines.push(line);
        }
    }
    if (currentHunkHasHigh) kept.push(...hunkLines);

    let result = kept.join('\n');
    result = result.replace(/\n( ?\n){3,}/g, '\n\n');
    return result.trim();
}

// ── Git helpers ────────────────────────────────────────────────────────────────
function getGitDiff(mode = 'staged') {
    try {
        let cmd;
        if (mode === 'staged')    cmd = 'git diff --cached --unified=3';
        else if (mode === 'head') cmd = 'git diff HEAD~1 HEAD --unified=3';
        else                      cmd = 'git diff --unified=3';
        return execSync(cmd, { encoding: 'utf8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch { return ''; }
}

function countTokensEstimate(text) {
    return Math.max(1, Math.floor(text.length / 4));
}

// ── Idiom management ──────────────────────────────────────────────────────────
function loadExistingIdioms() {
    if (!fs.existsSync(SKILL_FILE)) return [];
    const content = fs.readFileSync(SKILL_FILE, 'utf8');
    const idioms = [];
    const pattern = /\|\s*(\d+)\s*\|\s*`([^`]+)`\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/g;
    let m;
    while ((m = pattern.exec(content)) !== null) {
        idioms.push({
            id: parseInt(m[1], 10), pattern: m[2].trim(),
            reason: m[3].trim(), domain: m[4].trim(), since: m[5].trim(),
        });
    }
    return idioms;
}

function nextIdiomId(idioms) {
    if (!idioms.length) return 1;
    return Math.max(...idioms.map(i => i.id)) + 1;
}

function renderSkillMd(idioms, digestCount) {
    const now = new Date().toISOString().slice(0, 10);
    const rows = idioms.map(i =>
        `| ${i.id} | \`${i.pattern}\` | ${i.reason} | ${i.domain} | ${i.since} |`
    );
    const table = rows.length ? rows.join('\n') : '_No idioms recorded yet._';

    return `---
name: project-idioms
description: >
  Auto-evolved skill containing project-specific architectural idioms.
  Generated by skill_evolution.js — do not edit manually. Commit this
  file to share your Engineering Culture across the team.
version: auto
last-updated: ${now}
digest-cycles: ${digestCount}
pattern: generator
---

# Project Idioms — Auto-Evolved Skill

> **Authority Level: ABSOLUTE**
> These idioms were extracted from the developer's own code decisions.
> They override generic agent defaults. Every agent MUST respect them.

---

## How Idioms Are Born

1. Developer commits code that differs from the AI proposal.
2. \`skill_evolution.js digest\` extracts architectural deltas only.
3. A minimal LLM reflection prompt (< 500 tokens) identifies the "WHY."
4. The idiom is recorded here with a stable pattern + reason pair.

---

## Recorded Idioms

| ID | Pattern | Why This Project Uses It | Domain | Since |
|:---|:--------|:-------------------------|:-------|:------|
${table}

---

## Enforcement Rules for All Agents

\`\`\`
□ Before proposing code: scan this skill's idiom table
□ If your proposal contradicts an idiom → flag it explicitly
□ Never override an idiom silently — always ask the developer first
□ When citing an idiom: "Per Project Idiom #N: [pattern] — [reason]"
\`\`\`

---

## Digest History

Last digest: \`${now}\`
Total cycles: \`${digestCount}\`

Run \`node .agent/scripts/skill_evolution.js status\` to see the full log.
`;
}

function generateReflectionPrompt(delta) {
    return `You are analyzing a code delta from a developer who changed an AI-proposed solution.
Your only job: identify the ARCHITECTURAL IDIOM this change reveals about their project.

Rules:
- Return ONLY a YAML list of idioms. No prose. No explanation outside YAML.
- Each idiom: pattern (code signature), reason (1 sentence WHY), domain (backend/frontend/database/general)
- Ignore whitespace, comment, import changes — only architectural choices
- If no meaningful idiom can be extracted, return: "idioms: []"
- Maximum 3 idioms per delta.

Delta:
\`\`\`
${delta.slice(0, 1500)}
\`\`\`

Output format (YAML only):
idioms:
  - pattern: "<code pattern or convention>"
    reason: "<why this project uses this pattern>"
    domain: "<backend|frontend|database|security|performance|general>"
`;
}

function parseLlmYamlResponse(response) {
    const idioms = [];
    let inIdioms = false;
    let current = {};

    for (const line of response.split('\n')) {
        const stripped = line.trim();
        if (stripped === 'idioms:') { inIdioms = true; continue; }
        if (!inIdioms) continue;
        if (stripped.startsWith('- pattern:')) {
            if (current.pattern) idioms.push(current);
            current = { pattern: stripped.split(':', 2)[1].trim().replace(/^"|"$/g, '') };
        } else if (stripped.startsWith('reason:') && current.pattern) {
            current.reason = stripped.split(':', 2)[1].trim().replace(/^"|"$/g, '');
        } else if (stripped.startsWith('domain:') && current.pattern) {
            current.domain = stripped.split(':', 2)[1].trim().replace(/^"|"$/g, '');
        }
    }
    if (current.pattern) idioms.push(current);
    return idioms;
}

// ── Log helpers ────────────────────────────────────────────────────────────────
function loadLog() {
    fs.mkdirSync(HISTORY_DIR, { recursive: true });
    if (fs.existsSync(LOG_FILE)) {
        try { return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); } catch { /* fallthrough */ }
    }
    return { cycles: [], total_tokens_saved: 0, total_idioms: 0 };
}

function saveLog(log) {
    fs.mkdirSync(HISTORY_DIR, { recursive: true });
    fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), 'utf8');
}

// ── Auto-LLM API Integration ─────────────────────────────────────────────────
// GENERATE: Eliminates the manual copy-paste loop by auto-detecting an API key
// and calling the LLM directly. Falls back to manual mode if no key is found.
// Supported providers (checked in order): Anthropic → OpenAI → Gemini.

function detectLlmProvider() {
    if (process.env.ANTHROPIC_API_KEY) return { provider: 'anthropic', key: process.env.ANTHROPIC_API_KEY };
    if (process.env.OPENAI_API_KEY)    return { provider: 'openai',    key: process.env.OPENAI_API_KEY };
    if (process.env.GEMINI_API_KEY)    return { provider: 'gemini',    key: process.env.GEMINI_API_KEY };
    return null;
}

/**
 * Call an LLM API with the reflection prompt. Returns the raw text response.
 * Uses only built-in Node.js `https` — zero external dependencies.
 *
 * @param {string} prompt    - The reflection prompt to send
 * @param {string} provider  - 'anthropic' | 'openai' | 'gemini'
 * @param {string} apiKey    - The API key
 * @returns {Promise<string|null>} LLM response text or null on failure
 */
async function callLlmApi(prompt, provider, apiKey) {
    const timeout = 30000; // 30s max — skill evolution is non-blocking

    function httpsPost(hostname, path, headers, body) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify(body);
            const req = https.request(
                { method: 'POST', hostname, path, headers: { ...headers, 'Content-Length': Buffer.byteLength(data) } },
                (res) => {
                    let raw = '';
                    res.on('data', c => { raw += c; });
                    res.on('end', () => resolve(raw));
                    res.on('error', reject);
                }
            );
            req.on('error', reject);
            req.setTimeout(timeout, () => { req.destroy(new Error('LLM API timeout')); });
            req.write(data);
            req.end();
        });
    }

    try {
        if (provider === 'anthropic') {
            const raw = await httpsPost(
                'api.anthropic.com',
                '/v1/messages',
                {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                },
                {
                    model: 'claude-3-haiku-20240307',  // Fastest/cheapest — idiom extraction
                    max_tokens: 512,
                    messages: [{ role: 'user', content: prompt }],
                }
            );
            const json = JSON.parse(raw);
            return json?.content?.[0]?.text ?? null;
        }

        if (provider === 'openai') {
            const raw = await httpsPost(
                'api.openai.com',
                '/v1/chat/completions',
                {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                {
                    model: 'gpt-4o-mini',  // Cheapest capable model for YAML extraction
                    max_tokens: 512,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.1,
                }
            );
            const json = JSON.parse(raw);
            return json?.choices?.[0]?.message?.content ?? null;
        }

        if (provider === 'gemini') {
            const raw = await httpsPost(
                'generativelanguage.googleapis.com',
                `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
                { 'Content-Type': 'application/json' },
                {
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { maxOutputTokens: 512, temperature: 0.1 },
                }
            );
            const json = JSON.parse(raw);
            return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
        }
    } catch (e) {
        return null; // Network/parse failure — caller falls back to manual mode
    }
    return null;
}

// ── Commands ──────────────────────────────────────────────────────────────────
async function cmdDigest(args) {
    const dryRun  = args.includes('--dry-run');
    const diffMode = args.includes('--head') ? 'head' : 'staged';

    console.log(`\n${BOLD}${CYAN}━━━ Skill Evolution — Digest Cycle ━━━━━━━━━━━━━━━━${RESET}`);
    if (dryRun) console.log(`  ${YELLOW}DRY RUN — no files will be written${RESET}\n`);

    console.log(`  ${DIM}[1/5] Fetching git diff (${diffMode})...${RESET}`);
    const rawDiff = getGitDiff(diffMode);
    if (!rawDiff.trim()) {
        console.log(`  ${YELLOW}⚠ No diff found. Commit or stage changes first.${RESET}`);
        console.log(`  ${DIM}Tip: Use --head to diff against the last commit.${RESET}\n`);
        return;
    }

    const rawTokens = countTokensEstimate(rawDiff);
    console.log(`  ${DIM}   Raw diff: ~${rawTokens} tokens (${rawDiff.length} chars)${RESET}`);

    console.log(`  ${DIM}[2/5] Extracting architectural delta (Semantic Filter)...${RESET}`);
    const delta = semanticDelta(rawDiff, 2);
    if (!delta.trim()) {
        console.log(`  ${GREEN}✔ Delta is 100% trivial (whitespace/comments/imports only).${RESET}`);
        console.log(`  ${DIM}  No LLM call needed. Zero tokens consumed.${RESET}\n`);
        return;
    }

    const deltaTokens = countTokensEstimate(delta);
    const savedTokens = rawTokens - deltaTokens;
    const savedPct = Math.floor((savedTokens / Math.max(rawTokens, 1)) * 100);
    console.log(`  ${GREEN}✔ Filtered to ~${deltaTokens} tokens  (${savedPct}% reduction, saved ~${savedTokens} tokens)${RESET}`);

    console.log(`\n  ${BOLD}Architectural Delta Preview:${RESET}`);
    const previewLines = delta.split('\n').slice(0, 20);
    for (const line of previewLines) {
        if (line.startsWith('+'))       console.log(`    ${GREEN}${line}${RESET}`);
        else if (line.startsWith('-'))  console.log(`    ${RED}${line}${RESET}`);
        else if (line.startsWith('@@')) console.log(`    ${BLUE}${line}${RESET}`);
        else                            console.log(`    ${DIM}${line}${RESET}`);
    }
    if (delta.split('\n').length > 20) console.log(`    ${DIM}... (${delta.split('\n').length - 20} more lines)${RESET}`);

    if (dryRun) {
        console.log(`\n  ${YELLOW}[DRY RUN] Would send ${deltaTokens} tokens to LLM for reflection.${RESET}`);
        console.log(`  ${DIM}Run without --dry-run to complete the digest.${RESET}\n`);
        return;
    }

    // GENERATE: Auto-LLM call. Tries API first, falls back to manual paste if no key.
    const reflectionPrompt = generateReflectionPrompt(delta);
    let llmResponse = '';

    let llmCreds = detectLlmProvider();
    if (llmCreds) {
        console.log(`  ${DIM}[3/5] LLM Reflection — auto-calling ${llmCreds.provider} API...${RESET}`);
        const autoResponse = await callLlmApi(reflectionPrompt, llmCreds.provider, llmCreds.key);
        if (autoResponse) {
            llmResponse = autoResponse;
            console.log(`  ${GREEN}✔ Auto-response received (${llmCreds.provider}) — ${llmResponse.split('\n').length} lines${RESET}`);
        } else {
            console.log(`  ${YELLOW}⚠ API call failed — falling back to manual mode${RESET}`);
            llmCreds = null; // triggers manual fallback below
        }
    }

    if (!llmCreds || !llmResponse) {
        // Manual fallback: copy-paste mode (no API key configured)
        console.log(`\n  ${DIM}[3/5] LLM Reflection — copy the prompt below and paste the response${RESET}`);
        console.log(`  ${DIM}  Tip: Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY to automate this step.${RESET}`);
        console.log(`\n  ${BOLD}${'─'.repeat(60)}${RESET}`);
        console.log(reflectionPrompt);
        console.log(`  ${BOLD}${'─'.repeat(60)}${RESET}`);
        console.log(`\n  ${BOLD}Paste LLM response below (type END_RESPONSE when done):${RESET}`);

        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const responseLines = [];
        await new Promise(resolve => {
            const listener = (line) => {
                if (line.trim() === 'END_RESPONSE') { rl.removeListener('line', listener); resolve(); }
                else responseLines.push(line);
            };
            rl.on('line', listener);
        });
        rl.close();
        llmResponse = responseLines.join('\n');
    }

    console.log(`\n  ${DIM}[4/5] Parsing idioms...${RESET}`);
    const newIdioms = parseLlmYamlResponse(llmResponse);
    if (!newIdioms.length) {
        console.log(`  ${YELLOW}⚠ No idioms extracted from LLM response.${RESET}`);
        console.log(`  ${DIM}  The LLM may have returned idioms: [] — no architectural pattern detected.${RESET}\n`);
        return;
    }

    console.log(`  ${GREEN}✔ Extracted ${newIdioms.length} idiom(s)${RESET}`);
    for (const idiom of newIdioms) {
        console.log(`    ${CYAN}• ${idiom.pattern || '?'}${RESET}  — ${idiom.reason || ''}`);
    }

    console.log(`\n  ${DIM}[5/5] Merging into project-idioms/SKILL.md...${RESET}`);
    const existing = loadExistingIdioms();
    const log = loadLog();
    let nextId = nextIdiomId(existing);
    const today = new Date().toISOString().slice(0, 10);
    const merged = [...existing];
    let added = 0;

    for (const idiom of newIdioms) {
        // FIX: Use Levenshtein normalised similarity (threshold 0.80) instead of
        // substring .includes() which was over-aggressive and blocked valid idioms.
        if (isDuplicateIdiom(idiom.pattern || '', existing)) {
            console.log(`  ${DIM}  Skipped near-duplicate: ${idiom.pattern}${RESET}`);
            continue;
        }
        merged.push({
            id: nextId, pattern: idiom.pattern || '?',
            reason: idiom.reason || 'No reason provided.',
            domain: idiom.domain || 'general', since: today,
        });
        nextId++;
        added++;
    }

    if (added === 0) {
        console.log(`  ${YELLOW}⚠ All extracted idioms were duplicates. SKILL.md unchanged.${RESET}\n`);
        return;
    }

    log.total_idioms = merged.length;
    const skillMd = renderSkillMd(merged, (log.cycles || []).length + 1);
    fs.mkdirSync(SKILL_DIR, { recursive: true });
    fs.writeFileSync(SKILL_FILE, skillMd, 'utf8');

    log.cycles = log.cycles || [];
    log.cycles.push({
        timestamp: new Date().toISOString().slice(0, 19),
        raw_tokens: rawTokens, delta_tokens: deltaTokens,
        tokens_saved: savedTokens, idioms_added: added,
    });
    log.total_tokens_saved = (log.total_tokens_saved || 0) + savedTokens;
    saveLog(log);

    console.log(`\n  ${GREEN}✔ ${added} new idiom(s) added to SKILL.md${RESET}`);
    console.log(`  ${DIM}   File: ${SKILL_FILE}${RESET}`);
    console.log(`  ${DIM}   Total idioms: ${merged.length}${RESET}`);
    console.log(`  ${DIM}   Lifetime tokens saved: ${log.total_tokens_saved}${RESET}\n`);
    console.log(`  ${CYAN}Commit SKILL.md to share your Engineering Culture with the team.${RESET}\n`);
}

function cmdShow() {
    if (!fs.existsSync(SKILL_FILE)) { console.log(`${YELLOW}No project-idioms skill found. Run 'digest' first.${RESET}`); return; }
    console.log(fs.readFileSync(SKILL_FILE, 'utf8'));
}

function cmdReset() {
    if (fs.existsSync(SKILL_FILE)) { fs.unlinkSync(SKILL_FILE); console.log(`${GREEN}✔ project-idioms/SKILL.md deleted.${RESET}`); }
    if (fs.existsSync(LOG_FILE))   { fs.unlinkSync(LOG_FILE);   console.log(`${GREEN}✔ Digest log cleared.${RESET}`); }
    console.log(`${DIM}Run 'digest' to start a fresh evolution cycle.${RESET}`);
}

function cmdStatus() {
    const log = loadLog();
    const cycles = log.cycles || [];
    const totalSaved = log.total_tokens_saved || 0;
    const totalIdioms = log.total_idioms || 0;
    const idiomsExist = fs.existsSync(SKILL_FILE);

    console.log(`\n${BOLD}${CYAN}━━━ Skill Evolution Status ━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
    console.log(`  Digest cycles    : ${BOLD}${cycles.length}${RESET}`);
    console.log(`  Total idioms     : ${BOLD}${totalIdioms}${RESET}`);
    console.log(`  Tokens saved     : ${GREEN}${totalSaved.toLocaleString()} tokens${RESET}  (≈ $${(totalSaved / 1_000_000 * 3).toFixed(4)} at $3/M)`);
    console.log(`  SKILL.md exists  : ${idiomsExist ? '✔' : '✗'}`);

    if (cycles.length) {
        console.log(`\n  ${BOLD}Last 5 digest cycles:${RESET}`);
        for (const cycle of cycles.slice(-5).reverse()) {
            const ts = (cycle.timestamp || '?').slice(0, 16);
            const deltaT = cycle.delta_tokens || 0;
            const saved = cycle.tokens_saved || 0;
            const addedCount = cycle.idioms_added || 0;
            const pct = Math.floor((saved / Math.max(cycle.raw_tokens || 1, 1)) * 100);
            console.log(`    ${DIM}${ts}${RESET}  delta=${deltaT}tok  saved=${saved}tok (${pct}%)  idioms+=${addedCount}`);
        }
    }
    console.log(`${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
const COMMANDS = { digest: cmdDigest, show: cmdShow, reset: cmdReset, status: cmdStatus };

async function main() {
    const argv = process.argv.slice(2);
    if (!argv.length || ['-h', '--help', 'help'].includes(argv[0])) {
        console.log(`
${BOLD}skill_evolution.js${RESET} — Tribunal Skill Evolution Forge

${BOLD}Commands:${RESET}
  digest [--dry-run] [--head]   Analyze latest git diff and evolve SKILL.md
                                  --dry-run  : preview without writing
                                  --head     : diff last commit instead of staged
  show                           Print current project-idioms/SKILL.md
  status                         Show digest history and token savings
  reset                          Clear all idioms and start fresh

${BOLD}Token Budget:${RESET}
  Raw diff -> Semantic Filter -> Only architectural lines -> LLM
  Typical savings: 70–90% of tokens. Most trivial commits = 0 tokens.
`);
        return;
    }

    const cmd = argv[0];
    const rest = argv.slice(1);
    if (!COMMANDS[cmd]) { console.log(`${RED}✖ Unknown command: '${cmd}'${RESET}`); process.exit(1); }
    await COMMANDS[cmd](rest);
}

module.exports = { semanticDelta, architecturalWeight, parseLlmYamlResponse, loadExistingIdioms };

if (require.main === module) {
    main().catch(err => { console.error(err); process.exit(1); });
}
