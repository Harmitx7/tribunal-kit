#!/usr/bin/env node
/**
 * patch_skills_output.js — Adds structured Output Format sections to SKILL.md files.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { RED, GREEN, YELLOW, BLUE, BOLD, RESET } = require('./colors.js');

const CODE_QUALITY_TEMPLATE = `\\
## Output Format

When this skill produces or reviews code, structure your output as follows:

\`\`\`
━━━ {skill_name} Report ━━━━━━━━━━━━━━━━━━━━━━━━
Skill:       {skill_name}
Language:    [detected language / framework]
Scope:       [N files · N functions]
─────────────────────────────────────────────────
✅ Passed:   [checks that passed, or "All clean"]
⚠️  Warnings: [non-blocking issues, or "None"]
❌ Blocked:  [blocking issues requiring fix, or "None"]
─────────────────────────────────────────────────
VBC status:  PENDING → VERIFIED
Evidence:    [test output / lint pass / compile success]
\`\`\`

**VBC (Verification-Before-Completion) is mandatory.**
Do not mark status as VERIFIED until concrete terminal evidence is provided.

`;

const DECISION_CARD_TEMPLATE = `\\
## Output Format

When this skill produces a recommendation or design decision, structure your output as:

\`\`\`
━━━ {skill_name} Recommendation ━━━━━━━━━━━━━━━━
Decision:    [what was chosen / proposed]
Rationale:   [why — one concise line]
Trade-offs:  [what is consciously accepted]
Next action: [concrete next step for the user]
─────────────────────────────────────────────────
Pre-Flight:  ✅ All checks passed
             or ❌ [blocking item that must be resolved first]
\`\`\`

`;

const GENERIC_TEMPLATE = `\\
## Output Format

When this skill completes a task, structure your output as:

\`\`\`
━━━ {skill_name} Output ━━━━━━━━━━━━━━━━━━━━━━━━
Task:        [what was performed]
Result:      [outcome summary — one line]
─────────────────────────────────────────────────
Checks:      ✅ [N passed] · ⚠️  [N warnings] · ❌ [N blocked]
VBC status:  PENDING → VERIFIED
Evidence:    [link to terminal output, test result, or file diff]
\`\`\`

`;

const CODE_GEN_SKILLS = new Set([
    "python-pro", "clean-code", "dotnet-core-expert", "rust-pro",
    "nextjs-react-expert", "vue-expert", "react-specialist",
    "csharp-developer", "nodejs-best-practices", "python-patterns",
    "tailwind-patterns", "bash-linux", "powershell-windows",
    "llm-engineering", "mcp-builder", "game-development",
    "edge-computing", "local-first", "realtime-patterns",
    "tdd-workflow", "testing-patterns", "lint-and-validate",
]);

const DECISION_SKILLS = new Set([
    "api-patterns", "database-design", "architecture", "observability",
    "devops-engineer", "platform-engineer", "deployment-procedures",
    "server-management", "security-auditor", "vulnerability-scanner",
    "red-team-tactics", "performance-profiling", "i18n-localization",
    "geo-fundamentals", "seo-fundamentals", "sql-pro",
    "brainstorming", "plan-writing", "behavioral-modes",
    "app-builder", "intelligent-routing", "mobile-design",
    "frontend-design", "ui-ux-pro-max", "ui-ux-researcher",
    "web-design-guidelines", "trend-researcher",
]);

const ALREADY_HAVE_OUTPUT = new Set([
    "whimsy-injector", "workflow-optimizer",
]);

const EXISTING_OUTPUT_MARKERS = [
    "## Output Format",
    "## Output\n",
    "## Report Format",
    "## Output Card",
    "Whimsy Injection Report",
    "Workflow Optimization Report",
];

function getTemplate(skillName) {
    if (CODE_GEN_SKILLS.has(skillName)) return CODE_QUALITY_TEMPLATE;
    if (DECISION_SKILLS.has(skillName)) return DECISION_CARD_TEMPLATE;
    return GENERIC_TEMPLATE;
}

function hasOutputSection(content) {
    return EXISTING_OUTPUT_MARKERS.some(m => content.includes(m));
}

function getSkillNameFromFrontmatter(content) {
    const match = content.match(/^name:\s*(.+)$/m);
    return match ? match[1].trim() : null;
}

function buildBlock(template, skillName) {
    const display = skillName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    // Handle the slash escaping issue using regular replace
    const tplStr = template.replace(/^\\/, '');
    return tplStr.replace(/{skill_name}/g, display);
}

function injectOutputBlock(content, block) {
    const tribunalMarkers = [
        "## 🏛️ Tribunal Integration",
        "## Tribunal Integration",
    ];
    for (const marker of tribunalMarkers) {
        const idx = content.indexOf(marker);
        if (idx !== -1) {
            return content.substring(0, idx) + block + "\n---\n\n" + content.substring(idx);
        }
    }
    return content.trimEnd() + "\n\n---\n\n" + block;
}

function header(title) { console.log(`\n${BOLD}${BLUE}━━━ ${title} ━━━${RESET}`); }
function ok(msg) { console.log(`  ${GREEN}✅ ${msg}${RESET}`); }
function skip(msg) { console.log(`  ${YELLOW}⏭️  ${msg}${RESET}`); }
function warn(msg) { console.log(`  ${YELLOW}⚠️  ${msg}${RESET}`); }
function fail(msg) { console.log(`  ${RED}❌ ${msg}${RESET}`); }

function processSkill(skillDir, dryRun) {
    const skillName = path.basename(skillDir);
    const skillMd = path.join(skillDir, "SKILL.md");

    if (!fs.existsSync(skillMd)) return "skipped";

    try {
        const content = fs.readFileSync(skillMd, 'utf8');

        if (ALREADY_HAVE_OUTPUT.has(skillName) || hasOutputSection(content)) {
            skip(`${skillName} — output format already present`);
            return "skipped";
        }

        const displayName = getSkillNameFromFrontmatter(content) || skillName;
        const template = getTemplate(skillName);
        const block = buildBlock(template, displayName);
        const patched = injectOutputBlock(content, block);

        const templateType = CODE_GEN_SKILLS.has(skillName) ? "Code Quality" : (DECISION_SKILLS.has(skillName) ? "Decision Card" : "Generic");

        if (dryRun) {
            warn(`[DRY RUN] ${skillName} — would add Output Format (${templateType})`);
            return "updated";
        }

        fs.writeFileSync(skillMd, patched, 'utf8');
        ok(`${skillName} — added Output Format (${templateType})`);
        return "updated";
    } catch (e) {
        fail(`${skillName} — ${e.message}`);
        return "error";
    }
}

function main() {
    const args = process.argv.slice(2);
    let targetPath = null;
    let dryRun = false;
    let skillArg = null;

    let i = 0;
    while (i < args.length) {
        if (args[i] === '--dry-run') dryRun = true;
        else if (args[i] === '--skill' && i + 1 < args.length) skillArg = args[++i];
        else if (args[i] === '-h' || args[i] === '--help') {
            console.log("Usage: node patch_skills_output.js <path> [--dry-run] [--skill <name>]");
            process.exit(0);
        } else if (!args[i].startsWith('-') && !targetPath) {
            targetPath = args[i];
        }
        i++;
    }

    if (!targetPath) {
        console.log("Usage: node patch_skills_output.js <path> [--dry-run] [--skill <name>]");
        process.exit(1);
    }

    const projectRoot = path.resolve(targetPath);
    const skillsDir = path.join(projectRoot, ".agent", "skills");

    if (!fs.existsSync(skillsDir) || !fs.statSync(skillsDir).isDirectory()) {
        fail(`Skills directory not found: ${skillsDir}`);
        process.exit(1);
    }

    console.log(`${BOLD}Tribunal — patch_skills_output.js${RESET}`);
    if (dryRun) console.log(`  ${YELLOW}DRY RUN — no files will be written${RESET}`);
    console.log(`Skills dir: ${skillsDir}\n`);

    const counts = { updated: 0, skipped: 0, error: 0 };
    header("Patching Output Format Sections");

    const dirs = fs.readdirSync(skillsDir, { withFileTypes: true });
    dirs.sort((a, b) => a.name.localeCompare(b.name));

    for (const dir of dirs) {
        if (!dir.isDirectory()) continue;
        if (skillArg && dir.name !== skillArg) continue;
        const result = processSkill(path.join(skillsDir, dir.name), dryRun);
        counts[result]++;
    }

    console.log(`\n${BOLD}━━━ Summary ━━━${RESET}`);
    console.log(`  ${GREEN}✅ Updated:  ${counts.updated}${RESET}`);
    console.log(`  ${YELLOW}⏭️  Skipped:  ${counts.skipped}${RESET}`);
    if (counts.error > 0) console.log(`  ${RED}❌ Errors:   ${counts.error}${RESET}`);
    if (dryRun) console.log(`  ${YELLOW}(dry-run — nothing written)${RESET}`);

    process.exit(counts.error > 0 ? 1 : 0);
}

if (require.main === module) {
    main();
}
