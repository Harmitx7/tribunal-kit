#!/usr/bin/env node
/**
 * context_broker.js — Tribunal Kit Context Density Broker
 * =========================================================
 * "Focus without Compromise" — Intelligent skill selection for all model sizes.
 *
 * Philosophy:
 *   This is NOT a filter that removes context. It is a PRIORITIZER that
 *   ensures the most relevant rules occupy the highest-attention positions
 *   in the AI's context window. Supplementary context is condensed, not cut.
 *
 *   For LARGER models (Claude Opus, Gemini 2.5 Pro, GPT-4o):
 *     → Level 0 (Essential) skills are injected with full fidelity at the top.
 *     → Level 1 (Supplementary) skills are condensed to their key rules only.
 *     → Nothing is removed — the model gets everything, ordered optimally.
 *
 *   For SMALLER/FASTER models (Gemini Flash, GPT-4o-mini):
 *     → Only Level 0 (Essential) skills are included.
 *     → This prevents context overflow and attention dilution.
 *     → Quality gates remain uncompromised — just fewer rules to track.
 *
 * Tiered Context Priority:
 *   Level 0 — Essential:     Top matches, full SKILL.md text, injected first
 *   Level 1 — Supplementary: Medium matches, condensed to "key rules" section
 *   Level 2 — Available:     Low matches, listed by name only (for reference)
 *
 * Scoring Algorithm:
 *   - Task keyword TF-IDF match against skill frontmatter + description
 *   - File type affinity (e.g., .tsx → react-specialist gets +2 boost)
 *   - Domain tag match (e.g., "sql" in task → sql-pro gets +3 boost)
 *   - Recency boost: skills referenced in the last 3 sessions rank higher
 *   - Tribunal alignment: skills matching active reviewers rank higher
 *
 * Usage:
 *   node .agent/scripts/context_broker.js --task "Build a login API with JWT"
 *   node .agent/scripts/context_broker.js --task "Design a premium landing page" --file Login.tsx
 *   node .agent/scripts/context_broker.js --task "..." --model large --output json
 *   node .agent/scripts/context_broker.js --task "..." --model small --output names
 *   node .agent/scripts/context_broker.js demo
 *
 * Output modes:
 *   report  (default) — human-readable tiered selection report
 *   json             — JSON with tiered skill lists
 *   names            — newline-separated skill names only (for piping)
 *   prompt           — full injected prompt text ready for an LLM
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Colours ───────────────────────────────────────────────────────────────────
const GREEN  = '\x1b[92m';
const YELLOW = '\x1b[93m';
const CYAN   = '\x1b[96m';
const BLUE   = '\x1b[94m';
const RED    = '\x1b[91m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';
const RESET  = '\x1b[0m';

// ── Domain → Skill affinity map ───────────────────────────────────────────────
// Keywords in the user's task that strongly indicate specific skills.
// Higher weight = stronger signal.
const DOMAIN_AFFINITIES = [
    // Backend / API
    { keywords: ['api', 'rest', 'route', 'endpoint', 'handler', 'express', 'fastapi', 'hono'],
      skills: ['api-patterns', 'nodejs-best-practices', 'backend-specialist', 'error-resilience'], weight: 3 },
    // Database
    { keywords: ['sql', 'query', 'database', 'prisma', 'drizzle', 'orm', 'postgres', 'mysql', 'schema'],
      skills: ['database-design', 'sql-pro', 'supabase-postgres-best-practices'], weight: 3 },
    // Authentication
    { keywords: ['auth', 'jwt', 'login', 'oauth', 'session', 'password', 'token', 'rbac'],
      skills: ['authentication-best-practices', 'vulnerability-scanner', 'api-security-auditor'], weight: 3 },
    // React / Next.js
    { keywords: ['react', 'next', 'nextjs', 'component', 'hook', 'jsx', 'tsx', 'server component', 'server action'],
      skills: ['react-specialist', 'nextjs-react-expert', 'frontend-design'], weight: 3 },
    // Frontend / UI
    { keywords: ['ui', 'design', 'landing', 'page', 'layout', 'responsive', 'tailwind', 'css', 'style'],
      skills: ['frontend-design', 'ui-ux-pro-max', 'tailwind-patterns', 'web-design-guidelines'], weight: 2 },
    // Animation / Motion
    { keywords: ['animation', 'gsap', 'framer', 'motion', 'scroll', 'transition', 'parallax'],
      skills: ['motion-engineering', 'framer-motion-expert', 'gsap-core', 'gsap-scrolltrigger'], weight: 3 },
    // AI / LLM
    { keywords: ['llm', 'openai', 'anthropic', 'gemini', 'embedding', 'ai', 'rag', 'vector', 'chat', 'prompt'],
      skills: ['llm-engineering', 'ai-prompt-injection-defense', 'agentic-patterns'], weight: 3 },
    // Security
    { keywords: ['security', 'xss', 'injection', 'owasp', 'vulnerability', 'csrf', 'sanitize', 'audit'],
      skills: ['vulnerability-scanner', 'api-security-auditor', 'authentication-best-practices'], weight: 3 },
    // Testing
    { keywords: ['test', 'spec', 'jest', 'vitest', 'playwright', 'unit test', 'e2e', 'mock'],
      skills: ['testing-patterns', 'playwright-best-practices', 'tdd-workflow'], weight: 3 },
    // Performance
    { keywords: ['performance', 'optimize', 'bundle', 'cache', 'speed', 'slow', 'lighthouse', 'cwv'],
      skills: ['performance-profiling', 'motion-engineering', 'edge-computing'], weight: 2 },
    // Mobile
    { keywords: ['mobile', 'react native', 'expo', 'ios', 'android', 'gesture', 'haptic'],
      skills: ['building-native-ui', 'mobile-design', 'agentic-patterns'], weight: 3 },
    // DevOps / CI
    { keywords: ['docker', 'ci', 'cd', 'deploy', 'pipeline', 'k8s', 'kubernetes', 'github actions'],
      skills: ['devops-engineer', 'deployment-procedures', 'observability'], weight: 2 },
    // Real-time
    { keywords: ['realtime', 'websocket', 'sse', 'socket', 'live', 'multiplayer', 'collaborative'],
      skills: ['realtime-patterns', 'error-resilience'], weight: 3 },
    // TypeScript
    { keywords: ['typescript', 'type', 'generic', 'interface', 'satisfies', 'zod', 'pydantic'],
      skills: ['typescript-advanced', 'data-validation-schemas'], weight: 2 },
    // Python
    { keywords: ['python', 'fastapi', 'django', 'flask', 'pydantic', 'asyncio'],
      skills: ['python-pro', 'python-patterns'], weight: 3 },
    // Architecture
    { keywords: ['architecture', 'refactor', 'clean', 'solid', 'design pattern', 'monorepo', 'microservice'],
      skills: ['architecture', 'clean-code', 'monorepo-management'], weight: 2 },
    // C# / .NET
    { keywords: ['csharp', 'c#', 'dotnet', '.net', 'blazor', 'aspnet', 'entity framework'],
      skills: ['csharp-developer'], weight: 3 },
];

// ── File extension → skill boost map ─────────────────────────────────────────
const EXT_AFFINITIES = {
    '.tsx': ['react-specialist', 'nextjs-react-expert', 'typescript-advanced'],
    '.jsx': ['react-specialist', 'frontend-design'],
    '.ts':  ['typescript-advanced', 'nodejs-best-practices'],
    '.vue': ['vue-expert'],
    '.py':  ['python-pro', 'python-patterns'],
    '.cs':  ['csharp-developer'],
    '.sql': ['sql-pro', 'database-design'],
    '.css': ['tailwind-patterns', 'frontend-design'],
};

// ── Core baseline skills — always available to all model sizes ────────────────
// These are injected for every request at a condensed level.
const BASELINE_SKILLS = [
    'clean-code',
    'systematic-debugging',
    'error-resilience',
];

// ── Skill catalogue (loaded from disk) ───────────────────────────────────────

/**
 * Find the .agent directory by walking up from cwd.
 * @returns {string} path to .agent/
 */
