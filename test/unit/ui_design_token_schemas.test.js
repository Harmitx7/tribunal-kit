'use strict';

const {
  OklchColorSchema,
  ColorPaletteSchema,
  FluidTypographyScaleSchema,
  SpatialGeometrySchema,
  InteractiveStateContractSchema,
  DesignDecisionRecordSchema,
  VisualDefectSchema,
  DesignBenchmarkResultSchema,
} = require('../../src/design_intelligence/design_token_schemas');

describe('UI Design Token Schemas (Unit)', () => {
  it('validates a valid OKLCH color', () => {
    const valid = {
      lightness: 0.65,
      chroma: 0.18,
      hue: 145,
      alpha: 1,
      cssString: 'oklch(0.65 0.18 145)',
    };
    expect(() => OklchColorSchema.parse(valid)).not.toThrow();
  });

  it('rejects an invalid OKLCH color with out-of-range lightness', () => {
    const invalid = {
      lightness: 1.5,
      chroma: 0.18,
      hue: 145,
      cssString: 'oklch(1.5 0.18 145)',
    };
    expect(() => OklchColorSchema.parse(invalid)).toThrow();
  });

  it('validates a full ColorPaletteSchema', () => {
    const c = { lightness: 0.5, chroma: 0.1, hue: 200, cssString: 'oklch(0.5 0.1 200)' };
    const palette = {
      surface0: c,
      surface1: c,
      textPrimary: c,
      textSecondary: c,
      textMuted: c,
      brandAccent: c,
      actionPrimary: c,
      actionHover: c,
      actionActive: c,
      borderSubtle: c,
      borderMuted: c,
    };
    expect(() => ColorPaletteSchema.parse(palette)).not.toThrow();
  });

  it('validates SpatialGeometrySchema and checks concentric radius logic', () => {
    const spatial = {
      baseGrid: 8,
      containerPadding: 16,
      innerRadius: 4,
      outerRadius: 20,
      formulaVerified: true,
    };
    const parsed = SpatialGeometrySchema.parse(spatial);
    expect(parsed.outerRadius).toBe(parsed.innerRadius + parsed.containerPadding);
  });

  it('validates InteractiveStateContractSchema', () => {
    const state = {
      elementId: 'btn-submit',
      hasHover: true,
      hasFocusVisible: true,
      hasActivePress: true,
      hasDisabled: true,
      pressScaleFactor: 0.98,
      isCompliant: true,
    };
    expect(() => InteractiveStateContractSchema.parse(state)).not.toThrow();
  });

  it('validates VisualDefectSchema across severity tiers', () => {
    const defect = {
      id: 'HEX_COLOR_FOUND_12',
      severity: 'P6_LOW',
      category: 'SLOP_CLICHE_DETECTED',
      line: 12,
      message: 'Raw hex found',
      remedy: 'Use OKLCH variable',
    };
    expect(() => VisualDefectSchema.parse(defect)).not.toThrow();
  });

  it('validates DesignBenchmarkResultSchema', () => {
    const result = {
      taskId: 'bm-saas-landing',
      category: 'B2B_SAAS',
      scores: {
        visualIdentity: 4.5,
        composition: 4.2,
        typography: 4.6,
        color: 4.8,
        componentCraft: 4.5,
        productSpecificity: 4.3,
        responsiveQuality: 4.7,
        interactionMotion: 4.4,
        accessibility: 4.8,
        implementationQuality: 4.6,
        contentMicrocopy: 4.2,
        runtimeReliability: 4.9,
      },
      weightedScore: 4.55,
      tier: 'EXEMPLARY',
      defectsCount: 0,
      timestamp: new Date().toISOString(),
    };
    expect(() => DesignBenchmarkResultSchema.parse(result)).not.toThrow();
  });
});

