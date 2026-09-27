'use strict';

/**
 * Terminal theme, TrueColor palette, and Unicode glyph tokens.
 * Parity with Rust core TUI & Brainless (Claude Code / Codex / Grok) design system.
 */

const isTTY = Boolean(process.stdout && process.stdout.isTTY);
const noColor = Boolean(process.env.NO_COLOR || process.env.CI);
const colorTerm = (process.env.COLORTERM || '').toLowerCase();
const term = (process.env.TERM || '').toLowerCase();

const hasColor = !noColor && (isTTY || Boolean(process.env.FORCE_COLOR));
const hasTrueColor = hasColor && (
  colorTerm === 'truecolor' ||
  colorTerm === '24bit' ||
  term.includes('256color') ||
  term.includes('xterm') ||
  process.platform === 'win32'
);

const isUtf8 = !noColor && (
  Boolean(process.env.WT_SESSION) ||
  Boolean(process.env.TERM_PROGRAM) ||
  (process.env.LANG || '').toLowerCase().includes('utf') ||
  process.platform !== 'win32'
);

const RGB = {
  SLATE_900: [13, 13, 15],
  SLATE_800: [30, 30, 34],
  SLATE_700: [47, 47, 51],
  ZINC_600: [86, 95, 137],
  ZINC_500: [122, 122, 122],
  ZINC_400: [161, 161, 170],
  ZINC_200: [228, 228, 231],
  WHITE: [237, 237, 237],

  // Accents (Flame / Amber / Coral)
  FLAME: [205, 105, 74],        // #cd694a
  CORAL_BRIGHT: [231, 148, 117], // #e79475
  AMBER: [245, 158, 11],        // #f59e0b
  GOLD: [255, 215, 0],          // #ffd700

  // Status
  EMERALD: [78, 169, 111],      // #4ea96f
  CYAN: [125, 207, 255],        // #7dcfff
  ROSE: [244, 63, 94],          // #f43f5e
  PURPLE: [177, 167, 255],      // #b1a7ff
};

const UTF8_GLYPHS = {
  bullet: '⏺',
  success: '✔',
  failure: '✖',
  warning: '⚠',
  branch: '⎿',
  treeMid: '├──',
  treeEnd: '└──',
  chevron: '❯',
  diamond: '◆',
  boxTl: '╭',
  boxTr: '╮',
  boxBl: '╰',
  boxBr: '╯',
  boxH: '─',
  boxV: '│',
  dot: '·',
  check: '[✔]',
  uncheck: '[ ]',
};

const ASCII_GLYPHS = {
  bullet: '*',
  success: '+',
  failure: 'x',
  warning: '!',
  branch: '\\-',
  treeMid: '|--',
  treeEnd: '`--',
  chevron: '>',
  diamond: '*',
  boxTl: '+',
  boxTr: '+',
  boxBl: '+',
  boxBr: '+',
  boxH: '-',
  boxV: '|',
  dot: '.',
  check: '[x]',
  uncheck: '[ ]',
};

const GLYPHS = isUtf8 ? UTF8_GLYPHS : ASCII_GLYPHS;

function color(rgb, text) {
  if (!hasColor) return String(text);
  if (hasTrueColor && Array.isArray(rgb)) {
    return `\x1b[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m${text}\x1b[0m`;
  }
  // Fallback ANSI 16-color
  return `\x1b[96m${text}\x1b[0m`;
}

function bold(text) {
  if (!hasColor) return String(text);
  return `\x1b[1m${text}\x1b[0m`;
}

function dim(text) {
  if (!hasColor) return String(text);
  return `\x1b[90m${text}\x1b[0m`;
}

function getColumns() {
  return (process.stdout && process.stdout.columns) || 80;
}

module.exports = {
  isTTY,
  hasColor,
  hasTrueColor,
  isUtf8,
  RGB,
  GLYPHS,
  color,
  bold,
  dim,
  getColumns,
};
