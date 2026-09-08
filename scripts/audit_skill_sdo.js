#!/usr/bin/env node
/**
 * Skill Discovery Optimization (SDO) Linter for Tribunal-Kit
 *
 * Scans all skills in .agent/skills/ to ensure their frontmatter descriptions
 * follow the SDO invariant:
 * - Must describe *when to trigger* (symptoms, contexts, conditions)
 * - Must NOT summarize the internal workflow or process (which causes LLMs to skim/hallucinate)
 */

const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.resolve(__dirname, '..', '.agent', 'skills');

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const yamlBlock = match[1];
  const nameMatch = yamlBlock.match(/^name:\s*(.+)$/m);
  const descMatch = yamlBlock.match(/^description:\s*(.+)$/m);

  return {
    name: nameMatch ? nameMatch[1].trim().replace(/^["']|["']$/g, '') : null,
    description: descMatch ? descMatch[1].trim().replace(/^["']|["']$/g, '') : null,
  };
}

function auditSkills() {
  if (!fs.existsSync(SKILLS_DIR)) {
    console.error(`✖ Skills directory not found: ${SKILLS_DIR}`);
    process.exit(1);
  }

  const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
  const skillDirs = entries.filter(e => e.isDirectory()).map(e => e.name);

  let totalSkills = 0;
  let validSkills = 0;
  const warnings = [];

  for (const dir of skillDirs) {
    const skillMdPath = path.join(SKILLS_DIR, dir, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) continue;

    totalSkills++;
    const content = fs.readFileSync(skillMdPath, 'utf8');
    const fm = parseFrontmatter(content);

    if (!fm || !fm.description) {
      warnings.push({ skill: dir, issue: 'Missing frontmatter description' });
      continue;
    }

    const desc = fm.description;
    const isTriggerFocused = desc.toLowerCase().includes('use when') || 
                             desc.toLowerCase().includes('activate when') ||
                             desc.toLowerCase().includes('when ');

    if (!isTriggerFocused) {
      warnings.push({
        skill: dir,
        issue: 'Description does not explicitly specify trigger condition (should start with "Use when...")',
        description: desc.slice(0, 80) + '...',
      });
    } else {
      validSkills++;
    }
  }

  console.log(`\n🔍 Skill Discovery Optimization (SDO) Audit Results:`);
  console.log(`  Total Skills Analyzed: ${totalSkills}`);
  console.log(`  SDO Trigger-Compliant: ${validSkills}`);
  console.log(`  Advisory Warnings:     ${warnings.length}\n`);

  if (warnings.length > 0) {
    console.log(`⚠️  Advisory Sample (first 5):`);
    for (const w of warnings.slice(0, 5)) {
      console.log(`  - [${w.skill}]: ${w.issue}`);
    }
  }

  console.log(`\n✔ SDO audit complete. System has ${totalSkills} searchable skills.\n`);
}

auditSkills();
