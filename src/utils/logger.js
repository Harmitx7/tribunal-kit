'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.C = void 0;
exports.colorize = colorize;
exports.c = c;
exports.bold = bold;
exports.setLogLevels = setLogLevels;
exports.log = log;
exports.ok = ok;
exports.warn = warn;
exports.err = err;
exports.dim = dim;
exports.dbg = dbg;
exports.hasColor = hasColor;

const theme = require('../tui/theme');

// src/utils/logger.ts
exports.C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[91m',
  green: '\x1b[92m',
  yellow: '\x1b[93m',
  blue: '\x1b[94m',
  magenta: '\x1b[95m',
  cyan: '\x1b[96m',
  white: '\x1b[97m',
  gray: '\x1b[90m',
  bgCyan: '\x1b[46m',
};

function hasColor() {
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR !== undefined) {
    return process.env.FORCE_COLOR !== '0' && process.env.FORCE_COLOR !== 'false';
  }
  return theme.hasColor;
}

function colorize(color, text) {
  if (process.env.NO_COLOR) return String(text);
  if (!exports.C[color]) return String(text);
  return `${exports.C[color]}${text}${exports.C.reset}`;
}

function c(color, text) {
  return colorize(color, text);
}

function bold(text) {
  if (process.env.NO_COLOR) return String(text);
  return `${exports.C.bold}${text}${exports.C.reset}`;
}

let quiet = false;
let verbose = false;

function setLogLevels(q, v) {
  quiet = q;
  verbose = v;
}

function log(msg) {
  if (!quiet) console.log(theme.sanitizeTerminal(msg));
}

function ok(msg) {
  if (!quiet) {
    const glyph = (theme.GLYPHS && theme.GLYPHS.success) || '✔';
    const tag = hasColor() ? c('green', glyph) : glyph;
    console.log(`  ${tag} ${theme.sanitizeTerminal(msg)}`);
  }
}

function warn(msg) {
  if (!quiet) {
    const glyph = (theme.GLYPHS && theme.GLYPHS.warning) || '⚠';
    const tag = hasColor() ? c('yellow', glyph) : glyph;
    console.log(`  ${tag}  ${theme.sanitizeTerminal(msg)}`);
  }
}

function err(msg) {
  const glyph = (theme.GLYPHS && theme.GLYPHS.failure) || '✖';
  const tag = hasColor() ? c('red', glyph) : glyph;
  console.error(`  ${tag} ${theme.sanitizeTerminal(msg)}`);
}

function dim(msg) {
  if (!quiet) {
    const sanitized = theme.sanitizeTerminal(msg);
    console.log(`  ${hasColor() ? c('gray', sanitized) : sanitized}`);
  }
}

function dbg(msg) {
  if (verbose) {
    const glyph = (theme.GLYPHS && theme.GLYPHS.bullet) || '⊡';
    const sanitized = theme.sanitizeTerminal(msg);
    const tag = hasColor() ? c('gray', glyph) : glyph;
    const body = hasColor() ? c('gray', sanitized) : sanitized;
    console.log(`  ${tag} ${body}`);
  }
}
