#!/usr/bin/env node
/**
 * sync_registries_and_commands.js
 *
 * Synchronizes:
 * - specialist-registry.json (registers missing 8 canonical agents)
 * - slash-commands.json (registers slash commands for all 52 workflows)
 * - plugin.json (updates version, skills, workflows, specialist counts)
 * - claude.json (updates version)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SPECIALIST_REGISTRY = path.join(ROOT, '.agent', 'config', 'specialist-registry.json');
const SLASH_COMMANDS = path.join(ROOT, '.agent', 'config', 'slash-commands.json');
const PLUGIN_JSON = path.join(ROOT, '.agent', 'config', 'plugin.json');
const CLAUDE_JSON = path.join(ROOT, '.agent', 'config', 'claude.json');
const WORKFLOWS_DIR = path.join(ROOT, '.agent', 'workflows');
const AGENTS_DIR = path.join(ROOT, '.agent', 'agents');
const SKILLS_DIR = path.join(ROOT, '.agent', 'skills');

// 1. Sync Specialist Registry
const specData = JSON.parse(fs.readFileSync(SPECIALIST_REGISTRY, 'utf8'));
const existingSpecNames = new Set((specData.specialists || []).map(s => s.name));

const missingSpecs = [
  {
    name: 'agent-shield-auditor',
    domain: ['security', 'all'],
    type: 'reviewer',
    priority: 'critical',
    description: 'Identifies prompt injection risks, MCP vulnerabilities, and reviews untrusted content.'
  },
  {
    name: 'anti-slop-auditor',
    domain: ['frontend', 'ui'],
    type: 'reviewer',
    priority: 'high',
    description: 'Anti-Slop Enforcer. Audits frontend UI against generic clichés, forces Purpose-Gate validation, and reads Liveliness Dials.'
  },
  {
    name: 'architecture-auditor',
    domain: ['architecture', 'all'],
    type: 'reviewer',
    priority: 'high',
    description: 'Audits Maker code diffs against System Model and ADRs. Catches boundary violations and circular dependencies.'
  },
  {
    name: 'backend-security-architect',
    domain: ['backend', 'security', 'database'],
    type: 'specialist',
    priority: 'high',
    description: 'Consolidated domain reviewer for backend/security/database Tier 3 audits.'
  },
  {
    name: 'harness-manager',
    domain: ['infrastructure', 'security'],
    type: 'specialist',
    priority: 'critical',
    description: 'Intercepts direct shell execution from agents, providing a secure, event-sourced Brain-Hands decoupling boundary.'
  },
  {
    name: 'human-gate-negotiator',
    domain: ['governance', 'all'],
    type: 'specialist',
    priority: 'critical',
    description: 'Prepares impact summaries and presents risks before human approval.'
  },
  {
    name: 'kernel-scheduler',
    domain: ['orchestration', 'architecture'],
    type: 'specialist',
    priority: 'critical',
    description: 'Translates complex human requests into a Directed Acyclic Graph (DAG) for parallel, staged execution.'
  },
  {
    name: 'memory-archivist',
    domain: ['learning', 'memory'],
    type: 'specialist',
    priority: 'medium',
    description: 'Parses Durable Session Log (.jsonl) to extract, verify, and persist Tribunal Instincts.'
  }
];

let addedSpecs = 0;
for (const spec of missingSpecs) {
  if (!existingSpecNames.has(spec.name)) {
    specData.specialists.push(spec);
    addedSpecs++;
  }
}
fs.writeFileSync(SPECIALIST_REGISTRY, JSON.stringify(specData, null, 2) + '\n', 'utf8');
console.log(`✓ Synchronized specialist-registry.json (+${addedSpecs} specialists, total: ${specData.specialists.length})`);

// 2. Sync Slash Commands with Workflows
const slashData = JSON.parse(fs.readFileSync(SLASH_COMMANDS, 'utf8'));
const registeredCmdNames = new Set();
for (const c of slashData.commands) {
  registeredCmdNames.add(c.name.replace(/^\//, ''));
  (c.aliases || []).forEach(a => registeredCmdNames.add(a.replace(/^\//, '')));
}

const workflowFiles = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.md'));
let addedCmds = 0;

for (const file of workflowFiles) {
  const baseName = file.replace('.md', '');
  if (!registeredCmdNames.has(baseName)) {
    const content = fs.readFileSync(path.join(WORKFLOWS_DIR, file), 'utf8');
    const firstLine = content.split('\n')[0] || '';
    let desc = `Execute ${baseName} workflow.`;
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      desc = titleMatch[1].replace(/^\/[a-zA-Z0-9_-]+\s+[—–-]\s*/, '').trim();
    }

    const newCmd = {
      name: `/${baseName}`,
      description: desc,
      usage: `/${baseName} [arguments]`
    };

    slashData.commands.push(newCmd);
    registeredCmdNames.add(baseName);
    addedCmds++;
  }
}
fs.writeFileSync(SLASH_COMMANDS, JSON.stringify(slashData, null, 2) + '\n', 'utf8');
console.log(`✓ Synchronized slash-commands.json (+${addedCmds} commands, total: ${slashData.commands.length})`);

// 3. Sync Plugin Metadata
const diskSkillsCount = fs.readdirSync(SKILLS_DIR).filter(d => fs.statSync(path.join(SKILLS_DIR, d)).isDirectory()).length;
const pluginData = JSON.parse(fs.readFileSync(PLUGIN_JSON, 'utf8'));
pluginData.version = '9.4.0';
pluginData.specialists.total = specData.specialists.length;
pluginData.skills.total = diskSkillsCount;
pluginData.workflows.total = workflowFiles.length;
fs.writeFileSync(PLUGIN_JSON, JSON.stringify(pluginData, null, 2) + '\n', 'utf8');
console.log(`✓ Synchronized plugin.json (version: 9.4.0, skills: ${diskSkillsCount}, workflows: ${workflowFiles.length}, specialists: ${specData.specialists.length})`);

// 4. Sync Claude Metadata
const claudeData = JSON.parse(fs.readFileSync(CLAUDE_JSON, 'utf8'));
claudeData.version = '9.4.0';
fs.writeFileSync(CLAUDE_JSON, JSON.stringify(claudeData, null, 2) + '\n', 'utf8');
console.log(`✓ Synchronized claude.json (version: 9.4.0)`);

