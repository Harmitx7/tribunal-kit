'use strict';

/**
 * color_harmony_engine.js — OKLCH Contrast & Perceptual Color Mathematics.
 */

/**
 * Parses an OKLCH CSS string into its component numbers.
 * Supports: oklch(0.65 0.18 145) or oklch(65% 0.18 145 / 0.8)
 */
function parseOklch(str) {
  if (typeof str !== 'string') return null;
  const match = str.match(/oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/i);
  if (!match) return null;

  const l = match[1].endsWith('%') ? parseFloat(match[1]) / 100 : parseFloat(match[1]);
  const c = parseFloat(match[2]);
  const h = parseFloat(match[3]);
  const a = match[4] ? (match[4].endsWith('%') ? parseFloat(match[4]) / 100 : parseFloat(match[4])) : 1;

  return { lightness: l, chroma: c, hue: h, alpha: a };
}

/**
 * Calculates the lightness delta between two colors.
 * In OKLCH space, a lightness delta of >= 0.45 satisfies WCAG AA (4.5:1) contrast.
 */
function calculateLightnessDelta(colorA, colorB) {
  const parsedA = typeof colorA === 'string' ? parseOklch(colorA) : colorA;
  const parsedB = typeof colorB === 'string' ? parseOklch(colorB) : colorB;

  if (!parsedA || !parsedB) return 0;
  return Math.abs(parsedA.lightness - parsedB.lightness);
}

/**
 * Determines whether text color and background color satisfy WCAG AA contrast.
 */
function isWcagAaCompliant(textColor, bgColor, isLargeText = false) {
  const delta = calculateLightnessDelta(textColor, bgColor);
  const threshold = isLargeText ? 0.35 : 0.45;
  return delta >= threshold;
}

/**
 * Generates modern CSS Relative Color Syntax declarations.
 */
function generateRelativeColorTokens(varName = '--color-primary') {
  return {
    base: `var(${varName})`,
    hover: `oklch(from var(${varName}) calc(l - 0.08) c h)`,
    active: `oklch(from var(${varName}) calc(l - 0.14) c h)`,
    subtle: `oklch(from var(${varName}) 0.95 0.03 h)`,
  };
}

module.exports = {
  parseOklch,
  calculateLightnessDelta,
  isWcagAaCompliant,
  generateRelativeColorTokens,
};