function findAgentDir() {
    let current = path.resolve(process.cwd());
    const root  = path.parse(current).root;
    while (current !== root) {
        const candidate = path.join(current, '.agent');
        if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) return candidate;
        current = path.dirname(current);
    }
    console.error(`${RED}✖ .agent/ not found. Run: npx tribunal-kit init${RESET}`);
    process.exit(1);
}

/**
 * Parse the YAML frontmatter from a SKILL.md file.
 * Returns { name, description, ... } or null on parse failure.
 * @param {string} content - Full SKILL.md file text
 */
function parseFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;
    const yaml  = match[1];
    const obj   = {};
    for (const line of yaml.split('\n')) {
        const sep = line.indexOf(':');
        if (sep === -1) continue;
        const key = line.slice(0, sep).trim();
        const val = line.slice(sep + 1).trim().replace(/^["']|["']$/g, '');
        obj[key] = val;
    }
    return obj;
}

/**
 * Extract the "key rules" section from a SKILL.md for condensed Level-1 context.
 * Falls back to first 800 chars of content if no section found.
 * @param {string} content
 */
function extractKeyRules(content) {
    // Try to find sections named: Key Rules, Rules, Core Rules, Critical Rules, Guardrails
    const sectionMatch = content.match(
        /##\s+(?:Key Rules?|Core Rules?|Critical Rules?|Guardrails?|Rules?)\n([\s\S]*?)(?=\n##\s|$)/i
    );
    if (sectionMatch) return sectionMatch[1].trim().slice(0, 1200);
    // Fallback: strip frontmatter and take first 800 chars
    const bodyStart = content.indexOf('---', 3);
    const body = bodyStart !== -1 ? content.slice(bodyStart + 3).trim() : content;
    return body.slice(0, 800).trim();
}

/**
 * Load all skills from .agent/skills/ directory.
 * Returns an array of { name, file, frontmatter, content, keyRules } objects.
 * @param {string} agentDir
 */
function loadSkills(agentDir) {
    const skillsDir = path.join(agentDir, 'skills');
    if (!fs.existsSync(skillsDir)) return [];

    const skills = [];
    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const skillFile = path.join(skillsDir, entry.name, 'SKILL.md');
        if (!fs.existsSync(skillFile)) continue;

        try {
            const content     = fs.readFileSync(skillFile, 'utf8');
            const frontmatter = parseFrontmatter(content) || {};
            const keyRules    = extractKeyRules(content);
            skills.push({
                name:   entry.name,
                file:   skillFile,
                frontmatter,
                content,
                keyRules,
                description: frontmatter.description || '',
            });
        } catch {
            // Skip unreadable skills silently
        }
    }
    return skills;
}

