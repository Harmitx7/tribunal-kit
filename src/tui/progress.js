'use strict';

const { RGB, GLYPHS, color, bold, dim } = require('./theme');

/**
 * Render an authoritative progress bar or metric visualization.
 * Aligns with Phase 5 execution telemetry principles (zero fabricated progress).
 *
 * @param {string} label Text label displayed to the left of the bar
 * @param {number|null} percentage Progress percentage (0–100), or null for unmetered
 * @param {object} options
 * @param {number} options.width Max width of the bar (defaults to 30)
 * @param {number[]} options.color RGB array for filled progress bar color
 * @param {number} options.labelWidth Minimum padded width for the label (defaults to 15)
 * @param {number} options.decimals Decimal places for percentage (defaults to 0)
 * @param {string} options.status Optional label for indeterminate state
 * @param {boolean} options.isTerminal Whether the underlying task is in a confirmed terminal state
 * @param {boolean} options.requireTerminalConfirmation If true, caps at 99% until confirmed complete
 */
function renderProgressBar(label, percentage, options = {}) {
  const maxBarWidth = options.width || 30;
  const g = GLYPHS;
  const isMetered = percentage !== null && percentage !== undefined && !isNaN(Number(percentage));

  const labelText = color(RGB.ZINC_200, label.padEnd(options.labelWidth || 15));

  // Indeterminate / Unmetered task
  if (!isMetered) {
    const unmeteredBar = color(RGB.SLATE_700, g.barEmpty.repeat(maxBarWidth));
    const statusText = dim(options.status || '[unmetered]');
    return `  ${labelText} ${unmeteredBar}  ${statusText}`;
  }

  let pct = Math.max(0, Math.min(100, Number(percentage)));

  // Phase 5 Invariant: Avoid premature 100% claims before confirmed terminal receipt
  if (options.requireTerminalConfirmation && !options.isTerminal && pct >= 100) {
    pct = 99;
  }

  const filledCount = Math.round((pct / 100) * maxBarWidth);
  const emptyCount = Math.max(0, maxBarWidth - filledCount);
  const filledColor = options.color || RGB.CYAN;

  let filledChars = '';
  if (filledCount > 0) {
    filledChars = color(filledColor, g.barFill.repeat(filledCount));
  }
  const emptyChars = color(RGB.SLATE_700, g.barEmpty.repeat(emptyCount));
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
