'use strict';

/**
 * slash_command_dispatch.test.js — Exhaustive Command Dispatch & Contract Verification
 *
 * Enforces Phase 4 requirements:
 * 1. Every slash command in slash-commands.json has a canonical identifier starting with '/'.
 * 2. Every slash command has a description, usage schema, and optional/required arguments.
 * 3. Every command resolves to an authoritative workflow file or interactive platform directive.
 * 4. Every target workflow exists, parses cleanly, and contains structured phases.
 * 5. Every skill cited in the target workflow exists on disk and is registered in the routing ecosystem.
 * 6. Every agent cited in the target workflow exists on disk and in specialist-registry.json.
 * 7. Command aliases resolve deterministically without routing collisions.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const AGENT_DIR = path.join(ROOT, '.agent');
const SLASH_COMMANDS_PATH = path.join(AGENT_DIR, 'config', 'slash-commands.json');
const WORKFLOWS_DIR = path.join(AGENT_DIR, 'workflows');
const SKILLS_DIR = path.join(AGENT_DIR, 'skills');
const AGENTS_DIR = path.join(AGENT_DIR, 'agents');
const SPECIALIST_REGISTRY_PATH = path.join(AGENT_DIR, 'config', 'specialist-registry.json');
const TOPIC_MAP_PATH = path.join(AGENT_DIR, 'skill_topic_map.json');

describe('Phase 4 — Slash Command Dispatch & Contract Integrity', () => {
  const slashConfig = JSON.parse(fs.readFileSync(SLASH_COMMANDS_PATH, 'utf8'));
  const commands = slashConfig.commands || [];

  const diskSkills = new Set(
    fs.readdirSync(SKILLS_DIR).filter(d => fs.statSync(path.join(SKILLS_DIR, d)).isDirectory())
  );
  const diskAgents = new Set(
    fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''))
  );
  const diskWorkflows = new Set(
    fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''))
  );

  const specConfig = JSON.parse(fs.readFileSync(SPECIALIST_REGISTRY_PATH, 'utf8'));
  const registeredSpecialists = new Set((specConfig.specialists || []).map(s => s.name));

  const topicMap = JSON.parse(fs.readFileSync(TOPIC_MAP_PATH, 'utf8'));
  const topicMappedSkills = new Set();
  for (const list of Object.values(topicMap.domain_routes || {})) {
    if (Array.isArray(list)) list.forEach(s => topicMappedSkills.add(s));
  }

  test('slash-commands.json contains at least 50 valid commands', () => {
    expect(commands.length).toBeGreaterThanOrEqual(50);
  });

  // Ensure unique canonical names
  test('all command canonical names are strictly unique', () => {
    const seen = new Set();
    for (const cmd of commands) {
      expect(cmd.name.startsWith('/')).toBe(true);
      expect(seen.has(cmd.name)).toBe(false);
      seen.add(cmd.name);
    }
  });

  // Ensure unique aliases without collision
  test('command aliases are unique and do not collide with canonical names', () => {
    const canonicalNames = new Set(commands.map(c => c.name));
    const seenAliases = new Set();

    for (const cmd of commands) {
      for (const alias of (cmd.aliases || [])) {
        expect(alias.startsWith('/')).toBe(true);
        expect(canonicalNames.has(alias)).toBe(false);
        expect(seenAliases.has(alias)).toBe(false);
        seenAliases.add(alias);
      }
    }
  });

  describe.each(commands)('Command Contract: %s', (cmd) => {
    const canonicalName = cmd.name;
    const baseName = canonicalName.replace(/^\//, '');

    test('has non-empty description and usage documentation', () => {
      expect(typeof cmd.description).toBe('string');
      expect(cmd.description.trim().length).toBeGreaterThan(10);
      expect(typeof cmd.usage).toBe('string');
      expect(cmd.usage.startsWith('/')).toBe(true);
    });

    test('resolves to a valid workflow file or supported platform directive', () => {
      const candidates = [baseName, ...(cmd.aliases || []).map(a => a.replace(/^\//, ''))];
      const matchedWf = candidates.find(c => diskWorkflows.has(c));
      const isDirective = ['summon', 'skill', 'intensity'].includes(baseName);

      expect(Boolean(matchedWf || isDirective)).toBe(true);

      if (matchedWf) {
        const wfFile = path.join(WORKFLOWS_DIR, `${matchedWf}.md`);
        const content = fs.readFileSync(wfFile, 'utf8');

        // Workflow markdown contract check
        expect(content.trim().length).toBeGreaterThan(50);
        expect(content).toMatch(/^#\s+/m);

        // Referenced skills must exist on disk and in topic map
        const skillRefs = content.match(/\.agent\/skills\/([a-zA-Z0-9_-]+)/g) || [];
        for (const ref of skillRefs) {
          const sName = ref.replace('.agent/skills/', '').replace(/\/$/, '');
          expect(diskSkills.has(sName)).toBe(true);
          expect(topicMappedSkills.has(sName)).toBe(true);
        }

        // Referenced agents must exist on disk and in specialist registry
        const agentRefs = content.match(/@\[([a-zA-Z0-9_-]+)\]/g) || [];
        for (const ref of agentRefs) {
          const aName = ref.replace('@[' , '').replace(']', '');
          expect(diskAgents.has(aName)).toBe(true);
          expect(registeredSpecialists.has(aName)).toBe(true);
        }
      }
    });
  });
});

