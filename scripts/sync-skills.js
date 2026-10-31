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

const CANONICAL_REFS = path.join(ROOT, '.agent', 'references');
const TARGET_REFS = path.join(ROOT, 'references');
const TARGET_AGENTS_REFS = path.join(ROOT, '.agents', 'references');

function filesMatch(srcFile, destFile) {
  if (!fs.existsSync(destFile)) return false;
  try {
    const srcStat = fs.statSync(srcFile);
    const destStat = fs.statSync(destFile);
    if (srcStat.size !== destStat.size) return false;
    const srcBuf = fs.readFileSync(srcFile);
    const destBuf = fs.readFileSync(destFile);
    return srcBuf.equals(destBuf);
  } catch {
    return false;
  }
}

function verifyDirParity(src, dest, relativePrefix = '') {
  const missingOrModified = [];
  if (!fs.existsSync(dest)) {
    return [`Target directory missing: ${dest}`];
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    const rel = relativePrefix ? `${relativePrefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      const subErrors = verifyDirParity(srcPath, destPath, rel);
      missingOrModified.push(...subErrors);
    } else {
      if (!filesMatch(srcPath, destPath)) {
        missingOrModified.push(rel);
      }
    }
  }
  return missingOrModified;
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  let copiedCount = 0;
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copiedCount += copyDirRecursive(srcPath, destPath);
    } else {
      if (!filesMatch(srcPath, destPath)) {
        fs.copyFileSync(srcPath, destPath);
        copiedCount++;
      }
    }
  }
  return copiedCount;
}

function syncSkills(options = {}) {
  const isCheck = Boolean(options.check || process.argv.includes('--check'));

  if (!fs.existsSync(CANONICAL_SKILLS)) {
    console.error('  ✖ Error: Canonical skills directory .agent/skills not found!');
    if (isCheck) process.exit(1);
    return false;
  }

  if (isCheck) {
    console.log('\n  🔍 Verifying Tribunal Skills & References parity (read-only)...');
    let hasParityErrors = false;

    const skillsDiff = verifyDirParity(CANONICAL_SKILLS, TARGET_SKILLS);
    const agentsSkillsDiff = verifyDirParity(CANONICAL_SKILLS, TARGET_AGENTS_SKILLS);

    if (skillsDiff.length > 0) {
      console.error(`  ✖ Out-of-sync in skills/ (${skillsDiff.length} file(s)): ${skillsDiff.slice(0, 3).join(', ')}...`);
      hasParityErrors = true;
    }
    if (agentsSkillsDiff.length > 0) {
      console.error(`  ✖ Out-of-sync in .agents/skills/ (${agentsSkillsDiff.length} file(s)): ${agentsSkillsDiff.slice(0, 3).join(', ')}...`);
      hasParityErrors = true;
    }

    if (fs.existsSync(CANONICAL_REFS)) {
      const refsDiff = verifyDirParity(CANONICAL_REFS, TARGET_REFS);
      const agentsRefsDiff = verifyDirParity(CANONICAL_REFS, TARGET_AGENTS_REFS);

      if (refsDiff.length > 0) {
        console.error(`  ✖ Out-of-sync in references/ (${refsDiff.length} file(s)): ${refsDiff.slice(0, 3).join(', ')}...`);
        hasParityErrors = true;
      }
      if (agentsRefsDiff.length > 0) {
        console.error(`  ✖ Out-of-sync in .agents/references/ (${agentsRefsDiff.length} file(s)): ${agentsRefsDiff.slice(0, 3).join(', ')}...`);
        hasParityErrors = true;
      }
    }

    if (hasParityErrors) {
      console.error('  ✖ Parity check failed. Run "npm run skills:sync" to synchronize mirrors.\n');
      process.exit(1);
    }

    console.log('  ✔ All skill & reference mirrors verified in 100% parity (0 mutations).\n');
    return true;
  }

  console.log('\n  🔱 Syncing Tribunal Skills & References across platform conventions...');

  const c1 = copyDirRecursive(CANONICAL_SKILLS, TARGET_SKILLS);
  console.log(`  ✓ Mirrored to ${path.relative(ROOT, TARGET_SKILLS)}/ (${c1} updated)`);

  const c2 = copyDirRecursive(CANONICAL_SKILLS, TARGET_AGENTS_SKILLS);
  console.log(`  ✓ Mirrored to ${path.relative(ROOT, TARGET_AGENTS_SKILLS)}/ (${c2} updated)`);

  if (fs.existsSync(CANONICAL_REFS)) {
    const c3 = copyDirRecursive(CANONICAL_REFS, TARGET_REFS);
    console.log(`  ✓ Mirrored references to ${path.relative(ROOT, TARGET_REFS)}/ (${c3} updated)`);

    const c4 = copyDirRecursive(CANONICAL_REFS, TARGET_AGENTS_REFS);
    console.log(`  ✓ Mirrored references to ${path.relative(ROOT, TARGET_AGENTS_REFS)}/ (${c4} updated)`);
  }

  console.log('  ✔ All skills & references synchronized.\n');
  return true;
}

if (require.main === module) {
  syncSkills();
}

module.exports = { syncSkills, verifyDirParity };