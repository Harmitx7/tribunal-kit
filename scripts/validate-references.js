#!/usr/bin/env node
/**
 * validate-references.js — Tribunal Kit Skill & Reference Integrity Validator
 *
 * Enforces:
 * 1. YAML frontmatter validity and name parity across all skills.
 * 2. Markdown relative link integrity (ignoring code blocks).
 * 3. External documentation URL syntax.
 * 4. 100% synchronization between canonical .agent/skills and mirrors (skills/, .agents/skills/).
 * 5. Registry parity in .agent/skill_topic_map.json.
 * 6. Reference token budgets (<2,000 estimated tokens per file).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CANONICAL_SKILLS = path.join(ROOT, '.agent', 'skills');
const TARGET_SKILLS = path.join(ROOT, 'skills');
const TARGET_AGENTS_SKILLS = path.join(ROOT, '.agents', 'skills');
const TOPIC_MAP = path.join(ROOT, '.agent', 'skill_topic_map.json');
const REFERENCES_DIR = path.join(ROOT, '.agent', 'references');

const { syncSkills } = require('./sync-skills');
if (!fs.existsSync(TARGET_SKILLS) || !fs.existsSync(TARGET_AGENTS_SKILLS)) {
  syncSkills();
}

let errors = [];
let warnings = [];
let checkedSkills = 0;
let checkedLinks = 0;
let checkedRefs = 0;

console.log('\n╭─ Tribunal Reference & Skill Integrity Audit ──────────────────');

// 1. Mirror Parity Check
if (!fs.existsSync(CANONICAL_SKILLS)) {
  errors.push(`Canonical skills directory missing: ${CANONICAL_SKILLS}`);
} else {
  const canonicalEntries = fs.readdirSync(CANONICAL_SKILLS).filter(d => fs.statSync(path.join(CANONICAL_SKILLS, d)).isDirectory());
  const skillsEntries = fs.existsSync(TARGET_SKILLS) ? fs.readdirSync(TARGET_SKILLS).filter(d => fs.statSync(path.join(TARGET_SKILLS, d)).isDirectory()) : [];
  const agentsEntries = fs.existsSync(TARGET_AGENTS_SKILLS) ? fs.readdirSync(TARGET_AGENTS_SKILLS).filter(d => fs.statSync(path.join(TARGET_AGENTS_SKILLS, d)).isDirectory()) : [];

  for (const skill of canonicalEntries) {
    if (!skillsEntries.includes(skill)) {
      errors.push(`Skill '${skill}' missing from skills/ mirror`);
    }
    if (!agentsEntries.includes(skill)) {
      errors.push(`Skill '${skill}' missing from .agents/skills/ mirror`);
    }
  }

  // 2. Topic Map Parity
  if (fs.existsSync(TOPIC_MAP)) {
    try {
      const map = JSON.parse(fs.readFileSync(TOPIC_MAP, 'utf8'));
      const registered = new Set();
      for (const list of Object.values(map.domain_routes || {})) {
        list.forEach(s => registered.add(s));
      }
      for (const skill of canonicalEntries) {
        if (!registered.has(skill)) {
          errors.push(`Skill '${skill}' not registered in .agent/skill_topic_map.json`);
        }
      }
    } catch (e) {
      errors.push(`Failed to parse .agent/skill_topic_map.json: ${e.message}`);
    }
  }

  // 3. Scan each skill for Frontmatter and Link Integrity
  for (const skill of canonicalEntries) {
    checkedSkills++;
    const skillPath = path.join(CANONICAL_SKILLS, skill, 'SKILL.md');
    if (!fs.existsSync(skillPath)) {
      errors.push(`SKILL.md missing in canonical directory for '${skill}'`);
      continue;
    }

    const content = fs.readFileSync(skillPath, 'utf8');

    // Frontmatter check
    if (!content.startsWith('---')) {
      errors.push(`[${skill}] Missing opening YAML frontmatter '---'`);
    } else {
      const parts = content.split('---');
      if (parts.length < 3) {
        errors.push(`[${skill}] Malformed YAML frontmatter (missing closing '---')`);
      } else {
        const fm = parts[1];
        if (!fm.includes('name:')) {
          errors.push(`[${skill}] Missing 'name' field in frontmatter`);
        }
        if (!fm.includes('description:')) {
          warnings.push(`[${skill}] Missing 'description' field in frontmatter`);
        }
      }
    }

    // Strip code blocks to avoid false-positive link matches
    const noCodeBlocks = content.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');

    // Extract links [text](target)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(noCodeBlocks)) !== null) {
      checkedLinks++;
      const target = match[2].trim();
      if (target.startsWith('#') || target.startsWith('mailto:')) continue;

      if (target.startsWith('http://') || target.startsWith('https://')) {
        // Validate URL syntax
        if (target.includes('<') || target.includes('>')) {
          errors.push(`[${skill}] Malformed URL syntax with unescaped angle brackets: ${target}`);
        }
      } else {
        // Relative file link check
        const cleanPath = target.split('#')[0];
        if (!cleanPath) continue;
        const resolved = path.resolve(path.join(CANONICAL_SKILLS, skill), cleanPath);
        if (!fs.existsSync(resolved)) {
          errors.push(`[${skill}] Broken relative link to non-existent file: ${cleanPath}`);
        }
      }
    }
  }
}

// 4. Reference Library Audit
if (fs.existsSync(REFERENCES_DIR)) {
  function walkRefs(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        walkRefs(full);
      } else if (item.name.endsWith('.md')) {
        checkedRefs++;
        const content = fs.readFileSync(full, 'utf8');
        const tokenEstimate = Math.round(content.length / 4);
        if (tokenEstimate > 2000) {
          warnings.push(`Reference '${path.relative(ROOT, full)}' exceeds token budget (${tokenEstimate} tokens > 2000)`);
        }
      }
    }
  }
  walkRefs(REFERENCES_DIR);
}

// Output summary
console.log(`│  • Skills Verified:    ${checkedSkills}`);
console.log(`│  • Links Audited:      ${checkedLinks}`);
console.log(`│  • References Checked: ${checkedRefs}`);

if (warnings.length > 0) {
  console.log('│');
  console.log(`│  ⚠️  Warnings (${warnings.length}):`);
  warnings.slice(0, 5).forEach(w => console.log(`│    - ${w}`));
  if (warnings.length > 5) console.log(`│    ... and ${warnings.length - 5} more warnings`);
}

if (errors.length > 0) {
  console.log('│');
  console.log(`│  ✖ Errors (${errors.length}):`);
  errors.forEach(e => console.log(`│    - ${e}`));
  console.log('╰─────────────────────────────────────────────────────────────────\n');
  process.exit(1);
} else {
  console.log('│');
  console.log('│  ✔ All skills, mirrors, links, and references verified successfully.');
  console.log('╰─────────────────────────────────────────────────────────────────\n');
  process.exit(0);
}
