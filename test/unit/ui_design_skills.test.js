'use strict';

const fs = require('fs');
const path = require('path');

describe('UI Design Skills Portfolio (Unit)', () => {
  const skillsDir = path.resolve(__dirname, '../../.agent/skills');

  const all21TargetSkills = [
    // Core UI Responsibilities (1-10)
    'ui-design-director',
    'ui-implementation-engineer',
    'ui-design-system-engineer',
    'ui-visual-critic',
    'ui-responsive-engineer',
    'ui-interaction-motion-engineer',
    'ui-accessibility-engineer',
    'ui-browser-verification-engineer',
    'ui-performance-engineer',
    'ui-quality-gate-auditor',
    // Specialized UI Capabilities (11-21)
    'ui-reference-analyst',
    'ui-typography-specialist',
    'ui-layout-and-composition-engineer',
    'ui-component-state-engineer',
    'ui-content-and-microcopy-designer',
    'ui-design-system-migration-engineer',
    'ui-visual-regression-engineer',
    'ui-creative-direction-engineer',
    'ui-design-debt-auditor',
    'ui-low-llm-quality-optimizer',
    'ui-design-quality-benchmark-engineer',
  ];

  const upgradedCoreSkills = [
    'better-ui',
    'better-colors',
    'better-typography',
    'ui-reasoning-engine',
    'critique',
    'frontend-design',
    'adapt',
    'review-animations',
    'web-accessibility-auditor',
    'tribunal-ui',
  ];

  it('verifies all 21 skills in the target inventory are accounted for', () => {
    expect(all21TargetSkills.length).toBe(21);
  });

  it.each(all21TargetSkills)('verifies canonical inventory skill %s exists with valid frontmatter and VBC', (skillName) => {
    const skillPath = path.join(skillsDir, skillName, 'SKILL.md');
    expect(fs.existsSync(skillPath)).toBe(true);

    const content = fs.readFileSync(skillPath, 'utf8');
    expect(content.startsWith('---')).toBe(true);
    expect(content).toContain(`name: ${skillName}`);
    expect(content).toContain('version: 1.0.0');
    expect(content).toContain('trigger:');
    expect(content).toContain('Mandatory Pre-Flight Context Inspection');
    expect(content).toContain('Verification-Before-Completion');
  });

  it.each(upgradedCoreSkills)('verifies upgraded core skill %s has non-boilerplate description', (skillName) => {
    const skillPath = path.join(skillsDir, skillName, 'SKILL.md');
    expect(fs.existsSync(skillPath)).toBe(true);

    const content = fs.readFileSync(skillPath, 'utf8');
    const descMatch = content.match(/description:\s*([^\r\n]+)/);
    expect(descMatch).toBeTruthy();

    const desc = descMatch[1].trim();
    // Must NOT start with generic copy-pasted string
    expect(desc).not.toMatch(/^"Use when building, styling, optimizing, and auditing/);
    expect(desc).not.toMatch(/^"Use when implementing, optimizing, and timing 60fps/);
  });
});

