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
const hasTrueColor =
  hasColor &&
  (colorTerm === 'truecolor' ||
    colorTerm === '24bit' ||
    term.includes('256color') ||
    term.includes('xterm') ||
    process.platform === 'win32');

const isUtf8 =
  !noColor &&
  (Boolean(process.env.WT_SESSION) ||
    Boolean(process.env.TERM_PROGRAM) ||
    (process.env.LANG || '').toLowerCase().includes('utf') ||
    process.platform !== 'win32');

const RGB = {
  // Pro-Max Deep Dark Theme
  SLATE_950: [9, 9, 11],
  SLATE_900: [15, 15, 20],
  SLATE_800: [28, 28, 35],
  SLATE_700: [45, 45, 55],

  ZINC_600: [82, 82, 91],
  ZINC_500: [113, 113, 122],
  ZINC_400: [161, 161, 170],
  ZINC_200: [228, 228, 231],
  WHITE: [250, 250, 250],
  PURE_WHITE: [255, 255, 255],

  // Accents
  FLAME: [225, 75, 45], // Punchier Orange-Red
  FLAME_MUTED: [180, 60, 40],
  FLAME_VERMILION: [255, 51, 0], // Kinetic Neo-Brutalist Flame
  CORAL_BRIGHT: [245, 120, 95],
  AMBER: [245, 158, 11],
  GOLD: [255, 215, 0],

  // Industrial & Surface (DESIGN.md Neo-Brutalist alignment)
  INK_VOID: [6, 7, 9],
  INK_CHARCOAL: [14, 17, 23],
  INK_SURFACE: [20, 24, 34],
  INK_BORDER: [34, 38, 52],
  TAPE_STEEL: [138, 146, 163],
  TAPE_SILVER: [212, 216, 224],

  // Status
  EMERALD: [35, 195, 105], // Sharper Green
  EMERALD_DIM: [20, 90, 50],
  CYAN: [56, 189, 248],
  ROSE: [244, 63, 94],
  PURPLE: [168, 85, 247],
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
  star: '✦',
  boxTl: '╭',
  boxTr: '╮',
  boxBl: '╰',
  boxBr: '╯',
  boxH: '─',
  boxV: '│',
  teeL: '├',
  teeR: '┤',
  cross: '┼',
  dot: '·',
  check: '[✔]',
  uncheck: '[ ]',
  barEmpty: '░',
  barFill: '█',
  pointer: '➜',
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
  star: '*',
  boxTl: '+',
  boxTr: '+',
  boxBl: '+',
  boxBr: '+',
  boxH: '-',
  boxV: '|',
  teeL: '+',
  teeR: '+',
  cross: '+',
  dot: '.',
  check: '[x]',
  uncheck: '[ ]',
  barEmpty: '-',
  barFill: '=',
  pointer: '->',
};

const GLYPHS = isUtf8 ? UTF8_GLYPHS : ASCII_GLYPHS;

// Comprehensive ANSI stripping regex handling SGR, TrueColor, cursor movement, OSC 8 links
const ANSI_REGEX =
  /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]|(?:\x1b\][^\x07\x1b]*(?:\x07|\x1b\\))/g;

function stripAnsi(text) {
  if (typeof text !== 'string') return String(text || '');
  return text.replace(ANSI_REGEX, '');
}

function visibleLength(text) {
  return stripAnsi(text).length;
}

function color(rgb, text) {
  if (!hasColor) return String(text);
  if (hasTrueColor && Array.isArray(rgb)) {
    return `\x1b[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m${text}\x1b[0m`;
  }
  return `\x1b[96m${text}\x1b[0m`;
}

function bg(rgb, text) {
  if (!hasColor) return String(text);
  if (hasTrueColor && Array.isArray(rgb)) {
    return `\x1b[48;2;${rgb[0]};${rgb[1]};${rgb[2]}m${text}\x1b[0m`;
  }
  return `\x1b[106m${text}\x1b[0m`;
}

function bold(text) {
  if (!hasColor) return String(text);
  return `\x1b[1m${text}\x1b[0m`;
}

function dim(text) {
  if (!hasColor) return String(text);
  return `\x1b[90m${text}\x1b[0m`;
}

function inverse(text) {
  if (!hasColor) return String(text);
  return `\x1b[7m${text}\x1b[0m`;
}

function italic(text) {
  if (!hasColor) return String(text);
  return `\x1b[3m${text}\x1b[0m`;
}

function underline(text) {
  if (!hasColor) return String(text);
  return `\x1b[4m${text}\x1b[0m`;
}

function getColumns() {
  return (process.stdout && process.stdout.columns) || 80;
}

const cursor = {
  up: (n = 1) => (isTTY ? `\x1b[${n}A` : ''),
  down: (n = 1) => (isTTY ? `\x1b[${n}B` : ''),
  right: (n = 1) => (isTTY ? `\x1b[${n}C` : ''),
  left: (n = 1) => (isTTY ? `\x1b[${n}D` : ''),
  clearLine: () => (isTTY ? '\x1b[2K' : ''),
  hide: () => (isTTY ? '\x1b[?25l' : ''),
  show: () => (isTTY ? '\x1b[?25h' : ''),
};

module.exports = {
  isTTY,
  hasColor,
  hasTrueColor,
  isUtf8,
  RGB,
  GLYPHS,
  color,
  bg,
  bold,
  dim,
  inverse,
  italic,
  underline,
  stripAnsi,
  visibleLength,
  getColumns,
  cursor,
};
