#!/usr/bin/env node
/**
 * patch_skills_meta.js — Injects version/freshness metadata into SKILL.md frontmatter.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { RED, GREEN, YELLOW, BLUE, BOLD, RESET } = require('./colors.js');

const META_FIELDS = {
    "version": "1.0.0",
    "last-updated": "2026-03-12",
    "applies-to-model": "gemini-2.5-pro, claude-3-7-sonnet"
};

function header(title) { console.log(`\n${BOLD}${BLUE}━━━ ${title} ━━━${RESET}`); }
function ok(msg) { console.log(`  ${GREEN}✅ ${msg}${RESET}`); }
function skip(msg) { console.log(`  ${YELLOW}⏭️  ${msg}${RESET}`); }
function warn(msg) { console.log(`  ${YELLOW}⚠️  ${msg}${RESET}`); }
function fail(msg) { console.log(`  ${RED}❌ ${msg}${RESET}`); }

function patchFrontmatter(content) {
    const added = [];
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);

    if (!fmMatch) {
        const newFmLines = ["---"];
        for (const [key, value] of Object.entries(META_FIELDS)) {
            newFmLines.push(`${key}: ${value}`);
            added.push(key);
        }
        newFmLines.push("---");
        return [newFmLines.join("\n") + "\n\n" + content, added];
    }

    const fmText = fmMatch[1];
    const fmEnd = fmMatch[0].length;
    
    const existingKeys = new Set();
    const lines = fmText.split("\n");
    for (const line of lines) {
        const m = line.match(/^([a-zA-Z0-9_-]+)\s*:/);
        if (m) existingKeys.add(m[1]);
    }

    const newFmLines = fmText.trimEnd().split("\n");
    for (const [key, value] of Object.entries(META_FIELDS)) {
        if (!existingKeys.has(key)) {
            newFmLines.push(`${key}: ${value}`);
            added.push(key);
        }
    }

    if (added.length === 0) return [content, []];

    const patched = "---\n" + newFmLines.join("\n") + "\n---" + content.slice(fmEnd);
    return [patched, added];
}

function processSkill(skillPath, dryRun) {
    const skillName = path.basename(path.dirname(skillPath));
    try {
        const content = fs.readFileSync(skillPath, 'utf8');
        const [patched, added] = patchFrontmatter(content);

        if (added.length === 0) {
            skip(`${skillName} — all meta fields present`);
            return "skipped";
        }

        const fieldList = added.join(', ');
        if (dryRun) {
            warn(`[DRY RUN] ${skillName} — would add: ${fieldList}`);
            return "updated";
        }

        fs.writeFileSync(skillPath, patched, 'utf8');
        ok(`${skillName} — added: ${fieldList}`);
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
            console.log("Usage: node patch_skills_meta.js <path> [--dry-run] [--skill <name>]");
            process.exit(0);
        } else if (!args[i].startsWith('-') && !targetPath) {
            targetPath = args[i];
        }
        i++;
    }

    if (!targetPath) {
        console.log("Usage: node patch_skills_meta.js <path> [--dry-run] [--skill <name>]");
        process.exit(1);
    }

    const projectRoot = path.resolve(targetPath);
    const skillsDir = path.join(projectRoot, ".agent", "skills");

    if (!fs.existsSync(skillsDir) || !fs.statSync(skillsDir).isDirectory()) {
        fail(`Skills directory not found: ${skillsDir}`);
        process.exit(1);
    }

    console.log(`${BOLD}Tribunal — patch_skills_meta.js${RESET}`);
    if (dryRun) console.log(`  ${YELLOW}DRY RUN — no files will be written${RESET}`);
    console.log(`Skills dir: ${skillsDir}\n`);

    const counts = { updated: 0, skipped: 0, error: 0 };
    header("Patching Frontmatter");

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
    console.log(`  ${GREEN}✅ Updated:  ${counts.updated}${RESET}`);
    console.log(`  ${YELLOW}⏭️  Skipped:  ${counts.skipped}${RESET}`);
    if (counts.error > 0) console.log(`  ${RED}❌ Errors:   ${counts.error}${RESET}`);
    if (dryRun) console.log(`  ${YELLOW}(dry-run — nothing written)${RESET}`);

    process.exit(counts.error > 0 ? 1 : 0);
}

if (require.main === module) {
    main();
}
