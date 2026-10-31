'use strict';

const {
  RGB,
  GLYPHS,
  color,
  bold,
  dim,
  getColumns,
  stripAnsi,
  visibleWidth,
  sanitizeTerminal,
} = require('./theme');

/**
 * Render a bordered panel with an optional title and content.
 * Follows the Neo-Brutalist & Kinetic high-density aesthetic with precise box geometry.
 *
 * @param {string} title The title of the panel
 * @param {Array<string|object>} lines Array of strings/objects to render inside the panel
 * @param {object} options
 * @param {string} options.accessory Right-aligned text in the header
 * @param {number} options.width Max width of the panel (defaults to terminal width or 100)
 * @param {number[]} options.borderColor RGB array for border color
 * @param {number[]} options.titleColor RGB array for title color
 * @param {boolean} options.returnLines If true, returns array of lines instead of printing
 * @param {boolean} options.sanitize If true (default), sanitizes untrusted input against control codes
 */
function renderPanel(title, lines = [], options = {}) {
  const g = GLYPHS;
  const cols = getColumns();

  // Responsive width calculation respecting narrow terminal environments
  const width = Math.min(options.width || 100, Math.max(20, cols - 2));
  const innerWidth = Math.max(16, width - 4);

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
    const accessoryText = options.accessory ? String(options.accessory) : '';
    const accessoryLen = accessoryText ? visibleWidth(accessoryText) : 0;

    let displayTitle = String(title);
    let titleLen = visibleWidth(displayTitle);

    // Truncate title if it overflows the available header width
    const maxTitleWidth = innerWidth - accessoryLen - 1;
    if (titleLen > maxTitleWidth && maxTitleWidth > 4) {
      displayTitle = stripAnsi(displayTitle).slice(0, maxTitleWidth - 3) + '...';
      titleLen = visibleWidth(displayTitle);
    }

    const boldTitle = bold(color(titleColor, displayTitle));
    const accessory = accessoryText ? dim(accessoryText) : '';
    const spaceCount = Math.max(1, innerWidth - titleLen - accessoryLen);

    out.push(`  ${pipe} ${boldTitle}${' '.repeat(spaceCount)}${accessory} ${pipe}`);
    out.push(`  ${divider}`);
  }

  // Flatten and sanitize lines, splitting embedded newlines to preserve box geometry
  const flattenedLines = [];
  const rawList = Array.isArray(lines) ? lines : [lines];

  for (const rawLine of rawList) {
    if (rawLine === null || rawLine === undefined) {
      flattenedLines.push('');
    } else if (typeof rawLine === 'object') {
      flattenedLines.push(JSON.stringify(rawLine));
    } else {
      const sanitized = options.sanitize !== false ? sanitizeTerminal(rawLine) : String(rawLine);
      const splitLines = sanitized.split('\n');
      for (const subLine of splitLines) {
        flattenedLines.push(subLine);
      }
    }
  }

  flattenedLines.forEach(line => {
    let vLen = visibleWidth(line);
    let displayLine = line;

    if (vLen > innerWidth) {
      // Clean truncation protecting border geometry
      displayLine = stripAnsi(line).slice(0, Math.max(1, innerWidth - 3)) + '...';
      vLen = visibleWidth(displayLine);
    }

    const padding = Math.max(0, innerWidth - vLen);
    out.push(`  ${pipe} ${displayLine}${' '.repeat(padding)} ${pipe}`);
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
