#!/usr/bin/env node
// compress_skills.js - Aggressive token reduction for .agent/skills/**/*.md files

'use strict';

const fs = require('fs');
const path = require('path');

const SECTION_PATTERNS = [
    /^## 🏛️ Tribunal Integration[\s\S]*?(?=\n## |\n# |$)/gm,
    /^## Tribunal Integration[\s\S]*?(?=\n## |\n# |$)/gm,
    /^### ✅ Pre-Flight Self-Audit[\s\S]*?(?=\n## |\n### |\n# |$)/gm,
    /^## Pre-Flight Self-Audit[\s\S]*?(?=\n## |\n# |$)/gm,
    /^## Cross-Workflow Navigation[\s\S]*?(?=\n## |\n# |$)/gm,
    /^## Output Format\s*\n```[\s\S]*?```\s*\n/gm,
    /^## VBC Protocol[\s\S]*?(?=\n## |\n# |$)/gm,
    /^## LLM Traps[\s\S]*?(?=\n## |\n# |$)/gm,
];

const CHATTY_INTRO = /(^# .+\n)\n[A-Z][^#\n]{60,}\n[A-Z][^#\n]{40,}\n\n---/gm;

function stripChattyIntro(content) {
    return content.replace(CHATTY_INTRO, '$1\n---');
}

const OBVIOUS_COMMENT = /^(\s*)(\/\/ (default for most properties|shorthand|number of repeats|default: \d+|spring tension|resistance|weight|approximate duration|deceleration rate)[^\n]*)\n/gm;

function stripObviousComments(content) {
    return content.replace(OBVIOUS_COMMENT, '');
}

const PERF_TEXT_BLOCK = /^```\n(✅ Use \w[^\n]*\n   → [^\n]*\n\n?){3,}```\n/gm;

function compressPerfBlocks(content) {
    return content.replace(PERF_TEXT_BLOCK, (match) => {
        const lines = match.replace(/`|\n$/g, '').split('\n');
        const bullets = [];
        for (const line of lines) {
            const stripped = line.trim();
            if (stripped.startsWith('✅') || stripped.startsWith('❌')) {
                bullets.push(`- ${stripped}`);
            } else if (stripped.startsWith('→')) {
                bullets[bullets.length - 1] += ` (${stripped.substring(1).trim()})`;
            }
        }
        return bullets.join('\n') + '\n';
    });
}

function collapseBlanks(content) {
    return content.replace(/\n{3,}/g, '\n\n');
}

const FILLER_BEFORE_SECTION = /(^# .+\n\n)([A-Z][^\n]+\n){1,4}(\n---\n)/gm;

function removeFillerBetweenTitleAndHr(content) {
    return content.replace(FILLER_BEFORE_SECTION, '$1$3');
}

const REDUNDANT_NOTE = /^\/\/ (motion\.\w+|Any HTML|Note:|Variant names propagate|\/\/ )[^\n]*\n/gm;

function stripRedundantNotes(content) {
    return content.replace(REDUNDANT_NOTE, '');
}

function compressFile(filePath) {
    const original = fs.readFileSync(filePath, 'utf8');
    let content = original;

    for (const pattern of SECTION_PATTERNS) {
        content = content.replace(pattern, '');
    }

    content = stripChattyIntro(content);
    content = removeFillerBetweenTitleAndHr(content);
    content = stripObviousComments(content);
    content = stripRedundantNotes(content);
    content = compressPerfBlocks(content);
    content = collapseBlanks(content);

    const originalLen = Buffer.byteLength(original, 'utf8');
    const newLen = Buffer.byteLength(content.trim() + '\n', 'utf8');

    fs.writeFileSync(filePath, content.trim() + '\n', 'utf8');
    return [originalLen, newLen, originalLen - newLen];
}

function main() {
    const base = '.agent/skills';
    if (!fs.existsSync(base)) {
        console.error(`ERROR: '${base}' not found. Run from tribunal-kit root.`);
        process.exit(1);
    }

    let totalOrig = 0;
    let totalNew = 0;
    const results = [];

    function walkDir(dir) {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
            const fpath = path.join(dir, item.name);
            if (item.isDirectory()) {
                walkDir(fpath);
            } else if (item.name.endsWith('.md')) {
                const [orig, newL, saved] = compressFile(fpath);
                totalOrig += orig;
                totalNew += newL;
                if (saved > 0) {
                    results.push([saved, fpath]);
                }
            }
        }
    }

    walkDir(base);
    results.sort((a, b) => b[0] - a[0]);

    console.log(`\n${'='.repeat(55)}`);
    console.log(`  Skill Compression Complete`);
    console.log(`${'='.repeat(55)}`);
    console.log(`  Original : ${totalOrig} bytes (${Math.floor(totalOrig / 1024)}KB)`);
    console.log(`  After    : ${totalNew} bytes (${Math.floor(totalNew / 1024)}KB)`);
    
    const savedTotal = totalOrig - totalNew;
    const pct = totalOrig ? (savedTotal / totalOrig * 100) : 0;
    console.log(`  Saved    : ${savedTotal} bytes (${Math.floor(savedTotal / 1024)}KB) — ${pct.toFixed(1)}%`);
    console.log(`\n  Top savings:`);
    
    for (const [saved, filePath] of results.slice(0, 15)) {
        const parts = filePath.split(path.sep);
        const skill = parts[parts.length - 2];
        const fname = parts[parts.length - 1];
        console.log(`    -${Math.floor(saved / 1024).toString().padStart(2, ' ')}KB  ${skill}/${fname}`);
    }
    console.log();
}

if (require.main === module) {
    main();
}
