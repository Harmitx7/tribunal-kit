#!/usr/bin/env node
/**
 * modernize_skills.js — Tribunal Kit Skill Modernizer & Schema Validator (v4.0.0)
 *
 * Scans, deduplicates, standardizes, and validates all SKILL.md files across:
 * - tribunal-kit/.agent/skills/
 * - .agent/skills/ (when --sync-to-root is passed)
 *
 * Usage:
 *   node scripts/modernize_skills.js --validate
 *   node scripts/modernize_skills.js --dry-run
 *   node scripts/modernize_skills.js --fix
 *   node scripts/modernize_skills.js --fix --sync-to-root
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(ROOT, '.agent', 'skills');
const WORKSPACE_ROOT = path.resolve(ROOT, '..');
const ROOT_SKILLS_DIR = path.join(WORKSPACE_ROOT, '.agent', 'skills');

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');
const FIX = ARGS.includes('--fix');
const _VALIDATE = ARGS.includes('--validate') || (!DRY_RUN && !FIX);
const SYNC_TO_ROOT = ARGS.includes('--sync-to-root');

const CANONICAL_FOOTER = `---

## 🏛️ Tribunal Verification & Guardrails

**Slash command: \`/review\` or \`/tribunal-full\`**
**Active reviewers: \`logic-reviewer\` · \`security-auditor\`**

### ❌ Forbidden AI Tropes
1. **Blind Assumptions:** Never make an assumption without documenting it clearly with \`// VERIFY: [reason]\`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit
\`\`\`
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
\`\`\`

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
`;

function parseFrontmatter(content) {
  if (!content.startsWith('---')) return { frontmatter: null, body: content };
  const endIdx = content.indexOf('\n---', 3);
  if (endIdx === -1) return { frontmatter: null, body: content };

  const rawYaml = content.slice(4, endIdx).trim();
  const body = content.slice(endIdx + 4).trim();
  const meta = {};

  const lines = rawYaml.split('\n');
  let currentKey = null;
  let isList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (match) {
      currentKey = match[1];
      const val = match[2].trim();
      if (!val) {
        meta[currentKey] = [];
        isList = true;
      } else {
        meta[currentKey] = val;
        isList = false;
      }
    } else if (isList && trimmed.startsWith('-')) {
      const item = trimmed.slice(1).trim().replace(/^['"]|['"]$/g, '');
      if (Array.isArray(meta[currentKey])) {
        meta[currentKey].push(item);
      }
    }
  }

  return { frontmatter: rawYaml, meta, body };
}

function deduplicateAndCleanBody(body, skillName, description) {
  let cleaned = body;

  // 1. Remove duplicate top-level headers if repeated identical lines
  const titleMatch = cleaned.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    const title = titleMatch[1].trim();
    const titleRegex = new RegExp(`(^|\\n)#\\s+${escapeRegex(title)}(\\r?\\n)+`, 'g');
    let first = true;
    cleaned = cleaned.replace(titleRegex, (match, prefix) => {
      if (first) {
        first = false;
        return match;
      }
      return prefix;
    });
  }

  // 2. Strip existing canonical footer if present to ensure idempotency
  const existingFooterIdx = cleaned.indexOf('## 🏛️ Tribunal Verification & Guardrails');
  if (existingFooterIdx !== -1) {
    cleaned = cleaned.slice(0, existingFooterIdx).trim();
  }

  // Cut off legacy trailing guardrail stacks
  const footerMarkerRegex = /\n---\s*\n+(\*\*Slash command: `\/review`|## 🤖 LLM-Specific Traps|## 🏛️ Tribunal Integration|### ❌ Forbidden AI Tropes|## Pre-Flight Checklist|## VBC Protocol)[\s\S]*$/;
  cleaned = cleaned.replace(footerMarkerRegex, '').trim();

  // Remove any remaining isolated duplicate VBC blocks (H2 or H3)
  const isolatedVbcRegex = /(##|###)\s+🛑?\s*Verification-Before-Completion \(VBC\) Protocol[\s\S]*?(?=\n## |\n---|\n# |$)/g;
  cleaned = cleaned.replace(isolatedVbcRegex, '');

  // Remove trailing horizontal rules or whitespace
  cleaned = cleaned.replace(/(\n---\s*)+$/, '').trim();

  // 3. Ensure Activation Boundaries section exists near the top
  if (!cleaned.includes('Activation Boundaries') && !cleaned.includes('Activate when:')) {
    const activationBlock = `\n\n## Activation Boundaries\n\n- **Activate when:** Operating in tasks requiring ${description || skillName}.\n- **DO NOT activate when:** The task falls strictly outside ${skillName} domain or belongs to a different dedicated specialist.\n`;
    
    if (cleaned.includes('## Mandatory Pre-Flight Context Inspection')) {
      cleaned = cleaned.replace(/(## Mandatory Pre-Flight Context Inspection[\s\S]*?(?=\n## |\n# |\n---|$))/, `$1${activationBlock}`);
    } else {
      cleaned = cleaned.replace(/^(#[^\n]+\n+)/, `$1${activationBlock}\n`);
    }
  }

  // 4. Append single Canonical Footer
  cleaned = `${cleaned}\n\n${CANONICAL_FOOTER}`;

  return cleaned.trim();
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function processSkill(skillDirName) {
  const skillFile = path.join(SKILLS_DIR, skillDirName, 'SKILL.md');
  if (!fs.existsSync(skillFile)) return null;

  const originalContent = fs.readFileSync(skillFile, 'utf8');
  const { frontmatter, meta, body } = parseFrontmatter(originalContent);

  if (!frontmatter) {
    return { name: skillDirName, error: 'Missing frontmatter' };
  }

  const desc = meta ? (meta.description || '') : '';
  const newBody = deduplicateAndCleanBody(body, skillDirName, desc);

  // Rebuild frontmatter with version: 4.0.0 and canonical scripts-binding
  let updatedFrontmatter = frontmatter
    .replace(/^version:\s*.*$/m, 'version: 4.0.0')
    .replace(/^last-updated:\s*.*$/m, 'last-updated: 2026-09-07');

  if (!updatedFrontmatter.includes('version:')) {
    updatedFrontmatter += '\nversion: 4.0.0';
  }
  if (!updatedFrontmatter.includes('scripts-binding:')) {
    updatedFrontmatter += '\nscripts-binding:\n  - .agent/scripts/lint_runner.js\n  - .agent/scripts/verify_all.js';
  }

  const newContent = `---\n${updatedFrontmatter.trim()}\n---\n\n${newBody}\n`;

  const vbcMatches = (newContent.match(/Verification-Before-Completion \(VBC\) Protocol/g) || []).length;
  const trapsMatches = (newContent.match(/LLM-Specific Traps/g) || []).length;
  const isDuplicated = vbcMatches > 1 || trapsMatches > 1;

  const modified = newContent !== originalContent;

  if (modified && FIX) {
    fs.writeFileSync(skillFile, newContent, 'utf8');
    if (SYNC_TO_ROOT && fs.existsSync(ROOT_SKILLS_DIR)) {
      const rootSkillDir = path.join(ROOT_SKILLS_DIR, skillDirName);
      if (!fs.existsSync(rootSkillDir)) fs.mkdirSync(rootSkillDir, { recursive: true });
      fs.writeFileSync(path.join(rootSkillDir, 'SKILL.md'), newContent, 'utf8');
    }
  }

  return {
    name: skillDirName,
    isDuplicated,
    modified,
    vbcMatches,
    trapsMatches
  };
}

function main() {
  console.log(`━━━ Tribunal Kit Skill Modernizer ━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Target: ${SKILLS_DIR}`);
  console.log(`Mode:   ${FIX ? 'FIX (Overwriting files)' : DRY_RUN ? 'DRY-RUN (Simulated)' : 'VALIDATE (Read-only)'}`);
  if (SYNC_TO_ROOT) console.log(`Sync:   Enabled -> ${ROOT_SKILLS_DIR}`);
  console.log();

  const skillDirs = fs.readdirSync(SKILLS_DIR).filter(d => {
    return fs.statSync(path.join(SKILLS_DIR, d)).isDirectory();
  });

  let totalSkills = 0;
  let totalDuplicated = 0;
  let totalModified = 0;
  const errors = [];

  for (const dir of skillDirs) {
    totalSkills++;
    const res = processSkill(dir);
    if (!res) continue;
    if (res.error) {
      errors.push(`${dir}: ${res.error}`);
      continue;
    }
    if (res.isDuplicated) {
      totalDuplicated++;
    }
    if (res.modified) {
      totalModified++;
    }
  }

  console.log(`📊 Summary:`);
  console.log(`  Total Skills Analyzed: ${totalSkills}`);
  console.log(`  Skills with Remaining Duplications: ${totalDuplicated}`);
  console.log(`  Skills Needing Modification: ${totalModified}`);
  console.log(`  Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log(`\n❌ Errors encountered:`);
    errors.forEach(e => console.log(`  - ${e}`));
  }

  console.log();
  if (!FIX && totalModified > 0) {
    console.log(`💡 Run with --fix to apply cleanups and V4 schema across all ${totalModified} skills.`);
  } else if (FIX) {
    console.log(`✅ Successfully modernized and deduplicated skills to V4 schema!`);
  }
}

main();
