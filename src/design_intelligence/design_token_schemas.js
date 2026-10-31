'use strict';

/**
 * design_token_schemas.js — Versioned Zod validation contracts for UI Engineering & Design Intelligence.
 */

const { z } = require('zod');

// 1. OKLCH Color Schema
const OklchColorSchema = z.object({
  lightness: z.number().min(0).max(1),
  chroma: z.number().min(0).max(0.4),
  hue: z.number().min(0).max(360),
  alpha: z.number().min(0).max(1).default(1),
  cssString: z.string().min(1),
});

// 2. Palette Roles Schema
const ColorPaletteSchema = z.object({
  surface0: OklchColorSchema,
  surface1: OklchColorSchema,
  surface2: OklchColorSchema.optional(),
  textPrimary: OklchColorSchema,
  textSecondary: OklchColorSchema,
  textMuted: OklchColorSchema,
  brandAccent: OklchColorSchema,
  actionPrimary: OklchColorSchema,
  actionHover: OklchColorSchema,
  actionActive: OklchColorSchema,
  borderSubtle: OklchColorSchema,
  borderMuted: OklchColorSchema,
  success: OklchColorSchema.optional(),
  warning: OklchColorSchema.optional(),
  error: OklchColorSchema.optional(),
});

// 3. Fluid Typography Schema
const FluidTypographyScaleSchema = z.object({
  xs: z.string(),
  sm: z.string(),
  base: z.string(),
  md: z.string(),
  lg: z.string(),
  xl: z.string(),
  heading1: z.string(),
  heading2: z.string(),
  heading3: z.string(),
  fontFamilySans: z.string(),
  fontFamilyMono: z.string().optional(),
});

// 4. Spatial & Radius Schema
const SpatialGeometrySchema = z.object({
  baseGrid: z.number().default(8),
  containerPadding: z.number().min(8),
  innerRadius: z.number().min(0),
  outerRadius: z.number().min(0),
  formulaVerified: z.boolean(),
});

// 5. Interactive State Contract Schema
const InteractiveStateContractSchema = z.object({
  elementId: z.string(),
  hasHover: z.boolean(),
  hasFocusVisible: z.boolean(),
  hasActivePress: z.boolean(),
  hasDisabled: z.boolean(),
  pressScaleFactor: z.number().min(0.9).max(1.0).default(0.98),
  isCompliant: z.boolean(),
});

// 6. Design Decision Record (DDR) Schema
const DesignDecisionRecordSchema = z.object({
  version: z.literal('1.0.0').default('1.0.0'),
  productName: z.string().min(1),
  productCategory: z.enum(['DEV_TOOL', 'B2B_SAAS', 'ANALYTICS', 'CONSUMER_ECOMMERCE', 'EDITORIAL_PORTFOLIO', 'CUSTOM']),
  targetAudience: z.string().min(1),
  visualDirection: z.enum([
    'MINIMAL_EDITORIAL',
    'TECHNICAL_UTILITARIAN',
    'MODERN_PRODUCT_CRAFT',
    'DENSE_ANALYTICAL',
    'SOFT_APPROACHABLE',
    'CUSTOM_BRANDED'
  ]),
  palette: ColorPaletteSchema,
  typography: FluidTypographyScaleSchema,
  spatial: SpatialGeometrySchema,
  antiSlopExclusions: z.array(z.string()).default([]),
  timestamp: z.string(),
});

// 7. Visual Defect Schema
const VisualDefectSchema = z.object({
  id: z.string(),
  severity: z.enum(['P0_FATAL', 'P1_CRITICAL', 'P2_HIGH', 'P3_HIGH', 'P4_MEDIUM', 'P5_MEDIUM', 'P6_LOW', 'P7_POLISH']),
  category: z.enum([
    'BROKEN_FUNCTIONALITY',
    'MAJOR_LAYOUT_COLLAPSE',
    'VISUAL_HIERARCHY_FAILURE',
    'ACCESSIBILITY_BARRIER',
    'RESPONSIVE_DEFICIENCY',
    'SPATIAL_RADIUS_MISMATCH',
    'COMPONENT_INCONSISTENCY',
    'SLOP_CLICHE_DETECTED'
  ]),
  file: z.string().optional(),
  line: z.number().optional(),
  message: z.string(),
  remedy: z.string(),
});

// 8. Design Quality Benchmark Result Schema
const DesignBenchmarkResultSchema = z.object({
  taskId: z.string(),
  category: z.string(),
  scores: z.object({
    visualIdentity: z.number().min(0).max(5),
    composition: z.number().min(0).max(5),
    typography: z.number().min(0).max(5),
    color: z.number().min(0).max(5),
    componentCraft: z.number().min(0).max(5),
    productSpecificity: z.number().min(0).max(5),
    responsiveQuality: z.number().min(0).max(5),
    interactionMotion: z.number().min(0).max(5),
    accessibility: z.number().min(0).max(5),
    implementationQuality: z.number().min(0).max(5),
    contentMicrocopy: z.number().min(0).max(5),
    runtimeReliability: z.number().min(0).max(5),
  }),
  weightedScore: z.number().min(0).max(5),
  tier: z.enum(['FAILING', 'ACCEPTABLE', 'PRODUCTION_CRAFT', 'EXEMPLARY']),
  defectsCount: z.number().min(0),
  timestamp: z.string(),
});

module.exports = {
  OklchColorSchema,
  ColorPaletteSchema,
  FluidTypographyScaleSchema,
  SpatialGeometrySchema,
  InteractiveStateContractSchema,
  DesignDecisionRecordSchema,
  VisualDefectSchema,
  DesignBenchmarkResultSchema,
};

