'use strict';

/**
 * art_direction_engine.js — Art Direction Presets & Cognitive Intent Resolution.
 */

const { DesignDecisionRecordSchema } = require('./design_token_schemas');

const ART_DIRECTION_PRESETS = {
  MINIMAL_EDITORIAL: {
    visualDirection: 'MINIMAL_EDITORIAL',
    fontFamilySans: 'Inter, -apple-system, sans-serif',
    fontFamilyMono: 'JetBrains Mono, monospace',
    baseGrid: 8,
    containerPadding: 24,
    innerRadius: 4,
    outerRadius: 28, // 4 + 24
    antiSlopExclusions: [
      'Banned: Purple-to-blue default mesh gradients',
      'Banned: Arbitrary glassmorphism on non-overlapping content',
      'Banned: Cards nested inside cards with identical lightness',
    ],
    paletteDefaults: {
      surface0: { lightness: 0.99, chroma: 0.005, hue: 260, cssString: 'oklch(0.99 0.005 260)' },
      surface1: { lightness: 0.95, chroma: 0.008, hue: 260, cssString: 'oklch(0.95 0.008 260)' },
      textPrimary: { lightness: 0.15, chroma: 0.02, hue: 260, cssString: 'oklch(0.15 0.02 260)' },
      textSecondary: { lightness: 0.40, chroma: 0.02, hue: 260, cssString: 'oklch(0.40 0.02 260)' },
      textMuted: { lightness: 0.60, chroma: 0.015, hue: 260, cssString: 'oklch(0.60 0.015 260)' },
      brandAccent: { lightness: 0.25, chroma: 0.03, hue: 260, cssString: 'oklch(0.25 0.03 260)' },
      actionPrimary: { lightness: 0.18, chroma: 0.02, hue: 260, cssString: 'oklch(0.18 0.02 260)' },
      actionHover: { lightness: 0.28, chroma: 0.02, hue: 260, cssString: 'oklch(0.28 0.02 260)' },
      actionActive: { lightness: 0.12, chroma: 0.02, hue: 260, cssString: 'oklch(0.12 0.02 260)' },
      borderSubtle: { lightness: 0.88, chroma: 0.01, hue: 260, cssString: 'oklch(0.88 0.01 260)' },
      borderMuted: { lightness: 0.75, chroma: 0.015, hue: 260, cssString: 'oklch(0.75 0.015 260)' },
    },
  },
  TECHNICAL_UTILITARIAN: {
    visualDirection: 'TECHNICAL_UTILITARIAN',
    fontFamilySans: 'Inter, system-ui, sans-serif',
    fontFamilyMono: 'JetBrains Mono, SF Mono, monospace',
    baseGrid: 8,
    containerPadding: 16,
    innerRadius: 2,
    outerRadius: 18, // 2 + 16
    antiSlopExclusions: [
      'Banned: Soft blurry drop shadows without hairline border',
      'Banned: Oversized hero headers on utility screens',
      'Banned: Purple-to-blue AI marketing gradients',
    ],
    paletteDefaults: {
      surface0: { lightness: 0.14, chroma: 0.01, hue: 260, cssString: 'oklch(0.14 0.01 260)' },
      surface1: { lightness: 0.18, chroma: 0.01, hue: 260, cssString: 'oklch(0.18 0.01 260)' },
      textPrimary: { lightness: 0.96, chroma: 0.005, hue: 260, cssString: 'oklch(0.96 0.005 260)' },
      textSecondary: { lightness: 0.75, chroma: 0.01, hue: 260, cssString: 'oklch(0.75 0.01 260)' },
      textMuted: { lightness: 0.55, chroma: 0.01, hue: 260, cssString: 'oklch(0.55 0.01 260)' },
      brandAccent: { lightness: 0.72, chroma: 0.16, hue: 200, cssString: 'oklch(0.72 0.16 200)' },
      actionPrimary: { lightness: 0.72, chroma: 0.16, hue: 200, cssString: 'oklch(0.72 0.16 200)' },
      actionHover: { lightness: 0.80, chroma: 0.14, hue: 200, cssString: 'oklch(0.80 0.14 200)' },
      actionActive: { lightness: 0.65, chroma: 0.18, hue: 200, cssString: 'oklch(0.65 0.18 200)' },
      borderSubtle: { lightness: 0.24, chroma: 0.01, hue: 260, cssString: 'oklch(0.24 0.01 260)' },
      borderMuted: { lightness: 0.35, chroma: 0.015, hue: 260, cssString: 'oklch(0.35 0.015 260)' },
    },
  },
  MODERN_PRODUCT_CRAFT: {
    visualDirection: 'MODERN_PRODUCT_CRAFT',
    fontFamilySans: 'Geist, Inter, -apple-system, sans-serif',
    fontFamilyMono: 'Geist Mono, monospace',
    baseGrid: 8,
    containerPadding: 20,
    innerRadius: 8,
    outerRadius: 28, // 8 + 20
    antiSlopExclusions: [
      'Banned: Plain purple tech cliché',
      'Banned: Single muddy black shadows (use multi-layer ambient)',
      'Banned: Flat unstyled buttons lacking active:scale press feedback',
    ],
    paletteDefaults: {
      surface0: { lightness: 0.98, chroma: 0.005, hue: 250, cssString: 'oklch(0.98 0.005 250)' },
      surface1: { lightness: 0.93, chroma: 0.01, hue: 250, cssString: 'oklch(0.93 0.01 250)' },
      textPrimary: { lightness: 0.18, chroma: 0.02, hue: 250, cssString: 'oklch(0.18 0.02 250)' },
      textSecondary: { lightness: 0.45, chroma: 0.02, hue: 250, cssString: 'oklch(0.45 0.02 250)' },
      textMuted: { lightness: 0.65, chroma: 0.015, hue: 250, cssString: 'oklch(0.65 0.015 250)' },
      brandAccent: { lightness: 0.60, chroma: 0.18, hue: 145, cssString: 'oklch(0.60 0.18 145)' },
      actionPrimary: { lightness: 0.60, chroma: 0.18, hue: 145, cssString: 'oklch(0.60 0.18 145)' },
      actionHover: { lightness: 0.52, chroma: 0.18, hue: 145, cssString: 'oklch(0.52 0.18 145)' },
      actionActive: { lightness: 0.44, chroma: 0.18, hue: 145, cssString: 'oklch(0.44 0.18 145)' },
      borderSubtle: { lightness: 0.88, chroma: 0.01, hue: 250, cssString: 'oklch(0.88 0.01 250)' },
      borderMuted: { lightness: 0.78, chroma: 0.015, hue: 250, cssString: 'oklch(0.78 0.015 250)' },
    },
  },
  DENSE_ANALYTICAL: {
    visualDirection: 'DENSE_ANALYTICAL',
    fontFamilySans: 'Inter, system-ui, sans-serif',
    fontFamilyMono: 'JetBrains Mono, monospace',
    baseGrid: 8,
    containerPadding: 16,
    innerRadius: 4,
    outerRadius: 20, // 4 + 16
    antiSlopExclusions: [
      'Banned: Low contrast text on chart legends',
      'Banned: Red-green status indicators without secondary shape/icon cues',
      'Banned: Horizontal layout shifts during data loading',
    ],
    paletteDefaults: {
      surface0: { lightness: 0.12, chroma: 0.008, hue: 240, cssString: 'oklch(0.12 0.008 240)' },
      surface1: { lightness: 0.16, chroma: 0.01, hue: 240, cssString: 'oklch(0.16 0.01 240)' },
      textPrimary: { lightness: 0.95, chroma: 0.005, hue: 240, cssString: 'oklch(0.95 0.005 240)' },
      textSecondary: { lightness: 0.70, chroma: 0.01, hue: 240, cssString: 'oklch(0.70 0.01 240)' },
      textMuted: { lightness: 0.50, chroma: 0.01, hue: 240, cssString: 'oklch(0.50 0.01 240)' },
      brandAccent: { lightness: 0.70, chroma: 0.15, hue: 190, cssString: 'oklch(0.70 0.15 190)' },
      actionPrimary: { lightness: 0.70, chroma: 0.15, hue: 190, cssString: 'oklch(0.70 0.15 190)' },
      actionHover: { lightness: 0.78, chroma: 0.13, hue: 190, cssString: 'oklch(0.78 0.13 190)' },
      actionActive: { lightness: 0.62, chroma: 0.16, hue: 190, cssString: 'oklch(0.62 0.16 190)' },
      borderSubtle: { lightness: 0.22, chroma: 0.01, hue: 240, cssString: 'oklch(0.22 0.01 240)' },
      borderMuted: { lightness: 0.32, chroma: 0.015, hue: 240, cssString: 'oklch(0.32 0.015 240)' },
    },
  },
  SOFT_APPROACHABLE: {
    visualDirection: 'SOFT_APPROACHABLE',
    fontFamilySans: 'Plus Jakarta Sans, Inter, sans-serif',
    fontFamilyMono: 'monospace',
    baseGrid: 8,
    containerPadding: 24,
    innerRadius: 12,
    outerRadius: 36, // 12 + 24
    antiSlopExclusions: [
      'Banned: Harsh stark monochrome contrasts without warm undertones',
      'Banned: Rigid zero-padding borders',
      'Banned: Generic purple tech gradients',
    ],
    paletteDefaults: {
      surface0: { lightness: 0.99, chroma: 0.01, hue: 70, cssString: 'oklch(0.99 0.01 70)' },
      surface1: { lightness: 0.95, chroma: 0.015, hue: 70, cssString: 'oklch(0.95 0.015 70)' },
      textPrimary: { lightness: 0.18, chroma: 0.02, hue: 50, cssString: 'oklch(0.18 0.02 50)' },
      textSecondary: { lightness: 0.42, chroma: 0.02, hue: 50, cssString: 'oklch(0.42 0.02 50)' },
      textMuted: { lightness: 0.62, chroma: 0.015, hue: 50, cssString: 'oklch(0.62 0.015 50)' },
      brandAccent: { lightness: 0.65, chroma: 0.14, hue: 45, cssString: 'oklch(0.65 0.14 45)' },
      actionPrimary: { lightness: 0.65, chroma: 0.14, hue: 45, cssString: 'oklch(0.65 0.14 45)' },
      actionHover: { lightness: 0.58, chroma: 0.14, hue: 45, cssString: 'oklch(0.58 0.14 45)' },
      actionActive: { lightness: 0.50, chroma: 0.14, hue: 45, cssString: 'oklch(0.50 0.14 45)' },
      borderSubtle: { lightness: 0.89, chroma: 0.015, hue: 70, cssString: 'oklch(0.89 0.015 70)' },
      borderMuted: { lightness: 0.79, chroma: 0.02, hue: 70, cssString: 'oklch(0.79 0.02 70)' },
    },
  },
};

