'use strict';

/**
 * visual_defect_analyzer.js — Programmatic Visual Defect & Anti-Slop Scanner.
 */

const { VisualDefectSchema } = require('./design_token_schemas');

/**
 * Audits a source snippet or CSS string for anti-patterns and visual defects.
 */
function analyzeVisualDefects(content = '', options = {}) {
  const defects = [];
  const lines = String(content).split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // 1. Hardcoded hex colors
    if (/#([0-9a-fA-F]{3}){1,2}\b/.test(line) && !line.includes('// ignore-color')) {
      defects.push({
        id: `HEX_COLOR_FOUND_${lineNum}`,
        severity: 'P6_LOW',
        category: 'SLOP_CLICHE_DETECTED',
        line: lineNum,
        message: `Hardcoded hex color found: "${line.trim()}". Prefer OKLCH tokens or CSS variables.`,
        remedy: 'Replace raw hex with semantic OKLCH CSS variable (e.g. var(--bg-surface-0)).',
      });
    }

    // 2. Dangerous transition: all
    if (/transition:\s*all\b|transition-all\b/i.test(line)) {
      defects.push({
        id: `TRANSITION_ALL_${lineNum}`,
        severity: 'P5_MEDIUM',
        category: 'COMPONENT_INCONSISTENCY',
        line: lineNum,
        message: `Unbounded "transition: all" detected on line ${lineNum}.`,
        remedy: 'Specify explicit animated properties (e.g. transition: transform 150ms ease, opacity 150ms ease).',
      });
    }

    // 3. Scale from 0
    if (/scale\(0\)|scale-0\b/i.test(line)) {
      defects.push({
        id: `SCALE_ZERO_ENTRANCE_${lineNum}`,
        severity: 'P7_POLISH',
        category: 'COMPONENT_INCONSISTENCY',
        line: lineNum,
        message: `Animation entrance from scale(0) causes popping artifacts on line ${lineNum}.`,
        remedy: 'Animate scale from 0.95 or 0.96 with opacity 0.',
      });
    }

    // 4. Outline none without focus-visible
    if (/outline:\s*none\b|outline-none\b/i.test(line) && !line.includes('focus-visible')) {
      defects.push({
        id: `OUTLINE_NONE_MISSING_RING_${lineNum}`,
        severity: 'P3_HIGH',
        category: 'ACCESSIBILITY_BARRIER',
        line: lineNum,
        message: `Removed default outline without visible focus indicator on line ${lineNum}.`,
        remedy: 'Add focus-visible custom outline ring (e.g. outline: 2px solid var(--ring); outline-offset: 2px).',
      });
    }

    // 5. Default purple tech gradient
    if (/#8b5cf6|violet-500|from-purple-|to-indigo-/i.test(line) && !options.allowPurpleGradient) {
      defects.push({
        id: `PURPLE_GRADIENT_CLICHE_${lineNum}`,
        severity: 'P6_LOW',
        category: 'SLOP_CLICHE_DETECTED',
        line: lineNum,
        message: `Generic AI purple/violet gradient cliché detected on line ${lineNum}.`,
        remedy: 'Adopt bespoke brand palette using OKLCH and subtle ambient depth instead of generic purple mesh.',
      });
    }

    // 6. Table without overflow-x-auto
    if (/<table\b/i.test(line) && !content.includes('overflow-x-auto') && !content.includes('overflow-x: auto')) {
      defects.push({
        id: `TABLE_MISSING_OVERFLOW_${lineNum}`,
        severity: 'P1_CRITICAL',
        category: 'MAJOR_LAYOUT_COLLAPSE',
        line: lineNum,
        message: `Table element lacking horizontal overflow containment on line ${lineNum}.`,
        remedy: 'Wrap <table> in a container with "overflow-x-auto" to prevent mobile viewport blowout.',
      });
    }
  }

  // Parse and validate each defect
  return defects.map((d) => VisualDefectSchema.parse(d));
}

module.exports = {
  analyzeVisualDefects,
};

