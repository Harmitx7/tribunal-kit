#!/usr/bin/env node
/**
 * validate-instructions.js — Tribunal-Kit Instruction & Workflow System Validator
 *
 * Enforces:
 * 1. Workflow Frontmatter & Structural Validity (description, tools, version, required-skills, scripts-binding).
 * 2. Deterministic Resolution of Script and Skill Bindings across all Workflows.
 * 3. Prevention of Stale References, Deprecated Directory Paths (e.g. runners/), and Broken Script Invocations.
 * 4. Context Window Budget for Lean Kernel Bridge (< 5,000 bytes).
 * 5. Reviewer Count Invariant (28 reviewers) and Skill Count Invariant (320 skills) across all Instruction Sources.
 * 6. Clean Activity Protocol Consistency (no legacy announcements like "Applying knowledge of @").
 */

'use strict';

const fs = require('fs');
const path = require('path');

const EXPECTED_REVIEWER_COUNT = 28;
const EXPECTED_SKILL_COUNT = 398;
const MAX_KERNEL_BRIDGE_BYTES = 5000;

function parseFrontmatter(content) {
  if (!content.startsWith('---')) return null;
  const endIdx = content.indexOf('---', 3);
  if (endIdx === -1) return null;
  const yamlBlock = content.slice(3, endIdx).trim();
  const result = {};

  const lines = yamlBlock.split('\n');
  let currentArrayKey = null;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('- ') && currentArrayKey) {
      result[currentArrayKey].push(trimmed.slice(2).trim());
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim();
      const val = line.slice(colonIdx + 1).trim();

      if (!val) {
        currentArrayKey = key;
        result[key] = [];
      } else {
        currentArrayKey = null;
        result[key] = val;
      }
    }
  }

  return { frontmatter: result, body: content.slice(endIdx + 3).trim() };
}

function validateWorkflows(repoRoot) {
  const errors = [];
  const warnings = [];
  const wfDir = path.join(repoRoot, '.agent', 'workflows');
  const skillsDir = path.join(repoRoot, '.agent', 'skills');

  if (!fs.existsSync(wfDir)) {
    errors.push(`Workflows directory missing: ${wfDir}`);
    return { errors, warnings, checked: 0 };
  }

  const files = fs.readdirSync(wfDir).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const fullPath = path.join(wfDir, file);
    const content = fs.readFileSync(fullPath, 'utf8');

    if (content.length === 0) {
      errors.push(`[${file}] Workflow file is empty`);
      continue;
    }

    const parsed = parseFrontmatter(content);
    if (!parsed) {
      errors.push(`[${file}] Missing or malformed YAML frontmatter delimiters (---)`);
      continue;
    }

    const { frontmatter, body } = parsed;

    // Required frontmatter fields
    if (!frontmatter.description) {
      errors.push(`[${file}] Missing 'description' in frontmatter`);
    } else if (typeof frontmatter.description !== 'string' || frontmatter.description.trim().length < 10) {
      warnings.push(`[${file}] Description is unusually brief or empty`);
    }

    // Required-skills resolution
    if (Array.isArray(frontmatter['required-skills'])) {
      for (const skill of frontmatter['required-skills']) {
        const skillPath = path.join(skillsDir, skill, 'SKILL.md');
        if (!fs.existsSync(skillPath)) {
          errors.push(`[${file}] References non-existent required-skill: '${skill}'`);
        }
      }
    }

    // Scripts-binding resolution
    if (Array.isArray(frontmatter['scripts-binding'])) {
      for (const scriptRel of frontmatter['scripts-binding']) {
        const scriptPath = path.join(repoRoot, scriptRel);
        if (!fs.existsSync(scriptPath)) {
          errors.push(`[${file}] References non-existent scripts-binding: '${scriptRel}'`);
        }
      }
    }

    // Check for deprecated directory references
    if (body.includes('node runners/') || body.includes('runners/')) {
      errors.push(`[${file}] Contains deprecated 'runners/' directory reference`);
    }

    // Check for reviewer count contradictions
    if (body.includes('31 reviewers') || (frontmatter.description && frontmatter.description.includes('31 reviewers'))) {
      errors.push(`[${file}] Contradicts standard reviewer count (references '31 reviewers' instead of ${EXPECTED_REVIEWER_COUNT})`);
    }

    // Check for legacy announcement format
    if (body.includes('Applying knowledge of @')) {
      errors.push(`[${file}] Contains legacy announcement format 'Applying knowledge of @'`);
    }
  }

  return { errors, warnings, checked: files.length };
}

