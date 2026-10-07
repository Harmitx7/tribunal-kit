'use strict';

const { isTTY, hasColor, RGB, GLYPHS, color, bold, dim, getColumns } = require('./theme');

/**
 * Render a progress bar or metric visualization.
 */
function renderProgressBar(label, percentage, options = {}) {
  const cols = getColumns();
  const maxBarWidth = options.width || 30;
  
  const g = GLYPHS;
  const pct = Math.max(0, Math.min(100, percentage));
  const filledCount = Math.round((pct / 100) * maxBarWidth);
  const emptyCount = maxBarWidth - filledCount;

  const filledColor = options.color || RGB.CYAN;
  
  let filledChars = '';
  if (filledCount > 0) {
    filledChars = color(filledColor, g.barFill.repeat(filledCount));
  }
  const emptyChars = color(RGB.SLATE_700, g.barEmpty.repeat(emptyCount));
  
  const labelText = color(RGB.ZINC_200, label.padEnd(options.labelWidth || 15));
  const pctText = dim(`${pct.toFixed(options.decimals || 0)}%`.padStart(5));
  
  return `  ${labelText} ${filledChars}${emptyChars}  ${pctText}`;
}

function renderMetric(label, value, options = {}) {
  const labelText = dim(label.padEnd(options.labelWidth || 15));
  const valColor = options.color || RGB.WHITE;
  const valText = bold(color(valColor, String(value)));
  
  return `  ${labelText} ${valText}`;
}

module.exports = {
  renderProgressBar,
  renderMetric,
};
