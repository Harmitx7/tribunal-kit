'use strict';

const fs = require('fs');
const path = require('path');

describe('Phase 9 — Documentation Integrity & Developer Experience Validation', () => {
  const repoRoot = path.resolve(__dirname, '../..');

  const docFiles = [
    'README.md',
    'SECURITY.md',
    'CONTRIBUTING.md',
    'docs/README.md',
    'docs/GETTING_STARTED.md',
    'docs/API_REFERENCE.md',
    'docs/MCP_GUIDE.md',
    'docs/AUTHORING_GUIDE.md',
    'docs/security/CAPABILITY_INVENTORY.md',
  ];

  describe('1. File existence and non-empty checks', () => {
    test.each(docFiles)('documentation file %s exists and is non-empty', relPath => {
      const fullPath = path.join(repoRoot, relPath);
      expect(fs.existsSync(fullPath)).toBe(true);
      const stat = fs.statSync(fullPath);
      expect(stat.size).toBeGreaterThan(100);
    });
  });

  describe('2. Markdown relative links resolve to real targets', () => {
    test.each(docFiles)('all local file links in %s resolve', relPath => {
      const fullPath = path.join(repoRoot, relPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      const docDir = path.dirname(fullPath);

      // Matches markdown links [label](target) ignoring images or protocols (http, mailto, anchor #)
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let match;
      const checkedLinks = [];

      while ((match = linkRegex.exec(content)) !== null) {
        const target = match[2].trim();
        // Skip external, anchors, mailto
        if (
          target.startsWith('http://') ||
          target.startsWith('https://') ||
          target.startsWith('#') ||
          target.startsWith('mailto:') ||
          target.startsWith('tribunal://')
        ) {
          continue;
        }

        // Clean anchor fragments if present
        const cleanTarget = target.split('#')[0];
        if (!cleanTarget) continue;

        const resolvedPath = path.resolve(docDir, cleanTarget);
        checkedLinks.push({ target, resolvedPath });
        expect(fs.existsSync(resolvedPath)).toBe(true);
      }

      expect(checkedLinks.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('3. Core image and SVG asset existence', () => {
    const assets = [
      'docs/assets/tribunal-hero-header.svg',
      'docs/assets/realtime-difference.svg',
      'docs/assets/superpowers-grid.svg',
      'docs/assets/tribunal-pipeline.svg',
      'docs/assets/shield-badge-banner.svg',
    ];

    test.each(assets)('asset %s exists on disk', relAsset => {
      const assetPath = path.join(repoRoot, relAsset);
      expect(fs.existsSync(assetPath)).toBe(true);
      expect(fs.statSync(assetPath).size).toBeGreaterThan(500);
    });
  });

  describe('4. Minimal supply-chain dependency contract verification', () => {
    test('package.json has exactly 1 runtime dependency (zod)', () => {
      const pkgPath = path.join(repoRoot, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      expect(pkg.dependencies).toBeDefined();
      expect(Object.keys(pkg.dependencies)).toEqual(['zod']);
      expect(pkg.dependencies.zod).toBe('^4.6.7');
    });

    test('SECURITY.md accurately reflects single production runtime dependency', () => {
      const securityPath = path.join(repoRoot, 'SECURITY.md');
      const content = fs.readFileSync(securityPath, 'utf8');
      expect(content).toContain('Exactly 1 production runtime dependency');
      expect(content).toContain('zod: "^4.6.7"');
    });

    test('README.md accurately reflects single production runtime dependency', () => {
      const readmePath = path.join(repoRoot, 'README.md');
      const content = fs.readFileSync(readmePath, 'utf8');
      expect(content).toContain('Exactly 1 vetted production runtime dependency');
      expect(content).toContain('zod: "^4.6.7"');
    });

    test('GETTING_STARTED.md accurately reflects minimal dependencies', () => {
      const gettingStartedPath = path.join(repoRoot, 'docs', 'GETTING_STARTED.md');
      const content = fs.readFileSync(gettingStartedPath, 'utf8');
      expect(content).toContain('Minimal dependencies');
      expect(content).toContain('exactly 1 production dependency (`zod`)');
    });
  });

  describe('5. Documented CLI commands match registered implementation', () => {
    const documentedCommands = [
      'init',
      'status',
      'sync',
      'guardrail',
      'update',
      'uninstall',
      'hook',
      'validate',
      'arch',
      'contract',
      'graph',
      'impact-tier',
      'case',
      'memory',
      'rsi',
      'evolve',
      'learn',
      'mutate',
      'marathon',
      'sdd',
      'skill-intel',
      'compile',
      'context',
      'align',
      'browse',
      'audit-web',
      'compare-web',
      'deconstruct',
      'heal',
      'system1',
      'adapt',
    ];

    const cliSource = fs.readFileSync(path.join(repoRoot, 'src', 'cli.js'), 'utf8');

    test.each(documentedCommands)('command %s is routed in src/cli.js', cmd => {
      const pattern = new RegExp(`case\\s+['"]${cmd}['"]`);
      expect(cliSource).toMatch(pattern);
    });
  });

  describe('6. Skill, agent, and workflow counts match reality', () => {
    test('actual counts match documented numbers', () => {
      const skillsCount = fs.readdirSync(path.join(repoRoot, '.agent', 'skills')).length;
      const agentsCount = fs
        .readdirSync(path.join(repoRoot, '.agent', 'agents'))
        .filter(f => f.endsWith('.md')).length;
      const workflowsCount = fs
        .readdirSync(path.join(repoRoot, '.agent', 'workflows'))
        .filter(f => f.endsWith('.md')).length;

      expect(skillsCount).toBe(235);
      expect(agentsCount).toBe(60);
      expect(workflowsCount).toBe(51);

      // Verify GETTING_STARTED.md uses these exact numbers
      const gettingStarted = fs.readFileSync(path.join(repoRoot, 'docs', 'GETTING_STARTED.md'), 'utf8');
      expect(gettingStarted).toContain('60 specialist agents');
      expect(gettingStarted).toContain('31 parallel reviewers');
      expect(gettingStarted).toContain('235 reusable skills');
      expect(gettingStarted).toContain('51 slash workflows');
    });
  });
});
