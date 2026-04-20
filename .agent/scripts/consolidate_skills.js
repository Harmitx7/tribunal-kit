#!/usr/bin/env node
/**
 * consolidate_skills.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BASE = '.agent/skills';

const STRIP_PATTERNS = [
    /^## 🏛️ Tribunal Integration.*?(?=\n## |$)/gms,
    /^## Tribunal Integration.*?(?=\n## |$)/gms,
    /^### ✅ Pre-Flight Self-Audit.*?(?=\n###|\n## |$)/gms,
    /^## Pre-Flight Self-Audit.*?(?=\n## |$)/gms,
    /^## Output Format\b.*?(?=\n## |$)/gms,
    /^## 🔧 Runtime Scripts.*?(?=\n## |$)/gms,
    /^## 🔴 MANDATORY.*?(?=\n## |$)/gms,
    /^## ⚠️ CRITICAL: ASK BEFORE ASSUMING.*?(?=\n## |$)/gms,
    /^## 📝 CHECKPOINT \(MANDATORY.*?(?=\n## |$)/gms,
    /^## Output Format.*?```\n[^`]*```\n?(?=\n## |$)/gms,
    /^\*\*Execute these for validation.*?---\n/gms,
    /^\*\*VBC \(Verification-Before-Completion\).*?\n/gms,
    /^\*\*⛔ DO NOT start.*?---\n?/gms,
    /^> 🧠 \*\*mobile-design.*?\n/gms,
    /^> \*\*STOP.*?\n/gms,
];

function adjustHeadings(content, offset = 1) {
    const lines = content.split('\n');
    const out = [];
    for (let line of lines) {
        const m = line.match(/^(#{1,5}) /);
        if (m) {
            const level = m[1].length;
            const newLevel = Math.min(level + offset, 6);
            line = '#'.repeat(newLevel) + line.substring(level);
        }
        out.push(line);
    }
    return out.join('\n');
}

function cleanContent(content) {
    for (const p of STRIP_PATTERNS) {
        content = content.replace(p, '');
    }
    content = content.replace(/\n{3,}/g, '\n\n');
    return content.trim();
}

function extractFrontmatter(content) {
    const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    if (m) {
        return [m[1], content.substring(m[0].length)];
    }
    return ['', content];
}

function consolidate(skillDir) {
    const skillName = path.basename(skillDir);
    const mainPath = path.join(skillDir, 'SKILL.md');
    if (!fs.existsSync(mainPath)) return false;

    const files = fs.readdirSync(skillDir);
    const subFiles = files.filter(f => f.endsWith('.md') && f !== 'SKILL.md').sort();

    if (subFiles.length === 0) return false;

    console.log(`\n  → Consolidating: ${skillName} (${subFiles.length} sub-files)`);

    const mainContent = fs.readFileSync(mainPath, 'utf8');
    let [frontmatter, mainBody] = extractFrontmatter(mainContent);

    const fmLines = frontmatter.split('\n');
    const newFm = [];
    for (const line of fmLines) {
        if (line.startsWith('version:')) newFm.push('version: 3.1.0');
        else if (line.startsWith('last-updated:')) newFm.push('last-updated: 2026-04-06');
        else newFm.push(line);
    }
    frontmatter = newFm.join('\n');

    mainBody = cleanContent(mainBody);
    mainBody = mainBody.replace(/\|.*?\.md.*?\|.*?\|.*?\|\n/g, '');
    mainBody = mainBody.replace(/^\|[-| ]+\|\n/gm, '');
    mainBody = mainBody.replace(/\n{3,}/g, '\n\n');

    const mergedSections = [];
    for (const fname of subFiles) {
        const fpath = path.join(skillDir, fname);
        const raw = fs.readFileSync(fpath, 'utf8');
        let [, body] = extractFrontmatter(raw);
        body = cleanContent(body);
        body = adjustHeadings(body, 1);
        if (body.trim()) {
            mergedSections.push(body.trim());
        }
    }

    let combined = `---\n${frontmatter}\n---\n\n${mainBody}`;
    if (mergedSections.length > 0) {
        combined += '\n\n---\n\n' + mergedSections.join('\n\n---\n\n');
    }

    combined = combined.replace(/\n{3,}/g, '\n\n');
    combined = combined.trim() + '\n';

    let totalSubBytes = 0;
    for (const f of subFiles) totalSubBytes += fs.statSync(path.join(skillDir, f)).size;
    console.log(`     Sub-files total: ${Math.floor(totalSubBytes / 1024)}KB`);

    fs.writeFileSync(mainPath, combined, 'utf8');
    const newSize = fs.statSync(mainPath).size;
    console.log(`     New SKILL.md:    ${Math.floor(newSize / 1024)}KB  (from ${Math.floor(Buffer.byteLength(mainContent, 'utf8') / 1024)}KB main + ${Math.floor(totalSubBytes / 1024)}KB subs → ${Math.floor(newSize / 1024)}KB)`);

    for (const fname of subFiles) {
        fs.unlinkSync(path.join(skillDir, fname));
        console.log(`     Deleted: ${fname}`);
    }

    return true;
}

function main() {
    const target = process.argv.length > 2 ? process.argv[2] : null;

    let processed = 0;
    if (!fs.existsSync(BASE)) return;

    for (const skillName of fs.readdirSync(BASE)) {
        const skillDir = path.join(BASE, skillName);
        if (!fs.statSync(skillDir).isDirectory()) continue;
        if (target && skillName !== target) continue;
        if (consolidate(skillDir)) processed++;
    }

    if (processed === 0) {
        console.log('No skills with sub-files found (or target not matched).');
    } else {
        console.log(`\n✅ Consolidated ${processed} skills.`);
    }
}

if (require.main === module) {
    main();
}
