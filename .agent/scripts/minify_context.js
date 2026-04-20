#!/usr/bin/env node
/**
 * minify_context.js
 * Minifies markdown documentation in the .agent directory to save tokens.
 */

'use strict';

const fs = require('fs');
const path = require('path');

function minifyMarkdown(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalLen = content.length;

    // 1. Strip repetitive Output Format templates
    content = content.replace(/## Output Format\n\n```[\s\S]*?```\n/g, '');

    // 2. Convert bloated Cross-Workflow Navigation tables to dense YAML lists
    content = content.replace(/## Cross-Workflow Navigation\n\n\|.*?\|[\s\S]*?(?=\n## |\Z)/g, match => {
        const lines = match.trim().split('\n');
        const out = [];
        for (const line of lines) {
            if (line.startsWith('|') && !line.startsWith('|:') && !line.startsWith('| After')) {
                const parts = line.split('|').map(p => p.trim()).filter(Boolean);
                if (parts.length >= 2) {
                    out.push(`- ${parts[0]} -> ${parts[1]}`);
                }
            }
        }
        return '## Cross-Workflow Navigation\n' + out.join('\n') + '\n';
    });

    // 3. Collapse multiple empty lines into a single one
    content = content.replace(/\n{3,}/g, '\n\n');

    // 4. Remove padding from remaining tables to save space tokens
    content = content.replace(/^\|.+|$/gm, match => {
        let line = match;
        // remove spaces around |
        line = line.replace(/\s+\|\s+/g, '|');
        line = line.replace(/\|\s+/g, '|');
        line = line.replace(/\s+\|/g, '|');
        return line;
    });

    // 5. Remove conversational blockquotes > if they don't contain WARNING/NOTE/IMPORTANT
    content = content.replace(/^>.*$/gm, match => {
        if (match.includes('⚠️') || match.includes('WARNING') || match.includes('CRITICAL') || match.includes('!')) {
            return match;
        }
        return match.replace(/> /g, '').replace(/>/g, '');
    });

    // 6. Dense Examples (convert ❌ Bad: and ✅ Good: blocks to single lines)
    content = content.replace(/\n❌ Bad:/g, ' ❌');
    content = content.replace(/\n✅ Good:/g, ' ✅');

    fs.writeFileSync(filePath, content, 'utf8');
    return [originalLen, content.length];
}

function walkDir(dir, callback) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            walkDir(fullPath, callback);
        } else {
            callback(fullPath);
        }
    }
}

function main() {
    const agentDir = path.join('.agent');
    let totalOriginal = 0;
    let totalNew = 0;

    walkDir(agentDir, file => {
        if (file.endsWith('.md')) {
            const [orig, newLen] = minifyMarkdown(file);
            totalOriginal += orig;
            totalNew += newLen;
        }
    });

    const saved = totalOriginal - totalNew;
    const percent = totalOriginal > 0 ? (saved / totalOriginal * 100) : 0;
    
    console.log("Minification Complete.");
    console.log(`Original size: ${totalOriginal} bytes`);
    console.log(`New size: ${totalNew} bytes`);
    console.log(`Saved: ${saved} bytes (${percent.toFixed(1)}%)`);
}

if (require.main === module) {
    main();
}