/**
 * Resolves appropriate visual direction based on product category.
 */
function resolveArtDirection(category, customDirection = null) {
  if (customDirection && ART_DIRECTION_PRESETS[customDirection]) {
    return ART_DIRECTION_PRESETS[customDirection];
  }

  switch (category) {
    case 'DEV_TOOL':
      return ART_DIRECTION_PRESETS.TECHNICAL_UTILITARIAN;
    case 'ANALYTICS':
      return ART_DIRECTION_PRESETS.DENSE_ANALYTICAL;
    case 'EDITORIAL_PORTFOLIO':
      return ART_DIRECTION_PRESETS.MINIMAL_EDITORIAL;
    case 'CONSUMER_ECOMMERCE':
      return ART_DIRECTION_PRESETS.SOFT_APPROACHABLE;
    case 'B2B_SAAS':
    default:
      return ART_DIRECTION_PRESETS.MODERN_PRODUCT_CRAFT;
  }
}

/**
 * Constructs a fully validated Design Decision Record (DDR).
 */
function buildDesignDecisionRecord(options = {}) {
  const category = options.productCategory || 'B2B_SAAS';
  const preset = resolveArtDirection(category, options.visualDirection);

  const ddr = {
    version: '1.0.0',
    productName: options.productName || 'Tribunal Application',
    productCategory: category,
    targetAudience: options.targetAudience || 'Professional operators and users',
    visualDirection: preset.visualDirection,
    palette: preset.paletteDefaults,
    typography: {
      xs: 'clamp(0.75rem, 0.7rem + 0.25vw, 0.8125rem)',
      sm: 'clamp(0.8125rem, 0.775rem + 0.2vw, 0.875rem)',
      base: 'clamp(0.875rem, 0.825rem + 0.25vw, 1rem)',
      md: 'clamp(1rem, 0.95rem + 0.25vw, 1.125rem)',
      lg: 'clamp(1.125rem, 1.05rem + 0.375vw, 1.25rem)',
      xl: 'clamp(1.25rem, 1.15rem + 0.5vw, 1.5rem)',
      heading1: 'clamp(1.875rem, 1.5rem + 1.5vw, 2.75rem)',
      heading2: 'clamp(1.5rem, 1.25rem + 1vw, 2rem)',
      heading3: 'clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem)',
      fontFamilySans: preset.fontFamilySans,
      fontFamilyMono: preset.fontFamilyMono,
    },
    spatial: {
      baseGrid: preset.baseGrid,
      containerPadding: preset.containerPadding,
      innerRadius: preset.innerRadius,
      outerRadius: preset.outerRadius,
      formulaVerified: preset.outerRadius === preset.innerRadius + preset.containerPadding,
    },
    antiSlopExclusions: preset.antiSlopExclusions,
    timestamp: new Date().toISOString(),
  };

  return DesignDecisionRecordSchema.parse(ddr);
}

module.exports = {
  ART_DIRECTION_PRESETS,
  resolveArtDirection,
  buildDesignDecisionRecord,
};

