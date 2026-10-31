#!/usr/bin/env node
/**
 * audit_system_graph.js — Canonical Dependency and Execution Graph Builder & Validator
 *
 * Traverses:
 * - 398 Skills (.agent/skills/)
 * - 52 Workflows (.agent/workflows/)
 * - 60 Agents (.agent/agents/)
 * - Slash Commands Registry (.agent/config/slash-commands.json)
 * - Specialist Registry (.agent/config/specialist-registry.json)
 * - Skill Topic Map (.agent/skill_topic_map.json)
 * - Routing Index (.agent/routing_index.json)
 *
 * Detects:
 * - Broken references
 * - Orphaned capabilities
 * - Unmapped workflows / dead slash commands
 * - Missing agent registrations
 * - Skill circular dependencies
 * - Mandatory invocation paths
 *
 * Emits:
 * - benchmarks/artifacts/canonical_execution_graph.json
 * - benchmarks/artifacts/complete_skill_dependency_graph.json
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const AGENT_DIR = path.join(ROOT, '.agent');
const SKILLS_DIR = path.join(AGENT_DIR, 'skills');
const WORKFLOWS_DIR = path.join(AGENT_DIR, 'workflows');
const AGENTS_DIR = path.join(AGENT_DIR, 'agents');
const SCRIPTS_DIR = path.join(AGENT_DIR, 'scripts');
const TOPIC_MAP_PATH = path.join(AGENT_DIR, 'skill_topic_map.json');
const SLASH_COMMANDS_PATH = path.join(AGENT_DIR, 'config', 'slash-commands.json');
const SPECIALIST_REGISTRY_PATH = path.join(AGENT_DIR, 'config', 'specialist-registry.json');
const ROUTING_INDEX_PATH = path.join(AGENT_DIR, 'routing_index.json');

const { getAssociatedScript } = require(path.join(SCRIPTS_DIR, 'skill_integrator'));

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

function auditGraph() {
  const issues = [];
  const warnings = [];

  // 1. Discover all disk skills
  const diskSkills = new Set(
    fs.readdirSync(SKILLS_DIR).filter(d => fs.statSync(path.join(SKILLS_DIR, d)).isDirectory())
  );

  // 2. Discover all disk workflows
  const diskWorkflows = new Set(
    fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''))
  );

  // 3. Discover all disk agents
  const diskAgents = new Set(
    fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''))
  );

  // 4. Load Topic Map
  const topicMap = JSON.parse(fs.readFileSync(TOPIC_MAP_PATH, 'utf8'));
  const topicMappedSkills = new Set();
  for (const list of Object.values(topicMap.domain_routes || {})) {
    if (Array.isArray(list)) list.forEach(s => topicMappedSkills.add(s));
  }

  // 5. Load Slash Commands
  const slashConfig = JSON.parse(fs.readFileSync(SLASH_COMMANDS_PATH, 'utf8'));
  const registeredCommands = new Map();
  for (const cmd of (slashConfig.commands || [])) {
    const primary = cmd.name.replace(/^\//, '');
    registeredCommands.set(primary, cmd);
    for (const alias of (cmd.aliases || [])) {
      registeredCommands.set(alias.replace(/^\//, ''), cmd);
    }
  }

  // 6. Load Specialist Registry
  const specRegistry = JSON.parse(fs.readFileSync(SPECIALIST_REGISTRY_PATH, 'utf8'));
  const registeredSpecialists = new Set((specRegistry.specialists || []).map(s => s.name));

  // 7. Load Routing Index if present
  let routingIndexSkills = new Set();
  if (fs.existsSync(ROUTING_INDEX_PATH)) {
    try {
      const ri = JSON.parse(fs.readFileSync(ROUTING_INDEX_PATH, 'utf8'));
      routingIndexSkills = new Set((ri.skills || []).map(s => s.name));
    } catch (_) {}
  }

  // Graph data structures
  const graph = {
    nodes: {
      skills: diskSkills.size,
      workflows: diskWorkflows.size,
      agents: diskAgents.size,
      commands: registeredCommands.size,
      specialists: registeredSpecialists.size,
      domains: Object.keys(topicMap.domain_routes || {}).length,
    },
    edges: [],
    orphans: {
      unmappedSkills: [],
      unregisteredAgents: [],
      unregisteredWorkflows: [],
      uninvokedSkills: [],
    },
    brokenReferences: [],
    circularDependencies: [],
  };

  // Helper to add edge with evidence & status
  function addEdge(from, to, type, evidence, status = 'VERIFIED') {
    graph.edges.push({
      from,
      to,
      type,
      evidence: evidence || type,
      status,
    });
  }

  // Check 1: Skills vs Topic Map & Routing Index
  for (const skill of diskSkills) {
    if (!topicMappedSkills.has(skill)) {
      issues.push(`Skill '${skill}' exists on disk but is unmapped in skill_topic_map.json`);
      graph.orphans.unmappedSkills.push(skill);
    }
    if (routingIndexSkills.size > 0 && !routingIndexSkills.has(skill)) {
      warnings.push(`Skill '${skill}' exists on disk but is missing in routing_index.json`);
    }
  }

  for (const skill of topicMappedSkills) {
    if (!diskSkills.has(skill)) {
      issues.push(`Skill '${skill}' in skill_topic_map.json does NOT exist on disk`);
      graph.brokenReferences.push({ source: 'skill_topic_map.json', target: skill, type: 'missing_skill' });
    }
  }

  // Check 2: Agents vs Specialist Registry
  for (const agent of diskAgents) {
    if (!registeredSpecialists.has(agent)) {
      warnings.push(`Agent '${agent}' exists in .agent/agents/ but is missing from specialist-registry.json`);
      graph.orphans.unregisteredAgents.push(agent);
    }
  }
  for (const regAgent of registeredSpecialists) {
    if (!diskAgents.has(regAgent)) {
      issues.push(`Agent '${regAgent}' in specialist-registry.json does NOT exist in .agent/agents/`);
      graph.brokenReferences.push({ source: 'specialist-registry.json', target: regAgent, type: 'missing_agent' });
    }
  }

  // Check 3: Commands -> Workflows or Directives
  for (const cmdObj of (slashConfig.commands || [])) {
    const primaryName = cmdObj.name.replace(/^\//, '');
    const aliases = (cmdObj.aliases || []).map(a => a.replace(/^\//, ''));
    const allNames = [primaryName, ...aliases];

    // Find matching workflow
    let matchingWf = null;
    for (const n of allNames) {
      if (diskWorkflows.has(n)) {
        matchingWf = n;
        break;
      }
    }

    if (matchingWf) {
      addEdge(`command:${primaryName}`, `workflow:${matchingWf}`, 'command_invokes_workflow', `Primary command ${cmdObj.name} maps to workflows/${matchingWf}.md`);
      for (const alias of aliases) {
        addEdge(`command:${alias}`, `workflow:${matchingWf}`, 'command_alias_invokes_workflow', `Alias /${alias} maps to workflows/${matchingWf}.md`);
      }
    } else if (['summon', 'skill', 'intensity'].includes(primaryName)) {
      addEdge(`command:${primaryName}`, `platform:directive`, 'command_dynamic_directive', `Interactive environment directive: ${cmdObj.description}`);
    } else {
      warnings.push(`Command '${primaryName}' has no matching markdown workflow in .agent/workflows/`);
      graph.brokenReferences.push({ source: `command:${primaryName}`, target: `workflow:${primaryName}`, type: 'unresolved_workflow' });
    }
  }

  // Check 4: Workflows vs Skills, Agents & Invocations
  const invokedSkills = new Set();

  for (const wf of diskWorkflows) {
    const content = fs.readFileSync(path.join(WORKFLOWS_DIR, `${wf}.md`), 'utf8');
    const hasCommand = registeredCommands.has(wf);
    if (!hasCommand) {
      warnings.push(`Workflow '${wf}.md' has no corresponding slash command registered in slash-commands.json`);
      graph.orphans.unregisteredWorkflows.push(wf);
    }

    // Scan for skill references (.agent/skills/<skill>/ or `skill-name`)
    for (const skill of diskSkills) {
      if (content.includes(`skills/${skill}`) || content.includes(`\`${skill}\``)) {
        invokedSkills.add(skill);
        addEdge(`workflow:${wf}`, `skill:${skill}`, 'workflow_invokes_skill', `Cited in workflows/${wf}.md`);
      }
    }

    // Scan for agent references (@[agent-name], agents/<agent>, or `agent-name`)
    for (const agent of diskAgents) {
      if (content.includes(`agents/${agent}`) || content.includes(`\`${agent}\``) || content.includes(`@[${agent}]`)) {
        addEdge(`workflow:${wf}`, `agent:${agent}`, 'workflow_invokes_agent', `Cited in workflows/${wf}.md`);
      }
    }
  }

  for (const skill of diskSkills) {
    if (!invokedSkills.has(skill)) {
      graph.orphans.uninvokedSkills.push(skill);
    }
  }

  // Check 5: Skill contracts, script bindings & dependencies
  const skillDependencies = new Map();

  for (const skill of diskSkills) {
    const skillDir = path.join(SKILLS_DIR, skill);
    const skillMd = path.join(skillDir, 'SKILL.md');
    if (!fs.existsSync(skillMd)) {
      issues.push(`Skill directory '${skill}' is missing SKILL.md`);
      continue;
    }
    const content = fs.readFileSync(skillMd, 'utf8');
    const fm = parseFrontmatter(content);
    const deps = new Set();

    // 5a. Explicit dependencies from frontmatter 'skills:'
    if (Array.isArray(fm.skills)) {
      for (const reqSkill of fm.skills) {
        if (diskSkills.has(reqSkill)) {
          deps.add(reqSkill);
          addEdge(`skill:${skill}`, `skill:${reqSkill}`, 'skill_requires_skill', `Declared in frontmatter skills: of ${skill}/SKILL.md`);
        } else if (diskAgents.has(reqSkill)) {
          addEdge(`skill:${skill}`, `agent:${reqSkill}`, 'skill_governed_by_agent', `Governing specialist agent declared in frontmatter skills: of ${skill}/SKILL.md`);
        } else {
          issues.push(`Skill '${skill}' requires non-existent skill or agent '${reqSkill}' in frontmatter`);
          graph.brokenReferences.push({ source: `skill:${skill}`, target: `skill:${reqSkill}`, type: 'missing_dependency' });
        }
      }
    }

    // 5b. Associated executable script binding
    const associatedScript = getAssociatedScript(skillDir, SCRIPTS_DIR);
    if (associatedScript) {
      const scriptExists = fs.existsSync(path.resolve(ROOT, associatedScript));
      addEdge(`skill:${skill}`, `script:${associatedScript}`, 'skill_invokes_script', `Mapped script binding for ${skill}`, scriptExists ? 'VERIFIED' : 'INVALID');
      if (!scriptExists) {
        issues.push(`Skill '${skill}' binds to missing script '${associatedScript}'`);
      }
    }

    // 5c. Contextual documentation cross-references
    for (const otherSkill of diskSkills) {
      if (otherSkill === skill) continue;
      if (!deps.has(otherSkill) && (content.includes(`skills/${otherSkill}`) || content.includes(`\`${otherSkill}\``))) {
        addEdge(`skill:${skill}`, `skill:${otherSkill}`, 'skill_references_skill', `Referenced in markdown body of ${skill}/SKILL.md`);
      }
    }

    skillDependencies.set(skill, deps);
  }

  // Check 6: Domain Router Edges
  for (const [dom, list] of Object.entries(topicMap.domain_routes || {})) {
    if (Array.isArray(list)) {
      for (const skill of list) {
        if (diskSkills.has(skill)) {
          addEdge(`router:topic_map:${dom}`, `skill:${skill}`, 'router_selects_skill', `Registered in skill_topic_map.json under domain '${dom}'`);
        }
      }
    }
  }

  // Check 7: Cycle detection on hard dependencies (DFS)
  const visited = new Set();
  const recStack = new Set();
  const cycles = [];

  function detectCycle(node, pathArr) {
    visited.add(node);
    recStack.add(node);
    const neighbors = skillDependencies.get(node) || new Set();

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        detectCycle(neighbor, [...pathArr, neighbor]);
      } else if (recStack.has(neighbor)) {
        cycles.push([...pathArr, neighbor]);
      }
    }
    recStack.delete(node);
  }

  for (const skill of diskSkills) {
    if (!visited.has(skill)) {
      detectCycle(skill, [skill]);
    }
  }

  graph.circularDependencies = cycles;
  if (cycles.length > 0) {
    warnings.push(`Detected ${cycles.length} potential cyclic references across hard skill dependencies`);
  }

  return {
    graph,
    issues,
    warnings,
    summary: {
      skills: diskSkills.size,
      workflows: diskWorkflows.size,
      agents: diskAgents.size,
      registeredCommands: registeredCommands.size,
      registeredSpecialists: registeredSpecialists.size,
      edgesCount: graph.edges.length,
      issuesCount: issues.length,
      warningsCount: warnings.length,
      uninvokedSkillsCount: graph.orphans.uninvokedSkills.length,
    }
  };
}

if (require.main === module) {
  console.log('Building and auditing Canonical Dependency and Execution Graph...');
  const result = auditGraph();
  console.log('\nGraph Statistics:');
  console.log(`  • Skills:                 ${result.summary.skills}`);
  console.log(`  • Workflows:              ${result.summary.workflows}`);
  console.log(`  • Agents:                 ${result.summary.agents}`);
  console.log(`  • Registered Commands:    ${result.summary.registeredCommands}`);
  console.log(`  • Registered Specialists: ${result.summary.registeredSpecialists}`);
  console.log(`  • Graph Edges Mapped:     ${result.summary.edgesCount}`);
  console.log(`  • Hard Issues Found:      ${result.summary.issuesCount}`);
  console.log(`  • Warnings / Gaps Found:  ${result.summary.warningsCount}`);
  console.log(`  • Uninvoked Skills Count: ${result.summary.uninvokedSkillsCount}`);

  if (result.issues.length > 0) {
    console.log('\nHard Issues:');
    result.issues.forEach(i => console.log(`  ✖ ${i}`));
  }

  if (result.warnings.length > 0) {
    console.log(`\nWarnings & Gaps (${result.warnings.length}):`);
    result.warnings.slice(0, 15).forEach(w => console.log(`  ⚠ ${w}`));
    if (result.warnings.length > 15) {
      console.log(`  ... and ${result.warnings.length - 15} more.`);
    }
  }

  const outCanonical = path.join(ROOT, 'benchmarks', 'artifacts', 'canonical_execution_graph.json');
  const outComplete = path.join(ROOT, 'benchmarks', 'artifacts', 'complete_skill_dependency_graph.json');
  fs.mkdirSync(path.dirname(outCanonical), { recursive: true });
  fs.writeFileSync(outCanonical, JSON.stringify(result, null, 2), 'utf8');
  fs.writeFileSync(outComplete, JSON.stringify(result, null, 2), 'utf8');
  console.log(`\n✔ Canonical graph artifact saved to: ${path.relative(ROOT, outCanonical)}`);
  console.log(`✔ Complete graph artifact saved to:  ${path.relative(ROOT, outComplete)}`);

  process.exit(result.issues.length > 0 ? 1 : 0);
}

module.exports = { auditGraph };
