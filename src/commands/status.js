'use strict';

Object.defineProperty(exports, '__esModule', { value: true });
exports.cmdStatus = cmdStatus;

const fs = require('fs');
const path = require('path');
const { color, bold, dim, RGB, GLYPHS, renderBanner, renderPanel } = require('../tui');

function cmdStatus(flags = {}, quiet = false) {
  const targetDir = flags.path ? path.resolve(flags.path) : process.cwd();
  const agentDest = path.join(targetDir, '.agent');
  const PKG = require('../../package.json');
  const g = GLYPHS;

  const isInstalled = fs.existsSync(agentDest);
  const agentsCount = isInstalled && fs.existsSync(path.join(agentDest, 'agents'))
    ? fs.readdirSync(path.join(agentDest, 'agents')).filter(f => f.endsWith('.md')).length
    : 0;
  const workflowsCount = isInstalled && fs.existsSync(path.join(agentDest, 'workflows'))
    ? fs.readdirSync(path.join(agentDest, 'workflows')).filter(f => f.endsWith('.md')).length
    : 0;
  const skillsCount = isInstalled && fs.existsSync(path.join(agentDest, 'skills'))
    ? fs.readdirSync(path.join(agentDest, 'skills')).length
    : 0;
  const scriptsCount = isInstalled && fs.existsSync(path.join(agentDest, 'scripts'))
    ? fs.readdirSync(path.join(agentDest, 'scripts')).filter(f => f.endsWith('.js')).length
    : 0;

  const bridges = [
    { name: 'Cursor', file: '.cursorrules' },
    { name: 'Windsurf', file: '.windsurfrules' },
    { name: 'Claude Code', file: '.claude/CLAUDE.md' },
    { name: 'Antigravity / Gemini', file: '.gemini/GEMINI.md' },
  ];

  if (flags.json) {
    const data = {
      installed: isInstalled,
      version: PKG.version,
      path: agentDest,
      counts: {
        agents: agentsCount,
        workflows: workflowsCount,
        skills: skillsCount,
        scripts: scriptsCount,
      },
      bridges: bridges.map(b => ({
        name: b.name,
        file: b.file,
        active: fs.existsSync(path.join(targetDir, b.file)),
      })),
    };
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  renderBanner(PKG.version, quiet);

  if (!isInstalled) {
    const alertLines = [
      `${color(RGB.ROSE, g.failure)} ${bold('Tribunal Governance Layer is NOT active in this workspace.')}`,
      '',
      `  ${dim('Initialize now:')} ${color(RGB.CYAN, 'npx tribunal-kit init')}`,
      `  ${dim('Custom path:')}    ${color(RGB.CYAN, 'tk init --path <directory>')}`,
    ];
    renderPanel('Governance Status', alertLines, {
      accessory: '[NOT INSTALLED]',
      borderColor: RGB.ROSE,
      titleColor: RGB.ROSE,
    });
    return;
  }

  const displayDest = agentDest.length > 50 ? '...' + agentDest.slice(-47) : agentDest;
  const archLines = [
    `  ${color(RGB.EMERALD, g.success)} ${bold(color(RGB.EMERALD, 'Installed & Active'))}  ${dim('·')}  ${dim(displayDest)}`,
    '',
    `    ${color(RGB.FLAME, '🤖')}  ${color(RGB.WHITE, 'Agents'.padEnd(12))} ${bold(color(RGB.CYAN, `[${String(agentsCount).padStart(3)}]`))} ${dim('specialists (registry locked)')}`,
    `    ${color(RGB.AMBER, '⚡')}  ${color(RGB.WHITE, 'Workflows'.padEnd(12))} ${bold(color(RGB.CYAN, `[${String(workflowsCount).padStart(3)}]`))} ${dim('commands (Socratic gates armed)')}`,
    `    ${color(RGB.PURPLE, '🧠')}  ${color(RGB.WHITE, 'Skills'.padEnd(12))} ${bold(color(RGB.CYAN, `[${String(skillsCount).padStart(3)}]`))} ${dim('injected (2-tier lazy routing)')}`,
    `    ${color(RGB.EMERALD, '🔧')}  ${color(RGB.WHITE, 'Scripts'.padEnd(12))} ${bold(color(RGB.CYAN, `[${String(scriptsCount).padStart(3)}]`))} ${dim('enforcers (OWASP & AST active)')}`,
  ];

  renderPanel('System Architecture', archLines, {
    accessory: '[FORTRESS ACTIVE]',
    borderColor: RGB.SLATE_700,
    titleColor: RGB.WHITE,
  });

  // 2. IDE Bridges Panel
  const bridgeLines = bridges.map(b => {
    const exists = fs.existsSync(path.join(targetDir, b.file));
    const icon = exists ? color(RGB.EMERALD, g.success) : color(RGB.ZINC_600, '·');
    const badge = exists ? color(RGB.EMERALD, '[ACTIVE]') : color(RGB.ZINC_600, '[INACTIVE]');
    const label = exists ? bold(color(RGB.WHITE, b.name.padEnd(20))) : dim(b.name.padEnd(20));
    const filePath = dim(`(${b.file})`);
    return `  ${icon}  ${label} ${badge}  ${filePath}`;
  });

  renderPanel('IDE Bridge Enforcers', bridgeLines, {
    accessory: `${bridges.filter(b => fs.existsSync(path.join(targetDir, b.file))).length}/${bridges.length} Linked`,
    borderColor: RGB.SLATE_700,
    titleColor: RGB.WHITE,
  });

  if (!quiet) {
    const hint = `  ${color(RGB.ZINC_600, '[?] tk help  │  [s] tk rsi status  │  [v] tk validate  │  [l] tk learn')}`;
    console.log(hint);
    console.log();
  }
}
