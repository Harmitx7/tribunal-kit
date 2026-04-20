/**
 * Shared utilities for Tribunal Kit scripts.
 * Import this module instead of duplicating helper functions.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { RED, RESET } = require('./_colors');

/**
 * Walk up the directory tree to find the nearest .agent/ folder.
 * @param {string} [startDir] - Directory to start searching from (defaults to cwd).
 * @returns {string} Absolute path to the .agent directory.
 */
function findAgentDir(startDir) {
    let current = path.resolve(startDir || process.cwd());
    const root = path.parse(current).root;

    while (current !== root) {
        const candidate = path.join(current, '.agent');
        if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
            return candidate;
        }
        current = path.dirname(current);
    }

    console.error(`${RED}✖ Error: '.agent' directory not found. Please run 'npx tribunal-kit init' first.${RESET}`);
    process.exit(1);
}

/**
 * Check if a package.json exists in the given directory.
 * @param {string} dir - Directory to check.
 * @returns {boolean}
 */
function hasNpm(dir) {
    return fs.existsSync(path.join(dir, 'package.json'));
}

module.exports = { findAgentDir, hasNpm };
