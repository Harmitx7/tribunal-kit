/**
 * utils.js — Backward-compatible re-export of _utils.js
 * ══════════════════════════════════════════════════════
 * All utilities are defined in _utils.js.
 * This file re-exports them for scripts that import from './utils.js'.
 *
 * New scripts should import from './_utils' directly.
 */
'use strict';

const _utils = require('./_utils');

module.exports = {
    ..._utils,
    // Legacy export for compatibility
    ensureUtf8Stdout: function() {},
};
