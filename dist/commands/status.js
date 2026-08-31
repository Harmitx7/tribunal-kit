'use strict';

Object.defineProperty(exports, '__esModule', { value: true });
exports.cmdStatus = cmdStatus;

const fs = require('fs');
const path = require('path');
const { color, bold, dim, RGB, GLYPHS, renderBanner } = require('../tui');

function cmdStatus(flags, quiet = false) {
  const targetDir = flags.path ? path.resolve(flags.path) : process.cwd();
  const agentDest = path.join(targetDir, '.agent');
  const PKG = require('../../package.json');

  renderBanner(PKG.version, quiet);

  const g = GLYPHS;

  if (!fs.existsSync(agentDest)) {
    console.log(`  ${color(RGB.ROSE, g.failure)} ${bold('Not installed')} in this project`);
    console.log();
    console.log(`  ${dim('Run:')} ${color(RGB.CYAN, 'npx tribunal-kit init')}`);
    console.log();
    return;
  }

  const agentsCount = fs.existsSync(path.join(agentDest, 'agents'))
    ? fs.readdirSync(path.join(agentDest, 'agents')).filter(f => f.endsWith('.md')).length
    : 0;
  const workflowsCount = fs.existsSync(path.join(agentDest, 'workflows'))
    ? fs.readdirSync(path.join(agentDest, 'workflows')).filter(f => f.endsWith('.md')).length
    : 0;
  const skillsCount = fs.existsSync(path.join(agentDest, 'skills'))
    ? fs.readdirSync(path.join(agentDest, 'skills')).length
    : 0;
  const scriptsCount = fs.existsSync(path.join(agentDest, 'scripts'))
    ? fs.readdirSync(path.join(agentDest, 'scripts')).filter(f => f.endsWith('.js')).length
    : 0;

  console.log(`  ${color(RGB.EMERALD, g.success)} ${bold(color(RGB.EMERALD, 'Installed & Active'))}  ${dim('→')}  ${dim(agentDest)}`);
  console.log();

  console.log(`    ${color(RGB.FLAME, '🤖')}  ${color(RGB.WHITE, 'Agents'.padEnd(12))}  ${color(RGB.CYAN, String(agentsCount).padStart(3))} ${dim('specialists')}`);
  console.log(`    ${color(RGB.AMBER, '⚡')}  ${color(RGB.WHITE, 'Workflows'.padEnd(12))}  ${color(RGB.CYAN, String(workflowsCount).padStart(3))} ${dim('commands')}`);
  console.log(`    ${color(RGB.PURPLE, '🧠')}  ${color(RGB.WHITE, 'Skills'.padEnd(12))}  ${color(RGB.CYAN, String(skillsCount).padStart(3))} ${dim('injected')}`);
  console.log(`    ${color(RGB.EMERALD, '🔧')}  ${color(RGB.WHITE, 'Scripts'.padEnd(12))}  ${color(RGB.CYAN, String(scriptsCount).padStart(3))} ${dim('enforcers')}`);
  console.log();

  // IDE Bridges Check
  const bridges = [
    { name: 'Cursor', file: '.cursorrules' },
    { name: 'Windsurf', file: '.windsurfrules' },
    { name: 'Claude Code', file: '.claude/CLAUDE.md' },
    { name: 'Antigravity / Gemini', file: '.gemini/GEMINI.md' },
  ];

  console.log(`  ${dim('IDE Bridges:')}`);
  for (const b of bridges) {
    const exists = fs.existsSync(path.join(targetDir, b.file));
    const icon = exists ? color(RGB.EMERALD, g.success) : color(RGB.ZINC_600, '·');
    const label = exists ? color(RGB.WHITE, b.name) : dim(b.name);
    console.log(`    ${icon} ${label} ${dim(`(${b.file})`)}`);
  }

  console.log();
}
