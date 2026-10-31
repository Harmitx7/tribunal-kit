'use strict';

const {
  ART_DIRECTION_PRESETS,
  resolveArtDirection,
  buildDesignDecisionRecord,
} = require('../../src/design_intelligence/art_direction_engine');

describe('UI Art Direction Engine (Unit)', () => {
  it('resolves DevTool to Technical Utilitarian preset', () => {
    const preset = resolveArtDirection('DEV_TOOL');
    expect(preset.visualDirection).toBe('TECHNICAL_UTILITARIAN');
    expect(preset.fontFamilyMono).toContain('JetBrains Mono');
    expect(preset.paletteDefaults.surface0.lightness).toBeLessThan(0.2); // dark mode default
  });

  it('resolves Editorial to Minimal Editorial preset', () => {
    const preset = resolveArtDirection('EDITORIAL_PORTFOLIO');
    expect(preset.visualDirection).toBe('MINIMAL_EDITORIAL');
    expect(preset.paletteDefaults.surface0.lightness).toBeGreaterThan(0.9); // light mode default
  });

  it('resolves B2B SaaS to Modern Product Craft preset', () => {
    const preset = resolveArtDirection('B2B_SAAS');
    expect(preset.visualDirection).toBe('MODERN_PRODUCT_CRAFT');
    expect(preset.containerPadding).toBe(20);
    expect(preset.outerRadius).toBe(28); // 8 + 20
  });

  it('builds a complete, valid Design Decision Record', () => {
    const ddr = buildDesignDecisionRecord({
      productName: 'Observability Console',
      productCategory: 'DEV_TOOL',
      targetAudience: 'Systems Engineers',
    });

    expect(ddr.productCategory).toBe('DEV_TOOL');
    expect(ddr.visualDirection).toBe('TECHNICAL_UTILITARIAN');
    expect(ddr.spatial.formulaVerified).toBe(true);
    expect(ddr.antiSlopExclusions.length).toBeGreaterThan(0);
    expect(ddr.typography.heading1).toContain('clamp(');
  });
});

