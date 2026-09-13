'use strict';

/**
 * Tribunal-Kit TUI Primitives & Design System.
 */

const theme = require('./theme');
const banner = require('./banner');
const tree = require('./tree');
const shimmer = require('./shimmer');
const reviewerGrid = require('./reviewer-grid');
const wizard = require('./wizard');

module.exports = {
  ...theme,
  ...banner,
  ...tree,
  ...shimmer,
  ...reviewerGrid,
  ...wizard,
};
