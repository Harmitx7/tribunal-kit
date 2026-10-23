const {
  isTTY,
  hasColor,
  RGB,
  GLYPHS,
  color,
  bold,
  dim,
  getColumns,
  stripAnsi,
  visibleLength,
} = require('./theme');

/**
 * Render a bordered panel with an optional title and content.
 * Follows the Neo-Brutalist & Kinetic high-density aesthetic with subtle borders.
 *
 * @param {string} title The title of the panel
 * @param {string[]} lines Array of strings to render inside the panel
 * @param {object} options
 * @param {string} options.accessory Right-aligned text in the header
 * @param {number} options.width Max width of the panel (defaults to terminal width or 100)
 * @param {number[]} options.borderColor RGB array for border color
 * @param {number[]} options.titleColor RGB array for title color
 * @param {boolean} options.returnLines If true, returns array of lines instead of printing
 */
function renderPanel(title, lines = [], options = {}) {
  const g = GLYPHS;
  const cols = getColumns();
  const width = Math.min(options.width || 100, Math.max(36, cols - 4));
  const innerWidth = Math.max(24, width - 4);

  const borderColor = options.borderColor || RGB.SLATE_700;
  const topBorder = color(borderColor, g.boxTl + g.boxH.repeat(innerWidth + 2) + g.boxTr);
  const bottomBorder = color(borderColor, g.boxBl + g.boxH.repeat(innerWidth + 2) + g.boxBr);
  const divider = color(
    borderColor,
    (g.teeL || '├') + g.boxH.repeat(innerWidth + 2) + (g.teeR || '┤'),
  );
  const pipe = color(borderColor, g.boxV);

  const out = [];

  out.push(`  ${topBorder}`);

  if (title) {
    const titleColor = options.titleColor || RGB.WHITE;
    const boldTitle = bold(color(titleColor, title));
    const accessory = options.accessory ? dim(options.accessory) : '';
    // Strip ANSI codes to calculate actual text length for exact padding
    const titleLen = visibleLength(title);
    const accessoryLen = options.accessory ? visibleLength(options.accessory) : 0;
    const spaceCount = Math.max(1, innerWidth - titleLen - accessoryLen);

    out.push(`  ${pipe} ${boldTitle}${' '.repeat(spaceCount)}${accessory} ${pipe}`);
    out.push(`  ${divider}`);
  }

  lines.forEach(line => {
    let vLen = visibleLength(line);
    let displayLine = line;
    if (vLen > innerWidth) {
      // Truncate cleanly to preserve panel box geometry
      displayLine = stripAnsi(line).slice(0, Math.max(1, innerWidth - 3)) + '...';
      vLen = visibleLength(displayLine);
    }
    const padding = Math.max(0, innerWidth + 1 - vLen);
    out.push(`  ${pipe} ${displayLine}${' '.repeat(padding)}${pipe}`);
  });

  out.push(`  ${bottomBorder}`);

  if (options.returnLines) {
    return out;
  }

  console.log();
  out.forEach(l => console.log(l));
  console.log();
  return out;
}

module.exports = {
  renderPanel,
};