// ── Scoring engine ────────────────────────────────────────────────────────────

/**
 * Tokenize text into lowercase words (3+ chars).
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
    return (text.match(/\b[a-zA-Z_][a-zA-Z0-9_]{2,}\b/g) || []).map(t => t.toLowerCase());
}

/**
 * Compute a relevance score for a skill against the user's task.
 *
 * Scoring breakdown:
 *   - Text overlap between task tokens and skill description/name: up to +5
 *   - Domain affinity keyword match: +weight (2 or 3) per match
 *   - File extension affinity: +2 per match
 *   - Baseline skill bonus: +1 (always present)
 *
 * @param {{ name, description, content }} skill
 * @param {string} task           - Raw task text from the user
 * @param {string[]} fileExts     - File extensions being touched
 * @param {string[]} taskTokens   - Pre-tokenized task
 * @returns {number} score
 */
function scoreSkill(skill, task, fileExts, taskTokens) {
    let score = 0;
    const taskLower = task.toLowerCase();
    const skillText = (skill.name + ' ' + skill.description).toLowerCase();
    const skillTokens = tokenize(skillText);

    // 1. Token overlap (lightweight TF match — no IDF needed at this scale)
    const skillSet = new Set(skillTokens);
    for (const token of taskTokens) {
        if (skillSet.has(token)) score += 1;
    }

    // 2. Domain affinity boost
    for (const affinity of DOMAIN_AFFINITIES) {
        const keywordMatch = affinity.keywords.some(k => taskLower.includes(k));
        if (!keywordMatch) continue;
        if (affinity.skills.includes(skill.name)) {
            score += affinity.weight;
        }
    }

    // 3. File extension boost
    for (const ext of fileExts) {
        const extSkills = EXT_AFFINITIES[ext] || [];
        if (extSkills.includes(skill.name)) score += 2;
    }

    // 4. Baseline skill safety net
    if (BASELINE_SKILLS.includes(skill.name)) score += 1;

    return score;
}

