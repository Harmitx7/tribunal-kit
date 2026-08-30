#!/usr/bin/env node

/**
 * Tribunal Kit — Universal CLI Agent Adapter
 *
 * Auto-detects installed CLI agents and configures Tribunal Kit
 * for each one. Supports Claude Code, Aider, Codex, Gemini CLI,
 * OpenCode, Copilot CLI, Cursor, Windsurf, and Cline.
 *
 * Usage:
 *   node bin/adapter-install.js           # Auto-detect and install all
 *   node bin/adapter-install.js claude     # Install for Claude Code only
 *   node bin/adapter-install.js --global   # Install to ~/.tribunal-kit/
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const ADAPTERS = {
  'claude-code': {
    detect: () => commandExists('claude'),
    rulesFile: '.claude/CLAUDE.md',
    description: 'Claude Code CLI',
    setup: (projectRoot, _globalMode) => {
      const rulesDir = path.join(projectRoot, '.claude');
      ensureDir(rulesDir);
      const source = path.join(__dirname, '..', '.claude', 'CLAUDE.md');
      const target = path.join(rulesDir, 'CLAUDE.md');
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, target);
      }
      // Also install MCP server config
      installMcpConfig(projectRoot, 'claude');
    },
  },

  aider: {
    detect: () => commandExists('aider'),
    rulesFile: '.aider.conf.yml',
    description: 'Aider CLI',
    setup: projectRoot => {
      const conventionsPath = path.join(projectRoot, 'CONVENTIONS.md');
      const systemPrompt = fs.readFileSync(path.join(__dirname, '..', '.agent', 'config', 'system-prompt.md'), 'utf8');
      fs.writeFileSync(conventionsPath, systemPrompt);
      console.log(`  ✓ Wrote ${conventionsPath}`);
    },
  },

  codex: {
    detect: () => commandExists('codex'),
    rulesFile: 'AGENTS.md',
    description: 'OpenAI Codex CLI',
    setup: projectRoot => {
      const agentsPath = path.join(projectRoot, 'AGENTS.md');
      const systemPrompt = fs.readFileSync(path.join(__dirname, '..', '.agent', 'config', 'system-prompt.md'), 'utf8');
      fs.writeFileSync(agentsPath, systemPrompt);
      console.log(`  ✓ Wrote ${agentsPath}`);
    },
  },

  'gemini-cli': {
    detect: () => commandExists('gemini'),
    rulesFile: '.gemini/rules/GEMINI.md',
    description: 'Google Gemini CLI',
    setup: projectRoot => {
      const geminiDir = path.join(projectRoot, '.gemini', 'rules');
      ensureDir(geminiDir);
      const systemPrompt = fs.readFileSync(path.join(__dirname, '..', '.agent', 'config', 'system-prompt.md'), 'utf8');
      fs.writeFileSync(path.join(geminiDir, 'GEMINI.md'), systemPrompt);
      console.log(`  ✓ Wrote ${path.join(geminiDir, 'GEMINI.md')}`);
      // Also install MCP config
      installMcpConfig(projectRoot, 'gemini');
    },
  },

  opencode: {
    detect: () => commandExists('opencode'),
    rulesFile: '.opencode/rules.md',
    description: 'OpenCode CLI',
    setup: projectRoot => {
      const opencodeDir = path.join(projectRoot, '.opencode');
      ensureDir(opencodeDir);
      const systemPrompt = fs.readFileSync(path.join(__dirname, '..', '.agent', 'config', 'system-prompt.md'), 'utf8');
      fs.writeFileSync(path.join(opencodeDir, 'rules.md'), systemPrompt);
      console.log(`  ✓ Wrote ${path.join(opencodeDir, 'rules.md')}`);
    },
  },

  'copilot-cli': {
    detect: () => commandExists('gh') && hasGhExtension('copilot'),
    rulesFile: '.github/copilot-instructions.md',
    description: 'GitHub Copilot CLI',
    setup: projectRoot => {
      const ghDir = path.join(projectRoot, '.github');
      ensureDir(ghDir);
      const systemPrompt = fs.readFileSync(path.join(__dirname, '..', '.agent', 'config', 'system-prompt.md'), 'utf8');
      fs.writeFileSync(path.join(ghDir, 'copilot-instructions.md'), systemPrompt);
      console.log(`  ✓ Wrote ${path.join(ghDir, 'copilot-instructions.md')}`);
    },
  },
};

// --- Utility Functions ---

function commandExists(cmd) {
  try {
    const isWin = os.platform() === 'win32';
    const check = isWin ? `where ${cmd}` : `which ${cmd}`;
    execSync(check, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function hasGhExtension(ext) {
  try {
    const output = execSync('gh extension list', { encoding: 'utf8' });
    return output.includes(ext);
  } catch {
    return false;
  }
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function installMcpConfig(projectRoot, target) {
  const mcpConfig = {
    mcpServers: {
      'tribunal-kit': {
        command: 'node',
        args: [path.join(__dirname, '..', 'bin', 'mcp-server.js')],
        env: { NODE_ENV: 'production' },
      },
    },
  };

  let configPath;
  if (target === 'claude') {
    configPath = path.join(projectRoot, '.claude', 'mcp.json');
  } else if (target === 'gemini') {
    configPath = path.join(projectRoot, '.gemini', 'settings.json');
  } else {
    configPath = path.join(projectRoot, 'mcp_config.json');
  }

  fs.writeFileSync(configPath, JSON.stringify(mcpConfig, null, 2));
  console.log(`  ✓ MCP server registered at ${configPath}`);
}

// --- Main ---

function main() {
  const args = process.argv.slice(2);
  const globalMode = args.includes('--global');
  const targetAgent = args.find(a => !a.startsWith('-'));
  const projectRoot = globalMode ? path.join(os.homedir(), '.tribunal-kit') : process.cwd();

  console.log('');
  console.log('┌─────────────────────────────────────────────┐');
  console.log('│  🔱 Tribunal Kit — Universal Agent Adapter  │');
  console.log('│  v7.0.0 · 52 specialists · 186 skills       │');
  console.log('└─────────────────────────────────────────────┘');
  console.log('');

  if (globalMode) {
    ensureDir(projectRoot);
    console.log(`📁 Global mode: Installing to ${projectRoot}`);
  } else {
    console.log(`📁 Project mode: Installing to ${projectRoot}`);
  }
  console.log('');

  let installed = 0;
  let detected = 0;

  for (const [name, adapter] of Object.entries(ADAPTERS)) {
    if (targetAgent && name !== targetAgent) continue;

    const isDetected = adapter.detect();
    if (isDetected) detected++;

    if (targetAgent || isDetected) {
      console.log(`⚡ ${adapter.description} ${isDetected ? '(detected)' : '(manual)'}`);
      try {
        adapter.setup(projectRoot, globalMode);
        installed++;
        console.log(`  ✅ Tribunal Kit configured for ${adapter.description}`);
      } catch (err) {
        console.error(`  ❌ Failed: ${err.message}`);
      }
      console.log('');
    }
  }

  if (installed === 0 && !targetAgent) {
    console.log('⚠️  No CLI agents detected on this machine.');
    console.log('');
    console.log('   Supported agents:');
    for (const [name, adapter] of Object.entries(ADAPTERS)) {
      console.log(`     • ${name.padEnd(15)} → ${adapter.description}`);
    }
    console.log('');
    console.log('   Install one, then run this command again.');
    console.log('   Or specify manually: node bin/adapter-install.js claude-code');
  } else {
    console.log('─────────────────────────────────────────────');
    console.log(`✅ Configured ${installed} agent(s) (${detected} auto-detected)`);
    console.log('');
    console.log('   Next steps:');
    console.log('   1. Open your CLI agent normally');
    console.log('   2. The Tribunal rules are now enforced automatically');
    console.log('   3. Use /tribunal, /summon, /audit, /debug commands');
  }

  console.log('');
}

main();
