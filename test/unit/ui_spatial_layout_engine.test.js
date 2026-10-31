'use strict';

const {
  calculateConcentricOuterRadius,
  verifyConcentricRadius,
  isGridAligned,
  isLineLengthOptimal,
  generateFluidClamp,
} = require('../../src/design_intelligence/spatial_layout_engine');

describe('UI Spatial Layout Engine (Unit)', () => {
  it('calculates concentric outer radius correctly', () => {
    // Inner 8px + Padding 16px -> 24px
    expect(calculateConcentricOuterRadius(8, 16)).toBe(24);
  });

  it('verifies concentric radius harmony and detects mismatches', () => {
    // Valid: Inner 8, Padding 16, Outer 24
    const valid = verifyConcentricRadius(24, 8, 16);
    expect(valid.isConcentric).toBe(true);

    // Invalid: Inner 8, Padding 16, Outer 8 (mismatch)
    const invalid = verifyConcentricRadius(8, 8, 16);
    expect(invalid.isConcentric).toBe(false);
    expect(invalid.expectedOuterRadius).toBe(24);
  });

  it('checks 8pt and 4pt subgrid alignment', () => {
    expect(isGridAligned(16, 8)).toBe(true);
    expect(isGridAligned(24, 8)).toBe(true);
    expect(isGridAligned(12, 8)).toBe(true); // 12 is multiple of 4 (subgrid)
    expect(isGridAligned(15, 8)).toBe(false); // 15 is off-grid
  });

  it('checks optimal character line-length (45ch - 75ch)', () => {
    expect(isLineLengthOptimal(65)).toBe(true);
    expect(isLineLengthOptimal(30)).toBe(false); // Too short
    expect(isLineLengthOptimal(100)).toBe(false); // Too long
  });

  it('generates fluid clamp expressions', () => {
    const clampExpr = generateFluidClamp(1.0, 2.0, 375, 1440);
    expect(clampExpr).toMatch(/^clamp\(1rem, .+rem \+ .+vw, 2rem\)$/);
  });
});