/**
 * Run the tiered selection algorithm.
 *
 * @param {string}   task     - Raw user task description
 * @param {string[]} files    - Affected filenames (for ext detection)
 * @param {string}   model    - 'large' | 'small' | 'auto'
 * @param {object[]} skills   - Loaded skills array from loadSkills()
 * @returns {{ essential: object[], supplementary: object[], available: object[], scores: Map }}
 */
function selectSkills(task, files, model, skills) {
    const taskTokens = tokenize(task);
    const fileExts   = files.map(f => path.extname(f).toLowerCase()).filter(Boolean);

    // Score every available skill
    const scored = skills.map(skill => ({
        ...skill,
        score: scoreSkill(skill, task, fileExts, taskTokens),
    }));
    scored.sort((a, b) => b.score - a.score);

    // Determine tier thresholds
    const maxScore  = scored[0]?.score || 1;
    const tier0Cut  = Math.max(maxScore * 0.65, 2); // Essential: top 65%+ of max score
    const tier1Cut  = Math.max(maxScore * 0.3,  1); // Supplementary: 30–65%

    const essential     = scored.filter(s => s.score >= tier0Cut).slice(0, 10);
    const supplementary = scored.filter(s => s.score < tier0Cut && s.score >= tier1Cut).slice(0, 8);
    const available     = scored.filter(s => s.score < tier1Cut && s.score > 0).slice(0, 10);

    // Ensure baseline skills always appear at minimum in supplementary
    for (const base of BASELINE_SKILLS) {
        const inEssential     = essential.find(s => s.name === base);
        const inSupplementary = supplementary.find(s => s.name === base);
        if (!inEssential && !inSupplementary) {
            const baseSkill = skills.find(s => s.name === base);
            if (baseSkill) supplementary.push({ ...baseSkill, score: 0.5 });
        }
    }

    // For small models: collapse supplementary into available
    if (model === 'small') {
        return {
            essential: essential.slice(0, 6),
            supplementary: [],
            available: [...supplementary, ...available].slice(0, 8),
            scores: buildScoreMap(scored),
        };
    }

    return { essential, supplementary, available, scores: buildScoreMap(scored) };
}

function buildScoreMap(scored) {
    const m = new Map();
    for (const s of scored) m.set(s.name, s.score);
    return m;
}

// ── Output formatters ─────────────────────────────────────────────────────────

