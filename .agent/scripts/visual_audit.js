#!/usr/bin/env node
/**
 * visual_audit.js — Visual Design & UI Engineering Auditor
 *
 * Verifies OKLCH color compliance, surface depth layering (hairline borders, ambient shadows),
 * and interactive state polish on UI components and style definitions.
 *
 * Usage:
 *   node .agent/scripts/visual_audit.js .
 *   node .agent/scripts/visual_audit.js --file src/components/Button.tsx
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { GREEN, YELLOW, BOLD, DIM, RESET, banner, timer, formatMs } = require('./_colors');

const { walkDir, SOURCE_EXTENSIONS } = require('./_utils');

function auditFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }

  const issues = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for hardcoded hex colors when oklch or CSS variables are expected
    if (/#([0-9a-fA-F]{3}){1,2}\b/.test(line) && !line.includes('// ignore-color')) {
      issues.push({
        line: i + 1,
        rule: 'oklch-color',
        message: `Hardcoded hex color found: "${line.trim()}". Prefer OKLCH or design token CSS variables.`,
      });
    }
  }

  return issues;
}

function runVisualAudit(filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      status: 'ERROR',
      score: 0,
      message: `File not found: ${filePath}`,
      violations: [],
    };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const violations = [];
  let score = 100;

  // 1. Purple/Violet AI cliché color check
  const purpleRegex = /#(?:7[cC]3[aA][eE][dD]|8[bB]5[cC][fF]6|9333ea|a855f7|c084fc)/i;
  if (purpleRegex.test(content) || /color:\s*(?:purple|violet)/i.test(content)) {
    violations.push({
      rule: 'NO_PURPLE_CLICHE',
      severity: 'REJECTED',
      description:
        'Primary color uses AI cliché purple/violet (#7C3AED, #8B5CF6). Use signal orange, acid green, slate, or OKLCH blue instead.',
      impact: -25,
    });
    score -= 25;
  }

  // 1.5 Anti-Slop Copywriting check
  const SLOP_PHRASES = [
    '10,000+ users',
    '10K+ users',
    '99.9% uptime',
    'AI Powered',
    'Revolutionary',
    'Next Generation',
    'Seamless experience',
    'Cutting Edge',
    'SOC 2 compliant',
    'Enterprise-grade security',
    '300% faster',
  ];
  const foundSlop = SLOP_PHRASES.find(phrase =>
    content.toLowerCase().includes(phrase.toLowerCase()),
  );
  if (foundSlop) {
    violations.push({
      rule: 'ANTI_SLOP_COPYWRITING',
      severity: 'REJECTED',
      description: `Fabricated claim or cliché phrase found: "${foundSlop}". Use real data or honest placeholders.`,
      impact: -25,
    });
    score -= 25;
  }

  // 2. Raw Hex without OKLCH or design tokens
  const rawHexRegex = /#[0-9a-fA-F]{6}\b/g;
  const hexMatches = content.match(rawHexRegex) || [];
  if (hexMatches.length > 4 && !/oklch/i.test(content) && !/var\(--/i.test(content)) {
    violations.push({
      rule: 'USE_OKLCH_OR_TOKENS',
      severity: 'REJECTED',
      description:
        'Found raw hex colors without modern OKLCH color spaces or design token variables.',
      impact: -15,
    });
    score -= 15;
  }

  // 3. Interactive state check on clickable elements
  if (/<button|<a\b|onClick=/i.test(content)) {
    if (!/hover:/i.test(content) && !/:hover/i.test(content)) {
      violations.push({
        rule: 'MISSING_HOVER_STATE',
        severity: 'WARNING',
        description: 'Interactive buttons/links lack visible hover state handling.',
        impact: -10,
      });
      score -= 10;
    }
    if (!/focus-visible:/i.test(content) && !/:focus/i.test(content)) {
      violations.push({
        rule: 'MISSING_FOCUS_INDICATOR',
        severity: 'WARNING',
        description: 'Interactive elements lack focus-visible outlines for keyboard accessibility.',
        impact: -10,
      });
      score -= 10;
    }
  }

  // 4. Visual depth & border check for container elements
  if (
    /className=["'][^"']*(?:card|container|box|panel|wrapper)[^"']*["']/i.test(content) ||
    /<article|<section/i.test(content)
  ) {
    if (!/border|shadow|hairline|depth/i.test(content)) {
      violations.push({
        rule: 'MISSING_SURFACE_DEPTH',
        severity: 'WARNING',
        description: 'Container elements lack 1px luminous border or ambient shadow depth layers.',
        impact: -15,
      });
      score -= 15;
    }
  }

  // 5. Hardcoded static offsets vs dynamic math
  if (/style=\{\{[^}]*\b(?:top|left|height|width):\s*['"]\d+px['"]/i.test(content)) {
    violations.push({
      rule: 'HARDCODED_PIXEL_LAYOUT',
      severity: 'WARNING',
      description:
        'Hardcoded static pixel offsets found in inline styles. Use responsive clamp() or layout bounds.',
      impact: -10,
    });
    score -= 10;
  }

  const finalScore = Math.max(0, score);
  const status = violations.some(v => v.severity === 'REJECTED')
    ? 'REJECTED'
    : violations.length > 0
      ? 'WARNING'
      : 'APPROVED';

  return {
    status,
    score: finalScore,
    file: filePath,
    violations,
  };
}


function main() {
  const args = process.argv.slice(2);
  const fileArgIndex = args.indexOf('--file');
  const targetPath = fileArgIndex !== -1 ? args[fileArgIndex + 1] : (args[0] && !args[0].startsWith('-') && args[0] !== '.' ? args[0] : null);

  if (targetPath) {
    const result = runVisualAudit(path.resolve(targetPath));
    console.log(JSON.stringify(result, null, 2));
    if (result.status === 'REJECTED') {
      process.exit(1);
    }
    return;
  }

  const cwd = process.cwd();
  const elapsed = timer();

  console.log(banner('visual_audit.js', { Target: cwd }));

  const files = walkDir(cwd, { extensions: SOURCE_EXTENSIONS });
  let totalIssues = 0;

  for (const file of files) {
    const issues = auditFile(file);
    if (issues.length > 0) {
      totalIssues += issues.length;
      const rel = path.relative(cwd, file);
      console.log(`\n  📄 ${BOLD}${rel}${RESET}`);
      for (const iss of issues) {
        console.log(`     ${YELLOW}⚠ line ${iss.line}:${RESET} ${iss.message}`);
      }
    }
  }

  console.log(`\n  ${DIM}Audited ${files.length} files in ${formatMs(elapsed())}${RESET}`);

  if (totalIssues === 0) {
    console.log(
      `  ${GREEN}${BOLD}✔ Visual audit complete — zero design violations found.${RESET}\n`,
    );
  } else {
    console.log(
      `  ${YELLOW}${BOLD}⚠ Visual audit completed with ${totalIssues} advisory issue(s).${RESET}\n`,
    );
  }
}

module.exports = { auditFile, runVisualAudit };

if (require.main === module || (require.main && path.basename(require.main.filename) === 'visual_audit.js')) {
  main();
}
