#!/usr/bin/env node
/**
 * clean-pycache.js — Removes Python bytecode and __pycache__ directories.
 * Ensures clean npm tarballs without platform-specific Python artifacts.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGET_DIR = path.join(ROOT, '.agent');

let removedCount = 0;

function cleanRecursively(dir) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__pycache__') {
        fs.rmSync(fullPath, { recursive: true, force: true });
        removedCount++;
        // console.log(`  Removed: ${path.relative(ROOT, fullPath)}`);
      } else {
        cleanRecursively(fullPath);
      }
    } else if (/\.(?:pyc|pyo|pyd)$/i.test(entry.name)) {
      fs.unlinkSync(fullPath);
      removedCount++;
      // console.log(`  Removed: ${path.relative(ROOT, fullPath)}`);
    }
  }
}

cleanRecursively(TARGET_DIR);
if (removedCount > 0) {
  console.log(`✓ Cleaned ${removedCount} Python cache files/directories from .agent/`);
}
