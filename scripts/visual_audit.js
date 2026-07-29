#!/usr/bin/env node

/**
 * Automated UI Visual & Anti-Slop Audit Script
 * Analyzes frontend files (JSX/TSX/CSS/HTML) for visual depth, color spaces, anti-slop rules, and interactive state completeness.
 */

const fs = require('fs');
const path = require('path');

function runVisualAudit(filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      status: 'ERROR',
      score: 0,
      message: `File not found: ${filePath}`,
      violations: []
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
      description: 'Primary color uses AI cliché purple/violet (#7C3AED, #8B5CF6). Use signal orange, acid green, slate, or OKLCH blue instead.',
      impact: -25
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
      description: 'Found raw hex colors without modern OKLCH color spaces or design token variables.',
      impact: -15
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
        impact: -10
      });
      score -= 10;
    }
    if (!/focus-visible:/i.test(content) && !/:focus/i.test(content)) {
      violations.push({
        rule: 'MISSING_FOCUS_INDICATOR',
        severity: 'WARNING',
        description: 'Interactive elements lack focus-visible outlines for keyboard accessibility.',
        impact: -10
      });
      score -= 10;
    }
  }

  // 4. Visual depth & border check for container elements
  if (/className=["'][^"']*(?:card|container|box|panel|wrapper)[^"']*["']/i.test(content) || /<article|<section/i.test(content)) {
    if (!/border|shadow|hairline|depth/i.test(content)) {
      violations.push({
        rule: 'MISSING_SURFACE_DEPTH',
        severity: 'WARNING',
        description: 'Container elements lack 1px luminous border or ambient shadow depth layers.',
        impact: -15
      });
      score -= 15;
    }
  }

  // 5. Hardcoded static offsets vs dynamic math
  if (/style=\{\{[^}]*\b(?:top|left|height|width):\s*['"]\d+px['"]/i.test(content)) {
    violations.push({
      rule: 'HARDCODED_PIXEL_LAYOUT',
      severity: 'WARNING',
      description: 'Hardcoded static pixel offsets found in inline styles. Use responsive clamp() or layout bounds.',
      impact: -10
    });
    score -= 10;
  }

  const finalScore = Math.max(0, score);
  const status = violations.some(v => v.severity === 'REJECTED') ? 'REJECTED' : (violations.length > 0 ? 'WARNING' : 'APPROVED');

  return {
    status,
    score: finalScore,
    file: filePath,
    violations
  };
}

// CLI Execution Support
if (require.main === module) {
  const args = process.argv.slice(2);
  const fileArgIndex = args.indexOf('--file');
  const targetPath = fileArgIndex !== -1 ? args[fileArgIndex + 1] : args[0];

  if (!targetPath) {
    console.error('Usage: node visual_audit.js --file <path-to-file>');
    process.exit(1);
  }

  const result = runVisualAudit(path.resolve(targetPath));
  console.log(JSON.stringify(result, null, 2));

  if (result.status === 'REJECTED') {
    process.exit(1);
  }
}

module.exports = { runVisualAudit };
