#!/usr/bin/env node
/**
 * strip_tribunal.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

function stripBoilerplate(filePath) {
    const original = fs.readFileSync(filePath, 'utf8');
    const originalLen = Buffer.byteLength(original, 'utf8');

    let content = original;
    content = content.replace(/## 🏛️ Tribunal Integration[\s\S]*?(?=\n# |\Z)/g, '');
    content = content.replace(/## Tribunal Integration[\s\S]*?(?=\n# |\Z)/g, '');
    content = content.replace(/## Cross-Workflow Navigation[\s\S]*?(?=\n# |\Z)/g, '');
    content = content.replace(/## What the Maker Is Not Allowed to Do[\s\S]*?(?=\n# |\Z)/g, '');

    fs.writeFileSync(filePath, content.trim() + '\n', 'utf8');
    const newLen = Buffer.byteLength(content.trim() + '\n', 'utf8');

    return [originalLen, newLen];
}

function main() {
    const dirsToCheck = ['.agent/agents', '.agent/workflows'];
    let totalStripped = 0;

    for (const d of dirsToCheck) {
        if (!fs.existsSync(d)) continue;
        const files = fs.readdirSync(d);
        for (const file of files) {
            if (file.endsWith('.md')) {
                const filePath = path.join(d, file);
                const [orig, newL] = stripBoilerplate(filePath);
                totalStripped += (orig - newL);
            }
        }
    }

    console.log(`Stripped ${totalStripped} bytes of repetitive boilerplate.`);
}

if (require.main === module) {
    main();
}