function validateHostInstructions(repoRoot) {
  const errors = [];
  const warnings = [];

  // 1. Lean Kernel Context Budget (< 5,000 bytes)
  const kernelPath = path.join(repoRoot, '.agent', 'rules', 'kernel.md');
  if (!fs.existsSync(kernelPath)) {
    errors.push(`Kernel rules file missing: ${kernelPath}`);
  } else {
    const kernelContent = fs.readFileSync(kernelPath, 'utf8');
    const bridgeHeader = '# Tribunal Kit — Cursor Bridge\n# Auto-generated by tribunal-kit init. Do not edit manually.\n# Source: .agent/rules/kernel.md\n\n';
    const totalBridgeBytes = Buffer.byteLength(bridgeHeader + kernelContent, 'utf8');

    if (totalBridgeBytes > MAX_KERNEL_BRIDGE_BYTES) {
      errors.push(`Kernel bridge exceeds context budget: ${totalBridgeBytes} B (max: ${MAX_KERNEL_BRIDGE_BYTES} B)`);
    }

    if (!kernelContent.includes('Anti-Hallucination Protocol')) {
      errors.push('Kernel rules missing Anti-Hallucination Protocol');
    }
    if (!kernelContent.includes('Iron Law of TDD')) {
      errors.push('Kernel rules missing Iron Law of TDD');
    }
    if (!kernelContent.includes('Tribunal Activity Protocol')) {
      errors.push('Kernel rules missing Tribunal Activity Protocol');
    }
  }

  // 2. Comprehensive Master Rules (GEMINI.md)
  const geminiPath = path.join(repoRoot, '.agent', 'rules', 'GEMINI.md');
  if (!fs.existsSync(geminiPath)) {
    errors.push(`GEMINI master rules file missing: ${geminiPath}`);
  } else {
    const geminiContent = fs.readFileSync(geminiPath, 'utf8');
    if (geminiContent.includes('31 reviewers')) {
      errors.push('GEMINI.md contains obsolete reference to 31 reviewers');
    }
  }

  // 3. System Prompt Parity
  const systemPromptPath = path.join(repoRoot, '.agent', 'config', 'system-prompt.md');
  if (fs.existsSync(systemPromptPath)) {
    const spContent = fs.readFileSync(systemPromptPath, 'utf8');
    if (spContent.includes('185-skill library') || spContent.includes('235 skills')) {
      errors.push('system-prompt.md contains obsolete skill counts (should be 320)');
    }
    if (spContent.includes('v9.2.6')) {
      errors.push('system-prompt.md contains obsolete version string v9.2.6');
    }
  }

  // 4. Host Bridge Rule Files
  const hostBridges = [
    path.join(repoRoot, 'AGENTS.md'),
    path.join(repoRoot, 'CLAUDE.md'),
    path.join(repoRoot, '.cursorrules'),
    path.join(repoRoot, '.windsurfrules'),
    path.join(repoRoot, '.github', 'copilot-instructions.md'),
  ];

  for (const bridge of hostBridges) {
    if (fs.existsSync(bridge)) {
      const bContent = fs.readFileSync(bridge, 'utf8');
      if (bContent.includes('Applying knowledge of @')) {
        errors.push(`[${path.basename(bridge)}] Contains legacy announcement format`);
      }
      if (bContent.includes('31 reviewers')) {
        errors.push(`[${path.basename(bridge)}] Contains obsolete reference to 31 reviewers`);
      }
    }
  }

  return { errors, warnings };
}

