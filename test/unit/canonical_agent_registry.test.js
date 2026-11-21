'use strict';

const fs = require('fs');
const path = require('path');
const {
  getCanonicalRegistry,
  listAllAgents,
  listProductionAgents,
  listReviewers,
  listSpecialists,
  resolveAgent,
  getRegistrySummary,
  GHOST_AGENT_REPLACEMENTS,
} = require('../../src/execution/canonical_registry');
const { REVIEWER_CATALOG } = require('../../src/system1/reviewer_orchestrator');
const { resolveReviewerSpec } = require('../../src/execution/reviewer_registry');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const AGENTS_DIR = path.join(REPO_ROOT, '.agent', 'agents');
const PLUGIN_JSON_PATH = path.join(REPO_ROOT, '.agent', 'config', 'plugin.json');
const REGISTRY_PATH = path.join(REPO_ROOT, '.agent', 'config', 'specialist-registry.json');
const SWARM_DISPATCHER_PATH = path.join(REPO_ROOT, '.agent', 'scripts', 'swarm_dispatcher.js');

describe('STAGE 1: Canonical Agent Registry & Architectural Validation', () => {
  let registry;

  beforeAll(() => {
    registry = getCanonicalRegistry(REPO_ROOT, true);
  });

  // 1. Unique agent IDs
  test('1. Unique agent IDs: every agent name in canonical registry is unique', () => {
    const names = registry.specialists.map(s => s.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  // 2. Valid persona paths
  test('2. Valid persona paths: every registered agent exists as a markdown file on disk', () => {
    const allAgents = listAllAgents(REPO_ROOT);
    expect(allAgents.length).toBe(64);

    for (const agent of allAgents) {
      const filePath = path.join(AGENTS_DIR, `${agent.name}.md`);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  // 3. Required frontmatter
  test('3. Required frontmatter: every .agent/agents/*.md file has valid name, description, and version', () => {
    const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));
    expect(files.length).toBe(64);

    for (const file of files) {
      const fullPath = path.join(AGENTS_DIR, file);
      const content = fs.readFileSync(fullPath, 'utf8');
      const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      expect(match).not.toBeNull();

      const fm = match[1];
      const nameMatch = fm.match(/^name:\s*(.+)$/m);
      const descMatch = fm.match(/^description:\s*(.+)$/m);
      const versionMatch = fm.match(/^version:\s*(.+)$/m);

      expect(nameMatch).not.toBeNull();
      expect(nameMatch[1].trim()).toBe(file.replace('.md', ''));
      expect(descMatch).not.toBeNull();
      expect(descMatch[1].trim().length).toBeGreaterThan(0);
      expect(versionMatch).not.toBeNull();
    }
  });

  // 4. No unapproved ghost references
  test('4. No unapproved ghost references: ghost identifiers resolve to canonical replacements', () => {
    const ghostNames = Object.keys(GHOST_AGENT_REPLACEMENTS);
    for (const ghost of ghostNames) {
      // Must not exist as file on disk
      expect(fs.existsSync(path.join(AGENTS_DIR, `${ghost}.md`))).toBe(false);

      // Must resolve through resolveAgent to canonical target
      const resolved = resolveAgent(ghost, {}, REPO_ROOT);
      expect(resolved).not.toBeNull();
      expect(resolved.name).toBe(GHOST_AGENT_REPLACEMENTS[ghost].target);
      expect(resolved.aliasedFrom).toBe(ghost);
      expect(resolved.requiredSkill).toBe(GHOST_AGENT_REPLACEMENTS[ghost].skill);
    }
  });

  // 5. Deprecated agents excluded from production routing
  test('5. Deprecated agents excluded from production routing: api-architect, ui-ux-auditor, ui-visual-auditor', () => {
    const prodAgents = listProductionAgents(REPO_ROOT).map(a => a.name);
    const prodReviewers = listReviewers({}, REPO_ROOT).map(r => r.name);

    expect(prodAgents).not.toContain('api-architect');
    expect(prodAgents).not.toContain('ui-ux-auditor');
    expect(prodAgents).not.toContain('ui-visual-auditor');

    expect(prodReviewers).not.toContain('ui-ux-auditor');
    expect(prodReviewers).not.toContain('ui-visual-auditor');
  });

  // 6. Experimental agents excluded by default
  test('6. Experimental agents excluded by default: backend-security-architect requires explicit opt-in', () => {
    const prodAgents = listProductionAgents(REPO_ROOT).map(a => a.name);
    expect(prodAgents).not.toContain('backend-security-architect');

    // Throws error on un-opted resolution
    expect(() => resolveAgent('backend-security-architect', {}, REPO_ROOT)).toThrow(
      /EXPERIMENTAL_AGENT_REJECTED/,
    );

    // Resolves cleanly with opt-in
    const optedIn = resolveAgent(
      'backend-security-architect',
      { enableExperimental: true },
      REPO_ROOT,
    );
    expect(optedIn).not.toBeNull();
    expect(optedIn.name).toBe('backend-security-architect');
    expect(optedIn.isExperimental).toBe(true);
  });

  // 7. Valid successor mappings
  test('7. Valid successor mappings: every deprecated agent has a valid active successor', () => {
    const allAgents = listAllAgents(REPO_ROOT);
    const deprecated = allAgents.filter(a => a.status === 'deprecated');
    expect(deprecated.length).toBe(3);

    for (const dep of deprecated) {
      expect(dep.successor).toBeDefined();
      const successor = resolveAgent(dep.successor, {}, REPO_ROOT);
      expect(successor).not.toBeNull();
      expect(successor.status).toBe('production');

      // Transparent redirect test
      const redirected = resolveAgent(dep.name, {}, REPO_ROOT);
      expect(redirected.name).toBe(dep.successor);
      expect(redirected.redirectedFrom).toBe(dep.name);
    }
  });

  // 8. Reviewer count consistency
  test('8. Reviewer count consistency: 28 total reviewers (26 active production + 2 deprecated)', () => {
    const allReviewers = listReviewers({ includeDeprecated: true }, REPO_ROOT);
    const activeReviewers = listReviewers({}, REPO_ROOT);

    expect(allReviewers.length).toBe(28);
    expect(activeReviewers.length).toBe(26);

    const summary = getRegistrySummary(REPO_ROOT);
    expect(summary.reviewers).toBe(28);
    expect(summary.active_reviewers).toBe(26);
  });

  // 9. Registry-to-plugin consistency
  test('9. Registry-to-plugin consistency: plugin.json matches canonical counts', () => {
    const pluginJson = JSON.parse(fs.readFileSync(PLUGIN_JSON_PATH, 'utf8'));
    const summary = getRegistrySummary(REPO_ROOT);

    expect(pluginJson.specialists.total).toBe(summary.total);
    expect(pluginJson.specialists.total).toBe(64);
    expect(pluginJson.specialists.reviewers).toBe(summary.reviewers);
    expect(pluginJson.specialists.reviewers).toBe(28);
    expect(pluginJson.description).toContain('64 specialists');
    expect(pluginJson.description).toContain('28 parallel reviewers');
  });

  // 10. Registry-to-orchestrator consistency
  test('10. Registry-to-orchestrator consistency: REVIEWER_CATALOG contains all 26 active production reviewers', () => {
    expect(REVIEWER_CATALOG.length).toBe(26);

    const activeReviewerNames = new Set(listReviewers({}, REPO_ROOT).map(r => r.name));
    for (const catalogItem of REVIEWER_CATALOG) {
      expect(activeReviewerNames.has(catalogItem.name)).toBe(true);
    }

    // Deprecated and experimental must be absent
    const catalogNames = REVIEWER_CATALOG.map(c => c.name);
    expect(catalogNames).not.toContain('ui-ux-auditor');
    expect(catalogNames).not.toContain('ui-visual-auditor');
    expect(catalogNames).not.toContain('backend-security-architect');
  });

  // 11. Registry-to-swarm consistency
  test('11. Registry-to-swarm consistency: TRIBUNAL_WAVES contain valid active reviewers and zero ghosts', () => {
    const dispatcherContent = fs.readFileSync(SWARM_DISPATCHER_PATH, 'utf8');

    // Ghosts must not appear in dispatcher waves
    expect(dispatcherContent).not.toContain("'review-animations'");
    expect(dispatcherContent).not.toContain('"review-animations"');

    // Deprecated reviewers must not appear in waves
    expect(dispatcherContent).not.toContain("'ui-ux-auditor'");
    expect(dispatcherContent).not.toContain("'ui-visual-auditor'");
  });

  // 12. Documentation classification
  test('12. Documentation classification: documentation files moved out of .agent/agents/ to docs/swarm/', () => {
    expect(fs.existsSync(path.join(AGENTS_DIR, 'swarm-worker-contracts.md'))).toBe(false);
    expect(fs.existsSync(path.join(AGENTS_DIR, 'swarm-worker-registry.md'))).toBe(false);

    expect(fs.existsSync(path.join(REPO_ROOT, 'docs', 'swarm', 'swarm-worker-contracts.md'))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(REPO_ROOT, 'docs', 'swarm', 'swarm-worker-registry.md'))).toBe(
      true,
    );
  });

  // 13. resolveReviewerSpec integration
  test('13. resolveReviewerSpec: resolves canonical reviewer instructions and handles successor redirect', () => {
    // Normal active reviewer
    const secSpec = resolveReviewerSpec('security-auditor', REPO_ROOT);
    expect(secSpec.id).toBe('security-auditor');
    expect(secSpec.name).toContain('Security Auditor');
    expect(secSpec.instructions.length).toBeGreaterThan(20);

    // Deprecated redirect
    const depSpec = resolveReviewerSpec('ui-ux-auditor', REPO_ROOT);
    expect(depSpec.id).toBe('frontend-reviewer');
    expect(depSpec.redirectedFrom).toBe('ui-ux-auditor');

    // Ghost alias redirect
    const ghostSpec = resolveReviewerSpec('review-animations', REPO_ROOT);
    expect(ghostSpec.id).toBe('frontend-reviewer');
    expect(ghostSpec.redirectedFrom).toBe('review-animations');
  });
});
