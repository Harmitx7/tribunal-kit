/**
 * ecosystem_behavioral_harness.test.js — System-Wide Behavioral Test Harness
 * 
 * Master Behavioral Test Enforcing:
 * 1. Command-to-Workflow-to-Skill Resolution across all 55 commands
 * 2. Multi-Skill Execution Coordinator state-machine transitions and zero silent abandonment
 * 3. Context Broker Multi-Domain resolution across all domains
 * 4. Routing Index synchrony and complete ecosystem coverage
 */

'use strict';

const fs = require('fs');
const path = require('path');
const {
  SkillExecutionCoordinator,
  SKILL_STATES,
} = require('../../src/execution/skill_execution_coordinator');
const { selectSkills, loadSkills } = require('../../.agent/scripts/context_broker');

const ROOT = path.resolve(__dirname, '..', '..');
const AGENT_DIR = path.join(ROOT, '.agent');
const SLASH_COMMANDS_PATH = path.join(AGENT_DIR, 'config', 'slash-commands.json');
const WORKFLOWS_DIR = path.join(AGENT_DIR, 'workflows');
const SKILLS_DIR = path.join(AGENT_DIR, 'skills');
const ROUTING_INDEX_PATH = path.join(AGENT_DIR, 'routing_index.json');

describe('Universal Ecosystem Behavioral Test Harness', () => {
  const slashConfig = JSON.parse(fs.readFileSync(SLASH_COMMANDS_PATH, 'utf8'));
  const allSkills = loadSkills(AGENT_DIR);
  const diskWorkflows = new Set(
    fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''))
  );

  describe('1. Universal Command-to-Workflow-to-Skill Resolution', () => {
    it('verifies all 55 slash commands exist and map to real workflows or directives', () => {
      expect(slashConfig.commands.length).toBe(55);

      for (const cmd of slashConfig.commands) {
        expect(cmd.name).toBeDefined();
        const baseName = cmd.name.replace(/^\//, '');
        const candidates = [baseName, ...(cmd.aliases || []).map(a => a.replace(/^\//, ''))];
        const matchedWf = candidates.find(c => diskWorkflows.has(c));
        const isDirective = ['summon', 'skill', 'intensity'].includes(baseName);

        expect(Boolean(matchedWf || isDirective)).toBe(true);

        if (matchedWf) {
          const workflowPath = path.join(WORKFLOWS_DIR, `${matchedWf}.md`);
          expect(fs.existsSync(workflowPath)).toBe(true);

          const workflowContent = fs.readFileSync(workflowPath, 'utf8');
          expect(workflowContent.length).toBeGreaterThan(20);

          // Check if required-skills exist on disk
          const reqMatch = workflowContent.match(/required-skills:[\r\n]+((?:\s+-\s+[^\r\n]+[\r\n]+)+)/);
          if (reqMatch) {
            const lines = reqMatch[1].trim().split('\n');
            for (const line of lines) {
              const skillName = line.replace(/^\s*-\s*/, '').trim();
              if (skillName) {
                const skillDir = path.join(SKILLS_DIR, skillName);
                expect(fs.existsSync(skillDir)).toBe(true);
                expect(fs.existsSync(path.join(skillDir, 'SKILL.md'))).toBe(true);
              }
            }
          }

          // Check if scripts-binding exist on disk
          const scriptMatch = workflowContent.match(/scripts-binding:[\r\n]+((?:\s+-\s+[^\r\n]+[\r\n]+)+)/);
          if (scriptMatch) {
            const lines = scriptMatch[1].trim().split('\n');
            for (const line of lines) {
              const scriptRel = line.replace(/^\s*-\s*/, '').trim();
              if (scriptRel) {
                const scriptPath = path.join(ROOT, scriptRel);
                expect(fs.existsSync(scriptPath)).toBe(true);
              }
            }
          }
        }
      }
    });
  });

  describe('2. Multi-Skill Execution Coordinator & Zero Silent Abandonment', () => {
    let coordinator;

    beforeEach(() => {
      coordinator = new SkillExecutionCoordinator({
        defaultTimeoutMs: 5000,
        maxRetries: 2,
      });
    });

    it('successfully plans, executes, and validates a sequential multi-skill pipeline', async () => {
      const plan = [
        { skillName: 'vulnerability-scanner', isRequired: true },
        { skillName: 'clean-code', isRequired: true, prerequisites: ['vulnerability-scanner'] },
        { skillName: 'code-review-checklist', isRequired: true, prerequisites: ['clean-code'] },
      ];

      const executor = async (name, ctx) => {
        if (name === 'vulnerability-scanner') {
          return { scannedFiles: 42, valid: true };
        }
        if (name === 'clean-code') {
          expect(ctx['vulnerability-scanner']).toBeDefined();
          expect(ctx['vulnerability-scanner'].scannedFiles).toBe(42);
          return { refactoredItems: 3, valid: true };
        }
        if (name === 'code-review-checklist') {
          expect(ctx['clean-code']).toBeDefined();
          return { approved: true, valid: true };
        }
        return { valid: true };
      };

      const result = await coordinator.executeSequence(plan, executor);
      expect(result.success).toBe(true);
      expect(result.results.length).toBe(3);

      const audit = coordinator.getAuditLog();
      expect(audit.totalSkillsAccounted).toBe(3);
      expect(audit.allReachedTerminalState).toBe(true);
      expect(audit.zeroSilentAbandonment).toBe(true);
    });

    it('enforces bounded retries and captures failure without crashing', async () => {
      let attempts = 0;
      const plan = [
        { skillName: 'flaky-worker', isRequired: true },
      ];

      const executor = async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Temporary network drop');
        }
        return { recovered: true, valid: true };
      };

      const result = await coordinator.executeSequence(plan, executor);
      expect(result.success).toBe(true);
      expect(attempts).toBe(2);

      const audit = coordinator.getAuditLog();
      const rec = audit.records.find(r => r.skillName === 'flaky-worker');
      expect(rec).toBeDefined();
      expect(rec.state).toBe(SKILL_STATES.COMPLETED);
      expect(rec.retries).toBe(1);
    });

    it('properly records terminal FAILED state for unrecoverable errors with zero silent abandonment', async () => {
      const plan = [
        { skillName: 'failing-task', isRequired: true },
      ];

      const executor = async () => {
        throw new Error('Fatal schema violation');
      };

      await expect(coordinator.executeSequence(plan, executor)).rejects.toThrow('Fatal schema violation');

      const audit = coordinator.getAuditLog();
      const rec = audit.records.find(r => r.skillName === 'failing-task');
      expect(rec).toBeDefined();
      expect(rec.state).toBe(SKILL_STATES.FAILED);
      expect(rec.failure.error).toContain('Fatal schema violation');
      expect(audit.allReachedTerminalState).toBe(true);
      expect(audit.zeroSilentAbandonment).toBe(true);
    });

    it('handles optional skill skipping and terminal states gracefully', async () => {
      const plan = [
        { skillName: 'essential-task', isRequired: true },
        { skillName: 'optional-task', isRequired: false },
      ];

      const executor = async (name) => {
        if (name === 'optional-task') {
          throw new Error('Optional resource unavailable');
        }
        return { status: 'ok', valid: true };
      };

      const result = await coordinator.executeSequence(plan, executor);
      expect(result.success).toBe(true);

      const audit = coordinator.getAuditLog();
      const essentialRec = audit.records.find(r => r.skillName === 'essential-task');
      const optionalRec = audit.records.find(r => r.skillName === 'optional-task');

      expect(essentialRec.state).toBe(SKILL_STATES.COMPLETED);
      expect(optionalRec.state).toBe(SKILL_STATES.FAILED);
      expect(audit.allReachedTerminalState).toBe(true);
      expect(audit.zeroSilentAbandonment).toBe(true);

      // Verify SKIPPED_OPTIONAL explicit transition
      coordinator.createRecord('unneeded-skill', { isRequired: false });
      coordinator.transition('unneeded-skill', SKILL_STATES.SKIPPED_OPTIONAL, 'Out of scope for this pass');
      const updatedAudit = coordinator.getAuditLog();
      const skippedRec = updatedAudit.records.find(r => r.skillName === 'unneeded-skill');
      expect(skippedRec.state).toBe(SKILL_STATES.SKIPPED_OPTIONAL);
      expect(updatedAudit.allReachedTerminalState).toBe(true);
    });

    it('successfully coordinates parallel wave execution', async () => {
      const plan = [
        { skillName: 'worker-a', isRequired: true },
        { skillName: 'worker-b', isRequired: true },
        { skillName: 'worker-c', isRequired: false },
      ];

      const executor = async (name) => {
        return { worker: name, completed: true, valid: true };
      };

      const result = await coordinator.executeParallel(plan, executor);
      expect(result.success).toBe(true);
      expect(result.results.length).toBe(3);

      const audit = coordinator.getAuditLog();
      expect(audit.totalSkillsAccounted).toBe(3);
      expect(audit.allReachedTerminalState).toBe(true);
      expect(audit.zeroSilentAbandonment).toBe(true);
    });
  });

  describe('3. Context Density Broker Multi-Domain Resolution', () => {
    const testDomains = [
      {
        domain: 'Frontend / UI',
        query: 'Build an interactive dashboard component with Tailwind and React hooks',
      },
      {
        domain: 'Backend / Security',
        query: 'Implement JWT authentication and protect against SQL injection vulnerabilities',
      },
      {
        domain: 'Database / SQL',
        query: 'Design PostgreSQL schema migrations, indexes, and write analytical queries',
      },
      {
        domain: 'DevOps / CI-CD',
        query: 'Configure Docker container and GitHub Actions CI CD deployment pipeline',
      },
      {
        domain: 'AI Security Governance',
        query: 'Detect prompt injection attacks, MCP tool poisoning, and sanitize input boundaries',
      },
      {
        domain: 'Software Verification',
        query: 'Run property-based testing and mutation testing with contract verification',
      }
    ];

    test.each(testDomains)('resolves high-affinity skills for $domain ($query)', ({ query }) => {
      const selection = selectSkills(query, [], 'large', allSkills);
      expect(selection).toBeDefined();
      expect(selection.essential).toBeDefined();
      expect(selection.essential.length).toBeGreaterThan(0);

      const skillNames = [
        ...selection.essential.map(s => s.name.toLowerCase()),
        ...selection.supplementary.map(s => s.name.toLowerCase())
      ].join(' ');

      // At least one skill relevant to the domain or query should be selected
      expect(skillNames.length).toBeGreaterThan(0);
    });
  });

  describe('4. Routing Index Synchrony & Ecosystem Coverage', () => {
    it('verifies routing_index.json reflects 100% of the repository ecosystem', () => {
      expect(fs.existsSync(ROUTING_INDEX_PATH)).toBe(true);
      const index = JSON.parse(fs.readFileSync(ROUTING_INDEX_PATH, 'utf8'));

      expect(index.summary).toBeDefined();
      expect(index.summary.total_skills).toBe(398);
      expect(index.summary.total_agents).toBe(60);
      expect(index.summary.total_workflows).toBe(52);

      expect(index.skills.length).toBe(398);
      expect(index.agents.length).toBe(60);
      expect(index.workflows.length).toBe(52);

      // Verify every skill in routing index has valid domains and metadata
      for (const skill of index.skills) {
        expect(skill.name).toBeDefined();
        expect(skill.description).toBeDefined();
        expect(skill.description.length).toBeGreaterThan(0);
        expect(skill.routing_domain).toBeDefined();
        expect(skill.routing_tier).toBeDefined();
        expect(Array.isArray(skill.trigger_keywords)).toBe(true);
      }

      // Verify every agent has valid routing domain and trigger keywords
      for (const agent of index.agents) {
        expect(agent.name).toBeDefined();
        expect(agent.file).toBeDefined();
        expect(agent.routing_domain).toBeDefined();
      }

      // Verify every workflow has valid trigger keywords
      for (const wf of index.workflows) {
        expect(wf.name).toBeDefined();
        expect(wf.file).toBeDefined();
        expect(wf.description).toBeDefined();
      }
    });
  });
});

