'use strict';

const {
  parseOklch,
  calculateLightnessDelta,
  isWcagAaCompliant,
  generateRelativeColorTokens,
} = require('../../src/design_intelligence/color_harmony_engine');

describe('UI Color Harmony Engine (Unit)', () => {
  it('parses standard OKLCH strings correctly', () => {
    const parsed = parseOklch('oklch(0.65 0.18 145)');
    expect(parsed).toEqual({
      lightness: 0.65,
      chroma: 0.18,
      hue: 145,
      alpha: 1,
    });
  });

  it('parses OKLCH strings with percentages and alpha', () => {
    const parsed = parseOklch('oklch(65% 0.18 145 / 0.8)');
    expect(parsed).toEqual({
      lightness: 0.65,
      chroma: 0.18,
      hue: 145,
      alpha: 0.8,
    });
  });

  it('calculates lightness delta accurately', () => {
    const darkBg = 'oklch(0.14 0.01 260)';
    const lightText = 'oklch(0.96 0.005 260)';
    const delta = calculateLightnessDelta(lightText, darkBg);
    expect(delta).toBeCloseTo(0.82, 2);
  });

  it('verifies WCAG AA compliance based on delta L >= 0.45', () => {
    const darkBg = 'oklch(0.14 0.01 260)';
    const highContrastText = 'oklch(0.96 0.005 260)';
    const lowContrastText = 'oklch(0.35 0.01 260)'; // delta = 0.21 < 0.45

    expect(isWcagAaCompliant(highContrastText, darkBg)).toBe(true);
    expect(isWcagAaCompliant(lowContrastText, darkBg)).toBe(false);
  });

  it('generates CSS Relative Color Syntax tokens', () => {
    const tokens = generateRelativeColorTokens('--brand-primary');
    expect(tokens.base).toBe('var(--brand-primary)');
    expect(tokens.hover).toContain('calc(l - 0.08)');
    expect(tokens.active).toContain('calc(l - 0.14)');
  });
});

