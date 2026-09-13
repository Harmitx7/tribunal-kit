#!/usr/bin/env node
/**
 * sync-skills.js — Multi-platform skill directory synchronizer.
 *
 * Ensures skills are mirrored into:
 * - skills/         (for universal tools, Claude Code, Cursor, Windsurf, Roo Code)
 * - .agents/skills/ (for OpenAI Codex CLI and multi-agent harnesses)
 * from the canonical source:
 * - .agent/skills/
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CANONICAL_SKILLS = path.join(ROOT, '.agent', 'skills');
const TARGET_SKILLS = path.join(ROOT, 'skills');
const TARGET_AGENTS_SKILLS = path.join(ROOT, '.agents', 'skills');

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function syncSkills() {
  console.log('\n  🔱 Syncing Tribunal Skills across platform conventions...');

  if (!fs.existsSync(CANONICAL_SKILLS)) {
    console.error('  ✖ Error: Canonical skills directory .agent/skills not found!');
    process.exit(1);
  }

  copyDirRecursive(CANONICAL_SKILLS, TARGET_SKILLS);
  console.log(`  ✓ Mirrored to ${path.relative(ROOT, TARGET_SKILLS)}/`);

  copyDirRecursive(CANONICAL_SKILLS, TARGET_AGENTS_SKILLS);
  console.log(`  ✓ Mirrored to ${path.relative(ROOT, TARGET_AGENTS_SKILLS)}/`);

  console.log('  ✔ All skills synchronized.\n');
}

if (require.main === module) {
  syncSkills();
}

module.exports = { syncSkills };
