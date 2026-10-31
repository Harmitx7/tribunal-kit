'use strict';

/**
 * phase9_documentation_war_room.test.js — Documentation Forensics & DX Test Suite (Phase 9)
 * ========================================================================================
 * Verifies Phase 9 Documentation Invariants, Truth Matrix, Reference Resolution & DX Integrity:
 * 1. Documentation Link Resolution: Asserts all relative file references in core docs resolve to real files.
 * 2. Documented CLI Surface: Proves all commands in README.md & GETTING_STARTED.md map to valid dispatchers.
 * 3. Programmatic API Code Examples: Asserts documented snippets execute and alignText behaves as specified.
 * 4. Package Metadata & Supply-Chain Claims: Verifies minimal dependencies (zod only) and engine constraints.
 * 5. Numerical Claim Accuracy: Proves documented agent (60), skill (398), and workflow (52) counts match filesystem reality.
 */

const fs = require('fs');
const path = require('path');
const PKG = require('../../package.json');
const tk = require('../../src/cli');
const { RUST_COMMANDS } = require('../../bin/wrapper');

describe('PHASE 9 DOCUMENTATION FORENSICS & DX WAR ROOM', () => {
  const repoRoot = path.resolve(__dirname, '../..');

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Documentation Link & Reference Integrity
  // ───────────────────────────────────────────────────────────────────────────
  describe('Documentation Link & Reference Resolution', () => {
    test('All relative markdown links in primary documentation resolve to existing files', () => {
      const docFiles = [
        'README.md',
        'CONTRIBUTING.md',
        'docs/GETTING_STARTED.md',
        'docs/API_REFERENCE.md',
        'docs/MCP_GUIDE.md',
      ];

      const brokenLinks = [];

      for (const relDoc of docFiles) {
        const fullDocPath = path.join(repoRoot, relDoc);
        if (!fs.existsSync(fullDocPath)) continue;

        const docDir = path.dirname(fullDocPath);
        const content = fs.readFileSync(fullDocPath, 'utf8');

        // Match markdown links [text](target)
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let match;
        while ((match = linkRegex.exec(content)) !== null) {
          const href = match[2];
          // Skip external URLs, mailto, and in-page anchor jumps
          if (
            href.startsWith('http://') ||
            href.startsWith('https://') ||
            href.startsWith('mailto:') ||
            href.startsWith('#')
          ) {
            continue;
          }

          const fileTarget = href.split('#')[0];
          if (!fileTarget) continue;

          const resolvedTarget = path.resolve(docDir, fileTarget);
          if (!fs.existsSync(resolvedTarget)) {
            brokenLinks.push({
              sourceDoc: relDoc,
              linkText: match[1],
              href,
              resolvedTarget,
            });
          }
        }
      }

      expect(brokenLinks).toEqual([]);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Documented CLI Command Surface
  // ───────────────────────────────────────────────────────────────────────────
  describe('Documented CLI Command Surface Integrity', () => {
    test('All CLI commands documented in README.md table exist in native or JS engine', () => {
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
      ];

      const jsCliContent = fs.readFileSync(path.join(repoRoot, 'src/cli.js'), 'utf8');

      for (const cmd of documentedCommands) {
        const inRust = RUST_COMMANDS.has(cmd);
        const inJs = jsCliContent.includes(`case '${cmd}':`);
        expect(inRust || inJs).toBe(true);
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Programmatic API Code Examples
  // ───────────────────────────────────────────────────────────────────────────
  describe('Programmatic API Documentation Examples', () => {
    test('Import snippet from docs/API_REFERENCE.md resolves functions and alignText works', () => {
      // Snippet: const { cmdInit, cmdStatus, cmdMemory, cmdAlign, alignText } = require('tribunal-kit');
      const { cmdInit, cmdStatus, cmdMemory, cmdAlign, alignText } = tk;

      expect(typeof cmdInit).toBe('function');
      expect(typeof cmdStatus).toBe('function');
      expect(typeof cmdMemory).toBe('function');
      expect(typeof cmdAlign).toBe('function');
      expect(typeof alignText).toBe('function');

      // Verify alignText behaviour on conversational slop
      const rawAiResponse = 'Sure! Here is the implementation:\nfunction add(a, b) { return a + b; }';
      const cleaned = alignText(rawAiResponse);
      expect(cleaned).toBe('function add(a, b) { return a + b; }');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Package Metadata & Supply-Chain Truth
  // ───────────────────────────────────────────────────────────────────────────
  describe('Package Metadata & Supply-Chain Claims', () => {
    test('Production dependencies claim (exactly 1: zod) matches package.json', () => {
      const prodDeps = Object.keys(PKG.dependencies || {});
      expect(prodDeps.length).toBe(1);
      expect(prodDeps[0]).toBe('zod');
    });

    test('Node.js engine constraint matches >=18.0.0', () => {
      expect(PKG.engines).toBeDefined();
      expect(PKG.engines.node).toBe('>=18.0.0');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Numerical Claim Accuracy (Truth Matrix)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Numerical Claim Accuracy Across Documentation', () => {
    test('Filesystem count of agents, skills, and workflows matches documented figures', () => {
      const agentsDir = path.join(repoRoot, '.agent/agents');
      const skillsDir = path.join(repoRoot, '.agent/skills');
      const workflowsDir = path.join(repoRoot, '.agent/workflows');

      const agentsCount = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md')).length;
      const skillsCount = fs.readdirSync(skillsDir).filter(f => {
        const p = path.join(skillsDir, f);
        return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'SKILL.md'));
      }).length;
      const workflowsCount = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.md')).length;

      // Documented numbers: 60 agents, 398 skills, 52 workflows
      expect(agentsCount).toBe(60);
      expect(skillsCount).toBe(398);
      expect(workflowsCount).toBe(52);
    });
  });
});