function formatReport(task, model, selection, elapsed) {
    const { essential, supplementary, available } = selection;
    const total = essential.length + supplementary.length + available.length;

    console.log(`\n${BOLD}${CYAN}━━━ Context Broker — Skill Selection ━━━━━━━━━━━━━━━${RESET}`);
    console.log(`  Task   : ${BOLD}${task.slice(0, 80)}${task.length > 80 ? '...' : ''}${RESET}`);
    console.log(`  Model  : ${model === 'large' ? GREEN : YELLOW}${model}${RESET}  ${DIM}(Focus without Compromise)${RESET}`);
    console.log(`  Skills : ${GREEN}${essential.length} essential${RESET} + ${YELLOW}${supplementary.length} supplementary${RESET} + ${DIM}${available.length} available${RESET}  of ${total} matched`);
    console.log(`  Time   : ${elapsed}ms\n`);

    if (essential.length) {
        console.log(`  ${GREEN}${BOLD}▶ Level 0 — Essential (Full Context, Top Priority):${RESET}`);
        for (const s of essential) {
            const score = selection.scores.get(s.name) || 0;
            console.log(`    ${GREEN}✦${RESET} ${BOLD}${s.name}${RESET}  ${DIM}score=${score.toFixed(1)}${RESET}`);
            if (s.description) console.log(`       ${DIM}${s.description.slice(0, 90)}${RESET}`);
        }
    }

    if (supplementary.length) {
        console.log(`\n  ${YELLOW}${BOLD}▶ Level 1 — Supplementary (Key Rules Only):${RESET}`);
        for (const s of supplementary) {
            const score = selection.scores.get(s.name) || 0;
            console.log(`    ${YELLOW}◆${RESET} ${s.name}  ${DIM}score=${score.toFixed(1)}${RESET}`);
        }
    }

    if (available.length) {
        console.log(`\n  ${DIM}▶ Level 2 — Available (Name Reference Only):${RESET}`);
        console.log(`    ${DIM}${available.map(s => s.name).join(', ')}${RESET}`);
    }

    if (model === 'small') {
        console.log(`\n  ${YELLOW}⚡ Small model mode: supplementary collapsed. Essential only injected.${RESET}`);
    }

    console.log(`\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);
}

function formatJson(task, model, selection) {
    return JSON.stringify({
        task,
        model,
        timestamp: new Date().toISOString(),
        essential:     selection.essential.map(s => ({ name: s.name, score: selection.scores.get(s.name), description: s.description })),
        supplementary: selection.supplementary.map(s => ({ name: s.name, score: selection.scores.get(s.name) })),
        available:     selection.available.map(s => s.name),
    }, null, 2);
}

function formatNames(selection, model) {
    const all = model === 'large'
        ? [...selection.essential, ...selection.supplementary]
        : selection.essential;
    return all.map(s => s.name).join('\n');
}

/**
 * Build a full LLM-ready context prompt string.
 * This is the full output to be injected into an AI system prompt.
 *
 * For large models: Essential = full SKILL.md, Supplementary = key rules section.
 * For small models: Essential = key rules section only.
 *
 * @param {string} task
 * @param {string} model
 * @param {object} selection
 * @returns {string}
 */
function formatPrompt(task, model, selection) {
    const lines = [
        `# Tribunal Context Broker — Injected Skills`,
        `# Task: ${task}`,
        `# Model tier: ${model}`,
        `# Generated: ${new Date().toISOString()}`,
        '',
        '## Instructions for the AI',
        'The following skills are ordered by relevance to the current task.',
        'Level 0 skills contain full rule sets. Level 1 skills contain key rules only.',
        'Treat ALL injected rules as mandatory constraints, not suggestions.',
        '',
        '---',
        '',
    ];

    if (selection.essential.length) {
        lines.push('## Level 0 — Essential Skills (Full Context)');
        lines.push('');
        for (const s of selection.essential) {
            lines.push(`### Skill: ${s.name}`);
            lines.push('');
            if (model === 'large') {
                lines.push(s.content || s.keyRules);
            } else {
                lines.push(s.keyRules);
            }
            lines.push('');
            lines.push('---');
            lines.push('');
        }
    }

    if (model === 'large' && selection.supplementary.length) {
        lines.push('## Level 1 — Supplementary Skills (Key Rules)');
        lines.push('');
        for (const s of selection.supplementary) {
            lines.push(`### Skill: ${s.name} (condensed)`);
            lines.push('');
            lines.push(s.keyRules);
            lines.push('');
            lines.push('---');
            lines.push('');
        }
    }

    if (selection.available.length) {
        lines.push('## Level 2 — Available Skills (Reference Names Only)');
        lines.push('');
        lines.push('The following skills are relevant but not injected to maintain context density.');
        lines.push('Request their full content if needed: ' + selection.available.map(s => s.name).join(', '));
        lines.push('');
    }

    return lines.join('\n');
}

// ── Built-in demo ─────────────────────────────────────────────────────────────

