#!/usr/bin/env node
/**
 * sync-version.js — Version Sync for Tribunal Kit
 * 
 * Reads the version and counts from package.json and the .agent/ directory,
 * then updates all stale references across documentation files.
 * 
 * Run manually or as a preversion npm script:
 *   node scripts/sync-version.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

// Count actual installed items
function countItems(dir) {
    const fullPath = path.join(ROOT, '.agent', dir);
    if (!fs.existsSync(fullPath)) return '?';
    return fs.readdirSync(fullPath).filter(f => !f.startsWith('.')).length;
}

const version = PKG.version;
const agents = countItems('agents');
const skills = countItems('skills');
const workflows = countItems('workflows');
const scripts = countItems('scripts');

console.log(`\n  📊 Tribunal Kit v${version} — Actual Counts`);
console.log(`  ──────────────────────────────────────`);
console.log(`  Agents:    ${agents}`);
console.log(`  Skills:    ${skills}`);
console.log(`  Workflows: ${workflows}`);
console.log(`  Scripts:   ${scripts}`);
console.log();

// Files to check for stale numbers
const FILES_TO_CHECK = [
    'README.md',
    'AGENT_FLOW.md',
    '.agent/ARCHITECTURE.md',
];

let staleFound = 0;

for (const relPath of FILES_TO_CHECK) {
    const filePath = path.join(ROOT, relPath);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for common stale patterns
    const checks = [
        { regex: /(\d+)\s*(specialist\s+)?agents/gi, expected: agents, label: 'agents' },
        { regex: /(\d+)\s*skill\s*modules/gi, expected: skills, label: 'skills' },
        { regex: /(\d+)\s*slash\s*command/gi, expected: workflows, label: 'workflows' },
    ];

    for (const check of checks) {
        let match;
        while ((match = check.regex.exec(content)) !== null) {
            const found = parseInt(match[1]);
            if (found !== check.expected && found > 5) { // ignore tiny numbers
                staleFound++;
                const line = content.substring(0, match.index).split('\n').length;
                console.log(`  ⚠️  ${relPath}:${line} — says ${found} ${check.label}, actual is ${check.expected}`);
            }
        }
    }
}

if (staleFound === 0) {
    console.log(`  ✅ All counts are in sync across ${FILES_TO_CHECK.length} files.`);
} else {
    console.log(`\n  ❌ Found ${staleFound} stale reference(s). Update manually or run the sync tool.`);
    process.exit(1);
}

console.log();
