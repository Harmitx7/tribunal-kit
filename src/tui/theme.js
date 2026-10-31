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

/**
 * Calculates visible terminal column width for a string.
 * Accurately handles ANSI escape sequences, CJK full-width ideographs, emojis,
 * and zero-width combining marks.
 */
function visibleWidth(text) {
  if (typeof text !== 'string') text = String(text || '');
  const clean = stripAnsi(text);
  let width = 0;

  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);

    // Control characters and DEL
    if (code < 32 || (code >= 0x7F && code < 0xA0)) {
      continue;
    }

    // Zero-width characters (zero-width space, joiners, BOM)
    if (code === 0x200B || code === 0x200C || code === 0x200D || code === 0xFEFF) {
      continue;
    }

    // Combining diacritical marks
    if (code >= 0x0300 && code <= 0x036F) {
      continue;
    }

    // Surrogate pair (emojis and supplemental characters)
    if (code >= 0xD800 && code <= 0xDBFF) {
      const nextCode = clean.charCodeAt(i + 1);
      if (nextCode >= 0xDC00 && nextCode <= 0xDFFF) {
        i++;
        width += 2; // Emojis and extended plane ideographs occupy 2 terminal columns
        continue;
      }
    }

    // CJK and Fullwidth forms
    if (
      (code >= 0x1100 && code <= 0x115F) ||
      (code >= 0x2E80 && code <= 0x9FFF) ||
      (code >= 0xAC00 && code <= 0xD7A3) ||
      (code >= 0xF900 && code <= 0xFAFF) ||
      (code >= 0xFE10 && code <= 0xFE19) ||
      (code >= 0xFE30 && code <= 0xFE6F) ||
      (code >= 0xFF00 && code <= 0xFF60) ||
      (code >= 0xFFE0 && code <= 0xFFE6)
    ) {
      width += 2;
      continue;
    }

    width += 1;
  }

  return width;
}

function visibleLength(text) {
  return visibleWidth(text);
}

/**
 * Sanitizes untrusted text before terminal rendering.
 * Neutralizes destructive escape codes, carriage return log spoofing,
 * redacts secrets, and bounds runaway strings.
 */
function sanitizeTerminal(input, options = {}) {
  if (input === null || input === undefined) return '';
  let str = typeof input === 'string' ? input : JSON.stringify(input);

  // 1. Secret redaction
  if (options.redactSecrets !== false) {
    str = str
      .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer [REDACTED_TOKEN]')
      .replace(/ghp_[A-Za-z0-9]{36,}/g, 'ghp_[REDACTED_GITHUB_TOKEN]')
      .replace(/sk-ant-[A-Za-z0-9\-._~]+/g, 'sk-ant-[REDACTED_API_KEY]')
      .replace(/sk-proj-[A-Za-z0-9\-._~]+/g, 'sk-proj-[REDACTED_API_KEY]')
      .replace(/eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g, '[REDACTED_JWT]')
      .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]');
  }

  // 2. Neutralize dangerous terminal control codes & escape sequences
  str = str.replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, ''); // OSC title/palette sequences
  str = str.replace(/\r\n/g, '\n').replace(/\r/g, ' '); // Neutralize \r log spoofing
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Non-printable control characters

  // 3. Optional ANSI stripping for untrusted message inputs
  if (options.stripAnsi) {
    str = stripAnsi(str);
  }

  // 4. Bounded length check
  const maxLen = options.maxLength || 4096;
  if (str.length > maxLen) {
    str = str.slice(0, Math.max(0, maxLen - 3)) + '...';
  }

  return str;
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
  UTF8_GLYPHS,
  ASCII_GLYPHS,
  color,
  bg,
  bold,
  dim,
  inverse,
  italic,
  underline,
  stripAnsi,
  visibleWidth,
  visibleLength,
  sanitizeTerminal,
  getColumns,
  cursor,
};