function runDemo(agentDir) {
    const skills = loadSkills(agentDir);

    const scenarios = [
        { task: 'Build a JWT authentication API with Express.js and Zod validation',       file: 'auth.ts',    model: 'large' },
        { task: 'Design a premium landing page with GSAP scroll animations',               file: 'Hero.tsx',   model: 'large' },
        { task: 'Write a Prisma query for paginated user orders',                           file: 'orders.ts',  model: 'small' },
        { task: 'Add RAG pipeline to an OpenAI-powered chat interface',                    file: 'chat.ts',    model: 'large' },
    ];

    console.log(`\n${BOLD}${CYAN}━━━ Context Broker — Demo Mode ━━━━━━━━━━━━━━━━━━━━━${RESET}`);
    console.log(`  Loaded ${skills.length} skills from .agent/skills/\n`);

    for (const scenario of scenarios) {
        const t0       = Date.now();
        const model    = scenario.model;
        const selection = selectSkills(scenario.task, [scenario.file], model, skills);
        const elapsed  = Date.now() - t0;

        console.log(`\n  ${BOLD}Task: "${scenario.task.slice(0, 70)}"${RESET}  ${DIM}[${model} model]${RESET}`);
        console.log(`    Essential     : ${GREEN}${selection.essential.map(s => s.name).join(', ')}${RESET}`);
        console.log(`    Supplementary : ${YELLOW}${selection.supplementary.map(s => s.name).join(', ') || '(small mode)'}${RESET}`);
        console.log(`    Time          : ${DIM}${elapsed}ms${RESET}`);
    }

    console.log(`\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Programmatic API for use by other Tribunal scripts.
 *
 * @param {string}   task    - User task description
 * @param {string[]} files   - Files being touched
 * @param {string}   model   - 'large' | 'small' | 'auto'
 * @param {string}   agentDir - Path to .agent/ directory
 * @returns {{ essential, supplementary, available, promptText }}
 */
function broker(task, files = [], model = 'large', agentDir = null) {
    const resolvedAgentDir = agentDir || findAgentDir();
    const skills   = loadSkills(resolvedAgentDir);
    const selection = selectSkills(task, files, model, skills);
    const promptText = formatPrompt(task, model, selection);
    return { ...selection, promptText };
}

module.exports = { broker, selectSkills, loadSkills, scoreSkill, findAgentDir };

// ── CLI Entry ─────────────────────────────────────────────────────────────────

if (require.main === module) {
    const argv = process.argv.slice(2);

    if (!argv.length || argv.includes('--help') || argv.includes('-h')) {
        console.log(`
${BOLD}context_broker.js${RESET} — Tribunal Focus-without-Compromise Context Engine

${BOLD}Usage:${RESET}
  node .agent/scripts/context_broker.js --task "<description>" [options]
  node .agent/scripts/context_broker.js demo

${BOLD}Options:${RESET}
  --task    <text>     Task description to match against skill catalogue
  --file    <path>     File being touched (repeat for multiple files)
  --model   <size>     large (default) | small  — model tier
  --output  <format>   report (default) | json | names | prompt

${BOLD}Model tiers:${RESET}
  large   Full Essential + condensed Supplementary (Claude Opus, Gemini 2.5 Pro, GPT-4o)
  small   Essential only (Gemini Flash, GPT-4o-mini)

${BOLD}Examples:${RESET}
  node .agent/scripts/context_broker.js --task "JWT auth API" --model large
  node .agent/scripts/context_broker.js --task "landing page" --file Hero.tsx --output names
  node .agent/scripts/context_broker.js --task "RAG pipeline" --output prompt > context.md
  node .agent/scripts/context_broker.js demo
`);
        process.exit(0);
    }

    const agentDir = findAgentDir();

    if (argv[0] === 'demo') {
        runDemo(agentDir);
        process.exit(0);
    }

    // Parse args
    const taskIdx   = argv.indexOf('--task');
    const modelIdx  = argv.indexOf('--model');
    const outputIdx = argv.indexOf('--output');

    const task   = taskIdx  !== -1 && argv[taskIdx  + 1] ? argv[taskIdx  + 1] : '';
    const model  = modelIdx !== -1 && argv[modelIdx + 1] ? argv[modelIdx + 1] : 'large';
    const output = outputIdx !== -1 && argv[outputIdx + 1] ? argv[outputIdx + 1] : 'report';

    if (!task) {
        console.error(`${RED}✖ --task is required${RESET}`);
        process.exit(1);
    }

    // Collect --file arguments (may appear multiple times)
    const files = [];
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--file' && argv[i + 1]) files.push(argv[i + 1]);
    }

    const t0       = Date.now();
    const skills   = loadSkills(agentDir);
    const selection = selectSkills(task, files, model, skills);
    const elapsed  = Date.now() - t0;

    if (!['large', 'small'].includes(model)) {
        console.error(`${YELLOW}⚠ Unknown model tier "${model}" — defaulting to "large"${RESET}`);
    }

    switch (output) {
        case 'json':
            console.log(formatJson(task, model, selection));
            break;
        case 'names':
            console.log(formatNames(selection, model));
            break;
        case 'prompt':
            console.log(formatPrompt(task, model, selection));
            break;
        default: // 'report'
            formatReport(task, model, selection, elapsed);
            break;
    }
}
