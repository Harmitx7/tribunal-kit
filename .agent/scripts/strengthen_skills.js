#!/usr/bin/env node
/**
 * strengthen_skills.js — Appends Tribunal guardrails to SKILL.md files missing them.
 *
 * Usage:
 *   node .agent/scripts/strengthen_skills.js .
 *   node .agent/scripts/strengthen_skills.js . --dry-run
 *   node .agent/scripts/strengthen_skills.js . --skill python-pro
 *   node .agent/scripts/strengthen_skills.js . --skills-path /custom/skills/dir
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { RED, GREEN, YELLOW, BLUE, BOLD, RESET } = require('./colors.js');

const GUARDRAILS_BLOCK = `

---

## 🤖 LLM-Specific Traps

AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always \`// VERIFY\` or check \`package.json\` / \`requirements.txt\`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: \`/review\` or \`/tribunal-full\`**
**Active reviewers: \`logic-reviewer\` · \`security-auditor\`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with \`// VERIFY: [reason]\`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit

Review these questions before confirming output:
\`\`\`
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
\`\`\`

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
`;

const TRIBUNAL_MARKERS = [
    "Tribunal Integration",
    "Tribunal Integration (Anti-Hallucination)",
];

const VBC_MARKERS = [
    "Verification-Before-Completion",
    "VBC Protocol",
];

function hasTribunalBlock(content) {
    return TRIBUNAL_MARKERS.some(m => content.includes(m));
}

function hasVbcBlock(content) {
    return VBC_MARKERS.some(m => content.includes(m));
}

function header(title) { console.log(`\n${BOLD}${BLUE}━━━ ${title} ━━━${RESET}`); }
function ok(msg) { console.log(`  ${GREEN}✅ ${msg}${RESET}`); }
function skip(msg) { console.log(`  ${YELLOW}⏭️  ${msg}${RESET}`); }
function warn(msg) { console.log(`  ${YELLOW}⚠️  ${msg}${RESET}`); }
function fail(msg) { console.log(`  ${RED}❌ ${msg}${RESET}`); }

function processSkill(skillMd, dryRun) {
    const skillName = path.basename(path.dirname(skillMd));
    try {
        const content = fs.readFileSync(skillMd, 'utf8');
        const hasTribunal = hasTribunalBlock(content);
        const hasVbc = hasVbcBlock(content);

        if (hasTribunal && hasVbc) {
            skip(`${skillName} — already has Tribunal + VBC blocks`);
            return "skipped";
        }

        const missing = [];
        if (!hasTribunal) missing.push("Tribunal Integration");
        if (!hasVbc) missing.push("VBC Protocol");

        if (dryRun) {
            warn(`[DRY RUN] ${skillName} — would add: ${missing.join(', ')}`);
            return "updated";
        }

        fs.appendFileSync(skillMd, GUARDRAILS_BLOCK, 'utf8');
        ok(`${skillName} — strengthened (${missing.join(', ')} added)`);
        return "updated";
    } catch (e) {
        fail(`${skillName} — ${e.message}`);
        return "error";
    }
}

function main() {
    const args = process.argv.slice(2);
    let targetPath = ".";
    let dryRun = false;
    let skillArg = null;
    let skillsPathArg = null;

    let i = 0;
    while (i < args.length) {
        if (args[i] === '--dry-run') {
            dryRun = true;
        } else if (args[i] === '--skill' && i + 1 < args.length) {
            skillArg = args[++i];
        } else if (args[i] === '--skills-path' && i + 1 < args.length) {
            skillsPathArg = args[++i];
        } else if (args[i] === '-h' || args[i] === '--help') {
            console.log("Usage: node strengthen_skills.js <path> [--dry-run] [--skill <name>] [--skills-path <path>]");
            process.exit(0);
        } else if (!args[i].startsWith('-')) {
            targetPath = args[i];
        }
        i++;
    }

    const projectRoot = path.resolve(targetPath);
    let skillsDir;
    if (skillsPathArg) {
        skillsDir = path.resolve(skillsPathArg);
    } else {
        skillsDir = path.join(projectRoot, ".agent", "skills");
    }

    if (!fs.existsSync(skillsDir) || !fs.statSync(skillsDir).isDirectory()) {
        fail(`Skills directory not found: ${skillsDir}`);
        process.exit(1);
    }

    console.log(`${BOLD}Tribunal — strengthen_skills.js${RESET}`);
    if (dryRun) console.log(`  ${YELLOW}DRY RUN — no files will be written${RESET}`);
    console.log(`Skills dir: ${skillsDir}\n`);

    const counts = { updated: 0, skipped: 0, error: 0 };
    header("Strengthening Skills");

    const dirs = fs.readdirSync(skillsDir, { withFileTypes: true });
    dirs.sort((a, b) => a.name.localeCompare(b.name));

    for (const dir of dirs) {
        if (!dir.isDirectory()) continue;
        if (skillArg && dir.name !== skillArg) continue;

        const skillMd = path.join(skillsDir, dir.name, "SKILL.md");
        if (!fs.existsSync(skillMd)) {
            warn(`${dir.name} — no SKILL.md found`);
            continue;
        }

        const result = processSkill(skillMd, dryRun);
        counts[result]++;
    }

    console.log(`\n${BOLD}━━━ Summary ━━━${RESET}`);
    console.log(`  ${GREEN}✅ Strengthened: ${counts.updated}${RESET}`);
    console.log(`  ${YELLOW}⏭️  Skipped:      ${counts.skipped}${RESET}`);
    if (counts.error > 0) {
        console.log(`  ${RED}❌ Errors:       ${counts.error}${RESET}`);
    }
    if (dryRun) {
        console.log(`  ${YELLOW}(dry-run — nothing written)${RESET}`);
    }

    process.exit(counts.error > 0 ? 1 : 0);
}

if (require.main === module) {
    main();
}
