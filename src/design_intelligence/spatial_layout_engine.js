'use strict';

/**
 * spatial_layout_engine.js — Nested Radius Mathematics & Spatial Grid Geometry.
 */

/**
 * Calculates correct concentric outer radius given inner radius and container padding.
 * Formula: R_outer = R_inner + Padding
 */
function calculateConcentricOuterRadius(innerRadiusPx, paddingPx) {
  if (typeof innerRadiusPx !== 'number' || typeof paddingPx !== 'number') return 0;
  return innerRadiusPx + paddingPx;
}

/**
 * Verifies whether outer radius, inner radius, and padding form a harmonious concentric curve.
 */
function verifyConcentricRadius(outerRadiusPx, innerRadiusPx, paddingPx, tolerancePx = 2) {
  const expected = innerRadiusPx + paddingPx;
  const diff = Math.abs(outerRadiusPx - expected);
  return {
    isConcentric: diff <= tolerancePx,
    expectedOuterRadius: expected,
    actualOuterRadius: outerRadiusPx,
    difference: diff,
  };
}

/**
 * Validates whether a spatial spacing value adheres to an 8pt or 4pt subgrid.
 */
function isGridAligned(valuePx, baseGrid = 8) {
  if (typeof valuePx !== 'number') return false;
  return valuePx % (baseGrid / 2) === 0;
}

/**
 * Evaluates whether text character line-length adheres to optimal readability (45ch - 75ch).
 */
function isLineLengthOptimal(charCount) {
  return charCount >= 45 && charCount <= 75;
}

/**
 * Generates a CSS clamp() expression for fluid scaling between viewports.
 */
function generateFluidClamp(minRem, maxRem, minVwPx = 375, maxVwPx = 1440) {
  const minVwRem = minVwPx / 16;
  const maxVwRem = maxVwPx / 16;

  const slope = (maxRem - minRem) / (maxVwRem - minVwRem);
  const yIntersection = -minVwRem * slope + minRem;

  const slopeVw = Number((slope * 100).toFixed(4));
  const interceptRem = Number(yIntersection.toFixed(4));

  return `clamp(${minRem}rem, ${interceptRem}rem + ${slopeVw}vw, ${maxRem}rem)`;
}

module.exports = {
  calculateConcentricOuterRadius,
  verifyConcentricRadius,
  isGridAligned,
  isLineLengthOptimal,
  generateFluidClamp,
};

