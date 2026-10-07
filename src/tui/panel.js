'use strict';

const { isTTY, hasColor, RGB, GLYPHS, color, bold, dim, getColumns } = require('./theme');

/**
 * Render a bordered panel with an optional title and content.
 * Follows the Pro-Max high-density aesthetic with subtle borders.
 * 
 * @param {string} title The title of the panel
 * @param {string[]} lines Array of strings to render inside the panel
 * @param {object} options
 * @param {string} options.accessory Right-aligned text in the header
 * @param {number} options.width Max width of the panel (defaults to terminal width or 100)
 */
function renderPanel(title, lines, options = {}) {
  const g = GLYPHS;
  const cols = getColumns();
  const width = Math.min(options.width || 100, Math.max(64, cols));
  const innerWidth = width - 4;

  const topBorder = color(RGB.SLATE_700, g.boxTl + g.boxH.repeat(innerWidth + 2) + g.boxTr);
  const bottomBorder = color(RGB.SLATE_700, g.boxBl + g.boxH.repeat(innerWidth + 2) + g.boxBr);
  const pipe = color(RGB.SLATE_700, g.boxV);

  console.log();

  if (title) {
    const boldTitle = bold(color(RGB.WHITE, title));
    const accessory = options.accessory ? dim(options.accessory) : '';
    // Strip ANSI codes to calculate actual text length for padding
    const titleLen = title.replace(/\x1b\[[0-9;]*m/g, '').length;
    const accessoryLen = options.accessory ? options.accessory.replace(/\x1b\[[0-9;]*m/g, '').length : 0;
    const spaceCount = Math.max(1, innerWidth - titleLen - accessoryLen);
    
    console.log(`  ${topBorder}`);
    console.log(`  ${pipe} ${boldTitle}${' '.repeat(spaceCount)}${accessory} ${pipe}`);
    console.log(`  ${color(RGB.SLATE_700, g.treeMid + g.boxH.repeat(innerWidth + 2) + '┤')}`);
  } else {
    console.log(`  ${topBorder}`);
  }

  lines.forEach(line => {
    // Strip ANSI to find visual length
    const visualLength = line.replace(/\x1b\[[0-9;]*m/g, '').length;
    const padding = Math.max(0, innerWidth - visualLength + 1);
    console.log(`  ${pipe} ${line}${' '.repeat(padding)}${pipe}`);
  });

  console.log(`  ${bottomBorder}`);
  console.log();
}

module.exports = {
  renderPanel,
};
