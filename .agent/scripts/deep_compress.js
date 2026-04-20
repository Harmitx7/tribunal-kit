#!/usr/bin/env node
/**
 * deep_compress.js - Deep surgical compression for .agent/ markdown files (skills, agents, workflows).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BASE_DIRS = ['.agent/skills', '.agent/agents', '.agent/workflows'];

const REMOVE_SECTIONS = [
    /^## 🏛️ Tribunal Integration[\s\S]*?(?=\n## |$)/gm,
    /^## Tribunal Integration[\s\S]*?(?=\n## |$)/gm,
    /^### ✅ Pre-Flight Self-Audit[\s\S]*?(?=\n### |\n## |$)/gm,
    /^## Pre-Flight Self-Audit[\s\S]*?(?=\n## |$)/gm,
    /^## Cross-Workflow Navigation[\s\S]*?(?=\n## |$)/gm,
    /^## LLM Traps[\s\S]*?(?=\n## |$)/gm,
    /^## VBC Protocol[\s\S]*?(?=\n## |$)/gm,
    /^## Output Format\n```[\s\S]*?```\n/gm,
    /^## 🤖 LLM-Specific Traps[\s\S]*?(?=\n## |$)/gm,
];

const VERBOSE_COMMENT_PATTERNS = [
    /^(\s*)\/\/\s*(?:Any HTML or SVG element|motion\.div, motion\.span|The MAGIC of|This is the key performance|The pattern that|Compound components share|Note that children|The action receives|Children inherit the|Import first|Parent controls when|It's always motion)\b[^\n]*\n/gm,
    /^(\s*)#\s*(?:TypedDict gives you|Usage:|Note:|Return user|Return None|Automatically)\b[^\n]*\n/gm,
    /^\s*\/\/\s*Usage:\s*\n(?=\s*[<{])/gm,
    /^\s*#\s*Usage:\s*\n(?=\s*[{])/gm,
    /^\s*\/\/\s*When (?:server responds|a component|React can interrupt|the React Compiler)[^\n]*\n/gm,
];

function stripChattyOpeners(content) {
    return content.replace(/(^# .+\n)\n.{60,}\n.{30,}\n(?:\n---)/gm, '$1\n---');
}

function compressLegacyModernBlocks(content) {
    const pattern = /```(\w+)\n((?:.*\n)*?.*(?:\/\/|#) ❌ LEGACY[^\n]*\n(?:.*\n)*?)```\n\n```\w+\n((?:.*\n)*?.*(?:\/\/|#) ✅ MODERN[^\n]*\n(?:.*\n)*?)```/gm;
    return content.replace(pattern, (match, lang, legacy, modern) => {
        const totalLines = (legacy.match(/\n/g) || []).length + (modern.match(/\n/g) || []).length;
        if (totalLines > 28) return match;
        return `\`\`\`${lang}\n// ❌ LEGACY\n${legacy.trim()}\n\n// ✅ MODERN\n${modern.trim()}\n\`\`\``;
    });
}

function stripEmptyComments(content) {
    content = content.replace(/^\s*\/\/\s*$\n/gm, '');
    content = content.replace(/^\s*#\s*$\n/gm, '');
    return content;
}

function dedupBulletPoints(content) {
    const lines = content.split('\n');
    const seenBullets = {};
    const output = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const stripped = line.trim();
        if (/^(✅|❌|- ✅|- ❌)/.test(stripped)) {
            if (seenBullets[stripped] !== undefined && (i - seenBullets[stripped]) < 80) {
                continue;
            }
            seenBullets[stripped] = i;
        }
        output.push(line);
    }
    return output.join('\n');
}

function collapseBlanks(content) {
    return content.replace(/\n{3,}/g, '\n\n');
}

function compressFile(filePath) {
    const original = fs.readFileSync(filePath, 'utf8');
    let content = original;

    for (const pattern of REMOVE_SECTIONS) {
        content = content.replace(pattern, '');
    }

    content = stripChattyOpeners(content);
    content = compressLegacyModernBlocks(content);

    for (const pattern of VERBOSE_COMMENT_PATTERNS) {
        content = content.replace(pattern, '');
    }

    content = stripEmptyComments(content);
    content = dedupBulletPoints(content);
    content = collapseBlanks(content);

    if (content.trim() !== original.trim()) {
        fs.writeFileSync(filePath, content.trim() + '\n', 'utf8');
    }

    return [Buffer.byteLength(original, 'utf8'), Buffer.byteLength(content, 'utf8')];
}

function main() {
    let totalOrig = 0;
    let totalNew = 0;
    const fileResults = [];

    function walkDir(dir) {
        let items;
        try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
        for (const item of items) {
            const fpath = path.join(dir, item.name);
            if (item.isDirectory()) walkDir(fpath);
            else if (item.name.endsWith('.md')) {
                const [orig, newL] = compressFile(fpath);
                totalOrig += orig;
                totalNew += newL;
                const saved = orig - newL;
                if (saved > 200) {
                    fileResults.push([saved, fpath]);
                }
            }
        }
    }

    for (const base of BASE_DIRS) {
        if (fs.existsSync(base)) walkDir(base);
    }

    fileResults.sort((a, b) => b[0] - a[0]);

    const savedTotal = totalOrig - totalNew;
    const pct = totalOrig ? (savedTotal / totalOrig * 100) : 0;

    console.log(`\n${'='.repeat(58)}`);
    console.log(`  Deep Compression Complete`);
    console.log(`${'='.repeat(58)}`);
    console.log(`  Original : ${totalOrig} bytes (${Math.floor(totalOrig / 1024)}KB)`);
    console.log(`  After    : ${totalNew} bytes (${Math.floor(totalNew / 1024)}KB)`);
    console.log(`  Saved    : ${savedTotal} bytes (${Math.floor(savedTotal / 1024)}KB) — ${pct.toFixed(1)}%`);
    console.log(`\n  Top savings:`);
    
    for (const [saved, filePath] of fileResults.slice(0, 20)) {
        const parts = filePath.split(path.sep);
        const skill = parts.length >= 2 ? `${parts[parts.length - 2]}/${parts[parts.length - 1]}` : filePath;
        console.log(`    -${Math.floor(saved / 1024).toString().padStart(2, ' ')}KB  ${skill}`);
    }
    console.log();
}

if (require.main === module) {
    main();
}
