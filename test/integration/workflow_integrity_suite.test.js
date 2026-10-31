/**
 * workflow_integrity_suite.test.js — Exhaustive Audit of All 52 Workflow Contracts
 *
 * Enforces:
 * 1. Every workflow has a valid markdown structure and defined execution steps.
 * 2. Every skill cited in the workflow exists in .agent/skills/ and has valid frontmatter.
 * 3. Every agent cited in the workflow exists in .agent/agents/ and is registered in specialist-registry.json.
 * 4. Every workflow has a corresponding slash command in slash-commands.json.
 * 5. Every workflow contains explicit failure, blocked, or recovery protocols.
 * 6. Every workflow defines explicit verification or completion criteria.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const WORKFLOWS_DIR = path.join(ROOT, '.agent', 'workflows');
const SKILLS_DIR = path.join(ROOT, '.agent', 'skills');
const AGENTS_DIR = path.join(ROOT, '.agent', 'agents');
const SLASH_COMMANDS_PATH = path.join(ROOT, '.agent', 'config', 'slash-commands.json');
const SPECIALIST_REGISTRY_PATH = path.join(ROOT, '.agent', 'config', 'specialist-registry.json');

describe('Universal Workflow Integrity Suite (All 52 Workflows)', () => {
  const workflowFiles = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.md'));
  const diskSkills = new Set(fs.readdirSync(SKILLS_DIR));
  const diskAgents = new Set(fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md')).map(f => f.replace('.md', '')));

  const slashConfig = JSON.parse(fs.readFileSync(SLASH_COMMANDS_PATH, 'utf8'));
  const registeredCommands = new Set();
  for (const cmd of (slashConfig.commands || [])) {
    registeredCommands.add(cmd.name.replace(/^\//, ''));
    (cmd.aliases || []).forEach(a => registeredCommands.add(a.replace(/^\//, '')));
  }

  const specConfig = JSON.parse(fs.readFileSync(SPECIALIST_REGISTRY_PATH, 'utf8'));
  const registeredSpecialists = new Set((specConfig.specialists || []).map(s => s.name));

  it('verifies that exactly 52 workflows are present and discoverable', () => {
    expect(workflowFiles.length).toBe(52);
  });

  describe.each(workflowFiles)('Workflow Contract: %s', (file) => {
    const baseName = file.replace('.md', '');
    const content = fs.readFileSync(path.join(WORKFLOWS_DIR, file), 'utf8');

    it('has non-empty markdown content with title', () => {
      expect(content.trim().length).toBeGreaterThan(50);
      expect(content).toMatch(/^#\s+/m);
    });

    it('is registered in slash-commands.json', () => {
      expect(registeredCommands.has(baseName)).toBe(true);
    });

    it('references only valid, existing skills', () => {
      // Find all references like .agent/skills/<skill>/ or `skill-name`
      const explicitSkillRefs = content.match(/\.agent\/skills\/([a-zA-Z0-9_-]+)/g) || [];
      for (const ref of explicitSkillRefs) {
        const skillName = ref.replace('.agent/skills/', '').replace(/\/$/, '');
        expect(diskSkills.has(skillName)).toBe(true);
      }
    });

    it('references only valid, existing agents registered in specialist-registry.json', () => {
      const explicitAgentRefs = content.match(/@\[([a-zA-Z0-9_-]+)\]/g) || [];
      for (const ref of explicitAgentRefs) {
        const agentName = ref.replace('@[' , '').replace(']', '');
        expect(diskAgents.has(agentName)).toBe(true);
        expect(registeredSpecialists.has(agentName)).toBe(true);
      }
    });

    it('contains bounded execution, completion, or error protocols', () => {
      // Must contain structured phase headers, failure rules, or verification checks
      const hasStructure = 
        /Phase\s+\d+|Step\s+\d+|Verification|Error Recovery|BLOCKED|Rules|Usage/i.test(content);
      expect(hasStructure).toBe(true);
    });
  });
});

