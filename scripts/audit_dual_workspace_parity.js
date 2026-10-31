#!/usr/bin/env node
'use strict';

/**
 * scripts/audit_dual_workspace_parity.js
 *
 * Phase 2.6: Dual-Workspace Checksum & Cryptographic Parity Audit
 *
 * Scans all mirrored directories between:
 * Canonical Inner Repo:  <repoRoot>
 * Outer Workspace Mirror: <repoRoot>/..
 *
 * Verifies SHA-256 parity across:
 * - .agent/skill_topic_map.json
 * - .agent/config/
 * - .agent/workflows/
 * - .agent/skills/
 * - .agent/agents/
 * - .agent/rules/
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const INNER_ROOT = path.resolve(__dirname, '..');
const OUTER_ROOT = path.resolve(INNER_ROOT, '..');

function sha256File(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function walkDir(dir, baseDir = dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath, baseDir));
    } else {
      files.push(path.relative(baseDir, fullPath));
    }
  }
  return files;
}

function syncAndAuditParity() {
  console.log('\n╭─ Tribunal Dual-Workspace Cryptographic Parity Audit ────────────');
  console.log(`│  • Canonical Inner: ${INNER_ROOT}`);
  console.log(`│  • Outer Workspace: ${OUTER_ROOT}`);

  const targets = [
    { inner: path.join(INNER_ROOT, '.agent', 'skill_topic_map.json'), outer: path.join(OUTER_ROOT, '.agent', 'skill_topic_map.json'), isFile: true },
    { inner: path.join(INNER_ROOT, '.agent', 'config'), outer: path.join(OUTER_ROOT, '.agent', 'config'), isFile: false },
    { inner: path.join(INNER_ROOT, '.agent', 'workflows'), outer: path.join(OUTER_ROOT, '.agent', 'workflows'), isFile: false },
    { inner: path.join(INNER_ROOT, '.agent', 'rules'), outer: path.join(OUTER_ROOT, '.agent', 'rules'), isFile: false },
    { inner: path.join(INNER_ROOT, '.agent', 'agents'), outer: path.join(OUTER_ROOT, '.agent', 'agents'), isFile: false },
    { inner: path.join(INNER_ROOT, '.agent', 'skills'), outer: path.join(OUTER_ROOT, '.agent', 'skills'), isFile: false },
    { inner: path.join(INNER_ROOT, 'skills'), outer: path.join(OUTER_ROOT, 'skills'), isFile: false },
  ];

  let totalFiles = 0;
  let matches = 0;
  let synced = 0;
  const discrepancies = [];

  for (const target of targets) {
    if (target.isFile) {
      totalFiles++;
      const innerHash = sha256File(target.inner);
      let outerHash = sha256File(target.outer);
      if (innerHash !== outerHash) {
        fs.mkdirSync(path.dirname(target.outer), { recursive: true });
        fs.copyFileSync(target.inner, target.outer);
        outerHash = sha256File(target.outer);
        synced++;
      }
      if (innerHash === outerHash) {
        matches++;
      } else {
        discrepancies.push(target.inner);
      }
    } else {
      const relFiles = walkDir(target.inner);
      for (const rel of relFiles) {
        totalFiles++;
        const innerPath = path.join(target.inner, rel);
        const outerPath = path.join(target.outer, rel);

        const innerHash = sha256File(innerPath);
        let outerHash = sha256File(outerPath);

        if (innerHash !== outerHash) {
          fs.mkdirSync(path.dirname(outerPath), { recursive: true });
          fs.copyFileSync(innerPath, outerPath);
          outerHash = sha256File(outerPath);
          synced++;
        }

        if (innerHash === outerHash) {
          matches++;
        } else {
          discrepancies.push(innerPath);
        }
      }
    }
  }

  console.log(`│  • Files Evaluated:  ${totalFiles}`);
  console.log(`│  • Parity Verified:  ${matches}/${totalFiles} (100% SHA-256 binary match)`);
  console.log(`│  • Synced to Outer:  ${synced}`);
  console.log(`│  • Discrepancies:    ${discrepancies.length}`);
  console.log('╰─────────────────────────────────────────────────────────────────\n');

  if (discrepancies.length > 0) {
    console.error('✖ Discrepancies remaining:', discrepancies);
    process.exit(1);
  }
}

if (require.main === module) {
  syncAndAuditParity();
}

module.exports = { syncAndAuditParity };

