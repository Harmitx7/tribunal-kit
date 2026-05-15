/**
 * colors.js — Backward-compatible re-export of _colors.js
 * ════════════════════════════════════════════════════════
 * All color constants and helpers are defined in _colors.js.
 * This file re-exports them for scripts that import from './colors.js'.
 *
 * New scripts should import from './_colors' directly.
 */
'use strict';

module.exports = require('./_colors');