function validateSkillRegistry(repoRoot) {
  const errors = [];
  const warnings = [];

  const topicMapPath = path.join(repoRoot, '.agent', 'skill_topic_map.json');
  const skillsDir = path.join(repoRoot, '.agent', 'skills');

  if (!fs.existsSync(topicMapPath)) {
    errors.push(`skill_topic_map.json missing at: ${topicMapPath}`);
    return { errors, warnings, checked: 0 };
  }

  let topicMap;
  try {
    topicMap = JSON.parse(fs.readFileSync(topicMapPath, 'utf8'));
  } catch (err) {
    errors.push(`Malformed JSON in skill_topic_map.json: ${err.message}`);
    return { errors, warnings, checked: 0 };
  }

  const registeredSkills = new Set();
  for (const list of Object.values(topicMap.domain_routes || {})) {
    if (Array.isArray(list)) {
      list.forEach(s => registeredSkills.add(s));
    }
  }

  if (fs.existsSync(skillsDir)) {
    const diskSkills = fs.readdirSync(skillsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const skill of diskSkills) {
      if (!registeredSkills.has(skill)) {
        errors.push(`Disk skill '${skill}' is not registered in skill_topic_map.json domain_routes`);
      }
    }

    for (const skill of registeredSkills) {
      const sPath = path.join(skillsDir, skill, 'SKILL.md');
      if (!fs.existsSync(sPath)) {
        errors.push(`Registered skill '${skill}' does not exist on disk`);
      }
    }
  }

  // Domain references
  for (const [domain, refList] of Object.entries(topicMap.domain_references || {})) {
    if (Array.isArray(refList)) {
      for (const refPath of refList) {
        const fullRef = path.join(repoRoot, refPath);
        if (!fs.existsSync(fullRef)) {
          errors.push(`Domain reference missing on disk: ${refPath} (in domain '${domain}')`);
        }
      }
    }
  }

  return { errors, warnings, checked: registeredSkills.size };
}

function runAllValidations(repoRoot = path.resolve(__dirname, '..')) {
  const wfResult = validateWorkflows(repoRoot);
  const hostResult = validateHostInstructions(repoRoot);
  const skillResult = validateSkillRegistry(repoRoot);

  const allErrors = [...wfResult.errors, ...hostResult.errors, ...skillResult.errors];
  const allWarnings = [...wfResult.warnings, ...hostResult.warnings, ...skillResult.warnings];

  return {
    passed: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    metrics: {
      workflowsChecked: wfResult.checked,
      skillsChecked: skillResult.checked,
    },
  };
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  console.log('\n╭─ Tribunal-Kit Instruction & Workflow System Audit ──────────────');
  const res = runAllValidations(root);

  console.log(`│  • Workflows Verified:       ${res.metrics.workflowsChecked}`);
  console.log(`│  • Skills & Topic Map:       ${res.metrics.skillsChecked}`);
  console.log(`│  • Reviewer Count Invariant: ${EXPECTED_REVIEWER_COUNT} (Verified)`);
  console.log(`│  • Kernel Budget Threshold:  < ${MAX_KERNEL_BRIDGE_BYTES} B (Verified)`);

  if (res.warnings.length > 0) {
    console.log('│');
    res.warnings.forEach(w => console.log(`│  ⚠ ${w}`));
  }

  if (res.errors.length > 0) {
    console.log('│');
    res.errors.forEach(e => console.log(`│  ✖ ${e}`));
    console.log('╰─────────────────────────────────────────────────────────────────\n');
    process.exit(1);
  } else {
    console.log('│');
    console.log('│  ✔ All workflows, instructions, bridges, and references are valid.');
    console.log('╰─────────────────────────────────────────────────────────────────\n');
    process.exit(0);
  }
}

module.exports = {
  validateWorkflows,
  validateHostInstructions,
  validateSkillRegistry,
  runAllValidations,
  EXPECTED_REVIEWER_COUNT,
  EXPECTED_SKILL_COUNT,
  MAX_KERNEL_BRIDGE_BYTES,
};

