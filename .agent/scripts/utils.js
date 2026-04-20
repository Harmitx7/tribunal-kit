/**
 * utils.js
 * Shared utilities for Tribunal Kit Node scripts.
 */
'use strict';

const path = require('path');
const fs = require('fs');

function findAgentDir() {
    let current = path.resolve(process.cwd());
    const root = path.parse(current).root;
    while (current !== root) {
        const candidate = path.join(current, '.agent');
        if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
            return candidate;
        }
        current = path.dirname(current);
    }
    console.error("\x1b[91m✖ Error: '.agent' directory not found. Please run 'npx tribunal-kit init' first.\x1b[0m");
    process.exit(1);
}

function ensureUtf8Stdout() {
    // In Node.js, process.stdout is typically already UTF-8 capable,
    // but this exists for compatibility with legacy python workflows.
}

module.exports = {
    findAgentDir,
    ensureUtf8Stdout
};
