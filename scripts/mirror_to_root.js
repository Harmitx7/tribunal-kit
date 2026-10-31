/**
 * mirror_to_root.js — Dual-Workspace Mirroring Synchronizer
 * Synchronizes canonical tribunal-kit files to the outer parent workspace.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const CANONICAL_DIR = path.resolve(__dirname, '..');
const ROOT_DIR = path.resolve(CANONICAL_DIR, '..');

console.log('Synchronizing canonical tribunal-kit -> outer workspace...');
console.log(`Canonical: ${CANONICAL_DIR}`);
console.log(`Root:      ${ROOT_DIR}`);

const filesToCopy = [
  '.agent/routing_index.json',
  '.agent/skill_topic_map.json',
  '.agent/config/slash-commands.json',
  '.agent/config/specialist-registry.json',
  '.agent/scripts/skill_integrator.js',
  '.agent/scripts/context_broker.js',
  '.agent/skills/audit-and-fix/SKILL.md',
  '.agent/skills/product-aware-heuristics/SKILL.md',
  '.agent/skills/ui-reasoning-engine/SKILL.md',
  '.agent/workflows/arch.md',
  '.agent/workflows/assimilate.md',
  '.agent/workflows/htop.md',
  '.agent/workflows/resume.md',
  '.agent/workflows/team-mode.md',
  '.agent/workflows/understand.md',
  'README.md',
  'docs/GETTING_STARTED.md'
];

let copied = 0;
for (const rel of filesToCopy) {
  const src = path.join(CANONICAL_DIR, rel);
  const dest = path.join(ROOT_DIR, rel);

  if (fs.existsSync(src)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    copied++;
  } else {
    console.warn(`Source file missing: ${src}`);
  }
}

// Mirror benchmarks artifacts
const benchmarkArtifacts = [
  'canonical_execution_graph.json',
  'complete_skill_dependency_graph.json',
  'ecosystem_integration_certification_report.md'
];

for (const artifact of benchmarkArtifacts) {
  const src = path.join(CANONICAL_DIR, 'benchmarks', 'artifacts', artifact);
  const dest = path.join(ROOT_DIR, 'benchmarks', 'artifacts', artifact);
  if (fs.existsSync(src)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    copied++;
  }
}

console.log(`✔ Successfully mirrored ${copied} files to outer workspace.`);
