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
const panel = require('./panel');
const progress = require('./progress');
const activity = require('../activity');

module.exports = {
  ...theme,
  ...banner,
  ...tree,
  ...shimmer,
  ...reviewerGrid,
  ...wizard,
  ...panel,
  ...progress,
  activity,
  formatActivity: activity.formatActivity,
  announceAgent: activity.announceAgent,
  announceSkill: activity.announceSkill,
  ActivityTracker: activity.ActivityTracker,
};
