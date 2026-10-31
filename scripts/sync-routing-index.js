#!/usr/bin/env node
/**
 * sync-routing-index.js — Comprehensive Skill, Agent & Workflow Routing Index Generator
 *
 * Synchronizes `.agent/routing_index.json` to achieve 100% parity across:
 * - 398 Skills in .agent/skills/
 * - 60 Agents in .agent/agents/
 * - 52 Workflows in .agent/workflows/
 *
 * Ensures all components have accurate routing domains, tiers, descriptions,
 * and searchable trigger keywords.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const AGENT_DIR = path.join(ROOT, '.agent');
const SKILLS_DIR = path.join(AGENT_DIR, 'skills');
const AGENTS_DIR = path.join(AGENT_DIR, 'agents');
const WORKFLOWS_DIR = path.join(AGENT_DIR, 'workflows');
const TOPIC_MAP_PATH = path.join(AGENT_DIR, 'skill_topic_map.json');
const SLASH_COMMANDS_PATH = path.join(AGENT_DIR, 'config', 'slash-commands.json');
const SPECIALIST_REGISTRY_PATH = path.join(AGENT_DIR, 'config', 'specialist-registry.json');
const ROUTING_INDEX_PATH = path.join(AGENT_DIR, 'routing_index.json');

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const lines = match[1].split('\n');
  const result = {};
  let currentKey = null;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    if (line.startsWith('- ') && currentKey) {
      if (!Array.isArray(result[currentKey])) result[currentKey] = [];
      result[currentKey].push(line.slice(2).trim().replace(/^["']|["']$/g, ''));
      continue;
    }
    const idx = line.indexOf(':');
    if (idx !== -1) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      currentKey = key;
      if (val === '') {
        result[key] = [];
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

function extractKeywords(text, name = '') {
  const words = (name.replace(/-/g, ' ') + ' ' + (text || ''))
    .toLowerCase()
    .replace(/[^a-z0-9_\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
  const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'all', 'any', 'that', 'this', 'are', 'was']);
  return Array.from(new Set(words.filter(w => !stopWords.has(w)))).slice(0, 10);
}

function syncRoutingIndex() {
  console.log('\n  🧭 Synchronizing Tribunal Routing Index (.agent/routing_index.json)...');

  // 1. Topic Map reverse mapping
  const topicMap = JSON.parse(fs.readFileSync(TOPIC_MAP_PATH, 'utf8'));
  const skillToDomain = {};
  for (const [dom, list] of Object.entries(topicMap.domain_routes || {})) {
    if (Array.isArray(list)) {
      for (const s of list) skillToDomain[s] = dom;
    }
  }

  // 2. Slash Commands mapping
  const slashConfig = JSON.parse(fs.readFileSync(SLASH_COMMANDS_PATH, 'utf8'));
  const commandMap = new Map();
  for (const cmd of (slashConfig.commands || [])) {
    commandMap.set(cmd.name.replace(/^\//, ''), cmd);
    for (const a of (cmd.aliases || [])) {
      commandMap.set(a.replace(/^\//, ''), cmd);
    }
  }

  // 3. Specialist Registry mapping
  const specRegistry = JSON.parse(fs.readFileSync(SPECIALIST_REGISTRY_PATH, 'utf8'));
  const specialistMap = new Map();
  for (const s of (specRegistry.specialists || [])) {
    specialistMap.set(s.name, s);
  }

  // 4. Build Agents Index
  const agentFiles = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md')).sort();
  const agents = agentFiles.map(file => {
    const name = file.replace('.md', '');
    const content = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8');
    const fm = parseFrontmatter(content);
    const spec = specialistMap.get(name) || {};

    const domain = fm.domain || spec.domain || (name.includes('security') ? 'security' : name.includes('ui') ? 'frontend' : 'general');
    const tier = (name === 'orchestrator' || name === 'logic-reviewer' || name === 'security-auditor' || name === 'project-planner') ? 'core' : 'specialized';
    const description = fm.description || spec.description || `Autonomous specialist agent for ${name.replace(/-/g, ' ')}.`;
    const triggerKeywords = Array.isArray(fm.trigger) && fm.trigger.length > 0
      ? fm.trigger
      : extractKeywords(description, name);

    return {
      name,
      file: `agents/${file}`,
      type: name.includes('reviewer') || name.includes('auditor') ? 'reviewer' : 'specialist',
      routing_domain: domain,
      routing_tier: tier,
      description,
      trigger_keywords: triggerKeywords,
    };
  });

  // 5. Build Workflows Index
  const workflowFiles = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.md')).sort();
  const workflows = workflowFiles.map(file => {
    const name = file.replace('.md', '');
    const cmd = commandMap.get(name) || {};
    const content = fs.readFileSync(path.join(WORKFLOWS_DIR, file), 'utf8');
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : name;
    const description = cmd.description || title;
    const commandName = cmd.name || `/${name}`;

    const domain = name.includes('tribunal') ? 'tribunal' : name.includes('audit') ? 'audit' : 'general';
    const tier = ['understand', 'tribunal-understand', 'generate', 'create', 'audit', 'plan', 'test'].includes(name) ? 'core' : 'specialized';

    const triggers = new Set([name, commandName.replace(/^\//, '')]);
    if (cmd.aliases) {
      cmd.aliases.forEach(a => triggers.add(a.replace(/^\//, '')));
    }
    extractKeywords(description, name).forEach(k => triggers.add(k));

    return {
      command: commandName,
      name,
      file: `workflows/${file}`,
      description,
      routing_domain: domain,
      routing_tier: tier,
      trigger_keywords: Array.from(triggers).slice(0, 10),
    };
  });

  // 6. Build Skills Index
  const skillDirs = fs.readdirSync(SKILLS_DIR).filter(d => fs.statSync(path.join(SKILLS_DIR, d)).isDirectory()).sort();
  const skills = skillDirs.map(name => {
    const skillPath = path.join(SKILLS_DIR, name, 'SKILL.md');
    let description = `Skill pack for ${name.replace(/-/g, ' ')}.`;
    let triggerKeywords = [name.replace(/-/g, ' ')];
    let domain = skillToDomain[name] || 'general';

    if (fs.existsSync(skillPath)) {
      const content = fs.readFileSync(skillPath, 'utf8');
      const fm = parseFrontmatter(content);
      if (fm.description) description = fm.description;
      if (Array.isArray(fm.trigger) && fm.trigger.length > 0) {
        triggerKeywords = fm.trigger;
      } else {
        triggerKeywords = extractKeywords(description, name);
      }
    }

    const tier = ['clean-code', 'systematic-debugging', 'error-resilience', 'api-patterns', 'testing-patterns'].includes(name) ? 'core' : 'specialized';

    return {
      name,
      description,
      routing_domain: domain,
      routing_tier: tier,
      trigger_keywords: triggerKeywords,
    };
  });

  const routingIndex = {
    version: '9.4.0',
    last_updated: new Date().toISOString().split('T')[0],
    summary: {
      total_agents: agents.length,
      total_workflows: workflows.length,
      total_skills: skills.length,
    },
    agents,
    workflows,
    skills,
  };

  fs.writeFileSync(ROUTING_INDEX_PATH, JSON.stringify(routingIndex, null, 2), 'utf8');

  console.log(`  ✓ Indexed Agents:    ${agents.length}`);
  console.log(`  ✓ Indexed Workflows: ${workflows.length}`);
  console.log(`  ✓ Indexed Skills:    ${skills.length}`);
  console.log(`  ✔ Routing index saved to: ${path.relative(ROOT, ROUTING_INDEX_PATH)}\n`);

  return routingIndex;
}

if (require.main === module) {
  syncRoutingIndex();
}

module.exports = { syncRoutingIndex };

